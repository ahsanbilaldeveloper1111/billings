"use client";

import { ModelListBody } from "@/components/views/ModelListBody";
import { useCompanies } from "@/hooks/company/useCompanies";
import { useCrmCompanies } from "@/hooks/crm/useCrmCompanies";
import { CurrencyCrudView } from "@/components/views/CurrencyCrudView";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { useExpenseCategories } from "@/hooks/expense-categories/useExpenseCategories";
import { useExpenses } from "@/hooks/expenses/useExpenses";
import { useInventory } from "@/hooks/inventory/useInventory";
import { useInvoices } from "@/hooks/invoices/useInvoices";
import { usePayments } from "@/hooks/payments/usePayments";
import { ProductCrudView } from "@/components/views/ProductCrudView";
import { ProductCategoryCrudView } from "@/components/views/ProductCategoryCrudView";
import { useReportsDashboard } from "@/hooks/reports/useReportsDashboard";
import { useStripePublishableKey } from "@/hooks/stripe/useStripePublishableKey";
import { useUsers } from "@/hooks/users/useUsers";
import { useVendors } from "@/hooks/vendors/useVendors";

export function UsersView() {
  const q = useUsers();
  return <ModelListBody query={q} title="Users" />;
}

export function CompanyView() {
  const q = useCompanies();
  return <ModelListBody query={q} title="Companies" />;
}

export function InvoicesView() {
  const q = useInvoices();
  return <ModelListBody query={q} title="Invoices" />;
}

export function PaymentsView() {
  const q = usePayments();
  return <ModelListBody query={q} title="Payments" />;
}

export function CustomersView() {
  const q = useCustomers();
  return <ModelListBody query={q} title="Customers" />;
}

export function ExpensesView() {
  const q = useExpenses();
  return <ModelListBody query={q} title="Expenses" />;
}

export function ExpenseCategoriesView() {
  const q = useExpenseCategories();
  return <ModelListBody query={q} title="Expense categories" />;
}

export function ProductsView() {
  return <ProductCrudView />;
}

export function ProductCategoriesView() {
  return <ProductCategoryCrudView />;
}

export function CurrenciesView() {
  return <CurrencyCrudView />;
}

export function ReportsView() {
  const q = useReportsDashboard();
  return <ModelListBody query={q} title="Reports dashboard" />;
}

export function VendorsView() {
  const q = useVendors();
  return <ModelListBody query={q} title="Vendors" />;
}

export function CrmView() {
  const q = useCrmCompanies();
  return (
    <ModelListBody
      query={q}
      title="CRM companies"
      viewable
      detailModalTitle="CRM company"
      detailModalSubtitle="CRM company row from the list response (read-only proxy)."
    />
  );
}

export { AuditLogsView } from "@/components/views/AuditLogsView";

export function InventoryView() {
  const q = useInventory();
  return <ModelListBody query={q} title="Inventory" />;
}

export function StripeView() {
  const q = useStripePublishableKey();
  return <ModelListBody query={q} title="Stripe" />;
}
