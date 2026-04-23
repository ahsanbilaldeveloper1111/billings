"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useCrmCompanyNameMap } from "@/hooks/crm/useCrmCompanyNameMap";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { extractListRows } from "@/lib/api/extractApiData";
import type { Customer } from "@/models/Customer";

export type CrmCustomerSearchableDropdownProps = {
  value: string | null | undefined;
  onChange: (crmCompanyId: string | null) => void;
  tenantId?: string | null;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  isClearable?: boolean;
  enabled?: boolean;
};

/**
 * Searchable CRM customer selector using customers list + CRM-company name map.
 */
export function CrmCustomerSearchableDropdown({
  value,
  onChange,
  tenantId,
  disabled = false,
  className = "",
  placeholder = "Select CRM customer…",
  isClearable = true,
  enabled = true,
}: CrmCustomerSearchableDropdownProps) {
  const tenant = tenantId?.trim() ?? "";
  const canLoad = enabled && tenant.length > 0;

  const customersQuery = useCustomers(
    canLoad
      ? {
          page: 1,
          limit: 1000,
          tenant_id: tenant,
          load_profile: true,
        }
      : undefined,
    { enabled: canLoad },
  );
  const crmNameMap = useCrmCompanyNameMap();

  const options = useMemo(() => {
    const rows = extractListRows<Customer & Record<string, unknown>>(
      customersQuery.data,
    ).rows;
    const seen = new Set<string>();
    const list: Array<{ value: string; label: string }> = [];

    for (const c of rows) {
      const crmId =
        c.crm_company_id != null && String(c.crm_company_id).trim() !== ""
          ? String(c.crm_company_id).trim()
          : "";
      if (!crmId || seen.has(crmId)) continue;
      seen.add(crmId);

      const crmName = crmNameMap[crmId]?.trim() ?? "";
      const customerName = c.name ? String(c.name).trim() : "";
      const displayName = customerName || crmName || crmId;
      list.push({
        value: crmId,
        label: displayName === crmId ? crmId : `${displayName} (${crmId})`,
      });
    }

    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [customersQuery.data, crmNameMap]);

  return (
    <SearchableSelect
      value={value ?? null}
      onChange={onChange}
      options={options}
      placeholder={tenant ? placeholder : "Select tenant first…"}
      disabled={disabled || !tenant}
      loading={canLoad && customersQuery.isPending}
      isClearable={isClearable}
      className={className}
      ariaLabel={placeholder}
      loadingText="Loading customers…"
      emptyText="No CRM customers found"
    />
  );
}

export default CrmCustomerSearchableDropdown;
