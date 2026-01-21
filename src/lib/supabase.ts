import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl?.substring(0, 30) || 'missing',
  });
  console.warn('[Supabase] Supabase URL and Anon Key must be set in environment variables');
} else {
  console.log('[Supabase] Client initialized:', {
    urlPrefix: supabaseUrl.substring(0, 30) + '...',
    hasKey: !!supabaseAnonKey,
  });
}

// Configure Supabase client with better error handling and CORS support
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're using Privy, not Supabase Auth
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'omnipay-dashboard',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

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
 * Handles CORS errors by retrying and gracefully handling network failures
 */
export async function ensureUserInSupabase(
  privyUserId: string,
  email?: string,
  walletAddress?: string
): Promise<string | null> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 500; // ms

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[ensureUserInSupabase] Retry attempt ${attempt + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }

      console.log('[ensureUserInSupabase] Looking up user:', {
        privyUserId,
        email,
        walletAddress,
        attempt: attempt + 1,
      });

      // Check if user exists in Supabase
      const { data: existingUser, error: lookupError } = await supabase
        .from('users')
        .select('id')
        .eq('privy_user_id', privyUserId)
        .maybeSingle();

      // Handle CORS or network errors
      if (lookupError) {
        const isNetworkError = 
          lookupError.message?.includes('NetworkError') ||
          lookupError.message?.includes('fetch') ||
          lookupError.message?.includes('CORS') ||
          lookupError.code === ''; // Empty code often indicates CORS/network error

        if (isNetworkError && attempt < MAX_RETRIES - 1) {
          console.warn('[ensureUserInSupabase] Network/CORS error, will retry:', {
            message: lookupError.message,
            attempt: attempt + 1,
          });
          continue; // Retry
        }

        // PGRST116 means no rows found, which is fine - user doesn't exist yet
        if (lookupError.code === 'PGRST116') {
          console.log('[ensureUserInSupabase] User not found in database (this is OK)');
        } else {
          console.error('[ensureUserInSupabase] Error looking up user:', {
            message: lookupError.message,
            code: lookupError.code,
            details: lookupError.details,
            hint: lookupError.hint,
            attempt: attempt + 1,
          });
          
          // If it's a network error on the last attempt, return null
          if (isNetworkError) {
            console.error('[ensureUserInSupabase] Network error persists after retries');
            return null;
          }
        }
      }

      // User found - return immediately
      if (existingUser) {
        console.log('[ensureUserInSupabase] Found existing user:', {
          supabaseUserId: existingUser.id,
          privyUserId,
        });
        return existingUser.id;
      }

      // User not found - try to create (only on first attempt or if no error)
      if (attempt === 0 || !lookupError) {
        console.log('[ensureUserInSupabase] User not found, creating new user:', privyUserId);

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            privy_user_id: privyUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createError) {
          // Handle duplicate key error - user was created between lookup and insert
          if (createError.code === '23505') {
            console.log('[ensureUserInSupabase] User was created concurrently, retrying lookup');
            // Retry the lookup to get the newly created user
            continue;
          }

          // Handle network errors during creation
          const isCreateNetworkError = 
            createError.message?.includes('NetworkError') ||
            createError.message?.includes('fetch') ||
            createError.message?.includes('CORS') ||
            createError.code === '';

          if (isCreateNetworkError && attempt < MAX_RETRIES - 1) {
            console.warn('[ensureUserInSupabase] Network error during user creation, retrying');
            continue;
          }

          console.error('[ensureUserInSupabase] Error creating user:', {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint,
            privyUserId,
          });
          
          // If duplicate key or network error, retry lookup
          if (createError.code === '23505' || (isCreateNetworkError && attempt < MAX_RETRIES - 1)) {
            continue;
          }
          
          return null;
        }

        if (newUser?.id) {
          console.log('[ensureUserInSupabase] Created new user:', {
            supabaseUserId: newUser.id,
            privyUserId,
          });
          return newUser.id;
        }
      }
    } catch (error) {
      const isNetworkError = 
        error instanceof TypeError && 
        (error.message.includes('fetch') || error.message.includes('NetworkError'));

      if (isNetworkError && attempt < MAX_RETRIES - 1) {
        console.warn('[ensureUserInSupabase] Network error in catch block, retrying:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          attempt: attempt + 1,
        });
        continue;
      }

      console.error('[ensureUserInSupabase] Unexpected error:', {
        error,
        privyUserId,
        message: error instanceof Error ? error.message : 'Unknown error',
        attempt: attempt + 1,
      });
      
      if (attempt === MAX_RETRIES - 1) {
        return null;
      }
    }
  }

  console.error('[ensureUserInSupabase] Failed after all retry attempts');
  return null;
}
