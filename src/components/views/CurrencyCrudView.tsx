"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateUpdateCurrencyModal } from "@/components/currencies/CreateUpdateCurrencyModal";
import { CurrencyListTable } from "@/components/currencies/CurrencyListTable";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { useCurrencyMutations } from "@/hooks/currencies/useCurrencyMutations";
import { useCurrencies } from "@/hooks/currencies/useCurrencies";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import {
  buildCurrencyListSearchParams,
  parseCurrencyListSearchParams,
  type CurrencyListUrlState,
} from "@/lib/currencies/currencyListUrl";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { showAppToast, showBillingBackendErrorToast } from "@/lib/toast/appToast";
import type { Currency, IndexCurrencyParams } from "@/models/Currency";
import { ModuleName } from "@/models/Module";

const LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

export function CurrencyCrudView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listState, setListState] = useState<CurrencyListUrlState>(() =>
    parseCurrencyListSearchParams(searchParams),
  );

  const debouncedSearch = useDebouncedValue(listState.search, 300);

  useEffect(() => {
    const q = buildCurrencyListSearchParams(listState, {
      searchOverride: debouncedSearch,
    });
    const next = q.toString();
    if (next === searchParams.toString()) return;
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
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
  const mod = ModuleName.CURRENCY;
  const allowView = isSuperAdmin || canView(mod);
  const allowCreate = isSuperAdmin || canCreate(mod);
  const allowUpdate = isSuperAdmin || canUpdate(mod);
  const allowDelete = isSuperAdmin || canDelete(mod);

  const listParams = useMemo((): IndexCurrencyParams => {
    return {
      page: listState.page,
      per_page: listState.limit,
      ...(debouncedSearch.trim()
        ? { search: debouncedSearch.trim() }
        : {}),
      sort_field: listState.sort_field,
      sort_direction: listState.sort_direction,
    };
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    debouncedSearch,
  ]);

  const listQuery = useCurrencies(listParams, { enabled: allowView });
  const { pagination } = extractListRows(listQuery.data);
  const mutations = useCurrencyMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [formModalKey, setFormModalKey] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null,
  );
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);

  const bumpFormModalKey = () => setFormModalKey((k) => k + 1);

  const openCreate = () => {
    setSelectedCurrency(null);
    bumpFormModalKey();
    setFormOpen(true);
  };

  const openEdit = (c: Currency) => {
    setSelectedCurrency(c);
    bumpFormModalKey();
    setFormOpen(true);
  };

  async function confirmDelete() {
    if (currencyToDelete == null) return;
    try {
      await mutations.remove.mutateAsync(currencyToDelete.id);
      showAppToast("Currency deleted.", "success");
      setCurrencyToDelete(null);
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

  const deleteItemLabel = currencyToDelete
    ? `${currencyToDelete.code} — ${currencyToDelete.name}`
    : "";

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
        You do not have permission to view currencies.
      </p>
    );
  }

  return (
    <>
      <CollapsibleFilterPanel
        title="List filters — GET /currencies"
        open={showFilters}
        onToggle={() => setShowFilters((v) => !v)}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              placeholder="Search by code or name…"
            />
          </div>
        </div>
      </CollapsibleFilterPanel>

      <CurrencyListTable
        query={listQuery}
        title="Currencies"
        sortField={listState.sort_field}
        sortDir={listState.sort_direction}
        onSort={handleSort}
        pagination={pagination}
        onPageChange={(page) => setListState((s) => ({ ...s, page }))}
        limit={listState.limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(limit) => setListState((s) => ({ ...s, limit, page: 1 }))}
        canCreate={allowCreate}
        canUpdate={allowUpdate}
        canDelete={allowDelete}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={(c) => setCurrencyToDelete(c)}
      />

      <CreateUpdateCurrencyModal
        key={formModalKey}
        open={formOpen}
        currency={selectedCurrency}
        onClose={() => {
          setFormOpen(false);
          setSelectedCurrency(null);
        }}
        onSuccess={() => {
          setFormOpen(false);
          setSelectedCurrency(null);
        }}
      />

      <DeleteConfirmationDialog
        show={currencyToDelete != null}
        title="Delete currency?"
        message="This cannot be undone. The API may reject the delete if the currency is in use."
        itemName={deleteItemLabel}
        onConfirm={confirmDelete}
        onHide={() => setCurrencyToDelete(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}
