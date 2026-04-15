"use client";

import { useMemo, useState } from "react";
import { CrudEntityTable } from "@/components/crud/CrudEntityTable";
import { StaticFilterCard } from "@/components/crud/ListUiControls";
import {
  formControlClass,
  formLabelClass,
  formToggleRowClass,
} from "@/lib/uiFormClasses";
import { RecordDetailModal } from "@/components/crud/RecordDetailModal";
import { CrmCustomerSearchableDropdown } from "@/components/ui/CrmCustomerSearchableDropdown";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { usePayment } from "@/hooks/payments/usePayment";
import { usePayments } from "@/hooks/payments/usePayments";
import type { PaymentStatus } from "@/models/Payment";

const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  "pending",
  "completed",
  "failed",
  "refunded",
  "partially_refunded",
  "partially_paid",
  "cancelled",
];

/** Backend list filter values — see `GET /payments` index request. */
const PAYMENT_METHOD_FILTER_OPTIONS = [
  "",
  "stripe",
  "bank_transfer",
  "cash",
  "check",
  "card",
  "cheque",
  "card_payment",
] as const;

/**
 * Payments list with filters (GET /payments) and View → GET /payments/{id}.
 */
export function PaymentListView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [crmCompanyId, setCrmCompanyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [sortField, setSortField] = useState("payment_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [crmNotNull, setCrmNotNull] = useState(false);

  const filterKey = useMemo(
    () =>
      [
        search,
        status,
        paymentMethod,
        dateFrom,
        dateTo,
        vendorId,
        crmCompanyId,
        tenantId,
        sortField,
        sortDir,
        crmNotNull,
      ].join("\0"),
    [
      search,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
      vendorId,
      crmCompanyId,
      tenantId,
      sortField,
      sortDir,
      crmNotNull,
    ],
  );
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const listParams = useMemo(() => {
    const vid = parseInt(vendorId.trim(), 10);
    return {
      page,
      limit,
      sort_field: sortField,
      sort_direction: sortDir,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(Number.isFinite(vid) ? { vendor_id: vid } : {}),
      ...(crmCompanyId.trim() ? { crm_company_id: crmCompanyId.trim() } : {}),
      ...(tenantId.trim() ? { tenant_id: tenantId.trim() } : {}),
      ...(crmNotNull ? { crm_company_not_null: true } : {}),
    };
  }, [
    page,
    limit,
    sortField,
    sortDir,
    search,
    status,
    paymentMethod,
    dateFrom,
    dateTo,
    vendorId,
    crmCompanyId,
    tenantId,
    crmNotNull,
  ]);

  const listQuery = usePayments(listParams);
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const detailQuery = usePayment(detailId);

  return (
    <>
      <StaticFilterCard
        title="Payment list filters"
        subtitle="Parameters for GET /payments."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={formLabelClass}>
              Search
            </label>
            <input
              type="search"
              className={formControlClass}
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Status
            </label>
            <select
              className={formControlClass}
              value={status}
              onChange={(ev) =>
                setStatus(ev.target.value as PaymentStatus | "")
              }
            >
              <option value="">All</option>
              {PAYMENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>
              Payment method
            </label>
            <select
              className={formControlClass}
              value={paymentMethod}
              onChange={(ev) => setPaymentMethod(ev.target.value)}
            >
              {PAYMENT_METHOD_FILTER_OPTIONS.map((m) => (
                <option key={m || "all"} value={m}>
                  {m ? m.replace(/_/g, " ") : "All"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>
              Vendor ID
            </label>
            <input
              inputMode="numeric"
              className={formControlClass}
              value={vendorId}
              onChange={(ev) => setVendorId(ev.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Tenant ID
            </label>
            <TenantSearchableDropdown
              className="w-full"
              value={tenantId}
              onChange={(nextTenant) => {
                setTenantId(nextTenant ?? "");
                setCrmCompanyId("");
              }}
              placeholder="All tenants"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              CRM company ID
            </label>
            <CrmCustomerSearchableDropdown
              className="w-full"
              tenantId={tenantId}
              value={crmCompanyId}
              onChange={(nextCrmCompanyId) =>
                setCrmCompanyId(nextCrmCompanyId ?? "")
              }
              placeholder={
                tenantId.trim() ? "All CRM customers" : "Select tenant first…"
              }
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Date from
            </label>
            <input
              type="date"
              className={formControlClass}
              value={dateFrom}
              onChange={(ev) => setDateFrom(ev.target.value)}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Date to
            </label>
            <input
              type="date"
              className={formControlClass}
              value={dateTo}
              onChange={(ev) => setDateTo(ev.target.value)}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Sort field
            </label>
            <input
              className={`${formControlClass} font-mono`}
              value={sortField}
              onChange={(ev) => setSortField(ev.target.value)}
              placeholder="payment_date"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Sort direction
            </label>
            <select
              className={formControlClass}
              value={sortDir}
              onChange={(ev) =>
                setSortDir(ev.target.value as "asc" | "desc")
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className={formToggleRowClass}>
              <input
                type="checkbox"
                checked={crmNotNull}
                onChange={(ev) => setCrmNotNull(ev.target.checked)}
              />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                CRM company not null
              </span>
            </label>
          </div>
        </div>
      </StaticFilterCard>

      <CrudEntityTable
        query={listQuery}
        title="Payments"
        onView={(id) => setDetailId(id)}
        onPageChange={(next) => setPage(next)}
        limit={limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <RecordDetailModal
        open={detailId != null}
        title="Payment"
        subtitle="Invoice amounts, method, and related metadata."
        data={detailQuery.data ?? null}
        loading={detailQuery.isPending && detailId != null}
        error={detailQuery.isError ? String(detailQuery.error) : null}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
