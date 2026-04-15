"use client";

import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { RecordDetailModal } from "@/components/crud/RecordDetailModal";
import { RawResponseDisclosure } from "@/components/ui/RawResponseDisclosure";
import type { ApiSuccessResponse } from "@/lib/api/types";
import {
  extractListRows,
  formatCellValue,
} from "@/lib/api/extractApiData";

const MAX_COLUMNS = 10;

export function ModelListBody({
  query,
  emptyMessage = "No records returned.",
  title = "Records",
  viewable = false,
  detailModalTitle = "Record detail",
  detailModalSubtitle,
}: {
  query: UseQueryResult<ApiSuccessResponse<unknown>>;
  emptyMessage?: string;
  /** Table caption / section label */
  title?: string;
  /** Adds a View action that opens a card-style modal with the full row payload (no extra API call). */
  viewable?: boolean;
  detailModalTitle?: string;
  detailModalSubtitle?: string;
}) {
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(
    null,
  );
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
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        <RawResponseDisclosure
          label="Raw response"
          content={typeof rawJson === "string" ? rawJson : String(rawJson)}
          preClassName="max-h-64 overflow-auto border-t border-zinc-200/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
        />
      </div>
    );
  }

  const first = rows[0] as Record<string, unknown>;
  const columns = Object.keys(first)
    .filter((k) => !k.startsWith("_"))
    .slice(0, MAX_COLUMNS);

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40">
          <div className="border-b border-zinc-200/60 bg-zinc-50/80 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {title}
            </span>
            {pagination ? (
              <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                Page {pagination.page} of {pagination.last_page} ·{" "}
                {pagination.total} total
              </span>
            ) : (
              <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {rows.length} row{rows.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-zinc-300 bg-zinc-50/50 dark:border-zinc-600 dark:bg-zinc-900/30">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200"
                    >
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                  {viewable ? (
                    <th className="min-w-[4.5rem] whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const r = row as Record<string, unknown>;
                  const rowKey =
                    typeof r.id === "number" || typeof r.id === "string"
                      ? String(r.id)
                      : `row-${ri}`;
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-zinc-200 odd:bg-white/40 even:bg-zinc-50/30 dark:border-zinc-700 dark:odd:bg-transparent dark:even:bg-zinc-900/20"
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="max-w-[14rem] truncate px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200"
                          title={formatCellValue(r[col])}
                        >
                          {formatCellValue(r[col])}
                        </td>
                      ))}
                      {viewable ? (
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setDetailRow(r)}
                            className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          >
                            View
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <RawResponseDisclosure
          label="Raw API response"
          content={typeof rawJson === "string" ? rawJson : String(rawJson)}
        />
      </div>

      {viewable ? (
        <RecordDetailModal
          open={detailRow != null}
          title={detailModalTitle}
          subtitle={detailModalSubtitle}
          data={
            detailRow != null
              ? { success: true as const, data: detailRow }
              : null
          }
          onClose={() => setDetailRow(null)}
        />
      ) : null}
    </>
  );
}
