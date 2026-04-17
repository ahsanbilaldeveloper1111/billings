import type { CompanySavedPaymentMethod } from "@/models/Company";
import type { PaymentMode } from "@/models/Payment";

/** Editable bank row for company create/update (`profile.bank_accounts`). */
export type CompanyBankAccountDraft = {
  id?: number;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  iban?: string;
  currency: string;
  account_type?: string;
  is_default: boolean;
  notes?: string;
};

export function emptyBankAccountDraft(
  currency = "USD",
): CompanyBankAccountDraft {
  return {
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    routing_number: "",
    swift_code: "",
    iban: "",
    currency,
    account_type: "",
    is_default: false,
    notes: "",
  };
}

export function bankAccountsFromApi(raw: unknown): CompanyBankAccountDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const r = item as Record<string, unknown>;
    const id = r.id;
    return {
      ...(typeof id === "number" && id > 0 && id < 1e12 ? { id } : {}),
      bank_name: String(r.bank_name ?? ""),
      account_holder_name: String(r.account_holder_name ?? ""),
      account_number: String(r.account_number ?? ""),
      routing_number:
        r.routing_number != null ? String(r.routing_number) : "",
      swift_code: r.swift_code != null ? String(r.swift_code) : "",
      iban: r.iban != null ? String(r.iban) : "",
      currency: String(r.currency ?? "USD"),
      account_type: r.account_type != null ? String(r.account_type) : "",
      is_default: Boolean(r.is_default),
      notes: r.notes != null ? String(r.notes) : "",
    };
  });
}

function serializeBankAccount(
  acc: CompanyBankAccountDraft,
): Record<string, unknown> {
  const o: Record<string, unknown> = {
    bank_name: acc.bank_name.trim(),
    account_holder_name: acc.account_holder_name.trim(),
    account_number: acc.account_number.trim(),
    currency: (acc.currency || "USD").trim(),
    is_default: Boolean(acc.is_default),
  };
  if (typeof acc.id === "number" && acc.id > 0 && acc.id < 1e12) {
    o.id = acc.id;
  }
  if (acc.routing_number?.trim()) o.routing_number = acc.routing_number.trim();
  if (acc.swift_code?.trim()) o.swift_code = acc.swift_code.trim();
  if (acc.iban?.trim()) o.iban = acc.iban.trim();
  if (acc.account_type?.trim()) o.account_type = acc.account_type.trim();
  if (acc.notes?.trim()) o.notes = acc.notes.trim();
  return o;
}

/** Form slice aligned with {@link import("@/models/Company").CompanyProfileForm} (string fields for inputs). */
export type CompanyProfileFormSlice = {
  address: string;
  country: string;
  postal_code: string;
  currency: string;
  fiscal_year_start: string;
  accounting_method: string;
  registration_number: string;
  business_type: string;
  vat_rate: string | number;
  vat_exemption: boolean;
  tax_id: string;
  discount_type: string;
  discount_limit: string | number;
  discount_applicability: string[];
  payment_methods: CompanySavedPaymentMethod[];
  payment_mode: PaymentMode;
  payment_terms: string | number;
  credit_limit: string | number;
  early_payment_discount: string | number;
  late_fee_rule: string | number;
  outstanding_invoices: string | number;
  discounts_applied_ytd: string | number;
  vat_collected: string | number;
  active_subscriptions: string | number;
  profile_status: "incomplete" | "complete" | "pending_verification";
  selected_products: unknown[];
  logo: string;
  logo_url: string;
};

export type CompanyFormState = {
  email: string;
  phone: string;
  tenant_id: string;
  vendor_id: string;
  profile: CompanyProfileFormSlice;
  bank_accounts: CompanyBankAccountDraft[];
};

function optNum(v: string | number | null | undefined): number | undefined {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function emptyCompanyProfileForm(): CompanyProfileFormSlice {
  return {
    address: "",
    country: "",
    postal_code: "",
    currency: "USD",
    fiscal_year_start: "",
    accounting_method: "",
    registration_number: "",
    business_type: "",
    vat_rate: "",
    vat_exemption: false,
    tax_id: "",
    discount_type: "flat_percentage",
    discount_limit: "",
    discount_applicability: [],
    payment_methods: [],
    payment_mode: "one_time",
    payment_terms: "30",
    credit_limit: "",
    early_payment_discount: "",
    late_fee_rule: "100",
    outstanding_invoices: "",
    discounts_applied_ytd: "",
    vat_collected: "",
    active_subscriptions: "",
    profile_status: "incomplete",
    selected_products: [],
    logo: "",
    logo_url: "",
  };
}

export function emptyCompanyForm(): CompanyFormState {
  return {
    email: "",
    phone: "",
    tenant_id: "",
    vendor_id: "",
    profile: emptyCompanyProfileForm(),
    bank_accounts: [],
  };
}

/**
 * POST `/company/create-update` — matches backend expectations (nested `profile`).
 */
export function buildCompanyCreateUpdatePayload(
  form: CompanyFormState,
  opts: { isEdit: boolean; companyId?: number },
): Record<string, unknown> {
  const p = form.profile;
  const profile: Record<string, unknown> = {};

  if (p.address.trim()) profile.address = p.address.trim();
  if (p.country.trim()) profile.country = p.country.trim();
  if (p.postal_code.trim()) profile.postal_code = p.postal_code.trim();
  if (p.currency.trim()) profile.currency = p.currency.trim();
  if (p.fiscal_year_start.trim())
    profile.fiscal_year_start = p.fiscal_year_start.trim();
  if (p.accounting_method.trim())
    profile.accounting_method = p.accounting_method.trim();
  if (p.registration_number.trim())
    profile.registration_number = p.registration_number.trim();
  if (p.business_type.trim()) profile.business_type = p.business_type.trim();

  const vr = optNum(p.vat_rate);
  if (vr !== undefined) profile.vat_rate = vr;
  profile.vat_exemption = Boolean(p.vat_exemption);
  if (p.tax_id.trim()) profile.tax_id = p.tax_id.trim();

  profile.payment_mode = p.payment_mode;
  const pt = optNum(p.payment_terms);
  if (pt !== undefined) profile.payment_terms = pt;
  const cl = optNum(p.credit_limit);
  if (cl !== undefined) profile.credit_limit = cl;

  if (p.discount_type.trim()) {
    profile.discount_type =
      p.discount_type === "flat_amount" ? "flat_amount" : "flat_percentage";
  }
  const dl = optNum(p.discount_limit);
  if (dl !== undefined) profile.discount_limit = dl;
  const epd = optNum(p.early_payment_discount);
  if (epd !== undefined) profile.early_payment_discount = epd;
  const lfr = optNum(p.late_fee_rule);
  if (lfr !== undefined) profile.late_fee_rule = lfr;

  profile.discount_applicability = [...p.discount_applicability];
  profile.payment_methods = p.payment_methods.map((m) => ({ ...m }));

  profile.outstanding_invoices = optNum(p.outstanding_invoices) ?? 0;
  profile.discounts_applied_ytd = optNum(p.discounts_applied_ytd) ?? 0;
  profile.vat_collected = optNum(p.vat_collected) ?? 0;
  profile.active_subscriptions = optNum(p.active_subscriptions) ?? 0;

  profile.profile_status = p.profile_status;
  profile.selected_products = [...p.selected_products];
  if (p.logo.trim()) profile.logo = p.logo.trim();
  if (p.logo_url.trim()) profile.logo_url = p.logo_url.trim();

  profile.bank_accounts = form.bank_accounts.map(serializeBankAccount);

  const body: Record<string, unknown> = {
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    ...(form.tenant_id.trim() ? { tenant_id: form.tenant_id.trim() } : {}),
    ...(p.country.trim() ? { country: p.country.trim() } : {}),
    profile,
  };

  if (form.vendor_id.trim()) {
    const n = Number.parseInt(form.vendor_id, 10);
    if (Number.isFinite(n)) body.vendor_id = n;
  }

  if (opts.isEdit && opts.companyId != null && Number.isFinite(opts.companyId)) {
    body.id = opts.companyId;
  }

  return body;
}

function appendFormDataValue(
  fd: FormData,
  fieldKey: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (typeof value === "boolean") {
    fd.append(fieldKey, value ? "1" : "0");
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    fd.append(fieldKey, String(value));
    return;
  }
  if (typeof value === "string") {
    fd.append(fieldKey, value);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    const first = value[0];
    if (
      first !== null &&
      typeof first === "object" &&
      !Array.isArray(first)
    ) {
      value.forEach((item, i) => {
        if (item == null || typeof item !== "object" || Array.isArray(item)) {
          return;
        }
        for (const [sk, sv] of Object.entries(item as Record<string, unknown>)) {
          appendFormDataValue(fd, `${fieldKey}[${i}][${sk}]`, sv);
        }
      });
      return;
    }
    for (const item of value) {
      if (item === undefined || item === null) continue;
      fd.append(`${fieldKey}[]`, String(item));
    }
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      appendFormDataValue(fd, `${fieldKey}[${k}]`, v);
    }
  }
}

/**
 * Multipart POST `/company/create-update` with top-level `logo_file` (binary)
 * plus the same fields as JSON, using Laravel-style bracket keys (`profile[address]`, …).
 */
export function buildCompanyCreateUpdateFormData(
  body: Record<string, unknown>,
  logoFile: File | null,
): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    appendFormDataValue(fd, k, v);
  }
  if (logoFile) fd.append("logo_file", logoFile);
  return fd;
}
