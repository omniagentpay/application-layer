
# ==================== X402 GASLESS PAYMENTS ====================
# Execute gasless payment using off-chain signed x402 intent

/**
 * Execute X402 gasless payment
 * 
 * POST /api/x402/execute
 * 
 * X402 payments use off-chain signed intents for gasless UX.
 * The intent is signed server-side and verified by the MCP server before execution.
 */
x402Router.post('/execute', async (req, res) => {
    try {
        const signedIntent = req.body;
        const debugId = (req as any).debugId || 'unknown';

        console.log(`[${debugId}] X402 gasless payment execution started`, {
            intentId: signedIntent.intentId,
            amount: signedIntent.amount
        });

        // Validate required fields
        const requiredFields = ['intentId', 'fromAgent', 'to', 'amount', 'expiresAt', 'nonce', 'signature'];
        for (const field of requiredFields) {
            if (!signedIntent[field]) {
                return res.status(400).json({
                    error: `Missing required field: ${field}`,
                    status: 'error'
                });
            }
        }

        // Forward to MCP server for execution
        const result = await callMcp('execute_x402_payment', signedIntent);

        if (result.status === 'success') {
            console.log(`[${debugId}] X402 payment executed successfully:`, result.txHash);
            return res.json({
                success: true,
                ...result
            });
        }

        // MCP execution failed
        console.error(`[${debugId}] X402 MCP execution failed:`, result.message);
        return res.status(400).json({
            error: result.message || 'X402 execution failed',
            status: 'error'
        });

    } catch (error) {
        const debugId = (req as any).debugId || 'unknown';
        console.error(`[${debugId}] X402 endpoint error:`, error);
        return res.status(500).json({
            error: 'Internal server error during X402 execution',
            details: error instanceof Error ? error.message : 'Unknown error',
            status: 'error'
        });
    }
});
