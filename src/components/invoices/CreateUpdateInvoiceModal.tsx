"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmCustomerSearchableDropdown } from "@/components/ui/CrmCustomerSearchableDropdown";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { useCompanies } from "@/hooks/company/useCompanies";
import {
  currenciesFromResponse,
  useActiveCurrencies,
} from "@/hooks/currencies/useActiveCurrencies";
import {
  baseCurrencyFromResponse,
  useBaseCurrency,
} from "@/hooks/currencies/useBaseCurrency";
import { useCustomer } from "@/hooks/customers/useCustomer";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { useInvoiceDetails } from "@/hooks/invoices/useInvoiceDetails";
import { useInvoiceMutations } from "@/hooks/invoices/useInvoiceMutations";
import { useInvoices } from "@/hooks/invoices/useInvoices";
import {
  useProductsWithCompanyPricing,
  useProductsWithCustomerPricing,
} from "@/hooks/products";
import { useProducts } from "@/hooks/products/useProducts";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useVendors } from "@/hooks/vendors/useVendors";
import { extractListRows } from "@/lib/api/extractApiData";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import {
  addDaysISODate,
  computeCreditLimitSummary,
  computeInvoiceTotals,
  defaultDueDateFromPaymentTerms,
  descriptionForProduct,
  effectiveUnitPrice,
  normalizePricedProductsResponse,
  getCreateInvoiceValidationErrors,
  invoiceHasPayments,
  mapInvoiceItemsToFormRows,
  type InvoiceLineFormRow,
  type PricedProduct,
  resolveTaxRateForLine,
  todayISODate,
  toCreateInvoiceItems,
} from "@/lib/invoices/createInvoiceModalHelpers";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { customerApiResourceKey } from "@/lib/customers/customerApiResourceKey";
import { formatCurrency } from "@/lib/currency";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Company } from "@/models/Company";
import type { Customer } from "@/models/Customer";
import type {
  CreateInvoiceData,
  Invoice,
  UpdateInvoiceData,
} from "@/models/Invoice";
import type { PaymentMode } from "@/models/Payment";
import { invoiceService } from "@/services/invoices.service";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

function emptyLine(): InvoiceLineFormRow {
  return {
    product_id: undefined,
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    description: "",
  };
}

type FormState = {
  tenant_id: string;
  crm_company_id: string;
  po_number: string;
  invoice_date: string;
  due_date: string;
  end_date: string;
  payment_mode: PaymentMode;
  currency_code: string;
  exchange_rate: number;
  notes: string;
  terms_conditions: string;
};

function defaultFormState(): FormState {
  const today = todayISODate();
  return {
    tenant_id: "",
    crm_company_id: "",
    po_number: "",
    invoice_date: today,
    due_date: addDaysISODate(today, 30),
    end_date: "",
    payment_mode: "one_time",
    currency_code: "USD",
    exchange_rate: 1,
    notes: "",
    terms_conditions: "",
  };
}

export type CreateUpdateInvoiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** `null` = create */
  invoiceId: number | string | null;
};

export function CreateUpdateInvoiceModal({
  open,
  onClose,
  onSuccess,
  invoiceId,
}: CreateUpdateInvoiceModalProps) {
  const isEdit = invoiceId != null;
  const { isSuperAdmin } = usePermissions();
  const mutations = useInvoiceMutations();

  const detailQuery = useInvoiceDetails(open && isEdit ? invoiceId : null);
  const invoice = unwrapApiSuccessData<Invoice>(detailQuery.data);

  const vendorsQuery = useVendors(
    {
      limit: 500,
      "order[column]": "name",
      "order[dir]": "asc",
    },
    { enabled: open },
  );
  const vendorRows = extractListRows(vendorsQuery.data).rows as {
    id: number;
    name?: string;
  }[];

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultFormState());
  const [items, setItems] = useState<InvoiceLineFormRow[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const vendorNum = selectedVendorId
    ? Number.parseInt(selectedVendorId, 10)
    : NaN;
  const companiesQuery = useCompanies(
    Number.isFinite(vendorNum)
      ? { limit: 1000, load_profile: true, vendor_id: vendorNum }
      : undefined,
    { enabled: open && Number.isFinite(vendorNum) },
  );
  const companyRows = extractListRows(companiesQuery.data)
    .rows as unknown as Company[];

  const customersQuery = useCustomers(
    open && isSuperAdmin && form.tenant_id.trim()
      ? {
          limit: 500,
          load_profile: true,
          tenant_id: form.tenant_id.trim(),
        }
      : undefined,
    { enabled: open && isSuperAdmin && !!form.tenant_id.trim() },
  );
  const customerRows = extractListRows(customersQuery.data)
    .rows as unknown as Customer[];

  const crmTrim = form.crm_company_id.trim();

  /** Same key as GET `/customers/{key}` — CRM id when present, not the numeric list row id. */
  const customerDetailFetchKey = useMemo((): string | number | null => {
    if (!open || !isSuperAdmin || !crmTrim) return null;
    const matched = customerRows.find(
      (c) => String(c.crm_company_id ?? "").trim() === crmTrim,
    );
    if (matched) {
      return customerApiResourceKey(matched);
    }
    return crmTrim;
  }, [open, isSuperAdmin, crmTrim, customerRows]);

  const customerDetailQuery = useCustomer(customerDetailFetchKey, {
    load_profile: true,
  });
  const customerLoaded = unwrapApiSuccessData<Customer>(customerDetailQuery.data);

  const activeCurrenciesQ = useActiveCurrencies();
  const currencies = currenciesFromResponse(activeCurrenciesQ.data);
  const baseCurrencyQ = useBaseCurrency();
  const baseCurrency = baseCurrencyFromResponse(baseCurrencyQ.data);

  const productsCatalog = useProducts(
    {
      page: 1,
      limit: 800,
      "order[column]": "created_at",
      "order[dir]": "desc",
    },
    { enabled: open },
  );
  const catalogRows = normalizePricedProductsResponse(productsCatalog.data);

  const companyPricingQ = useProductsWithCompanyPricing(
    form.tenant_id.trim() || null,
  );
  const companyPriced = normalizePricedProductsResponse(companyPricingQ.data);

  const customerPricingQ = useProductsWithCustomerPricing(
    isSuperAdmin && crmTrim ? crmTrim : null,
  );
  const customerPriced = normalizePricedProductsResponse(customerPricingQ.data);

  const hasCustomer = isSuperAdmin && crmTrim !== "";
  const pricedProducts: PricedProduct[] = useMemo(() => {
    if (hasCustomer) return customerPriced;
    if (companyPriced.length > 0) return companyPriced;
    return catalogRows;
  }, [hasCustomer, customerPriced, companyPriced, catalogRows]);

  const productById = useMemo(() => {
    const m = new Map<number, PricedProduct>();
    for (const p of pricedProducts) m.set(p.id, p);
    for (const p of catalogRows) if (!m.has(p.id)) m.set(p.id, p);
    return m;
  }, [pricedProducts, catalogRows]);

  const selectedCompany = useMemo(() => {
    const tid = form.tenant_id.trim();
    if (!tid) return undefined;
    return companyRows.find(
      (c) => String(c.tenant_id ?? "").trim() === tid,
    );
  }, [companyRows, form.tenant_id]);

  const invoiceProfile = useMemo(() => {
    if (hasCustomer && customerLoaded?.profile) {
      return customerLoaded.profile as {
        currency?: string | null;
        vat_rate?: number | string | null;
        vat_exemption?: boolean | null;
        payment_terms?: number | null;
        credit_limit?: number | string | null;
      };
    }
    return selectedCompany?.profile as
      | {
          currency?: string | null;
          vat_rate?: number | string | null;
          vat_exemption?: boolean | null;
          payment_terms?: number | null;
          credit_limit?: number | string | null;
        }
      | undefined;
  }, [hasCustomer, customerLoaded?.profile, selectedCompany?.profile]);

  const isInvoicePaid = useMemo(() => {
    if (!isEdit || !invoice) return false;
    if (invoiceHasPayments(invoice)) return true;
    const st = invoice.status;
    return st === "paid" || st === "partially_paid";
  }, [isEdit, invoice]);

  useEffect(() => {
    if (!open) return;
    if (!isSuperAdmin) {
      setForm((p) => ({ ...p, crm_company_id: "" }));
    }
  }, [open, isSuperAdmin]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const inv = unwrapApiSuccessData<Invoice>(detailQuery.data);
      if (!inv || String(inv.id) !== String(invoiceId)) return;
      setSelectedVendorId(
        inv.vendor_id != null ? String(inv.vendor_id) : null,
      );
      setForm({
        tenant_id: inv.tenant_id ?? "",
        crm_company_id: inv.crm_company_id ?? "",
        po_number: inv.po_number ?? "",
        invoice_date: inv.invoice_date?.slice(0, 10) ?? todayISODate(),
        due_date: inv.due_date?.slice(0, 10) ?? todayISODate(),
        end_date: inv.end_date?.slice(0, 10) ?? "",
        payment_mode: inv.payment_mode,
        currency_code: inv.currency_code || "USD",
        exchange_rate:
          inv.exchange_rate != null ? Number(inv.exchange_rate) : 1,
        notes: inv.notes ?? "",
        terms_conditions: inv.terms_conditions ?? "",
      });
      const lines = mapInvoiceItemsToFormRows(inv.items);
      setItems(lines.length > 0 ? lines : [emptyLine()]);
      setErrors({});
      return;
    }
    setSelectedVendorId(null);
    setForm(defaultFormState());
    setItems([emptyLine()]);
    setErrors({});
  }, [open, isEdit, invoiceId, detailQuery.data]);

  /** Create mode: currency from customer profile when CRM customer selected, else company (tenant) profile. */
  useEffect(() => {
    if (isEdit) return;
    if (hasCustomer) {
      if (!customerLoaded?.profile) return;
      const p = customerLoaded.profile;
      const custCur = p.currency != null && String(p.currency).trim() !== ""
        ? String(p.currency).trim()
        : "";
      const coCur =
        selectedCompany?.profile?.currency != null &&
        String(selectedCompany.profile.currency).trim() !== ""
          ? String(selectedCompany.profile.currency).trim()
          : "";
      const nextCode = (custCur || coCur || "USD").toUpperCase();
      const pt = p.payment_terms;
      setForm((prev) => ({
        ...prev,
        currency_code: nextCode,
        due_date: defaultDueDateFromPaymentTerms(
          prev.invoice_date,
          pt == null ? undefined : Number(pt),
        ),
      }));
      return;
    }
    if (!form.tenant_id.trim() || !selectedCompany?.profile) return;
    const cur = selectedCompany.profile.currency;
    const pt = selectedCompany.profile.payment_terms;
    setForm((prev) => ({
      ...prev,
      currency_code: (
        (cur && String(cur).trim()) ||
        prev.currency_code ||
        "USD"
      ).toUpperCase(),
      due_date: defaultDueDateFromPaymentTerms(
        prev.invoice_date,
        pt == null ? undefined : Number(pt),
      ),
    }));
  }, [
    isEdit,
    hasCustomer,
    customerLoaded,
    form.tenant_id,
    selectedCompany,
  ]);

  useEffect(() => {
    const code = form.currency_code || "USD";
    const row = currencies.find((c) => c.code === code);
    if (row?.exchange_rate != null) {
      const r = Number(row.exchange_rate);
      if (Number.isFinite(r)) {
        setForm((prev) =>
          prev.exchange_rate === r ? prev : { ...prev, exchange_rate: r },
        );
      }
    }
  }, [form.currency_code, currencies]);

  useEffect(() => {
    if (isEdit || !invoiceProfile?.vat_exemption) return;
    setItems((prev) =>
      prev.some((it) => (it.tax_rate ?? 0) > 0)
        ? prev.map((it) => ({ ...it, tax_rate: 0 }))
        : prev,
    );
  }, [isEdit, invoiceProfile?.vat_exemption, form.tenant_id, form.crm_company_id]);

  useEffect(() => {
    if (isEdit || !hasCustomer || !invoiceProfile) return;
    const rate = invoiceProfile.vat_exemption
      ? 0
      : Number(invoiceProfile.vat_rate ?? 0);
    setItems((prev) =>
      prev.map((it) => ({ ...it, tax_rate: rate })),
    );
  }, [
    isEdit,
    hasCustomer,
    invoiceProfile?.vat_rate,
    invoiceProfile?.vat_exemption,
    form.crm_company_id,
  ]);

  const totals = useMemo(() => computeInvoiceTotals(items), [items]);

  const outstandingQuery = useInvoices(
    open && form.tenant_id.trim()
      ? {
          tenant_id: form.tenant_id.trim(),
          ...(crmTrim ? { crm_company_id: crmTrim } : {}),
          page: 1,
          limit: 500,
        }
      : undefined,
    { enabled: open && !!form.tenant_id.trim() },
  );
  const outstandingRows = extractListRows(outstandingQuery.data)
    .rows as Record<string, unknown>[];

  const creditInfo = useMemo(
    () =>
      computeCreditLimitSummary(
        invoiceProfile,
        outstandingRows,
        totals.total,
        isEdit,
        invoice?.id,
        crmTrim || null,
      ),
    [
      invoiceProfile,
      outstandingRows,
      totals.total,
      isEdit,
      invoice?.id,
      crmTrim,
    ],
  );

  const previousInvoicesQuery = useInvoices(
    open && !isEdit && form.tenant_id.trim()
      ? {
          tenant_id: form.tenant_id.trim(),
          page: 1,
          limit: 10,
          sort_field: "invoice_date",
          sort_direction: "desc",
        }
      : undefined,
    { enabled: open && !isEdit && !!form.tenant_id.trim() },
  );

  const validate = useCallback((): boolean => {
    const e = getCreateInvoiceValidationErrors(
      {
        tenant_id: form.tenant_id,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
      },
      items,
      { isEdit },
    );
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form.tenant_id, form.invoice_date, form.due_date, items, isEdit]);

  const updateLine = useCallback(
    (index: number, patch: Partial<InvoiceLineFormRow>) => {
      if (isInvoicePaid) {
        showAppToast("Cannot change lines on a paid invoice.", "warning");
        return;
      }
      setItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      );
    },
    [isInvoicePaid],
  );

  const onProductChange = useCallback(
    (index: number, productId: number | undefined) => {
      if (productId == null) {
        updateLine(index, { product_id: undefined });
        return;
      }
      const p = productById.get(productId);
      const tr = resolveTaxRateForLine(p, invoiceProfile ?? undefined);
      updateLine(index, {
        product_id: productId,
        unit_price: p ? effectiveUnitPrice(p) : 0,
        description: p ? descriptionForProduct(p) : "",
        tax_rate: tr,
      });
    },
    [productById, invoiceProfile, updateLine],
  );

  async function handlePrefillPrevious() {
    if (!form.tenant_id.trim() || isEdit) {
      showAppToast("Select a company first.", "warning");
      return;
    }
    setLoadingPrevious(true);
    try {
      let rows = extractListRows(previousInvoicesQuery.data)
        .rows as unknown as Invoice[];
      if (rows.length === 0) {
        const res = await invoiceService.list({
          tenant_id: form.tenant_id.trim(),
          page: 1,
          limit: 10,
          sort_field: "invoice_date",
          sort_direction: "desc",
        });
        rows = extractListRows(res).rows as unknown as Invoice[];
      }
      if (rows.length === 0) {
        showAppToast("No previous invoices for this tenant.", "warning");
        return;
      }
      const first = rows[0];
      const detailRes = await invoiceService.details(first.id);
      const detail = unwrapApiSuccessData<Invoice>(detailRes);
      if (!detail?.items?.length) {
        showAppToast("Previous invoice has no line items.", "warning");
        return;
      }
      setItems(mapInvoiceItemsToFormRows(detail.items));
      showAppToast(
        `Loaded ${detail.items.length} line(s) from invoice ${detail.invoice_number ?? first.id}.`,
        "success",
      );
    } catch (err) {
      showBillingBackendErrorToast(err);
    } finally {
      setLoadingPrevious(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isInvoicePaid) {
      showAppToast("This invoice cannot be edited.", "warning");
      return;
    }
    if (!validate()) return;

    const lineItems = toCreateInvoiceItems(items);

    try {
      if (!isEdit) {
        const body: CreateInvoiceData = {
          tenant_id: form.tenant_id.trim(),
          vendor_id:
            selectedVendorId != null &&
            Number.isFinite(Number.parseInt(selectedVendorId, 10))
              ? Number.parseInt(selectedVendorId, 10)
              : null,
          crm_company_id:
            isSuperAdmin && crmTrim ? crmTrim : null,
          po_number: form.po_number.trim() || null,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          end_date: form.end_date.trim() || undefined,
          payment_mode: form.payment_mode,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          currency_code: (form.currency_code.trim() || "USD").toUpperCase(),
          exchange_rate: form.exchange_rate,
          notes: form.notes.trim() || undefined,
          terms_conditions: form.terms_conditions.trim() || undefined,
          items: lineItems,
        };
        await mutations.create.mutateAsync(body);
        showAppToast("Invoice created.", "success");
      } else if (invoiceId != null) {
        const body: UpdateInvoiceData = {
          tenant_id: form.tenant_id.trim() || null,
          vendor_id:
            selectedVendorId != null &&
            Number.isFinite(Number.parseInt(selectedVendorId, 10))
              ? Number.parseInt(selectedVendorId, 10)
              : null,
          po_number: form.po_number.trim() || null,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          end_date: form.end_date.trim() || undefined,
          payment_mode: form.payment_mode,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
          currency_code: (form.currency_code.trim() || "USD").toUpperCase(),
          exchange_rate: form.exchange_rate,
          notes: form.notes.trim() || undefined,
          terms_conditions: form.terms_conditions.trim() || undefined,
          items: lineItems,
        };
        await mutations.update.mutateAsync({ id: invoiceId, body });
        showAppToast("Invoice updated.", "success");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  const loading =
    mutations.create.isPending ||
    mutations.update.isPending ||
    (isEdit && detailQuery.isPending);

  const baseCode =
    baseCurrency?.code ??
    currencies.find((c) => c?.is_base_currency || c?.is_base)?.code ??
    "USD";
  const displayCurrency = (form.currency_code || "USD").toUpperCase();

  const currencySourceHint = useMemo(() => {
    if (isEdit) return null;
    if (hasCustomer) {
      if (customerDetailQuery.isPending || !customerLoaded?.profile) {
        return "Loading customer profile…";
      }
      const c = customerLoaded.profile.currency?.trim();
      if (c) return `Set from customer profile (${c.toUpperCase()}).`;
      if (selectedCompany?.profile?.currency?.trim()) {
        return `Customer has no currency; using company profile (${String(selectedCompany.profile.currency).trim().toUpperCase()}).`;
      }
      return "Customer has no currency; using default USD.";
    }
    if (form.tenant_id.trim() && selectedCompany?.profile?.currency?.trim()) {
      return `Set from company profile (${String(selectedCompany.profile.currency).trim().toUpperCase()}).`;
    }
    return "Select a company (and optionally a customer) to set currency.";
  }, [
    isEdit,
    hasCustomer,
    customerDetailQuery.isPending,
    customerLoaded,
    form.tenant_id,
    selectedCompany?.profile?.currency,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(94vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex-shrink-0 border-b border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {isEdit ? "Edit invoice" : "New invoice"}
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
            {isEdit && isInvoicePaid ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                This invoice is paid or has payments. Line items and key fields
                are locked.
              </div>
            ) : null}

            {loading && isEdit ? (
              <div className="flex justify-center py-10 text-sm text-zinc-500">
                Loading invoice…
              </div>
            ) : (
              <div className="space-y-6">
                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Company
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Vendor
                      </span>
                      <select
                        className={formControlClass}
                        disabled={loading || isInvoicePaid || isEdit}
                        value={selectedVendorId ?? ""}
                        onChange={(ev) => {
                          const v = ev.target.value || null;
                          setSelectedVendorId(v);
                          setForm((f) => ({
                            ...f,
                            tenant_id: "",
                            crm_company_id: "",
                          }));
                        }}
                      >
                        <option value="">Select vendor…</option>
                        {vendorRows.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.name ?? `Vendor ${v.id}`}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Choose a vendor, then a tenant company.
                      </p>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Tenant (company) {!isEdit ? "*" : ""}
                      </span>
                      <TenantSearchableDropdown
                        className="w-full"
                        disabled={
                          loading ||
                          isInvoicePaid ||
                          isEdit ||
                          !selectedVendorId
                        }
                        value={form.tenant_id}
                        enabled={Boolean(selectedVendorId)}
                        fetchParams={
                          Number.isFinite(vendorNum) ? { vendor_id: vendorNum } : undefined
                        }
                        placeholder={
                          selectedVendorId
                            ? "Select a company…"
                            : "Select a vendor first…"
                        }
                        onChange={(tenant_id) => {
                          setForm((f) => ({
                            ...f,
                            tenant_id: tenant_id ?? "",
                            crm_company_id: "",
                          }));
                        }}
                        isClearable
                      />
                      {errors.tenant_id ? (
                        <p className="mt-1 text-xs text-rose-600">
                          {errors.tenant_id}
                        </p>
                      ) : null}
                    </label>
                    {isSuperAdmin ? (
                      <label className="block sm:col-span-2">
                        <span className={formLabelClass}>
                          Customer (optional)
                        </span>
                        <CrmCustomerSearchableDropdown
                          className="w-full"
                          disabled={
                            loading ||
                            isInvoicePaid ||
                            isEdit ||
                            !form.tenant_id.trim()
                          }
                          tenantId={form.tenant_id}
                          value={form.crm_company_id}
                          onChange={(crmCompanyId) => {
                            const nextCrmId = crmCompanyId ?? "";
                            setForm((f) => ({ ...f, crm_company_id: nextCrmId }));
                          }}
                          placeholder={
                            form.tenant_id.trim()
                              ? "Company invoice (no customer)"
                              : "Select tenant first…"
                          }
                        />
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Select a customer to use customer pricing and profile
                          tax rules.
                        </p>
                      </label>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Details
                    </h3>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        PO number
                      </span>
                      <input
                        className={formControlClass}
                        value={form.po_number}
                        disabled={loading}
                        onChange={(ev) =>
                          setForm((f) => ({ ...f, po_number: ev.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Invoice date *
                      </span>
                      <input
                        type="date"
                        required
                        className={formControlClass}
                        value={form.invoice_date}
                        disabled={loading || isInvoicePaid}
                        onChange={(ev) =>
                          setForm((f) => ({
                            ...f,
                            invoice_date: ev.target.value,
                          }))
                        }
                      />
                      {errors.invoice_date ? (
                        <p className="mt-1 text-xs text-rose-600">
                          {errors.invoice_date}
                        </p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Due date *
                      </span>
                      <input
                        type="date"
                        required
                        className={formControlClass}
                        value={form.due_date}
                        disabled={loading || isInvoicePaid}
                        onChange={(ev) =>
                          setForm((f) => ({ ...f, due_date: ev.target.value }))
                        }
                      />
                      {errors.due_date ? (
                        <p className="mt-1 text-xs text-rose-600">
                          {errors.due_date}
                        </p>
                      ) : null}
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        End date
                      </span>
                      <input
                        type="date"
                        className={formControlClass}
                        value={form.end_date}
                        disabled={loading || isInvoicePaid}
                        onChange={(ev) =>
                          setForm((f) => ({ ...f, end_date: ev.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={formLabelClass}>
                        Payment mode *
                      </span>
                      <select
                        required
                        className={formControlClass}
                        value={form.payment_mode}
                        disabled={loading || isInvoicePaid}
                        onChange={(ev) =>
                          setForm((f) => ({
                            ...f,
                            payment_mode: ev.target.value as PaymentMode,
                          }))
                        }
                      >
                        <option value="one_time">One time</option>
                        <option value="recurring">Recurring</option>
                        <option value="subscription">Subscription</option>
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className={formLabelClass}>
                        Currency
                      </span>
                      <input
                        className={`${formControlClass} bg-zinc-50 dark:bg-zinc-900/60`}
                        readOnly
                        value={displayCurrency}
                      />
                      {currencySourceHint ? (
                        <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {currencySourceHint}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Exchange rate: 1 {baseCode} ={" "}
                        {Number(form.exchange_rate ?? 1).toFixed(6)}{" "}
                        {displayCurrency}
                      </p>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 px-4 py-2.5 dark:border-zinc-800">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Line items
                      </h3>
                      {invoiceProfile?.vat_exemption ? (
                        <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                          VAT exemption
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isEdit ? (
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
                          disabled={
                            loading ||
                            loadingPrevious ||
                            !form.tenant_id.trim() ||
                            isInvoicePaid
                          }
                          onClick={() => void handlePrefillPrevious()}
                        >
                          {loadingPrevious ? "Loading…" : "Load previous items"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        disabled={loading || isInvoicePaid}
                        onClick={() => {
                          if (isInvoicePaid) return;
                          setItems((prev) => [...prev, emptyLine()]);
                        }}
                      >
                        + Add line
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto p-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-zinc-500">No lines yet.</p>
                    ) : (
                      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="py-2 pr-2">#</th>
                            <th className="py-2 pr-2">Product</th>
                            <th className="py-2 pr-2">Qty</th>
                            <th className="py-2 pr-2">Unit</th>
                            <th className="py-2 pr-2">Tax %</th>
                            <th className="py-2 pr-2">Line</th>
                            <th className="py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((row, index) => (
                            <tr
                              key={index}
                              className="border-b border-zinc-100 dark:border-zinc-800"
                            >
                              <td className="py-2 pr-2 align-top">
                                {index + 1}
                              </td>
                              <td className="py-2 pr-2 align-top">
                                <select
                                  className={formControlClass}
                                  disabled={loading || isInvoicePaid}
                                  value={row.product_id ?? ""}
                                  onChange={(ev) => {
                                    const v = ev.target.value;
                                    onProductChange(
                                      index,
                                      v ? Number(v) : undefined,
                                    );
                                  }}
                                >
                                  <option value="">Select product…</option>
                                  {pricedProducts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name ?? `Product ${p.id}`} —{" "}
                                      {formatCurrency(
                                        effectiveUnitPrice(p),
                                        displayCurrency,
                                      )}
                                    </option>
                                  ))}
                                </select>
                                <textarea
                                  className={`${formControlClass} mt-2 min-h-[52px]`}
                                  disabled={loading || isInvoicePaid}
                                  placeholder="Description"
                                  value={row.description}
                                  onChange={(ev) =>
                                    updateLine(index, {
                                      description: ev.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td className="py-2 pr-2 align-top">
                                <input
                                  type="number"
                                  min={0}
                                  className={formControlClass}
                                  disabled={loading || isInvoicePaid}
                                  value={row.quantity}
                                  onChange={(ev) =>
                                    updateLine(index, {
                                      quantity:
                                        Number.parseFloat(
                                          stripNumericLeadingZerosForControlledInput(
                                            ev.target.value,
                                          ),
                                        ) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="py-2 pr-2 align-top">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className={formControlClass}
                                  disabled={loading || isInvoicePaid}
                                  value={row.unit_price}
                                  onChange={(ev) =>
                                    updateLine(index, {
                                      unit_price:
                                        Number.parseFloat(
                                          stripNumericLeadingZerosForControlledInput(
                                            ev.target.value,
                                          ),
                                        ) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="py-2 pr-2 align-top">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.01"
                                  className={formControlClass}
                                  disabled={
                                    loading ||
                                    isInvoicePaid ||
                                    Boolean(invoiceProfile?.vat_exemption)
                                  }
                                  value={row.tax_rate}
                                  onChange={(ev) =>
                                    updateLine(index, {
                                      tax_rate:
                                        Number.parseFloat(
                                          stripNumericLeadingZerosForControlledInput(
                                            ev.target.value,
                                          ),
                                        ) || 0,
                                    })
                                  }
                                />
                              </td>
                              <td className="py-2 pr-2 align-top font-medium">
                                {formatCurrency(
                                  row.quantity * row.unit_price,
                                  displayCurrency,
                                )}
                              </td>
                              <td className="py-2 align-top text-right">
                                <button
                                  type="button"
                                  className="text-rose-600 underline disabled:opacity-50 dark:text-rose-400"
                                  disabled={loading || isInvoicePaid}
                                  onClick={() => {
                                    if (isInvoicePaid) return;
                                    setItems((prev) =>
                                      prev.filter((_, i) => i !== index),
                                    );
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {errors.items ? (
                      <p className="mt-2 text-xs text-rose-600">{errors.items}</p>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Summary
                  </h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(totals.subtotal, displayCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Tax</span>
                      <span className="font-medium">
                        {formatCurrency(totals.taxAmount, displayCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold dark:border-zinc-700">
                      <span>Total</span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(totals.total, displayCurrency)}
                      </span>
                    </div>
                  </div>
                  {creditInfo ? (
                    <div className="mt-4 border-t border-zinc-200 pt-3 text-xs dark:border-zinc-700">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Credit limit
                      </p>
                      <div className="mt-1 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Limit</span>
                          <span>
                            {formatCurrency(
                              creditInfo.creditLimit,
                              creditInfo.currency,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Outstanding</span>
                          <span>
                            {formatCurrency(
                              creditInfo.outstandingTotal,
                              creditInfo.currency,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>After this invoice</span>
                          <span
                            className={
                              creditInfo.willExceed
                                ? "text-rose-600"
                                : "text-emerald-600"
                            }
                          >
                            {formatCurrency(
                              creditInfo.totalAfterNewInvoice,
                              creditInfo.currency,
                            )}
                          </span>
                        </div>
                        {creditInfo.willExceed ? (
                          <p className="text-rose-600">
                            Exceeds limit by{" "}
                            {formatCurrency(
                              creditInfo.exceedBy,
                              creditInfo.currency,
                            )}
                            .
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="space-y-3">
                  <label className="block">
                    <span className={formLabelClass}>
                      Notes
                    </span>
                    <textarea
                      className={`${formControlClass} min-h-[72px]`}
                      disabled={loading || isInvoicePaid}
                      value={form.notes}
                      onChange={(ev) =>
                        setForm((f) => ({ ...f, notes: ev.target.value }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className={formLabelClass}>
                      Terms &amp; conditions
                    </span>
                    <textarea
                      className={`${formControlClass} min-h-[72px]`}
                      disabled={loading || isInvoicePaid}
                      value={form.terms_conditions}
                      onChange={(ev) =>
                        setForm((f) => ({
                          ...f,
                          terms_conditions: ev.target.value,
                        }))
                      }
                    />
                  </label>
                </section>
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
              disabled={loading || isInvoicePaid}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading
                ? "Saving…"
                : isEdit
                  ? "Update invoice"
                  : "Create invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
