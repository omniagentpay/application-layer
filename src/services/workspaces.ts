import { apiClient } from '@/lib/api-client';

export interface ApiKey {
  id: string;
  key: string;
  name?: string;
  createdAt: string;
  lastUsed?: string;
  workspaceId: string;
}

export interface ApiKeyListItem {
  id: string;
  key: string; // masked
  name?: string;
  createdAt: string;
  lastUsed?: string;
  workspaceId: string;
}

export const workspacesService = {
  async generateApiKey(workspaceId: string, name?: string): Promise<ApiKey> {
    try {
      return await apiClient.post<ApiKey>(`/workspaces/${workspaceId}/api-keys`, { name });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate API key: ${error.message}`);
      }
      throw new Error('Failed to generate API key: Unknown error');
    }
  },

  async getApiKeys(workspaceId: string): Promise<ApiKeyListItem[]> {
    try {
      return await apiClient.get<ApiKeyListItem[]>(`/workspaces/${workspaceId}/api-keys`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch API keys: ${error.message}`);
      }
      throw new Error('Failed to fetch API keys: Unknown error');
    }
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete workspace: ${error.message}`);
      }
      throw new Error('Failed to delete workspace: Unknown error');
    }
  },
};
