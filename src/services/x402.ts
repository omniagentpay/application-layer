import type { X402Api, PaymentIntent } from '@/types';
import { paymentsService } from './payments';
import { apiClient } from '@/lib/api-client';

export const x402Service = {
  async getApis(): Promise<X402Api[]> {
    return apiClient.get<X402Api[]>('/x402');
  },

  async getApi(id: string): Promise<X402Api | null> {
    try {
      return await apiClient.get<X402Api>(`/x402/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get the agent Circle wallet ID for autonomous x402 payments
   */
  async getAgentWalletId(): Promise<string | null> {
    try {
      const response = await apiClient.get<{ walletId: string }>('/x402/agent-wallet');
      return response.walletId;
    } catch (error) {
      console.warn('Failed to get agent wallet ID:', error);
      return null;
    }
  },

  /**
   * Execute x402 API call: Agent attempts API → Payment Required (402) → Payment executed → Response
   * This is the real x402 flow where payment happens automatically when the API demands it.
   */
  async tryApi(apiId: string, walletId?: string): Promise<{
    intent?: PaymentIntent;
    result?: { data: unknown; latency: number; payment?: any };
  }> {
    const api = await this.getApi(apiId);
    if (!api) throw new Error('API not found');

    // Use provided wallet ID or fetch agent wallet ID
    let agentWalletId = walletId;
    if (!agentWalletId) {
      agentWalletId = await this.getAgentWalletId();
      if (!agentWalletId) {
        throw new Error('No wallet available. Please configure AGENT_CIRCLE_WALLET_ID or provide a walletId.');
      }
    }

    // x402 Flow: The payment happens automatically when the API is called
    // We create a payment intent for tracking, but the actual payment execution
    // happens in the /x402/:id/call endpoint when it detects the 402 response
    const intent = await paymentsService.createIntent({
      amount: api.price,
      recipient: api.provider,
      recipientAddress: api.endpoint, // Use actual endpoint for x402
      description: `x402 API call: ${api.name}`,
      walletId: agentWalletId,
      chain: 'arc-testnet',
      fromWallet: {
        role: 'agent',
        type: 'circle',
        ref: agentWalletId,
      },
    });

    // Call the API - this will trigger the x402 flow:
    // 1. Agent attempts API call
    // 2. API returns 402 Payment Required
    // 3. Payment is executed automatically via MCP
    // 4. API call is retried and succeeds
    const result = await apiClient.post<{ 
      data: unknown; 
      latency: number;
      payment?: {
        amount: number;
        currency: string;
        transactionId?: string;
        status: string;
      };
    }>(`/x402/${apiId}/call`, {
      walletId: agentWalletId,
    });

    return {
      intent,
      result,
    };
  },

  async searchApis(query: string): Promise<X402Api[]> {
    return apiClient.get<X402Api[]>(`/x402/search?q=${encodeURIComponent(query)}`);
  },
};
