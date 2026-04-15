"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { UniversalDataTable } from "@/components/crud/UniversalDataTable";
import type { ApiPagination, ApiSuccessResponse } from "@/lib/api/types";
import { extractListRows } from "@/lib/api/extractApiData";
import type { Customer } from "@/models/Customer";

type CustomerRow = Customer & Record<string, unknown>;

type CustomerListTableProps = {
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
  tenantNameMap: Record<string, string>;
  crmCompanyNameMap: Record<string, string>;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onView: (row: Customer) => void;
  onEdit: (row: Customer) => void;
  onDelete: (row: Customer) => void;
  onProductPricing: (row: Customer) => void;
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

export function CustomerListTable({
  query,
  title = "Customers",
  sortField,
  sortDir,
  onSort,
  pagination,
  onPageChange,
  limit,
  limitOptions,
  onLimitChange,
  tenantNameMap,
  crmCompanyNameMap,
  canView,
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onProductPricing,
}: CustomerListTableProps) {
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

  const { rows } = extractListRows<CustomerRow>(query.data);
  const customers = rows;
  const sortHeader = (col: string, label?: string) => (
    <button
      type="button"
      className="inline-flex items-center font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
      onClick={() => onSort(col)}
    >
      {label ?? col.charAt(0).toUpperCase() + col.slice(1)}
      <SortChevron active={sortField === col} dir={sortDir} />
    </button>
  );
  const columns = [
    {
      key: "name",
      header: sortHeader("name"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CustomerRow) => c.name ?? "—",
      cellClassName: "px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100",
    },
    {
      key: "email",
      header: sortHeader("email"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CustomerRow) => c.email ?? "—",
    },
    {
      key: "phone",
      header: sortHeader("phone"),
      headerClassName: "whitespace-nowrap px-3 py-2",
      render: (c: CustomerRow) => c.phone ?? "—",
    },
    {
      key: "crm_company",
      header: "CRM company",
      render: (c: CustomerRow) => {
        const crmId = c.crm_company_id != null ? String(c.crm_company_id).trim() : "";
        const crmName = crmId && crmCompanyNameMap[crmId]?.trim() ? crmCompanyNameMap[crmId] : "";
        if (!crmId) return "—";
        return (
          <div>
            <p>{crmName || crmId}</p>
            {crmName && crmName !== crmId ? (
              <p className="text-[11px] text-zinc-500">{crmId}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "tenant",
      header: "Tenant",
      render: (c: CustomerRow) => {
        const tid = c.tenant_id != null ? String(c.tenant_id).trim() : "";
        const tenantName = tid && tenantNameMap[tid]?.trim() ? tenantNameMap[tid] : "";
        if (!tid) return "—";
        return (
          <div>
            <p>{tenantName || tid}</p>
            {tenantName && tenantName !== tid ? (
              <p className="text-[11px] text-zinc-500">{tid}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "invoices",
      header: "Invoices",
      render: (c: CustomerRow) => c.invoices_count ?? 0,
      cellClassName: "px-3 py-2 text-zinc-800 dark:text-zinc-200",
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
            Create customer
          </button>
        ) : (
          <span />
        )}
      </div>

      <UniversalDataTable
        title={title}
        rows={customers}
        columns={columns}
        getRowKey={(c, idx) => c.crm_company_id ?? c.id ?? idx}
        emptyMessage="No customers match the current filters."
        minTableWidthClassName="min-w-[48rem]"
        pagination={pagination}
        onPageChange={onPageChange}
        limit={limit}
        limitOptions={limitOptions}
        onLimitChange={onLimitChange}
        rawResponse={query.data ?? null}
        actionsHeader="Actions"
        actionsColumnClassName="min-w-[12rem] whitespace-nowrap px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-200"
        renderActions={(c) => (
          <>
            {canView ? (
              <button
                type="button"
                onClick={() => onView(c)}
                className="shrink-0 rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-100"
              >
                View
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onProductPricing(c)}
              className="shrink-0 rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-medium text-violet-900 hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-100"
              title="Subscription pricing"
            >
              Pricing
            </button>
            {canUpdate ? (
              <button
                type="button"
                onClick={() => onEdit(c)}
                className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-100"
              >
                Edit
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(c)}
                className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100"
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
