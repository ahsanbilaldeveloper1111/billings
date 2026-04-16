"use client";

import type { ReactNode } from "react";
import type { ApiPagination } from "@/lib/api/types";
import {
  TableListHeaderControls,
  TablePaginationControls,
} from "@/components/crud/ListUiControls";
import { RawResponseDisclosure } from "@/components/ui/RawResponseDisclosure";

export type UniversalDataTableColumn<T> = {
  key: string;
  header: ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => ReactNode;
};

type UniversalDataTableProps<T> = {
  title: string;
  rows: T[];
  columns: readonly UniversalDataTableColumn<T>[];
  getRowKey: (row: T, index: number) => string | number;
  emptyMessage: string;
  minTableWidthClassName?: string;
  pagination?: ApiPagination;
  onPageChange?: (page: number) => void;
  limit?: number;
  limitOptions?: readonly number[];
  onLimitChange?: (limit: number) => void;
  renderActions?: (row: T, index: number) => ReactNode;
  actionsHeader?: ReactNode;
  actionsColumnClassName?: string;
  rawResponse?: unknown;
};

export function UniversalDataTable<T>({
  title,
  rows,
  columns,
  getRowKey,
  emptyMessage,
  minTableWidthClassName = "min-w-[44rem]",
  pagination,
  onPageChange,
  limit,
  limitOptions,
  onLimitChange,
  renderActions,
  actionsHeader = "Actions",
  actionsColumnClassName = "min-w-[10rem] whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-200",
  rawResponse,
}: UniversalDataTableProps<T>) {
  const hasActions = typeof renderActions === "function";
  const totalCols = columns.length + (hasActions ? 1 : 0);
  const canShowLimit =
    limit != null &&
    limitOptions != null &&
    limitOptions.length > 0 &&
    typeof onLimitChange === "function";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-md shadow-zinc-900/[0.06] ring-1 ring-zinc-900/[0.03] dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:shadow-black/45 dark:ring-white/[0.04]">
        {canShowLimit ? (
          <TableListHeaderControls
            title={title}
            pagination={pagination}
            rowCount={rows.length}
            limit={limit}
            limitOptions={limitOptions}
            onLimitChange={onLimitChange}
          />
        ) : (
          <div className="border-b border-zinc-200/60 bg-zinc-50/80 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {title}
            </span>
            {pagination ? (
              <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                Page {pagination.page} of {pagination.last_page} · {pagination.total} total
              </span>
            ) : (
              <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {rows.length} row{rows.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse text-left text-xs ${minTableWidthClassName}`}>
            <thead>
              <tr className="border-b-2 border-zinc-300 bg-zinc-50/50 dark:border-zinc-600 dark:bg-zinc-900/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={
                      col.headerClassName ??
                      "whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200"
                    }
                  >
                    {col.header}
                  </th>
                ))}
                {hasActions ? (
                  <th className={actionsColumnClassName}>{actionsHeader}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    className="px-3 py-8 text-center text-sm text-zinc-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={getRowKey(row, index)}
                    className="border-b border-zinc-200 odd:bg-white/40 even:bg-zinc-50/30 dark:border-zinc-700 dark:odd:bg-transparent dark:even:bg-zinc-900/20"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={
                          col.cellClassName ?? "px-3 py-2 text-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {hasActions ? (
                      <td className="min-w-[10rem] whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          {renderActions?.(row, index)}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && onPageChange ? (
          <TablePaginationControls
            pagination={pagination}
            onPageChange={onPageChange}
          />
        ) : null}
      </div>

      {rawResponse !== undefined ? (
        <RawResponseDisclosure
          label="Raw API response"
          content={
            rawResponse === null
              ? "—"
              : typeof rawResponse === "string"
                ? rawResponse
                : JSON.stringify(rawResponse, null, 2)
          }
        />
      ) : null}
    </div>
  );
}
