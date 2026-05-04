"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { CreateUpdateVendorModal } from "@/components/vendors/CreateUpdateVendorModal";
import { VendorListTable } from "@/components/vendors/VendorListTable";
import { ViewVendorModal } from "@/components/vendors/ViewVendorModal";
import { useVendorMutations } from "@/hooks/vendors/useVendorMutations";
import { useVendors } from "@/hooks/vendors/useVendors";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  buildVendorListSearchParams,
  parseVendorListSearchParams,
  type VendorListUrlState,
} from "@/lib/vendors/vendorListUrl";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import { showAppToast, showBillingBackendErrorToast } from "@/lib/toast/appToast";
import type { IndexVendorParams, Vendor } from "@/models/Vendor";
import { ModuleName } from "@/models/Module";

const LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

export function VendorCrudView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listState, setListState] = useState<VendorListUrlState>(() =>
    parseVendorListSearchParams(searchParams),
  );

  const debouncedSearch = useDebouncedValue(listState.search, 300);

  useEffect(() => {
    const q = buildVendorListSearchParams(
      {
        page: listState.page,
        limit: listState.limit,
        search: debouncedSearch,
        sort_field: listState.sort_field,
        sort_direction: listState.sort_direction,
        filter_email: listState.filter_email,
        filter_phone: listState.filter_phone,
      },
      { searchOverride: debouncedSearch },
    );
    const next = q.toString();
    if (next === searchParams.toString()) return;
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    listState.filter_email,
    listState.filter_phone,
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
  const mod = ModuleName.VENDOR;
  const allowView = isSuperAdmin || canView(mod);
  const allowCreate = isSuperAdmin || canCreate(mod);
  const allowUpdate = isSuperAdmin || canUpdate(mod);
  const allowDelete = isSuperAdmin || canDelete(mod);

  const listParams = useMemo((): IndexVendorParams => {
    return {
      page: listState.page,
      limit: listState.limit,
      load_resellers: true,
      "order[column]": listState.sort_field,
      "order[dir]": listState.sort_direction,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(listState.filter_email.trim()
        ? { email: listState.filter_email.trim() }
        : {}),
      ...(listState.filter_phone.trim()
        ? { phone: listState.filter_phone.trim() }
        : {}),
    };
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    listState.filter_email,
    listState.filter_phone,
    debouncedSearch,
  ]);

  const listQuery = useVendors(listParams, { enabled: allowView });
  const { pagination } = extractListRows(listQuery.data);
  const mutations = useVendorMutations();
  const [detailId, setDetailId] = useState<number | string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  /** Remounts create/update modal so create mode starts clean without setState-in-effect. */
  const [formModalKey, setFormModalKey] = useState(0);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const deleteItemLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteId, {
        labelKeys: ["name", "email"],
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
      showAppToast("Vendor deleted.", "success");
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
        You do not have permission to view vendors.
      </p>
    );
  }

  return (
    <>
      <CollapsibleFilterPanel
        title="List filters — GET /vendors"
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
              placeholder="Search by vendor name…"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Email (exact)
            </label>
            <input
              type="text"
              className={formControlClass}
              value={listState.filter_email}
              onChange={(e) =>
                setListState((s) => ({
                  ...s,
                  filter_email: e.target.value,
                  page: 1,
                }))
              }
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Phone (exact)
            </label>
            <input
              type="text"
              className={formControlClass}
              value={listState.filter_phone}
              onChange={(e) =>
                setListState((s) => ({
                  ...s,
                  filter_phone: e.target.value,
                  page: 1,
                }))
              }
            />
          </div>
        </div>
      </CollapsibleFilterPanel>

      <VendorListTable
        query={listQuery}
        title="Vendors"
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
        onView={(id) => setDetailId(id)}
        onEdit={(id) => {
          setEditId(id);
          bumpFormModalKey();
          setFormOpen(true);
        }}
        onDelete={(id) => setDeleteId(id)}
      />

      <ViewVendorModal
        show={detailId != null}
        vendorId={detailId}
        onHide={() => setDetailId(null)}
        onEdit={
          allowUpdate
            ? (v: Vendor) => {
                setDetailId(null);
                setEditId(v.id);
                bumpFormModalKey();
                setFormOpen(true);
              }
            : undefined
        }
      />

      <CreateUpdateVendorModal
        key={formModalKey}
        open={formOpen}
        vendorId={editId}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
        onSuccess={() => {
          setFormOpen(false);
          setEditId(null);
        }}
      />

      <DeleteConfirmationDialog
        show={deleteId != null}
        title="Delete vendor?"
        message="This cannot be undone. The API may reject the delete if the vendor is in use."
        itemName={deleteItemLabel}
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}
