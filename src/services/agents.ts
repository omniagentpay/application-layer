import type { Agent } from '@/types';
import { apiClient } from '@/lib/api-client';

export const agentsService = {
  async getAgents(): Promise<Agent[]> {
    return apiClient.get<Agent[]>('/agents');
  },

  async getAgent(id: string): Promise<Agent | null> {
    try {
      return await apiClient.get<Agent>(`/agents/${id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async createAgent(data: {
    name: string;
    purpose: string;
    riskTier?: string;
    trustLevel?: string;
  }): Promise<Agent> {
    return apiClient.post<Agent>('/agents', data);
  },

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
    try {
      return await apiClient.patch<Agent>(`/agents/${id}`, updates);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },
};
