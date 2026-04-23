/**
 * Best-effort human label for a billing `tenant_id`: company name from the index,
 * then main-app reseller name, then the raw id.
 */
export function resolveTenantDisplayLabel(
  tenantId: string,
  companyNameByTenantId: Readonly<Record<string, string>>,
  resellerNameByTenantId: Readonly<Record<string, string>>,
): string {
  const tid = String(tenantId).trim();
  if (!tid) return "";
  const fromCompany = companyNameByTenantId[tid]?.trim();
  if (fromCompany) return fromCompany;
  const fromReseller = resellerNameByTenantId[tid]?.trim();
  if (fromReseller) return fromReseller;
  return tid;
}

/**
 * Dropdown / list: show `Name (tenantId)` when the resolved name differs from the id;
 * otherwise show the id only.
 */
export function formatTenantListLabel(
  tenantId: string,
  displayName: string,
): string {
  const tid = String(tenantId).trim();
  const name = String(displayName).trim();
  if (!tid) return name || "";
  if (!name || name === tid) return tid;
  return `${name} (${tid})`;
}

/** Primary label for a company row (tables, delete confirm, etc.). */
export function companyTenantDisplayLabel(
  c: {
    name?: string;
    tenant_id?: string | null;
    reseller?: { name?: string; tenant_id?: string | null } | null;
  },
  resellerNameByTenantId: Readonly<Record<string, string>>,
): string {
  const root = c.name != null ? String(c.name).trim() : "";
  if (root) return root;
  const nested =
    c.reseller?.name != null ? String(c.reseller.name).trim() : "";
  if (nested) return nested;
  const tid =
    c.tenant_id != null && String(c.tenant_id).trim() !== ""
      ? String(c.tenant_id).trim()
      : "";
  if (tid) {
    const m = resellerNameByTenantId[tid]?.trim();
    if (m) return m;
    return tid;
  }
  return "—";
}

/** Vendor column: vendor name, then reseller info (never prefer raw id over name). */
export function vendorColumnLabel(
  c: {
    vendor?: { name?: string } | null;
    reseller?: { name?: string; tenant_id?: string | null } | null;
  },
  resellerNameByTenantId: Readonly<Record<string, string>>,
): string {
  if (c.vendor?.name) return String(c.vendor.name);
  if (c.reseller?.name) return String(c.reseller.name);
  const rtid =
    c.reseller?.tenant_id != null &&
    String(c.reseller.tenant_id).trim() !== ""
      ? String(c.reseller.tenant_id).trim()
      : "";
  if (rtid) {
    const m = resellerNameByTenantId[rtid]?.trim();
    if (m) return m;
    return rtid;
  }
  return "—";
}

type CompanyLikeForTitle = {
  name?: string;
  tenant_id?: string | null;
  reseller?: { name?: string } | null;
  username?: string;
  id?: number;
} | null;

/**
 * Title / header for a company (detail, product pricing, etc.) when `name` may be empty.
 * Uses `routeTenantId` when the loaded record has no `tenant_id` yet.
 */
export function companyDetailDisplayName(
  company: CompanyLikeForTitle,
  routeTenantId: string,
  companyNameByTenantId: Readonly<Record<string, string>>,
  resellerNameByTenantId: Readonly<Record<string, string>>,
  emptyFallback = "—",
): string {
  const tidFromCompany =
    company?.tenant_id != null && String(company.tenant_id).trim() !== ""
      ? String(company.tenant_id).trim()
      : "";
  const tid = tidFromCompany || String(routeTenantId).trim();
  const rootName =
    company?.name != null && String(company.name).trim() !== ""
      ? String(company.name).trim()
      : "";
  const nestedResellerName =
    company?.reseller?.name != null &&
    String(company.reseller.name).trim() !== ""
      ? String(company.reseller.name).trim()
      : "";
  const username =
    company?.username != null && String(company.username).trim() !== ""
      ? String(company.username).trim()
      : "";
  const idLabel =
    company?.id != null ? `Company #${String(company.id)}` : "";
  const mappedTenantLabel =
    tid !== ""
      ? resolveTenantDisplayLabel(
          tid,
          companyNameByTenantId,
          resellerNameByTenantId,
        )
      : "";
  const fromMaps =
    mappedTenantLabel !== "" && mappedTenantLabel !== tid
      ? mappedTenantLabel
      : "";
  return (
    rootName ||
    nestedResellerName ||
    fromMaps ||
    username ||
    idLabel ||
    mappedTenantLabel ||
    emptyFallback
  );
}
