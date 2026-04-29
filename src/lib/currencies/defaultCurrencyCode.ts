import type { Currency } from "@/models/Currency";

/**
 * Resolve default currency code from:
 * 1) configured base currency,
 * 2) first active currency,
 * 3) USD fallback.
 */
export function resolveDefaultCurrencyCode(
  baseCurrency: Currency | null | undefined,
  activeCurrencies: Currency[],
): string {
  const baseCode =
    typeof baseCurrency?.code === "string" ? baseCurrency.code.trim() : "";
  if (baseCode) return baseCode;
  const firstActive = activeCurrencies.find(
    (c) => typeof c.code === "string" && c.code.trim() !== "",
  );
  return firstActive?.code ?? "USD";
}
