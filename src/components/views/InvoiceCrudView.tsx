"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { CreateUpdateInvoiceModal } from "@/components/invoices/CreateUpdateInvoiceModal";
import { InvoiceDetailModal } from "@/components/invoices/InvoiceDetailModal";
import { InvoiceListTable } from "@/components/invoices/InvoiceListTable";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { CrmCustomerSearchableDropdown } from "@/components/ui/CrmCustomerSearchableDropdown";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { useCrmCompanyNameMap } from "@/hooks/crm/useCrmCompanyNameMap";
import { useInvoiceMutations } from "@/hooks/invoices/useInvoiceMutations";
import { useInvoices } from "@/hooks/invoices/useInvoices";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useVendors } from "@/hooks/vendors/useVendors";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  buildInvoiceListSearchParams,
  parseInvoiceListSearchParams,
  type InvoiceListUrlState,
} from "@/lib/invoices/invoiceListUrl";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { IndexInvoiceParams, InvoiceStatus } from "@/models/Invoice";
import { useTenantDisplayNameMap } from "@/hooks/company/useTenantDisplayNameMap";
import { useMainAppResellerNameMap } from "@/hooks/resellers/useMainAppResellerNameMap";

const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = [
  "draft",
  "sent",
  "paid",
  "pending",
  "partially_paid",
  "overdue",
  "cancelled",
];

const LIST_LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

function formatInvoiceSummaryValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function InvoiceListSummaryBar({ response }: { response: unknown }) {
  if (!response || typeof response !== "object") return null;
  const summary = (response as { summary?: unknown }).summary;
  if (summary == null) return null;
  if (
    typeof summary === "object" &&
    !Array.isArray(summary) &&
    Object.keys(summary).length === 0
  ) {
    return null;
  }
  const entries =
    typeof summary === "object" && summary !== null && !Array.isArray(summary)
      ? Object.entries(summary as Record<string, unknown>)
      : [["summary", summary] as [string, unknown]];

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        List summary (API)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className="inline-flex max-w-full items-baseline gap-1 rounded-lg border border-emerald-200/70 bg-white/80 px-2 py-1 text-xs text-emerald-950 dark:border-emerald-800 dark:bg-zinc-900/60 dark:text-emerald-50"
          >
            <span className="font-semibold">{k}</span>
            <span className="truncate font-mono opacity-90">
              {formatInvoiceSummaryValue(v)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function InvoiceCrudView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin } = usePermissions();

  const [listState, setListState] = useState<InvoiceListUrlState>(() =>
    parseInvoiceListSearchParams(searchParams),
  );

  const debouncedSearch = useDebouncedValue(listState.search, 400);

  useEffect(() => {
    const q = buildInvoiceListSearchParams(
      {
        page: listState.page,
        limit: listState.limit,
        search: debouncedSearch,
        status: listState.status,
        tenant_id: listState.tenant_id,
        vendor_id: listState.vendor_id,
        crm_company_id: listState.crm_company_id,
        date_from: listState.date_from,
        date_to: listState.date_to,
        column: listState.column,
        dir: listState.dir,
        payment_status: listState.payment_status,
        crm_company_not_null: listState.crm_company_not_null,
      },
      { searchOverride: debouncedSearch },
    );
    const next = q.toString();
    if (next === searchParams.toString()) return;
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [
    listState.page,
    listState.limit,
    listState.status,
    listState.tenant_id,
    listState.vendor_id,
    listState.crm_company_id,
    listState.date_from,
    listState.date_to,
    listState.column,
    listState.dir,
    listState.payment_status,
    listState.crm_company_not_null,
    debouncedSearch,
    pathname,
    router,
    searchParams,
  ]);

  const vendorsQuery = useVendors({
    limit: 500,
    "order[column]": "name",
    "order[dir]": "asc",
  });
  const vendorRows = extractListRows(vendorsQuery.data).rows as {
    id: number;
    name: string;
  }[];

  const vendorIdNum = listState.vendor_id.trim()
    ? Number.parseInt(listState.vendor_id, 10)
    : NaN;
  const companyTenantDisplayMap = useTenantDisplayNameMap();
  const resellerNameMap = useMainAppResellerNameMap();
  const tenantDisplayNameById = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of new Set([
      ...Object.keys(companyTenantDisplayMap),
      ...Object.keys(resellerNameMap),
    ])) {
      const v =
        companyTenantDisplayMap[k]?.trim() || resellerNameMap[k]?.trim() || "";
      if (v) out[k] = v;
    }
    return out;
  }, [companyTenantDisplayMap, resellerNameMap]);
  const crmCompanyNameById = useCrmCompanyNameMap();

  const listParams = useMemo((): IndexInvoiceParams => {
    const vendorParsed = listState.vendor_id.trim()
      ? Number.parseInt(listState.vendor_id, 10)
      : NaN;
    return {
      page: listState.page,
      limit: listState.limit,
      sort_field: listState.column,
      sort_direction: listState.dir,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(listState.status ? { status: listState.status } : {}),
      ...(listState.payment_status.trim()
        ? { payment_status: listState.payment_status.trim() }
        : {}),
      ...(Number.isFinite(vendorParsed) ? { vendor_id: vendorParsed } : {}),
      ...(listState.tenant_id.trim()
        ? { tenant_id: listState.tenant_id.trim() }
        : {}),
      ...(listState.date_from ? { date_from: listState.date_from } : {}),
      ...(listState.date_to ? { date_to: listState.date_to } : {}),
      ...(listState.crm_company_id.trim()
        ? { crm_company_id: listState.crm_company_id.trim() }
        : {}),
      ...(listState.crm_company_not_null ? { crm_company_not_null: true } : {}),
    };
  }, [
    listState.page,
    listState.limit,
    listState.status,
    listState.tenant_id,
    listState.vendor_id,
    listState.crm_company_id,
    listState.date_from,
    listState.date_to,
    listState.column,
    listState.dir,
    listState.payment_status,
    listState.crm_company_not_null,
    debouncedSearch,
  ]);

  const listQuery = useInvoices(listParams);
  const { pagination } = extractListRows(listQuery.data);
  const mutations = useInvoiceMutations();
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const deleteItemLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteId, {
        labelKeys: ["invoice_number"],
      }),
    [listQuery.data, deleteId],
  );

  const openCreate = () => {
    setEditId(null);
    setInvoiceFormOpen(true);
  };

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      showAppToast("Invoice deleted.", "success");
      setDeleteId(null);
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  return (
    <>
      <CollapsibleFilterPanel
        title="Filters — synced to URL"
        subtitle="Search is debounced before calling the API."
        open={showFilters}
        onToggle={() => setShowFilters((v) => !v)}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={formLabelClass}>Search</label>
            <input
              type="search"
              className={formControlClass}
              value={listState.search}
              onChange={(ev) =>
                setListState((s) => ({
                  ...s,
                  search: ev.target.value,
                  page: 1,
                }))
              }
              placeholder="Invoice #, customer…"
            />
          </div>
          <div>
            <label className={formLabelClass}>Vendor</label>
            <select
              className={formControlClass}
              value={listState.vendor_id}
              onChange={(ev) => {
                const vendor_id = ev.target.value;
                setListState((s) => ({
                  ...s,
                  page: 1,
                  vendor_id,
                  tenant_id: "",
                  crm_company_id: "",
                }));
              }}
            >
              <option value="">All vendors</option>
              {vendorRows.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-zinc-500">
              Select a vendor to load tenant companies.
            </p>
          </div>
          <div>
            <label className={formLabelClass}>Tenant (company)</label>
            <TenantSearchableDropdown
              className="w-full"
              disabled={!Number.isFinite(vendorIdNum)}
              value={listState.tenant_id}
              enabled={Number.isFinite(vendorIdNum)}
              fetchParams={
                Number.isFinite(vendorIdNum)
                  ? { vendor_id: vendorIdNum }
                  : undefined
              }
              onChange={(tenant_id) => {
                setListState((s) => ({
                  ...s,
                  page: 1,
                  tenant_id: tenant_id ?? "",
                  crm_company_id: "",
                }));
              }}
              placeholder={
                Number.isFinite(vendorIdNum)
                  ? "All tenants"
                  : "Select vendor first…"
              }
            />
          </div>
          {isSuperAdmin ? (
            <div>
              <label className={formLabelClass}>Customer (CRM)</label>
              <CrmCustomerSearchableDropdown
                className="w-full"
                tenantId={listState.tenant_id}
                disabled={!listState.tenant_id.trim()}
                value={listState.crm_company_id}
                onChange={(crmCompanyId) =>
                  setListState((s) => ({
                    ...s,
                    page: 1,
                    crm_company_id: crmCompanyId ?? "",
                  }))
                }
                placeholder={
                  listState.tenant_id.trim()
                    ? "All customers"
                    : "Select tenant first…"
                }
              />
            </div>
          ) : null}
          <div>
            <label className={formLabelClass}>Status</label>
            <select
              className={formControlClass}
              value={listState.status}
              onChange={(ev) =>
                setListState((s) => ({
                  ...s,
                  page: 1,
                  status: ev.target.value as InvoiceStatus | "",
                }))
              }
            >
              <option value="">All</option>
              {INVOICE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>Payment status</label>
            <input
              className={formControlClass}
              value={listState.payment_status}
              onChange={(ev) =>
                setListState((s) => ({
                  ...s,
                  page: 1,
                  payment_status: ev.target.value,
                }))
              }
              placeholder="Optional"
            />
          </div>
          <div>
            <label className={formLabelClass}>Date from</label>
            <input
              type="date"
              className={formControlClass}
              value={listState.date_from}
              max={listState.date_to || undefined}
              onChange={(ev) =>
                setListState((s) => ({
                  ...s,
                  page: 1,
                  date_from: ev.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className={formLabelClass}>Date to</label>
            <input
              type="date"
              className={formControlClass}
              value={listState.date_to}
              min={listState.date_from || undefined}
              onChange={(ev) =>
                setListState((s) => ({
                  ...s,
                  page: 1,
                  date_to: ev.target.value,
                }))
              }
            />
          </div>
          {!isSuperAdmin ? (
            <div className="sm:col-span-2">
              <label className={formLabelClass}>CRM company ID (raw)</label>
              <input
                className={formControlClass}
                value={listState.crm_company_id}
                onChange={(ev) =>
                  setListState((s) => ({
                    ...s,
                    page: 1,
                    crm_company_id: ev.target.value,
                  }))
                }
                placeholder="Optional filter"
              />
            </div>
          ) : null}
          {(listState.date_from || listState.date_to) && (
            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                onClick={() =>
                  setListState((s) => ({
                    ...s,
                    page: 1,
                    date_from: "",
                    date_to: "",
                  }))
                }
              >
                Clear dates
              </button>
            </div>
          )}
          {/* <div className="flex items-end">
            <label className={formToggleRowClass}>
              <input
                type="checkbox"
                checked={listState.crm_company_not_null}
                onChange={(ev) =>
                  setListState((s) => ({
                    ...s,
                    page: 1,
                    crm_company_not_null: ev.target.checked,
                  }))
                }
              />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                CRM company not null
              </span>
            </label>
          </div> */}
        </div>
      </CollapsibleFilterPanel>

      <InvoiceListSummaryBar response={listQuery.data} />

      <InvoiceListTable
        query={listQuery}
        title="Invoices"
        isSuperAdmin={isSuperAdmin}
        tenantDisplayNameById={tenantDisplayNameById}
        crmCompanyNameById={crmCompanyNameById}
        pagination={pagination}
        onPageChange={(page) => setListState((s) => ({ ...s, page }))}
        limit={listState.limit}
        limitOptions={LIST_LIMIT_OPTIONS}
        onLimitChange={(limit) =>
          setListState((s) => ({ ...s, page: 1, limit }))
        }
        onCreate={openCreate}
        onView={(id) => setDetailId(id)}
        onEdit={(id) => {
          setEditId(id);
          setInvoiceFormOpen(true);
        }}
        onDelete={(id) => setDeleteId(id)}
      />

      <InvoiceDetailModal
        open={detailId != null}
        onClose={() => setDetailId(null)}
        invoiceId={detailId}
        tenantDisplayNameById={tenantDisplayNameById}
        onEdit={(inv) => {
          setDetailId(null);
          setEditId(inv.id);
          setInvoiceFormOpen(true);
        }}
      />

      <CreateUpdateInvoiceModal
        open={invoiceFormOpen}
        invoiceId={editId}
        onClose={() => {
          setInvoiceFormOpen(false);
          setEditId(null);
        }}
      />

      <DeleteConfirmationDialog
        show={deleteId != null}
        title="Delete invoice?"
        message="Deletes via DELETE /invoices/{id}. The API may reject if payments exist."
        itemName={deleteItemLabel}
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}
