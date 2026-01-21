import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getTransactionsFromSupabase } from '@/services/supabase/transactions';
import { paymentsService } from '@/services/payments';
import type { Transaction } from '@/types';

export function useTransactions(filters?: {
  walletId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { user, authenticated } = usePrivy();

  return useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: async () => {
      // Try Supabase first (more reliable and faster)
      if (user && authenticated) {
        try {
          const privyUserId = user.id;
          const email = user.email?.address || user.google?.email || undefined;
          const walletAddress = user.wallet?.address || undefined;
          
          const supabaseUserId = await ensureUserInSupabase(privyUserId, email, walletAddress);
          
          if (supabaseUserId) {
            const transactions = await getTransactionsFromSupabase(supabaseUserId, filters);
            console.log('[useTransactions] Fetched from Supabase:', transactions.length);
            return transactions;
          }
        } catch (error) {
          console.error('[useTransactions] Supabase fetch failed, falling back to API:', error);
        }
      }

      // Fallback to API endpoint
      return paymentsService.getTransactions(filters);
    },
    enabled: !!user && authenticated,
    staleTime: 0, // Always consider stale to allow real-time updates
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 10000, // Auto-refetch every 10 seconds for real-time updates
    retry: 2,
    retryDelay: 1000,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => (id ? paymentsService.getTransaction(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
