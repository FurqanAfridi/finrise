import { randomBytes } from "node:crypto";
import { RateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lineTotal } from "@/lib/finance/invoice";
import { parseRateType } from "@/lib/status";
import { formField, parseInteger, parseMoney, parseOptionalText } from "@/lib/validation";

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

export type ParsedInvoiceLine = {
  verticalId: string | null;
  leadCount: number | null;
  rateType: RateType;
  rate: number | null;
  amount: number;
  comments: string | null;
};

export type InvoiceLineDisplay = {
  verticalName: string | null;
  leadCount: number | null;
  rateType: RateType;
  rate: number | null;
  amount: number;
  comments: string | null;
};

/** `legacyTotalKey` is the single-line total field older forms post ("revenue" or "amount"). */
export function parseInvoiceLineRowsFromForm(formData: FormData, legacyTotalKey: "revenue" | "amount" = "revenue") {
  const verticalIds = formData.getAll("lineVerticalId").map((value) => String(value).trim());
  const leadCounts = formData.getAll("lineLeadCount").map((value) => String(value).trim());
  const rateTypes = formData.getAll("lineRateType").map((value) => String(value).trim());
  const rates = formData.getAll("lineRate").map((value) => String(value).trim());
  const amounts = formData.getAll("lineAmount").map((value) => String(value).trim());
  const comments = formData.getAll("lineComments").map((value) => String(value).trim());
  const lines: ParsedInvoiceLine[] = [];

  for (let i = 0; i < verticalIds.length; i += 1) {
    const verticalId = verticalIds[i] || null;
    const leadCountRaw = leadCounts[i] ?? "";
    const rateType = parseRateType(rateTypes[i] ?? RateType.CPL);
    const rateParsed = parseMoney(rates[i] ?? "", "Rate", false);
    if (!rateParsed.ok) return { ok: false as const, error: rateParsed.error };
    const amountParsed = parseMoney(amounts[i] ?? "", "Amount", false);
    if (!amountParsed.ok) return { ok: false as const, error: amountParsed.error };
    const commentParsed = parseOptionalText(comments[i] ?? "", "Description", 500);
    if (!commentParsed.ok) return { ok: false as const, error: commentParsed.error };

    const leadCount =
      leadCountRaw === ""
        ? { ok: true as const, value: null as number | null }
        : parseInteger(leadCountRaw, "Quantity", 0, 1_000_000, false);
    if (!leadCount.ok) return { ok: false as const, error: leadCount.error };

    const computed = lineTotal(rateType, leadCount.value, rateParsed.value, amountParsed.value).toNumber();
    const amount =
      amountParsed.value != null && amountParsed.value > 0 ? amountParsed.value : computed;
    if (!verticalId && amount <= 0) continue;
    if (!verticalId && amount > 0) {
      return { ok: false as const, error: "Choose a vertical for each line with an amount." };
    }
    if (!verticalId) continue;
    if (amount <= 0) {
      return { ok: false as const, error: "Each line needs a quantity and rate, or an amount." };
    }

    lines.push({
      verticalId,
      leadCount: leadCount.value,
      rateType,
      rate: rateParsed.value,
      amount,
      comments: commentParsed.value,
    });
  }

  if (lines.length === 0) {
    const legacyVerticalId = formField(formData, "verticalId").trim() || null;
    const legacyLeadCount = parseInteger(formField(formData, "leadCount"), "Quantity", 0, 1_000_000, false);
    if (!legacyLeadCount.ok) return { ok: false as const, error: legacyLeadCount.error };
    const legacyRate = parseMoney(formField(formData, "rate"), "Rate", false);
    if (!legacyRate.ok) return { ok: false as const, error: legacyRate.error };
    const legacyAmount = parseMoney(formField(formData, legacyTotalKey), "Amount", false);
    if (!legacyAmount.ok) return { ok: false as const, error: legacyAmount.error };
    const legacyRateType = parseRateType(formField(formData, "rateType"));
    const computed = lineTotal(
      legacyRateType,
      legacyLeadCount.value,
      legacyRate.value,
      legacyAmount.value,
    ).toNumber();
    const amount =
      legacyAmount.value != null && legacyAmount.value > 0 ? legacyAmount.value : computed;
    if (amount <= 0) return { ok: false as const, error: "Add at least one line with an amount." };
    lines.push({
      verticalId: legacyVerticalId,
      leadCount: legacyLeadCount.value,
      rateType: legacyRateType,
      rate: legacyRate.value,
      amount,
      comments: formField(formData, "comments").trim() || null,
    });
  }

  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.verticalId) continue;
    if (seen.has(line.verticalId)) {
      return { ok: false as const, error: "Each vertical can only appear once on an invoice." };
    }
    seen.add(line.verticalId);
  }

  return { ok: true as const, value: lines };
}

export function summarizeInvoiceLines(lines: ParsedInvoiceLine[]) {
  const revenue = lines.reduce((sum, line) => sum + line.amount, 0);
  const first = lines[0];
  return {
    revenue,
    receivable: revenue,
    verticalId: first?.verticalId ?? null,
    leadCount: first?.leadCount ?? null,
    rateType: first?.rateType ?? RateType.CPL,
    rate: first?.rate ?? null,
    comments: lines.length === 1 ? first?.comments ?? null : null,
  };
}

export async function replaceBuyerInvoiceLines(
  tenantId: string,
  buyerInvoiceId: string,
  lines: ParsedInvoiceLine[],
) {
  await prisma.$transaction([
    prisma.buyerInvoiceLine.deleteMany({ where: { tenantId, buyerInvoiceId } }),
    ...lines.map((line, index) =>
      prisma.buyerInvoiceLine.create({
        data: {
          id: cuidLike(),
          tenantId,
          buyerInvoiceId,
          verticalId: line.verticalId,
          leadCount: line.leadCount,
          rateType: line.rateType,
          rate: line.rate,
          amount: line.amount,
          comments: line.comments,
          sortOrder: index,
        },
      }),
    ),
  ]);
}

export async function replacePublisherInvoiceLines(
  tenantId: string,
  publisherInvoiceId: string,
  lines: ParsedInvoiceLine[],
) {
  await prisma.$transaction([
    prisma.publisherInvoiceLine.deleteMany({ where: { tenantId, publisherInvoiceId } }),
    ...lines.map((line, index) =>
      prisma.publisherInvoiceLine.create({
        data: {
          id: cuidLike(),
          tenantId,
          publisherInvoiceId,
          verticalId: line.verticalId,
          leadCount: line.leadCount,
          rateType: line.rateType,
          rate: line.rate,
          amount: line.amount,
          comments: line.comments,
          sortOrder: index,
        },
      }),
    ),
  ]);
}

export async function loadBuyerInvoiceLines(tenantId: string, buyerInvoiceId: string) {
  return prisma.buyerInvoiceLine.findMany({
    where: { tenantId, buyerInvoiceId },
    include: { vertical: { select: { name: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export function resolveInvoiceLineDisplay(input: {
  lines: Array<{
    vertical?: { name: string } | null;
    leadCount: unknown;
    rateType: RateType;
    rate: unknown;
    amount: unknown;
    comments: string | null;
  }>;
  fallback: {
    verticalName: string | null;
    leadCount: unknown;
    rateType: RateType;
    rate: unknown;
    amount: unknown;
    comments: string | null;
  };
}): InvoiceLineDisplay[] {
  if (input.lines.length > 0) {
    return input.lines.map((line) => ({
      verticalName: line.vertical?.name ?? null,
      leadCount: line.leadCount == null ? null : Number(line.leadCount),
      rateType: line.rateType,
      rate: line.rate == null ? null : Number(line.rate),
      amount: Number(line.amount),
      comments: line.comments,
    }));
  }
  return [
    {
      verticalName: input.fallback.verticalName,
      leadCount: input.fallback.leadCount == null ? null : Number(input.fallback.leadCount),
      rateType: input.fallback.rateType,
      rate: input.fallback.rate == null ? null : Number(input.fallback.rate),
      amount: Number(input.fallback.amount),
      comments: input.fallback.comments,
    },
  ];
}

export function invoiceVerticalLabel(lines: InvoiceLineDisplay[]) {
  const names = lines.map((line) => line.verticalName).filter(Boolean);
  if (names.length === 0) return null;
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}
