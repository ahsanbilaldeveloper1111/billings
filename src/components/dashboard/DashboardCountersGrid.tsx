"use client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { useDashboardAnalyticsCurrency } from "@/contexts/dashboard-analytics-currency-context";
import type { CounterMetricEntry } from "@/lib/dashboard/analyticsCounters";

type DashboardCountersGridProps = Readonly<{
  rows: CounterMetricEntry[];
  isLoading: boolean;
  isError: boolean;
  skeletonCount: number;
}>;

/**
 * Counter cards — must render under {@link DashboardAnalyticsCurrencyProvider}.
 */
export function DashboardCountersGrid({
  rows,
  isLoading,
  isError,
  skeletonCount,
}: DashboardCountersGridProps) {
  const { formatCounterMetric } = useDashboardAnalyticsCurrency();

  if (isLoading) {
    return (
      <>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-gradient-to-br from-zinc-100/90 via-teal-50/30 to-cyan-50/25 ring-1 ring-zinc-900/[0.04] dark:from-zinc-800 dark:via-teal-950/20 dark:to-cyan-950/15 dark:ring-white/[0.05]"
          />
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-rose-600 dark:text-rose-400">
        Counters could not load.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No counter data returned.
      </p>
    );
  }

  return (
    <>
      {rows.map((row, index) => (
        <MetricCard
          key={row.key}
          label={row.label}
          value={formatCounterMetric(row)}
          accentVariant={index}
        />
      ))}
    </>
  );
}
