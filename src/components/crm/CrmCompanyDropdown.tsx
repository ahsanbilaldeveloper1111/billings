"use client";

import { useEffect, useMemo, useRef } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { extractListRows } from "@/lib/api/extractApiData";
import { crmCompanyIdsMatch, normalizeCrmCompanyId } from "@/lib/crm/crmCompanyId";
import { useCrmCompanies } from "@/hooks/crm/useCrmCompanies";
import type { CrmCompanyDropdownItem } from "@/models/CrmCompany";

export type { CrmCompanyDropdownItem };

export type CrmCompanyDropdownProps = {
  /** Current value: CRM id (or legacy numeric id); stored in `companies.crm_company_id`. */
  value: string | number | null | undefined;
  /** Called when selection changes; receives id as string, or null. */
  onChange: (crmCompanyId: string | null) => void;
  /** Optional: called with full CRM company object when user selects one. */
  onSelectCompany?: (company: CrmCompanyDropdownItem | null) => void;
  /** When value is empty, preselect the option matching this name once (e.g. from initial data). */
  initialCompanyName?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Optional fetch params for list (e.g. limit, search, tenant_id). */
  fetchParams?: Record<string, unknown>;
  isClearable?: boolean;
};

function getOptionValue(c: CrmCompanyDropdownItem): string {
  const idVal = c.id ?? c.company_id;
  if (idVal === null || idVal === undefined) return "";
  return String(idVal);
}

function getLabel(c: CrmCompanyDropdownItem): string {
  const raw =
    c.name ??
    c.company_name ??
    getOptionValue(c);
  const trimmed = String(raw).trim();
  return trimmed || getOptionValue(c);
}

/**
 * Loads CRM companies via `GET /crm/companies` and selects by company id
 * (same value shape as {@link CreateUpdateCustomerModal}).
 */
export function CrmCompanyDropdown({
  value,
  onChange,
  onSelectCompany,
  initialCompanyName,
  placeholder = "Select company from CRM",
  disabled = false,
  className = "",
  fetchParams = {},
  isClearable = true,
}: CrmCompanyDropdownProps) {
  const params = useMemo(
    () => ({ limit: 500, ...(fetchParams ?? {}) }),
    [fetchParams],
  );

  const q = useCrmCompanies(params);
  const list = useMemo(() => {
    const { rows } = extractListRows<CrmCompanyDropdownItem & Record<string, unknown>>(
      q.data,
    );
    return rows;
  }, [q.data]);

  const hasPreselectedByName = useRef(false);

  const options = useMemo(() => {
    return list
      .map((c) => {
        const optionValue = getOptionValue(c);
        return {
          value: optionValue,
          label: getLabel(c),
        };
      })
      .filter((o) => o.value !== "");
  }, [list]);

  useEffect(() => {
    const name =
      typeof initialCompanyName === "string"
        ? initialCompanyName.trim()
        : "";
    if (
      q.isPending ||
      name === "" ||
      list.length === 0 ||
      hasPreselectedByName.current
    ) {
      return;
    }
    if (normalizeCrmCompanyId(value) !== null) return;

    const normalized = name.toUpperCase();
    const match = list.find((c) => {
      const label = getLabel(c).trim();
      return label.toUpperCase() === normalized;
    });
    if (match) {
      hasPreselectedByName.current = true;
      const optionValue = getOptionValue(match);
      onChange(optionValue);
      onSelectCompany?.(match);
    }
  }, [
    q.isPending,
    list,
    initialCompanyName,
    value,
    onChange,
    onSelectCompany,
  ]);

  const normalizedValue = normalizeCrmCompanyId(value) ?? "";

  const handleChange = (selected: string | null) => {
    onChange(selected);
    if (onSelectCompany) {
      const company = selected
        ? list.find((c) => crmCompanyIdsMatch(getOptionValue(c), selected)) ??
          null
        : null;
      onSelectCompany(company);
    }
  };

  const selectValue =
    options.some((o) => o.value === normalizedValue) ? normalizedValue : "";

  return (
    <SearchableSelect
      value={selectValue || null}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      loading={q.isPending}
      isClearable={isClearable}
      className={className}
      ariaLabel={placeholder}
      loadingText="Loading CRM companies…"
      emptyText="No companies found"
    />
  );
}

export default CrmCompanyDropdown;
