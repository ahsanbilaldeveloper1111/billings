/**
 * Shared modal overlay + panel chrome (teal accent, soft elevation).
 */

export const modalBackdropClass =
  "absolute inset-0 bg-zinc-900/45 backdrop-blur-[3px] transition-opacity dark:bg-black/58";

export const modalPanelBaseClass =
  "relative z-10 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.18)] ring-1 ring-teal-900/[0.06] dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[0_28px_72px_-20px_rgba(0,0,0,0.65)] dark:ring-white/[0.06]";

export const modalHeaderClass =
  "relative shrink-0 border-b border-zinc-200/65 bg-gradient-to-r from-teal-50/90 via-white to-cyan-50/35 px-5 py-4 dark:border-zinc-800/80 dark:from-teal-950/35 dark:via-zinc-950 dark:to-cyan-950/15 sm:px-6";

export const modalHeaderGlowClass =
  "pointer-events-none absolute -right-12 -top-10 h-32 w-40 rounded-full bg-gradient-to-br from-teal-300/25 to-transparent blur-2xl dark:from-teal-500/12";

export const modalTitleClass =
  "text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50";

export const modalSubtitleClass = "mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400";

export const modalCloseButtonClass =
  "rounded-xl border border-zinc-200/80 bg-white/90 px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm shadow-zinc-900/[0.04] transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300 dark:shadow-black/30 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export const modalBodyClass = "min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-zinc-50/40 to-white px-5 py-5 dark:from-zinc-950 dark:to-zinc-950 sm:px-7 sm:py-6";

export const modalFooterClass =
  "relative z-20 flex shrink-0 justify-end gap-2 border-t border-zinc-200/65 bg-zinc-50/80 px-5 py-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/40 sm:px-6";

export const modalSecondaryButtonClass =
  "rounded-xl border border-zinc-200/90 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm shadow-zinc-900/[0.04] transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800";

export const modalPrimaryButtonClass =
  "rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-500 disabled:opacity-50 dark:shadow-teal-950/40";

export const modalConfirmPanelClass = `${modalPanelBaseClass} max-w-md p-0`;
