export type ImportKind = "buyers" | "publishers" | "expenses";

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
};

export const IMPORT_KIND_LABEL: Record<ImportKind, string> = {
  buyers: "Buyer invoices (historical)",
  publishers: "Publisher payables (historical)",
  expenses: "Expenses (historical)",
};

export const IMPORT_FIELDS: Record<ImportKind, ImportField[]> = {
  buyers: [
    { key: "name", label: "Buyer name", required: true },
    { key: "date_range", label: "Period", hint: "For example 8/1-8/15" },
    { key: "period_start", label: "Period start" },
    { key: "period_end", label: "Period end" },
    { key: "vertical", label: "Vertical" },
    { key: "count", label: "Lead or unit count" },
    { key: "rate_type", label: "Rate type" },
    { key: "rate", label: "Rate" },
    { key: "total", label: "Total amount", required: true },
    { key: "invoice_number", label: "Invoice number" },
    { key: "payment_terms", label: "Payment terms" },
    { key: "due_date", label: "Due date" },
    { key: "payment_status", label: "Payment status" },
    { key: "invoice_status", label: "Invoice status" },
    { key: "receivable", label: "Receivable" },
    { key: "received", label: "Amount received" },
    { key: "payment_date", label: "Payment date" },
    { key: "payment_method", label: "Payment method" },
  ],
  publishers: [
    { key: "name", label: "Publisher name", required: true },
    { key: "date_range", label: "Period", hint: "For example 8/1-8/15" },
    { key: "period_start", label: "Period start" },
    { key: "period_end", label: "Period end" },
    { key: "vertical", label: "Vertical" },
    { key: "count", label: "Lead or unit count" },
    { key: "rate_type", label: "Rate type" },
    { key: "rate", label: "Rate" },
    { key: "total", label: "Total amount", required: true },
    { key: "invoice_number", label: "Invoice number" },
    { key: "payment_terms", label: "Payment terms" },
    { key: "due_date", label: "Due date" },
    { key: "payment_status", label: "Payment status" },
    { key: "payable", label: "Payable" },
    { key: "paid", label: "Amount paid" },
    { key: "week", label: "Week label" },
    { key: "month", label: "Month label" },
  ],
  expenses: [
    { key: "year", label: "Year", required: true },
    { key: "month", label: "Month (1 to 12)", required: true },
    { key: "category", label: "Category", required: true },
    { key: "label", label: "Label" },
    { key: "actual", label: "Amount", required: true },
    { key: "paid", label: "Amount paid" },
    { key: "notes", label: "Notes" },
  ],
};

const ALIASES: Record<string, string[]> = {
  name: ["name", "buyer", "buyer_name", "publisher", "publisher_name", "company"],
  date_range: ["date_range", "period", "period_label", "date", "dates"],
  period_start: ["period_start", "start_date", "start"],
  period_end: ["period_end", "end_date", "end"],
  vertical: ["vertical", "offer", "campaign"],
  count: ["count", "unit_count", "lead_count", "leads", "qty", "quantity"],
  rate_type: ["rate_type", "type"],
  rate: ["rate", "unit_rate", "cpl", "cpa"],
    total: ["total", "total_revenue", "total_amount", "amount", "revenue"],
  invoice_number: ["invoice_number", "invoice", "invoice_no", "inv"],
  payment_terms: ["payment_terms", "terms", "net"],
  due_date: ["due_date", "due"],
  payment_status: ["payment_status", "status", "paid_status"],
  invoice_status: ["invoice_status"],
  receivable: ["receivable", "receivable_or_payable"],
  received: ["received", "received_or_paid", "amount_received"],
  payment_date: ["payment_date", "paid_on", "paid_date"],
  payment_method: ["payment_method", "method"],
  payable: ["payable", "receivable_or_payable"],
  paid: ["paid", "received_or_paid", "amount_paid"],
  week: ["week", "week_label"],
  month: ["month", "month_label"],
  year: ["year"],
  category: ["category"],
  label: ["label", "description"],
  actual: ["actual", "amount"],
  notes: ["notes", "note", "comment"],
};

export function fieldAliases(field: ImportField) {
  const extra = ALIASES[field.key] ?? [];
  return [...new Set([field.key, normalizeHeader(field.label), ...extra])];
}

export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export function parseCsvTable(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => splitCsvLine(line).map((cell) => cell.trim()));
  return { headers, rows };
}

export function guessColumnMapping(kind: ImportKind, headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS[kind]) {
    const aliases = fieldAliases(field);
    const index = normalized.findIndex((header, i) => !used.has(i) && aliases.includes(header));
    if (index >= 0) {
      mapping[field.key] = index;
      used.add(index);
    }
  }
  return mapping;
}

export function applyColumnMapping(
  rows: string[][],
  mapping: Record<string, number>,
): Record<string, string>[] {
  return rows.map((cells) => {
    const row: Record<string, string> = {};
    for (const [key, index] of Object.entries(mapping)) {
      if (index == null || index < 0) continue;
      row[key] = String(cells[index] ?? "").trim();
    }
    return row;
  });
}

/** Header-name mapping used by pasted CSV that already uses our template names. */
export function rowsFromNamedHeaders(headers: string[], rows: string[][]): Record<string, string>[] {
  const keys = headers.map(normalizeHeader);
  return rows.map((cells) => {
    const row: Record<string, string> = {};
    keys.forEach((header, i) => {
      if (header) row[header] = String(cells[i] ?? "").trim();
    });
    return row;
  });
}

export function mappingIsValid(kind: ImportKind, mapping: Record<string, number>) {
  return IMPORT_FIELDS[kind]
    .filter((field) => field.required)
    .every((field) => mapping[field.key] != null && mapping[field.key] >= 0);
}

export type FieldCompatibility = {
  key: string;
  label: string;
  required: boolean;
  matched: boolean;
  column: string | null;
  columnIndex: number | null;
};

export type SheetCompatibility = {
  ready: boolean;
  matchedRequired: number;
  requiredTotal: number;
  matchedOptional: number;
  optionalTotal: number;
  extraColumns: string[];
  fields: FieldCompatibility[];
  summary: "compatible" | "needs_mapping";
};

export function assessSheetCompatibility(
  kind: ImportKind,
  headers: string[],
  mapping = guessColumnMapping(kind, headers),
): SheetCompatibility {
  const fields: FieldCompatibility[] = IMPORT_FIELDS[kind].map((field) => {
    const index = mapping[field.key];
    const matched = index != null && index >= 0 && index < headers.length;
    return {
      key: field.key,
      label: field.label,
      required: Boolean(field.required),
      matched,
      column: matched ? headers[index] || `Column ${index + 1}` : null,
      columnIndex: matched ? index : null,
    };
  });
  const used = new Set(fields.filter((row) => row.columnIndex != null).map((row) => row.columnIndex));
  const extraColumns = headers
    .map((header, index) => ({ header: header || `Column ${index + 1}`, index }))
    .filter((row) => !used.has(row.index))
    .map((row) => row.header);
  const required = fields.filter((row) => row.required);
  const optional = fields.filter((row) => !row.required);
  const matchedRequired = required.filter((row) => row.matched).length;
  const matchedOptional = optional.filter((row) => row.matched).length;
  const ready = matchedRequired === required.length && required.length > 0;
  return {
    ready,
    matchedRequired,
    requiredTotal: required.length,
    matchedOptional,
    optionalTotal: optional.length,
    extraColumns,
    fields,
    summary: ready ? "compatible" : "needs_mapping",
  };
}
