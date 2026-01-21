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

  /**
   * Execute agent payment flow automatically
   * Returns an async generator that yields status updates
   */
  async *executeAgentPaymentFlow(params: {
    amount: number;
    recipient: string;
    recipientAddress: string;
    description?: string;
    walletId: string;
    chain?: string;
    currency?: string;
  }): AsyncGenerator<{
    step: 'creating_intent' | 'simulating' | 'checking_guards' | 'executing' | 'completed' | 'failed' | 'requires_approval';
    message: string;
    intentId?: string;
    technicalDetails?: {
      tool: string;
      input: Record<string, unknown>;
      output?: unknown;
      error?: string;
    };
  }, void, unknown> {
    try {
      // Construct endpoint URL - handle both cases where VITE_API_BASE_URL includes /api or not
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      // If base URL already ends with /api, use it directly; otherwise append /api
      const baseUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
      const endpoint = `${baseUrl}/payments/agent/execute`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'complete') {
                // Final result - don't yield, just break
                break;
              } else if (data.type === 'error') {
                yield {
                  step: 'failed',
                  message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
                  technicalDetails: {
                    tool: 'agent_payment_flow',
                    input: params,
                    error: data.error,
                  },
                };
                break;
              } else {
                // Status update
                yield data;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      yield {
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        technicalDetails: {
          tool: 'agent_payment_flow',
          input: params,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
