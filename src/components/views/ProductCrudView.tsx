"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateUpdateProductModal } from "@/components/products/CreateUpdateProductModal";
import { ProductCategoryManagementModal } from "@/components/product-categories";
import { ProductListTable } from "@/components/products/ProductListTable";
import { ViewProductModal } from "@/components/products/ViewProductModal";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useProductCategories } from "@/hooks/product-categories/useProductCategories";
import { useProductMutations } from "@/hooks/products/useProductMutations";
import { useProducts } from "@/hooks/products/useProducts";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import {
  buildProductListSearchParams,
  parseProductListSearchParams,
  type ProductListUrlState,
} from "@/lib/products/productListUrl";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { IndexProductParams, Product } from "@/models/Product";
import { ModuleName } from "@/models/Module";

const LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

export function ProductCrudView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listState, setListState] = useState<ProductListUrlState>(() =>
    parseProductListSearchParams(searchParams),
  );

  const debouncedSearch = useDebouncedValue(listState.search, 300);

  useEffect(() => {
    const q = buildProductListSearchParams(listState, {
      searchOverride: debouncedSearch,
    });
    const next = q.toString();
    if (next === searchParams.toString()) return;
    router.replace(`${pathname}?${next}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced search; omit listState.search
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    listState.category_id,
    debouncedSearch,
    pathname,
    router,
    searchParams,
  ]);

  const {
    canView,
    canCreate,
    canUpdate,
    canDelete,
    isSuperAdmin,
    isUserLoading,
  } = usePermissions();
  const mod = ModuleName.PRODUCT;
  const catMod = ModuleName.PRODUCT_CATEGORY;
  const allowView = isSuperAdmin || canView(mod);
  const allowCreate = isSuperAdmin || canCreate(mod);
  const allowUpdate = isSuperAdmin || canUpdate(mod);
  const allowDelete = isSuperAdmin || canDelete(mod);
  const allowCategoryUi =
    isSuperAdmin ||
    canView(catMod) ||
    canCreate(catMod) ||
    canUpdate(catMod) ||
    canDelete(catMod);

  const listParams = useMemo((): IndexProductParams => {
    return {
      page: listState.page,
      limit: listState.limit,
      "order[column]": listState.sort_field,
      "order[dir]": listState.sort_direction,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(listState.category_id != null
        ? { category_id: listState.category_id }
        : {}),
    };
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    listState.category_id,
    debouncedSearch,
  ]);

  const listQuery = useProducts(listParams, { enabled: allowView });
  const categoriesForFilter = useProductCategories(
    { limit: 500 },
    { enabled: allowView },
  );
  const { rows: categoryOptions } = extractListRows<{ id: number; name?: string }>(
    categoriesForFilter.data,
  );
  const { pagination } = extractListRows(listQuery.data);
  const mutations = useProductMutations();

  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formModalKey, setFormModalKey] = useState(0);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const deleteItemLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteId, {
        labelKeys: ["name", "sku"],
      }),
    [listQuery.data, deleteId],
  );

  const bumpFormModalKey = () => setFormModalKey((k) => k + 1);

  const openCreate = () => {
    setEditId(null);
    bumpFormModalKey();
    setFormOpen(true);
  };

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      showAppToast("Product deleted.", "success");
      setDeleteId(null);
    } catch (err) {
      showBillingBackendErrorToast(err);
    }
  }

  function handleSort(field: string) {
    setListState((s) => {
      if (s.sort_field === field) {
        return {
          ...s,
          sort_direction: s.sort_direction === "asc" ? "desc" : "asc",
          page: 1,
        };
      }
      return {
        ...s,
        sort_field: field,
        sort_direction: "asc",
        page: 1,
      };
    });
  }

  if (isUserLoading) {
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60" />
    );
  }

  if (!allowView) {
    return (
      <p
        className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="status"
      >
        You do not have permission to view products.
      </p>
    );
  }

  return (
    <>
      <CollapsibleFilterPanel
        title="List filters — GET /products"
        open={showFilters}
        onToggle={() => setShowFilters((v) => !v)}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>
              Search
            </label>
            <input
              type="search"
              className={formControlClass}
              value={listState.search}
              onChange={(e) =>
                setListState((s) => ({
                  ...s,
                  search: e.target.value,
                  page: 1,
                }))
              }
              placeholder="Search by name or SKU…"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Category
            </label>
            <select
              className={formControlClass}
              value={listState.category_id ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setListState((s) => ({
                  ...s,
                  category_id: v === "" ? null : Number(v),
                  page: 1,
                }));
              }}
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? `Category ${c.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CollapsibleFilterPanel>

      <ProductListTable
        query={listQuery}
        title="Products"
        sortField={listState.sort_field}
        sortDir={listState.sort_direction}
        onSort={handleSort}
        pagination={pagination}
        onPageChange={(page) => setListState((s) => ({ ...s, page }))}
        limit={listState.limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(limit) => setListState((s) => ({ ...s, limit, page: 1 }))}
        canView={allowView}
        canCreate={allowCreate}
        canUpdate={allowUpdate}
        canDelete={allowDelete}
        onCreate={openCreate}
        showManageCategories={allowCategoryUi}
        onManageCategories={
          allowCategoryUi
            ? () => setCategoryModalOpen(true)
            : undefined
        }
        onView={(row) => {
          setDetailId(row.id);
          setViewProduct(row as Product);
        }}
        onEdit={(id) => {
          setEditId(id);
          bumpFormModalKey();
          setFormOpen(true);
        }}
        onDelete={(id) => setDeleteId(id)}
      />

      <ViewProductModal
        show={detailId != null}
        productId={detailId}
        product={viewProduct}
        onHide={() => {
          setDetailId(null);
          setViewProduct(null);
        }}
        onEdit={
          allowUpdate
            ? (p: Product) => {
                setDetailId(null);
                setViewProduct(null);
                setEditId(p.id);
                bumpFormModalKey();
                setFormOpen(true);
              }
            : undefined
        }
      />

      <CreateUpdateProductModal
        key={formModalKey}
        open={formOpen}
        productId={editId}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
        onSuccess={() => {
          setFormOpen(false);
          setEditId(null);
        }}
      />

      <ProductCategoryManagementModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />

      <DeleteConfirmationDialog
        show={deleteId != null}
        title="Delete product?"
        message="This cannot be undone. The API may reject the delete if the product is in use."
        itemName={deleteItemLabel}
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}
