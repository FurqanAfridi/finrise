/**
 * Shared money formatting for FinRise.
 * Always use these helpers — never inline toFixed for currency.
 */

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** @deprecated Prefer formatMoney — kept for existing call sites. */
export function money(value: number, currency = "USD") {
  return formatMoney(value, currency);
}

export function moneyCompact(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
}
