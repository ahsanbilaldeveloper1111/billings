"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CompanyProfileAddCardForm } from "@/components/company/CompanyProfileAddCardForm";
import countries from "world-countries";
import { MainAppResellerDropdown } from "@/components/resellers/MainAppResellerDropdown";
import { useCompany } from "@/hooks/company/useCompany";
import { useCompanyDocuments } from "@/hooks/company/useCompanyDocuments";
import { useCompanyMutations } from "@/hooks/company/useCompanyMutations";
import {
  currenciesFromResponse,
  useActiveCurrencies,
} from "@/hooks/currencies/useActiveCurrencies";
import { baseCurrencyFromResponse, useBaseCurrency } from "@/hooks/currencies/useBaseCurrency";
import { resolveDefaultCurrencyCode } from "@/lib/currencies/defaultCurrencyCode";
import {
  useStripePaymentMethods,
} from "@/hooks/stripe/useStripeEndpoints";
import { useStripeProfilePaymentMutations } from "@/hooks/stripe/useStripeProfilePaymentMutations";
import { useStripePublishableKey } from "@/hooks/stripe/useStripePublishableKey";
import { useVendors } from "@/hooks/vendors/useVendors";
import { extractListRows } from "@/lib/api/extractApiData";
import {
  getCompanyDocumentsList,
  getDocumentNameFromFile,
  getDocumentTypeFromFile,
} from "@/lib/company/companyDocuments";
import { downloadCompanyDocumentFile } from "@/lib/company/downloadCompanyDocumentFile";
import {
  bankAccountsFromApi,
  buildCompanyCreateUpdateFormData,
  buildCompanyCreateUpdatePayload,
  emptyBankAccountDraft,
  emptyCompanyForm,
  type CompanyFormState,
} from "@/lib/company/buildCompanyCreateUpdatePayload";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import {
  firstLogoField,
  logoDisplaySrc,
  logoPreviewSource,
  shouldHideLogoTextValue,
} from "@/lib/logoDisplaySrc";
import { queryKeys } from "@/lib/queryKeys";
import { companyService } from "@/services/company.service";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import { parseStripePaymentMethods } from "@/lib/stripe/parseStripePaymentMethods";
import type {
  Company,
  CompanyDocument,
  CompanyProfile,
  CompanySavedPaymentMethod,
} from "@/models/Company";
import type { PaymentMode } from "@/models/Payment";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

/** Discount applicability tags (profile.discount_applicability). */
const DISCOUNT_APPLICABILITY_OPTIONS = [
  "email",
  "sms",
  "portal",
  "invoice",
] as const;

function fiscalInputFromApi(raw: string | undefined | null): string {
  if (raw == null || raw === "") return "";
  const s = typeof raw === "string" ? raw : String(raw);
  const dateOnly = s.trim().substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatDocDate(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function unwrapPublishableKey(payload: unknown): string | null {
  const d = unwrapApiSuccessData<Record<string, unknown>>(payload);
  if (!d) return null;
  const k = d.publishable_key ?? d.publishableKey;
  if (typeof k === "string" && k.startsWith("pk_")) return k;
  return null;
}

function companyProfileHadAnyLogo(
  profile: CompanyProfile | null | undefined,
): boolean {
  return Boolean(firstLogoField(profile?.logo, profile?.logo_url));
}

/** Align logo fields / `remove_logo` on create-update body (same rules as vendor). */
function finalizeCompanyLogoOnBody(
  body: Record<string, unknown>,
  options: {
    hasLogoFile: boolean;
    isEdit: boolean;
    logoRemoved: boolean;
    rowProfile: CompanyProfile | null | undefined;
  },
): void {
  const raw = body.profile;
  const prof =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  if (!prof) return;

  if (options.hasLogoFile) {
    delete body.remove_logo;
    return;
  }

  const had = companyProfileHadAnyLogo(options.rowProfile);
  if (options.isEdit) {
    if (options.logoRemoved && had) {
      prof.logo = null;
      prof.logo_url = null;
      body.remove_logo = true;
    } else if (!options.logoRemoved) {
      const ol = String(options.rowProfile?.logo ?? "").trim();
      const ou = String(options.rowProfile?.logo_url ?? "").trim();
      if (ol) prof.logo = ol;
      else delete prof.logo;
      if (ou) prof.logo_url = ou;
      else delete prof.logo_url;
    } else {
      delete prof.logo;
      delete prof.logo_url;
    }
    if (!(options.logoRemoved && had)) {
      delete body.remove_logo;
    }
  } else {
    delete body.remove_logo;
  }
}

function profileToFormSlice(
  company: Company,
  p: CompanyProfile | undefined | null,
) {
  const base = emptyCompanyForm().profile;
  const countryFromProfile = (p as { country?: string } | null)?.country;
  if (!p) {
    return {
      ...base,
      country:
        typeof company.country === "string" ? company.country : "",
    };
  }
  const pm = p.payment_methods;
  const payment_methods: CompanySavedPaymentMethod[] = Array.isArray(pm)
    ? (pm as CompanySavedPaymentMethod[]).map((m) => ({ ...m }))
    : [];
  const da = p.discount_applicability;
  return {
    ...base,
    address: p.address ?? "",
    country:
      (typeof company.country === "string" ? company.country : "") ||
      (typeof countryFromProfile === "string" ? countryFromProfile : ""),
    postal_code: p.postal_code ?? "",
    currency: p.currency ?? "USD",
    fiscal_year_start: fiscalInputFromApi(p.fiscal_year_start),
    accounting_method: p.accounting_method ?? "",
    registration_number: p.registration_number ?? "",
    business_type: p.business_type ?? "",
    vat_rate: p.vat_rate ?? "",
    vat_exemption: Boolean(p.vat_exemption),
    tax_id: p.tax_id ?? "",
    discount_type: p.discount_type ?? "flat_percentage",
    discount_limit: p.discount_limit ?? "",
    discount_applicability: Array.isArray(da) ? [...da] : [],
    payment_methods,
    payment_mode: (p.payment_mode as PaymentMode) ?? "one_time",
    payment_terms: p.payment_terms ?? "30",
    credit_limit: p.credit_limit ?? "",
    early_payment_discount: p.early_payment_discount ?? "",
    late_fee_rule: p.late_fee_rule ?? "100",
    outstanding_invoices: p.outstanding_invoices ?? "",
    discounts_applied_ytd: p.discounts_applied_ytd ?? "",
    vat_collected: p.vat_collected ?? "",
    active_subscriptions: p.active_subscriptions ?? "",
    profile_status: p.profile_status ?? "incomplete",
    selected_products: Array.isArray(p.selected_products)
      ? [...p.selected_products]
      : [],
    logo: p.logo ?? "",
    logo_url: p.logo_url ?? "",
  };
}

function companyBankAccountsFromAny(
  company: Company,
): unknown[] {
  const p = company.profile as Record<string, unknown> | undefined;
  const root = company as Company & {
    bank_accounts?: unknown[];
    bankAccounts?: unknown[];
  };
  const raw =
    root.bank_accounts ??
    root.bankAccounts ??
    p?.bank_accounts ??
    company.profile?.bank_accounts;
  return Array.isArray(raw) ? raw : [];
}

type CreateUpdateCompanyModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** `null` = create */
  companyId: number | string | null;
};

export function CreateUpdateCompanyModal({
  open,
  onClose,
  onSuccess,
  companyId,
}: CreateUpdateCompanyModalProps) {
  const isEdit = companyId != null;
  const mutations = useCompanyMutations();

  const [form, setForm] = useState<CompanyFormState>(() => emptyCompanyForm());
  const [newBank, setNewBank] = useState(() =>
    emptyBankAccountDraft(emptyCompanyForm().profile.currency || "USD"),
  );
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const companyLogoFileRef = useRef<HTMLInputElement>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoBlobUrl, setCompanyLogoBlobUrl] = useState<string | null>(
    null,
  );
  const [logoRemoved, setLogoRemoved] = useState(false);
  const queryClient = useQueryClient();

  const detailQuery = useCompany(open && isEdit ? companyId : null, {
    load_profile: true,
  });
  const row = unwrapApiSuccessData<Company>(detailQuery.data);

  const vendorsQ = useVendors(
    {
      page: 1,
      limit: 500,
      "order[column]": "name",
      "order[dir]": "asc",
    },
    { enabled: open },
  );
  const vendorRows = extractListRows<{ id: number; name?: string }>(
    vendorsQ.data,
  ).rows;

  const currenciesQ = useActiveCurrencies();
  const baseCurrencyQ = useBaseCurrency();
  const activeCurrencies = currenciesFromResponse(currenciesQ.data);
  const baseCurrency = baseCurrencyFromResponse(baseCurrencyQ.data);
  const currencyOptions = useMemo(
    () =>
      activeCurrencies
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({
          value: c.code,
          label: `${c.code} — ${c.name} (${c.symbol || c.code})`,
        })),
    [activeCurrencies],
  );
  const defaultCurrencyCode = useMemo(
    () => resolveDefaultCurrencyCode(baseCurrency, activeCurrencies),
    [baseCurrency, activeCurrencies],
  );

  const countryOptions = useMemo(
    () =>
      countries
        .map((c) => ({ value: c.name.common, label: c.name.common }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  useEffect(() => {
    if (!open) return;
    (() => {
      if (!isEdit) {
        setCompanyLogoBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setCompanyLogoFile(null);
        if (companyLogoFileRef.current) companyLogoFileRef.current.value = "";
        setLogoRemoved(false);
        const next = emptyCompanyForm();
        next.profile.currency = defaultCurrencyCode;
        setForm(next);
        setNewBank(emptyBankAccountDraft(defaultCurrencyCode));
        setEditingBankIndex(null);
        setDocumentFiles([]);
        return;
      }
      if (!row) return;
      const v = row;
      const p = v.profile;
      setForm({
        email: String(v.email ?? ""),
        phone: String(v.phone ?? v.phone_no ?? ""),
        tenant_id: v.tenant_id != null ? String(v.tenant_id) : "",
        vendor_id: v.vendor_id != null ? String(v.vendor_id) : "",
        profile: profileToFormSlice(v, p),
        bank_accounts: bankAccountsFromApi(companyBankAccountsFromAny(v)),
      });
      setNewBank(emptyBankAccountDraft(p?.currency ?? "USD"));
      setEditingBankIndex(null);
      setLogoRemoved(false);
      if (companyLogoFileRef.current) companyLogoFileRef.current.value = "";
    })();
  }, [open, isEdit, row, defaultCurrencyCode]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (activeCurrencies.length === 0) return;
    const selected = String(form.profile.currency ?? "").trim().toUpperCase();
    const isValid = activeCurrencies.some(
      (c) => String(c.code ?? "").trim().toUpperCase() === selected,
    );
    if (!selected || !isValid) {
      (() => {
        setForm((prev) => ({
          ...prev,
          profile: { ...prev.profile, currency: defaultCurrencyCode },
        }));
        setNewBank((b) => ({ ...b, currency: defaultCurrencyCode }));
      })();
    }
  }, [
    open,
    isEdit,
    activeCurrencies,
    form.profile.currency,
    defaultCurrencyCode,
  ]);

  useEffect(() => {
    if (open) return;
    (() => {
      setCompanyLogoBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setCompanyLogoFile(null);
      if (companyLogoFileRef.current) companyLogoFileRef.current.value = "";
      setLogoRemoved(false);
    })();
  }, [open]);

  const loadingRow = isEdit && detailQuery.isPending;

  const numericCompanyId = useMemo(() => {
    if (row?.id != null && Number.isFinite(Number(row.id))) return Number(row.id);
    if (companyId != null && Number.isFinite(Number(companyId))) {
      return Number(companyId);
    }
    return undefined;
  }, [row?.id, companyId]);

  const tenantIdForDocs = useMemo(() => {
    const t = form.tenant_id.trim();
    if (t) return t;
    if (row?.tenant_id != null && String(row.tenant_id).trim() !== "") {
      return String(row.tenant_id);
    }
    return "";
  }, [form.tenant_id, row]);

  const companyLogoPreviewSrc = useMemo(() => {
    if (companyLogoBlobUrl) return companyLogoBlobUrl;
    if (isEdit && logoRemoved && !companyLogoFile) return "";
    if (isEdit && row?.profile) {
      return (
        logoDisplaySrc(
          logoPreviewSource(row.profile.logo, row.profile.logo_url),
        ) ?? ""
      );
    }
    return (
      logoDisplaySrc(
        logoPreviewSource(form.profile.logo, form.profile.logo_url),
      ) ?? ""
    );
  }, [companyLogoBlobUrl, companyLogoFile, isEdit, logoRemoved, row, form.profile]);

  const documentsQuery = useCompanyDocuments(
    open && isEdit && tenantIdForDocs ? tenantIdForDocs : null,
  );
  const documentsList = useMemo(
    () => getCompanyDocumentsList(documentsQuery.data),
    [documentsQuery.data],
  );

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!tenantIdForDocs) {
        throw new Error("Tenant required for upload");
      }
      const fd = new FormData();
      const names = files.map((f) => getDocumentNameFromFile(f));
      const types = files.map((f) => getDocumentTypeFromFile(f));
      files.forEach((file, i) => {
        fd.append(`files[${i}]`, file);
        fd.append(`names[${i}]`, names[i]);
        fd.append(`types[${i}]`, types[i]);
      });
      return companyService.uploadDocument(tenantIdForDocs, fd);
    },
    onSuccess: () => {
      setDocumentFiles([]);
      const input = document.querySelector(
        "input[data-company-doc-modal]",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      void queryClient.invalidateQueries({
        queryKey: queryKeys.company.documents(tenantIdForDocs),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.company.detail(companyId ?? null),
      });
      showAppToast("Document(s) uploaded.", "success");
    },
    onError: () => {
      showBillingBackendErrorToast(new Error("Upload failed"));
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: number) =>
      companyService.deleteDocument(tenantIdForDocs, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.company.documents(tenantIdForDocs),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.company.detail(companyId ?? null),
      });
      showAppToast("Document removed.", "success");
    },
    onError: () => {
      showBillingBackendErrorToast(new Error("Delete failed"));
    },
  });

  const pkQuery = useStripePublishableKey();
  const publishableKey = useMemo(
    () => unwrapPublishableKey(pkQuery.data),
    [pkQuery.data],
  );
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(
    null,
  );
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

  useEffect(() => {
    (() => {
      if (!publishableKey) {
        setStripePromise(null);
        return;
      }
      setStripePromise(loadStripe(publishableKey));
    })();
  }, [publishableKey]);

  /** Same key as `CompanyProfileView`: tenant_id when present, else company id. */
  const stripeCompanyProfileKey = useMemo(() => {
    if (!row) return null;
    const tid = row.tenant_id != null ? String(row.tenant_id).trim() : "";
    if (tid) return tid;
    if (row.id != null) return row.id;
    return null;
  }, [row]);

  const { data: stripePmData, refetch: refetchCards } = useStripePaymentMethods(
    open && isEdit && stripeCompanyProfileKey != null
      ? stripeCompanyProfileKey
      : null,
  );
  const stripePaymentMethods = useMemo(
    () => parseStripePaymentMethods(stripePmData),
    [stripePmData],
  );
  const { setDefault: setDefaultCardMutation, remove: removeCardMutation } =
    useStripeProfilePaymentMutations(
      open && isEdit && stripeCompanyProfileKey != null
        ? stripeCompanyProfileKey
        : null,
    );

  function handleCardAdded() {
    setAddCardError(null);
    setCardEditorOpen(false);
    void refetchCards();
    showAppToast("Card added successfully.", "success");
  }

  function handleSetDefaultCard(paymentMethodId: string) {
    setDefaultCardMutation.mutate(paymentMethodId, {
      onSuccess: () => {
        void refetchCards();
        showAppToast("Default card updated.", "success");
      },
      onError: (e) => showBillingBackendErrorToast(e),
    });
  }

  function handleRemoveCard(paymentMethodId: string) {
    if (!globalThis.confirm("Remove this card?")) return;
    removeCardMutation.mutate(paymentMethodId, {
      onSuccess: () => {
        void refetchCards();
        showAppToast("Card removed.", "success");
      },
      onError: (e) => showBillingBackendErrorToast(e),
    });
  }

  async function handleDownloadDocument(doc: CompanyDocument) {
    if (!tenantIdForDocs) {
      showAppToast("Select a tenant to download documents.", "warning");
      return;
    }
    try {
      const blob = await downloadCompanyDocumentFile(tenantIdForDocs, doc.id);
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
      showAppToast("Download failed.", "error");
    }
  }

  function setProfile<K extends keyof CompanyFormState["profile"]>(
    key: K,
    value: CompanyFormState["profile"][K],
  ) {
    setForm((prev) => ({
      ...prev,
      profile: { ...prev.profile, [key]: value },
    }));
  }

  function toggleDiscountApplicability(method: string) {
    setForm((prev) => {
      const next = new Set(prev.profile.discount_applicability);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return {
        ...prev,
        profile: {
          ...prev.profile,
          discount_applicability: Array.from(next),
        },
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) {
      showAppToast("Email is required.", "error");
      return;
    }
    if (!isEdit && !form.tenant_id.trim()) {
      showAppToast("Select a tenant (main app) for new companies.", "error");
      return;
    }
    if (isEdit && numericCompanyId == null) {
      showAppToast("Cannot save: company id missing from response.", "error");
      return;
    }
    const body = buildCompanyCreateUpdatePayload(form, {
      isEdit,
      companyId: numericCompanyId,
    }) as Record<string, unknown>;
    finalizeCompanyLogoOnBody(body, {
      hasLogoFile: Boolean(companyLogoFile),
      isEdit,
      logoRemoved,
      rowProfile: row?.profile,
    });
    try {
      if (companyLogoFile) {
        const payload = structuredClone(body) as Record<string, unknown>;
        const prof = { ...(payload.profile as Record<string, unknown>) };
        if (typeof prof.logo_url === "string") {
          if (
            prof.logo_url.startsWith("data:") ||
            shouldHideLogoTextValue(prof.logo_url)
          ) {
            delete prof.logo_url;
          }
        }
        if (typeof prof.logo === "string") {
          if (
            prof.logo.startsWith("data:") ||
            shouldHideLogoTextValue(prof.logo)
          ) {
            delete prof.logo;
          }
        }
        payload.profile = prof;
        await mutations.createUpdate.mutateAsync(
          buildCompanyCreateUpdateFormData(payload, companyLogoFile),
        );
      } else {
        await mutations.createUpdate.mutateAsync(body);
      }
      showAppToast(isEdit ? "Company saved." : "Company created.", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  const saving = mutations.createUpdate.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(94vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex-shrink-0 border-b border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {isEdit ? "Edit company" : "New company"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loadingRow ? (
              <div className="flex justify-center py-12">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
                  aria-hidden
                />
              </div>
            ) : (
              <div className="space-y-6">
                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Account
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={formLabelClass}>
                        Email
                      </span>
                      <input
                        type="email"
                        className={formControlClass}
                        value={form.email}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, email: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Phone
                      </span>
                      <input
                        className={formControlClass}
                        value={form.phone}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            phone: e.target.value.slice(0, 20),
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Vendor & tenant
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Vendor
                      </span>
                      <select
                        className={formControlClass}
                        value={form.vendor_id}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, vendor_id: e.target.value }))
                        }
                      >
                        <option value="">Select vendor…</option>
                        {vendorRows.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.name ?? `Vendor ${v.id}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Tenant (main app) {!isEdit ? "*" : ""}
                      </span>
                      <MainAppResellerDropdown
                        value={form.tenant_id || null}
                        onChange={(tid) =>
                          setForm((s) => ({
                            ...s,
                            tenant_id: tid ?? "",
                          }))
                        }
                        placeholder="Select tenant…"
                        disabled={isEdit}
                        fetchParams={{ limit: 500 }}
                      />
                      <span className="mt-1 block text-[11px] text-zinc-500">
                        {isEdit
                          ? "Tenant cannot be changed after create."
                          : "Required when creating a company."}
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Address & registration
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Address
                      </span>
                      <textarea
                        rows={2}
                        className={formControlClass}
                        value={form.profile.address}
                        onChange={(e) =>
                          setProfile("address", e.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Country
                      </span>
                      <select
                        className={formControlClass}
                        value={form.profile.country}
                        onChange={(e) =>
                          setProfile("country", e.target.value)
                        }
                      >
                        <option value="">Select country</option>
                        {countryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Postal code
                      </span>
                      <input
                        className={formControlClass}
                        value={form.profile.postal_code}
                        onChange={(e) =>
                          setProfile("postal_code", e.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Fiscal year start
                      </span>
                      <input
                        type="date"
                        className={formControlClass}
                        value={form.profile.fiscal_year_start}
                        onChange={(e) =>
                          setProfile("fiscal_year_start", e.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Accounting method
                      </span>
                      <select
                        className={formControlClass}
                        value={form.profile.accounting_method}
                        onChange={(e) =>
                          setProfile("accounting_method", e.target.value)
                        }
                      >
                        <option value="">Select…</option>
                        <option value="cash">Cash basis</option>
                        <option value="accrual">Accrual basis</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Registration number
                      </span>
                      <input
                        className={formControlClass}
                        value={form.profile.registration_number}
                        onChange={(e) =>
                          setProfile("registration_number", e.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Business type
                      </span>
                      <select
                        className={formControlClass}
                        value={form.profile.business_type}
                        onChange={(e) =>
                          setProfile("business_type", e.target.value)
                        }
                      >
                        <option value="">Select…</option>
                        <option value="sole_proprietorship">
                          Sole proprietorship
                        </option>
                        <option value="partnership">Partnership</option>
                        <option value="corporation">Corporation</option>
                        <option value="llc">LLC</option>
                        <option value="nonprofit">Non-profit</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Tax & billing
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={formLabelClass}>
                        Currency
                      </span>
                      {isEdit ? (
                        <input
                          readOnly
                          className={`${formControlClass} bg-zinc-50 dark:bg-zinc-900/80`}
                          value={form.profile.currency}
                        />
                      ) : (
                        <select
                          className={formControlClass}
                          value={form.profile.currency}
                          onChange={(e) =>
                            setProfile("currency", e.target.value)
                          }
                        >
                          {currencyOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {isEdit ? (
                        <span className="mt-1 block text-[11px] text-zinc-500">
                          Currency is locked after create; change via backend if
                          needed.
                        </span>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Payment mode
                      </span>
                      <select
                        className={formControlClass}
                        value={form.profile.payment_mode}
                        onChange={(e) =>
                          setProfile(
                            "payment_mode",
                            e.target.value as PaymentMode,
                          )
                        }
                      >
                        <option value="one_time">One-time</option>
                        <option value="recurring">Recurring</option>
                        <option value="subscription">Subscription</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        VAT rate (%)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={formControlClass}
                        value={form.profile.vat_rate}
                        onChange={(e) =>
                          setProfile(
                            "vat_rate",
                            stripNumericLeadingZerosForControlledInput(
                              e.target.value,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        className="rounded border-zinc-300"
                        checked={form.profile.vat_exemption}
                        onChange={(e) =>
                          setProfile("vat_exemption", e.target.checked)
                        }
                      />
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">
                        VAT exemption
                      </span>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Tax ID
                      </span>
                      <input
                        className={formControlClass}
                        value={form.profile.tax_id}
                        onChange={(e) =>
                          setProfile("tax_id", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Profile status & branding
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={formLabelClass}>
                        Profile status
                      </span>
                      <select
                        className={formControlClass}
                        value={form.profile.profile_status}
                        onChange={(e) =>
                          setProfile(
                            "profile_status",
                            e.target.value as CompanyFormState["profile"]["profile_status"],
                          )
                        }
                      >
                        <option value="incomplete">Incomplete</option>
                        <option value="complete">Complete</option>
                        <option value="pending_verification">
                          Pending verification
                        </option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-teal-50/30 p-3.5 shadow-sm shadow-zinc-900/[0.04] dark:border-zinc-800/80 dark:from-zinc-950 dark:to-teal-950/20 dark:shadow-black/20">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Company logo
                        </span>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Upload PNG or JPEG (or WebP / GIF). Large saved images
                          show only in the preview below.
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Shown on invoices and profile pages when supported.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-xl border border-teal-300/80 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 shadow-sm hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/55"
                            onClick={() => companyLogoFileRef.current?.click()}
                          >
                            Upload image
                          </button>
                          <input
                            ref={companyLogoFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setCompanyLogoFile(file);
                              setLogoRemoved(false);
                              setCompanyLogoBlobUrl((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return URL.createObjectURL(file);
                              });
                              e.target.value = "";
                            }}
                          />
                          {companyLogoPreviewSrc ? (
                            <button
                              type="button"
                              className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100"
                              onClick={() => {
                                setLogoRemoved(true);
                                setCompanyLogoFile(null);
                                setCompanyLogoBlobUrl((prev) => {
                                  if (prev) URL.revokeObjectURL(prev);
                                  return null;
                                });
                                if (companyLogoFileRef.current) {
                                  companyLogoFileRef.current.value = "";
                                }
                              }}
                            >
                              Remove logo
                            </button>
                          ) : null}
                        </div>
                        {companyLogoPreviewSrc ? (
                          <div className="mt-3 rounded-lg border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={companyLogoPreviewSrc}
                              alt="Company logo preview"
                              className="mx-auto max-h-32 max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        ) : null}
                        {logoRemoved &&
                        isEdit &&
                        companyProfileHadAnyLogo(row?.profile) ? (
                          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                            Logo will be removed when you save.
                            <button
                              type="button"
                              className="ml-2 underline"
                              onClick={() => {
                                setLogoRemoved(false);
                                setCompanyLogoFile(null);
                                setCompanyLogoBlobUrl((prev) => {
                                  if (prev) URL.revokeObjectURL(prev);
                                  return null;
                                });
                                if (companyLogoFileRef.current) {
                                  companyLogoFileRef.current.value = "";
                                }
                              }}
                            >
                              Undo
                            </button>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="sm:col-span-2 text-[11px] text-zinc-500">
                      Saved payment methods on file:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {form.profile.payment_methods.length}
                      </span>{" "}
                      (managed via Stripe / backend; payload passes them through
                      on save.)
                    </p>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Credit & discounts
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={formLabelClass}>
                        Credit limit
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={formControlClass}
                        value={form.profile.credit_limit}
                        onChange={(e) =>
                          setProfile(
                            "credit_limit",
                            stripNumericLeadingZerosForControlledInput(
                              e.target.value,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Payment terms (days)
                      </span>
                      <input
                        type="number"
                        min="1"
                        className={formControlClass}
                        value={form.profile.payment_terms}
                        onChange={(e) =>
                          setProfile(
                            "payment_terms",
                            stripNumericLeadingZerosForControlledInput(
                              e.target.value,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Early payment discount (%)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={formControlClass}
                        value={form.profile.early_payment_discount}
                        onChange={(e) =>
                          setProfile(
                            "early_payment_discount",
                            stripNumericLeadingZerosForControlledInput(
                              e.target.value,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Late fee rule (%)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        readOnly
                        className={`${formControlClass} bg-zinc-50 dark:bg-zinc-900/80`}
                        value={form.profile.late_fee_rule}
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Discount type
                      </span>
                      <select
                        className={formControlClass}
                        value={form.profile.discount_type}
                        onChange={(e) =>
                          setProfile("discount_type", e.target.value)
                        }
                      >
                        <option value="flat_percentage">Flat %</option>
                        <option value="flat_amount">Flat amount</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Discount limit
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={formControlClass}
                        value={form.profile.discount_limit}
                        onChange={(e) =>
                          setProfile(
                            "discount_limit",
                            stripNumericLeadingZerosForControlledInput(
                              e.target.value,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Discount applicability
                    </h3>
                  </div>
                  <div className="p-4">
                    <p className="mb-2 text-[11px] text-zinc-500">
                      Which channels discounts apply to (profile.
                      discount_applicability).
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {DISCOUNT_APPLICABILITY_OPTIONS.map((method) => (
                        <label
                          key={method}
                          className="inline-flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={form.profile.discount_applicability.includes(
                              method,
                            )}
                            onChange={() =>
                              toggleDiscountApplicability(method)
                            }
                          />
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Bank accounts
                    </h3>
                  </div>
                  <div className="space-y-4 p-4">
                    {form.bank_accounts.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-zinc-200/80 dark:border-zinc-700">
                        <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50">
                              <th className="px-2 py-2">Bank</th>
                              <th className="px-2 py-2">Holder</th>
                              <th className="px-2 py-2">Account</th>
                              <th className="px-2 py-2">Default</th>
                              <th className="px-2 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.bank_accounts.map((acc, index) => (
                              <tr
                                key={acc.id ?? index}
                                className="border-b border-zinc-100 dark:border-zinc-800"
                              >
                                <td className="px-2 py-2">{acc.bank_name}</td>
                                <td className="px-2 py-2">
                                  {acc.account_holder_name}
                                </td>
                                <td className="px-2 py-2 font-mono">
                                  ****
                                  {acc.account_number?.slice(-4) ?? ""}
                                </td>
                                <td className="px-2 py-2">
                                  {acc.is_default ? "Yes" : "No"}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  <button
                                    type="button"
                                    className="text-sky-700 underline dark:text-sky-400"
                                    onClick={() => {
                                      setNewBank({ ...acc });
                                      setEditingBankIndex(index);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="ml-2 text-rose-700 underline dark:text-rose-400"
                                    onClick={() => {
                                      setForm((s) => ({
                                        ...s,
                                        bank_accounts: s.bank_accounts.filter(
                                          (_, i) => i !== index,
                                        ),
                                      }));
                                      if (editingBankIndex === index) {
                                        setEditingBankIndex(null);
                                        setNewBank(
                                          emptyBankAccountDraft(
                                            form.profile.currency || "USD",
                                          ),
                                        );
                                      }
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        No bank accounts yet.
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className={formLabelClass}>
                          Bank name *
                        </span>
                        <input
                          className={formControlClass}
                          value={newBank.bank_name}
                          onChange={(e) =>
                            setNewBank((b) => ({
                              ...b,
                              bank_name: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className={formLabelClass}>
                          Account holder *
                        </span>
                        <input
                          className={formControlClass}
                          value={newBank.account_holder_name}
                          onChange={(e) =>
                            setNewBank((b) => ({
                              ...b,
                              account_holder_name: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="block">
                        <span className={formLabelClass}>
                          Account number *
                        </span>
                        <input
                          className={formControlClass}
                          inputMode="numeric"
                          value={newBank.account_number}
                          maxLength={34}
                          onChange={(e) =>
                            setNewBank((b) => ({
                              ...b,
                              account_number: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 34),
                            }))
                          }
                        />
                      </label>
                      <label className="block">
                        <span className={formLabelClass}>
                          Currency
                        </span>
                        <select
                          className={formControlClass}
                          value={newBank.currency}
                          onChange={(e) =>
                            setNewBank((b) => ({
                              ...b,
                              currency: e.target.value,
                            }))
                          }
                        >
                          {currencyOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 sm:col-span-2">
                        <input
                          type="checkbox"
                          className="rounded border-zinc-300"
                          checked={newBank.is_default}
                          onChange={(e) =>
                            setNewBank((b) => ({
                              ...b,
                              is_default: e.target.checked,
                            }))
                          }
                        />
                        <span className="text-sm">Default account</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        onClick={() => {
                          if (
                            !newBank.bank_name.trim() ||
                            !newBank.account_holder_name.trim() ||
                            !newBank.account_number.trim()
                          ) {
                            showAppToast(
                              "Bank name, holder, and account number are required.",
                              "error",
                            );
                            return;
                          }
                          const row = { ...newBank };
                          if (editingBankIndex !== null) {
                            let list = [...form.bank_accounts];
                            if (row.is_default) {
                              list = list.map((a) => ({
                                ...a,
                                is_default: false,
                              }));
                            }
                            list[editingBankIndex] = row;
                            setForm((s) => ({
                              ...s,
                              bank_accounts: list,
                            }));
                            setEditingBankIndex(null);
                          } else {
                            const base = row.is_default
                              ? form.bank_accounts.map((a) => ({
                                  ...a,
                                  is_default: false,
                                }))
                              : [...form.bank_accounts];
                            setForm((s) => ({
                              ...s,
                              bank_accounts: [...base, row],
                            }));
                          }
                          setNewBank(
                            emptyBankAccountDraft(
                              form.profile.currency || "USD",
                            ),
                          );
                        }}
                      >
                        {editingBankIndex !== null
                          ? "Update bank account"
                          : "Add bank account"}
                      </button>
                      {editingBankIndex !== null ? (
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-600"
                          onClick={() => {
                            setEditingBankIndex(null);
                            setNewBank(
                              emptyBankAccountDraft(
                                form.profile.currency || "USD",
                              ),
                            );
                          }}
                        >
                          Cancel edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                </section>

                {isEdit ? (
                  <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Documents
                      </h3>
                    </div>
                    <div className="space-y-4 p-4">
                      {!tenantIdForDocs ? (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Set a tenant ID (vendor / tenant) to list, upload, and
                          manage company documents for that tenant.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                              <span className="mb-1 block">Add files</span>
                              <input
                                type="file"
                                multiple
                                data-company-doc-modal
                                className="block max-w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-2 file:py-1 dark:file:bg-zinc-800"
                                onChange={(e) => {
                                  setDocumentFiles(
                                    Array.from(e.target.files ?? []),
                                  );
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              disabled={
                                documentFiles.length === 0 ||
                                uploadDocumentsMutation.isPending
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                              onClick={() => {
                                if (documentFiles.length === 0) return;
                                uploadDocumentsMutation.mutate(documentFiles);
                              }}
                            >
                              {uploadDocumentsMutation.isPending
                                ? "Uploading…"
                                : "Upload"}
                            </button>
                          </div>
                          {documentsQuery.isPending ? (
                            <p className="text-sm text-zinc-500">
                              Loading documents…
                            </p>
                          ) : documentsList.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                              No documents uploaded yet.
                            </p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-zinc-200/80 dark:border-zinc-700">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50">
                                    <th className="px-2 py-2">Name</th>
                                    <th className="px-2 py-2">Type</th>
                                    <th className="px-2 py-2">Updated</th>
                                    <th className="px-2 py-2 text-right">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {documentsList.map((doc) => (
                                    <tr
                                      key={doc.id}
                                      className="border-b border-zinc-100 dark:border-zinc-800"
                                    >
                                      <td className="px-2 py-2">{doc.name}</td>
                                      <td className="px-2 py-2">
                                        {doc.type ?? "—"}
                                      </td>
                                      <td className="px-2 py-2">
                                        {formatDocDate(doc.updated_at)}
                                      </td>
                                      <td className="px-2 py-2 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleDownloadDocument(doc)
                                          }
                                          className="rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-950/50 dark:text-sky-100"
                                        >
                                          Download
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            deleteDocumentMutation.isPending
                                          }
                                          className="ml-2 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-200 disabled:opacity-50 dark:bg-rose-950/50 dark:text-rose-100"
                                          onClick={() => {
                                            if (
                                              !globalThis.confirm(
                                                "Remove this document?",
                                              )
                                            ) {
                                              return;
                                            }
                                            deleteDocumentMutation.mutate(
                                              doc.id,
                                            );
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                ) : null}

                {isEdit && stripeCompanyProfileKey != null ? (
                  <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Payment cards (Stripe)
                      </h3>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Company profile cards (not CRM customer). Uses the same
                          Stripe routes as the company profile view.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCardEditorOpen((x) => !x);
                            setAddCardError(null);
                          }}
                          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100"
                        >
                          {cardEditorOpen ? "Hide add card" : "Add card"}
                        </button>
                      </div>

                      {stripePaymentMethods.length === 0 && !cardEditorOpen ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No cards on file yet.
                        </p>
                      ) : null}

                      {stripePaymentMethods.length > 0 ? (
                        <ul className="space-y-2">
                          {stripePaymentMethods.map((pm) => (
                            <li
                              key={pm.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50"
                            >
                              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[11px] font-medium uppercase text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
                                  {pm.card?.brand ?? "Card"}
                                </span>{" "}
                                **** {pm.card?.last4 ?? "—"}
                                {pm.card?.exp_month != null &&
                                pm.card?.exp_year != null ? (
                                  <span className="ml-1 text-xs text-zinc-500">
                                    ({String(pm.card.exp_month).padStart(2, "0")}/
                                    {pm.card.exp_year})
                                  </span>
                                ) : null}
                                {pm.is_default ? (
                                  <span className="ml-2 rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-100">
                                    Default
                                  </span>
                                ) : null}
                              </span>
                              <span className="flex items-center gap-1">
                                {!pm.is_default ? (
                                  <button
                                    type="button"
                                    disabled={setDefaultCardMutation.isPending}
                                    onClick={() => handleSetDefaultCard(pm.id)}
                                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                  >
                                    Set default
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={removeCardMutation.isPending}
                                  onClick={() => handleRemoveCard(pm.id)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                                >
                                  Remove
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {cardEditorOpen ? (
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/30">
                          {!publishableKey || !stripePromise ? (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {pkQuery.isPending
                                ? "Loading Stripe configuration…"
                                : "Stripe publishable key is unavailable."}
                            </p>
                          ) : (
                            <Elements stripe={stripePromise}>
                              <CompanyProfileAddCardForm
                                profileId={stripeCompanyProfileKey}
                                cardholderLabel={
                                  String(row?.name ?? "").trim() || "Company"
                                }
                                onCardAdded={handleCardAdded}
                                onError={(msg) => setAddCardError(msg)}
                              />
                            </Elements>
                          )}
                          {addCardError ? (
                            <p
                              className="mt-3 rounded-lg border border-rose-200/90 bg-rose-50/90 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                              role="alert"
                            >
                              {addCardError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-200/70 bg-zinc-50/80 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingRow}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save company" : "Create company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
