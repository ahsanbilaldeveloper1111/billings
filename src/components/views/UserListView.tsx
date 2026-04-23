"use client";

import { useMemo, useState } from "react";
import { CrudEntityTable } from "@/components/crud/CrudEntityTable";
import { StaticFilterCard } from "@/components/crud/ListUiControls";
import { stripLeadingZerosDigitOnly } from "@/lib/forms/stripNumericLeadingZeros";
import {
  formControlClass,
  formLabelClass,
  formToggleRowClass,
} from "@/lib/uiFormClasses";
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
      <StaticFilterCard
        title="User list filters"
        subtitle="Parameters for GET /users."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[12rem] flex-1">
            <label className={formLabelClass}>
              Search
            </label>
            <input
              type="search"
              className={formControlClass}
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
            />
          </div>
          <div className="min-w-[8rem]">
            <label className={formLabelClass}>
              Company ID
            </label>
            <input
              inputMode="numeric"
              className={formControlClass}
              value={companyId}
              onChange={(ev) =>
                setCompanyId(stripLeadingZerosDigitOnly(ev.target.value))
              }
              placeholder="Optional"
            />
          </div>
          <label className={formToggleRowClass}>
            <input
              type="checkbox"
              checked={loadRanks}
              onChange={(ev) => setLoadRanks(ev.target.checked)}
            />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Load ranks
            </span>
          </label>
        </div>
      </StaticFilterCard>

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
