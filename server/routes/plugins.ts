import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { checkGuards, requiresApproval } from '../lib/guards.js';
import { executePayment } from '../lib/sdk-client.js';
import type { PaymentIntent } from '../types/index.js';

export const pluginsRouter = Router();

const isDemoMode = () => process.env.OMNI_DEMO_MODE === 'true';

const connections = new Map<string, {
  id: string;
  platform: 'shopify' | 'woocommerce';
  status: 'connected' | 'disconnected';
  webhookUrl: string;
  secret: string;
  createdAt: string;
}>();

// Connect Shopify
pluginsRouter.post('/shopify/connect', async (req, res) => {
  const connectionId = `conn_shopify_${Date.now()}`;
  const baseUrl = process.env.OMNI_BASE_URL || 'http://localhost:3001';
  
  const connection = {
    id: connectionId,
    platform: 'shopify' as const,
    status: 'connected' as const,
    webhookUrl: `${baseUrl}/api/webhooks/shopify/order-created`,
    secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: new Date().toISOString(),
  };
  
  connections.set(connectionId, connection);
  
  res.json({
    connectionId,
    status: connection.status,
    webhookUrl: connection.webhookUrl,
    secret: connection.secret,
  });
});

// Connect WooCommerce
pluginsRouter.post('/woocommerce/connect', async (req, res) => {
  const connectionId = `conn_woocommerce_${Date.now()}`;
  const baseUrl = process.env.OMNI_BASE_URL || 'http://localhost:3001';
  
  const connection = {
    id: connectionId,
    platform: 'woocommerce' as const,
    status: 'connected' as const,
    webhookUrl: `${baseUrl}/api/webhooks/woocommerce/order-created`,
    secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: new Date().toISOString(),
  };
  
  connections.set(connectionId, connection);
  
  res.json({
    connectionId,
    status: connection.status,
    webhookUrl: connection.webhookUrl,
    secret: connection.secret,
  });
});

// Get connections
pluginsRouter.get('/connections', (req, res) => {
  res.json(Array.from(connections.values()));
});

// Simulate order
pluginsRouter.post('/simulate-order', async (req, res) => {
  const { platform, orderTotal, merchantName } = req.body;
  
  if (!platform || !orderTotal) {
    return res.status(400).json({ error: 'platform and orderTotal are required' });
  }

  // Simulate webhook call
  const webhookPayload = {
    platform,
    orderId: `order_${Date.now()}`,
    orderTotal: parseFloat(orderTotal),
    merchantName: merchantName || 'Demo Merchant',
    currency: 'USDC',
    timestamp: new Date().toISOString(),
  };

  // Process webhook (create intent)
  const walletId = 'wallet_1';
  const chain = 'ethereum';
  const agents = storage.getAllAgents();
  const defaultAgent = agents.length > 0 ? agents[0] : null;

  const intent: PaymentIntent = {
    id: `pi_${Date.now()}`,
    amount: webhookPayload.orderTotal,
    currency: webhookPayload.currency,
    recipient: webhookPayload.merchantName,
    recipientAddress: `0x${Math.random().toString(16).slice(2, 42)}`, // Mock address
    description: `Order ${webhookPayload.orderId} from ${platform}`,
    status: 'pending',
    walletId,
    chain: chain as PaymentIntent['chain'],
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
      source: 'commerce',
      platform,
      orderId: webhookPayload.orderId,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Run guard evaluation
  try {
    const guardResults = await checkGuards(intent);
    intent.guardResults = guardResults;
    
    const needsApproval = requiresApproval(intent, guardResults);
    const allGuardsPassed = guardResults.every(r => r.passed);
    
    if (!allGuardsPassed) {
      intent.status = 'blocked';
    } else if (needsApproval) {
      intent.status = 'requires_approval';
    } else {
      intent.status = 'approved';
      // Auto-execute if approved and amount is small
      if (intent.amount < 100) {
        try {
          const executeResult = await executePayment(intent.id);
          if (executeResult.success && executeResult.txHash) {
            intent.txHash = executeResult.txHash;
            intent.status = 'succeeded';
            intent.steps[2].status = 'completed';
            intent.steps[3].status = 'completed';
            
            // Create transaction
            const transaction = {
              id: `tx_${Date.now()}`,
              intentId: intent.id,
              walletId: intent.walletId,
              type: 'payment' as const,
              amount: intent.amount,
              currency: intent.currency,
              recipient: intent.recipient,
              recipientAddress: intent.recipientAddress,
              status: 'succeeded' as const,
              chain: intent.chain,
              txHash: executeResult.txHash,
              fee: 0.5,
              createdAt: new Date().toISOString(),
            };
            storage.saveTransaction(transaction);
          }
        } catch (error) {
          console.error('Auto-execute failed:', error);
        }
      }
    }
  } catch (error) {
    console.error('Guard evaluation error:', error);
    intent.status = 'requires_approval';
  }

  storage.savePaymentIntent(intent);

  res.json({
    success: true,
    intentId: intent.id,
    status: intent.status,
    guardDecision: intent.guardResults,
  });
});

// Webhook: Shopify order created
pluginsRouter.post('/webhooks/shopify/order-created', async (req, res) => {
  // In real implementation, verify webhook signature
  const { order } = req.body;
  
  // Process similar to simulate-order
  const orderTotal = order?.total_price || 0;
  const merchantName = order?.shop?.name || 'Shopify Store';
  
  // Create intent (same logic as simulate-order)
  const walletId = 'wallet_1';
  const chain = 'ethereum';
  const agents = storage.getAllAgents();
  const defaultAgent = agents.length > 0 ? agents[0] : null;

  const intent: PaymentIntent = {
    id: `pi_${Date.now()}`,
    amount: parseFloat(orderTotal),
    currency: 'USDC',
    recipient: merchantName,
    recipientAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
    description: `Shopify order ${order?.id || 'unknown'}`,
    status: 'pending',
    walletId,
    chain: chain as PaymentIntent['chain'],
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
      source: 'commerce',
      platform: 'shopify',
      orderId: order?.id?.toString() || 'unknown',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const guardResults = await checkGuards(intent);
  intent.guardResults = guardResults;
  const needsApproval = requiresApproval(intent, guardResults);
  const allGuardsPassed = guardResults.every(r => r.passed);
  
  if (!allGuardsPassed) {
    intent.status = 'blocked';
  } else if (needsApproval) {
    intent.status = 'requires_approval';
  } else {
    intent.status = 'approved';
  }

  storage.savePaymentIntent(intent);

  res.json({ success: true, intentId: intent.id });
});

// Webhook: WooCommerce order created
pluginsRouter.post('/webhooks/woocommerce/order-created', async (req, res) => {
  // In real implementation, verify webhook signature
  const { order } = req.body;
  
  const orderTotal = order?.total || 0;
  const merchantName = order?.store_name || 'WooCommerce Store';
  
  // Create intent (same logic)
  const walletId = 'wallet_1';
  const chain = 'ethereum';
  const agents = storage.getAllAgents();
  const defaultAgent = agents.length > 0 ? agents[0] : null;

  const intent: PaymentIntent = {
    id: `pi_${Date.now()}`,
    amount: parseFloat(orderTotal),
    currency: 'USDC',
    recipient: merchantName,
    recipientAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
    description: `WooCommerce order ${order?.id || 'unknown'}`,
    status: 'pending',
    walletId,
    chain: chain as PaymentIntent['chain'],
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
      source: 'commerce',
      platform: 'woocommerce',
      orderId: order?.id?.toString() || 'unknown',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const guardResults = await checkGuards(intent);
  intent.guardResults = guardResults;
  const needsApproval = requiresApproval(intent, guardResults);
  const allGuardsPassed = guardResults.every(r => r.passed);
  
  if (!allGuardsPassed) {
    intent.status = 'blocked';
  } else if (needsApproval) {
    intent.status = 'requires_approval';
  } else {
    intent.status = 'approved';
  }

  storage.savePaymentIntent(intent);

  res.json({ success: true, intentId: intent.id });
});
