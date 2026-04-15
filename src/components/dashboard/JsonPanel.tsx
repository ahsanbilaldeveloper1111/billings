"use client";

import { useState } from "react";
import { SmoothCollapse } from "@/components/ui/SmoothCollapse";

type JsonPanelProps = {
  title: string;
  subtitle?: string;
  data: unknown;
  defaultOpen?: boolean;
};

export function JsonPanel({
  title,
  subtitle,
  data,
  defaultOpen = false,
}: JsonPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const text =
    data === undefined || data === null
      ? String(data)
      : JSON.stringify(data, null, 2);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/90 shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:ring-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-900/50"
      >
        <div className="min-w-0">
          <h3 className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-[11px] font-medium text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-sm text-zinc-500 transition-transform duration-300 ease-in-out dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <SmoothCollapse open={open}>
        <pre className="max-h-80 overflow-auto border-t border-zinc-100 bg-zinc-50/90 p-4 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-black/30 dark:text-zinc-300">
          {text}
        </pre>
      </SmoothCollapse>
    </div>
  );
}
