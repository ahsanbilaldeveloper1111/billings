"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CustomerPaymentCardsEditor } from "@/components/customers/CustomerPaymentCardsEditor";
import { CustomerSavedCardsInlineSummary } from "@/components/customers/CustomerSavedCardsInlineSummary";
import { useTenantDisplayNameMap } from "@/hooks/company/useTenantDisplayNameMap";
import { useCrmCompanyNameMap } from "@/hooks/crm/useCrmCompanyNameMap";
import { useCustomer } from "@/hooks/customers/useCustomer";
import { useMainAppResellerNameMap } from "@/hooks/resellers/useMainAppResellerNameMap";
import { customerApiResourceKey } from "@/lib/customers/customerApiResourceKey";
import { customerDisplayLabel } from "@/lib/customers/customerDisplayLabel";
import { customerStripeCrmId } from "@/lib/customers/customerStripeCrmId";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { ModalShell } from "@/components/ui/ModalShell";
import { customerProductPricingPath } from "@/lib/navigation/appPaths";
import { modalPrimaryButtonClass, modalSecondaryButtonClass } from "@/lib/uiModalClasses";
import type { Customer } from "@/models/Customer";

type ViewCustomerModalProps = {
  show: boolean;
  onHide: () => void;
  customerId: string | null;
  onEdit?: (customer: Customer) => void;
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function GridField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 sm:mb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</p>
    </div>
  );
}

function fmtProfile(
  v: string | number | null | undefined,
  empty = "—",
): string {
  if (v === null || v === undefined) return empty;
  return String(v);
}

export function ViewCustomerModal({
  show,
  onHide,
  customerId,
  onEdit,
}: ViewCustomerModalProps) {
  const router = useRouter();
  const companyTenantDisplayMap = useTenantDisplayNameMap();
  const resellerNameMap = useMainAppResellerNameMap();
  const tenantNameMap = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of new Set([
      ...Object.keys(companyTenantDisplayMap),
      ...Object.keys(resellerNameMap),
    ])) {
      const v =
        companyTenantDisplayMap[k]?.trim() ||
        resellerNameMap[k]?.trim() ||
        "";
      if (v) out[k] = v;
    }
    return out;
  }, [companyTenantDisplayMap, resellerNameMap]);
  const crmCompanyNameMap = useCrmCompanyNameMap();

  const detailQuery = useCustomer(show ? customerId : null, {
    load_profile: true,
    load_invoices_count: true,
  });

  const customer = unwrapApiSuccessData<Customer>(detailQuery.data);
  const isLoading = detailQuery.isPending && show && customerId != null;
  const loadError = detailQuery.isError ? detailQuery.error : null;

  const stripeCrmId = customer ? customerStripeCrmId(customer) : null;

  const companyName = useMemo(() => {
    if (!customer?.tenant_id) return "—";
    const tid = String(customer.tenant_id).trim();
    return tenantNameMap[tid]?.trim() || tid;
  }, [customer?.tenant_id, tenantNameMap]);

  const resolvedCustomerName = useMemo(
    () =>
      customer
        ? customerDisplayLabel(customer, tenantNameMap, crmCompanyNameMap)
        : "—",
    [customer, tenantNameMap, crmCompanyNameMap],
  );

  const crmDisplay = useMemo(() => {
    if (!customer?.crm_company_id) return "—";
    const id = String(customer.crm_company_id);
    return crmCompanyNameMap[id]?.trim() || id;
  }, [customer?.crm_company_id, crmCompanyNameMap]);

  const profile = customer?.profile;
  const pricingHref = customer
    ? customerProductPricingPath(String(customerApiResourceKey(customer)))
    : null;

  return (
    <ModalShell
      open={show}
      onClose={onHide}
      title="Customer details"
      titleId="view-customer-title"
      maxWidthClassName="max-w-4xl"
      footer={
        <>
          <button type="button" onClick={onHide} className={modalSecondaryButtonClass}>
            Close
          </button>
          {customer && pricingHref ? (
            <button
              type="button"
              onClick={() => {
                onHide();
                router.push(pricingHref);
              }}
              className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-950 shadow-sm hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/60"
            >
              Product pricing
            </button>
          ) : null}
          {customer && onEdit ? (
            <button
              type="button"
              onClick={() => {
                onEdit(customer);
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
                Loading customer…
              </p>
            </div>
          ) : loadError ? (
            <p
              className="rounded-xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
              role="alert"
            >
              Failed to load customer. Please try again.
            </p>
          ) : customer && !isLoading ? (
            <>
              <SectionCard title="Basic information">
                <div className="grid gap-4 sm:grid-cols-2">
                  <GridField label="Name">{resolvedCustomerName}</GridField>
                  <GridField label="Email">{customer.email ?? "—"}</GridField>
                  <GridField label="Phone">{customer.phone ?? "—"}</GridField>
                  <GridField label="CRM company">{crmDisplay}</GridField>
                  <GridField label="Company (tenant)">
                    <span>{companyName}</span>
                    {customer.tenant_id &&
                    companyName !== String(customer.tenant_id) ? (
                      <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        {String(customer.tenant_id)}
                      </span>
                    ) : null}
                  </GridField>
                  <GridField label="Invoices">
                    {customer.invoices_count ?? 0}
                  </GridField>
                </div>
              </SectionCard>

              <SectionCard title="Address">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <GridField label="Address">
                      {profile?.address ?? "—"}
                    </GridField>
                  </div>
                  <GridField label="City">{profile?.city ?? "—"}</GridField>
                  <GridField label="Country">
                    {profile?.country ?? "—"}
                  </GridField>
                  <GridField label="Postal code">
                    {profile?.postal_code ?? "—"}
                  </GridField>
                </div>
              </SectionCard>

              <SectionCard title="Tax & billing">
                <div className="grid gap-4 sm:grid-cols-2">
                  <GridField label="Currency">
                    {profile?.currency ?? "—"}
                  </GridField>
                  {stripeCrmId ? (
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Saved payment cards (Stripe)
                      </p>
                      <CustomerSavedCardsInlineSummary
                        crmCompanyId={stripeCrmId}
                        className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
                      />
                    </div>
                  ) : null}
                  <GridField label="VAT rate (%)">
                    {fmtProfile(profile?.vat_rate)}
                  </GridField>
                  <GridField label="VAT exemption">
                    {profile?.vat_exemption === true ? "Yes" : "No"}
                  </GridField>
                  <GridField label="Tax ID">{profile?.tax_id ?? "—"}</GridField>
                  <GridField label="Payment terms (days)">
                    {fmtProfile(profile?.payment_terms)}
                  </GridField>
                  <GridField label="Credit limit">
                    {fmtProfile(profile?.credit_limit)}
                  </GridField>
                  <GridField label="Discount type">
                    {profile?.discount_type ?? "—"}
                  </GridField>
                  <GridField label="Discount limit">
                    {fmtProfile(profile?.discount_limit)}
                  </GridField>
                  <GridField label="Early payment discount (%)">
                    {fmtProfile(profile?.early_payment_discount)}
                  </GridField>
                  <GridField label="Late fee rule (%)">
                    {fmtProfile(profile?.late_fee_rule)}
                  </GridField>
                </div>
              </SectionCard>

              {stripeCrmId && customer ? (
                <CustomerPaymentCardsEditor
                  crmCompanyId={stripeCrmId}
                  customerName={
                    resolvedCustomerName !== "—"
                      ? resolvedCustomerName
                      : "Customer"
                  }
                  active={show}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>
          )}
    </ModalShell>
  );
}
