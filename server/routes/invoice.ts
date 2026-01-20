import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { checkGuards, requiresApproval } from '../lib/guards.js';
import { simulatePayment, executePayment } from '../lib/sdk-client.js';
import type { PaymentIntent } from '../types/index.js';

export const invoiceRouter = Router();

const isDemoMode = () => process.env.OMNI_DEMO_MODE === 'true';

// Parse invoice (PDF/image or text)
invoiceRouter.post('/parse', async (req, res) => {
  const { fileBase64, text } = req.body;
  
  if (!fileBase64 && !text) {
    return res.status(400).json({ error: 'Either fileBase64 or text is required' });
  }

  try {
    let parsedData: {
      vendorName: string;
      vendorId?: string;
      amount: number;
      currency: string;
      memo: string;
      confidence: number;
      extractedFields: Record<string, unknown>;
    };

    if (isDemoMode()) {
      // Demo mode: deterministic parsing with regex + heuristics
      const invoiceText = text || 'Invoice from Acme Corp\nAmount: $1,234.56\nDue: 2024-01-15';
      
      // Extract amount
      const amountMatch = invoiceText.match(/\$?([\d,]+\.?\d*)/g);
      const amounts = amountMatch?.map(m => parseFloat(m.replace(/[$,]/g, ''))) || [];
      const amount = amounts.length > 0 ? Math.max(...amounts) : 1234.56;
      
      // Extract vendor name
      const vendorMatch = invoiceText.match(/(?:from|vendor|company|to):\s*([A-Za-z\s]+)/i) ||
                         invoiceText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      const vendorName = vendorMatch ? vendorMatch[1].trim() : 'Acme Corporation';
      
      // Extract currency
      const currencyMatch = invoiceText.match(/\b(USD|USDC|EUR|GBP)\b/i);
      const currency = currencyMatch ? currencyMatch[1].toUpperCase() : 'USDC';
      
      parsedData = {
        vendorName,
        vendorId: `vendor_${vendorName.toLowerCase().replace(/\s+/g, '_')}`,
        amount,
        currency,
        memo: `Invoice payment to ${vendorName}`,
        confidence: 0.85,
        extractedFields: {
          invoiceNumber: `INV-${Date.now()}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          lineItems: [
            { description: 'Services', amount },
          ],
        },
      };
    } else {
      // Real mode: forward to MCP if available
      const mcpBaseUrl = process.env.MCP_BASE_URL || 'http://localhost:8000';
      try {
        const response = await fetch(`${mcpBaseUrl}/invoice/parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.OMNI_API_KEY ? { 'Authorization': `Bearer ${process.env.OMNI_API_KEY}` } : {}),
          },
          body: JSON.stringify({ fileBase64, text }),
        });
        
        if (response.ok) {
          parsedData = await response.json();
        } else {
          // Fallback to demo mode if MCP fails
          throw new Error('MCP endpoint failed, using demo mode');
        }
      } catch (error) {
        console.warn('MCP invoice parse failed, using demo mode:', error);
        // Fallback to demo parsing
        const invoiceText = text || 'Invoice from Acme Corp\nAmount: $1,234.56';
        const amountMatch = invoiceText.match(/\$?([\d,]+\.?\d*)/g);
        const amounts = amountMatch?.map(m => parseFloat(m.replace(/[$,]/g, ''))) || [];
        parsedData = {
          vendorName: 'Acme Corporation',
          amount: amounts.length > 0 ? Math.max(...amounts) : 1234.56,
          currency: 'USDC',
          memo: 'Invoice payment',
          confidence: 0.75,
          extractedFields: {},
        };
      }
    }

    res.json(parsedData);
  } catch (error) {
    console.error('Invoice parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse invoice', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create intent from invoice
invoiceRouter.post('/intents/create', async (req, res) => {
  const { amount, token, target, memo, source, extractedFields } = req.body;
  
  if (!amount || !target) {
    return res.status(400).json({ error: 'Missing required fields: amount, target' });
  }

  // Extract Privy user ID from headers for persistence
  const privyUserId = req.headers['x-privy-user-id'] as string;

  const tokenSymbol = token || 'USDC';
  const walletId = 'wallet_1'; // Default wallet for demo
  const chain = 'ethereum'; // Default chain

  // Get or create a default agent
  const agents = storage.getAllAgents();
  const defaultAgent = agents.length > 0 ? agents[0] : null;

  const intent: PaymentIntent = {
    id: `pi_${Date.now()}`,
    amount: parseFloat(amount),
    currency: tokenSymbol,
    recipient: extractedFields?.vendorName || target || 'Unknown Vendor',
    recipientAddress: target,
    description: memo || `Payment from ${source || 'invoice'}`,
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
      userId: privyUserId || 'unknown', // Add userId for Supabase persistence
      source: source || 'invoice',
      extractedFields: extractedFields || {},
    },
    contract: {
      backendApiCall: {
        method: 'POST',
        endpoint: `/api/invoice/intents/create`,
        payload: { amount, token, target, memo, source, extractedFields },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Run guard evaluation immediately
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
    }
  } catch (error) {
    console.error('Guard evaluation error:', error);
    intent.status = 'requires_approval'; // Default to requiring approval on error
  }

  storage.savePaymentIntent(intent);
  
  res.status(201).json({
    intentId: intent.id,
    status: intent.status,
    guardDecision: intent.guardResults,
    createdAt: intent.createdAt,
  });
});
