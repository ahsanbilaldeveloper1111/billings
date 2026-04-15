"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { RankCreateData, RankUpdateData } from "@/models/Rank";
import { rankService } from "@/services/ranks.service";

export function useRankMutations() {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: queryKeys.ranks.all });

  const create = useMutation({
    mutationFn: (body: RankCreateData) => rankService.create(body),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number | string;
      body: RankUpdateData;
    }) => rankService.update(id, body),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number | string) => rankService.destroy(id),
    onSuccess: invalidate,
  });

  const assignPermissions = useMutation({
    mutationFn: ({
      rankId,
      permissionIds,
    }: {
      rankId: number | string;
      permissionIds: number[];
    }) =>
      rankService.updatePermissions(rankId, { permissions: permissionIds }),
    onSuccess: invalidate,
  });

  return { create, update, remove, assignPermissions };
}
