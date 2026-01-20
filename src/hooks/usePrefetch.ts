import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Hook for prefetching data on hover or other interactions
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(
    (queryKey: unknown[], queryFn: () => Promise<unknown>) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    },
    [queryClient]
  );

  return { prefetchQuery };
}
