"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import type { ApiPagination, ApiSuccessResponse } from "@/lib/api/types";
import { extractListRows } from "@/lib/api/extractApiData";
import type { Vendor } from "@/models/Vendor";

type VendorRow = Vendor &
  Record<string, unknown> & {
    companies_count?: number;
    created_at?: string;
    updated_at?: string;
  };

type VendorListTableProps = {
  query: UseQueryResult<ApiSuccessResponse<unknown>>;
  title?: string;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  pagination: ApiPagination | undefined;
  onPageChange: (page: number) => void;
  limit: number;
  limitOptions: readonly number[];
  onLimitChange: (limit: number) => void;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onView: (id: number | string) => void;
  onEdit: (id: number | string) => void;
  onDelete: (id: number | string) => void;
};

function SortChevron({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc";
}) {
  if (!active) {
    return (
      <span className="ml-1 text-zinc-400 opacity-60" aria-hidden>
        ↕
      </span>
    );
  }
  return (
    <span className="ml-1 text-zinc-700 dark:text-zinc-200" aria-hidden>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function VendorListTable({
  query,
  title = "Vendors",
  sortField,
  sortDir,
  onSort,
  pagination,
  onPageChange,
  limit,
  limitOptions,
  onLimitChange,
  canView,
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: VendorListTableProps) {
  if (query.isPending) {
    return (
      <div className="space-y-3 rounded-2xl border border-zinc-200/60 bg-white/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/40">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-md bg-gradient-to-r from-zinc-100 via-zinc-200/80 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700/50 dark:to-zinc-800"
            style={{ width: `${100 - i * 12}%` }}
          />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div
        className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 to-white p-5 text-sm text-rose-900 shadow-sm dark:border-rose-900/50 dark:from-rose-950/40 dark:to-zinc-950 dark:text-rose-100"
        role="alert"
      >
        <p className="font-semibold">Request failed</p>
        <p className="mt-2 font-mono text-xs opacity-90">{String(query.error)}</p>
      </div>
    );
  }

  const { rows } = extractListRows<VendorRow>(query.data);
  const vendors = rows;
  const sortHeader = (col: string, label?: string) => (
    <button
      type="button"
      className="inline-flex items-center font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
      onClick={() => onSort(col)}
    >
      {label ?? col.replace(/_/g, " ")}
      <SortChevron active={sortField === col} dir={sortDir} />
    </button>
  );
  const columns = [
    { key: "name", header: sortHeader("name", "name"), headerClassName: "whitespace-nowrap px-3 py-2", render: (v: VendorRow) => v.name ?? "—", cellClassName: "px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100" },
    { key: "email", header: sortHeader("email", "email"), headerClassName: "whitespace-nowrap px-3 py-2", cellClassName: "max-w-[12rem] truncate px-3 py-2 text-zinc-700 dark:text-zinc-300", render: (v: VendorRow) => v.email ?? "—" },
    { key: "phone", header: sortHeader("phone", "phone"), headerClassName: "whitespace-nowrap px-3 py-2", render: (v: VendorRow) => v.phone ?? "—" },
    { key: "created_at", header: sortHeader("created_at", "created at"), headerClassName: "whitespace-nowrap px-3 py-2", render: (v: VendorRow) => (v.created_at ? new Date(v.created_at).toLocaleDateString() : "—") },
    { key: "updated_at", header: sortHeader("updated_at", "updated at"), headerClassName: "whitespace-nowrap px-3 py-2", render: (v: VendorRow) => (v.updated_at ? new Date(v.updated_at).toLocaleDateString() : "—") },
    { key: "status", header: "Status", render: (v: VendorRow) => (v.status != null ? String(v.status) : "—"), cellClassName: "px-3 py-2 capitalize text-zinc-700 dark:text-zinc-300" },
    { key: "tenants", header: "Tenants", render: (v: VendorRow) => v.companies_count ?? 0, cellClassName: "px-3 py-2 text-right font-mono text-zinc-800 dark:text-zinc-200" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            Create vendor
          </button>
        ) : (
          <span />
        )}
      </div>

      <UniversalDataTable
        title={title}
        rows={vendors}
        columns={columns}
        getRowKey={(v) => v.id}
        emptyMessage="No vendors match these filters."
        minTableWidthClassName="min-w-[44rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        rawResponse={query.data ?? null}
        renderActions={(v) => (
          <>
            {canView ? (
              <button type="button" onClick={() => onView(v.id)} className="shrink-0 rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/40">View</button>
            ) : null}
            {canUpdate ? (
              <button type="button" onClick={() => onEdit(v.id)} className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50">Edit</button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={() => onDelete(v.id)} className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/40">Delete</button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
