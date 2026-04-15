"use client";

import { useState } from "react";
import type { AuditLogChange } from "@/models/AuditLog";
import { SmoothCollapse } from "@/components/ui/SmoothCollapse";
import {
  auditActionBadgeClass,
  auditResourceBadgeClass,
  auditSnapshotSummary,
  formatAuditLogWhen,
  shortBrowserLabel,
} from "@/lib/auditLogPresentation";

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  const text =
    value == null
      ? "—"
      : typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-950/[0.03] dark:border-zinc-800 dark:bg-zinc-900/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
            {open ? "Hide" : "Show"}
          </span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 transition-transform duration-300 ease-in-out dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 ${
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
        </span>
      </button>
      <SmoothCollapse open={open}>
        <pre className="max-h-[min(50vh,360px)] overflow-auto border-t border-zinc-200/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
          {text}
        </pre>
      </SmoothCollapse>
    </section>
  );
}

function ChangesList({ items }: { items: AuditLogChange[] }) {
  if (items.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/40">
      <h3 className="border-b border-zinc-200/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        Field changes
      </h3>
      <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
        {items.map((ch, i) => (
          <li key={`${ch.field}-${i}`} className="px-4 py-3 text-sm">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {ch.field.replace(/_/g, " ")}
              <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                ({ch.type})
              </span>
            </p>
            {ch.old != null && ch.old !== "" ? (
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                <span className="font-semibold">From:</span> {ch.old}
              </p>
            ) : null}
            {ch.new != null && ch.new !== "" ? (
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">To:</span> {ch.new}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AuditLogDetailContent({ row }: { row: Record<string, unknown> }) {
  const action = String(row.action ?? "—");
  const resource = String(row.resource_type ?? "—");
  const userLabel =
    typeof row.user_name === "string" && row.user_name.trim()
      ? row.user_name
      : typeof row.user_id === "number" || typeof row.user_id === "string"
        ? `User #${row.user_id}`
        : "—";
  const ip = typeof row.ip_address === "string" ? row.ip_address : "—";
  const ua = typeof row.user_agent === "string" ? row.user_agent : "";
  const created = formatAuditLogWhen(row.created_at);
  const summary =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : typeof row.formatted_action === "string"
        ? row.formatted_action
        : null;

  const rawSummary = row.changes_summary;
  const changes: AuditLogChange[] = Array.isArray(rawSummary)
    ? (rawSummary as AuditLogChange[])
    : [];

  const kvRow =
    "grid grid-cols-1 gap-1 border-b border-zinc-200/70 px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(8rem,28%)_1fr] sm:items-center dark:border-zinc-800";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={auditActionBadgeClass(action)}>{action}</span>
        <span className={auditResourceBadgeClass()} title={resource}>
          {resource.replace(/_/g, " ")}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{created}</span>
      </div>

      {summary ? (
        <p className="rounded-xl border border-zinc-200/60 bg-emerald-50/40 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-emerald-950/20 dark:text-zinc-200">
          {summary}
        </p>
      ) : null}

      <dl className="overflow-hidden rounded-xl border border-zinc-200/60 bg-white/70 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-950/40">
        <div className={kvRow}>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Actor
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">{userLabel}</dd>
        </div>
        <div className={kvRow}>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            IP address
          </dt>
          <dd className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{ip}</dd>
        </div>
        <div className={kvRow}>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Client (summary)
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">
            {shortBrowserLabel(ua)}
          </dd>
        </div>
        <div className={kvRow}>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Before / after
          </dt>
          <dd className="text-sm text-zinc-600 dark:text-zinc-300">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {auditSnapshotSummary(row.old_values)}
            </span>
            {" → "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {auditSnapshotSummary(row.new_values)}
            </span>
          </dd>
        </div>
      </dl>

      {changes.length > 0 ? <ChangesList items={changes} /> : null}

      <div className="grid gap-3 sm:grid-cols-1">
        <JsonPanel title="Previous values (JSON)" value={row.old_values} />
        <JsonPanel title="New values (JSON)" value={row.new_values} />
      </div>

      {ua ? <JsonPanel title="Full user agent" value={ua} /> : null}
    </div>
  );
}
