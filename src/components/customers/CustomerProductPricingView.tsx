"use client";

import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { useCustomer } from "@/hooks/customers/useCustomer";
import { useCustomerProductPricingList } from "@/hooks/customers/useCustomerProductPricingList";
import { useCustomerProductPricingMutations } from "@/hooks/customers/useCustomerProductPricingMutations";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useProducts } from "@/hooks/products/useProducts";
import { extractListRows } from "@/lib/api/extractApiData";
import type { ApiSuccessResponse } from "@/lib/api/types";
import {
  formatPricingDateShort,
  normalizeProductPricingRows,
  type ProductPricingRow,
  validateRenewalDates,
} from "@/lib/company/productPricingHelpers";
import { formatCurrency } from "@/lib/currency";
import { unwrapApiSuccessData } from "@/lib/dashboard/unwrapAnalyticsPayload";
import { appPaths } from "@/lib/navigation/appPaths";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import { formControlGrowMinClass } from "@/lib/uiFormClasses";
import type { ProductDiscountApplicability } from "@/models/Company";
import type { Customer } from "@/models/Customer";
import { ModuleName } from "@/models/Module";
import type { Product } from "@/models/Product";
import {
  AddProductPricingModal,
  BulkUpdateModal,
  DeletePricingModal,
} from "@/components/company/CompanyProductPricingModals";

const LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

type AddPricingItemPayload = {
  product_id: number;
  selling_price: number;
  discount_applicability_id: number | null;
  custom_description: string | null;
  is_active: boolean;
  renewal_start_date: string | null;
  renewal_end_date: string | null;
  status: string | null;
  billing_cycle: string | null;
  subscriptions: number;
};

function calculateFinalPrice(row: ProductPricingRow): number {
  const base = row.selling_price;
  const d = row.discount_applicability;
  if (!d || !d.is_applicable) return base;
  if (d.discount_type === "percentage") {
    return Math.max(0, base - (base * (d.discount_percentage ?? 0)) / 100);
  }
  return Math.max(0, base - (d.discount_amount ?? 0));
}

function collectAvailableDiscounts(rows: ProductPricingRow[]): ProductDiscountApplicability[] {
  const map = new Map<number, ProductDiscountApplicability>();
  for (const r of rows) {
    const d = r.discount_applicability;
    if (d?.id != null && !map.has(d.id)) map.set(d.id, d);
  }
  return [...map.values()];
}

export function CustomerProductPricingView({
  customerId,
}: Readonly<{ customerId: string }>) {
  const trimmed = customerId?.trim() ?? "";
  const { isSuperAdmin, isUserLoading, canView, canUpdate, canDelete } =
    usePermissions();
  const mod = ModuleName.CUSTOMER;
  const allowView = isSuperAdmin || canView(mod);
  const allowUpdate = isSuperAdmin || canUpdate(mod);
  const allowDelete = isSuperAdmin || canDelete(mod);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("product_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [editing, setEditing] = useState<
    Record<number, Partial<ProductPricingRow>>
  >({});
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [showBulk, setShowBulk] = useState(false);
  const [bulkPct, setBulkPct] = useState("");
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductPricingRow | null>(
    null,
  );

  const customerQuery = useCustomer(trimmed || null, { load_profile: true });
  const customer = unwrapApiSuccessData<Customer>(customerQuery.data);
  const companyDefaultCurrency = customer?.profile?.currency ?? "USD";
  const customerName = customer?.name ?? "Customer";
  const customerTenantId =
    customer?.tenant_id != null && String(customer.tenant_id).trim() !== ""
      ? String(customer.tenant_id).trim()
      : "";
  const hasTenantId = customerTenantId.length > 0;

  const listParams = useMemo(
    () => ({
      page,
      limit,
      load_product: true,
      ...(search.trim() ? { search: search.trim() } : {}),
      "order[column]": sortField,
      "order[dir]": sortDir,
    }),
    [page, limit, search, sortField, sortDir],
  );

  const listQuery = useCustomerProductPricingList(trimmed, listParams, {
    enabled: !!trimmed && allowView,
  });

  const mutations = useCustomerProductPricingMutations(trimmed);

  const productsQuery = useProducts({
    tenant_id: customerTenantId,
    page: 1,
    limit: 500,
  }, { enabled: hasTenantId });
  const catalogRows = extractListRows<Product & Record<string, unknown>>(
    productsQuery.data,
  ).rows;

  const unwrappedList = unwrapApiSuccessData<unknown>(listQuery.data);
  const productsList = useMemo(
    () =>
      normalizeProductPricingRows(
        unwrappedList ?? listQuery.data,
        companyDefaultCurrency,
      ),
    [unwrappedList, listQuery.data, companyDefaultCurrency],
  );

  const availableDiscounts = useMemo(
    () => collectAvailableDiscounts(productsList),
    [productsList],
  );

  const pagination = (listQuery.data as ApiSuccessResponse<unknown> | undefined)
    ?.pagination;

  const toggleSelect = useCallback((productId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === productsList.length && productsList.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(productsList.map((p) => p.product_id)));
    }
  }, [productsList, selected.size]);

  const startEdit = useCallback((row: ProductPricingRow) => {
    setEditing((prev) => ({
      ...prev,
      [row.product_id]: { ...row },
    }));
  }, []);

  const cancelEdit = useCallback((productId: number) => {
    setEditing((prev) => {
      const n = { ...prev };
      delete n[productId];
      return n;
    });
    setValidationErrors((prev) => {
      const n = { ...prev };
      delete n[productId];
      return n;
    });
  }, []);

  const patchEdit = useCallback(
    (productId: number, field: keyof ProductPricingRow, value: unknown) => {
      setEditing((prev) => {
        const next = {
          ...prev,
          [productId]: { ...prev[productId], [field]: value },
        };
        const row = next[productId];
        if (
          row &&
          (field === "billing_cycle" ||
            field === "renewal_start_date" ||
            field === "renewal_end_date")
        ) {
          const err = validateRenewalDates(
            String(row.billing_cycle ?? ""),
            row.renewal_start_date,
            row.renewal_end_date,
          );
          setValidationErrors((e) => ({
            ...e,
            [productId]: err ?? "",
          }));
        }
        return next;
      });
    },
    [],
  );

  const saveRow = async (row: ProductPricingRow) => {
    const e = editing[row.product_id];
    if (!e) return;
    const err = validateRenewalDates(
      String(e.billing_cycle ?? row.billing_cycle ?? ""),
      e.renewal_start_date ?? row.renewal_start_date,
      e.renewal_end_date ?? row.renewal_end_date,
    );
    if (err) {
      setValidationErrors((prev) => ({ ...prev, [row.product_id]: err }));
      showAppToast(err, "error");
      return;
    }
    try {
      await mutations.updateProductPricing.mutateAsync({
        product_id: row.product_id,
        selling_price: e.selling_price ?? row.selling_price,
        discount_applicability_id:
          e.discount_applicability_id ?? row.discount_applicability_id ?? null,
        custom_description: e.custom_description ?? row.custom_description ?? null,
        is_active: e.is_active ?? row.is_active,
        renewal_start_date:
          e.renewal_start_date ?? row.renewal_start_date ?? null,
        renewal_end_date: e.renewal_end_date ?? row.renewal_end_date ?? null,
        status: e.status ?? row.status ?? "Active",
        billing_cycle: e.billing_cycle ?? row.billing_cycle ?? null,
        subscriptions: e.subscriptions ?? row.subscriptions ?? 0,
      });
      showAppToast("Pricing updated.", "success");
      cancelEdit(row.product_id);
    } catch (error: unknown) {
      showBillingBackendErrorToast(error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mutations.deleteProductPricing.mutateAsync(deleteTarget.product_id);
      showAppToast("Pricing removed.", "success");
      setShowDelete(false);
      setDeleteTarget(null);
    } catch (error: unknown) {
      showBillingBackendErrorToast(error);
    }
  };

  const runBulkDiscountFromModal = async () => {
    const pct = Number.parseFloat(bulkPct);
    if (!Number.isFinite(pct) || pct <= 0) {
      showAppToast("Enter a valid discount percentage.", "warning");
      return;
    }
    if (selected.size === 0) {
      showAppToast("Select at least one product.", "warning");
      return;
    }
    const bulkData = productsList
      .filter((p) => selected.has(p.product_id))
      .map((p) => ({
        product_id: p.product_id,
        selling_price: p.selling_price * (1 - pct / 100),
        discount_applicability_id: p.discount_applicability_id ?? null,
        is_active: p.is_active,
      }));
    try {
      await mutations.bulkUpdateProductPricing.mutateAsync({
        pricing_data: bulkData,
      });
      showAppToast(`Bulk update applied (${bulkData.length} rows).`, "success");
      setShowBulk(false);
      setBulkPct("");
      setSelected(new Set());
    } catch (error: unknown) {
      showBillingBackendErrorToast(error);
    }
  };

  const submitAddPricing = async (
    pricingData: AddPricingItemPayload[],
  ) => {
    if (pricingData.length === 0) {
      showAppToast("Select at least one product.", "warning");
      return;
    }
    try {
      await mutations.bulkUpdateProductPricing.mutateAsync({
        pricing_data: pricingData,
      });
      showAppToast("Product pricing added.", "success");
      setShowAddPricing(false);
    } catch (error: unknown) {
      showBillingBackendErrorToast(error);
    }
  };

  const handleSort = (field: string) => {
    setSortField(field);
    setSortDir((d) =>
      sortField === field ? (d === "asc" ? "desc" : "asc") : "asc",
    );
    setPage(1);
  };

  if (!trimmed) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-6 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
        <p className="font-medium text-rose-900 dark:text-rose-100">
          Missing customer id in the URL.
        </p>
        <Link
          href={appPaths.customers}
          className="mt-3 inline-block text-sm text-emerald-700 underline dark:text-emerald-400"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  if (isUserLoading) {
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60" />
    );
  }

  if (!allowView) {
    return (
      <p className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        You do not have permission to view customer product pricing.
      </p>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-6 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
        <p className="text-rose-900 dark:text-rose-100">
          Failed to load product pricing.
        </p>
        <Link
          href={appPaths.customers}
          className="mt-3 inline-block text-sm text-emerald-700 underline"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <Link
              href={appPaths.customers}
              className="text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Customers
            </Link>
            <span aria-hidden>/</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              Subscription pricing
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {customerName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Customer key:{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              {trimmed}
            </code>{" "}
            · Default currency: <strong>{companyDefaultCurrency}</strong>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allowUpdate ? (
          <>
            <button
              type="button"
              onClick={() => setShowAddPricing(true)}
              disabled={!hasTenantId}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Add pricing
            </button>
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              disabled={selected.size === 0}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-600"
            >
              Bulk discount ({selected.size})
            </button>
          </>
        ) : null}
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={formControlGrowMinClass}
        />
      </div>
      {!hasTenantId ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          This customer has no tenant ID, so product catalog selection is unavailable.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={
                        productsList.length > 0 &&
                        selected.size === productsList.length
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-2 py-2">
                    <button
                      type="button"
                      className="font-semibold"
                      onClick={() => handleSort("product_name")}
                    >
                      Product
                    </button>
                  </th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Base</th>
                  <th className="px-2 py-2">Selling</th>
                  <th className="px-2 py-2">Discount</th>
                  <th className="px-2 py-2">Final</th>
                  <th className="px-2 py-2">Period start</th>
                  <th className="px-2 py-2">Period end</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Billing</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isPending ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : productsList.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-zinc-500">
                      No product pricing rows yet.
                    </td>
                  </tr>
                ) : (
                  productsList.map((row) => {
                    const edit = editing[row.product_id];
                    const vErr = validationErrors[row.product_id];
                    const finalP = calculateFinalPrice({
                      ...row,
                      ...edit,
                      discount_applicability:
                        edit?.discount_applicability ?? row.discount_applicability,
                    });
                    return (
                      <tr
                        key={`${row.product_id}-${row.id ?? ""}`}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={selected.has(row.product_id)}
                            onChange={() => toggleSelect(row.product_id)}
                          />
                        </td>
                        <td className="px-2 py-2 align-top font-medium">
                          {row.product_name}
                        </td>
                        <td className="max-w-[14rem] px-2 py-2 align-top">
                          {edit ? (
                            <textarea
                              rows={2}
                              className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              value={
                                edit.custom_description ??
                                row.custom_description ??
                                ""
                              }
                              onChange={(e) =>
                                patchEdit(
                                  row.product_id,
                                  "custom_description",
                                  e.target.value,
                                )
                              }
                            />
                          ) : (
                            <span className="text-xs text-zinc-600">
                              {row.custom_description ||
                                row.product_description ||
                                "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {formatCurrency(row.base_price, row.currency ?? "USD")}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <input
                              type="number"
                              step="0.01"
                              className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              value={edit.selling_price ?? row.selling_price}
                              onChange={(e) =>
                                patchEdit(
                                  row.product_id,
                                  "selling_price",
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          ) : (
                            formatCurrency(
                              row.selling_price,
                              row.currency ?? "USD",
                            )
                          )}
                        </td>
                        <td className="px-2 py-2 align-top text-xs">
                          {edit ? (
                            <select
                              className="max-w-[10rem] rounded-lg border border-zinc-200 px-1 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                              value={edit.discount_applicability_id ?? ""}
                              onChange={(e) =>
                                patchEdit(
                                  row.product_id,
                                  "discount_applicability_id",
                                  e.target.value
                                    ? Number.parseInt(e.target.value, 10)
                                    : null,
                                )
                              }
                            >
                              <option value="">None</option>
                              {availableDiscounts.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name ?? `Discount #${d.id}`}
                                </option>
                              ))}
                            </select>
                          ) : row.discount_applicability ? (
                            <span>
                              {row.discount_applicability.name ?? "Discount"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-2 align-top font-semibold text-emerald-800 dark:text-emerald-300">
                          {formatCurrency(finalP, row.currency ?? "USD")}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <input
                              type="date"
                              className="rounded-lg border border-zinc-200 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              value={edit.renewal_start_date ?? row.renewal_start_date ?? ""}
                              onChange={(e) =>
                                patchEdit(
                                  row.product_id,
                                  "renewal_start_date",
                                  e.target.value || undefined,
                                )
                              }
                            />
                          ) : (
                            formatPricingDateShort(row.renewal_start_date)
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <div>
                              <input
                                type="date"
                                className="rounded-lg border border-zinc-200 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                                value={edit.renewal_end_date ?? row.renewal_end_date ?? ""}
                                onChange={(e) =>
                                  patchEdit(
                                    row.product_id,
                                    "renewal_end_date",
                                    e.target.value || undefined,
                                  )
                                }
                              />
                              {vErr ? (
                                <p className="mt-1 text-[11px] text-rose-600">
                                  {vErr}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            formatPricingDateShort(row.renewal_end_date)
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <select
                              className="rounded-lg border border-zinc-200 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              value={edit.status ?? row.status ?? "Active"}
                              onChange={(e) =>
                                patchEdit(row.product_id, "status", e.target.value)
                              }
                            >
                              <option value="Active">Active</option>
                              <option value="Trial">Trial</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Suspended">Suspended</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          ) : (
                            row.status ?? "—"
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <select
                              className="rounded-lg border border-zinc-200 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              value={edit.billing_cycle ?? row.billing_cycle ?? "one time"}
                              onChange={(e) =>
                                patchEdit(
                                  row.product_id,
                                  "billing_cycle",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="one time">One time</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          ) : (
                            row.billing_cycle ?? "—"
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <input
                              type="number"
                              min={0}
                              className="w-20 rounded-lg border border-zinc-200 px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                              value={edit.subscriptions ?? row.subscriptions ?? 0}
                              onChange={(e) =>
                                patchEdit(
                                  row.product_id,
                                  "subscriptions",
                                  Number.parseInt(e.target.value, 10) || 0,
                                )
                              }
                            />
                          ) : (
                            row.subscriptions ?? 0
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {edit ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => void saveRow(row)}
                                disabled={mutations.updateProductPricing.isPending}
                                className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelEdit(row.product_id)}
                                className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              {allowUpdate ? (
                                <button
                                  type="button"
                                  onClick={() => startEdit(row)}
                                  className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-600"
                                >
                                  Edit
                                </button>
                              ) : null}
                              {allowDelete ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteTarget(row);
                                    setShowDelete(true);
                                  }}
                                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 dark:border-rose-800"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Rows per page</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-50 dark:border-zinc-600"
          >
            Previous
          </button>
          <span className="text-zinc-600">
            Page {pagination?.page ?? page}
            {pagination?.last_page != null
              ? ` / ${pagination.last_page}`
              : ""}
          </span>
          <button
            type="button"
            disabled={
              pagination?.last_page != null && page >= pagination.last_page
            }
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-50 dark:border-zinc-600"
          >
            Next
          </button>
          </div>
      </div>
      <BulkUpdateModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        discountPercent={bulkPct}
        onDiscountPercentChange={setBulkPct}
        onApply={() => void runBulkDiscountFromModal()}
        busy={mutations.bulkUpdateProductPricing.isPending}
        selectedCount={selected.size}
      />

      <DeletePricingModal
        open={showDelete}
        item={deleteTarget}
        onClose={() => {
          setShowDelete(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
        busy={mutations.deleteProductPricing.isPending}
      />

      <AddProductPricingModal
        open={showAddPricing}
        onClose={() => setShowAddPricing(false)}
        products={catalogRows}
        discountOptions={availableDiscounts}
        onSubmit={(data) => void submitAddPricing(data)}
        busy={mutations.updateProductPricing.isPending}
      />
    </div>
  );
}
