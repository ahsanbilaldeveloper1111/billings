type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  /** Rotates pastel surface + corner glow */
  accentVariant?: number;
};

/** Subtle card-face gradients (mesh-style, reference dashboard). */
const CARD_SURFACE: readonly string[] = [
  "bg-gradient-to-br from-white via-teal-50/70 to-cyan-50/55 dark:from-zinc-950 dark:via-teal-950/35 dark:to-cyan-950/25",
  "bg-gradient-to-br from-white via-violet-50/60 to-fuchsia-50/45 dark:from-zinc-950 dark:via-violet-950/30 dark:to-fuchsia-950/20",
  "bg-gradient-to-br from-white via-orange-50/55 to-rose-50/45 dark:from-zinc-950 dark:via-orange-950/25 dark:to-rose-950/22",
  "bg-gradient-to-br from-white via-sky-50/60 to-blue-50/40 dark:from-zinc-950 dark:via-sky-950/28 dark:to-blue-950/20",
  "bg-gradient-to-br from-white via-pink-50/50 to-purple-50/40 dark:from-zinc-950 dark:via-pink-950/22 dark:to-purple-950/20",
  "bg-gradient-to-br from-white via-emerald-50/55 to-teal-50/50 dark:from-zinc-950 dark:via-emerald-950/28 dark:to-teal-950/25",
];

const ACCENT_BLOBS: readonly { blob: string; hover: string }[] = [
  {
    blob: "pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br from-teal-300/25 via-cyan-200/15 to-transparent blur-2xl dark:from-teal-500/18 dark:via-cyan-500/10",
    hover:
      "hover:border-teal-300/55 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-12px_rgba(13,148,136,0.14)] dark:hover:border-teal-700/45",
  },
  {
    blob: "pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-violet-300/22 to-fuchsia-200/12 blur-2xl dark:from-violet-500/16 dark:to-fuchsia-600/10",
    hover:
      "hover:border-violet-300/50 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-12px_rgba(139,92,246,0.12)] dark:hover:border-violet-700/45",
  },
  {
    blob: "pointer-events-none absolute -right-8 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-gradient-to-br from-orange-200/25 to-rose-200/14 blur-2xl dark:from-orange-500/14 dark:to-rose-600/10",
    hover:
      "hover:border-orange-300/50 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-12px_rgba(251,146,60,0.12)] dark:hover:border-orange-700/45",
  },
  {
    blob: "pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-bl from-sky-300/22 to-blue-200/12 blur-2xl dark:from-sky-500/15 dark:to-blue-600/10",
    hover:
      "hover:border-sky-300/50 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-12px_rgba(14,165,233,0.12)] dark:hover:border-sky-700/45",
  },
  {
    blob: "pointer-events-none absolute -bottom-6 right-1/4 h-28 w-28 rounded-full bg-gradient-to-t from-pink-200/22 to-purple-200/12 blur-2xl dark:from-pink-500/14 dark:to-purple-600/10",
    hover:
      "hover:border-pink-300/45 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-12px_rgba(236,72,153,0.11)] dark:hover:border-pink-700/45",
  },
  {
    blob: "pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-200/22 to-teal-200/14 blur-2xl dark:from-emerald-500/14 dark:to-teal-600/10",
    hover:
      "hover:border-emerald-300/50 hover:shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_14px_36px_-12px_rgba(16,185,129,0.12)] dark:hover:border-emerald-700/45",
  },
];

export function MetricCard({
  label,
  value,
  hint,
  trend,
  accentVariant = 0,
}: MetricCardProps) {
  const trendColor =
    trend === "up"
      ? "text-teal-600 dark:text-teal-400"
      : trend === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-zinc-500";

  const vi = ((accentVariant % ACCENT_BLOBS.length) + ACCENT_BLOBS.length) % ACCENT_BLOBS.length;
  const { blob, hover } = ACCENT_BLOBS[vi]!;
  const surface = CARD_SURFACE[vi]!;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200/50 shadow-[0_8px_36px_-16px_rgba(15,23,42,0.08)] ring-1 ring-zinc-900/[0.04] transition duration-300 hover:-translate-y-0.5 dark:border-zinc-800/60 dark:shadow-[0_10px_40px_-18px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] ${hover}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${surface}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_100%_0%,rgba(255,255,255,0.65),transparent_55%)] dark:bg-[radial-gradient(ellipse_90%_80%_at_100%_0%,rgba(255,255,255,0.04),transparent_50%)]"
        aria-hidden
      />
      <div className={blob} />
      <div className="relative z-[1] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-3 tabular-nums text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        {hint ? (
          <p className={`mt-2 text-xs ${trend ? trendColor : "text-zinc-500 dark:text-zinc-400"}`}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
