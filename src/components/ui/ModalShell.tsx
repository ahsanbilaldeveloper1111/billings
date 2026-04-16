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
  modalSubtitleClass,
  modalTitleClass,
} from "@/lib/uiModalClasses";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** For `aria-labelledby` — must match header `id` when provided. */
  titleId: string;
  children: ReactNode;
  /** Sticky footer below scroll area (e.g. action buttons). */
  footer?: ReactNode;
  /** Tailwind max-width on panel (default large detail). */
  maxWidthClassName?: string;
  /** Tailwind max-height on panel. */
  maxHeightClassName?: string;
};

/**
 * Shared modal frame: backdrop, teal header strip, scrollable body.
 * Use for view/detail modals that are not {@link RecordDetailModal} or {@link FormModal}.
 */
export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  titleId,
  children,
  footer,
  maxWidthClassName = "max-w-5xl",
  maxHeightClassName = "max-h-[min(92vh,900px)]",
}: ModalShellProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={modalBackdropClass}
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidthClassName} ${maxHeightClassName} ${modalPanelBaseClass}`}
      >
        <div className={modalHeaderClass}>
          <div className={modalHeaderGlowClass} aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span
                className="mt-0.5 hidden h-12 w-1 shrink-0 rounded-full bg-gradient-to-b from-teal-500 to-cyan-600 shadow-sm shadow-teal-500/30 sm:block dark:shadow-teal-400/20"
                aria-hidden
              />
              <div className="min-w-0">
                <h2 id={titleId} className={modalTitleClass}>
                  {title}
                </h2>
                {subtitle ? (
                  <p className={modalSubtitleClass}>{subtitle}</p>
                ) : null}
              </div>
            </div>
            <button type="button" onClick={onClose} className={modalCloseButtonClass}>
              Close
            </button>
          </div>
        </div>
        <div className={modalBodyClass}>{children}</div>
        {footer ? <div className={modalFooterClass}>{footer}</div> : null}
      </div>
    </div>
  );
}
