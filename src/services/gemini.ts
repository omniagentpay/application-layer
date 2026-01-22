/**
 * Google Gemini AI Service
 * 
 * Integrates Gemini AI with OmniAgentPay payment operations
 */

import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai';
import { paymentsService } from './payments';
import { walletsService } from './wallets';
import type { ChatMessage } from '@/types';
import { checkRateLimit, recordRequest } from '@/utils/rateLimiter';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// Default to gemini-2.5-flash (newer, faster) or fallback to gemini-1.5-pro
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.warn('VITE_GEMINI_API_KEY not set. Gemini features will be disabled.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Payment tools available to the Gemini agent
 */
const paymentTools: FunctionDeclaration[] = [
  {
    name: 'check_balance',
    description: 'Check the USDC balance ONLY when the user explicitly asks for balance. Do NOT call this before making payments. Returns a simple balance amount.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        walletId: {
          type: SchemaType.STRING,
          description: 'Optional wallet ID',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_wallets',
    description: 'ONLY call this when user explicitly asks to "list wallets" or "show my wallets". Do NOT call automatically. Returns wallet information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_payment_intent',
    description: 'Create a payment intent to send USDC. Call this IMMEDIATELY when user requests a payment. Do NOT check balance first. Do NOT call any other tools before or after this. Supports both wallet addresses (0x...) and usernames (@username).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount in USDC to send',
        },
        recipient: {
          type: SchemaType.STRING,
          description: 'Recipient address (0x...) or username (@username). If username is provided, recipientAddress can be the same username.',
        },
        recipientAddress: {
          type: SchemaType.STRING,
          description: 'Blockchain address of the recipient (0x format) or username (@username). If username is provided, it will be resolved to wallet address automatically.',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Human-readable description of the payment',
        },
        walletId: {
          type: SchemaType.STRING,
          description: 'Optional source wallet ID. If not provided, uses the connected Privy wallet address',
        },
        chain: {
          type: SchemaType.STRING,
          description: 'Optional blockchain network. Defaults to ARC Testnet if not provided',
        },
      },
      required: ['amount', 'recipient', 'recipientAddress'],
    },
  },
  {
    name: 'simulate_payment',
    description: 'Simulate a payment to check if it would succeed, including guard checks and fee estimation',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        intentId: {
          type: SchemaType.STRING,
          description: 'Payment intent ID to simulate',
        },
      },
      required: ['intentId'],
    },
  },
  {
    name: 'approve_payment',
    description: 'Approve a payment intent that requires approval',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        intentId: {
          type: SchemaType.STRING,
          description: 'Payment intent ID to approve',
        },
      },
      required: ['intentId'],
    },
  },
  {
    name: 'execute_payment',
    description: 'Execute an approved payment intent, sending funds on-chain',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        intentId: {
          type: SchemaType.STRING,
          description: 'Payment intent ID to execute',
        },
      },
      required: ['intentId'],
    },
  },
  {
    name: 'list_transactions',
    description: 'List recent transactions with optional filters',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        walletId: {
          type: SchemaType.STRING,
          description: 'Optional wallet ID to filter transactions',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'Maximum number of transactions to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_payment_intents',
    description: 'List all payment intents with their current status',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: 'Optional status filter (pending, awaiting_approval, approved, executed, failed)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_payment_link',
    description: 'Generate a USDC payment link on Arc that can be paid by Privy or Circle wallets. Returns a shareable payment URL.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount in USDC',
        },
        recipientWallet: {
          type: SchemaType.OBJECT,
          description: 'Recipient wallet information',
          properties: {
            type: {
              type: SchemaType.STRING,
              description: 'Wallet type: "circle" for Circle wallet ID, "privy" for Privy address (0x...)',
            },
            ref: {
              type: SchemaType.STRING,
              description: 'Wallet ID (Circle) or address (Privy 0x...)',
            },
          },
        },
        description: {
          type: SchemaType.STRING,
          description: 'Payment description',
        },
        expiresIn: {
          type: SchemaType.NUMBER,
          description: 'Link expiration in seconds (optional)',
        },
      },
      required: ['amount', 'recipientWallet'],
    },
  },
  {
    name: 'generate_checkout_link',
    description: 'Generate an ArcPay checkout payment link (URL) for receiving payments. Use this when the user asks to "generate a payment link", "create checkout", or "generate checkout link". Returns a shareable checkout URL.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount in USDC to receive',
        },
        currency: {
          type: SchemaType.STRING,
          description: 'Currency (defaults to USDC)',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Optional payment description',
        },
      },
      required: ['amount'],
    },
  },
  {
    name: 'generate_checkout_qr',
    description: 'Generate an ArcPay checkout payment link with QR code for receiving payments. Use this when the user asks to "generate qr payment link", "create qr checkout", or "generate qr code". Returns a shareable checkout URL and QR code image.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount in USDC to receive',
        },
        currency: {
          type: SchemaType.STRING,
          description: 'Currency (defaults to USDC)',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Optional payment description',
        },
      },
      required: ['amount'],
    },
  },
];

/**
 * Execute a tool call from Gemini
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  defaultWalletId?: string,
  defaultChain?: string,
  privyUserId?: string,
  privyWalletAddresses?: string[]
): Promise<unknown> {
  try {
    switch (toolName) {
      case 'check_balance':
        // For agent wallet, call MCP server's check_balance
        // Try to get user's actual wallet ID first using the balance endpoint
        let agentWalletForBalance: string | null = null;
        
        // Try to fetch user's actual agent wallet if privyUserId is provided
        if (privyUserId) {
          try {
            const { agentWalletService } = await import('./wallets');
            // Use getAgentWalletBalance which uses the correct /wallets/agent/balance endpoint
            const balanceData = await agentWalletService.getAgentWalletBalance(privyUserId);
            if (balanceData?.walletId) {
              agentWalletForBalance = balanceData.walletId;
              console.log('[Gemini check_balance] Using user agent wallet:', agentWalletForBalance);
            }
          } catch (error) {
            console.warn('[Gemini check_balance] Failed to fetch user agent wallet, using fallback:', error);
          }
        }
        
        // Fallback to env var or hardcoded value (should rarely happen)
        if (!agentWalletForBalance) {
          agentWalletForBalance = import.meta.env.VITE_AGENT_CIRCLE_WALLET_ID || '8a57ee78-f796-536e-aa8e-b5fadfd3dcec';
          console.warn('[Gemini check_balance] Using FALLBACK agent wallet:', agentWalletForBalance);
        }
        
        const MCP_URL = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3333';

        if (args.walletId) {
          // Specific wallet ID provided - check if it's the agent wallet
          if (args.walletId === agentWalletForBalance) {
            // Call MCP server for Circle wallet balance
            try {
              const mcpResult = await fetch(`${import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3333'}/api/v1/mcp/rpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'check_balance',
                  params: { wallet_id: args.walletId },
                  id: Date.now()
                })
              });
              const data = await mcpResult.json();
              
              // Check for JSON-RPC error
              if (data.error) {
                console.error('MCP balance check JSON-RPC error:', data.error);
                return { error: data.error.message || 'MCP server error', status: 'error' };
              }
              // Check for tool-level error status
              if (data.result && data.result.status === 'error') {
                console.error('MCP balance check failed:', data.result.message || 'Unknown error');
                return { error: data.result.message || 'Balance check failed', status: 'error' };
              }
              // Return result if present
              if (data.result) {
                return data.result;
              }
              return { error: 'No result from MCP server', status: 'error' };
            } catch (error) {
              console.error('MCP balance check failed:', error);
              return { error: error instanceof Error ? error.message : 'Network error', status: 'error' };
            }
          }
          const balance = await walletsService.getWalletBalance(args.walletId as string);
          return balance || { error: 'Wallet not found' };
        } else {
          // No wallet ID - get unified balance including agent wallet
          let totalBalance = 0;
          const byChain: Record<string, number> = {};
          let privyWalletBalance = 0;
          let circleAgentWalletBalance = 0;

          // First, try to get Circle agent wallet balance from MCP
          if (agentWalletForBalance) {
            try {
              const mcpResult = await fetch(`${import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3333'}/api/v1/mcp/rpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'check_balance',
                  params: { wallet_id: agentWalletForBalance },
                  id: Date.now()
                })
              });
              const data = await mcpResult.json();
              
              // Check for JSON-RPC error
              if (data.error) {
                console.error('MCP balance check JSON-RPC error:', data.error);
              } 
              // Check for tool-level error status
              else if (data.result && data.result.status === 'error') {
                console.error('MCP balance check failed:', data.result.message || 'Unknown error');
              }
              // Check for success with balance
              else if (data.result && data.result.status === 'success' && data.result.usdc_balance !== undefined) {
                circleAgentWalletBalance = parseFloat(data.result.usdc_balance) || 0;
                totalBalance += circleAgentWalletBalance;
                byChain['arc-testnet'] = (byChain['arc-testnet'] || 0) + circleAgentWalletBalance;
              }
              // Legacy format support (no status field)
              else if (data.result && data.result.usdc_balance !== undefined) {
                circleAgentWalletBalance = parseFloat(data.result.usdc_balance) || 0;
                totalBalance += circleAgentWalletBalance;
                byChain['arc-testnet'] = (byChain['arc-testnet'] || 0) + circleAgentWalletBalance;
              } else {
                console.warn('MCP balance check returned unexpected format:', data.result);
              }
            } catch (error) {
              console.error('MCP balance check failed:', error);
            }
          }

          // Also get Privy wallets balance (Metamask)
          try {
            // Use provided Privy wallet addresses, or try to get them from API
            let privyWalletAddressesToUse = privyWalletAddresses;
            
            if (!privyWalletAddressesToUse || privyWalletAddressesToUse.length === 0) {
              // Fallback: try to get wallets from API
              const privyWallets = await walletsService.getWallets();
              privyWalletAddressesToUse = privyWallets.map(w => w.address).filter(addr => addr && addr.match(/^0x[a-fA-F0-9]{40}$/));
            }
            
            if (privyWalletAddressesToUse && privyWalletAddressesToUse.length > 0) {
              const privyBalance = await walletsService.getUnifiedBalance(privyWalletAddressesToUse);
              privyWalletBalance = privyBalance.total || 0;
              totalBalance += privyWalletBalance;
              Object.entries(privyBalance.byChain || {}).forEach(([chain, amount]) => {
                byChain[chain] = (byChain[chain] || 0) + amount;
              });
            }
          } catch (error) {
            console.error('Privy balance check failed:', error);
          }

          // Return structured response with separate balances
          return {
            total: totalBalance,
            byChain,
            wallets: {
              privyWallet: {
                balance: privyWalletBalance,
                currency: 'USDC',
                type: 'Metamask',
              },
              circleAgentWallet: {
                balance: circleAgentWalletBalance,
                currency: 'USDC',
                type: 'Circle Agent',
              },
            },
            network: 'ARC Network',
          };
        }

      case 'list_wallets':
        // Get both Privy wallets and Circle agent wallet
        const wallets: Array<{ id: string; type: string; address?: string; chain: string; balance?: string }> = [];

        // Use the same endpoint as the header to ensure consistency
        if (privyUserId) {
          try {
            const { agentWalletService } = await import('./wallets');
            // Use getAgentWalletBalance which uses the same endpoint as the header
            const balanceData = await agentWalletService.getAgentWalletBalance(privyUserId);
            if (balanceData?.walletId) {
              wallets.push({
                id: balanceData.walletId,
                type: 'circle',
                address: balanceData.walletId, // Circle wallet ID is the address
                chain: 'arc-testnet',
                balance: balanceData.balance?.toString() || '0',
              });
              console.log('[list_wallets] Using user\'s agent wallet from balance endpoint:', balanceData.walletId, 'Balance:', balanceData.balance);
            }
          } catch (error) {
            console.warn('[list_wallets] Failed to fetch user agent wallet balance, trying fallback:', error);
            // Fallback: try getAgentWallet
            try {
              const { agentWalletService } = await import('./wallets');
              const agentWallet = await agentWalletService.getAgentWallet(privyUserId);
              if (agentWallet?.walletId) {
                // Get balance from MCP for this wallet
                try {
                  const mcpResult = await fetch(`${import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3333'}/api/v1/mcp/rpc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jsonrpc: '2.0',
                      method: 'check_balance',
                      params: { wallet_id: agentWallet.walletId },
                      id: Date.now()
                    })
                  });
                  const data = await mcpResult.json();
                  wallets.push({
                    id: agentWallet.walletId,
                    type: 'circle',
                    address: agentWallet.walletId,
                    chain: 'arc-testnet',
                    balance: data.result?.usdc_balance || '0',
                  });
                } catch (mcpError) {
                  wallets.push({
                    id: agentWallet.walletId,
                    type: 'circle',
                    chain: 'arc-testnet',
                  });
                }
              }
            } catch (fallbackError) {
              console.warn('[list_wallets] Fallback also failed:', fallbackError);
            }
          }
        }
        
        // Final fallback to environment variable or hardcoded value (only if user wallet fetch failed)
        if (wallets.length === 0 || !wallets.some(w => w.type === 'circle')) {
          const AGENT_WALLET_ID = '8a57ee78-f796-536e-aa8e-b5fadfd3dcec';
          const agentWalletId = import.meta.env.VITE_AGENT_CIRCLE_WALLET_ID || AGENT_WALLET_ID;
          console.warn('[list_wallets] Using hardcoded fallback agent wallet:', agentWalletId);
          
          try {
            const mcpResult = await fetch(`${import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3333'}/api/v1/mcp/rpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'check_balance',
                params: { wallet_id: agentWalletId },
                id: Date.now()
              })
            });
            const data = await mcpResult.json();
            wallets.push({
              id: agentWalletId,
              type: 'circle',
              address: agentWalletId,
              chain: 'arc-testnet',
              balance: data.result?.usdc_balance || '0',
            });
          } catch (error) {
            wallets.push({
              id: agentWalletId,
              type: 'circle',
              chain: 'arc-testnet',
            });
          }
        }

        // Also get Privy wallets
        try {
          const privyWallets = await walletsService.getWallets();
          privyWallets.forEach(w => {
            wallets.push({
              id: w.id,
              type: 'privy',
              address: w.address,
              chain: w.chain,
            });
          });
        } catch (error) {
          console.error('Failed to get Privy wallets:', error);
        }

        return wallets;

      case 'create_payment_intent':
        // Agent-initiated payments should use the user's agent wallet
        // Get the user's actual agent wallet ID using the same endpoint as balance check
        let agentWalletIdToUse: string | null = null;
        
        console.log('[Gemini create_payment_intent] privyUserId:', privyUserId);
        if (privyUserId) {
          try {
            const { agentWalletService } = await import('./wallets');
            console.log('[Gemini create_payment_intent] Calling getAgentWalletBalance for user:', privyUserId);
            // Use getAgentWalletBalance which uses the correct /wallets/agent/balance endpoint
            const balanceData = await agentWalletService.getAgentWalletBalance(privyUserId);
            console.log('[Gemini create_payment_intent] Balance data received:', balanceData);
            if (balanceData?.walletId) {
              agentWalletIdToUse = balanceData.walletId;
              console.log('[Gemini create_payment_intent] ✅ Using user agent wallet from balance endpoint:', agentWalletIdToUse, 'Balance:', balanceData.balance);
            } else {
              console.error('[Gemini create_payment_intent] ❌ No walletId in balance data:', balanceData);
            }
          } catch (error) {
            console.error('[Gemini create_payment_intent] ❌ Failed to fetch user agent wallet balance:', error);
          }
        } else {
          console.warn('[Gemini create_payment_intent] ⚠️ No privyUserId provided!');
        }
        
        // Fallback to env var or hardcoded value (should rarely happen)
        if (!agentWalletIdToUse) {
          const PAYMENT_WALLET_ID = '8a57ee78-f796-536e-aa8e-b5fadfd3dcec';
          agentWalletIdToUse = import.meta.env.VITE_AGENT_CIRCLE_WALLET_ID || PAYMENT_WALLET_ID;
          console.warn('[Gemini create_payment_intent] Using FALLBACK agent wallet (this should not happen for logged-in users):', agentWalletIdToUse);
        }

        if (!agentWalletIdToUse) {
          return {
            error: 'Agent wallet not configured. AGENT_CIRCLE_WALLET_ID must be set in environment variables.'
          };
        }

        const chain = (args.chain as string) || defaultChain || 'arc-testnet';

        // Resolve username to wallet address if recipient is a username
        let recipientAddress = args.recipientAddress as string;
        let recipient = args.recipient as string;
        
        // Check if recipient is a username (starts with @ or is just alphanumeric without 0x)
        if (recipient && !recipient.startsWith('0x') && recipient.length <= 8) {
          // Remove @ if present
          const username = recipient.startsWith('@') ? recipient.slice(1) : recipient;
          
          // Only resolve if it looks like a username (alphanumeric, lowercase)
          if (/^[a-z0-9]+$/.test(username.toLowerCase())) {
            try {
              const { getWalletAddressByUsername } = await import('./supabase/users');
              const resolvedAddress = await getWalletAddressByUsername(username);
              
              if (resolvedAddress) {
                recipientAddress = resolvedAddress;
                recipient = `@${username}`; // Keep username for display
                console.log('[Gemini create_payment_intent] ✅ Resolved username @' + username + ' to address:', resolvedAddress);
              } else {
                return {
                  error: `Username @${username} not found. Please make sure the recipient has set up their username.`
                };
              }
            } catch (error) {
              console.error('[Gemini create_payment_intent] ❌ Failed to resolve username:', error);
              return {
                error: `Failed to resolve username @${username}. Please try again or use a wallet address.`
              };
            }
          }
        }

        if (!recipientAddress) {
          return {
            error: 'Recipient address is required. Please provide a wallet address or username.'
          };
        }

        // Agent payments always use Circle wallet
        // Create the intent - the frontend will handle auto-execution
        const intent = await paymentsService.createIntent({
          amount: args.amount as number,
          recipient: recipient,
          recipientAddress: recipientAddress,
          description: args.description as string || `Payment to ${recipient}`,
          walletId: agentWalletIdToUse, // Use agent Circle wallet
          chain,
          fromWallet: {
            role: 'agent',
            type: 'circle',
            ref: agentWalletIdToUse,
          },
        });

        // Return intent with success indicator - frontend will trigger auto-execution
        return {
          ...intent,
          autoExecute: true, // Signal to frontend that this should auto-execute
        };

      case 'simulate_payment':
        return await paymentsService.simulateIntent(args.intentId as string);

      case 'approve_payment':
        const approved = await paymentsService.approveIntent(args.intentId as string);
        return { success: approved };

      case 'execute_payment':
        return await paymentsService.executeIntent(args.intentId as string);

      case 'list_transactions':
        return await paymentsService.getTransactions({
          walletId: args.walletId as string | undefined,
          limit: args.limit as number | undefined,
        });

      case 'list_payment_intents':
        const intents = await paymentsService.getIntents();
        if (args.status) {
          return intents.filter(i => i.status === args.status);
        }
        return intents;

      case 'create_payment_link':
        const recipientWallet = args.recipientWallet as { type: string; ref: string };
        if (!recipientWallet || !recipientWallet.ref) {
          return { error: 'recipientWallet.ref is required' };
        }

        return await paymentsService.createIntent({
          amount: args.amount as number,
          recipient: recipientWallet.ref,
          recipientAddress: recipientWallet.ref,
          description: args.description as string || `Payment link for ${args.amount} USDC`,
          walletId: recipientWallet.ref, // For payment links, walletId is the recipient
          chain: 'arc-testnet',
          intentType: 'payment_link',
          recipientWalletType: (recipientWallet.type || 'privy') as 'circle' | 'privy',
          paymentLink: args.expiresIn ? {
            expiresAt: Date.now() + ((args.expiresIn as number) * 1000),
          } : undefined,
        });

      case 'generate_checkout_link':
        // Call the checkout API endpoint
        const checkoutLinkResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/checkout/link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Privy-User-Id': privyUserId || '',
          },
          body: JSON.stringify({
            amount: args.amount as number,
            currency: (args.currency as string) || 'USDC',
            description: args.description as string,
          }),
        });

        if (!checkoutLinkResponse.ok) {
          const errorData = await checkoutLinkResponse.json();
          return {
            error: errorData.message || 'Failed to create checkout link',
          };
        }

        return await checkoutLinkResponse.json();

      case 'generate_checkout_qr':
        // Call the checkout QR API endpoint
        const checkoutQRResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/checkout/qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Privy-User-Id': privyUserId || '',
          },
          body: JSON.stringify({
            amount: args.amount as number,
            currency: (args.currency as string) || 'USDC',
            description: args.description as string,
          }),
        });

        if (!checkoutQRResponse.ok) {
          const errorData = await checkoutQRResponse.json();
          return {
            error: errorData.message || 'Failed to create QR payment link',
          };
        }

        return await checkoutQRResponse.json();

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Convert chat messages to Gemini format
 * Ensures the first message is always from the user (Gemini requirement)
 * Note: Function calls and responses are handled separately in the chat flow,
 * not included in history to avoid formatting issues
 */
function messagesToGeminiHistory(messages: ChatMessage[]) {
  // Filter out system messages and welcome messages (identified by id === 'welcome')
  const conversationMessages = messages.filter(
    msg => msg.role !== 'system' && msg.id !== 'welcome'
  );

  // Ensure first message is from user
  if (conversationMessages.length > 0 && conversationMessages[0].role !== 'user') {
    // If first message is not from user, remove it (shouldn't happen, but safety check)
    const firstUserIndex = conversationMessages.findIndex(msg => msg.role === 'user');
    if (firstUserIndex > 0) {
      conversationMessages.splice(0, firstUserIndex);
    } else if (firstUserIndex === -1) {
      // No user messages found, return empty (shouldn't happen)
      return [];
    }
  }

  // Convert to Gemini format - only include text content
  // Function calls/responses are handled in the main chat flow, not in history
  return conversationMessages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content || '' }],
  }));
}

/**
 * Generate system prompt with default wallet and chain context
 */
function getSystemPrompt(defaultWalletId?: string, defaultChain?: string): string {
  const walletContext = defaultWalletId
    ? `\n\nDEFAULT CONTEXT:
- The user has a connected wallet via Privy: ${defaultWalletId}
- Default blockchain network: ${defaultChain || 'ARC Testnet'}
- When creating payments, ALWAYS use these defaults unless the user explicitly specifies otherwise
- Do NOT ask for wallet ID or chain - use the defaults automatically
- The wallet is already connected and ready for transactions`
    : '';

  return `You are OmniAgentPay, an AI payment agent that helps users manage USDC payments, wallets, and transactions.

CRITICAL: You MUST ONLY answer questions and provide assistance related to OmniAgent Pay functionality. This includes:
- Payment operations (creating, executing, approving payments)
- Wallet management (checking balances, listing wallets)
- Transaction history and payment intents
- Guard system and payment compliance
- USDC transfers and blockchain operations
- Payment simulation and validation

CRITICAL FORMATTING RULES - MUST FOLLOW:
1. ABSOLUTELY NO JSON, CODE BLOCKS, OR TECHNICAL DATA IN YOUR RESPONSES - EVER
2. All JSON/code outputs are automatically sent to the terminal - you don't need to show them
3. Provide ONLY natural English summaries in your responses
4. Responses should be concise (1-2 sentences maximum)
5. NEVER show wallet IDs, addresses, transaction hashes, or technical details in chat
6. For tool call results, extract ONLY the essential human-readable information

BALANCE REPORTING FORMAT:
When reporting wallet balances from check_balance tool results:
- Extract the balance information from the tool output
- Format as: "You have [privyWallet balance] USDC as balance and [circleAgentWallet balance] USDC as agent AI balance"
- For balances >= 1 USDC: Round to whole numbers (e.g., 83.42 → 83, 1.97 → 2)
- For balances < 1 USDC: Show at least 2 decimal places (e.g., 0.465 → 0.47, 0.123 → 0.12, 0.001 → 0.001)
- NEVER round small balances (< 1 USDC) to 0 - always show the actual decimal value
- Do NOT show JSON, wallet addresses, or any technical details
- Keep it simple and human-friendly

WALLET LISTING FORMAT:
When reporting wallets from list_wallets tool results:
- Say: "You have [N] wallet(s)" or list them briefly in plain English
- Do NOT show addresses, IDs, or technical details
- Keep it conversational

TRANSACTION LISTING FORMAT:
When reporting transactions from list_transactions tool results:
- Provide a brief summary like "You have [N] recent transactions"
- Or mention key details like "Last transaction: [amount] USDC to [recipient]"
- Do NOT show full transaction data or JSON

STRICT RESTRICTIONS:
1. You MUST NOT answer questions about:
   - General knowledge, trivia, or unrelated topics
   - Other payment systems or cryptocurrencies (except USDC in context of OmniAgent Pay)
   - Programming help unrelated to OmniAgent Pay
   - Personal advice, health, legal, or financial advice outside of OmniAgent Pay
   - Any topic not directly related to OmniAgent Pay operations

2. When asked about unrelated topics, politely decline with:
   "I'm specialized in OmniAgent Pay operations only. I can help you with payments, wallets, transactions, and payment intents. How can I assist you with OmniAgent Pay?"

3. Stay focused on your core capabilities:
   - Check wallet balances
   - Create and execute payments
   - List transactions and payment intents
   - Simulate payments to check guard compliance
   - Approve payments that require authorization

STRICT OPERATIONAL RULES:
1. ONE SENTENCE RESPONSES ONLY
2. NEVER CALL LIST_WALLETS UNLESS USER EXPLICITLY ASKS
3. Payment commands: ALWAYS check for recent duplicate payments using list_transactions BEFORE creating a new payment intent
4. If a recent payment to the same recipient with the same amount exists (within last 5 minutes), inform the user it was already paid instead of creating a new intent
5. Payment commands: Create intent → Say "Payment created, processing automatically." ONLY if no duplicate exists
6. Balance checks: Say "Your balance is [X] USDC"
7. Do NOT call multiple tools for simple requests
8. ${defaultWalletId ? 'Use connected wallet automatically.' : 'Ask user for wallet if needed'}
9. After creating payment intent: DO NOT call any other tools
10. CRITICAL: Before creating payment intent, check list_transactions for recent payments to avoid duplicates

You have access to payment tools - use them to help users with their OmniAgent Pay needs only.${walletContext}`;
}

export const geminiService = {
  /**
   * Check if Gemini is configured
   */
  isConfigured(): boolean {
    return !!GEMINI_API_KEY && !!genAI;
  },

  /**
   * Send a chat message to Gemini and get response
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      defaultWalletId?: string;
      defaultChain?: string;
      privyUserId?: string;
      privyWalletAddresses?: string[];
    }
  ): Promise<{
    content: string;
    toolCalls?: Array<{
      tool: string;
      input: Record<string, unknown>;
      output: unknown;
    }>;
  }> {
    if (!genAI) {
      throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY environment variable.');
    }

    // Check rate limit before making API call
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const error = new Error(rateLimitCheck.reason || 'Rate limit exceeded');
      (error as any).rateLimitInfo = {
        retryAfter: rateLimitCheck.retryAfter,
        limits: rateLimitCheck.limits,
      };
      throw error;
    }

    // Record the request
    recordRequest();

    const defaultWalletId = options?.defaultWalletId;
    const defaultChain = options?.defaultChain || 'arc-testnet';
    const systemPrompt = getSystemPrompt(defaultWalletId, defaultChain);

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      tools: [{ functionDeclarations: paymentTools }],
      systemInstruction: systemPrompt,
    });

    // Convert messages to Gemini format
    const history = messagesToGeminiHistory(messages);

    // Get the last message (should be user message)
    const lastMessage = messages[messages.length - 1];

    // Ensure last message is from user
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Start chat session with history (all messages except the last one)
    // If history is empty or only has one message, start with empty history
    const chatHistory = history.length > 1 ? history.slice(0, -1) : [];

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(lastMessage.content);

    const response = result.response;
    
    // Log response status for debugging
    console.log('[Gemini] Response received:', {
      hasFunctionCalls: !!(response.functionCalls() && response.functionCalls().length > 0),
      candidatesCount: response.candidates?.length || 0,
      finishReason: response.candidates?.[0]?.finishReason,
    });
    
    const toolCalls: Array<{
      tool: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];

    // Handle function calls
    if (response.functionCalls() && response.functionCalls().length > 0) {
      const functionCalls = response.functionCalls();

      // Execute all tool calls
      for (const funcCall of functionCalls) {
        const toolName = funcCall.name;
        const args = funcCall.args as Record<string, unknown>;

        const output = await executeToolCall(toolName, args, defaultWalletId, defaultChain, options?.privyUserId, options?.privyWalletAddresses);

        toolCalls.push({
          tool: toolName,
          input: args,
          output,
        });
      }

      // Send tool results back to Gemini for final response
      // Format: Each function response must match the function call structure
      // The response field should be a plain object, not an array
      const toolResults = functionCalls.map((funcCall, idx) => {
        let output = toolCalls[idx].output;

        // Ensure output is a plain object (not array, not null)
        if (Array.isArray(output)) {
          // If output is an array, wrap it in an object
          output = { data: output };
        } else if (output === null || output === undefined) {
          output = { result: null };
        } else if (typeof output !== 'object') {
          // If output is a primitive, wrap it
          output = { result: output };
        }

        return {
          functionResponse: {
            name: funcCall.name,
            response: output,
          },
        };
      });

      // Send all function responses at once
      const finalResult = await chat.sendMessage(toolResults);
      const finalResponse = finalResult.response;

      // Log final response status
      console.log('[Gemini] Final response received:', {
        candidatesCount: finalResponse.candidates?.length || 0,
        finishReason: finalResponse.candidates?.[0]?.finishReason,
        hasText: !!finalResponse.text,
      });

      // Check if response was blocked or incomplete
      const candidates = finalResponse.candidates || [];
      const finishReason = candidates[0]?.finishReason;
      
      if (finishReason && finishReason !== 'STOP') {
        console.warn('[Gemini] Response incomplete, finishReason:', finishReason);
        // Try to get partial content if available
        try {
          const partialText = finalResponse.text();
          if (partialText) {
            return { content: partialText, toolCalls };
          }
        } catch (e) {
          console.error('[Gemini] Failed to get partial text:', e);
        }
        
        // Return a fallback message
        return {
          content: "I've processed your request. The payment has been created and will be executed automatically.",
          toolCalls,
        };
      }

      return {
        content: finalResponse.text(),
        toolCalls,
      };
    }

    // No function calls, just return text response
    const candidates = response.candidates || [];
    const finishReason = candidates[0]?.finishReason;
    
    if (finishReason && finishReason !== 'STOP') {
      console.warn('[Gemini] Response incomplete (no tools), finishReason:', finishReason);
      // Try to get partial content
      try {
        const partialText = response.text();
        if (partialText) {
          return { content: partialText };
        }
      } catch (e) {
        console.error('[Gemini] Failed to get partial text:', e);
      }
      
      return {
        content: "I understand. How else can I help you with your payments?",
      };
    }
    
    return {
      content: response.text(),
    };
  },

  /**
   * Stream chat response for real-time updates
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: {
      defaultWalletId?: string;
      defaultChain?: string;
    }
  ): AsyncGenerator<string, void, unknown> {
    if (!genAI) {
      throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY environment variable.');
    }

    // Check rate limit before making API call
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const error = new Error(rateLimitCheck.reason || 'Rate limit exceeded');
      (error as any).rateLimitInfo = {
        retryAfter: rateLimitCheck.retryAfter,
        limits: rateLimitCheck.limits,
      };
      throw error;
    }

    // Record the request
    recordRequest();

    const defaultWalletId = options?.defaultWalletId;
    const defaultChain = options?.defaultChain || 'arc-testnet';
    const systemPrompt = getSystemPrompt(defaultWalletId, defaultChain);

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      tools: [{ functionDeclarations: paymentTools }],
      systemInstruction: systemPrompt,
    });

    const history = messagesToGeminiHistory(messages);

    // Get the last message (should be user message)
    const lastMessage = messages[messages.length - 1];

    // Ensure last message is from user
    if (lastMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Start chat session with history (all messages except the last one)
    const chatHistory = history.length > 1 ? history.slice(0, -1) : [];

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessageStream(lastMessage.content);

    // Stream the response
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  },
};
