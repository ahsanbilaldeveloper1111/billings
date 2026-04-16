/** Table and summary helpers for audit log rows (no heavy JSON in cells). */

export function countAuditSnapshotKeys(value: unknown): number {
  if (value == null) return 0;
  if (typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.length;
  return Object.keys(value as Record<string, unknown>).filter(
    (k) => !k.startsWith("_"),
  ).length;
}

export function auditSnapshotSummary(value: unknown): string {
  const n = countAuditSnapshotKeys(value);
  if (value == null || value === undefined) return "—";
  if (typeof value !== "object") return "Scalar";
  if (n === 0) return "Empty";
  return `${n} field${n === 1 ? "" : "s"}`;
}

export function shortBrowserLabel(userAgent: unknown): string {
  const s = typeof userAgent === "string" ? userAgent.trim() : "";
  if (!s) return "—";
  if (/Edg\//i.test(s)) return "Edge";
  if (/OPR\//i.test(s) || /Opera/i.test(s)) return "Opera";
  if (/Firefox\//i.test(s)) return "Firefox";
  if (/Chrome\//i.test(s)) return "Chrome";
  if (/Safari\//i.test(s)) return "Safari";
  return s.length > 40 ? `${s.slice(0, 38)}…` : s;
}

export function auditActionBadgeClass(action: string): string {
  const a = action.toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";
  if (a === "create" || a === "created")
    return `${base} bg-teal-600 text-white shadow-sm shadow-teal-900/20`;
  if (a === "update" || a === "updated")
    return `${base} bg-sky-600 text-white shadow-sm`;
  if (a === "delete" || a === "deleted" || a === "destroy")
    return `${base} bg-rose-600 text-white shadow-sm`;
  return `${base} bg-zinc-500 text-white dark:bg-zinc-600`;
}

export function auditResourceBadgeClass(): string {
  return "inline-flex max-w-[10rem] truncate rounded-md border border-teal-200/80 bg-teal-50/90 px-2 py-0.5 text-[11px] font-medium capitalize text-teal-900 shadow-sm shadow-teal-900/[0.06] dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100 dark:shadow-black/20";
}

export function formatAuditLogWhen(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function auditRowSummaryLine(row: Record<string, unknown>): string {
  const msg =
    typeof row.message === "string" && row.message.trim()
      ? row.message.trim()
      : null;
  if (msg && msg !== "-") return msg.length > 80 ? `${msg.slice(0, 78)}…` : msg;
  const desc =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : null;
  if (desc) return desc.length > 80 ? `${desc.slice(0, 78)}…` : desc;
  const fa =
    typeof row.formatted_action === "string" && row.formatted_action.trim()
      ? row.formatted_action.trim()
      : null;
  if (fa) return fa;
  const frt =
    typeof row.formatted_resource_type === "string" &&
    row.formatted_resource_type.trim()
      ? row.formatted_resource_type.trim()
      : null;
  if (frt) return frt;
  return "—";
}
