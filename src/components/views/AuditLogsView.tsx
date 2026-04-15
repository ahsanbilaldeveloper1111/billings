"use client";

import { useMemo, useState } from "react";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { RecordDetailModal } from "@/components/crud/RecordDetailModal";
import type { UniversalDataTableColumn } from "@/components/crud/UniversalDataTable";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import { AuditLogDetailContent } from "@/components/audit-logs/AuditLogDetailContent";
import { useAuditLogs } from "@/hooks/audit-logs/useAuditLogs";
import { extractListRows } from "@/lib/api/extractApiData";
import {
  auditActionBadgeClass,
  auditResourceBadgeClass,
  auditRowSummaryLine,
  auditSnapshotSummary,
  formatAuditLogWhen,
  shortBrowserLabel,
} from "@/lib/auditLogPresentation";
import { AuditLogResourceType } from "@/models/AuditLog";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;
const RESOURCE_TYPE_OPTIONS = Object.values(AuditLogResourceType);
const ACTION_OPTIONS = ["", "create", "update", "delete"] as const;

type AuditRow = Record<string, unknown>;

function isAuditRowRecord(v: unknown): v is AuditRow {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function AuditLogsView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState<AuditLogResourceType | "">(
    "",
  );
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [crmCompanyId, setCrmCompanyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const listParams = useMemo(() => {
    const uid = Number.parseInt(userId.trim(), 10);
    const cid = Number.parseInt(companyId.trim(), 10);
    const vid = Number.parseInt(vendorId.trim(), 10);
    return {
      page,
      limit,
      ...(action ? { action } : {}),
      ...(resourceType ? { resource_type: resourceType } : {}),
      ...(Number.isFinite(uid) ? { user_id: uid } : {}),
      ...(Number.isFinite(cid) ? { company_id: cid } : {}),
      ...(Number.isFinite(vid) ? { vendor_id: vid } : {}),
      ...(tenantId.trim() ? { tenant_id: tenantId.trim() } : {}),
      ...(crmCompanyId.trim() ? { crm_company_id: crmCompanyId.trim() } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    };
  }, [
    page,
    limit,
    action,
    resourceType,
    userId,
    companyId,
    vendorId,
    tenantId,
    crmCompanyId,
    dateFrom,
    dateTo,
  ]);

  const listQuery = useAuditLogs(listParams);
  const [detailRow, setDetailRow] = useState<AuditRow | null>(null);

  const columns: readonly UniversalDataTableColumn<AuditRow>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-200",
        render: (row) => String(row.id ?? "—"),
      },
      {
        key: "user",
        header: "User",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "max-w-[10rem] px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-100",
        render: (row) => {
          const name =
            typeof row.user_name === "string" && row.user_name.trim()
              ? row.user_name.trim()
              : null;
          if (name) return name;
          const id = row.user_id;
          if (typeof id === "number" || typeof id === "string")
            return `User #${id}`;
          return "—";
        },
      },
      {
        key: "action",
        header: "Action",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName: "whitespace-nowrap px-3 py-2.5",
        render: (row) => (
          <span className={auditActionBadgeClass(String(row.action ?? ""))}>
            {String(row.action ?? "—")}
          </span>
        ),
      },
      {
        key: "resource",
        header: "Resource",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName: "px-3 py-2.5",
        render: (row) => {
          const rt = String(row.resource_type ?? "—");
          return (
            <span className={auditResourceBadgeClass()} title={rt}>
              {rt.replace(/_/g, " ")}
            </span>
          );
        },
      },
      {
        key: "summary",
        header: "Summary",
        headerClassName:
          "min-w-[8rem] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "max-w-[14rem] px-3 py-2.5 text-sm leading-snug text-zinc-700 dark:text-zinc-200",
        render: (row) => (
          <span className="line-clamp-2" title={auditRowSummaryLine(row)}>
            {auditRowSummaryLine(row)}
          </span>
        ),
      },
      {
        key: "delta",
        header: "Change size",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-300",
        render: (row) => (
          <span title="Snapshot sizes before → after">
            {auditSnapshotSummary(row.old_values)} →{" "}
            {auditSnapshotSummary(row.new_values)}
          </span>
        ),
      },
      {
        key: "when",
        header: "When",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "whitespace-nowrap px-3 py-2.5 text-xs text-zinc-700 dark:text-zinc-200",
        render: (row) => formatAuditLogWhen(row.created_at),
      },
      {
        key: "ip",
        header: "IP",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "max-w-[7rem] truncate px-3 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-200",
        render: (row) => String(row.ip_address ?? "—"),
      },
      {
        key: "client",
        header: "Client",
        headerClassName:
          "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300",
        cellClassName:
          "max-w-[8rem] px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-300",
        render: (row) => (
          <span className="line-clamp-2" title={String(row.user_agent ?? "")}>
            {shortBrowserLabel(row.user_agent)}
          </span>
        ),
      },
    ],
    [],
  );

  const { rows, pagination } = extractListRows(listQuery.data);

  return (
    <>
      <CollapsibleFilterPanel
        title="Audit log filters"
        subtitle="Filter by action, resource, IDs, and date range."
        open={showFilters}
        onToggle={() => setShowFilters((v) => !v)}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={formLabelClass}>
              Action
            </label>
            <select
              className={formControlClass}
              value={action}
              onChange={(ev) => {
                setAction(ev.target.value);
                setPage(1);
              }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt || "all"} value={opt}>
                  {opt ? opt : "All"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>
              Resource type
            </label>
            <select
              className={formControlClass}
              value={resourceType}
              onChange={(ev) => {
                setResourceType(ev.target.value as AuditLogResourceType | "");
                setPage(1);
              }}
            >
              <option value="">All</option>
              {RESOURCE_TYPE_OPTIONS.map((rt) => (
                <option key={rt} value={rt}>
                  {rt.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>
              User ID
            </label>
            <input
              inputMode="numeric"
              value={userId}
              onChange={(ev) => {
                setUserId(ev.target.value);
                setPage(1);
              }}
              placeholder="e.g. 20954"
              className={formControlClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Company ID
            </label>
            <input
              inputMode="numeric"
              value={companyId}
              onChange={(ev) => {
                setCompanyId(ev.target.value);
                setPage(1);
              }}
              placeholder="Optional"
              className={formControlClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Vendor ID
            </label>
            <input
              inputMode="numeric"
              value={vendorId}
              onChange={(ev) => {
                setVendorId(ev.target.value);
                setPage(1);
              }}
              placeholder="Optional"
              className={formControlClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Tenant ID
            </label>
            <input
              value={tenantId}
              onChange={(ev) => {
                setTenantId(ev.target.value);
                setPage(1);
              }}
              placeholder="Optional"
              className={formControlClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              CRM company ID
            </label>
            <input
              value={crmCompanyId}
              onChange={(ev) => {
                setCrmCompanyId(ev.target.value);
                setPage(1);
              }}
              placeholder="Optional"
              className={formControlClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Date from
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(ev) => {
                setDateFrom(ev.target.value);
                setPage(1);
              }}
              className={formControlClass}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Date to
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(ev) => {
                setDateTo(ev.target.value);
                setPage(1);
              }}
              className={formControlClass}
            />
          </div>
        </div>
      </CollapsibleFilterPanel>

      {listQuery.isPending ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200/60 bg-white/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-950/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded-md bg-gradient-to-r from-zinc-100 via-zinc-200/80 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700/50 dark:to-zinc-800"
              style={{ width: `${100 - i * 12}%` }}
            />
          ))}
        </div>
      ) : listQuery.isError ? (
        <div
          className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 to-white p-5 text-sm text-rose-900 shadow-sm dark:border-rose-900/50 dark:from-rose-950/40 dark:to-zinc-950 dark:text-rose-100"
          role="alert"
        >
          <p className="font-semibold">Request failed</p>
          <p className="mt-2 font-mono text-xs opacity-90">
            {String(listQuery.error)}
          </p>
        </div>
      ) : (
        <UniversalDataTable<AuditRow>
          title="Audit logs"
          rows={rows as AuditRow[]}
          columns={columns}
          getRowKey={(row) => {
            const id = row.id;
            return typeof id === "number" || typeof id === "string"
              ? id
              : JSON.stringify(row).slice(0, 40);
          }}
          emptyMessage="No audit log entries match these filters."
          minTableWidthClassName="min-w-[56rem]"
          pagination={pagination}
          onPageChange={(next) => setPage(next)}
          limit={limit}
          limitOptions={LIMIT_OPTIONS}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          rawResponse={listQuery.data ?? null}
          renderActions={(row) => (
            <button
              type="button"
              onClick={() => setDetailRow(row)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-500 dark:hover:bg-emerald-500"
            >
              View
            </button>
          )}
        />
      )}

      <RecordDetailModal
        open={detailRow != null}
        title="Audit log"
        subtitle="Summary, field changes, and full JSON in expandable sections."
        data={
          detailRow != null
            ? { success: true as const, data: detailRow }
            : null
        }
        onClose={() => setDetailRow(null)}
        renderData={(inner) =>
          isAuditRowRecord(inner) ? (
            <AuditLogDetailContent row={inner} />
          ) : (
            <p className="text-sm text-zinc-500">Nothing to display.</p>
          )
        }
      />
    </>
  );
}
