"use client";

import { useMemo, useState } from "react";
import { CrudEntityTable } from "@/components/crud/CrudEntityTable";
import { RecordDetailModal } from "@/components/crud/RecordDetailModal";
import { useUser } from "@/hooks/users/useUser";
import { useUsers } from "@/hooks/users/useUsers";

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Users directory with list filters (GET /users) and View → GET /users/{id}.
 */
export function UserListView() {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loadRanks, setLoadRanks] = useState(false);

  const filterKey = useMemo(
    () => [search, companyId, loadRanks].join("\0"),
    [search, companyId, loadRanks],
  );
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const listParams = useMemo(() => {
    const cid = parseInt(companyId.trim(), 10);
    return {
      page,
      limit,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(Number.isFinite(cid) ? { company_id: cid } : {}),
      ...(loadRanks ? { load_ranks: true } : {}),
    };
  }, [page, search, companyId, limit, loadRanks]);

  const listQuery = useUsers(listParams);
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const detailQuery = useUser(detailId);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Search
          </label>
          <input
            type="search"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
          />
        </div>
        <div className="min-w-[8rem]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Company ID
          </label>
          <input
            inputMode="numeric"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={companyId}
            onChange={(ev) => setCompanyId(ev.target.value)}
            placeholder="Optional"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <input
            type="checkbox"
            checked={loadRanks}
            onChange={(ev) => setLoadRanks(ev.target.checked)}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Load ranks
          </span>
        </label>
      </div>

      <CrudEntityTable
        query={listQuery}
        title="Users"
        onView={(id) => setDetailId(id)}
        onPageChange={(next) => setPage(next)}
        limit={limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <RecordDetailModal
        open={detailId != null}
        title="User"
        subtitle="User profile and access info from GET /users/{id}."
        data={detailQuery.data ?? null}
        loading={detailQuery.isPending && detailId != null}
        error={detailQuery.isError ? String(detailQuery.error) : null}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
