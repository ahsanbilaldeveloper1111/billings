"use client";

import type { ReactNode } from "react";
import { useDisplayCurrency } from "@/contexts/currency-display-context";
import { useDashboardAnalyticsCurrency } from "@/contexts/dashboard-analytics-currency-context";
import {
  asArray,
  coerceAnalyticsRowList,
  toFiniteNumber,
  unwrapApiSuccessData,
} from "@/lib/dashboard/unwrapAnalyticsPayload";
import type {
  ProductSpentByCompany,
  ProfitLossSummary,
  RecentActivitySummary,
} from "@/models/Analytics";
import {
  shellElevatedPanelClass,
  shellSectionAccentBarClass,
  shellSectionWrapClass,
} from "@/lib/uiShellClasses";

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className={shellElevatedPanelClass}>
      <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      <div className="mt-4">
        {empty ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No data</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function trendPoints(values: number[]): { sx: number; sy: number }[] {
  const n = values.length;
  if (n === 0) return [];
  const max = Math.max(...values, 1e-9);
  return values.map((v, i) => ({
    sx: n <= 1 ? 0.5 : i / (n - 1),
    sy: 1 - v / max,
  }));
}

function TrendLineSvg({
  values,
  strokeClass,
}: {
  values: number[];
  strokeClass: string;
}) {
  const w = 100;
  const h = 36;
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const safeValues = values.map((v) =>
    Number.isFinite(v) ? v : 0,
  );
  const pts = trendPoints(safeValues);
  let coordStr: string;
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    const y = pad + innerH * pts[0]!.sy;
    coordStr = `${pad},${y} ${w - pad},${y}`;
  } else {
    coordStr = pts
      .map((p) => `${pad + p.sx * innerW},${pad + p.sy * innerH}`)
      .join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-28 w-full text-zinc-900 dark:text-zinc-100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        className={strokeClass}
        points={coordStr}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function compactAmount(v: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function ByMonthAxisChart({
  rows,
  currencyCode,
}: {
  rows: { label: string; value: number }[];
  currencyCode: string;
}) {
  if (rows.length === 0) return null;
  const values = rows.map((r) => (Number.isFinite(r.value) ? r.value : 0));
  const maxValue = Math.max(...values, 1);
  const yTicks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="rounded-xl border border-zinc-200/70 bg-white/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/35">
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <div className="relative h-56">
          {yTicks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 -translate-y-1/2 text-right text-[11px] text-zinc-500 dark:text-zinc-400"
              style={{ top: `${(1 - t) * 100}%` }}
            >
              {currencyCode} {compactAmount(maxValue * t)}
            </div>
          ))}
        </div>

        <div className="relative h-56 border-l border-b border-zinc-300 dark:border-zinc-600">
          {yTicks.map((t) => (
            <div
              key={t}
              className="pointer-events-none absolute left-0 right-0 border-t border-zinc-200/80 dark:border-zinc-700/60"
              style={{ top: `${(1 - t) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 pb-1">
            {rows.map((row, i) => {
              const hPct = (values[i]! / maxValue) * 100;
              return (
                <div key={`${row.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    {values[i]! > 0 ? compactAmount(values[i]!) : ""}
                  </div>
                  <div className="relative flex h-44 w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-sky-600 to-cyan-400 shadow-[0_6px_14px_-6px_rgba(14,165,233,0.65)]"
                      style={{ height: `${Math.max(1.5, hPct)}%` }}
                      title={`${row.label}: ${currencyCode} ${values[i]!.toLocaleString()}`}
                    />
                  </div>
                  <div className="w-full truncate text-center text-[11px] text-zinc-600 dark:text-zinc-300">
                    {row.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function HorizontalBars({
  title,
  rows,
  labelKey,
  valueKey,
  formatValue,
  maxRows = 8,
}: {
  title: string;
  rows: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  formatValue: (n: number) => string;
  maxRows?: number;
}) {
  const list = asArray<Record<string, unknown>>(rows).slice(0, maxRows);
  const vals = list.map((r) => toFiniteNumber(r[valueKey]));
  const max = Math.max(...vals, 1e-9);
  const empty = list.length === 0;

  return (
    <ChartCard title={title} empty={empty}>
      <ul className="space-y-2.5">
        {list.map((row, i) => {
          const label = String(row[labelKey] ?? `—`);
          const v = toFiniteNumber(row[valueKey]);
          const pct = Math.min(100, (v / max) * 100);
          return (
            <li key={`${label}-${i}`}>
              <div className="mb-0.5 flex justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">
                  {label}
                </span>
                <span className="shrink-0 tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                  {formatValue(v)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

function normalizeByMonthsSeries(
  data: unknown,
): { label: string; value: number }[] | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const rows = data.filter(
      (x): x is Record<string, unknown> =>
        x != null && typeof x === "object" && !Array.isArray(x),
    );
    if (rows.length === 0) return [];
    const first = rows[0]!;
    const keys = Object.keys(first);
    const labelKey =
      keys.find((k) => /^(month|period|label|name|date)$/i.test(k)) ??
      keys[0] ??
      "label";
    const preferredValueKeys = [
      "total_amount",
      "paid_amount",
      "outstanding_amount",
      "amount",
      "value",
      "total",
      "revenue",
      "expenses",
    ];
    const valueKey =
      preferredValueKeys.find((k) => keys.includes(k)) ??
      keys.find(
      (k) =>
        k !== labelKey &&
        (typeof first[k] === "number" ||
          (typeof first[k] === "string" && first[k] !== "")),
      );
    if (!valueKey) return null;
    return rows.map((r) => ({
      label: String(r[labelKey] ?? "—"),
      value: toFiniteNumber(r[valueKey]),
    }));
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    // Common backend shape: { data: [...], ...meta }
    if ("data" in o) {
      const fromData = normalizeByMonthsSeries(o.data);
      if (fromData != null) return fromData;
    }
    return Object.entries(o)
      .filter(
        ([, v]) =>
          typeof v === "number" ||
          (typeof v === "string" && Number.isFinite(Number.parseFloat(v))),
      )
      .map(([label, v]) => ({
        label,
        value: toFiniteNumber(v),
      }));
  }
  return null;
}

type SectionProps = {
  profitLossPayload: unknown;
  recentActivityPayload: unknown;
  productsSpentPayload: unknown;
  byMonthsPayload: unknown;
};

/** Must render under {@link DashboardAnalyticsCurrencyProvider}. */
export function DashboardMoreAnalyticsSection({
  profitLossPayload,
  recentActivityPayload,
  productsSpentPayload,
  byMonthsPayload,
}: SectionProps) {
  const { formatAnalyticsAmount } = useDashboardAnalyticsCurrency();
  const { computedDefault, currencyCode } = useDisplayCurrency();
  const fmtMoney = (n: number) => formatAnalyticsAmount(n);
  const chartCurrencyCode =
    currencyCode.trim() !== "" ? currencyCode : computedDefault;

  const pl = unwrapApiSuccessData<ProfitLossSummary>(profitLossPayload);
  const activity = unwrapApiSuccessData<RecentActivitySummary>(
    recentActivityPayload,
  );
  const spent = unwrapApiSuccessData<ProductSpentByCompany[] | unknown>(
    productsSpentPayload,
  );
  const rawByMonths = unwrapApiSuccessData<unknown>(byMonthsPayload);
  const byMonthSeries = normalizeByMonthsSeries(rawByMonths);
  const byMonthRows = asArray<{ label: string; value: number }>(byMonthSeries);

  const plEmpty = !pl;

  const activityEmpty = !activity;

  const spentRows = coerceAnalyticsRowList(spent);
  const spentEmpty = spentRows.length === 0;

  const byMonthEmpty =
    byMonthSeries == null ||
    byMonthRows.length === 0 ||
    byMonthRows.every((x) => x.value === 0);

  return (
    <section className="mt-10">
      <div className={`relative ${shellSectionWrapClass}`}>
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-gradient-to-bl from-violet-200/12 to-transparent blur-3xl dark:from-violet-500/8" aria-hidden />
        <div className="relative mb-8">
          <div className="flex gap-4">
            <span className={shellSectionAccentBarClass} aria-hidden />
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                Profit, activity & comparisons
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Summary totals, recent activity, spend by company, and monthly series
                from the analytics API.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Profit & loss" empty={plEmpty}>
          {pl ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-100/80 bg-gradient-to-br from-zinc-50/95 to-teal-50/22 p-3 dark:border-zinc-800/60 dark:from-zinc-900/60 dark:to-teal-950/18">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Revenue
                </p>
                <p className="mt-1 tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {fmtMoney(toFiniteNumber(pl.total_revenue))}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100/80 bg-gradient-to-br from-zinc-50/95 to-teal-50/22 p-3 dark:border-zinc-800/60 dark:from-zinc-900/60 dark:to-teal-950/18">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Expenses
                </p>
                <p className="mt-1 tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {fmtMoney(toFiniteNumber(pl.total_expenses))}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100/80 bg-gradient-to-br from-zinc-50/95 to-teal-50/22 p-3 dark:border-zinc-800/60 dark:from-zinc-900/60 dark:to-teal-950/18">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Net profit
                </p>
                <p className="mt-1 tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {fmtMoney(toFiniteNumber(pl.net_profit))}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100/80 bg-gradient-to-br from-zinc-50/95 to-teal-50/22 p-3 dark:border-zinc-800/60 dark:from-zinc-900/60 dark:to-teal-950/18">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Margin
                </p>
                <p className="mt-1 tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {toFiniteNumber(pl.profit_margin).toFixed(1)}%
                </p>
              </div>
            </div>
          ) : null}
        </ChartCard>

        <ChartCard title="Recent activity" empty={activityEmpty}>
          {activity ? (
            <ul className="space-y-2.5 text-sm">
              {(
                [
                  ["Invoices created", activity.invoices_created],
                  ["Expenses created", activity.expenses_created],
                  ["Inventory updates", activity.inventory_updated],
                  ["Companies created", activity.companies_created],
                  ["Customers created", activity.customers_created],
                ] as const
              ).map(([label, raw]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0 dark:border-zinc-800/80"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {label}
                  </span>
                  <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                    {toFiniteNumber(raw).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </ChartCard>

        <HorizontalBars
          title="Product spend by company"
          rows={spentRows}
          labelKey="product_name"
          valueKey="total_paid_amount"
          formatValue={fmtMoney}
          maxRows={10}
        />

        <div className="sm:col-span-2 xl:col-span-3">
          <ChartCard title="By month" empty={byMonthEmpty}>
            {!byMonthEmpty ? (
              <>
                <ByMonthAxisChart
                  rows={byMonthRows.slice(0, 12)}
                  currencyCode={chartCurrencyCode}
                />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {byMonthRows.slice(0, 12).map((row, i) => (
                    <span key={`${row.label}-${i}`}>
                      {row.label}:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {fmtMoney(row.value)}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </ChartCard>
        </div>
        </div>
      </div>
    </section>
  );
}
