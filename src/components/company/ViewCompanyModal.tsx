"use client";

import { CompanyProfileView } from "@/components/company/CompanyProfileView";
import { ModalShell } from "@/components/ui/ModalShell";
import { useCompany } from "@/hooks/company/useCompany";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { modalPrimaryButtonClass, modalSecondaryButtonClass } from "@/lib/uiModalClasses";
import type { Company } from "@/models/Company";

type ViewCompanyModalProps = {
  show: boolean;
  onHide: () => void;
  companyId: number | string | null;
  onEdit?: (company: Company) => void;
};

export function ViewCompanyModal({
  show,
  onHide,
  companyId,
  onEdit,
}: ViewCompanyModalProps) {
  const detailQuery = useCompany(show ? companyId : null, {
    load_profile: true,
    load_outstanding_amount: true,
  });

  const company = unwrapApiSuccessData<Company>(detailQuery.data);
  const isLoading = detailQuery.isPending && show && companyId != null;
  const error = detailQuery.isError ? detailQuery.error : null;

  return (
    <ModalShell
      open={show}
      onClose={onHide}
      title="Tenant details"
      titleId="view-company-title"
      maxWidthClassName="max-w-5xl"
      footer={
        <>
          <button type="button" onClick={onHide} className={modalSecondaryButtonClass}>
            Close
          </button>
          {company && onEdit ? (
            <button
              type="button"
              onClick={() => {
                onEdit(company);
                onHide();
              }}
              className={modalPrimaryButtonClass}
            >
              Edit
            </button>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent dark:border-teal-400"
            aria-hidden
          />
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Loading tenant details…
          </p>
        </div>
      ) : error ? (
        <p
          className="rounded-xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          Failed to load tenant details. Please try again.
        </p>
      ) : company && !isLoading ? (
        <CompanyProfileView profile={company} />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>
      )}
    </ModalShell>
  );
}
