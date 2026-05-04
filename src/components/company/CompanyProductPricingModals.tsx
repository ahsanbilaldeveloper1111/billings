"use client";

import type { ProductPricingRow } from "@/lib/company/productPricingHelpers";
import { validateRenewalDates } from "@/lib/company/productPricingHelpers";
import type { Product } from "@/models/Product";
import { useEffect, useMemo, useState } from "react";
import { stripNumericLeadingZerosForControlledInput } from "@/lib/forms/stripNumericLeadingZeros";
import { formControlClass } from "@/lib/uiFormClasses";

type BulkUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  discountPercent: string;
  onDiscountPercentChange: (v: string) => void;
  onApply: () => void;
  busy: boolean;
  selectedCount: number;
};

export function BulkUpdateModal({
  open,
  onClose,
  discountPercent,
  onDiscountPercentChange,
  onApply,
  busy,
  selectedCount,
}: BulkUpdateModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Bulk update pricing
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Apply a percentage reduction to the selling price of{" "}
          <strong>{selectedCount}</strong> selected product(s).
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Discount (%)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          className={`mt-1 ${formControlClass}`}
          value={discountPercent}
          onChange={(e) =>
            onDiscountPercentChange(
              stripNumericLeadingZerosForControlledInput(e.target.value),
            )
          }
          placeholder="e.g. 10"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={onApply}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

type DeletePricingModalProps = {
  open: boolean;
  item: ProductPricingRow | null;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
};

export function DeletePricingModal({
  open,
  item,
  onClose,
  onConfirm,
  busy,
}: DeletePricingModalProps) {
  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">
          Delete product pricing?
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Remove pricing for <strong>{item.product_name}</strong>. This cannot be
          undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

type AddProductPricingModalProps = {
  open: boolean;
  onClose: () => void;
  products: Product[];
  discountOptions: Array<{ id: number; name?: string; discount_percentage?: number }>;
  onSubmit: (
    pricingData: Array<{
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
    }>,
  ) => void;
  busy: boolean;
};

type DraftPricing = {
  product_id: number;
  selling_price: number;
  discount_applicability_id?: number;
  custom_description?: string;
  is_active: boolean;
  renewal_start_date?: string;
  renewal_end_date?: string;
  status: string;
  billing_cycle: string;
  subscriptions: number;
};

export function AddProductPricingModal({
  open,
  onClose,
  products,
  discountOptions,
  onSubmit,
  busy,
}: AddProductPricingModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [pricingData, setPricingData] = useState<Record<number, DraftPricing>>({});
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>(
    {},
  );
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset draft when modal opens */
    setSearchTerm("");
    setSelectedProducts([]);
    setPricingData({});
    setValidationErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = String(p.name ?? "").toLowerCase();
      const desc = String(p.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [products, searchTerm]);

  const addProduct = (product: Product) => {
    if (selectedProducts.some((p) => p.id === product.id)) return;
    setSelectedProducts((prev) => [...prev, product]);
    setPricingData((prev) => ({
      ...prev,
      [product.id]: {
        product_id: product.id,
        selling_price: Number(product.base_price) || 0,
        is_active: true,
        renewal_start_date: undefined,
        renewal_end_date: undefined,
        status: "Active",
        billing_cycle: "one time",
        subscriptions: 0,
      },
    }));
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    setPricingData((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const patchPricing = (
    productId: number,
    field: keyof DraftPricing,
    value: string | number | boolean | undefined,
  ) => {
    setPricingData((prev) => {
      const next = {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value,
        },
      };
      const row = next[productId];
      if (
        row &&
        (field === "billing_cycle" ||
          field === "renewal_start_date" ||
          field === "renewal_end_date")
      ) {
        const err = validateRenewalDates(
          row.billing_cycle,
          row.renewal_start_date,
          row.renewal_end_date,
        );
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          [productId]: err ?? "",
        }));
      }
      return next;
    });
  };

  const validateBeforeSubmit = () => {
    if (selectedProducts.length === 0) return false;
    for (const p of selectedProducts) {
      const row = pricingData[p.id];
      if (!row || row.selling_price <= 0) return false;
      const err = validateRenewalDates(
        row.billing_cycle,
        row.renewal_start_date,
        row.renewal_end_date,
      );
      if (err) return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateBeforeSubmit()) return;
    onSubmit(
      selectedProducts.map((p) => {
        const row = pricingData[p.id];
        return {
          product_id: p.id,
          selling_price: row.selling_price,
          discount_applicability_id: row.discount_applicability_id ?? null,
          custom_description: row.custom_description || null,
          is_active: row.is_active,
          renewal_start_date: row.renewal_start_date || null,
          renewal_end_date: row.renewal_end_date || null,
          status: row.status || null,
          billing_cycle: row.billing_cycle || null,
          subscriptions: row.subscriptions || 0,
        };
      }),
    );
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 h-[85vh] w-full max-w-7xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Add product pricing
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Select products and set pricing details before creating records.
        </p>

        <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
          <input
            type="search"
            placeholder="Search products…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={formControlClass}
          />
          <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Base price</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-zinc-500">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const added = selectedProducts.some((p) => p.id === product.id);
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-zinc-500">
                            {product.description || "No description"}
                          </p>
                        </td>
                        <td className="px-3 py-2">{String(product.base_price ?? 0)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            disabled={added}
                            onClick={() => addProduct(product)}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-600"
                          >
                            {added ? "Added" : "Add product"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedProducts.length > 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Selected products ({selectedProducts.length})
            </h4>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[88rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 text-xs uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60">
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Selling</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2">Discount</th>
                    <th className="px-2 py-2">Active</th>
                    <th className="px-2 py-2">Period start</th>
                    <th className="px-2 py-2">Period end</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Billing</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((product) => {
                    const row = pricingData[product.id];
                    const vErr = validationErrors[product.id];
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-2 py-2">{product.name}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row?.selling_price ?? 0}
                            onChange={(e) =>
                              patchPricing(
                                product.id,
                                "selling_price",
                                Number.parseFloat(
                                  stripNumericLeadingZerosForControlledInput(
                                    e.target.value,
                                  ),
                                ) || 0,
                              )
                            }
                            className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <textarea
                            rows={2}
                            value={row?.custom_description ?? ""}
                            onChange={(e) =>
                              patchPricing(
                                product.id,
                                "custom_description",
                                e.target.value,
                              )
                            }
                            className="w-48 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            placeholder={product.description ?? "Custom description"}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row?.discount_applicability_id ?? ""}
                            onChange={(e) =>
                              patchPricing(
                                product.id,
                                "discount_applicability_id",
                                e.target.value
                                  ? Number.parseInt(e.target.value, 10)
                                  : undefined,
                              )
                            }
                            className="w-40 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="">No discount</option>
                            {discountOptions.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name ?? `${d.discount_percentage ?? 0}% off`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={row?.is_active ?? true}
                            onChange={(e) =>
                              patchPricing(product.id, "is_active", e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={row?.renewal_start_date ?? ""}
                            onChange={(e) =>
                              patchPricing(
                                product.id,
                                "renewal_start_date",
                                e.target.value || undefined,
                              )
                            }
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div>
                            <input
                              type="date"
                              value={row?.renewal_end_date ?? ""}
                              onChange={(e) =>
                                patchPricing(
                                  product.id,
                                  "renewal_end_date",
                                  e.target.value || undefined,
                                )
                              }
                              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                            />
                            {vErr ? (
                              <p className="mt-1 max-w-[18rem] text-[11px] text-rose-600">
                                {vErr}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row?.status ?? "Active"}
                            onChange={(e) =>
                              patchPricing(product.id, "status", e.target.value)
                            }
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="Active">Active</option>
                            <option value="Trial">Trial</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row?.billing_cycle ?? "one time"}
                            onChange={(e) =>
                              patchPricing(product.id, "billing_cycle", e.target.value)
                            }
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="one time">One time</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            value={row?.subscriptions ?? 0}
                            onChange={(e) =>
                              patchPricing(
                                product.id,
                                "subscriptions",
                                Number.parseInt(
                                  stripNumericLeadingZerosForControlledInput(
                                    e.target.value,
                                  ),
                                  10,
                                ) || 0,
                              )
                            }
                            className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeProduct(product.id)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 dark:border-rose-800"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              busy ||
              selectedProducts.length === 0 ||
              Object.values(validationErrors).some((v) => Boolean(v))
            }
            onClick={handleSubmit}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add subscription pricing"}
          </button>
        </div>
      </div>
    </div>
  );
}

type AddDiscountModalProps = {
  open: boolean;
  onClose: () => void;
  discountType: "percentage" | "amount";
  onDiscountTypeChange: (v: "percentage" | "amount") => void;
  percentage: string;
  onPercentageChange: (v: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  productId: string;
  onProductIdChange: (v: string) => void;
  products: Product[];
  onSubmit: () => void;
  busy: boolean;
};

export function AddDiscountModal({
  open,
  onClose,
  discountType,
  onDiscountTypeChange,
  percentage,
  onPercentageChange,
  amount,
  onAmountChange,
  productId,
  onProductIdChange,
  products,
  onSubmit,
  busy,
}: AddDiscountModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Add discount applicability
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Creates a discount rule linked to a product. Exact fields depend on the
          billing API.
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Product (optional)
        </label>
        <select
          className={`mt-1 ${formControlClass}`}
          value={productId}
          onChange={(e) => onProductIdChange(e.target.value)}
        >
          <option value="">Any / not set</option>
          {products.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Type
        </label>
        <select
          className={`mt-1 ${formControlClass}`}
          value={discountType}
          onChange={(e) =>
            onDiscountTypeChange(
              e.target.value === "amount" ? "amount" : "percentage",
            )
          }
        >
          <option value="percentage">Percentage</option>
          <option value="amount">Fixed amount</option>
        </select>
        {discountType === "percentage" ? (
          <>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Percentage off
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={`mt-1 ${formControlClass}`}
              value={percentage}
              onChange={(e) =>
                onPercentageChange(
                  stripNumericLeadingZerosForControlledInput(e.target.value),
                )
              }
            />
          </>
        ) : (
          <>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Amount off
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={`mt-1 ${formControlClass}`}
              value={amount}
              onChange={(e) =>
                onAmountChange(
                  stripNumericLeadingZerosForControlledInput(e.target.value),
                )
              }
            />
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
