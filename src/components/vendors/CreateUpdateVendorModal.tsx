"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import countries from "world-countries";
import { useVendor } from "@/hooks/vendors/useVendor";
import { useVendorMutations } from "@/hooks/vendors/useVendorMutations";
import {
  currenciesFromResponse,
  useActiveCurrencies,
} from "@/hooks/currencies/useActiveCurrencies";
import {
  vendorPayloadToFormData,
  vendorPayloadToJson,
  type VendorProfileSubmitFields,
  type VendorSubmitPayload,
} from "@/lib/vendors/buildVendorSubmitBody";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Vendor, VendorBankAccount, VendorProfile } from "@/models/Vendor";
import { VendorStatus } from "@/models/Vendor";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import {
  firstLogoField,
  logoDisplaySrc,
  logoPreviewSource,
  shouldHideLogoTextValue,
} from "@/lib/logoDisplaySrc";
import { formControlClass, formFieldSurfaceClass } from "@/lib/uiFormClasses";

const DELIVERY_METHODS = ["email", "sms", "portal"] as const;

type BankDraft = VendorBankAccount & { id?: number };

function vendorProfileHadAnyLogo(
  profile: VendorProfile | null | undefined,
): boolean {
  return Boolean(
    firstLogoField(profile?.logo, profile?.logo_url),
  );
}

function emptyBank(currency: string): BankDraft {
  return {
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    routing_number: "",
    swift_code: "",
    iban: "",
    currency: currency || "USD",
    account_type: "",
    is_default: false,
    notes: "",
  };
}

const INITIAL = {
  name: "",
  email: "",
  phone: "",
  status: VendorStatus.ACTIVE,
  address: "",
  country: "",
  city: "",
  state: "",
  postal_code: "",
  tax_id: "",
  vat_exemption: false,
  vat_rate: 0,
  payment_terms: 0,
  currency: "USD",
  invoice_delivery_methods: [] as string[],
  contact_person_name: "",
  contact_person_email: "",
  contact_person_phone: "",
  main_app_visibility: true,
};

type CreateUpdateVendorModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Set when editing; `null` for create. */
  vendorId: number | string | null;
};

export function CreateUpdateVendorModal({
  open,
  onClose,
  onSuccess,
  vendorId,
}: CreateUpdateVendorModalProps) {
  const isEdit = vendorId != null;
  const mutations = useVendorMutations();
  const [formData, setFormData] = useState(INITIAL);
  const [errors] = useState<Record<string, string>>({});
  const [profileOpen, setProfileOpen] = useState(true);
  const [bankOpen, setBankOpen] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankDraft[]>([]);
  const [newBankAccount, setNewBankAccount] = useState<BankDraft>(() =>
    emptyBank("USD"),
  );
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const vendorLogoFileRef = useRef<HTMLInputElement>(null);
  const [vendorLogoFile, setVendorLogoFile] = useState<File | null>(null);
  const [vendorLogoBlobUrl, setVendorLogoBlobUrl] = useState<string | null>(
    null,
  );

  const detailQuery = useVendor(open && isEdit ? vendorId : null, {
    load_profile: true,
  });
  const fetchedVendor = unwrapApiSuccessData<Vendor>(detailQuery.data);
  const loadingVendor = Boolean(isEdit && detailQuery.isPending && open);

  const currenciesQuery = useActiveCurrencies();
  const activeCurrencies = currenciesFromResponse(currenciesQuery.data);

  const currencyOptions = useMemo(() => {
    return activeCurrencies
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((c) => ({
        value: c.code,
        label: `${c.code} — ${c.name} (${c.symbol || c.code})`,
      }));
  }, [activeCurrencies]);

  const countryOptions = useMemo(
    () =>
      countries
        .map((c) => ({ value: c.name.common, label: c.name.common }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  const statusOptions = useMemo(
    () =>
      Object.values(VendorStatus).map((s) => ({
        value: s,
        label: s,
      })),
    [],
  );

  useEffect(() => {
    if (!open || isEdit) return;
    setLogoRemoved(false);
    setVendorLogoFile(null);
    setVendorLogoBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (vendorLogoFileRef.current) vendorLogoFileRef.current.value = "";
  }, [open, isEdit]);

  useEffect(() => {
    if (open) return;
    setVendorLogoFile(null);
    setVendorLogoBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (vendorLogoFileRef.current) vendorLogoFileRef.current.value = "";
  }, [open]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate controlled form when GET vendor returns */
    if (!open || !isEdit) return;
    if (loadingVendor || !fetchedVendor?.id) return;

    const v = fetchedVendor;
    const profile = v.profile;
    setFormData({
      name: v.name ?? "",
      email: v.email ?? "",
      phone: v.phone ?? "",
      status: (v.status as VendorStatus) ?? VendorStatus.ACTIVE,
      address: profile?.address ?? "",
      country: profile?.country ?? "",
      city: profile?.city ?? "",
      state: profile?.state ?? "",
      postal_code: profile?.postal_code ?? "",
      tax_id: profile?.tax_id ?? "",
      vat_exemption: profile?.vat_exemption ?? false,
      vat_rate: profile?.vat_rate ?? 0,
      payment_terms: profile?.payment_terms ?? 0,
      currency: profile?.currency ?? "USD",
      invoice_delivery_methods: Array.isArray(profile?.invoice_delivery_methods)
        ? [...profile.invoice_delivery_methods]
        : [],
      contact_person_name: profile?.contact_person_name ?? "",
      contact_person_email: profile?.contact_person_email ?? "",
      contact_person_phone: profile?.contact_person_phone ?? "",
      main_app_visibility: profile?.main_app_visibility ?? true,
    });
    setLogoRemoved(false);
    if (vendorLogoFileRef.current) vendorLogoFileRef.current.value = "";

    const rawBanks = v.bank_accounts ?? [];
    setBankAccounts(Array.isArray(rawBanks) ? (rawBanks as BankDraft[]) : []);
    setEditingBankIndex(null);
    setNewBankAccount(emptyBank(profile?.currency ?? "USD"));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, isEdit, loadingVendor, fetchedVendor]);

  function handleField<K extends keyof typeof formData>(
    key: K,
    value: (typeof formData)[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === "currency") {
      setNewBankAccount((b) => ({
        ...b,
        currency: String(value),
      }));
    }
  }

  function toggleDelivery(method: string) {
    setFormData((prev) => {
      const set = new Set(prev.invoice_delivery_methods);
      if (set.has(method)) set.delete(method);
      else set.add(method);
      return {
        ...prev,
        invoice_delivery_methods: Array.from(set) as string[],
      };
    });
  }

  const currentVendor = fetchedVendor;

  const vendorLogoPreviewSrc = useMemo(() => {
    if (vendorLogoBlobUrl) return vendorLogoBlobUrl;
    if (isEdit && logoRemoved && !vendorLogoFile) return "";
    const p = currentVendor?.profile;
    if (!p) return "";
    return (
      logoDisplaySrc(logoPreviewSource(p.logo, p.logo_url)) ?? ""
    );
  }, [
    vendorLogoBlobUrl,
    vendorLogoFile,
    isEdit,
    logoRemoved,
    currentVendor?.profile,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit && !currentVendor?.id) return;

    const hadLogoFromApi = vendorProfileHadAnyLogo(currentVendor?.profile);
    const origLogo = String(currentVendor?.profile?.logo ?? "").trim();
    const origUrl = String(currentVendor?.profile?.logo_url ?? "").trim();

    const profileFields: VendorProfileSubmitFields = {
      address: formData.address.trim() || undefined,
      country: formData.country.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      postal_code: formData.postal_code.trim() || undefined,
      tax_id: formData.tax_id.trim() || undefined,
      vat_exemption: formData.vat_exemption,
      vat_rate: Number.isFinite(formData.vat_rate) ? formData.vat_rate : 0,
      payment_terms: Number.isFinite(formData.payment_terms)
        ? formData.payment_terms
        : 0,
      currency: formData.currency.trim() || "USD",
      invoice_delivery_methods: formData.invoice_delivery_methods,
      contact_person_name: formData.contact_person_name.trim() || undefined,
      contact_person_email: formData.contact_person_email.trim() || undefined,
      contact_person_phone: formData.contact_person_phone.trim() || undefined,
      main_app_visibility: formData.main_app_visibility,
    };

    if (!vendorLogoFile) {
      if (isEdit && logoRemoved && hadLogoFromApi) {
        profileFields.logo = null;
        profileFields.logo_url = null;
      } else if (isEdit && !logoRemoved) {
        if (origLogo) profileFields.logo = origLogo;
        if (origUrl) profileFields.logo_url = origUrl;
      }
    }

    const payload: VendorSubmitPayload = {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      status: formData.status,
      profile: profileFields,
      bank_accounts: bankAccounts as VendorBankAccount[],
      remove_logo: Boolean(
        isEdit && logoRemoved && hadLogoFromApi && !vendorLogoFile,
      ),
    };

    let body: FormData | Record<string, unknown>;
    if (vendorLogoFile) {
      const pf: VendorProfileSubmitFields = { ...profileFields };
      if (typeof pf.logo_url === "string") {
        if (
          pf.logo_url.startsWith("data:") ||
          shouldHideLogoTextValue(pf.logo_url)
        ) {
          delete pf.logo_url;
        }
      }
      if (typeof pf.logo === "string") {
        if (
          pf.logo.startsWith("data:") ||
          shouldHideLogoTextValue(pf.logo)
        ) {
          delete pf.logo;
        }
      }
      body = vendorPayloadToFormData(
        { ...payload, profile: pf },
        vendorLogoFile,
      );
    } else {
      body = vendorPayloadToJson(payload);
    }

    try {
      if (isEdit && vendorId != null) {
        await mutations.update.mutateAsync({ id: vendorId, body });
        showAppToast("Vendor updated.", "success");
      } else {
        await mutations.create.mutateAsync(body);
        showAppToast("Vendor created.", "success");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  const saving = mutations.create.isPending || mutations.update.isPending;

  if (!open) return null;

  const showForm = !isEdit || (!loadingVendor && currentVendor);
  const showMissing = isEdit && !loadingVendor && !currentVendor;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-form-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200/70 bg-gradient-to-r from-emerald-50/90 to-teal-50/40 px-5 py-4 dark:border-zinc-800 dark:from-emerald-950/40 dark:to-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="vendor-form-title"
              className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {isEdit ? "Edit vendor" : "Create vendor"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-white/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loadingVendor ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
                  aria-hidden
                />
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Loading vendor…
                </p>
              </div>
            ) : null}

            {showMissing ? (
              <p
                className="rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
                role="alert"
              >
                Vendor data not found. Please try again.
              </p>
            ) : null}

            {showForm ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Name *
                    </span>
                    <input
                      required
                      className={`mt-1 ${formControlClass}`}
                      value={formData.name}
                      onChange={(e) => handleField("name", e.target.value)}
                      placeholder="Vendor name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Email
                    </span>
                    <input
                      type="email"
                      className={`mt-1 ${formControlClass}`}
                      value={formData.email}
                      onChange={(e) => handleField("email", e.target.value)}
                    />
                    {errors.email ? (
                      <span className="mt-1 text-xs text-rose-600">
                        {errors.email}
                      </span>
                    ) : null}
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Phone
                    </span>
                    <input
                      type="tel"
                      maxLength={20}
                      className={`mt-1 ${formControlClass}`}
                      value={formData.phone}
                      onChange={(e) =>
                        handleField("phone", e.target.value.slice(0, 20))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Status
                    </span>
                    <select
                      className={`mt-1 ${formControlClass}`}
                      value={formData.status}
                      onChange={(e) =>
                        handleField("status", e.target.value as VendorStatus)
                      }
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-2 text-left text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    Vendor profile
                    <span className="text-zinc-400">{profileOpen ? "−" : "+"}</span>
                  </button>
                  {profileOpen ? (
                    <div className="mt-3 space-y-3 border-l-2 border-emerald-500/30 pl-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Address
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={formData.address}
                            onChange={(e) =>
                              handleField("address", e.target.value)
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Country
                          </span>
                          <select
                            className={`mt-1 ${formControlClass}`}
                            value={formData.country}
                            onChange={(e) =>
                              handleField("country", e.target.value)
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
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            State / region
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={formData.state}
                            onChange={(e) =>
                              handleField("state", e.target.value)
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Postal code
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={formData.postal_code}
                            onChange={(e) =>
                              handleField("postal_code", e.target.value)
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            City
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={formData.city}
                            onChange={(e) =>
                              handleField("city", e.target.value)
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Tax ID
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={formData.tax_id}
                            onChange={(e) =>
                              handleField("tax_id", e.target.value)
                            }
                          />
                        </label>
                        <label className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={formData.vat_exemption}
                            onChange={(e) =>
                              handleField("vat_exemption", e.target.checked)
                            }
                          />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            VAT exemption
                          </span>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            VAT rate
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            className={`mt-1 ${formControlClass}`}
                            value={formData.vat_rate}
                            onChange={(e) =>
                              handleField(
                                "vat_rate",
                                Number.parseFloat(
                                  stripNumericLeadingZerosForControlledInput(
                                    e.target.value,
                                  ),
                                ) || 0,
                              )
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Payment terms (days)
                          </span>
                          <input
                            type="number"
                            className={`mt-1 ${formControlClass}`}
                            value={formData.payment_terms}
                            onChange={(e) =>
                              handleField(
                                "payment_terms",
                                Number.parseInt(
                                  stripNumericLeadingZerosForControlledInput(
                                    e.target.value,
                                  ),
                                  10,
                                ) || 0,
                              )
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Currency
                          </span>
                          <select
                            className={`mt-1 ${formControlClass}`}
                            value={formData.currency}
                            onChange={(e) =>
                              handleField("currency", e.target.value)
                            }
                          >
                            {currencyOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-2 sm:col-span-2 pt-2">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={formData.main_app_visibility}
                            onChange={(e) =>
                              handleField(
                                "main_app_visibility",
                                e.target.checked,
                              )
                            }
                          />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Main app visibility
                          </span>
                        </label>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Invoice delivery methods
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3">
                          {DELIVERY_METHODS.map((method) => (
                            <label
                              key={method}
                              className="inline-flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-zinc-300"
                                checked={formData.invoice_delivery_methods.includes(
                                  method,
                                )}
                                onChange={() => toggleDelivery(method)}
                              />
                              {method.charAt(0).toUpperCase() + method.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Contact person
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <input
                            className={formFieldSurfaceClass}
                            placeholder="Name"
                            value={formData.contact_person_name}
                            onChange={(e) =>
                              handleField("contact_person_name", e.target.value)
                            }
                          />
                          <input
                            type="email"
                            className={formFieldSurfaceClass}
                            placeholder="Email"
                            value={formData.contact_person_email}
                            onChange={(e) =>
                              handleField(
                                "contact_person_email",
                                e.target.value,
                              )
                            }
                          />
                          <input
                            type="tel"
                            maxLength={20}
                            className={formFieldSurfaceClass}
                            placeholder="Phone"
                            value={formData.contact_person_phone}
                            onChange={(e) =>
                              handleField(
                                "contact_person_phone",
                                e.target.value.slice(0, 20),
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-teal-50/30 p-3.5 shadow-sm shadow-zinc-900/[0.04] dark:border-zinc-800/80 dark:from-zinc-950 dark:to-teal-950/20 dark:shadow-black/20">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Vendor logo
                        </span>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Upload PNG or JPEG (or WebP / GIF). Large saved images
                          show only in the preview.
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Shown on invoices and profile pages when supported.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-xl border border-teal-300/80 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 shadow-sm hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/55"
                            onClick={() => vendorLogoFileRef.current?.click()}
                          >
                            Upload image
                          </button>
                          <input
                            ref={vendorLogoFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setVendorLogoFile(file);
                              setVendorLogoBlobUrl((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return URL.createObjectURL(file);
                              });
                              setLogoRemoved(false);
                              e.target.value = "";
                            }}
                          />
                          {vendorLogoPreviewSrc ? (
                            <button
                              type="button"
                              className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100"
                              onClick={() => {
                                setLogoRemoved(true);
                                setVendorLogoFile(null);
                                setVendorLogoBlobUrl((prev) => {
                                  if (prev) URL.revokeObjectURL(prev);
                                  return null;
                                });
                                if (vendorLogoFileRef.current) {
                                  vendorLogoFileRef.current.value = "";
                                }
                              }}
                            >
                              Remove logo
                            </button>
                          ) : null}
                        </div>
                        {vendorLogoPreviewSrc ? (
                          <div className="mt-3 rounded-lg border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={vendorLogoPreviewSrc}
                              alt="Logo preview"
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
                        vendorProfileHadAnyLogo(currentVendor?.profile) ? (
                          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                            Logo will be removed when you save.
                            <button
                              type="button"
                              className="ml-2 underline"
                              onClick={() => {
                                setLogoRemoved(false);
                                setVendorLogoFile(null);
                                setVendorLogoBlobUrl((prev) => {
                                  if (prev) URL.revokeObjectURL(prev);
                                  return null;
                                });
                                if (vendorLogoFileRef.current) {
                                  vendorLogoFileRef.current.value = "";
                                }
                              }}
                            >
                              Undo
                            </button>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setBankOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-2 text-left text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    Bank accounts
                    <span className="text-zinc-400">{bankOpen ? "−" : "+"}</span>
                  </button>
                  {bankOpen ? (
                    <div className="mt-3 space-y-4 border-l-2 border-sky-500/30 pl-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !newBankAccount.bank_name.trim() ||
                              !newBankAccount.account_holder_name.trim() ||
                              !newBankAccount.account_number.trim()
                            ) {
                              showAppToast(
                                "Bank name, account holder, and account number are required.",
                                "error",
                              );
                              return;
                            }
                            if (editingBankIndex !== null) {
                              let next = [...bankAccounts];
                              if (newBankAccount.is_default) {
                                next = next.map((a) => ({
                                  ...a,
                                  is_default: false,
                                }));
                              }
                              const acc: BankDraft = {
                                ...newBankAccount,
                                id:
                                  bankAccounts[editingBankIndex]?.id ??
                                  Date.now(),
                              };
                              next[editingBankIndex] = acc;
                              setBankAccounts(next);
                              setEditingBankIndex(null);
                            } else {
                              const base = newBankAccount.is_default
                                ? bankAccounts.map((a) => ({
                                    ...a,
                                    is_default: false,
                                  }))
                                : [...bankAccounts];
                              const acc: BankDraft = {
                                ...newBankAccount,
                                id: Date.now(),
                              };
                              setBankAccounts([...base, acc]);
                            }
                            setNewBankAccount(emptyBank(formData.currency));
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          {editingBankIndex !== null
                            ? "Update bank account"
                            : "Add bank account"}
                        </button>
                        {editingBankIndex !== null ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBankIndex(null);
                              setNewBankAccount(emptyBank(formData.currency));
                            }}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
                          >
                            Cancel edit
                          </button>
                        ) : null}
                      </div>

                      {bankAccounts.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-700">
                          <table className="w-full min-w-[48rem] border-collapse text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50">
                                <th className="px-2 py-2">Bank</th>
                                <th className="px-2 py-2">Holder</th>
                                <th className="px-2 py-2">Account</th>
                                <th className="px-2 py-2">Default</th>
                                <th className="px-2 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bankAccounts.map((account, index) => (
                                <tr
                                  key={account.id ?? index}
                                  className="border-b border-zinc-100 dark:border-zinc-800"
                                >
                                  <td className="px-2 py-2">
                                    {account.bank_name}
                                  </td>
                                  <td className="px-2 py-2">
                                    {account.account_holder_name}
                                  </td>
                                  <td className="px-2 py-2 font-mono">
                                    ****
                                    {account.account_number?.slice(-4) ?? ""}
                                  </td>
                                  <td className="px-2 py-2">
                                    {account.is_default ? "Yes" : "No"}
                                  </td>
                                  <td className="px-2 py-2 text-right">
                                    <button
                                      type="button"
                                      className="mr-1 text-sky-700 underline dark:text-sky-400"
                                      onClick={() => {
                                        setNewBankAccount({ ...account });
                                        setEditingBankIndex(index);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="text-rose-700 underline dark:text-rose-400"
                                      onClick={() => {
                                        setBankAccounts((rows) =>
                                          rows.filter((_, i) => i !== index),
                                        );
                                        if (editingBankIndex === index) {
                                          setEditingBankIndex(null);
                                          setNewBankAccount(
                                            emptyBank(formData.currency),
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
                        <p className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-3 py-2 text-center text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
                          No bank accounts yet. Fill the form below and click
                          Add bank account.
                        </p>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Bank name *
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.bank_name}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                bank_name: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Account holder *
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.account_holder_name}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                account_holder_name: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Account number *
                          </span>
                          <input
                            inputMode="numeric"
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.account_number}
                            maxLength={34}
                            onChange={(e) => {
                              const digits = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 34);
                              setNewBankAccount((b) => ({
                                ...b,
                                account_number: digits,
                              }));
                            }}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Routing number
                          </span>
                          <input
                            inputMode="numeric"
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.routing_number ?? ""}
                            maxLength={20}
                            onChange={(e) => {
                              const digits = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 20);
                              setNewBankAccount((b) => ({
                                ...b,
                                routing_number: digits,
                              }));
                            }}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            SWIFT
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.swift_code ?? ""}
                            maxLength={11}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                swift_code: e.target.value.slice(0, 11),
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            IBAN
                          </span>
                          <input
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.iban ?? ""}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                iban: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Currency
                          </span>
                          <select
                            className={`mt-1 ${formControlClass}`}
                            value={
                              newBankAccount.currency || formData.currency
                            }
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
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
                        <label className="block">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Account type
                          </span>
                          <select
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.account_type ?? ""}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                account_type: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select…</option>
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                            <option value="business">Business</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 sm:col-span-2">
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300"
                            checked={newBankAccount.is_default}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                is_default: e.target.checked,
                              }))
                            }
                          />
                          <span className="text-sm">Default account</span>
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] font-semibold text-zinc-500">
                            Notes
                          </span>
                          <textarea
                            rows={2}
                            className={`mt-1 ${formControlClass}`}
                            value={newBankAccount.notes ?? ""}
                            onChange={(e) =>
                              setNewBankAccount((b) => ({
                                ...b,
                                notes: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
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
              disabled={saving || loadingVendor || showMissing}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Update vendor" : "Create vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
