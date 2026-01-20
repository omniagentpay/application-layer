import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/types';

/**
 * Fetch transactions from Supabase for a specific user
 */
export async function getTransactionsFromSupabase(
  userId: string,
  filters?: {
    walletId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<Transaction[]> {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.walletId) {
      query = query.eq('wallet_id', filters.walletId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions from Supabase:', error);
      return [];
    }

    // Transform Supabase data to Transaction type
    return (data || []).map((tx: any) => ({
      id: tx.id,
      type: tx.type || 'payment',
      amount: tx.amount || 0,
      currency: tx.currency || 'USDC',
      recipient: tx.recipient || '',
      recipientAddress: tx.recipient_address || '',
      status: tx.status || 'pending',
      chain: tx.chain || 'ethereum',
      walletId: tx.wallet_id || '',
      txHash: tx.tx_hash || undefined,
      createdAt: tx.created_at || new Date().toISOString(),
      updatedAt: tx.updated_at || tx.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error in getTransactionsFromSupabase:', error);
    return [];
  }
}

/**
 * Fetch a single transaction by ID
 */
export async function getTransactionFromSupabase(
  userId: string,
  transactionId: string
): Promise<Transaction | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      type: data.type || 'payment',
      amount: data.amount || 0,
      currency: data.currency || 'USDC',
      recipient: data.recipient || '',
      recipientAddress: data.recipient_address || '',
      status: data.status || 'pending',
      chain: data.chain || 'ethereum',
      walletId: data.wallet_id || '',
      txHash: data.tx_hash || undefined,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in getTransactionFromSupabase:', error);
    return null;
  }
}
