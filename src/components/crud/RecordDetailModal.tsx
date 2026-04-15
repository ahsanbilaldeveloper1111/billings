"use client";

import type { ReactNode } from "react";
import { formatCellValue } from "@/lib/api/extractApiData";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";

function humanizeKey(key: string) {
  return key.replace(/_/g, " ");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function DetailBlock({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-zinc-400">—</span>;
  }
  if (typeof data !== "object") {
    return (
      <span className="text-zinc-800 tabular-nums dark:text-zinc-100">
        {formatCellValue(data)}
      </span>
    );
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-sm text-zinc-400">No items</span>;
    }
    return (
      <ul className="space-y-2">
        {data.map((item, i) => (
          <li
            key={i}
            className="rounded-lg bg-zinc-100/80 px-3 py-2.5 dark:bg-zinc-900/60"
          >
            <DetailBlock data={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  const o = data as Record<string, unknown>;
  const entries = Object.entries(o).filter(([k]) => !k.startsWith("_"));
  if (entries.length === 0) {
    return <span className="text-sm text-zinc-400">—</span>;
  }

  const primitives: [string, unknown][] = [];
  const nested: [string, unknown][] = [];
  for (const [key, value] of entries) {
    if (isPlainObject(value)) {
      nested.push([key, value]);
    } else {
      primitives.push([key, value]);
    }
  }

  const rowBase =
    "grid grid-cols-1 gap-1 border-b border-zinc-200/70 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(9rem,32%)_1fr] sm:items-start sm:gap-6 dark:border-zinc-800/80";

  return (
    <div className={depth === 0 ? "space-y-6" : "space-y-4"}>
      {primitives.length > 0 ? (
        <dl className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white/70 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/40">
          {primitives.map(([key, value]) => (
            <div key={key} className={rowBase}>
              <dt className="text-xs font-medium capitalize text-zinc-500 dark:text-zinc-400">
                {humanizeKey(key)}
              </dt>
              <dd className="min-w-0 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                {value !== null && typeof value === "object" ? (
                  <DetailBlock data={value} depth={depth + 1} />
                ) : (
                  formatCellValue(value)
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {nested.map(([key, value]) => (
        <section
          key={key}
          className="overflow-hidden rounded-xl border border-zinc-200/55 bg-gradient-to-b from-zinc-50/90 to-white dark:border-zinc-800/70 dark:from-zinc-900/35 dark:to-zinc-950/50"
        >
          <h3 className="border-b border-zinc-200/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {humanizeKey(key)}
          </h3>
          <div className="p-4 sm:p-5">
            <DetailBlock data={value} depth={depth + 1} />
          </div>
        </section>
      ))}
    </div>
  );
}

type RecordDetailModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  /** Unwrapped entity or full API payload — nested objects are rendered as cards. */
  data: unknown;
  onClose: () => void;
  /** When set, replaces the default key/value tree for `data` (same loading/error shell). */
  renderData?: (inner: unknown) => ReactNode;
  /** Rendered below the detail tree (e.g. invoice payment UI). */
  afterBody?: ReactNode;
};

export function RecordDetailModal({
  open,
  title,
  subtitle,
  loading,
  error,
  data,
  onClose,
  renderData,
  afterBody,
}: RecordDetailModalProps) {
  if (!open) return null;

  /** Match backend `success` variants (boolean, 1, "true") like `unwrapApiSuccessData`. */
  const inner =
    data == null || data === undefined
      ? null
      : (unwrapApiSuccessData<unknown>(data) ?? data);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crud-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,800px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200/70 bg-gradient-to-r from-emerald-50/90 to-teal-50/40 px-5 py-4 dark:border-zinc-800 dark:from-emerald-950/40 dark:to-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="crud-detail-title"
                className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                  style={{ width: `${100 - i * 8}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : inner == null ? (
            <p className="text-sm text-zinc-500">No data.</p>
          ) : (
            <>
              {renderData ? renderData(inner) : <DetailBlock data={inner} />}
              {afterBody}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
