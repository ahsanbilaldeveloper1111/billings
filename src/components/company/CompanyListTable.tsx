"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import type { ApiPagination, ApiSuccessResponse } from "@/lib/api/types";
import { useDisplayCurrency } from "@/contexts/currency-display-context";
import { extractListRows } from "@/lib/api/extractApiData";
import { useMainAppResellerNameMap } from "@/hooks/resellers/useMainAppResellerNameMap";
import type { Company } from "@/models/Company";

type CompanyRow = Company & Record<string, unknown>;

type CompanyListTableProps = {
  query: UseQueryResult<ApiSuccessResponse<unknown>>;
  title?: string;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  pagination: ApiPagination | undefined;
  onPageChange: (page: number) => void;
  limit: number;
  limitOptions: readonly number[];
  onLimitChange: (limit: number) => void;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onView: (row: Company) => void;
  onEdit: (row: Company) => void;
  onDelete: (row: Company) => void;
  onProductPricing: (row: Company) => void;
};

function SortChevron({
  active,
  dir,
}: {
  active: boolean;
  dir: "asc" | "desc";
}) {
  if (!active) {
    return (
      <span className="ml-1 text-zinc-400 opacity-60" aria-hidden>
        ↕
      </span>
    );
  }
  return (
    <span className="ml-1 text-zinc-700 dark:text-zinc-200" aria-hidden>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function displayName(
  c: CompanyRow,
  resellerNameByTenantId: Record<string, string>,
): string {
  const direct = c.name && String(c.name).trim();
  if (direct) return direct;
  const tid =
    c.tenant_id != null && String(c.tenant_id).trim() !== ""
      ? String(c.tenant_id).trim()
      : "";
  if (tid && resellerNameByTenantId[tid]) {
    return resellerNameByTenantId[tid];
  }
  return tid || "—";
}

function vendorLabel(c: CompanyRow): string {
  if (c.vendor?.name) return String(c.vendor.name);
  if (c.reseller?.name) return String(c.reseller.name);
  if (c.reseller?.tenant_id)
    return String(c.reseller.tenant_id);
  return "—";
}

export function CompanyListTable({
  query,
  title = "Tenants",
  sortField,
  sortDir,
  onSort,
  pagination,
  onPageChange,
  limit,
  limitOptions,
  onLimitChange,
  canView,
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onProductPricing,
}: CompanyListTableProps) {
  const mainAppResellerNameMap = useMainAppResellerNameMap();
  const { formatInCurrency } = useDisplayCurrency();

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

  const { rows } = extractListRows<CompanyRow>(query.data);
  const companies = rows;
  const sortHeader = (col: string, label?: string) => (
    <button
      type="button"
      className="inline-flex items-center font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
      onClick={() => onSort(col)}
    >
      {label ?? col.replace(/_/g, " ")}
      <SortChevron active={sortField === col} dir={sortDir} />
    </button>
  );

  const columns = [
    {
      key: "name",
      header: sortHeader("name", "name"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2",
      render: (c: CompanyRow) => {
        const phone =
          c.phone != null
            ? String(c.phone)
            : c.phone_no != null
              ? String(c.phone_no)
              : null;
        return (
          <>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {displayName(c, mainAppResellerNameMap)}
            </div>
            {phone ? (
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {phone}
              </div>
            ) : null}
          </>
        );
      },
    },
    {
      key: "credit_limit",
      header: sortHeader("credit_limit", "Credit limit"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CompanyRow) => {
        const cur = c.profile?.currency ?? "USD";
        const credit =
          c.profile?.credit_limit != null && c.profile.credit_limit > 0
            ? formatInCurrency(Number(c.profile.credit_limit), cur)
            : null;
        return credit ?? <span className="text-zinc-400">Not set</span>;
      },
    },
    {
      key: "country",
      header: sortHeader("country", "country"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CompanyRow) => c.country ?? "—",
    },
    {
      key: "outstanding_amount",
      header: sortHeader("outstanding_amount", "Outstanding"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      cellClassName: "px-3 py-2 text-right font-mono text-zinc-800 dark:text-zinc-200",
      render: (c: CompanyRow) => {
        const cur = c.profile?.currency ?? "USD";
        return formatInCurrency(c.profile?.outstanding_amount ?? 0, cur);
      },
    },
    {
      key: "email",
      header: sortHeader("email", "email"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CompanyRow) => c.email ?? "—",
    },
    {
      key: "created_at",
      header: sortHeader("created_at", "created at"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CompanyRow) =>
        c.created_at ? new Date(c.created_at).toLocaleDateString() : "—",
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (c: CompanyRow) => vendorLabel(c),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            Create tenant
          </button>
        ) : (
          <span />
        )}
      </div>

      <UniversalDataTable
        title={title}
        rows={companies}
        columns={columns}
        getRowKey={(c, idx) => c.id ?? c.tenant_id ?? idx}
        emptyMessage="No companies match these filters."
        minTableWidthClassName="min-w-[52rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        rawResponse={query.data ?? null}
        actionsHeader="Actions"
        actionsColumnClassName="min-w-[11rem] whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-200"
        renderActions={(c) => (
          <>
            {canView ? (
              <button
                type="button"
                onClick={() => onView(c)}
                className="shrink-0 rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/40"
              >
                View
              </button>
            ) : null}
            {canUpdate ? (
              <button
                type="button"
                onClick={() => onEdit(c)}
                className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-950 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/40"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onProductPricing(c)}
              className="shrink-0 rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-medium text-violet-900 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/40"
              title="Open product pricing (new tab)"
            >
              Pricing
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(c)}
                className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-900/40"
              >
                Delete
              </button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
