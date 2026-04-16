"use client";

import type { ReactNode } from "react";
import { formatCellValue } from "@/lib/api/extractApiData";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import {
  modalBackdropClass,
  modalBodyClass,
  modalCloseButtonClass,
  modalHeaderClass,
  modalHeaderGlowClass,
  modalPanelBaseClass,
  modalSubtitleClass,
  modalTitleClass,
} from "@/lib/uiModalClasses";

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
            className="rounded-xl border border-zinc-200/50 bg-white/90 px-3 py-2.5 shadow-sm shadow-zinc-900/[0.04] dark:border-zinc-700/60 dark:bg-zinc-900/50 dark:shadow-black/20"
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
    "grid grid-cols-1 gap-1 border-b border-zinc-200/60 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(9rem,32%)_1fr] sm:items-start sm:gap-6 dark:border-zinc-800/70";

  return (
    <div className={depth === 0 ? "space-y-6" : "space-y-4"}>
      {primitives.length > 0 ? (
        <dl className="overflow-hidden rounded-xl border border-zinc-200/55 bg-white shadow-[0_8px_32px_-14px_rgba(15,23,42,0.08)] ring-1 ring-teal-900/[0.04] dark:border-zinc-800/65 dark:bg-zinc-950/50 dark:shadow-[0_8px_36px_-14px_rgba(0,0,0,0.4)] dark:ring-white/[0.04]">
          {primitives.map(([key, value]) => (
            <div key={key} className={rowBase}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
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
          className="overflow-hidden rounded-xl border border-zinc-200/50 bg-gradient-to-b from-teal-50/30 via-zinc-50/50 to-white shadow-sm shadow-zinc-900/[0.05] ring-1 ring-teal-900/[0.03] dark:border-zinc-800/65 dark:from-teal-950/20 dark:via-zinc-900/40 dark:to-zinc-950/60 dark:shadow-black/25 dark:ring-white/[0.04]"
        >
          <h3 className="border-b border-zinc-200/55 bg-white/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-950/30 dark:text-zinc-400">
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
        className={modalBackdropClass}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative z-10 max-h-[min(90vh,800px)] w-full max-w-4xl ${modalPanelBaseClass}`}
      >
        <div className={modalHeaderClass}>
          <div className={modalHeaderGlowClass} aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span
                className="mt-0.5 hidden h-12 w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-500 to-cyan-600 shadow-sm shadow-teal-500/30 sm:block dark:shadow-teal-400/20"
                aria-hidden
              />
              <div className="min-w-0">
                <h2 id="crud-detail-title" className={modalTitleClass}>
                  {title}
                </h2>
                {subtitle ? (
                  <p className={modalSubtitleClass}>{subtitle}</p>
                ) : null}
              </div>
            </div>
            <button type="button" onClick={onClose} className={modalCloseButtonClass}>
              Close
            </button>
          </div>
        </div>
        <div className={modalBodyClass}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-gradient-to-r from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-zinc-800"
                  style={{ width: `${100 - i * 8}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200">
              {error}
            </p>
          ) : inner == null ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>
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
