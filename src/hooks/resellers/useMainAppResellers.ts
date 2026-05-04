"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthQueryEnabled } from "@/hooks/useAuthQueryEnabled";
import type { QueryParams } from "@/lib/api/http";
import { queryKeys } from "@/lib/queryKeys";
import { resellerService } from "@/services/resellers.service";

export function useMainAppResellers(
  fetchParams?: Record<string, unknown>,
  options?: { enabled?: boolean },
) {
  const auth = useAuthQueryEnabled();
  const merged = useMemo(() => {
    return { limit: 500, ...(fetchParams ?? {}) } as Record<string, unknown>;
  }, [fetchParams]);

  const enabled =
    auth && (options?.enabled === undefined ? true : options.enabled);

  return useQuery({
    queryKey: queryKeys.resellers.fromMainApp(merged),
    queryFn: () =>
      resellerService.listFromMainApp(merged as QueryParams),
    enabled,
    staleTime: 60_000,
  });
}
