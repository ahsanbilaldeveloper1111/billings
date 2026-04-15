"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import type { ApiPagination, ApiSuccessResponse } from "@/lib/api/types";
import { extractListRows } from "@/lib/api/extractApiData";
import type { Currency } from "@/models/Currency";

function isBaseRow(c: Currency): boolean {
  return !!(c.is_base_currency ?? c.is_base);
}

type CurrencyListTableProps = {
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
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: (c: Currency) => void;
  onDelete: (c: Currency) => void;
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

export function CurrencyListTable({
  query,
  title = "Currencies",
  sortField,
  sortDir,
  onSort,
  pagination,
  onPageChange,
  limit,
  limitOptions,
  onLimitChange,
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: CurrencyListTableProps) {
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

  const { rows } = extractListRows<Currency & Record<string, unknown>>(
    query.data,
  );
  const currencies = rows as Currency[];
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
      key: "code",
      header: sortHeader("code", "code"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-100",
      render: (c: Currency) => c.code,
    },
    {
      key: "name",
      header: sortHeader("name", "name"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "max-w-[14rem] truncate px-3 py-2 text-zinc-700 dark:text-zinc-300",
      render: (c: Currency) => c.name,
    },
    {
      key: "exchange_rate",
      header: sortHeader("exchange_rate", "exchange rate"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200",
      render: (c: Currency) => Number(c.exchange_rate ?? 0).toFixed(6),
    },
    {
      key: "base",
      header: sortHeader("is_base_currency", "Base"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: Currency) =>
        isBaseRow(c) ? (
          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
            Base
          </span>
        ) : (
          "—"
        ),
    },
    { key: "symbol", header: "Symbol", render: (c: Currency) => c.symbol },
    {
      key: "status",
      header: "Status",
      render: (c: Currency) =>
        c.is_active ? (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
            Active
          </span>
        ) : (
          <span className="rounded-md bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-300">
            Inactive
          </span>
        ),
    },
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
            Create currency
          </button>
        ) : (
          <span />
        )}
      </div>

      <UniversalDataTable
        title={title}
        rows={currencies}
        columns={columns}
        getRowKey={(c) => c.id}
        emptyMessage="No currencies match these filters."
        minTableWidthClassName="min-w-[44rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        rawResponse={query.data ?? null}
        renderActions={(c) => (
          <>
            {canUpdate ? (
              <button
                type="button"
                onClick={() => onEdit(c)}
                className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50"
              >
                Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                disabled={isBaseRow(c)}
                title={isBaseRow(c) ? "Base currency cannot be deleted" : undefined}
                onClick={() => onDelete(c)}
                className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/40"
              >
                Delete
              </button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
