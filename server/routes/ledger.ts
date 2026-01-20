import { Router } from 'express';
import { storage } from '../lib/storage.js';
import type { LedgerEntry } from '../types/index.js';

export const ledgerRouter = Router();

// Get all ledger entries
ledgerRouter.get('/', (req, res) => {
  const { agentId, intentId, transactionId, startDate, endDate } = req.query;
  
  let entries = storage.getAllLedgerEntries();
  
  if (agentId) {
    entries = entries.filter(e => e.agentId === agentId);
  }
  if (intentId) {
    entries = entries.filter(e => e.intentId === intentId);
  }
  if (transactionId) {
    entries = entries.filter(e => e.transactionId === transactionId);
  }
  if (startDate) {
    entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate as string));
  }
  if (endDate) {
    entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate as string));
  }
  
  // Sort by timestamp descending
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  res.json(entries);
});

// Get a specific ledger entry
ledgerRouter.get('/:id', (req, res) => {
  const entry = storage.getLedgerEntry(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Ledger entry not found' });
  }
  res.json(entry);
});
