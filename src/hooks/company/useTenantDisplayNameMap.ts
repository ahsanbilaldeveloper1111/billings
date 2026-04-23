"use client";

import { useMemo } from "react";
import { useCompanies } from "@/hooks/company/useCompanies";
import { extractListRows } from "@/lib/api/extractApiData";
import type { Company } from "@/models/Company";

/**
 * tenant_id → display name from a wide company index (best-effort; not the legacy “main app” map).
 */
export function useTenantDisplayNameMap() {
  const q = useCompanies({ page: 1, limit: 2000 });
  return useMemo(() => {
    const map: Record<string, string> = {};
    const { rows } = extractListRows<Company & Record<string, unknown>>(
      q.data,
    );
    for (const c of rows) {
      const tid = c.tenant_id;
      if (tid == null || String(tid).trim() === "") continue;
      const key = String(tid).trim();
      const rootName = c.name ? String(c.name).trim() : "";
      const nested =
        c.reseller?.name != null ? String(c.reseller.name).trim() : "";
      const label = rootName || nested;
      if (label) map[key] = label;
    }
    return map;
  }, [q.data]);
}
