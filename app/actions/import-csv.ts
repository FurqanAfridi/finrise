"use server";

import { revalidatePath } from "next/cache";
import { PaidApprovalStatus, PaymentStatus } from "@prisma/client";
import { parsePeriodLabel } from "@/lib/finance/period";
import { parsePaymentTermsDays } from "@/lib/finance/invoice";
import { prisma } from "@/lib/prisma";
import { parseInvoiceStatus, parsePaymentStatus, parseRateType } from "@/lib/status";
import { requireTenantAdmin } from "@/lib/tenant";

type ImportKind = "buyers" | "publishers" | "expenses";

export type ImportCsvResult = {
  ok?: boolean;
  error?: string;
  kind?: ImportKind;
  commit?: boolean;
  created?: number;
  errors?: string[];
  sample?: string[];
};

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
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

function num(raw: string): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function date(raw: string): Date | null {
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function resolvePeriod(
  row: Record<string, string>,
  fallbackYear: number,
): { start: Date | null; end: Date | null; label: string | null } {
  const label = row.date_range || row.period || row.period_label || null;
  if (label) {
    const parsed = parsePeriodLabel(label, fallbackYear);
    if (parsed.start) return { ...parsed, label };
  }
  const startRaw = row.period_start || row.start_date;
  const endRaw = row.period_end || row.end_date;
  const start = date(startRaw);
  let end = date(endRaw);
  if (start && !end) {
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return { start, end, label };
}

function yearFromDue(row: Record<string, string>, fallback: number) {
  const due = date(row.due_date);
  return due?.getUTCFullYear() ?? fallback;
}

export async function importCsvAction(
  _prev: ImportCsvResult,
  formData: FormData,
): Promise<ImportCsvResult> {
  const ctx = await requireTenantAdmin();
  const kind = String(formData.get("kind") ?? "buyers") as ImportKind;
  if (!["buyers", "publishers", "expenses"].includes(kind)) {
    return { error: "Choose what to import." };
  }
  const commit = String(formData.get("mode")) === "commit";
  const csv = String(formData.get("csv") ?? "");
  if (!csv.trim()) return { error: "Paste CSV rows before running the import." };

  const { rows } = parseCsv(csv);
  if (rows.length === 0) return { error: "No data rows found. Include a header line and at least one row." };

  const errors: string[] = [];
  const sample: string[] = [];
  let created = 0;
  let inferredYear = new Date().getUTCFullYear();

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    try {
      if (kind === "expenses") {
        const category = row.category || row.label;
        const year = Number(row.year);
        const month = Number(row.month);
        const actual = num(row.actual || row.amount) ?? 0;
        const paid = num(row.paid) ?? actual;
        if (!category || !year || !month) {
          errors.push(`Row ${line}: category, year, and month are required`);
          continue;
        }
        if (sample.length < 5) {
          sample.push(`${year}-${String(month).padStart(2, "0")} · ${category} · ${actual}`);
        }
        if (commit) {
          const categoryRow = await prisma.expenseCategory.upsert({
            where: { tenantId_name: { tenantId: ctx.tenantId, name: category } },
            update: {},
            create: { tenantId: ctx.tenantId, name: category },
          });
          await prisma.expense.create({
            data: {
              tenantId: ctx.tenantId,
              year,
              month,
              category,
              label: row.label || category,
              categoryId: categoryRow.id,
              actual,
              paid,
              notes: row.notes || "CSV import",
            },
          });
        }
        created += 1;
        continue;
      }

      const name = row.name || row.buyer || row.publisher;
      if (!name) {
        errors.push(`Row ${line}: name is required`);
        continue;
      }
      inferredYear = yearFromDue(row, inferredYear);
      const period = resolvePeriod(row, inferredYear);
      if (period.start) inferredYear = period.start.getUTCFullYear();

      const total = num(row.total || row.total_revenue || row.amount) ?? 0;
      const count = num(row.count || row.unit_count || row.lead_count);
      const rate = num(row.rate || row.unit_rate);
      const terms = row.payment_terms || row.terms || "";

      if (sample.length < 5) {
        sample.push(`${name} · ${period.label || "no period"} · ${total}`);
      }

      if (kind === "buyers") {
        if (commit) {
          const buyer = await prisma.buyer.upsert({
            where: { tenantId_name: { tenantId: ctx.tenantId, name } },
            update: { isActive: true },
            create: { tenantId: ctx.tenantId, name },
          });
          const verticalName = row.vertical;
          const vertical = verticalName
            ? await prisma.vertical.upsert({
                where: { tenantId_name: { tenantId: ctx.tenantId, name: verticalName } },
                update: {},
                create: { tenantId: ctx.tenantId, name: verticalName },
              })
            : null;
          const receivable = num(row.receivable || row.receivable_or_payable) ?? total;
          await prisma.buyerInvoice.create({
            data: {
              tenantId: ctx.tenantId,
              buyerId: buyer.id,
              verticalId: vertical?.id,
              periodLabel: period.label,
              periodStart: period.start,
              periodEnd: period.end,
              dueDate: date(row.due_date),
              leadCount: count,
              rateType: parseRateType(row.rate_type),
              rate,
              revenue: total,
              invoiceNumber: row.invoice_number || null,
              terms: terms || null,
              paymentTermsDays: parsePaymentTermsDays(terms),
              paymentStatus: parsePaymentStatus(row.payment_status),
              invoiceStatus: parseInvoiceStatus(row.invoice_status),
              receivable,
              received: num(row.received || row.received_or_paid),
              paidAt: date(row.payment_date),
              paymentMethod: row.payment_method || null,
            },
          });
        }
        created += 1;
      } else {
        if (commit) {
          const publisher = await prisma.publisher.upsert({
            where: { tenantId_name: { tenantId: ctx.tenantId, name } },
            update: { isActive: true },
            create: { tenantId: ctx.tenantId, name, isInternal: /internal/i.test(name) },
          });
          const verticalName = row.vertical;
          const vertical = verticalName
            ? await prisma.vertical.upsert({
                where: { tenantId_name: { tenantId: ctx.tenantId, name: verticalName } },
                update: {},
                create: { tenantId: ctx.tenantId, name: verticalName },
              })
            : null;
          const payable = num(row.payable || row.receivable_or_payable) ?? total;
          const paid = num(row.paid || row.received_or_paid);
          const paymentStatus = parsePaymentStatus(row.payment_status);
          const isPaid = paymentStatus === PaymentStatus.PAID;
          await prisma.publisherInvoice.create({
            data: {
              tenantId: ctx.tenantId,
              publisherId: publisher.id,
              verticalId: vertical?.id,
              periodLabel: period.label,
              periodStart: period.start,
              periodEnd: period.end,
              weekLabel: row.week,
              monthLabel: row.month,
              dueDate: date(row.due_date),
              leadCount: count,
              rateType: parseRateType(row.rate_type),
              rate,
              amount: total,
              invoiceNumber: row.invoice_number || null,
              terms: terms || null,
              paymentTermsDays: parsePaymentTermsDays(terms),
              payable,
              paid: paid ?? (isPaid ? payable : null),
              paymentStatus,
              paidApprovalStatus: isPaid ? PaidApprovalStatus.PENDING : PaidApprovalStatus.NOT_REQUIRED,
            },
          });
        }
        created += 1;
      }
    } catch (error) {
      errors.push(`Row ${line}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const result: ImportCsvResult = {
    ok: true,
    kind,
    commit,
    created,
    errors,
    sample,
  };

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: ctx.tenantId, key: "lastCsvImport" } },
    update: { value: JSON.stringify({ ...result, at: new Date().toISOString() }) },
    create: {
      tenantId: ctx.tenantId,
      key: "lastCsvImport",
      value: JSON.stringify({ ...result, at: new Date().toISOString() }),
    },
  });

  if (commit) {
    revalidatePath("/settings");
    revalidatePath("/buyers");
    revalidatePath("/publishers");
    revalidatePath("/expenses");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
  }

  return result;
}
