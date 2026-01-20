import { Router } from 'express';
import { storage } from '../lib/storage.js';
import type { PaymentIntent, Transaction } from '../types/index.js';

export const receiptsRouter = Router();

interface Receipt {
  receiptId: string;
  intentId?: string;
  transactionId?: string;
  summary: string;
  why: {
    trigger: string;
    guardOutcome: string;
    route: string;
    amount: number;
    destination: string;
  };
  toolTrace?: Array<{
    step: string;
    timestamp: string;
    result: string;
  }>;
  createdAt: string;
}

const receipts = new Map<string, Receipt>();

// Generate receipt for a transaction or intent
receiptsRouter.get('/:receiptId', (req, res) => {
  const receipt = receipts.get(req.params.receiptId);
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  res.json(receipt);
});

// Generate receipt from transaction ID
receiptsRouter.post('/from-transaction/:txId', (req, res) => {
  const transaction = storage.getTransaction(req.params.txId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const intent = transaction.intentId ? storage.getPaymentIntent(transaction.intentId) : null;
  
  // Generate receipt
  const receiptId = `receipt_${Date.now()}`;
  const receipt: Receipt = {
    receiptId,
    intentId: transaction.intentId,
    transactionId: transaction.id,
    summary: `Payment of ${transaction.currency} ${transaction.amount} to ${transaction.recipient || 'recipient'} on ${transaction.chain}`,
    why: {
      trigger: intent?.metadata?.source === 'invoice' ? 'Invoice parse' :
              intent?.metadata?.source === 'commerce' ? 'Commerce webhook' :
              'User request',
      guardOutcome: intent?.guardResults?.every(r => r.passed) 
        ? `Allowed - ${intent.guardResults.length} guard checks passed`
        : `Blocked - ${intent?.guardResults?.filter(r => !r.passed).length || 0} guard checks failed`,
      route: intent?.route || 'auto',
      amount: transaction.amount,
      destination: transaction.recipient || transaction.recipientAddress || 'unknown',
    },
    toolTrace: [
      {
        step: 'Simulate',
        timestamp: intent?.createdAt || transaction.createdAt,
        result: intent?.route ? `Route selected: ${intent.route}` : 'Simulation completed',
      },
      {
        step: 'Guard Evaluation',
        timestamp: intent?.updatedAt || transaction.createdAt,
        result: intent?.guardResults?.every(r => r.passed) ? 'All guards passed' : 'Some guards failed',
      },
      {
        step: 'Execute',
        timestamp: transaction.createdAt,
        result: transaction.txHash ? `Transaction ${transaction.txHash.substring(0, 10)}... confirmed` : 'Execution completed',
      },
    ],
    createdAt: transaction.createdAt,
  };

  receipts.set(receiptId, receipt);
  res.json(receipt);
});

// Generate receipt from intent ID
receiptsRouter.post('/from-intent/:intentId', (req, res) => {
  const intent = storage.getPaymentIntent(req.params.intentId);
  if (!intent) {
    return res.status(404).json({ error: 'Payment intent not found' });
  }

  const transaction = storage.getAllTransactions().find(tx => tx.intentId === intent.id);
  
  // Generate receipt
  const receiptId = `receipt_${Date.now()}`;
  const receipt: Receipt = {
    receiptId,
    intentId: intent.id,
    transactionId: transaction?.id,
    summary: `Payment intent for ${intent.currency} ${intent.amount} to ${intent.recipient} - Status: ${intent.status}`,
    why: {
      trigger: intent.metadata?.source === 'invoice' ? 'Invoice parse' :
              intent.metadata?.source === 'commerce' ? 'Commerce webhook' :
              'User request',
      guardOutcome: intent.guardResults?.every(r => r.passed) 
        ? `Allowed - ${intent.guardResults.length} guard checks passed`
        : `Blocked - ${intent.guardResults?.filter(r => !r.passed).length || 0} guard checks failed`,
      route: intent.route || 'auto',
      amount: intent.amount,
      destination: intent.recipient,
    },
    toolTrace: intent.steps.map(step => ({
      step: step.name,
      timestamp: step.timestamp || intent.createdAt,
      result: step.status === 'completed' ? 'Completed' : step.status === 'failed' ? 'Failed' : 'Pending',
    })),
    createdAt: intent.createdAt,
  };

  receipts.set(receiptId, receipt);
  res.json(receipt);
});
