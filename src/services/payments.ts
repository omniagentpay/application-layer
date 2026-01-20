import type { PaymentIntent, Transaction } from '@/types';
import { apiClient } from '@/lib/api-client';

export const paymentsService = {
  async getIntents(): Promise<PaymentIntent[]> {
    return apiClient.get<PaymentIntent[]>('/payments');
  },

  async getIntent(id: string): Promise<PaymentIntent | null> {
    try {
      return await apiClient.get<PaymentIntent>(`/payments/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async createIntent(data: {
    amount: number;
    recipient: string;
    recipientAddress: string;
    description: string;
    walletId: string;
    chain: string;
    intentType?: 'direct' | 'payment_link';
    recipientWalletType?: 'circle' | 'privy';
    paymentLink?: {
      expiresAt?: number;
      metadata?: Record<string, string>;
    };
    fromWallet?: {
      role: 'agent' | 'user';
      type: 'circle' | 'privy';
      ref: string;
    };
  }): Promise<PaymentIntent> {
    return apiClient.post<PaymentIntent>('/payments', data);
  },

  async simulateIntent(id: string): Promise<{ success: boolean; estimatedFee: number; guardResults?: unknown[]; route?: string; requiresApproval?: boolean }> {
    return apiClient.post(`/payments/${id}/simulate`, {});
  },

  async approveIntent(id: string): Promise<boolean> {
    const result = await apiClient.post<{ success: boolean }>(`/payments/${id}/approve`, {});
    return result.success;
  },

  async executeIntent(id: string): Promise<{ success: boolean; txHash?: string; explorerUrl?: string; details?: string; message?: string; error?: string }> {
    try {
      return await apiClient.post<{ success: boolean; txHash?: string; explorerUrl?: string; details?: string; message?: string; error?: string }>(`/payments/${id}/execute`, {});
    } catch (error: any) {
      // Extract error details from response
      if (error?.response?.data) {
        return {
          success: false,
          details: error.response.data.details || error.response.data.message || error.response.data.error,
          message: error.response.data.message || error.response.data.error,
          error: error.response.data.error,
        };
      }
      throw error;
    }
  },

  async getTransactions(filters?: {
    walletId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (filters?.walletId) params.append('walletId', filters.walletId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const query = params.toString();
    return apiClient.get<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
  },

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      return await apiClient.get<Transaction>(`/transactions/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async exportTransactionsCsv(transactions: Transaction[]): Promise<string> {
    // For now, generate CSV client-side
    // In the future, could use backend endpoint
    const headers = ['ID', 'Type', 'Amount', 'Currency', 'Recipient', 'Status', 'Chain', 'Date', 'Tx Hash'];
    const rows = transactions.map(t => [
      t.id,
      t.type,
      t.amount.toString(),
      t.currency,
      t.recipient || '',
      t.status,
      t.chain,
      t.createdAt,
      t.txHash || '',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  async getTimeline(intentId: string) {
    return apiClient.get(`/payments/${intentId}/timeline`);
  },

  async getExplanation(intentId: string) {
    return apiClient.get(`/payments/${intentId}/explanation`);
  },

  async whatIfSimulate(params: {
    amount: number;
    guardPresetId?: string;
    chain?: string;
    time?: string;
  }) {
    return apiClient.post('/payments/simulate', params);
  },

  async replayIncident(intentId: string) {
    return apiClient.post(`/payments/${intentId}/replay`);
  },

  async getContract(intentId: string) {
    return apiClient.get(`/payments/${intentId}/contract`);
  },
};
