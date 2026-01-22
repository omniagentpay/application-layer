import type { Wallet } from '@/types';
import { apiClient } from '@/lib/api-client';

export const walletsService = {
  async getWallets(walletAddresses?: string[]): Promise<Wallet[]> {
    const params = walletAddresses && walletAddresses.length > 0
      ? { addresses: walletAddresses }
      : {};
    return apiClient.get<Wallet[]>('/wallets', { params });
  },

  async getWallet(id: string): Promise<Wallet | null> {
    try {
      return await apiClient.get<Wallet>(`/wallets/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async createWallet(data: {
    name: string;
    chain: Wallet['chain'];
    address?: string;
  }): Promise<Wallet> {
    return apiClient.post<Wallet>('/wallets', data);
  },

  async fundWallet(id: string, amount: number): Promise<boolean> {
    // Fund wallet endpoint to be implemented
    throw new Error('Fund wallet not yet implemented');
  },

  async getUnifiedBalance(walletAddresses?: string[]): Promise<{ total: number; byChain: Record<string, number> }> {
    const params = walletAddresses && walletAddresses.length > 0
      ? { addresses: walletAddresses }
      : {};
    const result = await apiClient.get<{ total: number; by_chain: Record<string, number> }>('/wallets/balance/unified', { params });
    return {
      total: result.total,
      byChain: result.by_chain,
    };
  },

  async getWalletBalance(id: string): Promise<{
    walletId: string;
    chain: string;
    native: { amount: string; currency: string };
    tokens: Array<{ tokenAddress: string; amount: string; currency: string }>;
  } | null> {
    try {
      return await apiClient.get(`/wallets/${id}/balance`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async getWalletNetworks(id: string): Promise<string[]> {
    try {
      const result = await apiClient.get<{ networks: string[] }>(`/wallets/${id}/networks`);
      return result.networks;
    } catch (error) {
      console.error('Failed to get wallet networks:', error);
      return ['arc-testnet']; // Default to ARC Testnet
    }
  },
};

// Agent Wallet Service (Circle Wallet Management)
export interface AgentWallet {
  walletId: string;
  address: string;
  balance: number;
  status: string;
  network: string;
  createdAt: string;
}

export const agentWalletService = {
  async getAgentWallet(privyUserId: string): Promise<AgentWallet | null> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/wallets/agent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Privy-User-Id': privyUserId,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Handle network errors (server not running, CORS, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        throw new Error(
          `Cannot connect to backend server at ${apiBaseUrl}. ` +
          `Please make sure the backend server is running on port 3001.`
        );
      }
      
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async createAgentWallet(privyUserId: string): Promise<AgentWallet> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/wallets/agent/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Privy-User-Id': privyUserId,
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Provide user-friendly error messages
        const errorMessage = errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Don't throw generic errors - provide specific messages
        if (response.status === 500 && errorMessage.includes('database')) {
          throw new Error('Database error. Please check your Supabase configuration.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else {
          throw new Error(errorMessage);
        }
      }
      
      return await response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        throw new Error(
          `Cannot connect to backend server at ${apiBaseUrl}. ` +
          `Please make sure the backend server is running on port 3001.`
        );
      }
      throw error;
    }
  },

  async resetAgentWallet(privyUserId: string): Promise<AgentWallet> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/wallets/agent/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Privy-User-Id': privyUserId,
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(error.details || error.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        throw new Error(
          `Cannot connect to backend server at ${apiBaseUrl}. ` +
          `Please make sure the backend server is running on port 3001.`
        );
      }
      throw error;
    }
  },

  async getAgentWalletBalance(privyUserId: string): Promise<{ balance: number; currency: string; walletId: string }> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      // Add cache-busting query parameter to ensure fresh data
      const cacheBuster = `?_t=${Date.now()}`;
      const response = await fetch(`${apiBaseUrl}/wallets/agent/balance${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Privy-User-Id': privyUserId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(error.details || error.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        throw new Error(
          `Cannot connect to backend server at ${apiBaseUrl}. ` +
          `Please make sure the backend server is running on port 3001.`
        );
      }
      throw error;
    }
  },
};
