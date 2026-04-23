import type { Invoice, InvoiceStatus } from "@/models/Invoice";

export function formatInvoiceDetailDate(iso: string | undefined | null): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatInvoicePeriodEnd(invoice: Invoice): string {
  if (invoice.end_date) return formatInvoiceDetailDate(invoice.end_date);
  if (invoice.due_date) return formatInvoiceDetailDate(invoice.due_date);
  return "N/A";
}

export function getInvoiceDisplayNames(
  invoice: Invoice | undefined | null,
  /** Company name + main-app fallback by `tenant_id` (company keys should win in the merged map). */
  tenantLabelByTenantId: Record<string, string> = {},
): {
  companyDisplayName: string;
  billToDisplayName: string;
  hasCustomer: boolean;
  sellerDisplayName: string;
} {
  const company = invoice?.company;
  const companyTenantId = company?.tenant_id
    ? String(company.tenant_id).trim()
    : null;
  const mappedTenantLabel = companyTenantId
    ? (tenantLabelByTenantId[companyTenantId]?.trim() ?? "")
    : "";
  let companyDisplayName = "N/A";
  if (company) {
    const root =
      company.name != null && String(company.name).trim() !== ""
        ? String(company.name).trim()
        : "";
    const fallback = companyTenantId ? companyTenantId : "N/A";
    companyDisplayName = root || mappedTenantLabel || fallback;
  }
  const hasCustomer = Boolean(invoice?.customer);
  const billToDisplayName = hasCustomer
    ? (invoice?.customer?.name ??
      invoice?.customer?.email ??
      "N/A")
    : (() => {
        const root =
          company?.name != null && String(company.name).trim() !== ""
            ? String(company.name).trim()
            : "";
        return root || mappedTenantLabel || "N/A";
      })();
  const sellerDisplayName = hasCustomer
    ? (company?.name ?? companyDisplayName ?? "N/A")
    : (company?.vendor?.name ?? "N/A");
  return { companyDisplayName, billToDisplayName, hasCustomer, sellerDisplayName };
}

export function isOverdue(
  dueDate: string,
  status: InvoiceStatus | string,
  outstandingAmount?: number,
): boolean {
  if (status === "paid" || status === "cancelled") return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const isPastDue = due.getTime() < today.getTime();
  if (outstandingAmount !== undefined)
    return isPastDue && outstandingAmount > 0;
  return isPastDue;
}

const STATUS_STYLES: Record<
  string,
  { className: string; text: string }
> = {
  draft: { className: "bg-zinc-500", text: "Draft" },
  sent: { className: "bg-sky-600", text: "Sent" },
  paid: { className: "bg-emerald-600", text: "Paid" },
  partially_paid: { className: "bg-amber-500", text: "Partially Paid" },
  overdue: { className: "bg-rose-600", text: "Overdue" },
  cancelled: { className: "bg-zinc-800", text: "Cancelled" },
  pending: { className: "bg-violet-600", text: "Pending" },
};

export function invoiceStatusBadge(
  status: string,
  dueDate?: string,
  outstandingAmount?: number,
): { primary: { className: string; text: string }; showOverdue: boolean } {
  const config = STATUS_STYLES[status] ?? {
    className: "bg-zinc-500",
    text: status,
  };
  const showOverdue =
    !!dueDate &&
    isOverdue(dueDate, status, outstandingAmount) &&
    status !== "overdue";
  return { primary: config, showOverdue };
}

export function paymentModeBadgeText(mode: string): string {
  const m: Record<string, string> = {
    one_time: "One time",
    recurring: "Recurring",
    subscription: "Subscription",
  };
  return m[mode] ?? mode;
}
