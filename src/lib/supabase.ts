import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current user ID from Supabase session
 * This should be called after user authentication
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Get user ID from Privy and sync with Supabase
 * This ensures the user exists in Supabase when they log in via Privy
 */
export async function ensureUserInSupabase(
  privyUserId: string,
  email?: string,
  walletAddress?: string
): Promise<string | null> {
  try {
    // Check if user exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('privy_user_id', privyUserId)
      .maybeSingle();

    if (existingUser) {
      return existingUser.id;
    }

    // Create user if doesn't exist
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        privy_user_id: privyUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating user in Supabase:', error);
      return null;
    }

    return newUser?.id || null;
  } catch (error) {
    console.error('Error ensuring user in Supabase:', error);
    return null;
  }
}
