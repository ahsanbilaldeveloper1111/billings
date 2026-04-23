const LIMITS = new Set([10, 20, 25, 50, 100]);

const SORT_FIELDS = new Set([
  "name",
  "description",
  "created_at",
  "updated_at",
]);

function normalizeSortField(raw: string): string {
  const t = raw.trim() || "name";
  return SORT_FIELDS.has(t) ? t : "name";
}

export type ProductCategoryListUrlState = {
  page: number;
  limit: number;
  search: string;
  sort_field: string;
  sort_direction: "asc" | "desc";
  /** Vendor for tenant dropdown (same pattern as invoices / customers). */
  vendor_id: string;
  /** When set, list is scoped to this billing `tenant_id`; when empty, all categories. */
  tenant_id: string;
};

export function defaultProductCategoryListUrlState(): ProductCategoryListUrlState {
  return {
    page: 1,
    limit: 10,
    search: "",
    sort_field: "name",
    sort_direction: "asc",
    vendor_id: "",
    tenant_id: "",
  };
}

function parseLimit(raw: string | null): number {
  const n = Number(raw);
  return LIMITS.has(n) ? n : 10;
}

export function parseProductCategoryListSearchParams(
  sp: URLSearchParams,
): ProductCategoryListUrlState {
  const dirRaw = sp.get("sort_direction");
  const sort_direction: "asc" | "desc" =
    dirRaw === "desc" ? "desc" : "asc";
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: parseLimit(sp.get("per_page")),
    search: sp.get("search") ?? "",
    sort_field: normalizeSortField(sp.get("sort_field") ?? ""),
    sort_direction,
    vendor_id: sp.get("vendor_id") ?? "",
    tenant_id: sp.get("tenant_id") ?? "",
  };
}

export function buildProductCategoryListSearchParams(
  s: ProductCategoryListUrlState,
  opts?: { searchOverride?: string },
): URLSearchParams {
  const q = new URLSearchParams();
  const search = opts?.searchOverride ?? s.search;
  if (search.trim()) q.set("search", search.trim());
  if (s.page > 1) q.set("page", String(s.page));
  if (s.limit !== 10) q.set("per_page", String(s.limit));
  if (s.sort_field !== "name") q.set("sort_field", s.sort_field);
  if (s.sort_direction !== "asc") q.set("sort_direction", s.sort_direction);
  if (s.vendor_id.trim()) q.set("vendor_id", s.vendor_id.trim());
  if (s.tenant_id.trim()) q.set("tenant_id", s.tenant_id.trim());
  return q;
}
