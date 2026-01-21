import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { generateReceiptSummary } from '../lib/sdk-client.js';
import type { Transaction } from '../types/index.js';

export const transactionsRouter = Router();

// Get all transactions with pagination and filtering
transactionsRouter.get('/', async (req, res) => {
  try {
    // Extract Privy user ID from headers (case-insensitive)
    const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;

    console.log('[GET /api/transactions] Request received, privyUserId:', privyUserId || 'NOT SET');

    let transactions: Transaction[] = [];

    // Try to load from Supabase first (source of truth)
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
          // Build query for transactions filtered by user_id
          let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          const { walletId, status, startDate, endDate, limit } = req.query;

          if (walletId) {
            query = query.eq('wallet_id', walletId as string);
          }

          if (status) {
            query = query.eq('status', status as string);
          }

          if (startDate) {
            query = query.gte('created_at', startDate as string);
          }

          if (endDate) {
            query = query.lte('created_at', endDate as string);
          }

          const limitNum = limit ? parseInt(limit as string, 10) : 200;
          query = query.limit(limitNum);

          const { data: supabaseTransactions, error } = await query;

          if (error) {
            console.error('[GET /api/transactions] Supabase query error:', error);
          } else if (supabaseTransactions && supabaseTransactions.length > 0) {
            console.log('[GET /api/transactions] Found', supabaseTransactions.length, 'transactions in Supabase');
            
            // Transform Supabase data to Transaction type
            transactions = supabaseTransactions.map((tx: any) => ({
              id: tx.id,
              intentId: tx.intent_id || undefined,
              walletId: tx.wallet_id || '',
              type: tx.type || 'payment',
              amount: tx.amount || 0,
              currency: tx.currency || 'USDC',
              recipient: tx.recipient || undefined,
              recipientAddress: tx.recipient_address || undefined,
              status: tx.status || 'pending',
              chain: tx.chain || 'ethereum',
              txHash: tx.tx_hash || undefined,
              blockNumber: tx.block_number || undefined,
              fee: tx.fee || undefined,
              createdAt: tx.created_at || new Date().toISOString(),
              metadata: tx.metadata || undefined,
            }));
          } else {
            console.log('[GET /api/transactions] No transactions found in Supabase for user:', user.id);
          }
        } else {
          console.log('[GET /api/transactions] User not found in Supabase for privyUserId:', privyUserId);
        }
      }
    } catch (error) {
      console.error('[GET /api/transactions] Error loading from Supabase:', error);
    }

    // Fallback to in-memory storage if Supabase didn't return results
    if (transactions.length === 0) {
      console.log('[GET /api/transactions] Falling back to in-memory storage');
      transactions = storage.getAllTransactions();
      
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
      transactions = transactions.slice(0, limitNum);
    }

    console.log('[GET /api/transactions] Returning', transactions.length, 'transactions');
    res.json(transactions);
  } catch (error) {
    console.error('[GET /api/transactions] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get a specific transaction
transactionsRouter.get('/:id', async (req, res) => {
  try {
    // Extract Privy user ID from headers
    const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;
    
    let transaction: Transaction | null = null;

    // Try to load from Supabase first
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
          const { data: supabaseTx, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', user.id)
            .single();

          if (!error && supabaseTx) {
            transaction = {
              id: supabaseTx.id,
              intentId: supabaseTx.intent_id || undefined,
              walletId: supabaseTx.wallet_id || '',
              type: supabaseTx.type || 'payment',
              amount: supabaseTx.amount || 0,
              currency: supabaseTx.currency || 'USDC',
              recipient: supabaseTx.recipient || undefined,
              recipientAddress: supabaseTx.recipient_address || undefined,
              status: supabaseTx.status || 'pending',
              chain: supabaseTx.chain || 'ethereum',
              txHash: supabaseTx.tx_hash || undefined,
              blockNumber: supabaseTx.block_number || undefined,
              fee: supabaseTx.fee || undefined,
              createdAt: supabaseTx.created_at || new Date().toISOString(),
              metadata: supabaseTx.metadata || undefined,
            };
          }
        }
      }
    } catch (error) {
      console.error('[GET /api/transactions/:id] Error loading from Supabase:', error);
    }

    // Fallback to in-memory storage
    if (!transaction) {
      transaction = storage.getTransaction(req.params.id) || null;
    }

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
  } catch (error) {
    console.error('[GET /api/transactions/:id] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Export transactions as CSV
transactionsRouter.get('/export/csv', async (req, res) => {
  try {
    // Extract Privy user ID from headers
    const privyUserId = req.headers['x-privy-user-id'] as string || req.headers['X-Privy-User-Id'] as string;
    
    let transactions: Transaction[] = [];

    // Try to load from Supabase first
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
          const { data: supabaseTransactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && supabaseTransactions) {
            transactions = supabaseTransactions.map((tx: any) => ({
              id: tx.id,
              intentId: tx.intent_id || undefined,
              walletId: tx.wallet_id || '',
              type: tx.type || 'payment',
              amount: tx.amount || 0,
              currency: tx.currency || 'USDC',
              recipient: tx.recipient || undefined,
              recipientAddress: tx.recipient_address || undefined,
              status: tx.status || 'pending',
              chain: tx.chain || 'ethereum',
              txHash: tx.tx_hash || undefined,
              blockNumber: tx.block_number || undefined,
              fee: tx.fee || undefined,
              createdAt: tx.created_at || new Date().toISOString(),
              metadata: tx.metadata || undefined,
            }));
          }
        }
      }
    } catch (error) {
      console.error('[GET /api/transactions/export/csv] Error loading from Supabase:', error);
    }

    // Fallback to in-memory storage
    if (transactions.length === 0) {
      transactions = storage.getAllTransactions();
    }
    
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
  } catch (error) {
    console.error('[GET /api/transactions/export/csv] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});
