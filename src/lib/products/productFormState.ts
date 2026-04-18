import { firstLogoField } from "@/lib/logoDisplaySrc";
import type { Product } from "@/models/Product";

export type ProductFormState = {
  name: string;
  sku: string;
  description: string;
  base_price: string;
  category_id: string | number;
  is_service: boolean;
  is_active: boolean;
  currency: string;
  tenant_id: string;
};

export function defaultProductFormState(): ProductFormState {
  return {
    name: "",
    sku: "",
    description: "",
    base_price: "",
    category_id: "",
    is_service: false,
    is_active: true,
    currency: "USD",
    tenant_id: "",
  };
}

function categoryIdFromApiProduct(
  raw: Product & Record<string, unknown>,
): string | number | "" {
  const r = raw as Record<string, unknown>;
  const top = r.category_id;
  if (typeof top === "number" && Number.isFinite(top)) return top;
  if (typeof top === "string") {
    const t = top.trim();
    if (t !== "") {
      const n = Number.parseInt(t, 10);
      if (Number.isFinite(n)) return n;
    }
  }
  const cat = r.category;
  if (cat && typeof cat === "object" && !Array.isArray(cat) && "id" in cat) {
    const id = (cat as { id?: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string") {
      const t = id.trim();
      if (t !== "") {
        const n = Number.parseInt(t, 10);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return "";
}

export function productFormStateFromApiProduct(
  raw: Product & Record<string, unknown>,
): ProductFormState {
  const catId = categoryIdFromApiProduct(raw);
  return {
    name: String(raw.name ?? ""),
    sku: raw.sku != null ? String(raw.sku) : "",
    description: raw.description != null ? String(raw.description) : "",
    base_price:
      raw.base_price != null && Number.isFinite(Number(raw.base_price))
        ? String(raw.base_price)
        : "",
    category_id: catId === "" ? "" : catId,
    is_service: Boolean(raw.is_service),
    is_active: raw.is_active !== false,
    currency:
      typeof raw.currency === "string" && raw.currency.trim()
        ? raw.currency
        : "USD",
    tenant_id:
      raw.tenant_id != null ? String(raw.tenant_id).trim() : "",
  };
}

export function buildProductMutationPayload(
  f: ProductFormState,
  _isEdit: boolean,
): Record<string, unknown> {
  const base = Number.parseFloat(String(f.base_price).trim() || "0");
  const categoryId =
    f.category_id === "" || f.category_id === undefined
      ? null
      : Number(f.category_id);
  const body: Record<string, unknown> = {
    name: f.name.trim(),
    ...(f.sku.trim() ? { sku: f.sku.trim() } : {}),
    ...(f.description.trim() ? { description: f.description.trim() } : {}),
    base_price: base,
    ...(categoryId != null ? { category_id: categoryId } : {}),
    is_service: f.is_service,
    is_active: f.is_active,
    currency: f.currency.trim() || "USD",
  };
  body.tenant_id =
    typeof f.tenant_id === "string" && f.tenant_id.trim()
      ? f.tenant_id.trim()
      : null;
  return body;
}

/**
 * Logo fields for JSON create/update (no `logo_file`). Same rules as company/vendor.
 */
export function finalizeProductLogoForSubmit(
  body: Record<string, unknown>,
  options: {
    hasLogoFile: boolean;
    isEdit: boolean;
    logoRemoved: boolean;
    row: (Product & Record<string, unknown>) | undefined;
  },
): void {
  const had = Boolean(
    firstLogoField(
      undefined,
      options.row?.logo_url as string | null | undefined,
    ),
  );
  if (options.hasLogoFile) {
    delete body.remove_logo;
    return;
  }
  if (options.isEdit) {
    if (options.logoRemoved && had) {
      body.logo_url = null;
      body.remove_logo = true;
    } else if (!options.logoRemoved) {
      const orig = String(
        (options.row?.logo_url as string | undefined) ?? "",
      ).trim();
      if (orig) body.logo_url = orig;
      else delete body.logo_url;
    } else {
      delete body.logo_url;
    }
    if (!(options.logoRemoved && had)) {
      delete body.remove_logo;
    }
  } else {
    delete body.remove_logo;
  }
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
 * Multipart create/update with top-level `logo_file` (binary), same pattern as
 * company / vendor.
 */
export function buildProductMutationFormData(
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
