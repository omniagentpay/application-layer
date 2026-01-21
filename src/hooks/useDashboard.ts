import { useQuery } from '@tanstack/react-query';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getPaymentIntentsFromSupabase } from '@/services/supabase/paymentIntents';
import { getTransactionsFromSupabase } from '@/services/supabase/transactions';
import { getWalletsFromSupabase } from '@/services/supabase/wallets';
import { agentsService } from '@/services/agents';
import type { User } from '@privy-io/react-auth';

export function useDashboardData(user: User | null, authenticated: boolean) {
  return useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      if (!user || !authenticated) {
        throw new Error('User not authenticated');
      }

      const privyUserId = user.id;
      const email = user.email?.address || user.google?.email || undefined;
      const walletAddress = user.wallet?.address || undefined;
      
      console.log('[useDashboardData] Fetching dashboard data for user:', {
        privyUserId,
        email,
        walletAddress,
      });

      let supabaseUserId = await ensureUserInSupabase(privyUserId, email, walletAddress);

      // Fallback: If Supabase direct query fails (e.g., CORS), try to get user ID from backend
      if (!supabaseUserId) {
        console.warn('[useDashboardData] Direct Supabase query failed, trying backend fallback');
        try {
          // The backend can query Supabase successfully, so we can use it as a fallback
          // Try to fetch payment intents from backend - the backend will handle user lookup
          const { apiClient } = await import('@/lib/api-client');
          const backendIntents = await apiClient.get<any[]>('/payments').catch(() => []);
          
          // Extract user_id from the first intent if available
          // Note: This is a workaround - ideally the backend should have a /users endpoint
          if (backendIntents.length > 0 && backendIntents[0].metadata?.userId) {
            // Try to get user ID from backend response metadata
            const backendUserId = backendIntents[0].metadata.userId;
            console.log('[useDashboardData] Extracted user ID from backend response:', backendUserId);
            
            // Try one more time with the extracted ID
            supabaseUserId = await ensureUserInSupabase(privyUserId, email, walletAddress);
          }
        } catch (fallbackError) {
          console.error('[useDashboardData] Backend fallback also failed:', fallbackError);
        }
      }

      if (!supabaseUserId) {
        console.error('[useDashboardData] Failed to get or create user in Supabase after all attempts');
        // Don't throw error - allow dashboard to load with empty data
        // This prevents the entire dashboard from breaking due to CORS issues
        console.warn('[useDashboardData] Continuing with empty user ID - dashboard may show limited data');
        supabaseUserId = 'unknown'; // Use 'unknown' as fallback to allow queries to proceed
      }

      console.log('[useDashboardData] Supabase user ID:', supabaseUserId);

      // Fetch all data in parallel, but limit transactions to 200 for better performance
      const [intents, allTransactions, wallets, agents] = await Promise.all([
        getPaymentIntentsFromSupabase(supabaseUserId).catch((err) => {
          console.error('[useDashboardData] Error fetching payment intents:', err);
          return [];
        }),
        getTransactionsFromSupabase(supabaseUserId, { limit: 200 }).catch((err) => {
          console.error('[useDashboardData] Error fetching transactions:', err);
          return [];
        }),
        getWalletsFromSupabase(supabaseUserId).catch((err) => {
          console.error('[useDashboardData] Error fetching wallets:', err);
          return [];
        }),
        agentsService.getAgents().catch((err) => {
          console.error('[useDashboardData] Error fetching agents:', err);
          return [];
        }),
      ]);

      console.log('[useDashboardData] Fetched data:', {
        intentsCount: intents.length,
        transactionsCount: allTransactions.length,
        walletsCount: wallets.length,
        agentsCount: agents.length,
      });

      return {
        intents,
        transactions: allTransactions,
        wallets,
        agents,
        supabaseUserId,
      };
    },
    enabled: !!user && authenticated,
    staleTime: 0, // Always consider data stale to allow real-time updates
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: 2,
    retryDelay: 1000,
  });
}
