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
      const supabaseUserId = await ensureUserInSupabase(privyUserId, email, walletAddress);

      if (!supabaseUserId) {
        throw new Error('Failed to get or create user in Supabase');
      }

      // Fetch all data in parallel, but limit transactions to 200 for better performance
      const [intents, allTransactions, wallets, agents] = await Promise.all([
        getPaymentIntentsFromSupabase(supabaseUserId),
        getTransactionsFromSupabase(supabaseUserId, { limit: 200 }), // Reduced from 1000
        getWalletsFromSupabase(supabaseUserId),
        agentsService.getAgents().catch(() => []),
      ]);

      return {
        intents,
        transactions: allTransactions,
        wallets,
        agents,
        supabaseUserId,
      };
    },
    enabled: !!user && authenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes cache
  });
}
