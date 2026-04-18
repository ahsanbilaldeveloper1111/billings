"use client";

import { useProduct } from "@/hooks/products/useProduct";
import { ProductDetailField } from "./ProductDetailField";
import { getApiData } from "@/lib/api/extractApiData";
import { formatCurrency, formatNumber } from "@/lib/currency";
import {
  formatProductDetailDateTime,
  formatProductDetailShortDate,
  pickProductShowDiscounts,
  pickProductShowPricings,
  productCategoryLine,
  productPricingCompanyCell,
} from "@/lib/products/viewProductDisplay";
import {
  logoDisplaySrc,
  logoPreviewSource,
} from "@/lib/logoDisplaySrc";
import type { Product } from "@/models/Product";

export type ViewProductModalProps = {
  show: boolean;
  onHide: () => void;
  productId?: number | string | null;
  product?: Product | null;
  onEdit?: (product: Product) => void;
};

export function ViewProductModal({
  show,
  onHide,
  productId,
  product: productProp,
  onEdit,
}: ViewProductModalProps) {
  const id = productId ?? productProp?.id ?? null;
  const q = useProduct(show && id != null ? id : null);
  const fromApi = getApiData(q.data) as
    | (Product & Record<string, unknown>)
    | undefined;
  const fallback = productProp
    ? (productProp as Product & Record<string, unknown>)
    : undefined;
  const p = fromApi ?? fallback;
  const cur =
    typeof p?.currency === "string" && p.currency.trim()
      ? p.currency
      : "USD";

  const pricings = p ? pickProductShowPricings(p) : [];
  const discounts = p ? pickProductShowDiscounts(p) : [];
  const typeService = Boolean(p?.is_service);

  const logoImgSrc = p
    ? logoDisplaySrc(logoPreviewSource(undefined, p.logo_url)) ?? null
    : null;

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close"
        onClick={onHide}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200/70 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Product Details
            </h2>
            <div className="flex gap-2">
              {onEdit && p ? (
                <button
                  type="button"
                  onClick={() => {
                    onHide();
                    onEdit(p);
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={onHide}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {q.isPending && !p ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : q.isError && !p ? (
            <p className="text-sm text-rose-600">{String(q.error)}</p>
          ) : p ? (
            <>
              {q.isError && p ? (
                <p
                  className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                  role="status"
                >
                  Could not refresh full product details ({String(q.error)}).
                  Showing the last known row data.
                </p>
              ) : null}
              {q.isPending && p ? (
                <p className="mb-4 text-sm text-zinc-500">Refreshing details…</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <ProductDetailField label="Product Name">
                  {p.name ?? "—"}
                </ProductDetailField>
                <ProductDetailField label="SKU">
                  {p.sku?.trim() ? String(p.sku) : "—"}
                </ProductDetailField>
                <ProductDetailField label="Category">
                  {productCategoryLine(p)}
                </ProductDetailField>
                <div className="mb-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Type
                  </p>
                  <span
                    className={
                      typeService
                        ? "inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
                        : "inline-flex rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                    }
                  >
                    {typeService ? "Service" : "Product"}
                  </span>
                </div>
                <ProductDetailField label="Base Price" className="sm:col-span-2">
                  <span className="font-semibold">
                    {formatCurrency(p.base_price, cur)}
                  </span>
                </ProductDetailField>
                {logoImgSrc ? (
                  <ProductDetailField label="Logo" className="sm:col-span-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoImgSrc}
                      alt=""
                      className="max-h-28 max-w-full rounded-lg border border-zinc-200/80 bg-white object-contain p-2 dark:border-zinc-700 dark:bg-zinc-900/40"
                    />
                  </ProductDetailField>
                ) : null}
              </div>

              {p.description ? (
                <ProductDetailField label="Description">
                  <span className="font-normal">{String(p.description)}</span>
                </ProductDetailField>
              ) : null}

              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <ProductDetailField label="Created At">
                  {formatProductDetailShortDate(p.created_at)}
                </ProductDetailField>
                <ProductDetailField label="Last Updated">
                  {formatProductDetailShortDate(p.updated_at)}
                </ProductDetailField>
              </div>

              {pricings.length > 0 ? (
                <section className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Company Pricing
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/50">
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Company
                          </th>
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Selling Price
                          </th>
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Valid From
                          </th>
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Valid Until
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricings.map((row) => (
                          <tr
                            key={row.id ?? `${row.selling_price}-${row.valid_from}`}
                            className="border-b border-zinc-100 dark:border-zinc-800"
                          >
                            <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                              {productPricingCompanyCell(row)}
                            </td>
                            <td className="px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200">
                              {formatCurrency(
                                row.selling_price,
                                row.currency_code?.trim()
                                  ? row.currency_code
                                  : cur,
                              )}
                            </td>
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                              {formatProductDetailShortDate(row.valid_from)}
                            </td>
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                              {row.valid_to
                                ? formatProductDetailDateTime(row.valid_to)
                                : "No expiry"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {discounts.length > 0 ? (
                <section className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    Discount Applicability
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/50">
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Customer
                          </th>
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Applicable
                          </th>
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Discount %
                          </th>
                          <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                            Discount amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {discounts.map((row) => (
                          <tr
                            key={row.id ?? `${row.customer?.name}-${row.discount_percentage}`}
                            className="border-b border-zinc-100 dark:border-zinc-800"
                          >
                            <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                              {row.customer?.name?.trim()
                                ? String(row.customer.name)
                                : "N/A"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={
                                  row.is_applicable
                                    ? "inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                                    : "inline-flex rounded-md bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200"
                                }
                              >
                                {row.is_applicable ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200">
                              {formatNumber(row.discount_percentage ?? 0, 2)}%
                            </td>
                            <td className="px-3 py-2 font-mono text-zinc-800 dark:text-zinc-200">
                              {formatNumber(row.discount_amount ?? 0, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-zinc-500">No data.</p>
          )}
        </div>
      </div>
    </div>
  );
}
