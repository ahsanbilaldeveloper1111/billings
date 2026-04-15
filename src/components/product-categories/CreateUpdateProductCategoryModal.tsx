"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FormField, FormModal } from "@/components/crud/FormModal";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { useCompanies } from "@/hooks/company/useCompanies";
import { useProductCategory } from "@/hooks/product-categories/useProductCategory";
import { useProductCategories } from "@/hooks/product-categories/useProductCategories";
import { useProductCategoryMutations } from "@/hooks/product-categories/useProductCategoryMutations";
import { useVendors } from "@/hooks/vendors/useVendors";
import { errorsFromAxios } from "@/lib/api/errorsFromAxios";
import { extractListRows, getApiData } from "@/lib/api/extractApiData";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Company } from "@/models/Company";
import type { ProductCategory } from "@/models/ProductCategory";
import type { Vendor } from "@/models/Vendor";
import { formControlClass } from "@/lib/uiFormClasses";

type ParentRow = { id: number; name?: string };

const INITIAL = {
  name: "",
  description: "",
  tenant_id: "",
  parent_id: "" as string | number,
  is_active: true,
};

export function CreateUpdateProductCategoryModal({
  open,
  onClose,
  onSuccess,
  categoryId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categoryId: number | string | null;
}) {
  const isEdit = categoryId != null;
  const mutations = useProductCategoryMutations();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const parentsQ = useProductCategories({
    limit: 500,
    ...(form.tenant_id.trim() ? { tenant_id: form.tenant_id.trim() } : {}),
  });
  const detailQ = useProductCategory(open && isEdit ? categoryId : null);

  const vendorsQ = useVendors(
    { page: 1, limit: 500, load_resellers: true },
    { enabled: open },
  );
  const allCompaniesQ = useCompanies(
    { page: 1, limit: 1000, load_profile: false },
    { enabled: open },
  );
  const vendorIdNum = selectedVendorId
    ? Number.parseInt(selectedVendorId, 10)
    : NaN;

  const parentRows = useMemo(() => {
    const { rows } = extractListRows<ParentRow>(parentsQ.data);
    return rows.filter((r) => r.id != null);
  }, [parentsQ.data]);

  const parentOptions = useMemo(() => {
    if (!isEdit || categoryId == null) return parentRows;
    const id = Number(categoryId);
    return parentRows.filter((r) => r.id !== id);
  }, [parentRows, isEdit, categoryId]);

  const vendorRows = useMemo(() => {
    const { rows } = extractListRows<Vendor & Record<string, unknown>>(
      vendorsQ.data,
    );
    return rows;
  }, [vendorsQ.data]);

  useEffect(() => {
    if (!open || !isEdit) return;
    const raw = getApiData(detailQ.data) as
      | (ProductCategory & Record<string, unknown>)
      | undefined;
    if (!raw) return;
    const pid = raw.parent_id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from GET show
    setForm({
      name: String(raw.name ?? ""),
      description: raw.description != null ? String(raw.description) : "",
      tenant_id: raw.tenant_id != null ? String(raw.tenant_id).trim() : "",
      parent_id:
        pid != null && Number.isFinite(Number(pid)) ? Number(pid) : "",
      is_active: raw.is_active !== false,
    });
    setErrors({});
  }, [open, isEdit, detailQ.data]);

  useEffect(() => {
    if (!open) {
      setSelectedVendorId(null);
      return;
    }
    if (!isEdit) return;
    const tid = form.tenant_id.trim();
    if (!tid) {
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

  function handleVendorChange(v: string) {
    setSelectedVendorId(v || null);
    setForm((s) => ({ ...s, tenant_id: "" }));
  }

  function handleClose() {
    setForm(INITIAL);
    setSelectedVendorId(null);
    setErrors({});
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    const name = form.name.trim();
    if (!name) {
      setErrors({ name: "Name is required" });
      return;
    }
    const parentId =
      form.parent_id === "" || form.parent_id === undefined
        ? null
        : Number(form.parent_id);
    const body: Record<string, unknown> = {
      name,
      is_active: form.is_active,
      tenant_id:
        typeof form.tenant_id === "string" && form.tenant_id.trim()
          ? form.tenant_id.trim()
          : null,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(parentId != null ? { parent_id: parentId } : { parent_id: null }),
    };
    try {
      if (isEdit && categoryId != null) {
        await mutations.update.mutateAsync({ id: categoryId, body });
        showAppToast("Category updated.", "success");
      } else {
        await mutations.create.mutateAsync(body);
        showAppToast("Category created.", "success");
      }
      setForm(INITIAL);
      setErrors({});
      onSuccess?.();
      onClose();
    } catch (err) {
      const mapped = errorsFromAxios(err);
      setErrors(mapped);
      const hasField = Object.keys(mapped).some((k) => k !== "submit");
      if (!hasField) showBillingBackendErrorToast(err);
    }
  }

  const loading =
    mutations.create.isPending ||
    mutations.update.isPending ||
    (isEdit && detailQ.isPending);

  const inputErr = (field: string) =>
    errors[field]
      ? "border-rose-500 ring-1 ring-rose-500/30 dark:border-rose-600"
      : "";

  return (
    <FormModal
      open={open}
      title={
        isEdit ? "Update product category" : "Create product category"
      }
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Update category" : "Create category"}
      loading={loading}
      panelClassName="max-w-lg"
    >
      {errors.submit ? (
        <div
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100"
          role="alert"
        >
          {errors.submit}
        </div>
      ) : null}

      <FormField label="Name *">
        <input
          required
          name="name"
          className={`${formControlClass} ${inputErr("name")}`}
          value={form.name}
          onChange={(e) => {
            setForm((s) => ({ ...s, name: e.target.value }));
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          placeholder="Enter category name"
          aria-invalid={!!errors.name}
        />
        {errors.name ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.name}
          </p>
        ) : null}
      </FormField>

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
          Select vendor first, then choose the company (tenant) this category
          belongs to.
        </p>
      </FormField>

      <FormField label="Company (tenant)">
        <TenantSearchableDropdown
          className={inputErr("tenant_id")}
          value={form.tenant_id}
          enabled={Number.isFinite(vendorIdNum)}
          disabled={!Number.isFinite(vendorIdNum)}
          fetchParams={
            Number.isFinite(vendorIdNum)
              ? { vendor_id: vendorIdNum }
              : undefined
          }
          onChange={(tenantId) =>
            setForm((s) => ({ ...s, tenant_id: tenantId ?? "" }))
          }
          placeholder={
            Number.isFinite(vendorIdNum)
              ? "Search and select company…"
              : "Select vendor first…"
          }
        />
        {errors.tenant_id ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.tenant_id}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Category is scoped to the selected company when provided.
        </p>
      </FormField>

      <FormField label="Description">
        <textarea
          name="description"
          rows={3}
          className={`${formControlClass} ${inputErr("description")}`}
          value={form.description}
          onChange={(e) => {
            setForm((s) => ({ ...s, description: e.target.value }));
            if (errors.description)
              setErrors((prev) => ({ ...prev, description: "" }));
          }}
          placeholder="Enter category description"
          aria-invalid={!!errors.description}
        />
        {errors.description ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.description}
          </p>
        ) : null}
      </FormField>

      <FormField label="Parent category">
        <select
          name="parent_id"
          className={`${formControlClass} ${inputErr("parent_id")}`}
          value={form.parent_id === "" ? "" : String(form.parent_id)}
          onChange={(e) => {
            setForm((s) => ({
              ...s,
              parent_id: e.target.value === "" ? "" : Number(e.target.value),
            }));
            if (errors.parent_id)
              setErrors((prev) => ({ ...prev, parent_id: "" }));
          }}
          aria-invalid={!!errors.parent_id}
        >
          <option value="">Root category</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? `Category ${c.id}`}
            </option>
          ))}
        </select>
        {errors.parent_id ? (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.parent_id}
          </p>
        ) : null}
      </FormField>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          checked={form.is_active}
          onChange={(e) => {
            setForm((s) => ({ ...s, is_active: e.target.checked }));
            if (errors.is_active)
              setErrors((prev) => ({ ...prev, is_active: "" }));
          }}
        />
        Active
      </label>
      {errors.is_active ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {errors.is_active}
        </p>
      ) : null}
    </FormModal>
  );
}
