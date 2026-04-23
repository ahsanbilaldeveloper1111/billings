"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import type { ApiPagination, ApiSuccessResponse } from "@/lib/api/types";
import { extractListRows } from "@/lib/api/extractApiData";
import type { ProductCategory } from "@/models/ProductCategory";

type Row = ProductCategory & Record<string, unknown>;

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

function formatCreated(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parentLabel(c: Row): string {
  const p = c.parent;
  if (p && typeof p === "object" && typeof p.name === "string" && p.name.trim()) {
    return p.name;
  }
  return "Root category";
}

/** Shared with {@link ProductCategoryManagementModal} for the company / tenant column. */
export function ProductCategoryCompanyCell(
  c: ProductCategory & Record<string, unknown>,
  tenantNameMap: Readonly<Record<string, string>>,
) {
  const tid =
    c.tenant_id != null && String(c.tenant_id).trim() !== ""
      ? String(c.tenant_id).trim()
      : "";
  if (!tid) {
    return (
      <span className="text-zinc-500 dark:text-zinc-400">
        Global (no company)
      </span>
    );
  }
  const label = tenantNameMap[tid]?.trim() ?? "";
  const primary = label && label !== tid ? label : tid;
  return (
    <div>
      <p className="text-zinc-900 dark:text-zinc-100">{primary}</p>
      {label && label !== tid ? (
        <p className="break-all font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
          {tid}
        </p>
      ) : null}
    </div>
  );
}

type ProductCategoryListTableProps = {
  query: UseQueryResult<ApiSuccessResponse<unknown>>;
  /** `tenant_id` → display name (company list + main-app reseller map merged). */
  tenantNameMap?: Readonly<Record<string, string>>;
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

export function ProductCategoryListTable({
  query,
  tenantNameMap = {},
  title = "Product categories",
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
}: ProductCategoryListTableProps) {
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

  const { rows } = extractListRows<Row>(query.data);
  const categories = rows;
  const sortHeader = (col: string, label?: string) => (
    <button
      type="button"
      className="inline-flex items-center font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
      onClick={() => onSort(col)}
    >
      {label ?? col}
      <SortChevron active={sortField === col} dir={sortDir} />
    </button>
  );
  const columns = [
    {
      key: "name",
      header: sortHeader("name", "name"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100",
      render: (c: Row) =>
        canView ? (
          <button
            type="button"
            onClick={() => onView(c.id)}
            className="text-left text-sky-700 underline decoration-sky-400/60 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
          >
            {c.name ?? "—"}
          </button>
        ) : (
          <span>{c.name ?? "—"}</span>
        ),
    },
    {
      key: "created_at",
      header: sortHeader("created_at", "Created"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: Row) => formatCreated(c.created_at),
    },
    {
      key: "description",
      header: "Description",
      cellClassName: "max-w-[14rem] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400",
      render: (c: Row) =>
        c.description?.trim() ? String(c.description) : <span className="text-zinc-400">No description</span>,
    },
    {
      key: "company",
      header: "Company",
      cellClassName: "max-w-[12rem] px-3 py-2",
      render: (c: Row) => ProductCategoryCompanyCell(c, tenantNameMap),
    },
    { key: "parent", header: "Parent", render: (c: Row) => parentLabel(c) },
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
            Add category
          </button>
        ) : (
          <span />
        )}
      </div>

      <UniversalDataTable
        title={title}
        rows={categories}
        columns={columns}
        getRowKey={(c) => c.id}
        emptyMessage="No categories match these filters."
        minTableWidthClassName="min-w-[52rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        renderActions={(c) => (
          <>
            {canUpdate ? (
              <button type="button" onClick={() => onEdit(c.id)} className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50">Edit</button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={() => onDelete(c.id)} className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/40">Delete</button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
