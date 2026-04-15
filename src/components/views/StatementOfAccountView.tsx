"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmCustomerSearchableDropdown } from "@/components/ui/CrmCustomerSearchableDropdown";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useVendors } from "@/hooks/vendors/useVendors";
import { extractListRows, getApiData } from "@/lib/api/extractApiData";
import type { ApiSuccessResponse } from "@/lib/api/types";
import { formatCurrency } from "@/lib/currency";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import { reportService } from "@/services/reports.service";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type StatementCustomer = {
  id: number | string;
  name: string;
  email?: string;
};

type StatementTransaction = {
  type: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency?: string;
};

type OutstandingInvoice = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_past_due: number;
  currency?: string;
};

type StatementData = {
  customer: {
    id?: number;
    name: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    currency?: string;
    tenant_id?: string;
  };
  vendor?: {
    id?: number;
    name?: string;
    logo?: string | null;
  };
  period: { start_date: string; end_date: string };
  summary: {
    beginning_balance?: number;
    total_invoiced: number;
    total_paid: number;
    ending_balance: number;
    currency?: string;
  };
  transactions: StatementTransaction[];
  outstanding_invoices: OutstandingInvoice[];
};

function StatementDocument({
  data,
  onDownloadPdf,
  downloading,
}: {
  data: StatementData;
  onDownloadPdf: () => void;
  downloading: boolean;
}) {
  const statementCurrency =
    data.summary?.currency || data.customer?.currency || "USD";
  const hasNoActivity =
    (!data.transactions || data.transactions.length === 0) &&
    (!data.outstanding_invoices || data.outstanding_invoices.length === 0) &&
    (data.summary?.total_invoiced ?? 0) === 0 &&
    (data.summary?.total_paid ?? 0) === 0;

  return (
    <div className="space-y-6">
      {(data.vendor?.name || data.vendor?.logo) && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200/80 bg-gradient-to-r from-zinc-50/90 to-white px-4 py-4 dark:border-zinc-800/80 dark:from-zinc-900/50 dark:to-zinc-950/40">
          {data.vendor?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- vendor logo URL from API
            <img
              src={data.vendor.logo}
              alt=""
              className="max-h-14 max-w-[10rem] rounded-lg object-contain"
            />
          ) : null}
          {data.vendor?.name ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                From / issued by
              </p>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {data.vendor.name}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-l-4 border-zinc-200/90 border-l-emerald-500 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:border-l-emerald-400 dark:bg-zinc-950/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Statement period
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {data.period.start_date}{" "}
            <span className="font-normal text-zinc-500">to</span>{" "}
            {data.period.end_date}
          </p>
        </div>
        <div className="rounded-2xl border border-l-4 border-zinc-200/90 border-l-sky-500 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:border-l-sky-400 dark:bg-zinc-950/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Bill to
          </p>
          <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
            {data.customer.name}
          </p>
          {data.customer.email ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {data.customer.email}
            </p>
          ) : null}
          {(data.customer.address || data.customer.city) && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {[
                data.customer.address,
                [
                  data.customer.city,
                  data.customer.state,
                  data.customer.postal_code,
                ]
                  .filter(Boolean)
                  .join(", "),
                data.customer.country,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>

      {hasNoActivity && (
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          No activity in this period for the selected company.
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Transaction history
        </h3>
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/80">
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                    Type
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                    Reference
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-zinc-700 dark:text-zinc-200">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                    Debit
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                    Credit
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data.transactions || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400"
                    >
                      No transactions in this period.
                    </td>
                  </tr>
                ) : (
                  (data.transactions || []).map((tx, idx) => {
                    const cur = tx.currency || statementCurrency;
                    const typeLabel = tx.type
                      ? tx.type.charAt(0).toUpperCase() + tx.type.slice(1)
                      : "";
                    const isPayment = tx.type === "payment";
                    return (
                      <tr
                        key={`${tx.date}-${tx.reference}-${idx}`}
                        className="border-b border-zinc-100 odd:bg-white/50 even:bg-zinc-50/40 dark:border-zinc-800/80 dark:odd:bg-transparent dark:even:bg-zinc-900/25"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-800 dark:text-zinc-200">
                          {tx.date}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              isPayment
                                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                                : "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                          {tx.reference}
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-2 text-zinc-700 dark:text-zinc-300">
                          {tx.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">
                          {tx.debit > 0 ? (
                            formatCurrency(tx.debit, cur)
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                          {tx.credit > 0 ? (
                            formatCurrency(tx.credit, cur)
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(tx.balance, cur)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          All amounts in <strong>{statementCurrency}</strong> (company currency).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-emerald-50/30 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-emerald-950/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total invoiced
          </p>
          <p className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-300">
            {formatCurrency(data.summary.total_invoiced, statementCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-teal-50/30 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-teal-950/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Total paid
          </p>
          <p className="mt-1 text-lg font-bold text-teal-800 dark:text-teal-300">
            {formatCurrency(data.summary.total_paid, statementCurrency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Ending balance
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(data.summary.ending_balance, statementCurrency)}
          </p>
        </div>
      </div>

      {(data.outstanding_invoices || []).length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Outstanding invoices
          </h3>
          <div className="overflow-hidden rounded-2xl border border-amber-200/90 dark:border-amber-900/40">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-amber-200/80 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/40">
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-amber-950 dark:text-amber-100">
                      Invoice #
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-amber-950 dark:text-amber-100">
                      Date
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-amber-950 dark:text-amber-100">
                      Due
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-amber-950 dark:text-amber-100">
                      Amount
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-amber-950 dark:text-amber-100">
                      Paid
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-amber-950 dark:text-amber-100">
                      Outstanding
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-amber-950 dark:text-amber-100">
                      Days past due
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.outstanding_invoices || []).map((inv, idx) => (
                    <tr
                      key={`${inv.invoice_number}-${idx}`}
                      className="border-b border-amber-100/80 odd:bg-white/60 even:bg-amber-50/20 dark:border-zinc-800 dark:odd:bg-transparent dark:even:bg-amber-950/10"
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {inv.invoice_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {formatShortDate(inv.invoice_date)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {formatShortDate(inv.due_date)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(
                          inv.amount,
                          inv.currency || statementCurrency,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(
                          inv.paid_amount,
                          inv.currency || statementCurrency,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(
                          inv.outstanding_amount,
                          inv.currency || statementCurrency,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {inv.days_past_due > 0 ? (
                          <span className="inline-flex rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                            {inv.days_past_due} days
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end border-t border-zinc-200/80 pt-6 dark:border-zinc-800">
        <button
          type="button"
          disabled={downloading}
          onClick={onDownloadPdf}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )}
          Download PDF
        </button>
      </div>
    </div>
  );
}

export function StatementOfAccountView() {
  const { isSuperAdmin } = usePermissions();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [crmCompanyId, setCrmCompanyId] = useState("");
  const [statementData, setStatementData] = useState<StatementData | null>(
    null,
  );
  const [statementError, setStatementError] = useState<string | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statementByCustomerId, setStatementByCustomerId] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<StatementCustomer | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(ymdLocal(first));
    setEndDate(ymdLocal(last));
  }, []);

  const vendorsQuery = useVendors({
    limit: 500,
    "order[column]": "name",
    "order[dir]": "asc",
  });
  const vendorRows = extractListRows(vendorsQuery.data).rows as {
    id: number;
    name: string;
  }[];
  const vendorOptions = useMemo(
    () =>
      vendorRows.map((v) => ({
        value: String(v.id),
        label: v.name,
      })),
    [vendorRows],
  );

  const vendorIdNum = vendorId.trim()
    ? Number.parseInt(vendorId, 10)
    : NaN;

  const resetStatement = useCallback(() => {
    setStatementData(null);
    setStatementError(null);
    setSelectedCustomer(null);
    setStatementByCustomerId(false);
  }, []);

  const handleBack = useCallback(() => {
    resetStatement();
  }, [resetStatement]);

  const loadStatement = useCallback(
    async (body: Record<string, string>) => {
      setLoadingStatement(true);
      setStatementError(null);
      setStatementData(null);
      try {
        const res = await reportService.customerStatement(body);
        const inner = getApiData(res as ApiSuccessResponse<unknown>) as
          | StatementData
          | undefined
          | null;
        if (inner && typeof inner === "object" && inner.customer) {
          setStatementData(inner);
          setStatementError(null);
          setSelectedCustomer((prev) => {
            const id =
              body.crm_company_id ??
              body.tenant_id ??
              prev?.id ??
              "";
            return {
              id,
              name: inner.customer.name || String(id),
            };
          });
        } else {
          const msg =
            (res as { message?: string })?.message ??
            "Could not load statement.";
          setStatementError(msg);
        }
      } catch (err: unknown) {
        showBillingBackendErrorToast(err);
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as Error).message)
            : "Failed to load statement.";
        setStatementError(msg);
      } finally {
        setLoadingStatement(false);
      }
    },
    [],
  );

  const handleView = useCallback(async () => {
    if (!startDate || !endDate) {
      showAppToast("Please select start and end dates.", "error");
      return;
    }
    if (isSuperAdmin && crmCompanyId.trim()) {
      setStatementByCustomerId(true);
      setSelectedCustomer({
        id: crmCompanyId.trim(),
        name: `Customer ${crmCompanyId.trim()}`,
      });
      await loadStatement({
        crm_company_id: crmCompanyId.trim(),
        start_date: startDate,
        end_date: endDate,
      });
      return;
    }
    if (!tenantId.trim()) {
      showAppToast("Select a vendor and company, or a CRM customer.", "error");
      return;
    }
    setStatementByCustomerId(false);
    setSelectedCustomer({
      id: tenantId.trim(),
      name: tenantId.trim(),
    });
    await loadStatement({
      tenant_id: tenantId.trim(),
      start_date: startDate,
      end_date: endDate,
    });
  }, [
    startDate,
    endDate,
    tenantId,
    crmCompanyId,
    isSuperAdmin,
    loadStatement,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedCustomer || !startDate || !endDate) return;
    const payload: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (statementByCustomerId) {
      payload.crm_company_id = String(selectedCustomer.id);
    } else {
      payload.tenant_id = String(selectedCustomer.id);
    }
    setDownloading(true);
    try {
      const blob = await reportService.customerStatementDownload(payload);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safe = String(selectedCustomer.name || "customer").replaceAll(
        /\s+/g,
        "_",
      );
      link.download = `statement-${safe}-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showAppToast("Statement downloaded.", "success");
    } catch (err: unknown) {
      showBillingBackendErrorToast(err);
    } finally {
      setDownloading(false);
    }
  }, [
    selectedCustomer,
    startDate,
    endDate,
    statementByCustomerId,
  ]);

  const showStatementPanel =
    selectedCustomer != null &&
    (statementData != null || loadingStatement || statementError != null);

  const canSubmit =
    Boolean(startDate && endDate) &&
    (Boolean(tenantId.trim()) ||
      (isSuperAdmin && Boolean(crmCompanyId.trim()))) &&
    !loadingStatement;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-emerald-50/20 to-white shadow-sm dark:border-zinc-800/80 dark:from-zinc-950 dark:via-emerald-950/10 dark:to-zinc-950">
        <div className="border-b border-zinc-200/60 bg-white/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Select company &amp; period
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Choose vendor, company (or CRM customer), and dates — then view
                or download the PDF.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Filters — vendor/company/customer + date range.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className={isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
              <label className={formLabelClass}>
                Vendor
              </label>
              <SearchableSelect
                value={vendorId || null}
                onChange={(id) => {
                  setVendorId(id ?? "");
                  setTenantId("");
                  setCrmCompanyId("");
                  resetStatement();
                }}
                options={vendorOptions}
                placeholder="All vendors"
                loading={vendorsQuery.isLoading}
                isClearable
                ariaLabel="Vendor"
                loadingText="Loading vendors…"
                emptyText="No vendors"
              />
            </div>
            <div className={isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
              <label className={formLabelClass}>
                Tenant (company)
              </label>
              <TenantSearchableDropdown
                className="w-full"
                disabled={!Number.isFinite(vendorIdNum)}
                value={tenantId}
                enabled={Number.isFinite(vendorIdNum)}
                fetchParams={
                  Number.isFinite(vendorIdNum)
                    ? { vendor_id: vendorIdNum }
                    : undefined
                }
                onChange={(id) => {
                  setTenantId(id ?? "");
                  setCrmCompanyId("");
                  resetStatement();
                }}
                placeholder={
                  Number.isFinite(vendorIdNum)
                    ? "All tenants"
                    : "Select vendor first…"
                }
              />
            </div>
            {isSuperAdmin ? (
              <div className="lg:col-span-2">
                <label className={formLabelClass}>
                  Customer (CRM)
                </label>
                <CrmCustomerSearchableDropdown
                  className="w-full"
                  tenantId={tenantId}
                  disabled={!tenantId.trim()}
                  value={crmCompanyId}
                  onChange={(id) => {
                    setCrmCompanyId(id ?? "");
                    resetStatement();
                  }}
                  placeholder={
                    tenantId.trim()
                      ? "All customers"
                      : "Select tenant first…"
                  }
                />
              </div>
            ) : null}
            <div>
              <label className={formLabelClass}>
                Date from
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  resetStatement();
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
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  resetStatement();
                }}
                className={formControlClass}
              />
            </div>
            <div className="flex items-end gap-2">
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    resetStatement();
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleView()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {loadingStatement ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
                View
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {isSuperAdmin
              ? "Pick vendor and tenant, optionally choose CRM customer, then apply date range."
              : "Pick vendor and tenant, then apply date range."}
          </p>
        </div>
      </div>

      {showStatementPanel ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600">
                |
              </span>
              <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Statement
                {selectedCustomer ? (
                  <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
                    — {selectedCustomer.name}
                  </span>
                ) : null}
              </h3>
            </div>
          </div>
          <div className="p-5">
            {loadingStatement ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500 dark:text-zinc-400">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-600" />
                <p className="mt-4 text-sm">Loading statement…</p>
              </div>
            ) : null}
            {statementError && !loadingStatement ? (
              <div
                className="rounded-2xl border border-rose-200/90 bg-rose-50/80 p-5 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                role="alert"
              >
                <p className="font-semibold">Unable to load statement</p>
                <p className="mt-2">{statementError}</p>
                <p className="mt-3 text-xs opacity-90">
                  Check the company and date range, then try again.
                </p>
              </div>
            ) : null}
            {!loadingStatement && !statementError && !statementData ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                No statement data was returned. Adjust filters and try again.
              </div>
            ) : null}
            {statementData && !loadingStatement ? (
              <StatementDocument
                data={statementData}
                onDownloadPdf={() => void handleDownloadPdf()}
                downloading={downloading}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/50 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
          Select vendor, company (or CRM customer), and dates — then click{" "}
          <strong className="text-zinc-700 dark:text-zinc-300">
            View statement
          </strong>
          .
        </div>
      )}
    </div>
  );
}