"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthQueryEnabled } from "@/hooks/useAuthQueryEnabled";
import { queryKeys } from "@/lib/queryKeys";
import { rankService } from "@/services/ranks.service";

export function useRankModuleList() {
  const enabled = useAuthQueryEnabled();
  return useQuery({
    queryKey: queryKeys.ranks.modules(),
    queryFn: () => rankService.moduleList(),
    enabled,
  });
}
