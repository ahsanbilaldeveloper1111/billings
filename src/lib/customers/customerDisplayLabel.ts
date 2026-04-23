import type { Customer } from "@/models/Customer";

type CustomerLike = Pick<
  Customer,
  "name" | "crm_company_id" | "tenant_id" | "email" | "id"
>;

/**
 * Best-effort display name for a customer row when `name` is often empty from the API.
 */
export function customerDisplayLabel(
  c: CustomerLike,
  tenantNameMap: Readonly<Record<string, string>>,
  crmCompanyNameMap: Readonly<Record<string, string>>,
): string {
  const direct =
    c.name != null && String(c.name).trim() !== ""
      ? String(c.name).trim()
      : "";
  if (direct) return direct;
  const crmId =
    c.crm_company_id != null && String(c.crm_company_id).trim() !== ""
      ? String(c.crm_company_id).trim()
      : "";
  if (crmId) {
    const crmLabel = crmCompanyNameMap[crmId]?.trim();
    if (crmLabel) return crmLabel;
  }
  const tid =
    c.tenant_id != null && String(c.tenant_id).trim() !== ""
      ? String(c.tenant_id).trim()
      : "";
  if (tid) {
    const tenantLabel = tenantNameMap[tid]?.trim();
    if (tenantLabel) return tenantLabel;
  }
  const email =
    c.email != null && String(c.email).trim() !== ""
      ? String(c.email).trim()
      : "";
  if (email) return email;
  if (crmId) return `CRM #${crmId}`;
  if (c.id != null) return `Customer #${c.id}`;
  return "—";
}
