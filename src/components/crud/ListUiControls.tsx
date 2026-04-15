"use client";

import type { ReactNode } from "react";
import type { ApiPagination } from "@/lib/api/types";
import { SmoothCollapse } from "@/components/ui/SmoothCollapse";

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
    <div className="mb-4 rounded-2xl border border-zinc-200/80 bg-white/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2 text-left transition-colors hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:bg-zinc-900/80"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          {subtitle ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 transition-colors dark:text-zinc-300">
            {open ? "Hide" : "Show"}
          </span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 transition-transform duration-300 ease-in-out dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 ${
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
        <div className="pt-3">{children}</div>
      </SmoothCollapse>
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
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
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

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800/80 dark:bg-zinc-900/30 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0 shrink-0">{showing}</div>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          First
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Prev
        </button>
        {lastPage <= 12 ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {Array.from({ length: lastPage }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={
                  pageNum === page
                    ? "min-w-[2.25rem] rounded-lg bg-emerald-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm"
                    : "min-w-[2.25rem] rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                }
              >
                {pageNum}
              </button>
            ))}
          </div>
        ) : (
          <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            Page
            <select
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Next
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(lastPage)}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Last
        </button>
      </div>
    </div>
  );
}
