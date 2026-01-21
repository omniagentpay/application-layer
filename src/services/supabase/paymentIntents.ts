import { supabase } from '@/lib/supabase';
import type { PaymentIntent } from '@/types';

/**
 * Fetch payment intents from Supabase for a specific user
 */
export async function getPaymentIntentsFromSupabase(userId: string): Promise<PaymentIntent[]> {
  try {
    // Convert UUID to string if needed (payment_intents.user_id is TEXT)
    const userIdStr = String(userId);
    console.log('[getPaymentIntentsFromSupabase] Fetching payment intents for user:', { userId, userIdStr });
    
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('user_id', userIdStr)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getPaymentIntentsFromSupabase] Supabase error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
      });
      return [];
    }

    console.log('[getPaymentIntentsFromSupabase] Fetched payment intents:', {
      count: data?.length || 0,
      userId,
      intents: data?.map(i => ({ id: i.id, status: i.status, amount: i.amount })),
    });

    // Transform Supabase data to PaymentIntent type
    return (data || []).map((intent: any) => ({
      id: intent.id,
      amount: intent.amount || 0,
      currency: intent.currency || 'USDC',
      recipient: intent.recipient || '',
      recipientAddress: intent.recipient_address || '',
      description: intent.description || '',
      status: intent.status || 'pending',
      walletId: intent.wallet_id || '',
      chain: intent.chain || 'ethereum',
      agentId: intent.agent_id || undefined,
      agentName: intent.agent_name || undefined,
      steps: intent.steps || [],
      guardResults: intent.guard_results || [],
      route: intent.route || undefined,
      metadata: intent.metadata || {},
      createdAt: intent.created_at || new Date().toISOString(),
      updatedAt: intent.updated_at || intent.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[getPaymentIntentsFromSupabase] Unexpected error:', {
      error,
      userId,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Fetch a single payment intent by ID
 */
export async function getPaymentIntentFromSupabase(
  userId: string,
  intentId: string
): Promise<PaymentIntent | null> {
  try {
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', intentId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      amount: data.amount || 0,
      currency: data.currency || 'USDC',
      recipient: data.recipient || '',
      recipientAddress: data.recipient_address || '',
      description: data.description || '',
      status: data.status || 'pending',
      walletId: data.wallet_id || '',
      chain: data.chain || 'ethereum',
      agentId: data.agent_id || undefined,
      agentName: data.agent_name || undefined,
      steps: data.steps || [],
      guardResults: data.guard_results || [],
      route: data.route || undefined,
      metadata: data.metadata || {},
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in getPaymentIntentFromSupabase:', error);
    return null;
  }
}
