"use client";

import { useMemo, useState } from "react";
import { StaticFilterCard } from "@/components/crud/ListUiControls";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import { DashboardChartsSection } from "@/components/dashboard/DashboardChartsSection";
import { DashboardCountersGrid } from "@/components/dashboard/DashboardCountersGrid";
import { DashboardMoreAnalyticsSection } from "@/components/dashboard/DashboardMoreAnalyticsSection";
import { DashboardAnalyticsCurrencyProvider } from "@/contexts/dashboard-analytics-currency-context";
import { CrmCustomerSearchableDropdown } from "@/components/ui/CrmCustomerSearchableDropdown";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { dashboardCounterMetricEntries } from "@/lib/dashboard/dashboardCountersMetrics";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useVendors } from "@/hooks/vendors/useVendors";
import {
  useAnalyticsByMonths,
  useAnalyticsProductsSpentByCompany,
  useAnalyticsProfitLoss,
  useAnalyticsRecentActivity,
} from "@/hooks/analytics/useAnalyticsEndpoints";
import { useAnalyticsDashboardCharts } from "@/hooks/analytics/useAnalyticsDashboardCharts";
import { useAnalyticsDashboardCounters } from "@/hooks/analytics/useAnalyticsDashboardCounters";
import type { QueryParams } from "@/lib/api/http";
import { extractListRows } from "@/lib/api/extractApiData";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import type { DashboardCounters } from "@/models/Analytics";

export function DashboardOverview() {
  const { isSuperAdmin } = usePermissions();
  const [vendorId, setVendorId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [crmCompanyId, setCrmCompanyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const vendorIdNum = vendorId.trim() ? Number.parseInt(vendorId, 10) : NaN;

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

  const analyticsParams = useMemo((): QueryParams => {
    const t = tenantId.trim();
    const c = crmCompanyId.trim();
    const from = startDate.trim();
    const to = endDate.trim();
    return {
      // Keep both key styles for compatibility across analytics endpoints.
      ...(t ? { tenant_id: t, tenantId: t } : {}),
      ...(c ? { crm_company_id: c, crmCompanyId: c } : {}),
      ...(from ? { start_date: from, startDate: from } : {}),
      ...(to ? { end_date: to, endDate: to } : {}),
    };
  }, [tenantId, crmCompanyId, startDate, endDate]);

  const dashboardCountersQuery = useAnalyticsDashboardCounters(analyticsParams);
  const chartsQuery = useAnalyticsDashboardCharts(analyticsParams);
  const profitLossQuery = useAnalyticsProfitLoss(analyticsParams);
  const recentActivityQuery = useAnalyticsRecentActivity(analyticsParams);
  const productsSpentQuery = useAnalyticsProductsSpentByCompany(analyticsParams);
  const byMonthsQuery = useAnalyticsByMonths({
    ...analyticsParams,
    limit: 12,
  });

  const counterRows = useMemo(() => {
    const raw = unwrapApiSuccessData<DashboardCounters>(
      dashboardCountersQuery.data,
    );
    return dashboardCounterMetricEntries(raw);
  }, [dashboardCountersQuery.data]);

  const moreAnalyticsLoading =
    profitLossQuery.isLoading ||
    recentActivityQuery.isLoading ||
    productsSpentQuery.isLoading ||
    byMonthsQuery.isLoading;

  const chartsError =
    chartsQuery.error instanceof Error
      ? chartsQuery.error
      : new Error(
          chartsQuery.error != null ? String(chartsQuery.error) : "Error",
        );

  const skeletonCount = 16;

  return (
    <>
      <div className="relative z-30">
        <StaticFilterCard
          title="Dashboard filters"
          subtitle="Search is debounced before calling the API."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={formLabelClass}>
                Vendor
              </label>
              <SearchableSelect
                value={vendorId || null}
                onChange={(id) => {
                  setVendorId(id ?? "");
                  setTenantId("");
                  setCrmCompanyId("");
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
            <div>
              <label className={formLabelClass}>
                Tenant (company)
              </label>
              <TenantSearchableDropdown
                className="w-full"
                disabled={!Number.isFinite(vendorIdNum)}
                value={tenantId}
                enabled={Number.isFinite(vendorIdNum)}
                fetchParams={
                  Number.isFinite(vendorIdNum) ? { vendor_id: vendorIdNum } : undefined
                }
                onChange={(id) => {
                  setTenantId(id ?? "");
                  setCrmCompanyId("");
                }}
                placeholder={
                  Number.isFinite(vendorIdNum) ? "All tenants" : "Select vendor first…"
                }
              />
            </div>
            <div>
              <label className={formLabelClass}>
                Customer (CRM)
              </label>
              <CrmCustomerSearchableDropdown
                className="w-full"
                tenantId={tenantId}
                disabled={!isSuperAdmin || !tenantId.trim()}
                value={crmCompanyId}
                onChange={(id) => setCrmCompanyId(id ?? "")}
                placeholder={
                  tenantId.trim() ? "All customers" : "Select tenant first…"
                }
              />
            </div>
            <div>
              <label className={formLabelClass}>
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
                className={formControlClass}
              />
            </div>
            <div>
              <label className={formLabelClass}>
                End date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={formControlClass}
              />
            </div>
          </div>
        </StaticFilterCard>
      </div>

      <DashboardAnalyticsCurrencyProvider
        tenantId={tenantId}
        vendorId={vendorId}
      >
        <section className="relative z-10 rounded-2xl border border-zinc-200/50 bg-white/45 p-6 shadow-[0_4px_32px_-12px_rgba(15,23,42,0.07)] backdrop-blur-[2px] dark:border-zinc-800/50 dark:bg-zinc-950/40 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)] sm:rounded-3xl sm:p-8">
          <div className="mb-8">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/40"
                aria-hidden
              />
              Counters
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Key totals from dashboard counters: companies, invoices, expenses,
              inventory, and more.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <DashboardCountersGrid
              rows={counterRows}
              isLoading={dashboardCountersQuery.isLoading}
              isError={dashboardCountersQuery.isError}
              skeletonCount={skeletonCount}
            />
          </div>
        </section>

        <DashboardChartsSection
          payload={chartsQuery.data}
          isLoading={chartsQuery.isLoading}
          isError={chartsQuery.isError}
          error={chartsQuery.isError ? chartsError : null}
        />

      {moreAnalyticsLoading ? (
        <section className="mt-10 rounded-2xl border border-zinc-200/40 bg-white/30 p-6 dark:border-zinc-800/40 dark:bg-zinc-950/30 sm:rounded-3xl sm:p-8">
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              <span
                className="h-2 w-2 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 shadow-sm shadow-sky-500/35"
                aria-hidden
              />
              Profit, activity & comparisons
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Loading additional analytics…
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl bg-gradient-to-br from-zinc-100/90 via-white to-teal-50/20 dark:from-zinc-800 dark:via-zinc-900 dark:to-teal-950/15"
              />
            ))}
          </div>
        </section>
      ) : (
        <DashboardMoreAnalyticsSection
          profitLossPayload={profitLossQuery.data}
          recentActivityPayload={recentActivityQuery.data}
          productsSpentPayload={productsSpentQuery.data}
          byMonthsPayload={byMonthsQuery.data}
        />
      )}
      </DashboardAnalyticsCurrencyProvider>
    </>
  );
}
