"use client";

import type { ReactNode } from "react";
import {
  modalBackdropClass,
  modalBodyClass,
  modalCloseButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalHeaderGlowClass,
  modalPanelBaseClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalTitleClass,
} from "@/lib/uiModalClasses";

type FormModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  loading?: boolean;
  /** Panel width (default `max-w-lg`). Use e.g. `max-w-2xl` for two-column forms. */
  panelClassName?: string;
};

export function FormModal({
  open,
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = "Save",
  loading,
  panelClassName,
}: FormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className={modalBackdropClass}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`${modalPanelBaseClass} max-h-[90vh] w-full ${panelClassName ?? "max-w-lg"}`}
      >
        <div className={modalHeaderClass}>
          <div className={modalHeaderGlowClass} aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <h2 className={modalTitleClass}>{title}</h2>
            <button type="button" onClick={onClose} className={modalCloseButtonClass}>
              Close
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={`${modalBodyClass} space-y-4`}>{children}</div>
          <div className={modalFooterClass}>
            <button type="button" onClick={onClose} className={modalSecondaryButtonClass}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={modalPrimaryButtonClass}
            >
              {loading ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-teal-600 before:shadow-sm before:content-[''] dark:text-zinc-400 dark:before:bg-teal-400">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
