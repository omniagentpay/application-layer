import { supabase } from '@/lib/supabase';
import type { Wallet } from '@/types';

/**
 * Fetch wallets from Supabase for a specific user
 */
export async function getWalletsFromSupabase(userId: string): Promise<Wallet[]> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets from Supabase:', error);
      return [];
    }

    // Transform Supabase data to Wallet type
    return (data || []).map((wallet: any) => ({
      id: wallet.id,
      address: wallet.address || '',
      chain: wallet.chain || 'ethereum',
      status: wallet.status || 'active',
      balance: wallet.balance || 0,
      currency: wallet.currency || 'USDC',
      createdAt: wallet.created_at || new Date().toISOString(),
      updatedAt: wallet.updated_at || wallet.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error in getWalletsFromSupabase:', error);
    return [];
  }
}

/**
 * Fetch a single wallet by ID
 */
export async function getWalletFromSupabase(
  userId: string,
  walletId: string
): Promise<Wallet | null> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      address: data.address || '',
      chain: data.chain || 'ethereum',
      status: data.status || 'active',
      balance: data.balance || 0,
      currency: data.currency || 'USDC',
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in getWalletFromSupabase:', error);
    return null;
  }
}
