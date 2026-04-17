"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreateUpdateCompanyModal } from "@/components/company/CreateUpdateCompanyModal";
import { CompanyImportModal } from "@/components/company/CompanyImportModal";
import { CompanyListTable } from "@/components/company/CompanyListTable";
import { DeleteConfirmationDialog } from "@/components/crud/DeleteConfirmationDialog";
import { ViewCompanyModal } from "@/components/company/ViewCompanyModal";
import { CollapsibleFilterPanel } from "@/components/crud/ListUiControls";
import { TenantSearchableDropdown } from "@/components/ui/TenantSearchableDropdown";
import { useCompanyMutations } from "@/hooks/company/useCompanyMutations";
import { useCompanies } from "@/hooks/company/useCompanies";
import { usePermissions } from "@/hooks/permissions/usePermissions";
import { useVendors } from "@/hooks/vendors/useVendors";
import { extractListRows } from "@/lib/api/extractApiData";
import { formControlClass, formLabelClass } from "@/lib/uiFormClasses";
import { resolveDeleteItemLabel } from "@/lib/crud/resolveDeleteItemLabel";
import { downloadCompanyImportTemplate } from "@/lib/company/downloadCompanyImportTemplate";
import {
  buildCompanyListSearchParams,
  parseCompanyListSearchParams,
  type CompanyListUrlState,
} from "@/lib/company/companyListUrl";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { companyProductPricingPath } from "@/lib/navigation/appPaths";
import {
  showAppToast,
  showBillingBackendErrorToast,
} from "@/lib/toast/appToast";
import type { Company, IndexCompanyParams } from "@/models/Company";
import { ModuleName } from "@/models/Module";

const LIMIT_OPTIONS = [10, 20, 25, 50, 100] as const;

function rowKey(c: Company): string | number | null {
  if (c.id != null) return c.id;
  const t = c.tenant_id;
  if (t != null && String(t).trim() !== "") return String(t).trim();
  return null;
}

function productPricingUrl(tenantOrId: string | number): string {
  if (typeof window === "undefined") return "#";
  return `${window.location.origin}${companyProductPricingPath(String(tenantOrId))}`;
}

export function CompanyCrudView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listState, setListState] = useState<CompanyListUrlState>(() =>
    parseCompanyListSearchParams(searchParams),
  );

  const debouncedSearch = useDebouncedValue(listState.search, 300);

  useEffect(() => {
    const q = buildCompanyListSearchParams(listState, {
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
    listState.vendor_id,
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
  const mod = ModuleName.COMPANY;
  const allowView = isSuperAdmin || canView(mod);
  const allowCreate = isSuperAdmin || canCreate(mod);
  const allowUpdate = isSuperAdmin || canUpdate(mod);
  const allowDelete = isSuperAdmin || canDelete(mod);

  const listParams = useMemo((): IndexCompanyParams => {
    const vendorRaw = listState.vendor_id.trim();
    const vendorNum = vendorRaw ? Number.parseInt(vendorRaw, 10) : NaN;
    return {
      page: listState.page,
      limit: listState.limit,
      load_profile: true,
      load_outstanding_amount: true,
      "order[column]": listState.sort_field,
      "order[dir]": listState.sort_direction,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(listState.tenant_id.trim()
        ? { tenant_id: listState.tenant_id.trim() }
        : {}),
      ...(Number.isFinite(vendorNum) ? { vendor_id: vendorNum } : {}),
    };
  }, [
    listState.page,
    listState.limit,
    listState.sort_field,
    listState.sort_direction,
    listState.tenant_id,
    listState.vendor_id,
    debouncedSearch,
  ]);

  const listQuery = useCompanies(listParams, { enabled: allowView });
  const { pagination } = extractListRows(listQuery.data);

  const vendorsForPicker = useVendors(
    {
      limit: 500,
      "order[column]": "name",
      "order[dir]": "asc",
    },
    { enabled: allowView },
  );
  const vendorRows = extractListRows(vendorsForPicker.data).rows as {
    id: number;
    name: string;
  }[];

  const mutations = useCompanyMutations();
  const [detailKey, setDetailKey] = useState<number | string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const deleteItemLabel = useMemo(
    () =>
      resolveDeleteItemLabel(listQuery.data, deleteId, {
        labelKeys: ["name", "tenant_id", "email"],
      }),
    [listQuery.data, deleteId],
  );

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await mutations.remove.mutateAsync(deleteId);
      showAppToast("Company deleted.", "success");
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

  async function handleDownloadTemplate() {
    setTemplateLoading(true);
    try {
      await downloadCompanyImportTemplate();
      showAppToast("Template downloaded.", "success");
    } catch (err) {
      showBillingBackendErrorToast(err);
      const headers = [
        "name",
        "email",
        "phone",
        "address",
        "payment_mode",
        "payment_terms",
        "credit_limit",
        "discount_type",
        "discount_limit",
        "early_payment_discount",
        "late_fee_rule",
        "currency",
        "vat_rate",
        "vat_exemption",
        "tax_id",
        "vendor_name",
      ];
      const csvContent =
        `${headers.join(",")}\n` +
        "Company Name,company@example.com,+1234567890,123 Main St,one_time,30,10000.00,flat_percentage,15.00,2.00,5.00,USD,20.00,false,TAX123456,Vendor Name";
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "company_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
      showAppToast("Used local fallback template.", "info");
    } finally {
      setTemplateLoading(false);
    }
  }

  async function handleImportFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    await mutations.importCsv.mutateAsync(fd);
    showAppToast("Import completed.", "success");
  }

  function openProductPricing(c: Company) {
    const key = c.tenant_id ?? c.id;
    if (key == null || key === "") {
      showAppToast("No tenant or id for pricing link.", "warning");
      return;
    }
    window.open(productPricingUrl(key), "_blank", "noopener,noreferrer");
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
        You do not have permission to view companies.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Tenants
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadTemplate()}
            disabled={templateLoading}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {templateLoading ? "Template…" : "Template"}
          </button>
        </div>
      </div>

      <CollapsibleFilterPanel
        title="List filters — GET /company"
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
              placeholder="Search email or phone…"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              Filter by tenant
            </label>
            <TenantSearchableDropdown
              className="w-full"
              value={listState.tenant_id || null}
              onChange={(tenantId) =>
                setListState((s) => ({
                  ...s,
                  tenant_id: tenantId ?? "",
                  page: 1,
                }))
              }
              placeholder="All tenants"
              fetchParams={
                listState.vendor_id.trim()
                  ? { vendor_id: Number.parseInt(listState.vendor_id.trim(), 10) }
                  : undefined
              }
              enabled={allowView}
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
        </div>
      </CollapsibleFilterPanel>

      <CompanyListTable
        query={listQuery}
        title="Companies"
        sortField={listState.sort_field}
        sortDir={listState.sort_direction}
        onSort={handleSort}
        pagination={pagination}
        onPageChange={(page) => setListState((s) => ({ ...s, page }))}
        limit={listState.limit}
        limitOptions={LIMIT_OPTIONS}
        onLimitChange={(limit) =>
          setListState((s) => ({ ...s, limit, page: 1 }))
        }
        canView={allowView}
        canCreate={allowCreate}
        canUpdate={allowUpdate}
        canDelete={allowDelete}
        onCreate={openCreate}
        onView={(c) => {
          const k = rowKey(c);
          if (k != null) setDetailKey(k);
        }}
        onEdit={(c) => {
          const k = rowKey(c);
          if (k == null) {
            showAppToast("Row has no id or tenant_id to edit.", "warning");
            return;
          }
          setEditId(k);
          setFormOpen(true);
        }}
        onDelete={(c) => {
          const k = rowKey(c);
          if (k == null) {
            showAppToast("Row has no id or tenant_id to delete.", "warning");
            return;
          }
          setDeleteId(k);
        }}
        onProductPricing={openProductPricing}
      />

      <CompanyImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        isPending={mutations.importCsv.isPending}
        onImport={handleImportFile}
      />

      <ViewCompanyModal
        show={detailKey != null}
        onHide={() => setDetailKey(null)}
        companyId={detailKey}
        onEdit={
          allowUpdate
            ? (company) => {
                const k = rowKey(company);
                if (k == null) {
                  showAppToast(
                    "Row has no id or tenant_id to edit.",
                    "warning",
                  );
                  return;
                }
                setEditId(k);
                setFormOpen(true);
              }
            : undefined
        }
      />

      <CreateUpdateCompanyModal
        open={formOpen}
        companyId={editId}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
      />

      <DeleteConfirmationDialog
        show={deleteId != null && deleteId !== ""}
        title="Delete company?"
        message="Deletes via DELETE /company/delete/{id}. This may fail if dependencies exist."
        itemName={deleteItemLabel}
        onConfirm={confirmDelete}
        onHide={() => setDeleteId(null)}
        isDeleting={mutations.remove.isPending}
      />
    </>
  );
}
