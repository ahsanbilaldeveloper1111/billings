"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FormField, FormModal } from "@/components/crud/FormModal";
import { ProductCategoryManagementModal } from "@/components/product-categories/ProductCategoryManagementModal";
import { useCompanies } from "@/hooks/company/useCompanies";
import { useActiveCurrencies, currenciesFromResponse } from "@/hooks/currencies/useActiveCurrencies";
import { useProduct } from "@/hooks/products/useProduct";
import { useProductMutations } from "@/hooks/products/useProductMutations";
import { useProductCategories } from "@/hooks/product-categories/useProductCategories";
import { useMainAppResellerNameMap } from "@/hooks/resellers/useMainAppResellerNameMap";
import { useVendors } from "@/hooks/vendors/useVendors";
import { errorsFromAxios } from "@/lib/api/errorsFromAxios";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import { extractListRows, getApiData } from "@/lib/api/extractApiData";
import {
  buildProductMutationFormData,
  buildProductMutationPayload,
  defaultProductFormState,
  finalizeProductLogoForSubmit,
  productFormStateFromApiProduct,
  type ProductFormState,
} from "@/lib/products/productFormState";
import {
  hasValidationErrors,
  validateProductForm,
} from "@/lib/products/productFormValidation";
import { formatTenantListLabel } from "@/lib/company/tenantDisplayLabel";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import {
  logoDisplaySrc,
  logoPreviewSource,
  shouldHideLogoTextValue,
} from "@/lib/logoDisplaySrc";
import type { Company } from "@/models/Company";
import type { Product } from "@/models/Product";
import type { Vendor } from "@/models/Vendor";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";

type CatRow = { id: number; name?: string; tenant_id?: string | null };

type CreateUpdateProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId: number | string | null;
};

export function CreateUpdateProductModal({
  open,
  onClose,
  onSuccess,
  productId,
}: CreateUpdateProductModalProps) {
  const isEdit = productId != null;
  const [form, setForm] = useState<ProductFormState>(defaultProductFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const productLogoFileRef = useRef<HTMLInputElement>(null);
  const [productLogoFile, setProductLogoFile] = useState<File | null>(null);
  const [productLogoBlobUrl, setProductLogoBlobUrl] = useState<string | null>(
    null,
  );
  const [logoRemoved, setLogoRemoved] = useState(false);

  const mutations = useProductMutations();
  /** Load categories (up to limit); options are filtered client-side by selected company. */
  const categoriesQ = useProductCategories({ limit: 500 }, { enabled: open });
  const currenciesQ = useActiveCurrencies();
  const detailQ = useProduct(open && isEdit ? productId : null);
  const productRow = getApiData(detailQ.data) as
    | (Product & Record<string, unknown>)
    | undefined;
  const mainAppResellerMap = useMainAppResellerNameMap();

  const vendorsQ = useVendors(
    { page: 1, limit: 500, load_resellers: true },
    { enabled: open },
  );
  const allCompaniesQ = useCompanies(
    { page: 1, limit: 1000, load_profile: false },
    { enabled: open },
  );
  const filteredCompaniesQ = useCompanies(
    {
      page: 1,
      limit: 1000,
      load_profile: true,
      ...(selectedVendorId
        ? { vendor_id: Number.parseInt(selectedVendorId, 10) }
        : {}),
    },
    {
      enabled:
        open &&
        selectedVendorId != null &&
        selectedVendorId !== "",
    },
  );

  const categoryRows = useMemo(() => {
    const { rows } = extractListRows<CatRow>(categoriesQ.data);
    const tenantId = form.tenant_id.trim();
    return rows.filter((r) => {
      if (r.id == null) return false;
      const rowTenantId =
        r.tenant_id != null && String(r.tenant_id).trim() !== ""
          ? String(r.tenant_id).trim()
          : "";
      // No company: only categories not tied to a tenant. With company: only that tenant's categories.
      if (!tenantId) return rowTenantId === "";
      return rowTenantId === tenantId;
    });
  }, [categoriesQ.data, form.tenant_id]);

  useEffect(() => {
    if (!open) return;
    const selected = String(form.category_id ?? "").trim();
    if (!selected) return;
    // While categories are still loading, options are empty — do not clear (that
    // was wiping edit hydration before options arrived).
    if (categoriesQ.isPending) return;
    const existsInOptions = categoryRows.some((c) => String(c.id) === selected);
    if (!existsInOptions) {
      // Clear category if tenant switch made current category invalid.
      setForm((s) => ({ ...s, category_id: "" }));
    }
  }, [open, form.category_id, categoryRows, categoriesQ.isPending]);

  const currencies = useMemo(() => {
    const list = currenciesFromResponse(currenciesQ.data);
    return list.slice().sort((a, b) => a.code.localeCompare(b.code));
  }, [currenciesQ.data]);

  const vendorRows = useMemo(() => {
    const { rows } = extractListRows<Vendor & Record<string, unknown>>(
      vendorsQ.data,
    );
    return rows;
  }, [vendorsQ.data]);

  const companyOptions = useMemo(() => {
    const placeholder = selectedVendorId
      ? "Select a company…"
      : "Select a vendor first…";
    if (!selectedVendorId) {
      return [{ value: "", label: placeholder }];
    }
    const { rows } = extractListRows<Company & Record<string, unknown>>(
      filteredCompaniesQ.data,
    );
    const opts = rows.map((c) => {
      const tid =
        c.tenant_id != null && String(c.tenant_id).trim() !== ""
          ? String(c.tenant_id).trim()
          : "";
      const companyName =
        typeof c.name === "string" ? String(c.name).trim() : "";
      const resellerNested =
        c.reseller?.name != null ? String(c.reseller.name).trim() : "";
      const displayName =
        companyName ||
        resellerNested ||
        mainAppResellerMap[tid] ||
        tid;
      return {
        value: tid,
        label: tid ? formatTenantListLabel(tid, displayName) : "—",
      };
    });
    return [{ value: "", label: "Select a company…" }, ...opts];
  }, [
    selectedVendorId,
    filteredCompaniesQ.data,
    mainAppResellerMap,
  ]);

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setForm(defaultProductFormState());
      setErrors({});
      setProductLogoFile(null);
      setLogoRemoved(false);
      setProductLogoBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (productLogoFileRef.current) productLogoFileRef.current.value = "";
      return;
    }
    const raw = getApiData(detailQ.data) as
      | (Product & Record<string, unknown>)
      | undefined;
    if (!raw) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from GET show
    setForm(productFormStateFromApiProduct(raw));
    setErrors({});
    setProductLogoFile(null);
    setLogoRemoved(false);
    setProductLogoBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (productLogoFileRef.current) productLogoFileRef.current.value = "";
  }, [open, isEdit, detailQ.data]);

  useEffect(() => {
    if (open) return;
    setProductLogoFile(null);
    setLogoRemoved(false);
    setProductLogoBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (productLogoFileRef.current) productLogoFileRef.current.value = "";
  }, [open]);

  useEffect(() => {
    if (!open || !isEdit) return;
    const tid = form.tenant_id.trim();
    if (!tid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync vendor when tenant cleared
      setSelectedVendorId(null);
      return;
    }
    const { rows } = extractListRows<Company & Record<string, unknown>>(
      allCompaniesQ.data,
    );
    const company = rows.find((c) => String(c.tenant_id ?? "") === tid);
    if (company?.vendor_id != null) {
      setSelectedVendorId(String(company.vendor_id));
    }
  }, [open, isEdit, form.tenant_id, allCompaniesQ.data]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when sheet closes
      setSelectedVendorId(null);
    }
  }, [open]);

  function handleVendorChange(v: string) {
    setSelectedVendorId(v || null);
    setForm((s) => ({ ...s, tenant_id: "" }));
  }

  const productLogoPreviewSrc = useMemo(() => {
    if (productLogoBlobUrl) return productLogoBlobUrl;
    if (isEdit && logoRemoved) return "";
    if (isEdit && productRow) {
      const rawUrl = productRow.logo_url as string | undefined;
      return (
        logoDisplaySrc(logoPreviewSource(undefined, rawUrl)) ?? ""
      );
    }
    return "";
  }, [productLogoBlobUrl, isEdit, logoRemoved, productRow]);

  function productHadLogoFromRow(): boolean {
    const u = productRow?.logo_url;
    return typeof u === "string" && u.trim() !== "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = validateProductForm(form, isEdit);
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;
    const body = buildProductMutationPayload(form, isEdit) as Record<
      string,
      unknown
    >;
    finalizeProductLogoForSubmit(body, {
      hasLogoFile: Boolean(productLogoFile),
      isEdit,
      logoRemoved,
      row: productRow,
    });
    try {
      if (productLogoFile) {
        const payload = structuredClone(body) as Record<string, unknown>;
        if (typeof payload.logo_url === "string") {
          if (
            payload.logo_url.startsWith("data:") ||
            shouldHideLogoTextValue(payload.logo_url)
          ) {
            delete payload.logo_url;
          }
        }
        const fd = buildProductMutationFormData(payload, productLogoFile);
        if (isEdit && productId != null) {
          await mutations.update.mutateAsync({ id: productId, body: fd });
          showAppToast("Product updated.", "success");
        } else {
          await mutations.create.mutateAsync(fd);
          showAppToast("Product created.", "success");
        }
      } else if (isEdit && productId != null) {
        await mutations.update.mutateAsync({ id: productId, body });
        showAppToast("Product updated.", "success");
      } else {
        await mutations.create.mutateAsync(body);
        showAppToast("Product created.", "success");
      }
      setForm(defaultProductFormState());
      setProductLogoFile(null);
      setLogoRemoved(false);
      setProductLogoBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (productLogoFileRef.current) productLogoFileRef.current.value = "";
      onSuccess?.();
      onClose();
    } catch (err) {
      const mapped = errorsFromAxios(err);
      setErrors(mapped);
      const hasField = Object.keys(mapped).some((k) => k !== "submit");
      if (!hasField) showBillingBackendErrorToast(err);
    }
  }

  /** Only disable submit while saving — not while loading edit row (that kept Update disabled). */
  const loading =
    mutations.create.isPending || mutations.update.isPending;

  const inputErr = (field: string) =>
    errors[field]
      ? "border-rose-500 ring-1 ring-rose-500/30 dark:border-rose-600"
      : "";

  return (
    <FormModal
      open={open}
      title={isEdit ? "Edit product" : "Create product"}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Update product" : "Create"}
      loading={loading}
      panelClassName="max-w-2xl"
    >
      {errors.submit ? (
        <div
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          {errors.submit}
        </div>
      ) : null}

      <>
        <FormField label="Vendor">
          <select
            className={formControlClass}
            value={selectedVendorId ?? ""}
            onChange={(e) => handleVendorChange(e.target.value)}
          >
            <option value="">Select a vendor…</option>
            {vendorRows.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.name ?? `Vendor ${v.id}`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Select a vendor first, then choose the company (tenant) this
            product is attached to.
          </p>
        </FormField>

        <FormField label="Company (tenant)">
          <select
            className={`${formControlClass} ${inputErr("tenant_id")}`}
            value={form.tenant_id}
            disabled={!selectedVendorId}
            onChange={(e) =>
              setForm((s) => ({ ...s, tenant_id: e.target.value }))
            }
          >
            {companyOptions.map((o, i) => (
              <option key={`${o.value}-${i}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.tenant_id ? (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {errors.tenant_id}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Product is scoped to the selected company when provided.
          </p>
        </FormField>
      </>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Product name *">
          <input
            required
            className={`${formControlClass} ${inputErr("name")}`}
            value={form.name}
            onChange={(e) => {
              setForm((s) => ({ ...s, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Enter product name"
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {errors.name}
            </p>
          ) : null}
        </FormField>
        <FormField label="SKU">
          <input
            className={formControlClass}
            value={form.sku}
            onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
            placeholder="Stock keeping unit (optional)"
          />
        </FormField>
      </div>

      <FormField label="Category *">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Pick an existing category or manage categories.
          </p>
          <button
            type="button"
            onClick={() => setCategoryManagerOpen(true)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Manage categories
          </button>
        </div>
        <select
          className={`${formControlClass} ${inputErr("category_id")}`}
          value={form.category_id === "" ? "" : String(form.category_id)}
          onChange={(e) => {
            const v = e.target.value;
            setForm((s) => ({
              ...s,
              category_id: v === "" ? "" : Number(v),
            }));
            if (errors.category_id)
              setErrors((prev) => ({ ...prev, category_id: "" }));
          }}
        >
          <option value="">Select category</option>
          {categoryRows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? `Category ${c.id}`}
            </option>
          ))}
        </select>
        {errors.category_id ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.category_id}
          </p>
        ) : null}
      </FormField>

      <FormField label="Description">
        <textarea
          rows={3}
          className={formControlClass}
          value={form.description}
          onChange={(e) =>
            setForm((s) => ({ ...s, description: e.target.value }))
          }
          placeholder="Product description"
        />
      </FormField>

      <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-br from-white to-teal-50/30 p-3.5 shadow-sm shadow-zinc-900/[0.04] dark:border-zinc-800/80 dark:from-zinc-950 dark:to-teal-950/20 dark:shadow-black/20">
        <span className={formLabelClass}>Product logo</span>
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Upload PNG or JPEG (or WebP / GIF). The file is sent as binary{" "}
          <span className="font-mono">logo_file</span> (same as company / vendor).
          Remove clears the logo on save when one exists.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-teal-300/80 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 shadow-sm hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-950/55"
            onClick={() => productLogoFileRef.current?.click()}
          >
            Upload image
          </button>
          <input
            ref={productLogoFileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setLogoRemoved(false);
              setProductLogoFile(file);
              setProductLogoBlobUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
              });
              e.target.value = "";
            }}
          />
          {productLogoPreviewSrc ? (
            <button
              type="button"
              className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-900 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-100"
              onClick={() => {
                setLogoRemoved(true);
                setProductLogoFile(null);
                setProductLogoBlobUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                if (productLogoFileRef.current) {
                  productLogoFileRef.current.value = "";
                }
              }}
            >
              Remove logo
            </button>
          ) : null}
        </div>
        {productLogoPreviewSrc ? (
          <div className="mt-3 rounded-lg border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productLogoPreviewSrc}
              alt="Product logo preview"
              className="mx-auto max-h-32 max-w-full object-contain"
              onError={(ev) => {
                (ev.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : null}
        {logoRemoved && isEdit && productHadLogoFromRow() ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            Logo will be removed when you save.
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setLogoRemoved(false);
                setProductLogoFile(null);
                setProductLogoBlobUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                if (productLogoFileRef.current) {
                  productLogoFileRef.current.value = "";
                }
              }}
            >
              Undo
            </button>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Base price *">
          <input
            type="number"
            step="any"
            min="0"
            className={`${formControlClass} ${inputErr("base_price")}`}
            value={form.base_price}
            onChange={(e) => {
              setForm((s) => ({
                ...s,
                base_price: stripNumericLeadingZerosForControlledInput(
                  e.target.value,
                ),
              }));
              if (errors.base_price)
                setErrors((prev) => ({ ...prev, base_price: "" }));
            }}
            placeholder="0.00"
          />
          {errors.base_price ? (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {errors.base_price}
            </p>
          ) : null}
        </FormField>
        <FormField label="Currency">
          <select
            className={formControlClass}
            value={form.currency}
            onChange={(e) =>
              setForm((s) => ({ ...s, currency: e.target.value }))
            }
          >
            {currencies.length === 0 ? (
              <option value="USD">USD</option>
            ) : (
              currencies.map((c) => (
                <option key={c.id ?? c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))
            )}
          </select>
        </FormField>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.is_service}
          onChange={(e) =>
            setForm((s) => ({ ...s, is_service: e.target.checked }))
          }
        />
        <span>
          <span className="font-medium">Service product</span>
          <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
            Service products do not use inventory tracking.
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) =>
            setForm((s) => ({ ...s, is_active: e.target.checked }))
          }
        />
        Active
      </label>

      <ProductCategoryManagementModal
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />
    </FormModal>
  );
}
