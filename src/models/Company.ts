import type { PaginationParams } from "@/lib/pagination";
import type { PaymentMode } from "@/models/Payment";
import type { UserAccessInfo } from "@/models/User";
import type { CompanyBasic, Product } from "@/models/Product";
import type { Vendor } from "@/models/Vendor";

export interface Company {
  id?: number;
  username: string;
  name: string;
  phone?: string | number;
  /** Backward compatibility with older API field names. */
  phone_no?: string | number;
  email?: string;
  stripe_customer_id?: string;
  parent_id?: number;
  tenant_id?: string | null;

  vendor?: Vendor;
  /** Some list payloads expose reseller alongside vendor. */
  reseller?: { name?: string; tenant_id?: string | null };
  company_iccid_id?: number;
  country?: string;

  profile?: CompanyProfile;
  /** Present on some list/show payloads when `load_outstanding_amount` is set. */
  outstanding_amount?: number;
  created_at?: string;
  user_access_info: UserAccessInfo;
  company_id?: number;
  settings?: UserSetting;
  vendor_id?: number | null;
  updated_at?: string;
  status?: boolean;
}

export interface ProductCompanyPricing {
  id?: number;
  company_id: number;
  product_id: number;
  selling_price: number;
  /** Optional override shown in pricing UIs. */
  custom_description?: string | null;
  discount_applicability_id?: number | null;
  is_active: boolean;
  renewal_start_date?: string;
  renewal_end_date?: string;
  status?: string;
  billing_cycle?: string;
  subscriptions?: number;
  created_at?: string;
  updated_at?: string;

  product?: Product;
  company?: CompanyBasic;
  /** Present on customer-scoped product-pricing list payloads. */
  customer?: CompanyBasic;
  discount_applicability?: ProductDiscountApplicability;
}

export interface ProductPricingListResponse {
  data: ProductCompanyPricing[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface IndexProductDiscountApplicabilityParams
  extends Partial<PaginationParams> {
  company_id?: number;
}

export interface IndexProductCompanyPricingParams
  extends Partial<PaginationParams> {
  company_id?: number;
  discount_applicability_id?: number | null | string;
  load_product?: boolean;
}

export interface ProductDiscountApplicability {
  id: number;
  name?: string;
  product_id: number;
  customer_id: number;
  is_applicable: boolean;
  discount_type: "percentage" | "amount";
  discount_percentage?: number;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
  product_pricings?: ProductCompanyPricing[];
  company?: Company;
}

export interface CompanyDocument {
  id: number;
  tenant_id: string | null;
  name: string;
  path: string;
  type?: string | null;
  mime_type?: string | null;
  size?: number | null;
  created_at: string;
  updated_at: string;
}

/** Saved payment methods on a company profile (not the same as `PaymentMethod` in `@/models/Payment`). */
export interface CompanySavedPaymentMethod {
  id?: string;
  type: "card" | "bank_transfer" | "paypal" | "stripe";
  last_four?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  is_active: boolean;
  stripeId?: string;
}

export interface UserSetting {
  id?: number;
  company_id?: number;
  [key: string]: unknown;
}

export interface CompanyProfile {
  id?: number;
  company_id: number;
  currency: string;
  address: string;
  outstanding_amount: number;
  vat_rate: number;
  vat_exemption: boolean;
  tax_id?: string;
  discount_type: "flat_percentage" | "flat_amount";
  discount_limit?: number;
  discount_applicability: string[];
  payment_methods?: CompanySavedPaymentMethod[];
  payment_mode: PaymentMode;
  credit_limit: number;
  early_payment_discount?: number;
  late_fee_rule?: number;
  payment_terms: number;
  outstanding_invoices: number;
  discounts_applied_ytd: number;
  vat_collected: number;
  active_subscriptions: number;
  profile_status: "incomplete" | "complete" | "pending_verification";
  selected_products?: unknown[];
  fiscal_year_start?: string;
  accounting_method?: string;
  postal_code?: string;
  logo?: string;
  logo_url?: string;
  registration_number?: string;
  business_type?: string;
  created_at?: string;
  updated_at?: string;
  bank_accounts?: CompanyBankAccount[];
}

export interface CompanyBankAccount {
  id?: number;
  company_id: number;
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
  created_at?: string;
  updated_at?: string;
}

/**
 * Flattened company + profile for CRM-style create/update (legacy `CompanyProfileForm`).
 * API: root fields on `Company` plus nested `profile` on `POST /company/create-update`.
 * `payment_methods` uses {@link CompanySavedPaymentMethod}, not the payment-rail string union in `@/models/Payment`.
 */
export interface CompanyProfileForm {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  parent_id?: number;
  country?: string;
  tenant_id?: string | null;
  vendor_id?: number;
  currency: string;
  address: string;
  vat_rate: number;
  vat_exemption: boolean;
  tax_id?: string;
  discount_type: "flat_percentage" | "flat_amount";
  discount_limit?: number;
  discount_applicability: string[];
  payment_methods: CompanySavedPaymentMethod[];
  payment_mode: PaymentMode;
  credit_limit: number;
  early_payment_discount?: number;
  late_fee_rule?: number;
  payment_terms: number;
  outstanding_invoices: number;
  discounts_applied_ytd: number;
  vat_collected: number;
  active_subscriptions: number;
  profile_status: "incomplete" | "complete" | "pending_verification";
  selected_products?: unknown[];
  fiscal_year_start?: string;
  accounting_method?: string;
  postal_code?: string;
  registration_number?: string;
  business_type?: string;
  bank_accounts?: CompanyBankAccount[];
  logo?: string | null;
  logo_url?: string | null;
}

/** Telephony / directory profile (distinct from billing `CompanyProfile`). */
export interface Profile {
  id: number;
  additional_info: string;
  partition: string;
  company_id: number;
  extention_ranges: ExtensionRange[];
  recording_profile: string;
  recording_profile_mobile: string;
  app_user: string;
  user_id_prefix: string;
  device_pool: string;
  allow_gsm: CompanyGSM;
  device_pool_mobile: string;
  fac_info: string;
  mobile_user: MobileUser;
  sim_ports: string[];
  created_at: string;
  directory_name: string;
  fac_code?: number;
  updated_at: string;
  max_users: number | null;
  organizational_unit: string;
}

export interface ExtensionRange {
  start: number;
  end: number;
}

export enum CompanyGSM {
  ALLOW_GSM = 1,
  DISALLOW_GSM = 0,
}

export enum MobileUser {
  Yes = "Yes",
  No = "No",
}

export enum DeviceType {
  CSF = "CSF",
  TCT = "TCT",
  BOT = "BOT",
}

export enum DNCRCallingAccess {
  ALLOW_DNCR = 1,
  DISALLOW_DNCR = 0,
}

export enum FacInfoCallingAccess {
  ALLOW_FAC_INFO = 1,
  DISALLOW_FAC_INFO = 0,
}

/** `GET /api/backend/company` — filters + `order[column]` / `order[dir]`. */
export interface IndexCompanyParams extends PaginationParams {
  search?: string;
  email?: string;
  phone?: string;
  country?: string;
  load_ranks?: boolean;
  load_profile?: boolean;
  load_calling_access?: boolean;
  load_minify_data?: boolean;
  load_outstanding_amount?: boolean;
  parent_id?: number | null;
  tenant_id?: string | null;
  vendor_id?: number | null;
  load_company_iccid?: boolean;
  load_available_extensions?: boolean;
  ids?: number[];
  user_count?: boolean;
  "order[column]"?: string;
  "order[dir]"?: "asc" | "desc";
}

export interface IndexCompanyProfileParams extends PaginationParams {
  search: string;
  company_id: number | null;
}

export interface OrganizationUnit {
  id: number;
  name: string;
  parent_id: number;
}

export interface IndexRequestOrganizationUnit {
  parent_id?: number | null;
  search: string;
}

export interface GenerateFacCodeRequest {
  company_id: number;
}
