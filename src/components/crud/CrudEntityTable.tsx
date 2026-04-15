"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import { RawResponseDisclosure } from "@/components/ui/RawResponseDisclosure";
import type { ApiSuccessResponse } from "@/lib/api/types";
import {
  extractListRows,
  formatCellValue,
} from "@/lib/api/extractApiData";

const MAX_COLUMNS = 8;

type CrudEntityTableProps = {
  query: UseQueryResult<ApiSuccessResponse<unknown>>;
  title: string;
  emptyMessage?: string;
  idKey?: string;
  onCreate?: () => void;
  createLabel?: string;
  onView?: (id: string | number) => void;
  onEdit?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  /** When set with API `pagination`, `UniversalDataTable` shows page controls and calls this on change. */
  onPageChange?: (page: number) => void;
  /** Per-page selector in the table header (use with `onLimitChange`). */
  limit?: number;
  limitOptions?: readonly number[];
  onLimitChange?: (limit: number) => void;
};

export function CrudEntityTable({
  query,
  title,
  emptyMessage = "No records returned.",
  idKey = "id",
  onCreate,
  createLabel = "Add new",
  onView,
  onEdit,
  onDelete,
  onPageChange,
  limit,
  limitOptions,
  onLimitChange,
}: CrudEntityTableProps) {
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

  const { rows, pagination } = extractListRows(query.data);
  const rawJson =
    query.data === undefined || query.data === null
      ? emptyMessage
      : JSON.stringify(query.data, null, 2);

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              {createLabel}
            </button>
          ) : null}
        </div>
        <RawResponseDisclosure
          label="Raw response"
          content={typeof rawJson === "string" ? rawJson : String(rawJson)}
          preClassName="max-h-64 overflow-auto border-t border-zinc-200/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
        />
      </div>
    );
  }

  const first = rows[0] as Record<string, unknown>;
  const visibleColumnKeys = Object.keys(first)
    .filter((k) => !k.startsWith("_"))
    .slice(0, MAX_COLUMNS);

  const hasCrud = onView || onEdit || onDelete;
  const columns = columnsFromRows(visibleColumnKeys);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            {createLabel}
          </button>
        ) : (
          <span />
        )}
      </div>
      <UniversalDataTable
        title={title}
        rows={rows as Record<string, unknown>[]}
        columns={columns}
        getRowKey={(_, i) => i}
        emptyMessage={emptyMessage}
        minTableWidthClassName="min-w-[36rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        rawResponse={rawJson}
        renderActions={
          hasCrud
            ? (row) => {
                const rid = row[idKey];
                const id =
                  typeof rid === "number" || typeof rid === "string" ? rid : null;
                if (id == null) return null;
                return (
                  <>
                    {onView ? (
                      <button type="button" onClick={() => onView(id)} className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">View</button>
                    ) : null}
                    {onEdit ? (
                      <button type="button" onClick={() => onEdit(id)} className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/50">Edit</button>
                    ) : null}
                    {onDelete ? (
                      <button type="button" onClick={() => onDelete(id)} className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/40">Delete</button>
                    ) : null}
                  </>
                );
              }
            : undefined
        }
      />
    </div>
  );
}

function columnsFromRows(cols: string[]) {
  return cols.map((col) => ({
    key: col,
    header: col.replace(/_/g, " "),
    cellClassName:
      "max-w-[14rem] truncate px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200",
    render: (row: Record<string, unknown>) => (
      <span title={formatCellValue(row[col])}>{formatCellValue(row[col])}</span>
    ),
  }));
}
