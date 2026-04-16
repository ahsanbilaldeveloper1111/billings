/**
 * Shared layout / surface styling aligned with the dashboard reference:
 * soft elevation, teal accents, generous radius.
 */

/** Soft diffuse shadow — large blur, low opacity */
export const shellSoftShadow =
  "shadow-[0_10px_44px_-18px_rgba(15,23,42,0.09)] dark:shadow-[0_14px_48px_-14px_rgba(0,0,0,0.48)]";

/** Standard elevated panel (charts, analytics blocks) */
export const shellElevatedPanelClass = `rounded-2xl border border-zinc-200/50 bg-gradient-to-br from-white via-white to-zinc-50/40 p-5 ${shellSoftShadow} ring-1 ring-zinc-900/[0.025] dark:border-zinc-800/60 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/40 dark:ring-white/[0.04]`;

/** Large section wrapper (e.g. dashboard counter region) */
export const shellSectionWrapClass = `relative overflow-hidden rounded-2xl border border-zinc-200/45 bg-white/80 p-6 backdrop-blur-[2px] sm:rounded-3xl sm:p-8 ${shellSoftShadow} ring-1 ring-zinc-900/[0.02] dark:border-zinc-800/45 dark:bg-zinc-950/55 dark:ring-white/[0.03]`;

/** Vertical accent bar for section titles (reference: teal bar beside headers) */
export const shellSectionAccentBarClass =
  "mt-0.5 h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-500 via-teal-600 to-cyan-600 shadow-[0_2px_12px_-2px_rgba(13,148,136,0.35)] dark:shadow-[0_2px_14px_-2px_rgba(45,212,191,0.25)]";
