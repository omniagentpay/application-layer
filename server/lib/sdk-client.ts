import { callMcp } from './mcp-client.js';

interface SimulateResult {
  success: boolean;
  estimatedFee: number;
  route: 'x402' | 'transfer' | 'cctp' | 'auto';
  guardResults: Array<{ guardId: string; guardName: string; passed: boolean; reason?: string }>;
}

interface ExecuteResult {
  success: boolean;
  txHash?: string;
  circleTransferId?: string; // PHASE 2: Circle transfer ID
  circleTransactionId?: string; // PHASE 2: Circle transaction ID
  explorerUrl?: string; // PHASE 2: Blockchain explorer link
  status: 'succeeded' | 'failed';
  error?: string;
}

interface RouteEstimate {
  route: 'auto' | 'cctp' | 'gateway' | 'bridge_kit';
  explanation: string;
  eta: string;
  fee: number;
  steps: string[];
}

export async function simulatePayment(params: {
  amount: number;
  recipient: string;
  recipientAddress: string;
  walletId: string;
  chain: string;
}): Promise<SimulateResult> {
  try {
    const result = await callMcp('simulate_payment', {
      from_wallet_id: params.walletId,
      to_address: params.recipientAddress,
      amount: params.amount.toString(),
      currency: 'USD',
    }) as { status: string; simulation?: any };

    // Parse MCP response and map to expected format
    if (result.status === 'success' && result.simulation) {
      const sim = result.simulation;
      const estimatedFee = parseFloat(sim.estimated_fee || '0.5');
      const validationPassed = sim.validation_passed !== false; // Default to true if not specified

      return {
        success: validationPassed,
        estimatedFee,
        route: 'auto' as const, // Route selection is handled by Python SDK internally
        guardResults: [], // Guard results are checked separately in the payments route
      };
    }

    // If simulation failed, return error result
    return {
      success: false,
      estimatedFee: 0,
      route: 'auto',
      guardResults: [],
    };
  } catch (error) {
    // On error, return failure result
    return {
      success: false,
      estimatedFee: 0,
      route: 'auto',
      guardResults: [],
    };
  }
}

export async function executePayment(intentId: string, intentData?: {
  walletId: string;
  recipientAddress: string;
  amount: number;
  currency?: string;
}): Promise<ExecuteResult> {
  try {
    // If intent data is provided, use pay_recipient directly (intents are stored in Node.js, not Python SDK)
    if (intentData) {
      // Check if this is a Privy wallet address (starts with 0x)
      // The Python SDK expects Circle wallet IDs, not Privy addresses
      const isPrivyWallet = intentData.walletId.match(/^0x[a-fA-F0-9]{40}$/);

      if (isPrivyWallet) {
        return {
          success: false,
          status: 'failed' as const,
          error: `Cannot execute payment with Privy wallet address. The payment SDK requires a Circle wallet ID (format: "wallet-..."), but received a Privy wallet address (${intentData.walletId}). Privy wallets require frontend transaction signing. Please use a Circle wallet for automated payments, or implement frontend signing for Privy wallets.`,
        };
      }

      console.log('[executePayment] Executing payment:', {
        walletId: intentData.walletId,
        recipientAddress: intentData.recipientAddress,
        amount: intentData.amount,
        currency: intentData.currency,
      });

      const result = await callMcp('pay_recipient', {
        from_wallet_id: intentData.walletId,
        to_address: intentData.recipientAddress,
        amount: intentData.amount.toString(),
        currency: intentData.currency || 'USD',
      }) as {
        status: string;
        payment_id?: string;
        transaction_id?: string;
        transfer_id?: string;
        blockchain_tx?: string;
        tx_hash?: string;  // Added: blockchain transaction hash from SDK
        message?: string;
        error?: string
      };

      console.log('[executePayment] MCP result:', JSON.stringify(result, null, 2));

      // Parse MCP response
      if (result.status === 'success') {
        // PHASE 2: Extract all execution artifacts
        // Priority order for tx_hash: tx_hash > blockchain_tx > (NOT transfer_id, that's Circle internal)
        const txHash = result.tx_hash || result.blockchain_tx || undefined;
        const circleTransferId = result.transfer_id || result.payment_id || undefined;
        const circleTransactionId = result.transaction_id || result.transfer_id || result.payment_id || undefined;

        // Generate explorer URL if we have a valid blockchain tx hash (starts with 0x)
        // Don't generate for UUIDs (transfer_ids) - those are Circle internal IDs
        const explorerBase = process.env.ARC_EXPLORER_TX_BASE || 'https://testnet.arcscan.app/tx/';
        const isValidBlockchainHash = txHash && (txHash.startsWith('0x') || txHash.match(/^[0-9a-fA-F]{64}$/));
        const explorerUrl = isValidBlockchainHash ? `${explorerBase}${txHash}` : undefined;

        console.log('[executePayment] Parsed result:', { txHash, circleTransferId, explorerUrl, isValidBlockchainHash });

        return {
          success: true,
          txHash,
          circleTransferId,
          circleTransactionId,
          explorerUrl,
          status: 'succeeded' as const,
        };
      }

      // If execution failed, extract error message
      const errorMessage = result.message || result.error || 'Payment execution failed';
      console.error('[executePayment] Payment failed:', errorMessage);

      // Check if it's a wallet-related error
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes('not found') || errorLower.includes('wallet') || errorLower.includes('api exception')) {
        // This error typically means the wallet_id format is incorrect (Privy address vs Circle ID)
        return {
          success: false,
          status: 'failed' as const,
          error: `Wallet error: The payment SDK expects a Circle wallet ID (format: "wallet-..."), but may have received an invalid wallet identifier. Circle wallets are required for automated payments via the SDK.`,
        };
      }

      return {
        success: false,
        status: 'failed' as const,
        error: errorMessage,
      };
    }

    // Fallback: Try to confirm payment intent (for intents created via Python SDK)
    // This should not be used for Node.js-stored intents
    console.warn('[executePayment] Falling back to confirm_payment_intent - this may fail for Node.js-stored intents');
    const result = await callMcp('confirm_payment_intent', {
      intent_id: intentId,
    }) as { status: string; confirmation?: any; message?: string };

    // Parse MCP response and map to expected format
    if (result.status === 'success' && result.confirmation) {
      const conf = result.confirmation;
      const success = conf.success === true;
      const txHash = conf.blockchain_tx || conf.transaction_id || undefined;

      return {
        success,
        txHash,
        status: success ? ('succeeded' as const) : ('failed' as const),
        error: success ? undefined : (conf.message || 'Payment execution failed'),
      };
    }

    // If execution failed
    return {
      success: false,
      status: 'failed' as const,
      error: result.message || 'Payment execution failed',
    };
  } catch (error) {
    return {
      success: false,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function estimateCrossChainRoute(params: {
  sourceChain: string;
  destChain: string;
  amount: number;
  preferredRoute?: string;
}): Promise<RouteEstimate> {
  // Replace with actual SDK call: return await sdk.estimateRoute(params);
  const cctpSupported = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche'];
  const route = params.preferredRoute === 'auto' || !params.preferredRoute
    ? (cctpSupported.includes(params.sourceChain) && cctpSupported.includes(params.destChain) ? 'cctp' : 'gateway')
    : params.preferredRoute as 'cctp' | 'gateway' | 'bridge_kit';

  return {
    route,
    explanation: `Route selected: ${route}`,
    eta: route === 'cctp' ? '~15 minutes' : '~30 minutes',
    fee: params.amount * (route === 'cctp' ? 0.001 : 0.002),
    steps: route === 'cctp'
      ? ['Initiate burn on source chain', 'Wait for attestation', 'Mint on destination chain']
      : ['Deposit to Gateway', 'Cross-chain verification', 'Release on destination'],
  };
}

export async function getTransactionHistory(params?: {
  walletId?: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  txHash?: string;
  recipient?: string;
}>> {
  // Replace with actual SDK call: return await sdk.getHistory(params);
  return [];
}

export async function generateReceiptSummary(tx: {
  id: string;
  amount: number;
  recipient?: string;
  type: string;
  chain: string;
  txHash?: string;
}): Promise<string> {
  // Replace with actual LLM call or SDK function
  // This could use OpenAI, Anthropic, or a provided SDK function
  return `Payment of $${tx.amount} USDC ${tx.recipient ? `to ${tx.recipient}` : ''} on ${tx.chain}${tx.txHash ? ` (${tx.txHash.slice(0, 10)}...)` : ''}`;
}
