"use server";

import { revalidatePath } from "next/cache";
import { PaidApprovalStatus, PaymentStatus } from "@prisma/client";
import { parseInvoiceStatus, parsePaymentStatus, parseRateType } from "@/lib/status";
import { parsePaymentTermsDays } from "@/lib/finance/invoice";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/tenant";

type ImportKind = "buyers" | "publishers" | "expenses";

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

export async function importCsvAction(formData: FormData) {
  const ctx = await requireTenantAdmin();
  const kind = String(formData.get("kind") ?? "buyers") as ImportKind;
  const commit = String(formData.get("mode")) === "commit";
  const csv = String(formData.get("csv") ?? "");
  const { rows } = parseCsv(csv);
  const errors: string[] = [];
  let created = 0;

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
      const total = num(row.total || row.total_revenue || row.amount) ?? 0;
      const count = num(row.count || row.unit_count);
      const rate = num(row.rate || row.unit_rate);
      const terms = row.payment_terms || row.terms || "";
      if (kind === "buyers") {
        if (commit) {
          const buyer = await prisma.buyer.upsert({
            where: { tenantId_name: { tenantId: ctx.tenantId, name } },
            update: {},
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
              periodLabel: row.date_range || row.period,
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
            update: {},
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
              periodLabel: row.date_range || row.period,
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

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: ctx.tenantId, key: "lastCsvImport" } },
    update: { value: JSON.stringify({ kind, commit, created, errors }) },
    create: {
      tenantId: ctx.tenantId,
      key: "lastCsvImport",
      value: JSON.stringify({ kind, commit, created, errors }),
    },
  });
  revalidatePath("/settings");
  revalidatePath("/buyers");
  revalidatePath("/publishers");
  revalidatePath("/expenses");
}
