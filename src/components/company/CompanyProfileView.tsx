"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useStripePaymentMethods } from "@/hooks/stripe/useStripeEndpoints";
import { useCompanyDiscountApplicability } from "@/hooks/company/useCompanyDiscountApplicability";
import { useCompanyDocuments } from "@/hooks/company/useCompanyDocuments";
import { useTenantDisplayNameMap } from "@/hooks/company/useTenantDisplayNameMap";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { getCompanyDocumentsList } from "@/lib/company/companyDocuments";
import { downloadCompanyDocumentFile } from "@/lib/company/downloadCompanyDocumentFile";
import { formatCurrency } from "@/lib/currency";
import { logoDisplaySrc, logoPreviewSource } from "@/lib/logoDisplaySrc";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { parseStripePaymentMethods } from "@/lib/stripe/parseStripePaymentMethods";
import { showAppToast } from "@/lib/toast/appToast";
import type { Company, CompanyDocument } from "@/models/Company";
import { OutstandingInvoicesModal } from "@/components/company/OutstandingInvoicesModal";

function profileStatusPill(status: string | undefined) {
  const s = status ?? "incomplete";
  const map: Record<string, string> = {
    complete:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100",
    incomplete:
      "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
    pending_verification:
      "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100",
  };
  const cls = map[s] ?? map.incomplete;
  const label =
    s === "pending_verification"
      ? "Pending verification"
      : s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {label}
    </span>
  );
}

function formatProfileDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}

type SectionProps = { title: string; children: ReactNode; icon?: string };

function Section({ title, children }: SectionProps) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-950/50">
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

function bankAccountsFromCompany(c: Company): unknown[] {
  const p = c.profile as Record<string, unknown> | undefined;
  const camel = c as Company & {
    bank_accounts?: unknown[];
    bankAccounts?: unknown[];
  };
  const raw =
    camel.bank_accounts ??
    camel.bankAccounts ??
    p?.bank_accounts ??
    c.profile?.bank_accounts;
  return Array.isArray(raw) ? raw : [];
}

export type CompanyProfileViewProps = {
  profile: Company;
  onEdit?: () => void;
};

export function CompanyProfileView({ profile, onEdit }: CompanyProfileViewProps) {
  const { isSuperAdmin } = usePermissions();
  const [taxOpen, setTaxOpen] = useState(true);
  const [outstandingOpen, setOutstandingOpen] = useState(false);

  useCompanyDiscountApplicability(profile.id ?? null);

  const tenantMap = useTenantDisplayNameMap();
  const tid = profile.tenant_id != null ? String(profile.tenant_id) : "";
  const companyDisplayName =
    (tid && tenantMap[tid]?.trim()) ||
    (profile.name && String(profile.name).trim()) ||
    "—";

  const { data: documentsData, isPending: documentsLoading } =
    useCompanyDocuments(tid || null);

  const documentsList = useMemo(
    () => getCompanyDocumentsList(documentsData),
    [documentsData],
  );

  const stripeId = profile.tenant_id ?? profile.id ?? null;
  const { data: stripePmData } = useStripePaymentMethods(stripeId);
  const displayCards = useMemo(
    () => parseStripePaymentMethods(stripePmData),
    [stripePmData],
  );

  const p = profile.profile;
  const logoPreviewRaw = logoPreviewSource(p?.logo, p?.logo_url);
  const logoImgSrc = logoDisplaySrc(logoPreviewRaw);
  const currency = p?.currency || "USD";
  const outstanding =
    (profile as Company & { outstanding_amount?: number })
      .outstanding_amount ??
    p?.outstanding_amount ??
    p?.outstanding_invoices ??
    0;

  async function handleDownloadDocument(doc: CompanyDocument) {
    if (!tid) {
      showAppToast("Missing tenant id for documents.", "warning");
      return;
    }
    try {
      const blob = await downloadCompanyDocumentFile(tid, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = doc.path?.split(".").pop();
      a.download = ext ? `${doc.name}.${ext}` : doc.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showAppToast("Download started.", "success");
    } catch {
      showAppToast("Document download failed.", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 px-4 py-4 dark:border-zinc-800 dark:from-emerald-950/30 dark:to-zinc-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Tenant: {profile.name ?? "—"}
              </h2>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>{profile.email ?? "—"}</span>
                <span aria-hidden>·</span>
                <span>
                  {profile.phone != null
                    ? String(profile.phone)
                    : profile.phone_no != null
                      ? String(profile.phone_no)
                      : "No phone"}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {profile.country ?? "—"} | Currency: {currency}
                </span>
                <span aria-hidden>·</span>
                <span>Net {p?.payment_terms ?? 30} days</span>
              </p>
              <div className="mt-2">{profileStatusPill(p?.profile_status)}</div>
            </div>
            {logoImgSrc ? (
              <div className="shrink-0 rounded-xl border border-zinc-200/80 bg-white/90 p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoImgSrc}
                  alt=""
                  className="max-h-20 max-w-[10rem] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : null}
          </div>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setOutstandingOpen(true)}
          className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-center shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Outstanding
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(Number(outstanding), currency)}
          </p>
          <p className="mt-1 text-[11px] text-sky-700 underline dark:text-sky-400">
            View invoices
          </p>
        </button>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            VAT collected
          </p>
          <p className="mt-2 text-lg font-semibold">
            {formatCurrency(p?.vat_collected ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Active subscriptions
          </p>
          <p className="mt-2 text-lg font-semibold">
            {p?.active_subscriptions ?? "—"}
          </p>
        </div>
      </div>

      <Section title="General information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">{companyDisplayName}</Field>
          <Field label="Company ID">{profile.id ?? "—"}</Field>
          <Field label="Email">{profile.email ?? "—"}</Field>
          <Field label="Phone">
            {profile.phone != null
              ? String(profile.phone)
              : profile.phone_no != null
                ? String(profile.phone_no)
                : "—"}
          </Field>
          <Field label="Country">{profile.country ?? "—"}</Field>
          <Field label="Currency">{currency}</Field>
          <Field label="Vendor">{profile.vendor?.name ?? "—"}</Field>
        </div>
        <Field label="Address">{p?.address ?? "—"}</Field>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Field label="Postal code">{p?.postal_code ?? "—"}</Field>
          <Field label="Business type">
            {p?.business_type
              ? String(p.business_type).replaceAll("_", " ")
              : "—"}
          </Field>
          <Field label="Registration #">
            {p?.registration_number ?? "—"}
          </Field>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Fiscal year start">
            {p?.fiscal_year_start
              ? typeof p.fiscal_year_start === "string"
                ? p.fiscal_year_start
                : String(p.fiscal_year_start)
              : "—"}
          </Field>
          <Field label="Accounting method">
            {p?.accounting_method
              ? String(p.accounting_method).replaceAll("_", " ")
              : "—"}
          </Field>
        </div>
      </Section>

      <section className="mb-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 dark:border-zinc-800/80 dark:bg-zinc-950/50">
        <button
          type="button"
          onClick={() => setTaxOpen((v) => !v)}
          className="flex w-full items-center justify-between border-b border-zinc-200/70 bg-zinc-50/90 px-4 py-2.5 text-left dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Tax &amp; compliance
          </span>
          <span className="text-zinc-400">{taxOpen ? "−" : "+"}</span>
        </button>
        {taxOpen ? (
          <div className="grid gap-4 px-4 py-3 sm:grid-cols-3">
            <Field label="VAT rate (%)">{p?.vat_rate ?? 0}%</Field>
            <Field label="VAT exemption">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  p?.vat_exemption
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
                    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200"
                }`}
              >
                {p?.vat_exemption ? "Yes" : "No"}
              </span>
            </Field>
            <Field label="Tax ID">{p?.tax_id ?? "—"}</Field>
          </div>
        ) : null}
      </section>

      <Section title="Payment terms">
        <Field label="Payment terms (days)">
          Net {p?.payment_terms ?? 30} days
        </Field>
      </Section>

      <Section title="Documents">
        {documentsLoading ? (
          <p className="text-sm text-zinc-500">Loading documents…</p>
        ) : documentsList.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No documents uploaded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-2">Name</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentsList.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-2">{doc.name}</td>
                    <td className="py-2">{doc.type ?? "—"}</td>
                    <td className="py-2">
                      {doc.updated_at
                        ? formatProfileDate(doc.updated_at)
                        : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDownloadDocument(doc)}
                        className="rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-100"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Special rules">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Credit limit">
            {p?.credit_limit != null && p.credit_limit > 0
              ? formatCurrency(p.credit_limit, currency)
              : <span className="text-zinc-400">Not set</span>}
          </Field>
          <Field label="Early payment discount (%)">
            {p?.early_payment_discount != null && p.early_payment_discount > 0
              ? `${p.early_payment_discount}%`
              : "—"}
          </Field>
          <Field label="Late fee rule">
            {p?.late_fee_rule != null ? String(p.late_fee_rule) : "—"}
          </Field>
        </div>
      </Section>

      <Section title="Bank accounts">
        {(() => {
          const banks = bankAccountsFromCompany(profile);
          if (banks.length === 0) {
            return (
              <p className="text-center text-sm text-zinc-500">
                No bank accounts configured.
              </p>
            );
          }
          return (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-2">Bank</th>
                    <th className="py-2">Holder</th>
                    <th className="py-2">Account</th>
                    <th className="py-2">Currency</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((account, index) => {
                    const a = account as Record<string, unknown>;
                    return (
                      <tr
                        key={String(a.id ?? index)}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="py-2">{String(a.bank_name ?? "—")}</td>
                        <td className="py-2">
                          {String(a.account_holder_name ?? "—")}
                        </td>
                        <td className="py-2 font-mono">
                          {String(a.account_number ?? "—")}
                        </td>
                        <td className="py-2">{String(a.currency ?? "—")}</td>
                        <td className="py-2">
                          {String(a.account_type ?? "—")}
                        </td>
                        <td className="py-2">
                          {a.is_default ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                              Yes
                            </span>
                          ) : (
                            <span className="text-zinc-500">No</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Section>

      {isSuperAdmin ? (
        <Section title="Payment cards (Stripe)">
          {displayCards.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">
              No saved cards returned for this tenant.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayCards.map((pm) => {
                const brand = pm.card?.brand ?? "Card";
                const last4 = pm.card?.last4 ?? "????";
                const exp =
                  pm.card?.exp_month != null && pm.card?.exp_year != null
                    ? `${pm.card.exp_month}/${pm.card.exp_year}`
                    : "—";
                return (
                  <div
                    key={pm.id}
                    className="rounded-xl border border-zinc-200/80 bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 text-white shadow-md dark:border-zinc-600"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold uppercase opacity-90">
                        {brand}
                      </span>
                      {pm.is_default ? (
                        <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-[10px]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 font-mono text-lg tracking-widest">
                      •••• {last4}
                    </p>
                    <p className="mt-3 text-[11px] opacity-80">Expires {exp}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <OutstandingInvoicesModal
        show={outstandingOpen}
        onHide={() => setOutstandingOpen(false)}
        tenantId={tid || null}
        companyName={profile.name ?? companyDisplayName}
        currency={currency}
      />
    </div>
  );
}
