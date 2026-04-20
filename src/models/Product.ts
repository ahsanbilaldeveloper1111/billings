/**
 * Company fields often returned with product-pricing payloads (subset of full `Company` in `@/models/Company`).
 */
export interface CompanyBasic {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

/** Nested category on catalog / admin list payloads. */
export interface ProductCategoryRef {
  id?: number;
  name?: string;
}

export interface Product {
  id: number;
  name: string;
  /** Present on some invoice / catalog payloads. */
  sku?: string | null;
  description?: string;
  base_price: number;
  /** Plain label or nested `{ name }` depending on endpoint. */
  category?: string | ProductCategoryRef;
  category_id?: number | null;
  /** Company scope on some catalog / admin payloads (string tenant id). */
  tenant_id?: string | null;
  is_service?: boolean;
  currency?: string | null;
  is_active: boolean;
  /** Image URL, `data:` URL, or raw/base64 payload (API may store base64 here). */
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  /**
   * Optional relations on `GET /products/:id` (Laravel often uses snake_case;
   * some clients send camelCase — the view checks both).
   */
  product_pricings?: ProductShowPricingRow[];
  productPricings?: ProductShowPricingRow[];
  discount_applicability?: ProductShowDiscountApplicabilityRow[];
  discountApplicability?: ProductShowDiscountApplicabilityRow[];
}

/** Company pricing row nested on product show payload. */
export interface ProductShowPricingRow {
  id?: number;
  selling_price?: number;
  currency_code?: string;
  valid_from?: string | null;
  valid_to?: string | null;
  company?: {
    name?: string | null;
    crm_company_id?: number | string | null;
  } | null;
}

/** Discount applicability row nested on product show payload. */
export interface ProductShowDiscountApplicabilityRow {
  id?: number;
  is_applicable?: boolean;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  customer?: { name?: string | null } | null;
}

/** `GET /api/backend/products` — filters + `order[column]` / `order[dir]`. */
export interface IndexProductParams {
  tenant_id?: string|null;
  page?: number;
  limit?: number;
  search?: string;
  global_product?: boolean;
  category_id?: number;
  "order[column]"?: string;
  "order[dir]"?: "asc" | "desc";
}

export interface CreateProductCompanyPricingData {
  company_id: number;
  product_id: number;
  selling_price: number;
  company_price: number;
  discount_percentage?: number;
  is_active?: boolean;
}

export interface UpdateProductCompanyPricingData {
  company_price?: number;
  discount_percentage?: number;
  is_active?: boolean;
}
