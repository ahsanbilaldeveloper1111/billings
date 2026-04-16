"use client";

import {
  modalBackdropClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
} from "@/lib/uiModalClasses";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  /** Optional second line highlighting what will be removed (e.g. record name). */
  itemName?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  /** Text shown on the confirm button while `loading` is true. */
  loadingActionLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  itemName,
  confirmLabel = "Confirm",
  danger = false,
  loading,
  loadingActionLabel = "Working…",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className={modalBackdropClass}
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.2)] ring-1 ring-teal-900/[0.06] dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[0_28px_72px_-20px_rgba(0,0,0,0.65)] dark:ring-white/[0.06]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div
          className={`h-1 w-full ${danger ? "bg-gradient-to-r from-rose-500 to-rose-600" : "bg-gradient-to-r from-teal-500 to-cyan-600"}`}
          aria-hidden
        />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span
                className={`mt-0.5 hidden h-10 w-1 shrink-0 rounded-full sm:block ${
                  danger
                    ? "bg-gradient-to-b from-rose-500 to-rose-700"
                    : "bg-gradient-to-b from-teal-500 to-cyan-600"
                }`}
                aria-hidden
              />
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl border border-zinc-200/80 bg-zinc-50 px-2 py-1 text-zinc-500 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Close"
              onClick={onCancel}
            >
              <span aria-hidden className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
          {itemName != null && itemName !== "" ? (
            <p className="mt-4 rounded-xl border border-rose-200/70 bg-rose-50/80 px-3 py-2.5 text-sm dark:border-rose-900/40 dark:bg-rose-950/25">
              <span className="font-semibold text-rose-800 dark:text-rose-300">
                Item to delete:{" "}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {itemName}
              </span>
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className={`${modalSecondaryButtonClass} disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={
                danger
                  ? "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-900/25 transition hover:bg-rose-500 disabled:opacity-50 dark:shadow-rose-950/40"
                  : modalPrimaryButtonClass
              }
            >
              {loading ? loadingActionLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
