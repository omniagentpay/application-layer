import type { LedgerEntry } from '@/types';
import { apiClient } from '@/lib/api-client';

export const ledgerService = {
  async getLedgerEntries(filters?: {
    agentId?: string;
    intentId?: string;
    transactionId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LedgerEntry[]> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append('agentId', filters.agentId);
    if (filters?.intentId) params.append('intentId', filters.intentId);
    if (filters?.transactionId) params.append('transactionId', filters.transactionId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const query = params.toString();
    return apiClient.get<LedgerEntry[]>(`/ledger${query ? `?${query}` : ''}`);
  },

  async getLedgerEntry(id: string): Promise<LedgerEntry | null> {
    try {
      return await apiClient.get<LedgerEntry>(`/ledger/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },
};
