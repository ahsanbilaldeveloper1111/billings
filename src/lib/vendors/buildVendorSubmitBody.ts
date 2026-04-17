import type { VendorBankAccount } from "@/models/Vendor";

export type VendorProfileSubmitFields = {
  address?: string;
  country?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  tax_id?: string;
  vat_exemption: boolean;
  vat_rate: number;
  payment_terms: number;
  currency: string;
  invoice_delivery_methods: string[];
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  main_app_visibility: boolean;
  /** Inline / storage path / base64; omit when unset; `null` clears on edit. */
  logo?: string | null;
  /** Public or CDN URL; omit when unset; `null` clears on edit. */
  logo_url?: string | null;
};

export type VendorSubmitPayload = {
  name: string;
  email?: string;
  phone?: string;
  status: string;
  profile: VendorProfileSubmitFields;
  bank_accounts: VendorBankAccount[];
  remove_logo?: boolean;
};

function appendProfile(fd: FormData, p: VendorProfileSubmitFields): void {
  const entries: [string, string | number | boolean | undefined][] = [
    ["address", p.address],
    ["country", p.country],
    ["city", p.city],
    ["state", p.state],
    ["postal_code", p.postal_code],
    ["tax_id", p.tax_id],
    ["vat_exemption", p.vat_exemption],
    ["vat_rate", p.vat_rate],
    ["payment_terms", p.payment_terms],
    ["currency", p.currency],
    ["contact_person_name", p.contact_person_name],
    ["contact_person_email", p.contact_person_email],
    ["contact_person_phone", p.contact_person_phone],
    ["main_app_visibility", p.main_app_visibility],
  ];
  for (const [key, val] of entries) {
    if (val === undefined || val === null) continue;
    if (typeof val === "boolean") {
      fd.append(`profile[${key}]`, val ? "1" : "0");
      continue;
    }
    fd.append(`profile[${key}]`, String(val));
  }
  for (const m of p.invoice_delivery_methods) {
    fd.append("profile[invoice_delivery_methods][]", m);
  }
  if (
    p.logo !== undefined &&
    p.logo !== null &&
    String(p.logo).trim() !== ""
  ) {
    fd.append("profile[logo]", String(p.logo));
  }
  if (
    p.logo_url !== undefined &&
    p.logo_url !== null &&
    String(p.logo_url).trim() !== ""
  ) {
    fd.append("profile[logo_url]", String(p.logo_url));
  }
}

function appendBankAccounts(fd: FormData, accounts: VendorBankAccount[]): void {
  accounts.forEach((acc, i) => {
    const row: Record<string, unknown> = { ...acc };
    for (const [k, v] of Object.entries(row)) {
      if (v === undefined || v === null) continue;
      if (k === "id" && typeof v === "number" && v > 1e12) continue;
      fd.append(
        `bank_accounts[${i}][${k}]`,
        typeof v === "boolean" ? (v ? "1" : "0") : String(v),
      );
    }
  });
}

/** Multipart vendor create/update; binary logo as top-level `logo_file`. */
export function vendorPayloadToFormData(
  payload: VendorSubmitPayload,
  logoFile: File | null,
): FormData {
  const fd = new FormData();
  fd.append("name", payload.name);
  if (payload.email !== undefined && payload.email !== "")
    fd.append("email", payload.email);
  if (payload.phone !== undefined && payload.phone !== "")
    fd.append("phone", payload.phone);
  fd.append("status", payload.status);
  appendProfile(fd, payload.profile);
  appendBankAccounts(fd, payload.bank_accounts);
  if (logoFile) fd.append("logo_file", logoFile);
  if (payload.remove_logo) fd.append("remove_logo", "1");
  return fd;
}

/** JSON vendor create/update (no new logo file). */
export function vendorPayloadToJson(
  payload: VendorSubmitPayload,
): Record<string, unknown> {
  const profile: Record<string, unknown> = { ...payload.profile };
  for (const k of Object.keys(profile)) {
    if (profile[k] === undefined) delete profile[k];
  }
  return {
    name: payload.name,
    ...(payload.email !== undefined && payload.email !== ""
      ? { email: payload.email }
      : {}),
    ...(payload.phone !== undefined && payload.phone !== ""
      ? { phone: payload.phone }
      : {}),
    status: payload.status,
    profile,
    bank_accounts: payload.bank_accounts,
    ...(payload.remove_logo ? { remove_logo: true } : {}),
  };
}
