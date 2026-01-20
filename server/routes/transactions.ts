import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { generateReceiptSummary } from '../lib/sdk-client.js';
import type { Transaction } from '../types/index.js';

export const transactionsRouter = Router();

// Get all transactions with pagination and filtering
transactionsRouter.get('/', async (req, res) => {
  let transactions = storage.getAllTransactions();
  
  // Apply filters
  const { walletId, status, startDate, endDate, limit } = req.query;
  
  if (walletId) {
    transactions = transactions.filter(tx => tx.walletId === walletId);
  }
  
  if (status) {
    transactions = transactions.filter(tx => tx.status === status);
  }
  
  if (startDate) {
    const start = new Date(startDate as string);
    transactions = transactions.filter(tx => new Date(tx.createdAt) >= start);
  }
  
  if (endDate) {
    const end = new Date(endDate as string);
    transactions = transactions.filter(tx => new Date(tx.createdAt) <= end);
  }
  
  // Sort by date (newest first) - do this before limiting for better performance
  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Apply pagination limit if provided (default to 200 for performance)
  const limitNum = limit ? parseInt(limit as string, 10) : 200;
  const paginatedTransactions = transactions.slice(0, limitNum);
  
  res.json(paginatedTransactions);
});

// Get a specific transaction
transactionsRouter.get('/:id', async (req, res) => {
  const transaction = storage.getTransaction(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // Generate AI receipt summary if not already present
  if (!transaction.metadata?.receiptSummary) {
    try {
      const summary = await generateReceiptSummary(transaction);
      transaction.metadata = {
        ...transaction.metadata,
        receiptSummary: summary,
      };
      storage.saveTransaction(transaction);
    } catch (error) {
      console.error('Failed to generate receipt summary:', error);
    }
  }
  
  res.json(transaction);
});

// Export transactions as CSV
transactionsRouter.get('/export/csv', (req, res) => {
  const transactions = storage.getAllTransactions();
  
  const headers = ['ID', 'Type', 'Amount', 'Currency', 'Recipient', 'Status', 'Chain', 'Date', 'Tx Hash'];
  const rows = transactions.map(tx => [
    tx.id,
    tx.type,
    tx.amount.toString(),
    tx.currency,
    tx.recipient || '',
    tx.status,
    tx.chain,
    tx.createdAt,
    tx.txHash || '',
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  res.send(csv);
});
