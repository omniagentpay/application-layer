import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '@/services/payments';
import type { Transaction } from '@/types';

export function useTransactions(filters?: {
  walletId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => paymentsService.getTransactions(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes - transactions don't change often
    gcTime: 1000 * 60 * 10, // 10 minutes cache
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
