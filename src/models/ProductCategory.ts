/**
 * `GET/POST /api/backend/product-categories` — list rows and form payloads.
 */
export interface ProductCategory {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
  tenant_id?: string | null;
  parent_id?: number | null;
  parent?: { id?: number; name?: string } | null;
  created_at?: string;
  updated_at?: string;
}

/** `GET /api/backend/product-categories` — filters + `order[column]` / `order[dir]`. */
export interface IndexProductCategoryParams {
  tenant_id?: string | null;
  vendor_id?: number;
  page?: number;
  limit?: number;
  search?: string;
  "order[column]"?: string;
  "order[dir]"?: "asc" | "desc";
}
