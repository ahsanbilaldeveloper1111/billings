"use client";

import type { ReactNode } from "react";
import { useVendor } from "@/hooks/vendors/useVendor";
import { ModalShell } from "@/components/ui/ModalShell";
import { formatNumber } from "@/lib/currency";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { logoDisplaySrc, logoPreviewSource } from "@/lib/logoDisplaySrc";
import { modalPrimaryButtonClass, modalSecondaryButtonClass } from "@/lib/uiModalClasses";
import type { Vendor, VendorBankAccount } from "@/models/Vendor";

type ViewVendorModalProps = {
  show: boolean;
  onHide: () => void;
  vendorId: number | string | null;
  onEdit?: (vendor: Vendor) => void;
};

function statusBadgeClass(status: string | undefined): string {
  switch (status) {
    case "active":
      return "bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100";
    case "inactive":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
    case "pending":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100";
    case "suspended":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100";
    default:
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200";
  }
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-950/50">
      <div className="border-b border-zinc-200/70 bg-zinc-50/90 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

function resolveBankAccounts(
  vendor: Vendor & Record<string, unknown>,
): VendorBankAccount[] {
  const camel = vendor["bankAccounts"] as VendorBankAccount[] | undefined;
  const raw = vendor.bank_accounts ?? camel;
  return Array.isArray(raw) ? raw : [];
}

function maskAccountNumber(accountNumber: string | undefined): string {
  if (!accountNumber?.trim()) return "—";
  const d = accountNumber.replace(/\s/g, "");
  if (d.length <= 4) return "****";
  return `****${d.slice(-4)}`;
}

export function ViewVendorModal({
  show,
  onHide,
  vendorId,
  onEdit,
}: ViewVendorModalProps) {
  const detailQuery = useVendor(show ? vendorId : null, {
    load_profile: true,
  });

  const vendor = unwrapApiSuccessData<Vendor>(detailQuery.data);
  const isLoading = detailQuery.isPending && show && vendorId != null;
  const error = detailQuery.isError ? detailQuery.error : null;

  const vendorProfileLogoImg =
    vendor?.profile != null
      ? logoDisplaySrc(
          logoPreviewSource(
            vendor.profile.logo,
            vendor.profile.logo_url,
          ),
        )
      : null;

  return (
    <ModalShell
      open={show}
      onClose={onHide}
      title="Vendor details"
      titleId="view-vendor-title"
      maxWidthClassName="max-w-5xl"
      maxHeightClassName="max-h-[min(92vh,880px)]"
      footer={
        <>
          <button type="button" onClick={onHide} className={modalSecondaryButtonClass}>
            Close
          </button>
          {vendor && onEdit ? (
            <button
              type="button"
              onClick={() => {
                onEdit(vendor);
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
                Loading vendor details…
              </p>
            </div>
          ) : error ? (
            <p
              className="rounded-xl border border-rose-200/90 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
              role="alert"
            >
              Failed to load vendor details. Please try again.
            </p>
          ) : vendor && !isLoading ? (
            <>
              <SectionCard title="Basic information">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    {vendor.name?.trim() ? vendor.name : "Not provided"}
                  </Field>
                  <Field label="Email">
                    {vendor.email?.trim() ? vendor.email : "Not provided"}
                  </Field>
                  <Field label="Phone">
                    {vendor.phone?.trim() ? vendor.phone : "Not provided"}
                  </Field>
                  <Field label="Tenants count">
                    {formatNumber(
                      vendor.companies_count ??
                        (vendor.companies?.length ?? 0),
                      0,
                    )}
                  </Field>
                  <Field label="Status">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(
                        vendor.status != null
                          ? String(vendor.status)
                          : undefined,
                      )}`}
                    >
                      {vendor.status != null
                        ? String(vendor.status)
                        : "Not provided"}
                    </span>
                  </Field>
                </div>
              </SectionCard>

              {vendor.profile ? (
                <SectionCard title="Profile information">
                  {vendorProfileLogoImg ? (
                    <div className="mb-4 flex justify-center rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vendorProfileLogoImg}
                        alt=""
                        className="max-h-24 max-w-[12rem] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Business type">
                      {vendor.profile.business_type?.trim()
                        ? vendor.profile.business_type
                        : "Not provided"}
                    </Field>
                  </div>
                  <Field label="Address">
                    {vendor.profile.address?.trim()
                      ? vendor.profile.address
                      : "Not provided"}
                  </Field>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <Field label="City">
                      {vendor.profile.city?.trim()
                        ? vendor.profile.city
                        : "Not provided"}
                    </Field>
                    <Field label="Country">
                      {vendor.profile.country?.trim()
                        ? vendor.profile.country
                        : "Not provided"}
                    </Field>
                    <Field label="Tax ID">
                      {vendor.profile.tax_id?.trim()
                        ? vendor.profile.tax_id
                        : "Not provided"}
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <Field label="Profile status">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(
                          vendor.profile.status,
                        )}`}
                      >
                        {vendor.profile.status?.trim()
                          ? vendor.profile.status
                          : "Not provided"}
                      </span>
                    </Field>
                    <Field label="Payment terms">
                      {vendor.profile.payment_terms != null
                        ? `${vendor.profile.payment_terms} days`
                        : "30 days"}
                    </Field>
                    <Field label="Currency">
                      {vendor.profile.currency?.trim()
                        ? vendor.profile.currency
                        : "USD"}
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="VAT exemption">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          vendor.profile.vat_exemption
                            ? "bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
                            : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                        }`}
                      >
                        {vendor.profile.vat_exemption ? "Yes" : "No"}
                      </span>
                    </Field>
                    <Field label="Postal code">
                      {vendor.profile.postal_code?.trim()
                        ? vendor.profile.postal_code
                        : "Not provided"}
                    </Field>
                  </div>
                </SectionCard>
              ) : null}

              {vendor.profile &&
              (vendor.profile.contact_person_name ||
                vendor.profile.contact_person_email ||
                vendor.profile.contact_person_phone) ? (
                <SectionCard title="Contact person">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Name">
                      {vendor.profile.contact_person_name?.trim()
                        ? vendor.profile.contact_person_name
                        : "Not provided"}
                    </Field>
                    <Field label="Email">
                      {vendor.profile.contact_person_email?.trim()
                        ? vendor.profile.contact_person_email
                        : "Not provided"}
                    </Field>
                    <Field label="Phone">
                      {vendor.profile.contact_person_phone?.trim()
                        ? vendor.profile.contact_person_phone
                        : "Not provided"}
                    </Field>
                  </div>
                </SectionCard>
              ) : null}

              {vendor.profile?.invoice_delivery_methods &&
              vendor.profile.invoice_delivery_methods.length > 0 ? (
                <SectionCard title="Invoice delivery methods">
                  <div className="flex flex-wrap gap-2">
                    {vendor.profile.invoice_delivery_methods.map(
                      (method, index) => (
                        <span
                          key={`${method}-${index}`}
                          className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium capitalize text-sky-950 dark:bg-sky-950/50 dark:text-sky-100"
                        >
                          {method.length
                            ? method.charAt(0).toUpperCase() + method.slice(1)
                            : method}
                        </span>
                      ),
                    )}
                  </div>
                </SectionCard>
              ) : null}

              {(vendor.profile?.allowed_products?.length ?? 0) > 0 ||
              (vendor.profile?.allowed_categories?.length ?? 0) > 0 ? (
                <SectionCard title="Products & categories">
                  {vendor.profile?.allowed_products &&
                  vendor.profile.allowed_products.length > 0 ? (
                    <Field label="Allowed products">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {vendor.profile.allowed_products.length} product(s)
                        configured
                      </span>
                    </Field>
                  ) : null}
                  {vendor.profile?.allowed_categories &&
                  vendor.profile.allowed_categories.length > 0 ? (
                    <Field label="Allowed categories">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {vendor.profile.allowed_categories.length} category(ies)
                        configured
                      </span>
                    </Field>
                  ) : null}
                </SectionCard>
              ) : null}

              {(() => {
                const accounts = resolveBankAccounts(
                  vendor as Vendor & Record<string, unknown>,
                );
                if (accounts.length === 0) return null;
                return (
                  <SectionCard title="Bank accounts">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[56rem] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50">
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Bank name
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Account holder
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Account number
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Routing
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              SWIFT
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              IBAN
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Currency
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Type
                            </th>
                            <th className="whitespace-nowrap px-2 py-2 font-semibold">
                              Default
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account, index) => (
                            <tr
                              key={account.id ?? index}
                              className="border-b border-zinc-100 odd:bg-white/50 even:bg-zinc-50/30 dark:border-zinc-800 dark:odd:bg-transparent dark:even:bg-zinc-900/20"
                            >
                              <td className="px-2 py-2">{account.bank_name}</td>
                              <td className="px-2 py-2">
                                {account.account_holder_name}
                              </td>
                              <td className="px-2 py-2 font-mono text-[11px]">
                                {maskAccountNumber(account.account_number)}
                              </td>
                              <td className="px-2 py-2">
                                {account.routing_number?.trim() || "—"}
                              </td>
                              <td className="px-2 py-2">
                                {account.swift_code?.trim() || "—"}
                              </td>
                              <td className="px-2 py-2">
                                {account.iban?.trim() || "—"}
                              </td>
                              <td className="px-2 py-2">
                                {account.currency?.trim() || "—"}
                              </td>
                              <td className="px-2 py-2">
                                {account.account_type?.trim() || "—"}
                              </td>
                              <td className="px-2 py-2">
                                {account.is_default ? (
                                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-900 dark:bg-teal-950/60 dark:text-teal-100">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200">
                                    No
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                );
              })()}
            </>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No data.</p>
          )}
    </ModalShell>
  );
}
