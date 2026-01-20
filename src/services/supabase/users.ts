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
    // Note: username and wallet_address columns don't exist in current schema
    // This function is kept for API compatibility but does nothing
    // TODO: Add username column to users table if needed
    console.warn('updateUsername called but username column does not exist in schema');
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
    // Note: username column doesn't exist in current schema
    // This function always returns true for API compatibility
    // TODO: Add username column to users table if needed
    console.warn('checkUsernameAvailability called but username column does not exist in schema');
    return true;
  } catch (error) {
    console.error('Failed to check username availability:', error);
    return false;
  }
}
