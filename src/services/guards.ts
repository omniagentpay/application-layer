import type { GuardConfig, GuardPreset } from '@/types';
import { apiClient } from '@/lib/api-client';
import { guardPresets } from '@/data/mock';

export const guardsService = {
  async getGuards(): Promise<GuardConfig[]> {
    return apiClient.get<GuardConfig[]>('/guards');
  },

  async updateGuard(id: string, updates: Partial<GuardConfig>): Promise<GuardConfig | null> {
    try {
      return await apiClient.patch<GuardConfig>(`/guards/${id}`, updates);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async getPresets(): Promise<GuardPreset[]> {
    return [...guardPresets];
  },

  async applyPreset(presetId: string): Promise<boolean> {
    const preset = guardPresets.find(p => p.id === presetId);
    if (!preset) return false;

    // Apply preset configurations by updating each guard
    const guards = await this.getGuards();
    const updates = Promise.all(
      preset.guards.map(async (presetGuard) => {
        const existingGuard = guards.find(g => g.type === presetGuard.type);
        if (existingGuard && presetGuard.config) {
          await this.updateGuard(existingGuard.id, {
            enabled: true,
            config: { ...existingGuard.config, ...presetGuard.config },
          });
        }
      })
    );
    
    await updates;
    return true;
  },

  async simulatePolicy(amount: number, recipient: string): Promise<{
    passed: boolean;
    results: { guard: string; passed: boolean; reason?: string }[];
  }> {
    return apiClient.post<{
      passed: boolean;
      results: { guard: string; passed: boolean; reason?: string }[];
    }>('/guards/simulate', { amount, recipient });
  },

  async getBlastRadius(guardId?: string): Promise<{
    affectedAgents: Array<{ agentId: string; agentName: string; impact: 'high' | 'medium' | 'low' }>;
    affectedTools: Array<{ toolId: string; toolName: string; usageCount: number }>;
    estimatedDailyExposure: number;
    currentDailySpend: number;
  }> {
    const params = guardId ? `?guardId=${guardId}` : '';
    return apiClient.get(`/guards/blast-radius${params}`);
  },
};
