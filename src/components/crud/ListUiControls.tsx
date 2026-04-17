"use client";

import type { ReactNode } from "react";
import type { ApiPagination } from "@/lib/api/types";
import { SmoothCollapse } from "@/components/ui/SmoothCollapse";

export {
  formControlClass,
  formControlClass as filterControlClass,
  formControlFlex1Class,
  formControlFlex1DisabledClass,
  formControlGrowMinClass,
  formFieldSurfaceClass,
  formLabelClass,
  formLabelClass as filterLabelClass,
  formToggleRowClass,
  formToggleRowClass as filterToggleRowClass,
} from "@/lib/uiFormClasses";

type CollapsibleFilterPanelProps = {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CollapsibleFilterPanel({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: CollapsibleFilterPanelProps) {
  return (
    <div
      className={`mb-6 rounded-2xl border border-zinc-200/80 bg-white shadow-md shadow-zinc-900/[0.06] transition-shadow dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 ${
        open
          ? "relative z-20 ring-1 ring-teal-500/22 dark:ring-teal-400/25"
          : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors sm:px-5 ${
          open
            ? "bg-gradient-to-r from-teal-50/85 via-white to-cyan-50/40 dark:from-teal-950/30 dark:via-zinc-950 dark:to-cyan-950/18"
            : "bg-gradient-to-r from-zinc-50/90 to-white hover:from-zinc-50 dark:from-zinc-900/50 dark:to-zinc-950 dark:hover:from-zinc-900/70"
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
            open
              ? "border-teal-200/85 bg-teal-100/90 text-teal-900 dark:border-teal-800/55 dark:bg-teal-950/45 dark:text-teal-100"
              : "border-zinc-200/80 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs font-semibold text-teal-700 sm:inline dark:text-teal-300">
            {open ? "Hide filters" : "Show filters"}
          </span>
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition-transform duration-300 ease-in-out dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 ${
              open ? "rotate-180" : "rotate-0"
            }`}
            aria-hidden
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </span>
      </button>
      <SmoothCollapse open={open}>
        <div className="border-t border-zinc-200/70 bg-gradient-to-b from-zinc-50/50 to-white px-4 py-5 dark:border-zinc-800 dark:from-zinc-900/30 dark:to-zinc-950 sm:px-6">
          {children}
        </div>
      </SmoothCollapse>
    </div>
  );
}

type StaticFilterCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Always-expanded filter chrome (same family as {@link CollapsibleFilterPanel}). */
export function StaticFilterCard({
  title,
  subtitle,
  children,
}: StaticFilterCardProps) {
  return (
    <div className="relative z-20 mb-6 rounded-2xl border border-zinc-200/80 bg-white shadow-md shadow-zinc-900/[0.06] ring-1 ring-teal-500/14 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40 dark:ring-teal-400/18">
      <div className="flex items-center gap-4 border-b border-zinc-200/70 bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/35 px-4 py-3.5 dark:border-zinc-800 dark:from-teal-950/28 dark:via-zinc-950 dark:to-cyan-950/15 sm:px-5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-200/85 bg-teal-100/90 text-teal-900 shadow-sm dark:border-teal-800/55 dark:bg-teal-950/45 dark:text-teal-100"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="bg-gradient-to-b from-zinc-50/50 to-white px-4 py-5 dark:from-zinc-900/30 dark:to-zinc-950 sm:px-6">
        {children}
      </div>
    </div>
  );
}

type TableListHeaderControlsProps = {
  title: string;
  pagination?: ApiPagination;
  rowCount: number;
  limit: number;
  limitOptions: readonly number[];
  onLimitChange: (limit: number) => void;
};

export function TableListHeaderControls({
  title,
  pagination,
  rowCount,
  limit,
  limitOptions,
  onLimitChange,
}: TableListHeaderControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 bg-zinc-50/80 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
          {title}
        </span>
        {pagination ? (
          <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Page {pagination.page} of {pagination.last_page} · {pagination.total} total
          </span>
        ) : (
          <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            {rowCount} row{rowCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Rows per page
        <select
          className="rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs shadow-sm shadow-zinc-900/[0.05] outline-none transition hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-900/[0.08] focus-visible:ring-2 focus-visible:ring-teal-500/35 dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/25 dark:hover:border-zinc-500"
          value={limit}
          onChange={(ev) => onLimitChange(Number(ev.target.value))}
        >
          {limitOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

type TablePaginationControlsProps = {
  pagination?: ApiPagination;
  onPageChange: (page: number) => void;
};

const pagerSurfaceBtn =
  "rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm shadow-zinc-900/[0.07] outline-none transition-[box-shadow,border-color,transform,background-color] hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-md hover:shadow-zinc-900/10 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/35 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80 dark:hover:shadow-lg dark:hover:shadow-black/45 dark:focus-visible:ring-offset-zinc-950";

export function TablePaginationControls({
  pagination,
  onPageChange,
}: TablePaginationControlsProps) {
  if (!pagination || pagination.last_page <= 1) return null;
  const { page, last_page: lastPage, total, from, to } = pagination;
  const showing =
    typeof from === "number" &&
    typeof to === "number" &&
    typeof total === "number" ? (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Showing{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {from}-{to}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {total}
        </span>
      </p>
    ) : (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Page{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {page}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {lastPage}
        </span>
      </p>
    );

  const pageNumBase =
    "min-w-[2.25rem] rounded-lg px-2.5 py-2 text-sm outline-none transition-[box-shadow,border-color,transform,background-color] focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 active:scale-[0.98] dark:focus-visible:ring-offset-zinc-950";

  return (
    <div
      className="flex flex-col gap-3 border-t border-zinc-200/70 bg-gradient-to-b from-zinc-50/95 to-white px-4 py-3.5 dark:border-zinc-800 dark:from-zinc-900/55 dark:to-zinc-950/90 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
      role="navigation"
      aria-label="Table pagination"
    >
      <div className="min-w-0 shrink-0">{showing}</div>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className={pagerSurfaceBtn}
        >
          First
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={pagerSurfaceBtn}
        >
          Prev
        </button>
        {lastPage <= 12 ? (
          <div
            className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-zinc-200/60 bg-white/60 p-1 shadow-inner shadow-zinc-900/[0.04] dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:shadow-black/20"
            role="group"
            aria-label="Page numbers"
          >
            {Array.from({ length: lastPage }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={
                  pageNum === page
                    ? `${pageNumBase} bg-teal-600 font-semibold text-white shadow-md shadow-teal-900/25 ring-1 ring-teal-400/35 dark:bg-teal-600 dark:shadow-teal-950/45 dark:ring-teal-400/35`
                    : `${pageNumBase} border border-transparent font-medium text-zinc-800 hover:border-zinc-200/90 hover:bg-white hover:shadow-sm hover:shadow-zinc-900/[0.08] dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/90 dark:hover:shadow-black/30`
                }
              >
                {pageNum}
              </button>
            ))}
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/70 bg-white/80 px-2 py-1.5 text-sm text-zinc-600 shadow-sm shadow-zinc-900/[0.05] dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400 dark:shadow-black/25">
            Page
            <select
              className="rounded-md border border-zinc-200/90 bg-white px-2 py-1.5 text-sm shadow-sm shadow-zinc-900/[0.06] outline-none transition hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-teal-500/40 dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/30"
              value={page}
              onChange={(ev) => onPageChange(Number(ev.target.value))}
            >
              {Array.from({ length: lastPage }, (_, i) => i + 1).map(
                (pageNum) => (
                  <option key={pageNum} value={pageNum}>
                    {pageNum}
                  </option>
                ),
              )}
            </select>
            <span>/ {lastPage}</span>
          </label>
        )}
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className={pagerSurfaceBtn}
        >
          Next
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(lastPage)}
          className={pagerSurfaceBtn}
        >
          Last
        </button>
      </div>
    </div>
  );
}
