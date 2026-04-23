"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useCompanies } from "@/hooks/company/useCompanies";
import { useMainAppResellerNameMap } from "@/hooks/resellers/useMainAppResellerNameMap";
import { extractListRows } from "@/lib/api/extractApiData";
import { formatTenantListLabel } from "@/lib/company/tenantDisplayLabel";
import type { Company, IndexCompanyParams } from "@/models/Company";

export type TenantSearchableDropdownProps = {
  value: string | null | undefined;
  onChange: (tenantId: string | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  isClearable?: boolean;
  fetchParams?: Partial<IndexCompanyParams>;
  enabled?: boolean;
};

/**
 * Searchable tenant selector built from company list + main-app reseller names.
 */
export function TenantSearchableDropdown({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "Select a tenant…",
  isClearable = true,
  fetchParams,
  enabled = true,
}: TenantSearchableDropdownProps) {
  const companiesQuery = useCompanies(
    { page: 1, limit: 2000, ...(fetchParams ?? {}) } as IndexCompanyParams,
    { enabled },
  );
  const resellerNameMap = useMainAppResellerNameMap();

  const options = useMemo(() => {
    const { rows } = extractListRows<Company & Record<string, unknown>>(
      companiesQuery.data,
    );
    const seen = new Set<string>();
    const list: Array<{ value: string; label: string }> = [];

    for (const co of rows) {
      const tenantId =
        co.tenant_id != null && String(co.tenant_id).trim() !== ""
          ? String(co.tenant_id).trim()
          : "";
      if (!tenantId || seen.has(tenantId)) continue;
      seen.add(tenantId);

      const companyName = co.name ? String(co.name).trim() : "";
      const resellerNested =
        co.reseller?.name != null ? String(co.reseller.name).trim() : "";
      const displayName =
        companyName ||
        resellerNested ||
        resellerNameMap[tenantId] ||
        tenantId;

      list.push({
        value: tenantId,
        label: formatTenantListLabel(tenantId, displayName),
      });
    }

    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [companiesQuery.data, resellerNameMap]);

  return (
    <SearchableSelect
      value={value ?? null}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      loading={enabled && companiesQuery.isPending}
      isClearable={isClearable}
      className={className}
      ariaLabel={placeholder}
      loadingText="Loading tenants…"
      emptyText="No tenants found"
    />
  );
}

export default TenantSearchableDropdown;
