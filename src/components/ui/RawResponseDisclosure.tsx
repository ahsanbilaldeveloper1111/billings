"use client";

import { useState } from "react";
import { SmoothCollapse } from "@/components/ui/SmoothCollapse";

type RawResponseDisclosureProps = {
  label: string;
  content: string;
  preClassName?: string;
};

/**
 * Expandable raw JSON/text block with smooth height animation (matches list tables & filters).
 */
export function RawResponseDisclosure({
  label,
  content,
  preClassName,
}: RawResponseDisclosureProps) {
  const [open, setOpen] = useState(false);
  const pre =
    preClassName ??
    "max-h-[min(40vh,320px)] overflow-auto border-t border-zinc-200/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:text-zinc-300";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/70 dark:border-zinc-800/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-900/50"
      >
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 transition-transform duration-300 ease-in-out dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 ${
            open ? "rotate-180" : ""
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
      </button>
      <SmoothCollapse open={open}>
        <pre className={pre}>{content}</pre>
      </SmoothCollapse>
    </div>
  );
}
