"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import type { ApiPagination, ApiSuccessResponse } from "@/lib/api/types";
import { extractListRows } from "@/lib/api/extractApiData";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@/models/Product";

type ProductRow = Product & Record<string, unknown>;

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

function categoryLabel(p: ProductRow): string {
  const c = p.category;
  if (c == null) return "—";
  if (typeof c === "string") return c.trim() ? c : "—";
  if (typeof c === "object" && c !== null && "name" in c) {
    const n = (c as { name?: string }).name;
    return n?.trim() ? String(n) : "—";
  }
  return "—";
}

type ProductListTableProps = {
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
  /** Optional — e.g. open product-category CRUD. */
  onManageCategories?: () => void;
  showManageCategories?: boolean;
  onView: (product: ProductRow) => void;
  onEdit: (id: number | string) => void;
  onDelete: (id: number | string) => void;
};

export function ProductListTable({
  query,
  title = "Products",
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
  onManageCategories,
  showManageCategories,
  onView,
  onEdit,
  onDelete,
}: ProductListTableProps) {
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

  const { rows } = extractListRows<ProductRow>(query.data);
  const products = rows;
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
    {
      key: "name",
      header: sortHeader("name", "name"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100",
      render: (p: ProductRow) => p.name ?? "—",
    },
    {
      key: "base_price",
      header: sortHeader("base_price", "Base price"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2 text-right font-mono text-zinc-800 dark:text-zinc-200",
      render: (p: ProductRow) => {
        const cur = typeof p.currency === "string" && p.currency.trim() ? p.currency : "USD";
        return formatCurrency(p.base_price, cur);
      },
    },
    {
      key: "created_at",
      header: sortHeader("created_at", "created at"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (p: ProductRow) => (p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"),
    },
    {
      key: "sku",
      header: "SKU",
      cellClassName: "max-w-[10rem] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400",
      render: (p: ProductRow) => (p.sku?.trim() ? p.sku : "—"),
    },
    {
      key: "category",
      header: "Category",
      render: (p: ProductRow) => categoryLabel(p),
    },
    {
      key: "type",
      header: "Type",
      render: (p: ProductRow) => {
        const typeService =
          p.is_service === true ||
          String((p as Record<string, unknown>).is_service).toLowerCase() === "true" ||
          Number((p as Record<string, unknown>).is_service) === 1;
        return (
          <span
            className={
              typeService
                ? "rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
                : "rounded-md bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
            }
          >
            {typeService ? "Service" : "Product"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {showManageCategories && onManageCategories ? (
            <button
              type="button"
              onClick={onManageCategories}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Manage categories
            </button>
          ) : null}
          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Add product
            </button>
          ) : null}
        </div>
      </div>

      <UniversalDataTable
        title={title}
        rows={products}
        columns={columns}
        getRowKey={(p) => p.id}
        emptyMessage="No products match these filters."
        minTableWidthClassName="min-w-[44rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        renderActions={(p) => (
          <>
            {canView ? (
              <button type="button" onClick={() => onView(p)} className="shrink-0 rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/40">View</button>
            ) : null}
            {canUpdate ? (
              <button type="button" onClick={() => onEdit(p.id)} className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50">Edit</button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={() => onDelete(p.id)} className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/40">Delete</button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
