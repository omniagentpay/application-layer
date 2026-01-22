import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { checkGuards, requiresApproval } from '../lib/guards.js';
import { simulatePayment, executePayment } from '../lib/sdk-client.js';
import { getAgentWalletId, validateWalletRole } from '../lib/agent-wallet.js';
import { createArcPayCheckout } from '../lib/arcpay-client.js';
import { generatePaymentQRCode } from '../lib/qr-generator.js';
import type {
  PaymentIntent,
  PaymentStep,
  TimelineEvent,
  PaymentExplanation,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
  IncidentReplayResult,
  McpSdkContract,
  Transaction,
  WalletRef,
} from '../types/index.js';

export const paymentsRouter = Router();

// Get all payment intents
paymentsRouter.get('/', async (req, res) => {
  try {
    // Extract Privy user ID from headers (case-insensitive)
    const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;

    console.log('[GET /api/payments] Request received, privyUserId:', privyUserId || 'NOT SET');
    console.log('[GET /api/payments] In-memory intents count:', storage.getAllPaymentIntents().length);

    // Get intents from in-memory storage
    let intents = storage.getAllPaymentIntents();

    console.log('[GET /api/payments] Total intents in-memory:', intents.length);

    // ALWAYS load from Supabase first - this is the source of truth for persistence
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      console.log('[GET /api/payments] Supabase config:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlPrefix: supabaseUrl?.substring(0, 30)
      });

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
          supabaseKey
        );

        // First, get ALL intents to see what's in the database (for debugging)
        const { data: allIntents, error: allError } = await supabase
          .from('payment_intents')
          .select('id, user_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        console.log('[GET /api/payments] ALL intents in DB (up to 20):', {
          count: allIntents?.length || 0,
          error: allError?.message,
          intents: allIntents?.map(i => ({ id: i.id, user_id: i.user_id?.substring(0, 20), status: i.status }))
        });

        // Build query for payment intents - TEMPORARILY fetch ALL to debug
        let query = supabase
          .from('payment_intents')
          .select('*')
          .order('created_at', { ascending: false });

        // TEMPORARILY DISABLED: User filtering to debug missing intents
        // TODO: Re-enable after debugging
        const ENABLE_USER_FILTER = false;

        if (ENABLE_USER_FILTER && privyUserId && privyUserId !== 'unknown') {
          // First get the Supabase user ID from privy_user_id
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('privy_user_id', privyUserId)
            .maybeSingle();

          if (user) {
            query = query.eq('user_id', user.id);
            console.log('[GET /api/payments] Filtering by Supabase user_id:', user.id);
          } else {
            // User not found in Supabase - also try with privy_user_id directly in case it was stored that way
            query = query.or(`user_id.eq.${privyUserId},user_id.eq.unknown`);
            console.log('[GET /api/payments] User not found, trying privy_user_id directly');
          }
        } else {
          console.log('[GET /api/payments] Fetching ALL intents (user filter disabled for debugging)');
        }

        const { data: supabaseIntents, error } = await query;

        if (error) {
          console.error('[GET /api/payments] Supabase query error:', error);
        } else if (supabaseIntents && supabaseIntents.length > 0) {
          console.log('[GET /api/payments] Found', supabaseIntents.length, 'intents in Supabase');

          // Transform Supabase data to PaymentIntent format
          const transformedIntents: PaymentIntent[] = supabaseIntents.map((intent: any) => {
            const metadata = intent.metadata || {};

            // Fix timezone: Supabase returns timestamps without 'Z' suffix
            // which causes JS to parse them as local time instead of UTC
            const fixTimestamp = (ts: string | null | undefined): string => {
              if (!ts) return new Date().toISOString();
              // If timestamp doesn't end with 'Z' or timezone offset, add 'Z'
              const trimmed = ts.trim();
              if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
                return new Date(trimmed).toISOString();
              }
              // Replace space with 'T' and add 'Z' for UTC
              return new Date(trimmed.replace(' ', 'T') + 'Z').toISOString();
            };

            return {
              id: intent.id,
              amount: parseFloat(intent.amount || 0),
              currency: intent.currency || 'USDC',
              recipient: intent.recipient || '',
              recipientAddress: intent.recipient_address || '',
              description: metadata.description || intent.description || '',
              status: intent.status || 'pending',
              walletId: intent.wallet_id || '',
              chain: (intent.chain || 'ethereum') as PaymentIntent['chain'],
              agentId: metadata.agentId || undefined,
              agentName: metadata.agentName || undefined,
              steps: typeof intent.steps === 'string' ? JSON.parse(intent.steps) : (intent.steps || []),
              guardResults: typeof intent.guard_results === 'string' ? JSON.parse(intent.guard_results) : (intent.guard_results || []),
              route: intent.route || undefined,
              txHash: intent.tx_hash || intent.blockchain_tx_hash || undefined,
              intentType: metadata.intentType || undefined,
              recipientWalletType: metadata.recipientWalletType || undefined,
              paymentLink: metadata.paymentLink || undefined,
              fromWallet: metadata.fromWallet || undefined,
              contract: metadata.contract || undefined,
              timeline: metadata.timeline || undefined,
              explanation: metadata.explanation || undefined,
              metadata: metadata,
              createdAt: fixTimestamp(intent.created_at),
              updatedAt: fixTimestamp(intent.updated_at || intent.created_at),
            };
          });

          // Merge Supabase intents with in-memory intents
          // Supabase takes precedence since it's persistent
          const intentMap = new Map<string, PaymentIntent>();

          // Add in-memory intents first
          intents.forEach(intent => intentMap.set(intent.id, intent));

          // Overwrite with Supabase intents (they're the source of truth)
          // Don't save back to in-memory during GET - they're already persisted in Supabase
          // This prevents duplicate writes and potential race conditions
          transformedIntents.forEach(intent => {
            intentMap.set(intent.id, intent);
            // Update in-memory cache silently (without triggering Supabase write)
            // We check if it exists first to avoid unnecessary operations
            const existingInMemory = storage.getPaymentIntent(intent.id);
            if (!existingInMemory || existingInMemory.updatedAt !== intent.updatedAt) {
              // Update in-memory cache directly via storage (it will update the Map)
              // But we need to prevent the Supabase write - storage.savePaymentIntent always writes
              // So we'll just update the Map reference, which is fine for GET requests
              // The intent is already in Supabase, so we're just syncing the cache
              storage.savePaymentIntent(intent);
            }
          });

          intents = Array.from(intentMap.values());
          console.log('[GET /api/payments] Total intents after merge:', intents.length);
        } else {
          console.log('[GET /api/payments] No intents found in Supabase, using in-memory intents');
          // If Supabase returns empty but we have in-memory intents, use those
          // This handles the case where intents were just created and haven't synced to Supabase yet
        }
      } else {
        console.warn('[GET /api/payments] Supabase not configured, using in-memory only');
      }
    } catch (error) {
      console.error('[GET /api/payments] Failed to load from Supabase:', error);
      // Continue with in-memory intents if Supabase fails
      // This ensures intents are still returned even if Supabase is down
    }

    // Sort by creation date (newest first)
    intents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('[GET /api/payments] Returning', intents.length, 'intents to client');
    res.json(intents);
  } catch (error) {
    console.error('[GET /api/payments] Error:', error);
    res.status(500).json({ error: 'Failed to load payment intents' });
  }
});

// Agent auto-execution flow endpoint
paymentsRouter.post('/agent/execute', async (req, res) => {
  const {
    amount,
    recipient,
    recipientAddress,
    description,
    walletId,
    chain,
    currency,
  } = req.body;

  if (!amount || !recipientAddress || !walletId) {
    return res.status(400).json({ error: 'Missing required fields: amount, recipientAddress, walletId' });
  }

  // Import the orchestrator function
  const { executeAgentPaymentFlow } = await import('../lib/agent-payment-flow.js');

  // Set up Server-Sent Events for streaming status updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    const result = await executeAgentPaymentFlow(
      {
        amount: parseFloat(amount),
        recipient: recipient || recipientAddress,
        recipientAddress,
        description,
        walletId,
        chain: chain || 'arc-testnet',
        currency: currency || 'USD',
      },
      (status) => {
        // Stream status updates to client
        res.write(`data: ${JSON.stringify(status)}\n\n`);
      }
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
    res.end();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
    res.end();
  }
});

// Get a specific payment intent
paymentsRouter.get('/:id', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }
  res.json(intent);
});

// Payment link page route (public-facing payment page)
paymentsRouter.get('/pay/:id', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Check if it's a payment link
  if (intent.intentType !== 'payment_link') {
    return res.status(400).json({ error: 'This is not a payment link' });
  }

  // Check if expired
  if (intent.paymentLink?.expiresAt && Date.now() > intent.paymentLink.expiresAt) {
    return res.status(410).json({ error: 'Payment link has expired' });
  }

  // Return payment link data (frontend will render the payment page)
  res.json({
    intent,
    paymentUrl: intent.paymentLink?.url || `/app/pay/${intent.id}`,
  });
});

// Create a new payment intent
paymentsRouter.post('/', async (req, res) => {
  const {
    amount,
    recipient,
    recipientAddress,
    description,
    walletId,
    chain,
    intentType,
    recipientWalletType,
    paymentLink,
    fromWallet, // NEW: Explicit wallet role and type
  } = req.body;

  if (!amount || !recipient || !recipientAddress || !chain) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Extract Privy user ID from headers for persistence
  const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;

  console.log('[POST /api/payments] Creating intent, privyUserId:', privyUserId || 'NOT SET (will use "unknown")');
  console.log('[POST /api/payments] Request headers:', Object.keys(req.headers).filter(k => k.toLowerCase().includes('privy')));

  // Get or create a default agent
  const agents = storage.getAllAgents();
  const defaultAgent = agents.length > 0 ? agents[0] : null;

  // Determine wallet role and type
  let walletRole: 'agent' | 'user' = 'user';
  let walletType: 'circle' | 'privy' = 'privy';
  let walletRef: string = walletId || '';

  // If fromWallet is provided, use it
  if (fromWallet && fromWallet.role && fromWallet.type && fromWallet.ref) {
    walletRole = fromWallet.role;
    walletType = fromWallet.type;
    walletRef = fromWallet.ref;
  } else {
    // Infer from context: if agentId is present, it's an agent payment
    if (defaultAgent?.id) {
      walletRole = 'agent';
      walletType = 'circle';
      // Use agent Circle wallet for agent payments
      const agentWalletId = getAgentWalletId();
      if (!agentWalletId) {
        return res.status(500).json({
          error: 'Agent wallet not configured',
          message: 'AGENT_CIRCLE_WALLET_ID not set. Run setup_agent_wallet.py script first.',
        });
      }
      walletRef = agentWalletId;
    } else {
      // User payment - check if walletId is Privy address or Circle ID
      if (walletId) {
        walletRef = walletId;
        // Detect wallet type from format
        if (walletId.match(/^0x[a-fA-F0-9]{40}$/)) {
          walletType = 'privy';
        } else {
          walletType = 'circle';
        }
      }
    }
  }

  // Validate wallet role and type combination
  const validation = validateWalletRole(walletRole, walletType, walletRef);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid wallet configuration',
      message: validation.error,
    });
  }

  const fromWalletRef: WalletRef = {
    role: walletRole,
    type: walletType,
    ref: walletRef,
  };

  const intentId = `pi_${Date.now()}`;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Check if checkout link should be auto-generated
  const generateCheckoutLink = req.body.generateCheckoutLink === true || req.body.checkoutMode === 'link';
  const generateCheckoutQR = req.body.generateCheckoutQR === true || req.body.checkoutMode === 'qr';

  // Generate payment link URL if it's a payment link
  let paymentLinkData = paymentLink;
  if (intentType === 'payment_link' && !paymentLinkData?.url) {
    paymentLinkData = {
      url: `${baseUrl}/app/pay/${intentId}`,
      expiresAt: paymentLink?.expiresAt,
      metadata: paymentLink?.metadata,
    };
  }

  const intent: PaymentIntent = {
    id: intentId,
    amount: parseFloat(amount),
    currency: 'USDC',
    recipient,
    recipientAddress,
    description: description || '',
    status: 'pending',
    walletId: walletRef, // Keep for backward compatibility
    fromWallet: fromWalletRef, // NEW: Explicit wallet role and type
    chain: chain as PaymentIntent['chain'],
    intentType: intentType || 'direct',
    recipientWalletType: recipientWalletType || 'privy', // Keep for backward compatibility
    paymentLink: paymentLinkData,
    steps: [
      { id: 's1', name: 'Simulation', status: 'pending' },
      { id: 's2', name: 'Approval', status: 'pending' },
      { id: 's3', name: 'Execution', status: 'pending' },
      { id: 's4', name: 'Confirmation', status: 'pending' },
    ],
    guardResults: [],
    agentId: defaultAgent?.id,
    agentName: defaultAgent?.name,
    metadata: {
      userId: privyUserId || 'unknown', // Add userId for Supabase persistence
    },
    contract: {
      backendApiCall: {
        method: 'POST',
        endpoint: `/api/payments`,
        payload: { amount, recipient, recipientAddress, description, walletId, chain, intentType },
      },
      mcpToolInvoked: {
        toolName: intentType === 'payment_link' ? 'create_payment_link' : 'create_payment_intent',
        toolId: 'mcp_tool_payment',
        input: { amount: parseFloat(amount), recipient, chain },
      },
      sdkMethodCalled: {
        method: 'simulate',
        params: { amount: parseFloat(amount), recipientAddress, chain },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  storage.savePaymentIntent(intent);

  // Auto-generate ArcPay checkout link if requested
  let checkoutResponse: { checkoutUrl?: string; sessionId?: string; qrCode?: string } = {};
  if (generateCheckoutLink || generateCheckoutQR) {
    try {
      const checkout = await createArcPayCheckout({
        amount: intent.amount,
        currency: intent.currency || 'USDC',
        description: intent.description || `Payment of ${intent.amount} ${intent.currency || 'USDC'}`,
        userId: privyUserId || intent.metadata?.userId || 'unknown',
        intentId: intent.id,
      });

      checkoutResponse.checkoutUrl = checkout.checkoutUrl;
      checkoutResponse.sessionId = checkout.sessionId;

      // Update intent with checkout information
      intent.paymentLink = {
        url: checkout.checkoutUrl,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours default expiration
        metadata: {
          sessionId: checkout.sessionId,
          type: generateCheckoutQR ? 'qr' : 'link',
        },
      };

      // Generate QR code if requested
      if (generateCheckoutQR) {
        const qrCodeDataURL = await generatePaymentQRCode(checkout.checkoutUrl);
        checkoutResponse.qrCode = qrCodeDataURL;
        if (intent.paymentLink.metadata) {
          intent.paymentLink.metadata.qrCode = qrCodeDataURL;
        }
      }

      intent.updatedAt = new Date().toISOString();
      storage.savePaymentIntent(intent);

      // Persist to Supabase
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
            supabaseKey
          );

          await supabase
            .from('payment_intents')
            .update({
              checkout_url: checkout.checkoutUrl,
              checkout_session_id: checkout.sessionId,
              checkout_type: generateCheckoutQR ? 'qr' : 'link',
              updated_at: new Date().toISOString(),
            })
            .eq('id', intent.id);
        }
      } catch (dbError) {
        console.error('[Create Intent] Failed to persist checkout to Supabase:', dbError);
        // Continue - checkout link was created successfully
      }
    } catch (checkoutError) {
      console.error('[Create Intent] Failed to generate checkout link:', checkoutError);
      // Don't fail the intent creation if checkout generation fails
      // The intent is still created successfully
    }
  }
  
  // Create a pending transaction record immediately when intent is created
  // This ensures transactions appear in the list even before execution completes
  try {
    const transaction = {
      id: `tx_${intentId}_${Date.now()}`,
      intentId: intent.id,
      walletId: walletRef,
      type: 'payment' as const,
      amount: intent.amount,
      currency: intent.currency,
      recipient: intent.recipient,
      recipientAddress: intent.recipientAddress,
      status: 'pending' as const, // Will be updated to 'succeeded' when execution completes
      chain: intent.chain,
      createdAt: new Date().toISOString(),
      metadata: {
        intentStatus: intent.status,
      },
    };
    storage.saveTransaction(transaction);
    console.log('[Create Intent] Saved transaction to in-memory storage:', {
      transactionId: transaction.id,
      intentId: transaction.intentId,
      status: transaction.status,
      amount: transaction.amount,
      totalTransactions: storage.getAllTransactions().length,
    });
    
    // Persist pending transaction to Supabase immediately
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && privyUserId && privyUserId !== 'unknown') {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
        supabaseKey
      );
      
      // Get the Supabase user ID from privy_user_id
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('privy_user_id', privyUserId)
        .maybeSingle();
      
      if (user) {
        const { error: txError } = await supabase
          .from('transactions')
          .upsert({
            id: transaction.id,
            user_id: user.id,
            intent_id: transaction.intentId,
            wallet_id: transaction.walletId,
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            recipient: transaction.recipient,
            recipient_address: transaction.recipientAddress,
            status: transaction.status,
            chain: transaction.chain,
            tx_hash: null, // Will be set when execution completes
            fee: null,
            created_at: transaction.createdAt,
            metadata: transaction.metadata ? JSON.stringify(transaction.metadata) : null,
          }, {
            onConflict: 'id',
          });
        
        if (txError) {
          console.error('[Create Intent] Failed to persist pending transaction to Supabase:', {
            error: txError,
            transactionId: transaction.id,
            userId: user.id,
            intentId: transaction.intentId,
          });
        } else {
          console.log('[Create Intent] Successfully persisted pending transaction to Supabase:', {
            transactionId: transaction.id,
            userId: user.id,
            intentId: transaction.intentId,
            status: 'pending',
          });
        }
      }
    }
  } catch (error) {
    console.error('[Create Intent] Error creating pending transaction:', error);
    // Don't fail the request if transaction creation fails
  }
  
  // Return intent with checkout information if generated
  const response: any = { ...intent };
  if (checkoutResponse.checkoutUrl) {
    response.checkoutUrl = checkoutResponse.checkoutUrl;
    response.sessionId = checkoutResponse.sessionId;
    if (checkoutResponse.qrCode) {
      response.qrCode = checkoutResponse.qrCode;
    }
    response.message = generateCheckoutQR
      ? `QR payment link created. Scan to pay ${intent.amount} ${intent.currency || 'USDC'}.`
      : `Payment link created. Share this link to receive ${intent.amount} ${intent.currency || 'USDC'}.`;
  }
  
  res.status(201).json(response);
});

// Update payment intent (for payment link URL updates)
paymentsRouter.patch('/:id', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Update payment link if provided
  if (req.body.paymentLink) {
    intent.paymentLink = { ...intent.paymentLink, ...req.body.paymentLink };
  }

  // Update other fields
  if (req.body.status) intent.status = req.body.status;
  if (req.body.txHash) intent.txHash = req.body.txHash;

  intent.updatedAt = new Date().toISOString();
  storage.savePaymentIntent(intent);

  res.json(intent);
});

// Simulate a payment intent
paymentsRouter.post('/:id/simulate', async (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Update status
  intent.status = 'simulating';
  intent.steps[0].status = 'in_progress';
  intent.updatedAt = new Date().toISOString();
  storage.savePaymentIntent(intent);

  try {
    // Call SDK to simulate
    const simulateResult = await simulatePayment({
      amount: intent.amount,
      recipient: intent.recipient,
      recipientAddress: intent.recipientAddress,
      walletId: intent.walletId,
      chain: intent.chain,
    });

    // Check guards
    const guardResults = await checkGuards(intent);
    intent.guardResults = guardResults;

    // Update steps
    intent.steps[0].status = 'completed';
    intent.steps[0].timestamp = new Date().toISOString();

    // Determine if approval is needed
    const needsApproval = requiresApproval(intent, guardResults);
    const allGuardsPassed = guardResults.every(r => r.passed);

    if (!allGuardsPassed) {
      intent.status = 'blocked';
      intent.steps[1].status = 'failed';
      intent.steps[1].details = 'Blocked by guard checks';
    } else if (needsApproval) {
      intent.status = 'awaiting_approval';
      intent.steps[1].status = 'in_progress';
    } else {
      // Auto-approve if below threshold
      intent.status = 'awaiting_approval';
      intent.steps[1].status = 'completed';
      intent.steps[1].timestamp = new Date().toISOString();
    }

    intent.route = simulateResult.route;
    intent.updatedAt = new Date().toISOString();
    storage.savePaymentIntent(intent);

    res.json({
      success: true,
      estimatedFee: simulateResult.estimatedFee,
      guardResults: intent.guardResults,
      route: intent.route,
      requiresApproval: needsApproval,
    });
  } catch (error) {
    intent.status = 'failed';
    intent.steps[0].status = 'failed';
    intent.steps[0].details = error instanceof Error ? error.message : 'Simulation failed';
    intent.updatedAt = new Date().toISOString();
    storage.savePaymentIntent(intent);

    res.status(500).json({ error: 'Simulation failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Approve a payment intent
paymentsRouter.post('/:id/approve', async (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  if (intent.status !== 'awaiting_approval' && intent.status !== 'requires_approval') {
    return res.status(400).json({ error: 'Intent is not awaiting approval' });
  }

  intent.steps[1].status = 'completed';
  intent.steps[1].timestamp = new Date().toISOString();
  intent.status = 'approved';
  intent.updatedAt = new Date().toISOString();
  storage.savePaymentIntent(intent);

  res.json({
    intentId: intent.id,
    status: intent.status,
    approvedAt: intent.updatedAt
  });
});

// Execute a payment intent
paymentsRouter.post('/:id/execute', async (req, res) => {
  // Extract Privy user ID from headers
  const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;
  
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Allow execution for pending intents (auto-approved via agent chat)
  if (intent.status !== 'executing' && intent.status !== 'awaiting_approval' && intent.status !== 'approved' && intent.status !== 'requires_approval' && intent.status !== 'pending') {
    return res.status(400).json({ error: 'Intent is not ready for execution' });
  }

  // If not already executing, update status
  if (intent.status === 'awaiting_approval' || intent.status === 'requires_approval' || intent.status === 'approved' || intent.status === 'pending') {
    if (intent.status !== 'approved' && intent.status !== 'pending') {
      intent.steps[1].status = 'completed';
      intent.steps[1].timestamp = new Date().toISOString();
    }
    // For pending intents (auto-approved), mark approval step as completed
    if (intent.status === 'pending') {
      intent.steps[1].status = 'completed';
      intent.steps[1].timestamp = new Date().toISOString();
    }
    intent.status = 'executing';
    intent.steps[2].status = 'in_progress';
  }

  intent.updatedAt = new Date().toISOString();
  storage.savePaymentIntent(intent);

  try {
    // Get wallet role and type from intent
    // Support both new fromWallet field and legacy fields
    const fromWallet = intent.fromWallet || {
      role: intent.agentId ? 'agent' : 'user' as 'agent' | 'user',
      type: (intent.walletId?.match(/^0x[a-fA-F0-9]{40}$/) ? 'privy' : 'circle') as 'circle' | 'privy',
      ref: intent.walletId || '',
    };

    // Enforce wallet role rules
    if (fromWallet.role === 'agent' && fromWallet.type !== 'circle') {
      intent.status = 'failed';
      intent.steps[2].status = 'failed';
      intent.steps[2].details = 'Autonomous payments require a Circle Wallet. Privy wallets require human interaction and cannot be used for agent execution.';
      intent.updatedAt = new Date().toISOString();
      storage.savePaymentIntent(intent);

      return res.status(400).json({
        error: 'Invalid wallet configuration for agent payment',
        message: 'Autonomous payments require a Circle Wallet. Privy wallets require human interaction and cannot be used for agent execution.',
      });
    }

    // Route execution based on wallet role and type
    if (fromWallet.role === 'agent' && fromWallet.type === 'circle') {
      // AGENT + CIRCLE → Autonomous execution via Circle SDK
      const executeResult = await executePayment(intent.id, {
        walletId: fromWallet.ref, // Use Circle wallet ID
        recipientAddress: intent.recipientAddress,
        amount: intent.amount,
        currency: intent.currency,
      });

      if (executeResult.success) {
        // PHASE 2: Store execution artifacts
        // Note: txHash may be undefined if blockchain transaction is still processing
        intent.txHash = executeResult.txHash;
        // Store explorer URL and other artifacts in metadata for frontend access
        if (!intent.metadata) {
          intent.metadata = {};
        }
        intent.metadata.explorerUrl = executeResult.explorerUrl;
        intent.metadata.circleTransferId = executeResult.circleTransferId;
        intent.metadata.circleTransactionId = executeResult.circleTransactionId;
        intent.metadata.blockchainTxHash = executeResult.txHash;
        intent.steps[2].status = 'completed';
        intent.steps[2].timestamp = new Date().toISOString();
        intent.steps[3].status = 'completed';
        intent.steps[3].timestamp = new Date().toISOString();
        intent.status = 'succeeded';
        intent.updatedAt = new Date().toISOString();
        storage.savePaymentIntent(intent);

        // PHASE 2: Persist execution artifacts to Supabase
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`, supabaseKey);

            // Update payment_intents table with execution artifacts
            await supabase
              .from('payment_intents')
              .update({
                blockchain_tx_hash: executeResult.txHash,
                circle_transfer_id: executeResult.circleTransferId,
                circle_transaction_id: executeResult.circleTransactionId,
                explorer_url: executeResult.explorerUrl,
                executed_at: new Date().toISOString(),
                status: 'succeeded',
                updated_at: new Date().toISOString(),
              })
              .eq('id', intent.id);

            // Insert into execution_artifacts for audit trail
            await supabase
              .from('execution_artifacts')
              .insert({
                intent_id: intent.id,
                circle_wallet_id: fromWallet.ref,
                recipient_address: intent.recipientAddress,
                amount: intent.amount,
                currency: intent.currency,
                circle_transfer_id: executeResult.circleTransferId,
                circle_transaction_id: executeResult.circleTransactionId,
                blockchain_tx_hash: executeResult.txHash,
                explorer_url: executeResult.explorerUrl,
                status: 'succeeded',
              });
          }
        } catch (dbError) {
          console.error('[Payment Execution] Failed to persist artifacts to Supabase:', dbError);
          // Continue - execution was successful even if DB write failed
        }

        // Update or create transaction record
        // Generate explorer URL if not already provided
        const explorerBase = process.env.ARC_EXPLORER_TX_BASE || 'https://testnet.arcscan.app/tx';
        const normalizedBase = explorerBase.replace(/\/tx\/?$/, '/tx');
        const explorerUrl = executeResult.txHash ? (executeResult.explorerUrl || `${normalizedBase}/${executeResult.txHash}`) : undefined;
        
        // Try to find existing transaction by intent ID
        const existingTransactions = storage.getAllTransactions();
        const existingTx = existingTransactions.find(tx => tx.intentId === intent.id) as Transaction | undefined;
        
        const transaction: Transaction = {
          id: existingTx?.id || `tx_${intent.id}_${Date.now()}`,
          intentId: intent.id,
          walletId: fromWallet.ref,
          type: 'payment' as const,
          amount: intent.amount,
          currency: intent.currency,
          recipient: intent.recipient,
          recipientAddress: intent.recipientAddress,
          status: executeResult.txHash ? ('succeeded' as const) : (existingTx?.status || 'pending' as const),
          chain: intent.chain,
          txHash: executeResult.txHash || existingTx?.txHash,
          fee: 0.5, // TODO: Get actual fee from SDK
          createdAt: existingTx?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            explorerUrl,
            circleTransferId: executeResult.circleTransferId,
            circleTransactionId: executeResult.circleTransactionId,
            ...(existingTx?.metadata as Record<string, any> | undefined),
          },
        };
        storage.saveTransaction(transaction);

        // Persist transaction to Supabase
        try {
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseKey && privyUserId && privyUserId !== 'unknown') {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
              supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
              supabaseKey
            );

            // Get the Supabase user ID from privy_user_id
            const { data: user } = await supabase
              .from('users')
              .select('id')
              .eq('privy_user_id', privyUserId)
              .maybeSingle();

            if (user) {
              const { error: txError } = await supabase
                .from('transactions')
                .upsert({
                  id: transaction.id,
                  user_id: user.id,
                  intent_id: transaction.intentId,
                  wallet_id: transaction.walletId,
                  type: transaction.type,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  recipient: transaction.recipient,
                  recipient_address: transaction.recipientAddress,
                  status: transaction.status,
                  chain: transaction.chain,
                  tx_hash: transaction.txHash,
                  fee: transaction.fee,
                  created_at: transaction.createdAt,
                  metadata: transaction.metadata,
                });

              if (txError) {
                console.error('[Payment Execution] Failed to persist transaction to Supabase:', txError);
              } else {
                console.log('[Payment Execution] Successfully persisted transaction to Supabase:', transaction.id);
              }
            }
          }
        } catch (dbError) {
          console.error('[Payment Execution] Failed to persist transaction to Supabase:', dbError);
          // Continue - transaction was saved to in-memory storage
        }

        // PHASE 2: Return enhanced response with all execution artifacts
        return res.json({
          success: true,
          txHash: executeResult.txHash,
          explorerUrl: executeResult.explorerUrl,
          circleTransferId: executeResult.circleTransferId,
          circleTransactionId: executeResult.circleTransactionId,
          message: 'Payment executed successfully',
          intent
        });
      } else {
        // PHASE 2: Store error in Supabase
        intent.status = 'failed';
        intent.steps[2].status = 'failed';
        intent.steps[2].details = executeResult.error || 'Execution failed';
        intent.updatedAt = new Date().toISOString();
        storage.savePaymentIntent(intent);

        // PHASE 2: Persist failure to Supabase
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`, supabaseKey);
            await supabase
              .from('payment_intents')
              .update({
                status: 'failed',
                last_error: executeResult.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', intent.id);
          }
        } catch (dbError) {
          console.error('[Payment Execution] Failed to persist error to Supabase:', dbError);
        }

        console.error('[Payment Execution] Failed:', executeResult.error);
        return res.status(500).json({
          error: 'Execution failed',
          details: executeResult.error,
          message: executeResult.error
        });
      }
    } else if (fromWallet.role === 'user' && fromWallet.type === 'privy') {
      // USER + PRIVY → Requires frontend signing
      intent.status = 'awaiting_user_signature';
      intent.steps[2].status = 'pending';
      intent.steps[2].details = 'Waiting for user to sign transaction with Privy wallet';
      intent.updatedAt = new Date().toISOString();
      storage.savePaymentIntent(intent);

      return res.json({
        success: true,
        requiresFrontendSigning: true,
        message: 'Payment requires user signature. Please sign the transaction with your Privy wallet.',
        intent
      });
    } else {
      // USER + CIRCLE → Also allowed (for automated user payments)
      const executeResult = await executePayment(intent.id, {
        walletId: fromWallet.ref,
        recipientAddress: intent.recipientAddress,
        amount: intent.amount,
        currency: intent.currency,
      });

      if (executeResult.success) {
        // PHASE 2: Store execution artifacts
        intent.txHash = executeResult.txHash;
        // Store explorer URL and other artifacts in metadata for frontend access
        if (!intent.metadata) {
          intent.metadata = {};
        }
        intent.metadata.explorerUrl = executeResult.explorerUrl;
        intent.metadata.circleTransferId = executeResult.circleTransferId;
        intent.metadata.circleTransactionId = executeResult.circleTransactionId;
        intent.metadata.blockchainTxHash = executeResult.txHash;
        intent.steps[2].status = 'completed';
        intent.steps[2].timestamp = new Date().toISOString();
        intent.steps[3].status = 'completed';
        intent.steps[3].timestamp = new Date().toISOString();
        intent.status = 'succeeded';
        intent.updatedAt = new Date().toISOString();
        storage.savePaymentIntent(intent);

        // PHASE 2: Persist execution artifacts to Supabase (same as AGENT+CIRCLE path)
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`, supabaseKey);

            // Update payment_intents table with execution artifacts
            await supabase
              .from('payment_intents')
              .update({
                blockchain_tx_hash: executeResult.txHash,
                circle_transfer_id: executeResult.circleTransferId,
                circle_transaction_id: executeResult.circleTransactionId,
                explorer_url: executeResult.explorerUrl,
                executed_at: new Date().toISOString(),
                status: 'succeeded',
                updated_at: new Date().toISOString(),
              })
              .eq('id', intent.id);

            // Insert into execution_artifacts for audit trail
            await supabase
              .from('execution_artifacts')
              .insert({
                intent_id: intent.id,
                circle_wallet_id: fromWallet.ref,
                recipient_address: intent.recipientAddress,
                amount: intent.amount,
                currency: intent.currency,
                circle_transfer_id: executeResult.circleTransferId,
                circle_transaction_id: executeResult.circleTransactionId,
                blockchain_tx_hash: executeResult.txHash,
                explorer_url: executeResult.explorerUrl,
                status: 'succeeded',
              });
          }
        } catch (dbError) {
          console.error('[Payment Execution] Failed to persist artifacts to Supabase:', dbError);
          // Continue - execution was successful even if DB write failed
        }

        // Try to find existing transaction by intent ID, or create new one
        const existingTransactions = storage.getAllTransactions();
        const existingTx = existingTransactions.find(tx => tx.intentId === intent.id) as Transaction | undefined;
        
        const transaction: Transaction = {
          id: existingTx?.id || `tx_${intent.id}_${Date.now()}`,
          intentId: intent.id,
          walletId: fromWallet.ref,
          type: 'payment' as const,
          amount: intent.amount,
          currency: intent.currency,
          recipient: intent.recipient,
          recipientAddress: intent.recipientAddress,
          status: executeResult.txHash ? ('succeeded' as const) : (existingTx?.status || 'pending' as const),
          chain: intent.chain,
          txHash: executeResult.txHash || existingTx?.txHash,
          fee: 0.5,
          createdAt: existingTx?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            explorerUrl: executeResult.explorerUrl,
            circleTransferId: executeResult.circleTransferId,
            circleTransactionId: executeResult.circleTransactionId,
            ...(existingTx?.metadata as Record<string, any> | undefined),
          },
        };
        storage.saveTransaction(transaction);

        // Persist transaction to Supabase
        try {
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

          if (supabaseUrl && supabaseKey && privyUserId && privyUserId !== 'unknown') {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
              supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
              supabaseKey
            );

            // Get the Supabase user ID from privy_user_id
            const { data: user } = await supabase
              .from('users')
              .select('id')
              .eq('privy_user_id', privyUserId)
              .maybeSingle();

            if (user) {
              const { error: txError } = await supabase
                .from('transactions')
                .upsert({
                  id: transaction.id,
                  user_id: user.id,
                  intent_id: transaction.intentId,
                  wallet_id: transaction.walletId,
                  type: transaction.type,
                  amount: transaction.amount,
                  currency: transaction.currency,
                  recipient: transaction.recipient,
                  recipient_address: transaction.recipientAddress,
                  status: transaction.status,
                  chain: transaction.chain,
                  tx_hash: transaction.txHash || null,
                  fee: transaction.fee || null,
                  created_at: transaction.createdAt,
                  updated_at: transaction.updatedAt || transaction.createdAt,
                  metadata: transaction.metadata ? JSON.stringify(transaction.metadata) : null,
                }, {
                  onConflict: 'id',
                });

              if (txError) {
                console.error('[Payment Execution] Failed to persist transaction to Supabase:', {
                  error: txError,
                  transactionId: transaction.id,
                  userId: user.id,
                  intentId: transaction.intentId,
                  status: transaction.status,
                });
              } else {
                console.log('[Payment Execution] Successfully persisted transaction to Supabase:', {
                  transactionId: transaction.id,
                  userId: user.id,
                  intentId: transaction.intentId,
                  status: transaction.status,
                  txHash: transaction.txHash || 'pending',
                });
              }
            }
          }
        } catch (dbError) {
          console.error('[Payment Execution] Failed to persist transaction to Supabase:', dbError);
          // Continue - transaction was saved to in-memory storage
        }

        // PHASE 2: Return enhanced response with all execution artifacts
        return res.json({
          success: true,
          txHash: executeResult.txHash,
          explorerUrl: executeResult.explorerUrl,
          circleTransferId: executeResult.circleTransferId,
          circleTransactionId: executeResult.circleTransactionId,
          message: 'Payment executed successfully',
          intent
        });
      } else {
        // PHASE 2: Store error in Supabase
        intent.status = 'failed';
        intent.steps[2].status = 'failed';
        intent.steps[2].details = executeResult.error || 'Execution failed';
        intent.updatedAt = new Date().toISOString();
        storage.savePaymentIntent(intent);

        // PHASE 2: Persist failure to Supabase
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`, supabaseKey);
            await supabase
              .from('payment_intents')
              .update({
                status: 'failed',
                last_error: executeResult.error,
                updated_at: new Date().toISOString(),
              })
              .eq('id', intent.id);
          }
        } catch (dbError) {
          console.error('[Payment Execution] Failed to persist error to Supabase:', dbError);
        }

        return res.status(500).json({
          error: 'Execution failed',
          details: executeResult.error,
          message: executeResult.error
        });
      }
    }
  } catch (error) {
    intent.status = 'failed';
    intent.steps[2].status = 'failed';
    const errorMessage = error instanceof Error ? error.message : 'Execution failed';
    intent.steps[2].details = errorMessage;
    intent.updatedAt = new Date().toISOString();
    storage.savePaymentIntent(intent);

    console.error('[Payment Execution] Exception:', error);
    res.status(500).json({
      error: 'Execution failed',
      details: errorMessage,
      message: errorMessage
    });
  }
});

// Get payment timeline
paymentsRouter.get('/:id/timeline', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Generate timeline from intent data
  const timeline: TimelineEvent[] = [];
  const now = new Date();

  if (intent.agentId && intent.agentName) {
    timeline.push({
      id: 'tl_1',
      type: 'agent_action',
      timestamp: intent.createdAt,
      title: 'Agent initiated payment',
      description: `${intent.agentName} initiated a payment request`,
      status: 'success',
      details: {
        agentId: intent.agentId,
        agentName: intent.agentName,
      },
    });
  }

  if (intent.contract?.mcpToolInvoked) {
    timeline.push({
      id: 'tl_2',
      type: 'tool_invocation',
      timestamp: intent.createdAt,
      title: 'Tool invoked',
      description: `MCP tool ${intent.contract.mcpToolInvoked.toolName} was invoked`,
      status: 'success',
      details: {
        toolName: intent.contract.mcpToolInvoked.toolName,
        toolInput: intent.contract.mcpToolInvoked.input,
        toolOutput: intent.contract.mcpToolInvoked.output,
      },
    });
  }

  const simulateStep = intent.steps.find(s => s.name === 'Simulation');
  if (simulateStep && simulateStep.status !== 'pending') {
    timeline.push({
      id: 'tl_3',
      type: 'simulate',
      timestamp: simulateStep.timestamp || intent.createdAt,
      title: 'Payment simulation',
      description: 'Simulated payment execution',
      status: simulateStep.status === 'completed' ? 'success' : simulateStep.status === 'failed' ? 'failed' : 'pending',
      details: {
        route: intent.route,
        estimatedFee: 0.5,
      },
    });
  }

  if (intent.guardResults.length > 0) {
    intent.guardResults.forEach((guard, idx) => {
      timeline.push({
        id: `tl_4_${idx}`,
        type: 'guard_evaluation',
        timestamp: intent.updatedAt,
        title: `Guard: ${guard.guardName}`,
        description: guard.reason || (guard.passed ? 'Guard check passed' : 'Guard check failed'),
        status: guard.passed ? 'success' : 'blocked',
        details: {
          guardId: guard.guardId,
          guardName: guard.guardName,
          guardResult: guard.passed,
          guardReason: guard.reason,
        },
      });
    });
  }

  const approvalStep = intent.steps.find(s => s.name === 'Approval');
  if (approvalStep && approvalStep.status !== 'pending') {
    timeline.push({
      id: 'tl_5',
      type: 'approval_decision',
      timestamp: approvalStep.timestamp || intent.updatedAt,
      title: 'Approval decision',
      description: approvalStep.status === 'completed' ? 'Payment approved' : approvalStep.details || 'Awaiting approval',
      status: approvalStep.status === 'completed' ? 'success' : approvalStep.status === 'failed' ? 'blocked' : 'pending',
    });
  }

  const executeStep = intent.steps.find(s => s.name === 'Execution');
  if (executeStep && executeStep.status === 'completed' && intent.txHash) {
    timeline.push({
      id: 'tl_6',
      type: 'pay_execution',
      timestamp: executeStep.timestamp || intent.updatedAt,
      title: 'Payment executed',
      description: `Transaction ${intent.txHash.substring(0, 10)}... confirmed`,
      status: 'success',
      details: {
        txHash: intent.txHash,
      },
    });
  }

  res.json(timeline);
});

// Get payment explanation
paymentsRouter.get('/:id/explanation', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  const agent = intent.agentId ? storage.getAgent(intent.agentId) : null;
  const allGuardsPassed = intent.guardResults.every(r => r.passed);
  const blockingGuards = intent.guardResults.filter(r => !r.passed);

  const explanation: PaymentExplanation = {
    initiatedBy: {
      agentId: intent.agentId || 'unknown',
      agentName: intent.agentName || agent?.name || 'Unknown Agent',
      toolName: intent.contract?.mcpToolInvoked?.toolName || 'payment_tool',
      toolInput: intent.contract?.mcpToolInvoked?.input || { amount: intent.amount, recipient: intent.recipient },
    },
    reason: intent.description || `Payment of $${intent.amount} to ${intent.recipient}`,
    decision: {
      allowed: allGuardsPassed && intent.status !== 'blocked',
      reason: allGuardsPassed
        ? 'All guard checks passed'
        : `Blocked by ${blockingGuards.map(g => g.guardName).join(', ')}`,
      blockingGuards: blockingGuards.map(g => ({
        id: g.guardId,
        name: g.guardName,
        reason: g.reason || 'Guard check failed',
      })),
    },
    route: {
      chosen: intent.route || 'auto',
      explanation: intent.route === 'cctp'
        ? 'Using Circle CCTP for cross-chain transfer'
        : intent.route === 'gateway'
          ? 'Using Gateway protocol for routing'
          : 'Auto-selected optimal route',
      estimatedTime: '2-5 minutes',
      estimatedFee: 0.5,
    },
    conditions: {
      wouldBlock: [
        {
          condition: 'Amount exceeds single transaction limit',
          currentValue: `$${intent.amount}`,
          threshold: '$2000',
        },
        {
          condition: 'Daily budget exceeded',
          currentValue: '$1500',
          threshold: '$3000',
        },
      ],
    },
  };

  res.json(explanation);
});

// What-if simulation
paymentsRouter.post('/simulate', async (req, res) => {
  const { amount, guardPresetId, chain, time }: WhatIfSimulationParams = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  // Mock simulation logic
  const guards = storage.getAllGuards();
  const guardResults = guards
    .filter(g => g.enabled)
    .map(guard => {
      let passed = true;
      let reason = '';

      if (guard.type === 'single_tx' && guard.config.limit && amount > guard.config.limit) {
        passed = false;
        reason = `Amount $${amount} exceeds single transaction limit of $${guard.config.limit}`;
      } else if (guard.type === 'budget') {
        // Mock: check daily budget
        const dailySpent = 1500; // Mock value
        const limit = guard.config.limit || 3000;
        if (dailySpent + amount > limit) {
          passed = false;
          reason = `Payment would exceed daily budget of $${limit}`;
        }
      }

      return {
        guardId: guard.id,
        guardName: guard.name,
        passed,
        reason: passed ? 'Guard check passed' : reason,
      };
    });

  const allPassed = guardResults.every(r => r.passed);

  const result: WhatIfSimulationResult = {
    allowed: allPassed,
    reason: allPassed
      ? 'All guard checks would pass'
      : `Blocked by: ${guardResults.filter(r => !r.passed).map(r => r.guardName).join(', ')}`,
    guardResults,
    estimatedFee: 0.5,
    route: 'auto',
  };

  res.json(result);
});

// Incident replay
paymentsRouter.post('/:id/replay', async (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Get original guard results
  const originalResults = intent.guardResults;

  // Re-evaluate with current guards
  const currentGuards = storage.getAllGuards();
  const currentResults = await checkGuards(intent);

  // Find differences
  const differences = originalResults.map(original => {
    const current = currentResults.find(c => c.guardId === original.guardId);
    return {
      guardId: original.guardId,
      guardName: original.guardName,
      original: original.passed,
      current: current?.passed ?? false,
      reason: current?.passed !== original.passed
        ? `Guard result changed: was ${original.passed ? 'passed' : 'failed'}, now ${current?.passed ? 'passed' : 'failed'}`
        : 'No change',
    };
  });

  const replayResult: IncidentReplayResult = {
    originalResult: {
      allowed: originalResults.every(r => r.passed),
      timestamp: intent.createdAt,
      guardResults: originalResults,
    },
    currentResult: {
      allowed: currentResults.every(r => r.passed),
      timestamp: new Date().toISOString(),
      guardResults: currentResults,
    },
    differences,
  };

  res.json(replayResult);
});

// PHASE 3: Transaction verification endpoint
// Sync transaction status from Circle API
paymentsRouter.get('/:id/sync', async (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  // Only sync if we have execution artifacts
  if (!intent.txHash && !intent.metadata?.circleTransactionId && !intent.metadata?.circleTransferId) {
    return res.status(400).json({
      error: 'No transaction to sync',
      message: 'Payment has not been executed yet'
    });
  }

  // If intent has a blockchain txHash (starts with 0x) and succeeded status, it's already confirmed
  const isBlockchainHash = intent.txHash && (intent.txHash.startsWith('0x') || /^[0-9a-fA-F]{64}$/.test(intent.txHash));
  if (isBlockchainHash && intent.status === 'succeeded') {
    return res.json({
      transactionStatus: 'confirmed',
      circleStatus: 'confirmed',
      intent,
      lastUpdated: new Date().toISOString(),
    });
  }

  try {
    const { callMcp } = await import('../lib/mcp-client.js');

    // Try to get transaction status from Circle
    // Use circle_transaction_id or transfer_id if available
    const txId = intent.metadata?.circleTransactionId || intent.metadata?.circleTransferId || intent.txHash;

    const statusResult = await callMcp('get_transaction_status', {
      transaction_id: txId
    }) as any;

    if (statusResult?.status === 'success') {
      // Map Circle transaction states to simplified states
      const circleStatus = statusResult.transaction_status || statusResult.state || 'unknown';
      let mappedStatus: 'pending' | 'confirmed' | 'failed';

      // Circle states: pending, complete, failed, etc.
      if (circleStatus === 'complete' || circleStatus === 'confirmed' || circleStatus === 'success') {
        mappedStatus = 'confirmed';
      } else if (circleStatus === 'failed' || circleStatus === 'error' || circleStatus === 'cancelled') {
        mappedStatus = 'failed';
      } else {
        mappedStatus = 'pending';
      }

      // PHASE: Update blockchain transaction hash and explorer URL if available
      const blockchainTxHash = statusResult.blockchain_tx || statusResult.tx_hash || statusResult.transaction_hash;
      // Only update if we have a valid blockchain hash (starts with 0x or is 64-char hex)
      const isValidBlockchainHash = blockchainTxHash && (blockchainTxHash.startsWith('0x') || blockchainTxHash.match(/^[0-9a-fA-F]{64}$/));

      if (isValidBlockchainHash && blockchainTxHash !== intent.txHash) {
        intent.txHash = blockchainTxHash;

        // Generate explorer URL for Arc Testnet
        const explorerBase = process.env.ARC_EXPLORER_TX_BASE || 'https://testnet.arcscan.app/tx';
        const normalizedBase = explorerBase.replace(/\/tx\/?$/, '/tx');
        const explorerUrl = `${normalizedBase}/${blockchainTxHash}`;

        // Update metadata with explorer URL
        if (!intent.metadata) {
          intent.metadata = {};
        }
        intent.metadata.explorerUrl = explorerUrl;
        intent.metadata.blockchainTxHash = blockchainTxHash;

        console.log(`[Transaction Sync] Updated blockchain tx hash and explorer URL for intent ${intent.id}: ${blockchainTxHash}`);
      }

      // Update intent status if it changed
      if (mappedStatus === 'confirmed' && intent.status !== 'succeeded') {
        intent.status = 'succeeded';
        intent.updatedAt = new Date().toISOString();
        storage.savePaymentIntent(intent);

        // Update Supabase if configured
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`, supabaseKey);
            const updateData: any = { status: 'succeeded', updated_at: new Date().toISOString() };

            // Update blockchain transaction hash and explorer URL if available
            if (intent.txHash) {
              updateData.blockchain_tx_hash = intent.txHash;
            }
            if (intent.metadata?.explorerUrl) {
              updateData.explorer_url = intent.metadata.explorerUrl;
            }

            await supabase
              .from('payment_intents')
              .update(updateData)
              .eq('id', intent.id);
          }
        } catch (dbError) {
          console.error('[Transaction Sync] Failed to update Supabase:', dbError);
        }
      } else if (mappedStatus === 'failed' && intent.status !== 'failed') {
        intent.status = 'failed';
        intent.steps[3].status = 'failed';
        intent.steps[3].details = 'Transaction failed on-chain';
        intent.updatedAt = new Date().toISOString();
        storage.savePaymentIntent(intent);

        // Update Supabase
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`, supabaseKey);
            await supabase
              .from('payment_intents')
              .update({ status: 'failed', last_error: 'Transaction failed on-chain', updated_at: new Date().toISOString() })
              .eq('id', intent.id);
          }
        } catch (dbError) {
          console.error('[Transaction Sync] Failed to update Supabase:', dbError);
        }
      }

      return res.json({
        transactionStatus: mappedStatus,
        circleStatus,
        intent,
        lastUpdated: new Date().toISOString(),
      });
    }

    // If status check failed, return current intent state
    return res.json({
      transactionStatus: 'pending',
      error: 'Could not fetch transaction status from Circle',
      intent,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Transaction Sync] Error:', error);

    // Return current intent state with error
    return res.json({
      transactionStatus: intent.status === 'succeeded' ? 'confirmed' : 'pending',
      error: error instanceof Error ? error.message : 'Unknown error',
      intent,
      lastUpdated: new Date().toISOString(),
    });
  }
});


// Get MCP/SDK contract
paymentsRouter.get('/:id/contract', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  const contract: McpSdkContract = intent.contract || {
    backendApiCall: {
      method: 'POST',
      endpoint: `/api/payments/${intent.id}/simulate`,
      payload: {
        amount: intent.amount,
        recipient: intent.recipient,
        recipientAddress: intent.recipientAddress,
        walletId: intent.walletId,
        chain: intent.chain,
      },
    },
    mcpToolInvoked: {
      toolName: 'create_payment_intent',
      toolId: 'mcp_tool_1',
      input: {
        amount: intent.amount,
        recipient: intent.recipient,
        chain: intent.chain,
      },
    },
    sdkMethodCalled: {
      method: 'simulate',
      params: {
        amount: intent.amount,
        recipientAddress: intent.recipientAddress,
        chain: intent.chain,
      },
      result: {
        route: intent.route,
        estimatedFee: 0.5,
      },
    },
  };

  res.json(contract);
});

// ==================== ARCPAY CHECKOUT ENDPOINTS ====================

/**
 * Generate hosted checkout link for a payment intent
 * 
 * POST /api/payments/:id/checkout/link
 * 
 * Creates an ArcPay checkout session and returns a shareable payment link.
 * The link can be shared without exposing API keys.
 */
paymentsRouter.post('/:id/checkout/link', async (req, res) => {
  const { id } = req.params;
  const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;

  const intent = storage.getPaymentIntent(id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  try {
    // Create ArcPay checkout session
    const { checkoutUrl, sessionId } = await createArcPayCheckout({
      amount: intent.amount,
      currency: intent.currency || 'USDC',
      description: intent.description || `Payment of ${intent.amount} ${intent.currency || 'USDC'}`,
      userId: privyUserId || intent.metadata?.userId || 'unknown',
      intentId: intent.id,
    });

    // Update intent with checkout information
    intent.paymentLink = {
      url: checkoutUrl,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours default expiration
      metadata: {
        sessionId,
        type: 'link',
      },
    };
    intent.updatedAt = new Date().toISOString();
    storage.savePaymentIntent(intent);

    // Persist to Supabase
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
          supabaseKey
        );

        await supabase
          .from('payment_intents')
          .update({
            checkout_url: checkoutUrl,
            checkout_session_id: sessionId,
            checkout_type: 'link',
            updated_at: new Date().toISOString(),
          })
          .eq('id', intent.id);
      }
    } catch (dbError) {
      console.error('[Checkout Link] Failed to persist to Supabase:', dbError);
      // Continue - checkout link was created successfully
    }

    res.json({
      success: true,
      checkoutUrl,
      sessionId,
      intentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      message: `Payment link created. Share this link to receive ${intent.amount} ${intent.currency || 'USDC'}.`,
    });
  } catch (error) {
    console.error('[Checkout Link] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout link';
    
    // Check if it's a missing API key error
    if (errorMessage.includes('ARCPAY_API_KEY')) {
      return res.status(500).json({
        error: 'ArcPay not configured',
        message: 'ARCPAY_API_KEY environment variable is required. Please configure ArcPay merchant account.',
      });
    }

    res.status(500).json({
      error: 'Failed to create checkout link',
      message: errorMessage,
    });
  }
});

/**
 * Generate QR code payment link for a payment intent
 * 
 * POST /api/payments/:id/checkout/qr
 * 
 * Creates an ArcPay checkout session and generates a QR code.
 * The QR code encodes the hosted checkout URL and is wallet-agnostic.
 */
paymentsRouter.post('/:id/checkout/qr', async (req, res) => {
  const { id } = req.params;
  const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;

  const intent = storage.getPaymentIntent(id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  try {
    // Create ArcPay checkout session (reuse same session if already exists)
    let checkoutUrl = intent.paymentLink?.url;
    let sessionId = intent.paymentLink?.metadata?.sessionId;

    if (!checkoutUrl || !sessionId) {
      const checkout = await createArcPayCheckout({
        amount: intent.amount,
        currency: intent.currency || 'USDC',
        description: intent.description || `Payment of ${intent.amount} ${intent.currency || 'USDC'}`,
        userId: privyUserId || intent.metadata?.userId || 'unknown',
        intentId: intent.id,
      });
      checkoutUrl = checkout.checkoutUrl;
      sessionId = checkout.sessionId;
    }

    // Generate QR code for checkout URL
    const qrCodeDataURL = await generatePaymentQRCode(checkoutUrl);

    // Update intent with checkout information
    intent.paymentLink = {
      url: checkoutUrl,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours default expiration
      metadata: {
        sessionId,
        type: 'qr',
        qrCode: qrCodeDataURL,
      },
    };
    intent.updatedAt = new Date().toISOString();
    storage.savePaymentIntent(intent);

    // Persist to Supabase
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
          supabaseKey
        );

        await supabase
          .from('payment_intents')
          .update({
            checkout_url: checkoutUrl,
            checkout_session_id: sessionId,
            checkout_type: 'qr',
            updated_at: new Date().toISOString(),
          })
          .eq('id', intent.id);
      }
    } catch (dbError) {
      console.error('[Checkout QR] Failed to persist to Supabase:', dbError);
      // Continue - QR code was generated successfully
    }

    res.json({
      success: true,
      checkoutUrl,
      sessionId,
      qrCode: qrCodeDataURL,
      intentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      message: `QR payment link created. Scan to pay ${intent.amount} ${intent.currency || 'USDC'}.`,
    });
  } catch (error) {
    console.error('[Checkout QR] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create QR payment link';
    
    // Check if it's a missing API key error
    if (errorMessage.includes('ARCPAY_API_KEY')) {
      return res.status(500).json({
        error: 'ArcPay not configured',
        message: 'ARCPAY_API_KEY environment variable is required. Please configure ArcPay merchant account.',
      });
    }

    res.status(500).json({
      error: 'Failed to create QR payment link',
      message: errorMessage,
    });
  }
});

/**
 * Get checkout status for a payment intent
 * 
 * GET /api/payments/:id/checkout/status
 * 
 * Polls ArcPay API to get current checkout session status.
 * Used to update payment intent status when payment is completed.
 */
paymentsRouter.get('/:id/checkout/status', async (req, res) => {
  const { id } = req.params;

  const intent = storage.getPaymentIntent(id);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  const sessionId = intent.paymentLink?.metadata?.sessionId || intent.metadata?.checkoutSessionId;
  if (!sessionId) {
    return res.status(400).json({
      error: 'No checkout session found',
      message: 'This payment intent does not have an associated checkout session.',
    });
  }

  try {
    const { getArcPayClient } = await import('../lib/arcpay-client.js');
    const client = getArcPayClient();
    const session = await client.getCheckoutSessionStatus(sessionId);

    // Update intent status based on checkout session status
    if (session.status === 'paid' && intent.status !== 'succeeded') {
      intent.status = 'succeeded';
      intent.updatedAt = new Date().toISOString();
      storage.savePaymentIntent(intent);

      // Update Supabase
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`,
            supabaseKey
          );

          await supabase
            .from('payment_intents')
            .update({
              status: 'succeeded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', intent.id);
        }
      } catch (dbError) {
        console.error('[Checkout Status] Failed to update Supabase:', dbError);
      }
    } else if (session.status === 'failed' && intent.status !== 'failed') {
      intent.status = 'failed';
      intent.updatedAt = new Date().toISOString();
      storage.savePaymentIntent(intent);
    } else if (session.status === 'expired' && intent.status !== 'expired') {
      intent.status = 'expired';
      intent.updatedAt = new Date().toISOString();
      storage.savePaymentIntent(intent);
    }

    res.json({
      sessionId,
      status: session.status,
      checkoutUrl: session.url,
      intentStatus: intent.status,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Checkout Status] Error:', error);
    res.status(500).json({
      error: 'Failed to check checkout status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


