"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateUpdateCustomerModal } from "@/components/customers/CreateUpdateCustomerModal";
import { CustomerListTable } from "@/components/customers/CustomerListTable";
import { ViewCustomerModal } from "@/components/customers/ViewCustomerModal";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { CrmCustomerSearchableDropdown } from "@/components/ui/CrmCustomerSearchableDropdown";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { useTenantDisplayNameMap } from "@/hooks/company/useTenantDisplayNameMap";
import { useCrmCompanyNameMap } from "@/hooks/crm/useCrmCompanyNameMap";
import { useCustomerMutations } from "@/hooks/customers/useCustomerMutations";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useVendors } from "@/hooks/vendors/useVendors";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import { customerApiResourceKey } from "@/lib/customers/customerApiResourceKey";
import {
  buildCustomerListSearchParams,
  parseCustomerListSearchParams,
  type CustomerListUrlState,
} from "@/lib/customers/customerListUrl";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { appPaths, customerProductPricingPath } from "@/lib/navigation/appPaths";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Customer, IndexCustomerParams } from "@/models/Customer";

const LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

function productPricingUrl(customerKey: string | number): string {
  if (typeof window === "undefined") return "#";
  return `${window.location.origin}${customerProductPricingPath(String(customerKey))}`;
}

export function CustomerCrudView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listState, setListState] = useState<CustomerListUrlState>(() =>
    parseCustomerListSearchParams(searchParams),
  );

  const debouncedSearch = useDebouncedValue(listState.search, 300);

  useEffect(() => {
    const q = buildCustomerListSearchParams(listState, {
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
    listState.tenant_id,
    listState.crm_company_id,
    listState.vendor_id,
    debouncedSearch,
    pathname,
    router,
    searchParams,
  ]);

  const { isSuperAdmin, isUserLoading } = usePermissions();

  useEffect(() => {
    if (isUserLoading || isSuperAdmin) return;
    router.replace(appPaths.invoices, { scroll: false });
  }, [isUserLoading, isSuperAdmin, router]);

  const tenantNameMap = useTenantDisplayNameMap();
  const crmCompanyNameMap = useCrmCompanyNameMap();

  const listParams = useMemo((): IndexCustomerParams => {
    const vendorRaw = listState.vendor_id.trim();
    const vendorNum = vendorRaw ? Number.parseInt(vendorRaw, 10) : NaN;
    return {
      page: listState.page,
      limit: listState.limit,
      load_profile: true,
      load_invoices_count: true,
      "order[column]": listState.sort_field,
      "order[dir]": listState.sort_direction,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(listState.tenant_id.trim()
        ? { tenant_id: listState.tenant_id.trim() }
        : {}),
      ...(listState.crm_company_id.trim()
        ? { crm_company_id: listState.crm_company_id.trim() }
        : {}),
      ...(Number.isFinite(vendorNum) ? { vendor_id: vendorNum } : {}),
    };
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    listState.tenant_id,
    listState.crm_company_id,
    listState.vendor_id,
    debouncedSearch,
  ]);

  const listQuery = useCustomers(listParams, {
    enabled: isSuperAdmin && !isUserLoading,
  });
  const { pagination } = extractListRows(listQuery.data);

  const vendorsForPicker = useVendors(
    {
      limit: 500,
      "order[column]": "name",
      "order[dir]": "asc",
    },
    { enabled: isSuperAdmin && !isUserLoading },
  );
  const vendorRows = extractListRows(vendorsForPicker.data).rows as {
    id: number;
    name: string;
  }[];

  const mutations = useCustomerMutations();
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const deleteItemLabel = useMemo(() => {
    if (deleteId == null) return undefined;
    const { rows } = extractListRows<Customer & Record<string, unknown>>(
      listQuery.data,
    );
    const row = rows.find((r) => {
      const crm = r.crm_company_id;
      const id = r.id;
      return (
        (crm != null && String(crm) === String(deleteId)) ||
        String(id) === String(deleteId)
      );
    });
    if (!row) return undefined;
    const n = row.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    const e = row.email;
    if (typeof e === "string" && e.trim()) return e.trim();
    const c = row.crm_company_id;
    if (c != null && String(c).trim()) return String(c).trim();
    return undefined;
  }, [listQuery.data, deleteId]);

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      showAppToast("Customer deleted.", "success");
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

  function openProductPricing(c: Customer) {
    const key = customerApiResourceKey(c);
    if (key == null || key === "") {
      showAppToast("No customer id for pricing link.", "warning");
      return;
    }
    window.open(productPricingUrl(key), "_blank", "noopener,noreferrer");
  }

  if (isUserLoading) {
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60" />
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Customers
        </h2>
      </div>

      <CollapsibleFilterPanel
        title="List filters — GET /customers"
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
              placeholder="Search by name, email, phone…"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Filter by vendor
            </label>
            <select
              className={formControlClass}
              value={listState.vendor_id}
              onChange={(e) => {
                const v = e.target.value;
                setListState((s) => ({
                  ...s,
                  vendor_id: v,
                  tenant_id: v ? "" : s.tenant_id,
                  crm_company_id: v ? "" : s.crm_company_id,
                  page: 1,
                }));
              }}
            >
              <option value="">All vendors</option>
              {vendorRows.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>
              Tenant
            </label>
            <TenantSearchableDropdown
              className="w-full"
              value={listState.tenant_id}
              fetchParams={
                Number.isFinite(
                  listState.vendor_id.trim()
                    ? Number.parseInt(listState.vendor_id, 10)
                    : NaN,
                )
                  ? { vendor_id: Number.parseInt(listState.vendor_id, 10) }
                  : undefined
              }
              onChange={(tid) => {
                setListState((s) => ({
                  ...s,
                  tenant_id: tid ?? "",
                  crm_company_id: "",
                  page: 1,
                }));
              }}
              placeholder="All tenants"
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Narrow the tenant list by selecting a vendor first.
            </p>
          </div>
          <div>
            <label className={formLabelClass}>
              Customer
            </label>
            <CrmCustomerSearchableDropdown
              className="w-full"
              tenantId={listState.tenant_id}
              disabled={!listState.tenant_id.trim()}
              value={listState.crm_company_id}
              onChange={(crmCompanyId) =>
                setListState((s) => ({
                  ...s,
                  crm_company_id: crmCompanyId ?? "",
                  page: 1,
                }))
              }
              placeholder={
                listState.tenant_id.trim()
                  ? "All customers"
                  : "Select tenant first…"
              }
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Choose a tenant first to filter by CRM customer.
            </p>
          </div>
        </div>
      </CollapsibleFilterPanel>

      <CustomerListTable
        query={listQuery}
        title="Customers"
        sortField={listState.sort_field}
        sortDir={listState.sort_direction}
        onSort={handleSort}
        pagination={pagination}
        onPageChange={(page) => setListState((s) => ({ ...s, page }))}
        limit={listState.limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(limit) => setListState((s) => ({ ...s, limit, page: 1 }))}
        tenantNameMap={tenantNameMap}
        crmCompanyNameMap={crmCompanyNameMap}
        canView
        canCreate
        canUpdate
        canDelete
        onCreate={openCreate}
        onView={(c) =>
          setViewCustomerId(String(customerApiResourceKey(c)))
        }
        onEdit={(c) => {
          setEditId(customerApiResourceKey(c));
          setFormOpen(true);
        }}
        onDelete={(c) => setDeleteId(customerApiResourceKey(c))}
        onProductPricing={openProductPricing}
      />

      <ViewCustomerModal
        show={viewCustomerId != null}
        onHide={() => setViewCustomerId(null)}
        customerId={viewCustomerId}
        onEdit={(customer) => {
          setEditId(customerApiResourceKey(customer));
          setFormOpen(true);
        }}
      />

      <CreateUpdateCustomerModal
        open={formOpen}
        customerId={editId}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
        onSuccess={() => {
          void listQuery.refetch();
        }}
      />

      <DeleteConfirmationDialog
        show={deleteId != null && String(deleteId) !== ""}
        title="Delete customer?"
        message="Deletes via DELETE /customers/{customer}. This may fail if invoices or other records reference this customer."
        itemName={deleteItemLabel}
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}
