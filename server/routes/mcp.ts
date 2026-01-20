import { Router } from 'express';
import { callMcpTool, getMcpTools } from '../lib/mcp-client.js';

export const mcpRouter = Router();

// Get available MCP tools
mcpRouter.get('/tools', async (req, res) => {
  try {
    const tools = await getMcpTools();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get tools' });
  }
});

// Execute an MCP tool
mcpRouter.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const params = req.body;
  
  const startTime = Date.now();
  
  try {
    const result = await callMcpTool(toolName, params);
    const duration = Date.now() - startTime;
    
    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
});
