import { supabase } from '@/lib/supabase';

/**
 * Get user by Supabase user ID
 */
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Get user by Privy ID
 */
export async function getUserByPrivyId(privyId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('privy_user_id', privyId)
      .single();

    if (error) {
      console.error('Error fetching user by Privy ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get user by Privy ID:', error);
    return null;
  }
}

/**
 * Update user username
 */
export async function updateUsername(
  userId: string,
  username: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize username: lowercase, alphanumeric only, max 8 chars
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    
    if (!normalizedUsername || normalizedUsername.length === 0) {
      return {
        success: false,
        error: 'Username must be at least 1 character',
      };
    }

    if (normalizedUsername.length > 8) {
      return {
        success: false,
        error: 'Username must not exceed 8 characters',
      };
    }

    if (!/^[a-z0-9]+$/.test(normalizedUsername)) {
      return {
        success: false,
        error: 'Username can only contain lowercase letters and numbers',
      };
    }

    // Check if username is already taken by another user
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', normalizedUsername)
      .neq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking username availability:', checkError);
      return {
        success: false,
        error: 'Failed to check username availability',
      };
    }

    if (existingUser) {
      return {
        success: false,
        error: 'Username is already taken',
      };
    }

    // Update username and wallet_address
    const { error } = await supabase
      .from('users')
      .update({
        username: normalizedUsername,
        wallet_address: walletAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Username is already taken',
        };
      }
      console.error('Failed to update username:', error);
      return {
        success: false,
        error: error.message || 'Failed to update username',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update username:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark onboarding as completed
 */
export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    // Note: onboarding_completed column doesn't exist in current schema
    // This function is kept for API compatibility but does nothing
    // TODO: Add onboarding_completed column to users table if needed
    console.warn('markOnboardingCompleted called but onboarding_completed column does not exist in schema');
    // Just update updated_at to mark activity
    const { error } = await supabase
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to mark onboarding as completed:', error);
    throw error;
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  try {
    // Normalize username
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    
    if (!normalizedUsername || normalizedUsername.length === 0) {
      return false;
    }

    let query = supabase
      .from('users')
      .select('id')
      .eq('username', normalizedUsername);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query.single();

    // If no rows found (PGRST116), username is available
    if (error && error.code === 'PGRST116') {
      return true;
    }

    // If error occurred, return false to be safe
    if (error) {
      console.error('Error checking username availability:', error);
      return false;
    }

    // If data exists, username is taken
    return !data;
  } catch (error) {
    console.error('Failed to check username availability:', error);
    return false;
  }
}

/**
 * Get user wallet address by username
 */
export async function getWalletAddressByUsername(username: string): Promise<string | null> {
  try {
    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    
    if (!normalizedUsername) {
      return null;
    }

    // Remove @ if present
    const cleanUsername = normalizedUsername.startsWith('@') 
      ? normalizedUsername.slice(1) 
      : normalizedUsername;

    const { data, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('username', cleanUsername)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return null;
      }
      console.error('Error fetching wallet address by username:', error);
      return null;
    }

    return data?.wallet_address || null;
  } catch (error) {
    console.error('Failed to get wallet address by username:', error);
    return null;
  }
}
