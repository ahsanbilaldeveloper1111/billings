"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CustomerPaymentCardsEditor } from "@/components/customers/CustomerPaymentCardsEditor";
import { CustomerSavedCardsInlineSummary } from "@/components/customers/CustomerSavedCardsInlineSummary";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { useCrmCompanies } from "@/hooks/crm/useCrmCompanies";
import { useCustomer } from "@/hooks/customers/useCustomer";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import {
  currenciesFromResponse,
  useActiveCurrencies,
} from "@/hooks/currencies/useActiveCurrencies";
import { errorsFromAxios } from "@/lib/api/errorsFromAxios";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import { extractListRows } from "@/lib/api/extractApiData";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Company } from "@/models/Company";
import { customerApiResourceKey } from "@/lib/customers/customerApiResourceKey";
import { customerStripeCrmId } from "@/lib/customers/customerStripeCrmId";
import type { CreateCustomerData, Customer, CustomerProfile } from "@/models/Customer";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

type ProfileForm = {
  address: string;
  city: string;
  country: string;
  postal_code: string;
  currency: string;
  vat_rate: string | number;
  vat_exemption: boolean;
  tax_id: string;
  payment_terms: string | number;
  credit_limit: string | number;
  discount_type: string;
  discount_limit: string | number;
  early_payment_discount: string | number;
  late_fee_rule: string | number;
};

function emptyProfile(): ProfileForm {
  return {
    address: "",
    city: "",
    country: "",
    postal_code: "",
    currency: "",
    vat_rate: "",
    vat_exemption: false,
    tax_id: "",
    payment_terms: "",
    credit_limit: "",
    discount_type: "",
    discount_limit: "",
    early_payment_discount: "",
    late_fee_rule: "",
  };
}

function emptyForm() {
  return {
    crm_company_id: null as string | null,
    tenant_id: null as string | null,
    phone: "",
    email: "",
    profile: emptyProfile(),
  };
}

function optNum(
  v: string | number | null | undefined,
): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function buildCustomerPayload(
  formData: ReturnType<typeof emptyForm>,
  crmCompanyId: string,
): CreateCustomerData {
  const p = formData.profile;
  const tenantId =
    formData.tenant_id != null && String(formData.tenant_id).trim() !== ""
      ? String(formData.tenant_id).trim()
      : undefined;
  const profile: Partial<CustomerProfile> = {
    address: p.address.trim() || undefined,
    city: p.city.trim() || undefined,
    country: p.country.trim() || undefined,
    postal_code: p.postal_code.trim() || undefined,
    currency: p.currency.trim() || undefined,
    vat_rate: optNum(p.vat_rate),
    vat_exemption: Boolean(p.vat_exemption),
    tax_id: p.tax_id.trim() || undefined,
    payment_terms: optNum(p.payment_terms),
    credit_limit: optNum(p.credit_limit),
    discount_type: p.discount_type.trim() || undefined,
    discount_limit: optNum(p.discount_limit),
    early_payment_discount: optNum(p.early_payment_discount),
    late_fee_rule: optNum(p.late_fee_rule),
  };
  return {
    crm_company_id: crmCompanyId,
    tenant_id: tenantId ?? null,
    phone: formData.phone.trim() || undefined,
    email: formData.email.trim() || undefined,
    profile,
  };
}

function Section({
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{message}</p>
  );
}

type CreateUpdateCustomerModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** `null` = create customer */
  customerId: number | string | null;
};

export function CreateUpdateCustomerModal({
  open,
  onClose,
  onSuccess,
  customerId,
}: CreateUpdateCustomerModalProps) {
  const isEdit = customerId != null;
  const mutations = useCustomerMutations();

  const [formData, setFormData] = useState(() => emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detailQuery = useCustomer(open && isEdit ? customerId : null, {
    load_profile: true,
    load_invoices_count: true,
  });

  const currentCustomer = unwrapApiSuccessData<Customer>(detailQuery.data);

  const crmListParams = useMemo(
    () => ({
      page: 1,
      limit: 500,
      ...(formData.tenant_id?.trim()
        ? { tenant_id: formData.tenant_id.trim() }
        : {}),
    }),
    [formData.tenant_id],
  );

  const crmCompaniesQuery = useCrmCompanies(crmListParams, {
    enabled: open && Boolean(formData.tenant_id?.trim()),
  });
  const crmRows = extractListRows<Company & Record<string, unknown>>(
    crmCompaniesQuery.data,
  ).rows;

  const currenciesQ = useActiveCurrencies();
  const activeCurrencies = currenciesFromResponse(currenciesQ.data);
  const currencyOptions = useMemo(
    () =>
      activeCurrencies.map((c) => ({
        value: c.code,
        label: `${c.code}${c.name ? ` (${c.name})` : ""}`,
      })),
    [activeCurrencies],
  );

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      /* eslint-disable react-hooks/set-state-in-effect -- reset create form when sheet opens */
      setFormData(emptyForm());
      setErrors({});
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, isEdit]);

  useEffect(() => {
    if (!open || !isEdit) return;
    const raw = unwrapApiSuccessData<Customer>(detailQuery.data);
    if (!raw) return;
    const profile = raw.profile ?? null;
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from GET customer */
    setFormData({
      crm_company_id: raw.crm_company_id ?? null,
      tenant_id: raw.tenant_id ?? null,
      phone: raw.phone ?? "",
      email: raw.email ?? "",
      profile: {
        address: profile?.address ?? "",
        city: profile?.city ?? "",
        country: profile?.country ?? "",
        postal_code: profile?.postal_code ?? "",
        currency: profile?.currency ?? "",
        vat_rate: profile?.vat_rate ?? "",
        vat_exemption: profile?.vat_exemption ?? false,
        tax_id: profile?.tax_id ?? "",
        payment_terms: profile?.payment_terms ?? "",
        credit_limit: profile?.credit_limit ?? "",
        discount_type: profile?.discount_type ?? "",
        discount_limit: profile?.discount_limit ?? "",
        early_payment_discount: profile?.early_payment_discount ?? "",
        late_fee_rule: profile?.late_fee_rule ?? "",
      },
    });
    setErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, isEdit, detailQuery.data]);

  const handleChange = (field: keyof typeof formData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (
    field: keyof ProfileForm,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }));
  };

  const crmCompanyIdForSubmit = useMemo(() => {
    if (!isEdit) {
      return formData.crm_company_id?.trim() || null;
    }
    if (!currentCustomer) return null;
    const fromForm = formData.crm_company_id?.trim();
    if (fromForm) return fromForm;
    return String(customerApiResourceKey(currentCustomer));
  }, [isEdit, currentCustomer, formData.crm_company_id]);

  const stripeCrmId = useMemo(
    () =>
      isEdit && currentCustomer
        ? customerStripeCrmId(currentCustomer)
        : null,
    [isEdit, currentCustomer],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (!isEdit) {
      const tenantId =
        formData.tenant_id != null && String(formData.tenant_id).trim() !== ""
          ? formData.tenant_id
          : null;
      if (!tenantId) {
        setErrors({ tenant_id: "Company is required when creating a customer." });
        return;
      }
    }
    if (!crmCompanyIdForSubmit) {
      setErrors({ crm_company_id: "CRM company is required." });
      return;
    }
    const payload = buildCustomerPayload(formData, crmCompanyIdForSubmit);
    try {
      if (isEdit && currentCustomer) {
        const id = customerApiResourceKey(currentCustomer);
        await mutations.update.mutateAsync({ id, body: payload });
        showAppToast("Customer updated.", "success");
      } else {
        await mutations.create.mutateAsync(payload);
        showAppToast("Customer created.", "success");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const mapped = errorsFromAxios(err);
      setErrors(mapped);
      const hasFieldError = Object.keys(mapped).some((k) => k !== "submit");
      if (!hasFieldError) showBillingBackendErrorToast(err);
    }
  }

  const isPending =
    mutations.create.isPending || mutations.update.isPending;
  const loadingCustomer = isEdit && detailQuery.isPending;

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
              {isEdit ? "Edit customer" : "Create customer"}
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
            {loadingCustomer ? (
              <div className="flex justify-center py-10">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
                  aria-hidden
                />
              </div>
            ) : (
              <>
                {errors.submit ? (
                  <div
                    className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
                    role="alert"
                  >
                    {errors.submit}
                  </div>
                ) : null}

                <Section title="Basic information">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={formLabelClass}>
                        Tenant {!isEdit ? "*" : ""}
                      </label>
                      <TenantSearchableDropdown
                        value={formData.tenant_id ?? null}
                        disabled={isEdit}
                        isClearable={!isEdit}
                        onChange={(v) => {
                          setFormData((prev) => ({
                            ...prev,
                            tenant_id: v,
                            crm_company_id: null,
                          }));
                          if (errors.tenant_id)
                            setErrors((prev) => ({ ...prev, tenant_id: "" }));
                        }}
                      />
                      <FieldError message={errors.tenant_id} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={formLabelClass}>
                        CRM company *
                      </label>
                      <select
                        className={formControlClass}
                        disabled={
                          !formData.tenant_id?.trim() || isEdit
                        }
                        value={formData.crm_company_id ?? ""}
                        onChange={(e) =>
                          handleChange(
                            "crm_company_id",
                            e.target.value || null,
                          )
                        }
                      >
                        <option value="">
                          {formData.tenant_id?.trim()
                            ? "Select CRM company…"
                            : "Select a tenant first…"}
                        </option>
                        {crmRows.map((co) => {
                          const id = co.id ?? co.company_id;
                          if (id == null) return null;
                          return (
                            <option key={String(id)} value={String(id)}>
                              {co.name ? String(co.name) : String(id)}
                            </option>
                          );
                        })}
                      </select>
                      <FieldError message={errors.crm_company_id} />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Email
                      </label>
                      <input
                        type="email"
                        className={formControlClass}
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Phone
                      </label>
                      <input
                        type="text"
                        className={formControlClass}
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Address">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={formLabelClass}>
                        Address
                      </label>
                      <textarea
                        rows={2}
                        className={formControlClass}
                        value={formData.profile.address}
                        onChange={(e) =>
                          handleProfileChange("address", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        City
                      </label>
                      <input
                        className={formControlClass}
                        value={formData.profile.city}
                        onChange={(e) =>
                          handleProfileChange("city", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Country
                      </label>
                      <input
                        className={formControlClass}
                        value={formData.profile.country}
                        onChange={(e) =>
                          handleProfileChange("country", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Postal code
                      </label>
                      <input
                        className={formControlClass}
                        value={formData.profile.postal_code}
                        onChange={(e) =>
                          handleProfileChange("postal_code", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Tax & billing">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={formLabelClass}>
                        Currency
                      </label>
                      {isEdit ? (
                        <>
                          <input
                            type="text"
                            readOnly
                            className={`${formControlClass} cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/80`}
                            value={formData.profile.currency || "USD"}
                          />
                          <p className="mt-1 text-[11px] text-zinc-500">
                            Currency is set by the system and cannot be edited
                            here.
                          </p>
                        </>
                      ) : (
                        <select
                          className={formControlClass}
                          value={formData.profile.currency}
                          onChange={(e) =>
                            handleProfileChange("currency", e.target.value)
                          }
                        >
                          <option value="">Select currency…</option>
                          {currencyOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {isEdit && stripeCrmId ? (
                        <div className="mt-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-700">
                          <p className="mb-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            Saved payment cards (Stripe)
                          </p>
                          <CustomerSavedCardsInlineSummary
                            crmCompanyId={stripeCrmId}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        VAT rate (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className={formControlClass}
                        value={
                          formData.profile.vat_rate === ""
                            ? ""
                            : formData.profile.vat_rate
                        }
                        onChange={(e) => {
                          const v = stripNumericLeadingZerosForControlledInput(
                            e.target.value,
                          );
                          handleProfileChange(
                            "vat_rate",
                            v === "" ? "" : Number(v),
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.profile.vat_exemption)}
                          onChange={(e) =>
                            handleProfileChange(
                              "vat_exemption",
                              e.target.checked,
                            )
                          }
                          className="rounded border-zinc-300"
                        />
                        VAT exemption
                      </label>
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Tax ID
                      </label>
                      <input
                        className={formControlClass}
                        value={formData.profile.tax_id}
                        onChange={(e) =>
                          handleProfileChange("tax_id", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Payment terms (days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        className={formControlClass}
                        value={
                          formData.profile.payment_terms === ""
                            ? ""
                            : formData.profile.payment_terms
                        }
                        onChange={(e) => {
                          const v = stripNumericLeadingZerosForControlledInput(
                            e.target.value,
                          );
                          handleProfileChange(
                            "payment_terms",
                            v === "" ? "" : Number(v),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Credit limit
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={formControlClass}
                        value={
                          formData.profile.credit_limit === ""
                            ? ""
                            : formData.profile.credit_limit
                        }
                        onChange={(e) => {
                          const v = stripNumericLeadingZerosForControlledInput(
                            e.target.value,
                          );
                          handleProfileChange(
                            "credit_limit",
                            v === "" ? "" : Number(v),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Discount type
                      </label>
                      <select
                        className={formControlClass}
                        value={formData.profile.discount_type || ""}
                        onChange={(e) =>
                          handleProfileChange("discount_type", e.target.value)
                        }
                      >
                        <option value="">Select…</option>
                        <option value="flat_percentage">Flat %</option>
                        <option value="flat_amount">Flat amount</option>
                      </select>
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Discount limit
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={formControlClass}
                        value={
                          formData.profile.discount_limit === ""
                            ? ""
                            : formData.profile.discount_limit
                        }
                        onChange={(e) => {
                          const v = stripNumericLeadingZerosForControlledInput(
                            e.target.value,
                          );
                          handleProfileChange(
                            "discount_limit",
                            v === "" ? "" : Number(v),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Early payment discount (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className={formControlClass}
                        value={
                          formData.profile.early_payment_discount === ""
                            ? ""
                            : formData.profile.early_payment_discount
                        }
                        onChange={(e) => {
                          const v = stripNumericLeadingZerosForControlledInput(
                            e.target.value,
                          );
                          handleProfileChange(
                            "early_payment_discount",
                            v === "" ? "" : Number(v),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className={formLabelClass}>
                        Late fee rule (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className={formControlClass}
                        value={
                          formData.profile.late_fee_rule === ""
                            ? ""
                            : formData.profile.late_fee_rule
                        }
                        onChange={(e) => {
                          const v = stripNumericLeadingZerosForControlledInput(
                            e.target.value,
                          );
                          handleProfileChange(
                            "late_fee_rule",
                            v === "" ? "" : Number(v),
                          );
                        }}
                      />
                    </div>
                  </div>
                </Section>

                {isEdit && stripeCrmId ? (
                  <CustomerPaymentCardsEditor
                    crmCompanyId={stripeCrmId}
                    customerName={currentCustomer?.name ?? ""}
                    active={open}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="flex flex-shrink-0 justify-end gap-2 border-t border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || loadingCustomer}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
