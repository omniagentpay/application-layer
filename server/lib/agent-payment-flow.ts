/**
 * Agent Payment Auto-Execution Flow
 * 
 * Orchestrates the automated payment flow when Gemini detects a payment intent.
 * Executes: create_payment_intent → simulate_payment → confirm_payment_intent
 * 
 * All execution goes through MCP tools. Technical details are logged to execution console.
 */

import { callMcp } from './mcp-client.js';
import { storage } from './storage.js';
import type { PaymentIntent } from '../types/index.js';

export interface PaymentFlowStatus {
  step: 'creating_intent' | 'simulating' | 'checking_guards' | 'executing' | 'completed' | 'failed' | 'requires_approval';
  message: string;
  intentId?: string;
  technicalDetails?: {
    tool: string;
    input: Record<string, unknown>;
    output?: unknown;
    error?: string;
  };
}

/**
 * Check if a payment qualifies for auto-approval based on backend guards.
 */
/**
 * Check if a payment qualifies for auto-approval based on backend guards.
 */
function checkAutoApproval(amount: number): boolean {
  const allGuards = storage.getAllGuards();
  const autoApproveGuard = allGuards.find(g => g.enabled && g.type === 'auto_approve');

  if (!autoApproveGuard || !autoApproveGuard.config.threshold) {
    // No auto-approve guard configured, default to requiring approval
    console.log('[AgentPaymentFlow] No auto-approve guard found or no threshold, requiring approval');
    return false;
  }

  // Payment qualifies for auto-approval if amount is <= threshold
  const threshold = autoApproveGuard.config.threshold;
  const isAutoApproved = amount <= threshold;
  console.log(`[AgentPaymentFlow] Auto-approve check: amount=${amount}, threshold=${threshold}, autoApproved=${isAutoApproved}`);
  return isAutoApproved;
}




/**
 * Execute the full agent payment flow automatically
 * 
 * @param params Payment parameters extracted from user message
 * @param onStatusUpdate Callback for streaming status updates
 * @returns Final payment result
 */
export async function executeAgentPaymentFlow(
  params: {
    amount: number;
    recipient: string;
    recipientAddress: string;
    description?: string;
    walletId: string;
    chain?: string;
    currency?: string;
  },
  onStatusUpdate?: (status: PaymentFlowStatus) => void
): Promise<{
  success: boolean;
  intentId?: string;
  txHash?: string;
  requiresManualApproval: boolean;
  error?: string;
}> {
  const { amount, recipient, recipientAddress, description, walletId, chain = 'arc-testnet', currency = 'USD' } = params;

  // Helper to emit status updates
  const emitStatus = (status: PaymentFlowStatus) => {
    onStatusUpdate?.(status);
    // Also log to console for debugging
    console.log(`[AgentPaymentFlow] ${status.step}: ${status.message}`);
  };

  try {
    // STEP 0: Check auto-approve eligibility
    const canAutoApprove = checkAutoApproval(amount);
    console.log(`[AgentPaymentFlow] Starting flow for ${amount} ${currency} to ${recipientAddress}, canAutoApprove=${canAutoApprove}`);

    // FAST PATH: For auto-approved payments, skip intent creation and directly pay
    // This avoids the intent storage issues and provides instant execution for small amounts
    if (canAutoApprove) {
      emitStatus({
        step: 'executing',
        message: '⚡ Auto-approved: Executing gasless payment…',
        technicalDetails: {
          tool: 'pay_recipient',
          input: { from_wallet_id: walletId, to_address: recipientAddress, amount: amount.toString(), currency },
        },
      });

      const payResult = await callMcp('pay_recipient', {
        from_wallet_id: walletId,
        to_address: recipientAddress,
        amount: amount.toString(),
        currency,
      }) as { status: string; tx_hash?: string; transfer_id?: string; blockchain_tx?: string; message?: string; error?: string };

      console.log('[AgentPaymentFlow] Direct pay result:', payResult);

      if (payResult.status === 'success') {
        const txHash = payResult.blockchain_tx || payResult.tx_hash;
        const shortAddress = recipientAddress.length > 10
          ? `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
          : recipientAddress;

        emitStatus({
          step: 'completed',
          message: `✅ Paid ${amount} ${currency} to ${shortAddress}`,
          technicalDetails: {
            tool: 'pay_recipient',
            input: { from_wallet_id: walletId, to_address: recipientAddress, amount: amount.toString() },
            output: {
              success: true,
              tx_hash: txHash,
              transfer_id: payResult.transfer_id,
            },
          },
        });

        return {
          success: true,
          txHash,
          requiresManualApproval: false,
        };
      } else {
        const errorMsg = payResult.message || payResult.error || 'Payment execution failed';
        emitStatus({
          step: 'failed',
          message: `⚠️ Payment failed: ${errorMsg}`,
          technicalDetails: {
            tool: 'pay_recipient',
            input: { from_wallet_id: walletId, to_address: recipientAddress, amount: amount.toString() },
            error: errorMsg,
          },
        });
        return {
          success: false,
          requiresManualApproval: false, // It was auto-approved but failed for another reason
          error: errorMsg,
        };
      }
    }

    // STANDARD PATH: For non-auto-approved payments, use the intent flow
    // STEP 1: Create Payment Intent (Python SDK)
    emitStatus({
      step: 'creating_intent',
      message: '🟡 Generating payment intent…',
      technicalDetails: {
        tool: 'create_payment_intent',
        input: { wallet_id: walletId, recipient: recipientAddress, amount: amount.toString(), currency },
      },
    });

    const createResult = await callMcp('create_payment_intent', {
      wallet_id: walletId,
      recipient: recipientAddress,
      amount: amount.toString(),
      currency,
      metadata: {
        description: description || `Payment to ${recipient}`,
        chain,
        auto_executed: true,
      },
    }) as { status: string; intent?: any; message?: string };

    if (createResult.status !== 'success' || !createResult.intent) {
      const errorMsg = createResult.message || 'Failed to create payment intent';
      emitStatus({
        step: 'requires_approval',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        technicalDetails: {
          tool: 'create_payment_intent',
          input: { wallet_id: walletId, recipient: recipientAddress, amount: amount.toString() },
          error: errorMsg,
        },
      });
      return {
        success: false,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }


    // Extract intent ID from Python SDK response
    // The MCP tool returns: { status: "success", intent: { intent_id: "...", ... } }
    // The omni_client returns: { intent_id: result.id, status: ..., amount: ... }
    const intentId = createResult.intent.intent_id || createResult.intent.id;

    if (!intentId) {
      // Log the full response for debugging
      console.error('[AgentPaymentFlow] Failed to extract intent_id. Full response:', JSON.stringify(createResult, null, 2));
      const errorMsg = `Failed to get intent ID from payment intent creation. Response: ${JSON.stringify(createResult.intent)}`;
      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        technicalDetails: {
          tool: 'create_payment_intent',
          input: { wallet_id: walletId, recipient: recipientAddress, amount: amount.toString() },
          output: createResult.intent,
          error: errorMsg,
        },
      });
      return {
        success: false,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }

    // Log successful intent creation for debugging
    console.log('[AgentPaymentFlow] Payment intent created successfully:', {
      intentId,
      status: createResult.intent.status,
      fullIntentResponse: JSON.stringify(createResult.intent, null, 2)
    });

    // Validate intent_id format (should be a non-empty string)
    if (typeof intentId !== 'string' || intentId.trim().length === 0) {
      const errorMsg = `Invalid intent_id format: ${JSON.stringify(intentId)}. Expected non-empty string.`;
      console.error('[AgentPaymentFlow] Invalid intent_id:', { intentId, fullResponse: createResult });
      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        technicalDetails: {
          tool: 'create_payment_intent',
          input: { wallet_id: walletId, recipient: recipientAddress, amount: amount.toString() },
          output: createResult.intent,
          error: errorMsg,
        },
      });
      return {
        success: false,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }

    emitStatus({
      step: 'creating_intent',
      message: '🟡 Generating payment intent…',
      intentId,
      technicalDetails: {
        tool: 'create_payment_intent',
        input: { wallet_id: walletId, recipient: recipientAddress, amount: amount.toString() },
        output: createResult.intent,
      },
    });

    // STEP 2: Simulate Payment (check guardrails)
    // Note: create_payment_intent already simulates internally, but we simulate again
    // explicitly for visibility and to double-check guards
    emitStatus({
      step: 'simulating',
      message: '🔍 Checking guardrails…',
      intentId,
      technicalDetails: {
        tool: 'simulate_payment',
        input: {
          from_wallet_id: walletId,
          to_address: recipientAddress,
          amount: amount.toString(),
          currency,
        },
      },
    });

    const simulateResult = await callMcp('simulate_payment', {
      from_wallet_id: walletId,
      to_address: recipientAddress,
      amount: amount.toString(),
      currency,
    }) as { status: string; simulation?: any; message?: string };

    // Log simulation result
    console.log('[AgentPaymentFlow] Simulation result:', {
      status: simulateResult.status,
      validationPassed: simulateResult.simulation?.validation_passed,
      intentId
    });

    if (simulateResult.status !== 'success') {
      const errorMsg = simulateResult.message || 'Simulation failed';
      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        intentId,
        technicalDetails: {
          tool: 'simulate_payment',
          input: { from_wallet_id: walletId, to_address: recipientAddress, amount: amount.toString() },
          error: errorMsg,
        },
      });
      return {
        success: false,
        intentId,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }

    const simulation = simulateResult.simulation || {};
    const validationPassed = simulation.validation_passed !== false;

    if (!validationPassed) {
      const reason = simulation.reason || 'Guard validation failed';
      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        intentId,
        technicalDetails: {
          tool: 'simulate_payment',
          input: { from_wallet_id: walletId, to_address: recipientAddress, amount: amount.toString() },
          output: simulation,
          error: reason,
        },
      });
      return {
        success: false,
        intentId,
        requiresManualApproval: true,
        error: reason,
      };
    }

    emitStatus({
      step: 'checking_guards',
      message: '🔍 Checking guardrails…',
      intentId,
      technicalDetails: {
        tool: 'simulate_payment',
        input: { from_wallet_id: walletId, to_address: recipientAddress, amount: amount.toString() },
        output: simulation,
      },
    });

    // STEP 3: Execute Payment (confirm_payment_intent)
    // Only proceed if guards passed and auto-approve is allowed
    emitStatus({
      step: 'executing',
      message: '⚡ Executing gasless payment…',
      intentId,
      technicalDetails: {
        tool: 'confirm_payment_intent',
        input: { intent_id: intentId },
      },
    });

    // Log before confirming with full context
    console.log('[AgentPaymentFlow] Confirming payment intent:', {
      intentId,
      intentIdType: typeof intentId,
      intentIdLength: intentId?.length,
      walletId,
      recipientAddress,
      amount,
      createResultIntent: JSON.stringify(createResult.intent, null, 2)
    });

    // Add a small delay to ensure intent is fully persisted (if using async storage)
    await new Promise(resolve => setTimeout(resolve, 200));

    let confirmResult: { status: string; confirmation?: any; message?: string };
    try {
      confirmResult = await callMcp('confirm_payment_intent', {
        intent_id: intentId,
      }) as { status: string; confirmation?: any; message?: string };

      console.log('[AgentPaymentFlow] Confirm result:', {
        status: confirmResult.status,
        hasConfirmation: !!confirmResult.confirmation,
        message: confirmResult.message,
        fullResponse: JSON.stringify(confirmResult, null, 2)
      });
    } catch (error) {
      // Handle MCP call errors (network, timeout, etc.)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during payment confirmation';
      console.error('[AgentPaymentFlow] Exception during confirm:', {
        intentId,
        error: errorMsg,
        errorStack: error instanceof Error ? error.stack : undefined
      });

      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        intentId,
        technicalDetails: {
          tool: 'confirm_payment_intent',
          input: { intent_id: intentId },
          error: errorMsg,
        },
      });
      return {
        success: false,
        intentId,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }

    if (confirmResult.status !== 'success' || !confirmResult.confirmation) {
      const errorMsg = confirmResult.message || 'Payment execution failed';
      // Log full error for debugging
      console.error('[AgentPaymentFlow] Confirm payment intent failed:', {
        intentId,
        status: confirmResult.status,
        message: errorMsg,
        fullResponse: confirmResult
      });

      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        intentId,
        technicalDetails: {
          tool: 'confirm_payment_intent',
          input: { intent_id: intentId },
          output: confirmResult,
          error: errorMsg,
        },
      });
      return {
        success: false,
        intentId,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }

    const confirmation = confirmResult.confirmation;
    // Extract tx hash - blockchain_tx is the on-chain transaction hash
    const txHash = confirmation.blockchain_tx || confirmation.tx_hash;
    const success = confirmation.success !== false;

    if (success) {
      // Format recipient address for display (truncate)
      const shortAddress = recipientAddress.length > 10
        ? `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
        : recipientAddress;

      emitStatus({
        step: 'completed',
        message: `✅ Paid ${amount} ${currency} to ${shortAddress}`,
        intentId,
        technicalDetails: {
          tool: 'confirm_payment_intent',
          input: { intent_id: intentId },
          output: {
            success: true,
            tx_hash: txHash,
            transfer_id: confirmation.transfer_id || confirmation.transaction_id,
            amount: amount.toString(),
          },
        },
      });

      return {
        success: true,
        intentId,
        txHash,
        requiresManualApproval: false,
      };
    } else {
      const errorMsg = confirmation.message || 'Payment execution failed';
      emitStatus({
        step: 'failed',
        message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
        intentId,
        technicalDetails: {
          tool: 'confirm_payment_intent',
          input: { intent_id: intentId },
          output: confirmation,
          error: errorMsg,
        },
      });
      return {
        success: false,
        intentId,
        requiresManualApproval: true,
        error: errorMsg,
      };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    emitStatus({
      step: 'failed',
      message: `⚠️ Payment requires manual approval. Please review the payment intent.`,
      technicalDetails: {
        tool: 'agent_payment_flow',
        input: { amount, recipient, recipientAddress, walletId },
        error: errorMsg,
      },
    });
    return {
      success: false,
      requiresManualApproval: true,
      error: errorMsg,
    };
  }
}

/**
 * Check if a user message contains a payment command
 * Returns extracted payment parameters if detected
 * Supports both wallet addresses (0x...) and usernames (@username)
 */
export function detectPaymentCommand(message: string): {
  detected: boolean;
  amount?: number;
  recipientAddress?: string;
  recipientUsername?: string;
  currency?: string;
} {
  // Pattern: "pay <amount> <currency> to <address or @username>"
  // Also handles: "send", "transfer", "pay"
  const patterns = [
    // Wallet address pattern: 0x followed by 40 hex characters
    /(?:pay|send|transfer)\s+(\d+\.?\d*)\s*(USDC|USD|usdc|usd)?\s+to\s+(0x[a-fA-F0-9]{40})/i,
    /(?:pay|send|transfer)\s+(\d+\.?\d*)\s+(USDC|USD|usdc|usd)\s+to\s+(0x[a-fA-F0-9]{40})/i,
    // Username pattern: @ followed by alphanumeric (1-8 chars)
    /(?:pay|send|transfer)\s+(\d+\.?\d*)\s*(USDC|USD|usdc|usd)?\s+to\s+@([a-z0-9]{1,8})/i,
    /(?:pay|send|transfer)\s+(\d+\.?\d*)\s+(USDC|USD|usdc|usd)\s+to\s+@([a-z0-9]{1,8})/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const currency = (match[2] || match[3] || 'USDC').toUpperCase();
      
      // Check if it's a wallet address (starts with 0x) or username (starts with @)
      const recipient = match[3] || match[4] || match[5] || match[6];
      
      if (recipient.startsWith('0x')) {
        // Wallet address
        return {
          detected: true,
          amount,
          currency,
          recipientAddress: recipient,
        };
      } else {
        // Username (without @)
        return {
          detected: true,
          amount,
          currency,
          recipientUsername: recipient.toLowerCase(),
        };
      }
    }
  }

  return { detected: false };
}
