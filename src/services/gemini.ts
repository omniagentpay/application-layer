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
    description: 'Check the USDC balance for a specific wallet or get unified balance across all wallets. When no wallet ID is provided, returns balances for both Metamask (Privy) wallet and Circle Agent wallet separately, along with network information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        walletId: {
          type: SchemaType.STRING,
          description: 'Optional wallet ID. If not provided, returns unified balance across all wallets including Metamask and Circle Agent wallets',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_wallets',
    description: 'List all available wallets with their addresses and chains',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_payment_intent',
    description: 'Create a payment intent to send USDC to a recipient. This simulates and validates the payment before execution. Uses the connected wallet and ARC Testnet by default if not specified.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount in USDC to send',
        },
        recipient: {
          type: SchemaType.STRING,
          description: 'Recipient address (0x...) or identifier',
        },
        recipientAddress: {
          type: SchemaType.STRING,
          description: 'Blockchain address of the recipient (0x format)',
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
        // Try to get user's actual wallet ID first, fallback to env var or hardcoded
        let agentWalletForBalance: string | null = null;
        
        // Try to fetch user's actual agent wallet if privyUserId is provided
        if (privyUserId) {
          try {
            const { agentWalletService } = await import('./wallets');
            const agentWallet = await agentWalletService.getAgentWallet(privyUserId);
            if (agentWallet?.walletId) {
              agentWalletForBalance = agentWallet.walletId;
            }
          } catch (error) {
            console.warn('Failed to fetch user agent wallet, using fallback:', error);
          }
        }
        
        // Fallback to env var or hardcoded value
        if (!agentWalletForBalance) {
          agentWalletForBalance = import.meta.env.VITE_AGENT_CIRCLE_WALLET_ID || '8a57ee78-f796-536e-aa8e-b5fadfd3dcec';
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

        // Add Circle agent wallet first - hardcoded fallback for immediate functionality
        const AGENT_WALLET_ID = '8a57ee78-f796-536e-aa8e-b5fadfd3dcec';
        const agentWalletId = import.meta.env.VITE_AGENT_CIRCLE_WALLET_ID || AGENT_WALLET_ID;

        if (agentWalletId) {
          // Get wallet details from MCP
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
              address: data.result?.wallet_id || agentWalletId,
              chain: 'arc-testnet',
              balance: data.result?.usdc_balance || '0',
            });
          } catch (error) {
            // Add basic info even if MCP call fails
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
        // Agent-initiated payments use Circle wallet
        // Hardcoded fallback for immediate functionality
        const PAYMENT_WALLET_ID = '8a57ee78-f796-536e-aa8e-b5fadfd3dcec';
        const paymentAgentWalletId = import.meta.env.VITE_AGENT_CIRCLE_WALLET_ID || PAYMENT_WALLET_ID;

        if (!paymentAgentWalletId) {
          return {
            error: 'Agent wallet not configured. AGENT_CIRCLE_WALLET_ID must be set in environment variables.'
          };
        }

        const chain = (args.chain as string) || defaultChain || 'arc-testnet';

        // Agent payments always use Circle wallet
        return await paymentsService.createIntent({
          amount: args.amount as number,
          recipient: args.recipient as string,
          recipientAddress: args.recipientAddress as string,
          description: args.description as string || `Payment to ${args.recipient}`,
          walletId: paymentAgentWalletId, // Use agent Circle wallet
          chain,
          fromWallet: {
            role: 'agent',
            type: 'circle',
            ref: paymentAgentWalletId,
          },
        });

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

BALANCE REPORTING FORMAT:
When reporting wallet balances from check_balance tool results, format the response as follows:
1. "Your Wallet Balance: [privyWallet balance] USDC" (this is the Metamask/Privy wallet balance)
2. "Circle Agent Wallet Balance: [circleAgentWallet balance] USDC"
3. "Network: [network name]" (typically "ARC Network")
Always show both wallet balances separately, even if one is zero.

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

Important operational rules:
1. Always simulate payments before executing them
2. Explain what you're doing before taking payment actions
3. If a payment requires approval, inform the user and wait for confirmation
4. Be concise but helpful in your responses
5. When creating payments, always provide clear descriptions
6. ${defaultWalletId ? 'Use the connected wallet and ARC Testnet by default - do NOT ask for wallet ID or chain unless the user explicitly wants to use a different one.' : 'If you don\'t have enough information (like wallet ID), ask the user'}
7. When a user says "pay X USDC to [address]" or similar payment commands:
   - Extract the amount and recipient address from the message
   - Use the recipient address for both 'recipient' and 'recipientAddress' fields
   - Automatically use the connected wallet (${defaultWalletId || 'if available'}) and ARC Testnet network
   - Do NOT ask for wallet ID or chain - use the defaults automatically
   - Proceed directly to creating the payment intent

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

      return {
        content: finalResponse.text(),
        toolCalls,
      };
    }

    // No function calls, just return text response
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
