/**
 * Barrel for React Query hooks aligned with `src/services/*`.
 * Prefer importing from here for discoverability, or from feature folders.
 */

export * from "@/hooks/analytics/useAnalyticsDashboardCounters";
export * from "@/hooks/analytics/useAnalyticsDashboardCharts";
export * from "@/hooks/analytics/useAnalyticsDashboardOverview";
export * from "@/hooks/analytics/useAnalyticsEndpoints";

export * from "@/hooks/audit-logs/useAuditLogs";

export * from "@/hooks/auth/useAuthMutations";
export * from "@/hooks/auth/useCurrentUser";
export * from "@/hooks/auth/useLogin";

export * from "@/hooks/company/useCompanies";
export * from "@/hooks/company/useCompany";

export * from "@/hooks/crm/useCrmCompanies";
export * from "@/hooks/crm/useCrmCompanyNameMap";

export * from "@/hooks/currencies/useActiveCurrencies";
export * from "@/hooks/currencies/useBaseCurrency";
export * from "@/hooks/currencies/useCurrencies";
export * from "@/hooks/currencies/useCurrencyMap";

export * from "@/hooks/customers/useCustomer";
export * from "@/hooks/customers/useCustomers";

export * from "@/hooks/dashboard/useDashboard";
export * from "@/hooks/dashboard/useDashboardParams";

export * from "@/hooks/email/useSendEmail";

export * from "@/hooks/expense-categories/useExpenseCategories";
export * from "@/hooks/expenses/useExpense";
export * from "@/hooks/expenses/useExpenseMutations";
export * from "@/hooks/expenses/useExpenses";

export * from "@/hooks/inventory/useInventory";
export * from "@/hooks/inventory/useInventoryEndpoints";

export * from "@/hooks/invoices/useInvoice";
export * from "@/hooks/invoices/useInvoiceDetails";
export * from "@/hooks/invoices/useInvoices";

export * from "@/hooks/payments/usePayment";
export * from "@/hooks/payments/usePaymentStatus";
export * from "@/hooks/payments/usePayments";

export * from "@/hooks/permissions";

export * from "@/hooks/product-categories/useProductCategories";

export * from "@/hooks/products/useProduct";
export * from "@/hooks/products/useProducts";

export * from "@/hooks/public-api/usePublicInvoicePay";

export * from "@/hooks/ranks/useRank";
export * from "@/hooks/ranks/useRankModuleList";
export * from "@/hooks/ranks/useRankMutations";
export * from "@/hooks/ranks/useRanks";

export * from "@/hooks/reports/useReportsDashboard";
export * from "@/hooks/reports/useReportsEndpoints";

export * from "@/hooks/resellers";

export * from "@/hooks/stripe/useStripeEndpoints";
export * from "@/hooks/stripe/useStripePublishableKey";
export * from "@/hooks/stripe/useStripeCustomerPaymentMutations";

export * from "@/hooks/token-public/useTokenPublic";

export * from "@/hooks/users/useUser";
export * from "@/hooks/users/useUsers";

export * from "@/hooks/useAuthQueryEnabled";

export * from "@/hooks/vendors/useVendor";
export * from "@/hooks/vendors/useVendors";
