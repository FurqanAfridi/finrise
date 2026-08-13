import { DEFAULT_INVOICE_COLOR } from "@/lib/validation";

export { DEFAULT_INVOICE_COLOR };

export function normalizeInvoiceColor(hex?: string | null): string {
  const raw = (hex ?? "").trim();
  const value = (raw.startsWith("#") ? raw : `#${raw}`).toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(value)) return value;
  return DEFAULT_INVOICE_COLOR;
}

export function invoiceOnAccent(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#FFFFFF";
}
