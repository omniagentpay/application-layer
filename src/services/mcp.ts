import type { McpTool, McpToolResult } from '@/types';
import { apiClient } from '@/lib/api-client';

// MCP Configuration for Claude Desktop
export const mcpConfig = {
  mcpServers: {
    omniagentpay: {
      command: "npx",
      args: ["-y", "@omniagentpay/mcp-server"],
      env: {
        OMNIAGENTPAY_API_KEY: "<YOUR_API_KEY>",
        OMNIAGENTPAY_WORKSPACE_ID: "<YOUR_WORKSPACE_ID>",
        OMNIAGENTPAY_ENVIRONMENT: "production"
      }
    }
  }
};

export const requiredEnvVars = [
  { name: 'OMNIAGENTPAY_API_KEY', description: 'Your API key from Settings > API Keys' },
  { name: 'OMNIAGENTPAY_WORKSPACE_ID', description: 'Your workspace ID from Settings > General' },
  { name: 'OMNIAGENTPAY_ENVIRONMENT', description: 'Environment: production or sandbox', default: 'production' },
];

export const mcpService = {
  async getTools(): Promise<McpTool[]> {
    const tools = await apiClient.get<Array<{ name: string; description: string; parameters: unknown }>>('/mcp/tools');
    // Map to McpTool format
    return tools.map((tool, idx) => ({
      id: `tool_${idx + 1}`,
      name: tool.name,
      description: tool.description,
      parameters: Array.isArray(tool.parameters) ? tool.parameters : [],
    }));
  },

  async executeTool(toolName: string, params: Record<string, unknown>): Promise<McpToolResult> {
    return apiClient.post<McpToolResult>(`/mcp/tools/${toolName}`, params);
  },
};
