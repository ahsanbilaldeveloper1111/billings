"use client";

import type { ReactNode } from "react";
import { useDashboardAnalyticsCurrency } from "@/contexts/dashboard-analytics-currency-context";
import {
  asArray,
  toFiniteNumber,
  unwrapApiSuccessData,
} from "@/lib/dashboard/unwrapAnalyticsPayload";
import type {
  DashboardChartsData,
  InventoryValueItem,
  RevenueTrendItem,
  TopSellingProduct,
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

/** Normalized [0,1] points for SVG polyline (x = index, y = value). */
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

  const safeValues = values.map((v) => (Number.isFinite(v) ? v : 0));
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

function TrendBlock({
  title,
  items,
  valueKey,
  strokeClass,
  formatY,
}: {
  title: string;
  items: { month?: string; label?: string }[];
  valueKey: "revenue" | "expenses";
  strokeClass: string;
  formatY: (n: number) => string;
}) {
  const safeItems = asArray<{ month?: string; label?: string }>(items);
  const values = safeItems.map((row) =>
    toFiniteNumber((row as Record<string, unknown>)[valueKey]),
  );
  const empty = values.length === 0 || values.every((v) => v === 0);

  return (
    <ChartCard title={title} empty={empty}>
      {!empty ? <TrendLineSvg values={values} strokeClass={strokeClass} /> : null}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        {safeItems.slice(0, 6).map((row, i) => {
          const label =
            "month" in row && row.month
              ? String(row.month)
              : String((row as { label?: string }).label ?? i + 1);
          const v = toFiniteNumber((row as Record<string, unknown>)[valueKey]);
          return (
            <span key={`${label}-${i}`}>
              {label}:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {formatY(v)}
              </span>
            </span>
          );
        })}
      </div>
    </ChartCard>
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
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
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

type ChartsSectionProps = {
  payload: unknown;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

/** Must render under {@link DashboardAnalyticsCurrencyProvider}. */
export function DashboardChartsSection({
  payload,
  isLoading,
  isError,
  error,
}: ChartsSectionProps) {
  const { formatAnalyticsAmount: fmtMoney } = useDashboardAnalyticsCurrency();

  const data = unwrapApiSuccessData<DashboardChartsData>(payload);

  if (isError) {
    return (
      <section id="analytics" className="mt-14 scroll-mt-24">
        <div className={`${shellSectionWrapClass}`}>
          <div className="flex gap-4">
            <span className={shellSectionAccentBarClass} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                Analytics
              </h2>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
            Analytics could not load. {error?.message ?? "Unknown error"}
          </p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section id="analytics" className="mt-14 scroll-mt-24">
        <div className={`${shellSectionWrapClass}`}>
          <div className="flex gap-4">
            <span className={shellSectionAccentBarClass} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                Analytics
              </h2>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl bg-gradient-to-br from-zinc-100/90 via-white to-teal-50/22 dark:from-zinc-800 dark:via-zinc-900 dark:to-teal-950/15"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section id="analytics" className="mt-14 scroll-mt-24">
        <div className={`${shellSectionWrapClass}`}>
          <div className="flex gap-4">
            <span className={shellSectionAccentBarClass} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                Analytics
              </h2>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                No chart data is available yet.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const revenue = asArray<RevenueTrendItem>(data.revenue_trend);
  const invVal = asArray<InventoryValueItem>(data.inventory_value);
  const top = asArray<TopSellingProduct>(data.top_products);

  return (
    <section id="analytics" className="mt-14 scroll-mt-24">
      <div className={`relative ${shellSectionWrapClass}`}>
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-gradient-to-tr from-cyan-200/12 to-transparent blur-3xl dark:from-cyan-500/8" aria-hidden />
        <div className="relative mb-8">
          <div className="flex gap-4">
            <span className={shellSectionAccentBarClass} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                Analytics
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Revenue and expense trends, inventory, expenses by category, and top
                products.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TrendBlock
            title="Revenue trend"
            items={revenue}
            valueKey="revenue"
            strokeClass="text-teal-600"
            formatY={fmtMoney}
          />
          {/* <TrendBlock
            title="Expense trend"
            items={expense}
            valueKey="expenses"
            strokeClass="text-amber-500"
            formatY={fmtMoney}
          />

          <HorizontalBars
            title="Expense breakdown"
            rows={expenseBreak as unknown as Record<string, unknown>[]}
            labelKey="category_name"
            valueKey="total_amount"
            formatValue={fmtMoney}
          /> */}
          <HorizontalBars
            title="Inventory value by category"
            rows={invVal as unknown as Record<string, unknown>[]}
            labelKey="category_name"
            valueKey="total_value"
            formatValue={fmtMoney}
          />
          <HorizontalBars
            title="Top products (revenue)"
            rows={top as unknown as Record<string, unknown>[]}
            labelKey="name"
            valueKey="total_revenue"
            formatValue={fmtMoney}
            maxRows={10}
          />
        </div>
      </div>
    </section>
  );
}
