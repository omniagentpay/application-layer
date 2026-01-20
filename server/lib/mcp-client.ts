interface McpResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

/**
 * Check if an error is a transient network error that should be retried
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;
  
  // Check for connection reset, socket errors, and fetch failures
  return (
    errorMessage.includes('econnreset') ||
    errorMessage.includes('socket') ||
    errorMessage.includes('terminated') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('network') ||
    errorCode === 'ECONNRESET' ||
    errorCode === 'UND_ERR_SOCKET' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ECONNREFUSED'
  );
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call an MCP tool using JSON-RPC 2.0 protocol with retry logic
 */
export async function callMcp(
  method: string, 
  params: Record<string, any>, 
  debugId?: string,
  options?: { maxRetries?: number; timeout?: number }
): Promise<unknown> {
  const mcpServerUrl = process.env.MCP_SERVER_URL || process.env.VITE_MCP_SERVER_URL;
  const mcpApiKey = process.env.MCP_API_KEY || process.env.VITE_MCP_API_KEY || '';
  const maxRetries = options?.maxRetries ?? 3;
  const timeout = options?.timeout ?? 30000; // 30 seconds default

  if (!mcpServerUrl) {
    throw new Error('MCP server not configured. Please set MCP_SERVER_URL environment variable.');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // PHASE 6: Include debugId in params if provided
      const mcpParams = debugId ? { ...params, debug_id: debugId } : params;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${mcpServerUrl}/api/v1/mcp/rpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mcpApiKey}`,
            'Connection': 'keep-alive',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params: mcpParams,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`MCP call failed: ${response.status} ${errorText}`);
        }

        const data: JsonRpcResponse = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'MCP error');
        }

        // PHASE 1: Validate result-level status field
        // Some MCP tools return { status: "error", message: "..." } in a successful JSON-RPC envelope
        // We must treat these as errors to prevent silent failures
        const result = data.result as any;
        if (result && typeof result === 'object' && result.status === 'error') {
          const errorMsg = result.message || result.error || 'MCP tool returned error status';
          throw new Error(`MCP ${method}: ${errorMsg}`);
        }

        return data.result;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`MCP call timed out after ${timeout}ms`);
        }
        
        throw fetchError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error calling MCP');
      
      // If it's not a transient error, or we've exhausted retries, throw immediately
      if (!isTransientError(error) || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: wait 100ms, 200ms, 400ms, etc.
      const delayMs = Math.min(100 * Math.pow(2, attempt), 2000);
      console.warn(
        `[MCP Client] Transient error on attempt ${attempt + 1}/${maxRetries + 1} for ${method}: ${lastError.message}. Retrying in ${delayMs}ms...`
      );
      
      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error calling MCP');
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use callMcp instead
 */
export async function callMcpTool(tool: string, params: Record<string, unknown>): Promise<McpResponse> {
  try {
    const result = await callMcp(tool, params);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getMcpTools(): Promise<Array<{ name: string; description: string; input_schema: unknown }>> {
  try {
    const tools = await callMcp('list_tools', {}) as Array<{ name: string; description: string; input_schema: unknown }>;
    return tools || [];
  } catch (error) {
    console.error('Failed to fetch MCP tools:', error);
    // Return empty array on error
    return [];
  }
}
