/**
 * Shared form field chrome across filters, modals, and inline forms.
 * Single source of truth for control / label styling.
 */

export const formFieldSurfaceClass =
  "rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 hover:border-zinc-300/95 focus:border-teal-500/75 focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.35)] dark:hover:border-zinc-600 dark:focus:border-teal-400/70 dark:focus:ring-teal-400/22";

/** Primary labels for text fields, selects, and dates (teal dot + uppercase reference style) */
export const formLabelClass =
  "mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-teal-600 before:shadow-sm before:shadow-teal-600/25 before:content-[''] dark:text-zinc-400 dark:before:bg-teal-400 dark:before:shadow-teal-400/20";

/** Simple labels (e.g. login) without uppercase dot treatment */
export const formLabelPlainClass =
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
