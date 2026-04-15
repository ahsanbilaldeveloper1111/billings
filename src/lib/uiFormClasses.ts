/**
 * Shared form field chrome across filters, modals, and inline forms.
 * Single source of truth for control / label styling.
 */

export const formFieldSurfaceClass =
  "rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 hover:border-zinc-300 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-emerald-500/60 dark:focus:ring-emerald-500/25";

/** Primary labels for text fields, selects, and dates */
export const formLabelClass =
  "mb-1.5 block text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-200";

/** Full-width inputs, selects, textareas */
export const formControlClass = `w-full ${formFieldSurfaceClass}`;

/** Flex-growing control (combobox trigger, searchable inner field) */
export const formControlFlex1Class = `min-w-0 flex-1 ${formFieldSurfaceClass}`;

/** Same as {@link formControlFlex1Class} with disabled affordances */
export const formControlFlex1DisabledClass = `${formControlFlex1Class} disabled:cursor-not-allowed disabled:opacity-60`;

/** Wide flexible control (e.g. pricing toolbars) */
export const formControlGrowMinClass = `min-w-[12rem] flex-1 ${formFieldSurfaceClass}`;

/** Checkbox / toggle rows aligned with form controls */
export const formToggleRowClass = `flex w-full cursor-pointer items-center gap-3 ${formFieldSurfaceClass}`;
