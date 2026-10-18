"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceStatus, PaidApprovalStatus, PaymentStatus, Prisma, RateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireTenantAdmin, canApprovePayments, canWrite } from "@/lib/tenant";
import type { FormActionState } from "@/lib/form-state";
import { dueDate, formatNetTerms, lineTotal, parsePaymentTermsDays, settledAmount } from "@/lib/finance/invoice";
import { invoiceVariance } from "@/lib/finance/variance";
import { getFinanceSettings } from "@/lib/finance/queries";
import { NOTIFICATION, notifyReviewers } from "@/lib/notifications";
import { nextBuyerInvoiceNumber } from "@/lib/company-branding";
import { applyBuyerVerticalDefaults, applyPublisherVerticalDefaults } from "@/lib/contact-verticals";
import { parseBuyerEmailsFromForm, syncBuyerEmails } from "@/lib/buyer-emails";
import {
  parseInvoiceLineRowsFromForm,
  replaceBuyerInvoiceLines,
  summarizeInvoiceLines,
} from "@/lib/invoice-lines";
import { financeLockError } from "@/lib/finance/month-lock-context";
import { describeChanges, invoiceActivityLabel, logInvoiceActivity } from "@/lib/invoice-audit";
import { PAYMENT_STATUS_LABEL } from "@/lib/status";
import { formatMoney } from "@/lib/money";
import {
  formField,
  parseInteger,
  parseMoney,
  parseFormDate,
  parseOptionalPersonName,
} from "@/lib/validation";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function dec(formData: FormData, key: string) {
  const parsed = parseMoney(String(formData.get(key) ?? ""), key, false);
  if (!parsed.ok) return Number.NaN;
  return parsed.value;
}

function hasInvalidNumber(...values: Array<number | null | undefined>) {
  return values.some((value) => value != null && Number.isNaN(value));
}

function date(formData: FormData, key: string, label = key) {
  const parsed = parseFormDate(formField(formData, key), label, false);
  return parsed.ok ? parsed.value : null;
}

function enumValue<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

function revalidateLedgers() {
  revalidatePath("/buyers");
  revalidatePath("/publishers");
  revalidatePath("/dashboard");
  revalidatePath("/pnl");
  revalidatePath("/reports");
}

function buyerChanges(
  before: Prisma.BuyerInvoiceGetPayload<object>,
  after: Prisma.BuyerInvoiceGetPayload<object>,
  buyerNames: { before: string; after: string },
) {
  return describeChanges([
    { label: "Buyer", before: buyerNames.before, after: buyerNames.after },
    { label: "Invoice number", before: before.invoiceNumber, after: after.invoiceNumber },
    { label: "Period", before: before.periodLabel, after: after.periodLabel },
    { label: "Due date", before: before.dueDate, after: after.dueDate },
    { label: "Amount due", before: before.receivable, after: after.receivable, money: true },
    { label: "Received", before: before.received, after: after.received, money: true },
    {
      label: "Status",
      before: PAYMENT_STATUS_LABEL[before.paymentStatus],
      after: PAYMENT_STATUS_LABEL[after.paymentStatus],
    },
  ]);
}

function publisherChanges(
  before: Prisma.PublisherInvoiceGetPayload<object>,
  after: Prisma.PublisherInvoiceGetPayload<object>,
  publisherNames: { before: string; after: string },
) {
  return describeChanges([
    { label: "Publisher", before: publisherNames.before, after: publisherNames.after },
    { label: "Invoice number", before: before.invoiceNumber, after: after.invoiceNumber },
    { label: "Period", before: before.periodLabel, after: after.periodLabel },
    { label: "Due date", before: before.dueDate, after: after.dueDate },
    { label: "You owe", before: before.payable, after: after.payable, money: true },
    { label: "Paid", before: before.paid, after: after.paid, money: true },
    {
      label: "Status",
      before: PAYMENT_STATUS_LABEL[before.paymentStatus],
      after: PAYMENT_STATUS_LABEL[after.paymentStatus],
    },
  ]);
}

async function invoiceLockError(
  ctx: { tenantId: string; tenantRole: import("@/lib/roles").TenantRole; platformRole?: string },
  ...dates: Array<Date | null | undefined>
) {
  return financeLockError(ctx.tenantId, ctx, dates);
}

export async function upsertBuyerInvoice(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  const buyerId = str(formData, "buyerId");
  if (!buyerId) return { error: "Choose a buyer." };

  const buyer = await prisma.buyer.findFirst({ where: { id: buyerId, tenantId: ctx.tenantId } });
  if (!buyer) return { error: "Buyer not found." };

  const existing = id
    ? await prisma.buyerInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
    : null;
  if (id && !existing) return { error: "Invoice not found." };

  const lineRows = parseInvoiceLineRowsFromForm(formData);
  if (!lineRows.ok) return { error: lineRows.error };
  const summary = summarizeInvoiceLines(lineRows.value);
  const verticalDefaults = await applyBuyerVerticalDefaults({
    tenantId: ctx.tenantId,
    buyerId,
    verticalId: summary.verticalId,
    fallbackTermsDays: buyer.defaultPaymentTermsDays ?? 7,
    fallbackTerms: buyer.defaultTerms,
  });

  const rateType = enumValue(str(formData, "rateType"), Object.values(RateType), summary.rateType);
  const leadCount = summary.leadCount ?? dec(formData, "leadCount");
  let rate = summary.rate ?? dec(formData, "rate");
  if ((rate == null || Number.isNaN(rate)) && verticalDefaults.rate != null) {
    rate = verticalDefaults.rate;
  }
  const revenueInput = summary.revenue ?? dec(formData, "revenue");
  const receivableInput = dec(formData, "receivable");
  const received = dec(formData, "received");
  const bankCredit = dec(formData, "bankCredit");
  const paymentTermsDaysInput = dec(formData, "paymentTermsDays");
  if (hasInvalidNumber(leadCount, rate, revenueInput, receivableInput, received, bankCredit, paymentTermsDaysInput)) {
    return { error: "Check the amounts and try again." };
  }
  const computed = lineTotal(rateType, leadCount, rate, revenueInput);
  const revenue = revenueInput ?? computed.toNumber();
  const receivable = receivableInput ?? revenue;
  const paymentTermsDays =
    paymentTermsDaysInput ?? verticalDefaults.paymentTermsDays ?? buyer.defaultPaymentTermsDays ?? 7;
  const termsInput = str(formData, "terms");
  const terms = termsInput ?? verticalDefaults.terms ?? formatNetTerms(paymentTermsDays);
  const periodEnd = date(formData, "periodEnd");
  const periodStart = date(formData, "periodStart");
  const invoiceDate = date(formData, "invoiceDate") ?? periodStart ?? periodEnd ?? existing?.invoiceDate ?? null;
  const due =
    date(formData, "dueDate") ??
    (invoiceDate || periodEnd || periodStart
      ? dueDate(invoiceDate ?? periodEnd ?? periodStart ?? new Date(), paymentTermsDays)
      : null);

  const closed = await invoiceLockError(
    ctx,
    invoiceDate,
    periodStart,
    periodEnd,
    due,
    existing?.invoiceDate,
    existing?.periodStart,
    existing?.periodEnd,
    existing?.dueDate,
  );
  if (closed) return { error: closed };

  const paymentStatus = enumValue(str(formData, "paymentStatus"), Object.values(PaymentStatus), PaymentStatus.UNPAID);
  const isPaid = paymentStatus === PaymentStatus.PAID;

  const data = {
    tenantId: ctx.tenantId,
    buyerId,
    verticalId: summary.verticalId,
    periodLabel: str(formData, "periodLabel"),
    periodStart,
    periodEnd,
    invoiceDate,
    dueDate: due,
    leadCount,
    countLabel: str(formData, "countLabel"),
    rateType,
    rate,
    rateLabel: str(formData, "rateLabel"),
    revenue,
    invoiceNumber: str(formData, "invoiceNumber"),
    terms,
    paymentTermsDays,
    paymentStatus,
    invoiceStatus: enumValue(str(formData, "invoiceStatus"), Object.values(InvoiceStatus), InvoiceStatus.NOT_SENT),
    receivable,
    received: isPaid ? settledAmount(received, receivable) : received,
    bankCredit,
    paidAt: date(formData, "paidAt") ?? (isPaid ? (existing?.paidAt ?? new Date()) : null),
    paymentMethod: str(formData, "paymentMethod"),
    comments: summary.comments ?? str(formData, "comments"),
  };

  const verticalNames = async (ids: (string | null)[]) => {
    const named = await prisma.vertical.findMany({
      where: { tenantId: ctx.tenantId, id: { in: ids.filter((value): value is string => Boolean(value)) } },
      select: { id: true, name: true },
    });
    return ids.map((value) => named.find((row) => row.id === value)?.name ?? "None").join(", ");
  };
  const verticalsBefore = existing
    ? await verticalNames(
        (
          await prisma.buyerInvoiceLine.findMany({
            where: { tenantId: ctx.tenantId, buyerInvoiceId: existing.id },
            orderBy: { sortOrder: "asc" },
            select: { verticalId: true },
          })
        ).map((line) => line.verticalId),
      )
    : "";

  const saved = id
    ? await prisma.buyerInvoice.update({ where: { id }, data })
    : await prisma.buyerInvoice.create({ data: { ...data, createdById: ctx.userId } });
  await replaceBuyerInvoiceLines(ctx.tenantId, saved.id, lineRows.value);

  const previousBuyerName =
    existing && existing.buyerId !== buyerId
      ? ((await prisma.buyer.findUnique({ where: { id: existing.buyerId }, select: { name: true } }))?.name ?? "")
      : buyer.name;
  const verticalsAfter = await verticalNames(lineRows.value.map((line) => line.verticalId));
  const changes = existing
    ? [
        describeChanges([{ label: "Verticals", before: verticalsBefore, after: verticalsAfter }]),
        buyerChanges(existing, saved, { before: previousBuyerName, after: buyer.name }),
      ]
        .filter(Boolean)
        .join("; ") || null
    : null;
  if (!existing || changes) {
    await logInvoiceActivity({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      kind: "buyer",
      invoiceId: saved.id,
      invoiceLabel: invoiceActivityLabel({ ...saved, contactName: buyer.name }),
      action: existing ? "EDITED" : "CREATED",
      details: existing ? changes : `Amount due ${formatMoney(Number(saved.receivable))}`,
    });
  }

  const settings = await getFinanceSettings(ctx.tenantId);
  const variance = invoiceVariance(saved.receivable.toString(), saved.received?.toString() ?? 0, settings.varianceToleranceAmount);
  if (saved.received != null && variance.flagged) {
    await notifyReviewers({
      tenantId: ctx.tenantId,
      type: NOTIFICATION.VARIANCE_FLAGGED,
      title: "Buyer invoice variance",
      body: `${variance.amount.toFixed(2)} vs receivable on ${saved.invoiceNumber ?? saved.id}`,
      href: `/buyers/${saved.id}`,
      excludeUserId: ctx.userId,
    });
  }

  revalidateLedgers();
  redirect("/buyers");
}

export async function deleteBuyerInvoice(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return { error: "Invoice not found." };
  const invoice = await prisma.buyerInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { buyer: { select: { name: true } } },
  });
  if (!invoice) return { error: "Invoice not found." };
  const closed = await invoiceLockError(ctx, invoice.periodStart, invoice.periodEnd, invoice.dueDate);
  if (closed) return { error: closed };
  await prisma.buyerInvoice.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  await logInvoiceActivity({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    kind: "buyer",
    invoiceId: invoice.id,
    invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.buyer.name }),
    action: "DELETED",
    details: `Amount due ${formatMoney(Number(invoice.receivable))}`,
  });
  revalidateLedgers();
  redirect("/buyers");
}

export async function bulkDeleteBuyerInvoices(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const ctx = await requireTenantAdmin();
  const ids = [...new Set(formData.getAll("id").map((value) => String(value).trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "Select at least one invoice to delete." };

  const invoices = await prisma.buyerInvoice.findMany({
    where: { tenantId: ctx.tenantId, id: { in: ids } },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      dueDate: true,
      invoiceDate: true,
      invoiceNumber: true,
      periodLabel: true,
      receivable: true,
      buyer: { select: { name: true } },
    },
  });
  if (invoices.length === 0) return { error: "No matching invoices found." };

  for (const invoice of invoices) {
    const closed = await invoiceLockError(
      ctx,
      invoice.periodStart,
      invoice.periodEnd,
      invoice.dueDate,
      invoice.invoiceDate,
    );
    if (closed) return { error: closed };
  }

  await prisma.buyerInvoice.deleteMany({
    where: { tenantId: ctx.tenantId, id: { in: invoices.map((row) => row.id) } },
  });
  for (const invoice of invoices) {
    await logInvoiceActivity({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      kind: "buyer",
      invoiceId: invoice.id,
      invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.buyer.name }),
      action: "DELETED",
      details: `Bulk delete · ${formatMoney(Number(invoice.receivable))}`,
    });
  }
  revalidateLedgers();
  return {
    ok: true,
    message:
      invoices.length === 1
        ? "Deleted 1 invoice."
        : `Deleted ${invoices.length} invoices.`,
  };
}

export async function markBuyerPaid(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  const invoice = await prisma.buyerInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { buyer: { select: { name: true } } },
  });
  if (!invoice) return;
  const closed = await invoiceLockError(ctx, invoice.periodStart, invoice.periodEnd, invoice.dueDate);
  if (closed) return;
  const received = settledAmount(
    dec(formData, "received") ?? (invoice.received == null ? null : Number(invoice.received)),
    Number(invoice.receivable),
  );
  await prisma.buyerInvoice.update({
    where: { id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      received,
      paidAt: date(formData, "paidAt") ?? invoice.paidAt ?? new Date(),
      paymentMethod: str(formData, "paymentMethod") ?? invoice.paymentMethod,
    },
  });
  await logInvoiceActivity({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    kind: "buyer",
    invoiceId: invoice.id,
    invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.buyer.name }),
    action: "PAID",
    details: `Received ${formatMoney(received)} of ${formatMoney(Number(invoice.receivable))}`,
  });
  const settings = await getFinanceSettings(ctx.tenantId);
  const variance = invoiceVariance(invoice.receivable.toString(), received, settings.varianceToleranceAmount);
  if (variance.flagged) {
    await notifyReviewers({
      tenantId: ctx.tenantId,
      type: NOTIFICATION.VARIANCE_FLAGGED,
      title: "Buyer short-pay / overpay",
      body: `Received ${variance.actual.toFixed(2)} vs receivable ${variance.expected.toFixed(2)}`,
      href: `/buyers/${invoice.id}`,
    });
  }
  revalidateLedgers();
}

export async function generateBuyerInvoice(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireTenant();
  if (!canWrite(ctx.tenantRole, ctx.platformRole)) return { error: "You cannot generate invoices." };
  const buyerId = str(formData, "buyerId");
  if (!buyerId) return { error: "Choose a buyer." };

  const buyer = await prisma.buyer.findFirst({ where: { id: buyerId, tenantId: ctx.tenantId } });
  if (!buyer) return { error: "Buyer not found." };

  const buyerEmails = parseBuyerEmailsFromForm(formData);
  if (!buyerEmails.ok) return { error: buyerEmails.error };
  const buyerContact = parseOptionalPersonName(formField(formData, "buyerContact"), "Contact name");
  if (!buyerContact.ok) return { error: buyerContact.error };
  const buyerAddress = str(formData, "buyerAddress") ?? buyer.address;
  const lineRows = parseInvoiceLineRowsFromForm(formData);
  if (!lineRows.ok) return { error: lineRows.error };
  const summary = summarizeInvoiceLines(lineRows.value);
  const verticalDefaults = await applyBuyerVerticalDefaults({
    tenantId: ctx.tenantId,
    buyerId,
    verticalId: summary.verticalId,
    fallbackTermsDays: buyer.defaultPaymentTermsDays ?? 7,
    fallbackTerms: buyer.defaultTerms,
  });

  const netDays = parseInteger(formField(formData, "paymentTermsDays"), "NET days", 0, 365, true);
  if (!netDays.ok || netDays.value == null) {
    return { error: netDays.ok ? "NET days is required." : netDays.error };
  }
  const invoiceDateResult = parseFormDate(formField(formData, "invoiceDate"), "Invoice date", true);
  if (!invoiceDateResult.ok || !invoiceDateResult.value) {
    return { error: invoiceDateResult.ok ? "Invoice date is required." : invoiceDateResult.error };
  }
  const periodStartResult = parseFormDate(formField(formData, "periodStart"), "Period start", false);
  if (!periodStartResult.ok) return { error: periodStartResult.error };
  const periodEndResult = parseFormDate(formField(formData, "periodEnd"), "Period end", false);
  if (!periodEndResult.ok) return { error: periodEndResult.error };
  const dueDateResult = parseFormDate(formField(formData, "dueDate"), "Due date", false);
  if (!dueDateResult.ok) return { error: dueDateResult.error };

  await prisma.$executeRaw`
    UPDATE "Buyer"
    SET
      address = ${buyerAddress},
      "contactName" = ${buyerContact.value ?? buyer.contactName}
    WHERE id = ${buyer.id} AND "tenantId" = ${ctx.tenantId}
  `;
  await syncBuyerEmails(ctx.tenantId, buyer.id, buyerEmails.value);

  const rateType = summary.rateType;
  const revenue = summary.revenue;
  if (!revenue || revenue <= 0) return { error: "Add at least one line with an amount." };
  const receivable = revenue;
  const paymentTermsDays = netDays.value ?? verticalDefaults.paymentTermsDays;
  const terms = str(formData, "terms") ?? verticalDefaults.terms ?? formatNetTerms(paymentTermsDays);
  const invoiceDate = invoiceDateResult.value;
  const periodStart = periodStartResult.value ?? invoiceDate;
  const periodEnd = periodEndResult.value ?? invoiceDate;
  const due = dueDateResult.value ?? dueDate(invoiceDate, paymentTermsDays);
  const closed = await invoiceLockError(ctx, invoiceDate, periodStart, periodEnd, due);
  if (closed) return { error: closed };
  const invoiceNumber = str(formData, "invoiceNumber") ?? (await nextBuyerInvoiceNumber(ctx.tenantId));

  const saved = await prisma.buyerInvoice.create({
    data: {
      tenantId: ctx.tenantId,
      createdById: ctx.userId,
      buyerId,
      verticalId: summary.verticalId,
      periodLabel: str(formData, "periodLabel"),
      periodStart,
      periodEnd,
      invoiceDate,
      dueDate: due,
      leadCount: summary.leadCount,
      rateType,
      rate: summary.rate,
      revenue,
      invoiceNumber,
      terms,
      paymentTermsDays,
      paymentStatus: PaymentStatus.UNPAID,
      invoiceStatus: InvoiceStatus.SENT,
      receivable,
      comments: summary.comments,
    },
  });
  await replaceBuyerInvoiceLines(ctx.tenantId, saved.id, lineRows.value);
  await logInvoiceActivity({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    kind: "buyer",
    invoiceId: saved.id,
    invoiceLabel: invoiceActivityLabel({ ...saved, contactName: buyer.name }),
    action: "CREATED",
    details: `Amount due ${formatMoney(receivable)}`,
  });

  revalidateLedgers();
  redirect(`/invoices/${saved.id}`);
}

export async function markBuyerInvoiceSent(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  const invoice = await prisma.buyerInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { buyer: { select: { name: true } } },
  });
  if (!invoice) return;
  if (await invoiceLockError(ctx, invoice.periodStart, invoice.periodEnd, invoice.dueDate)) return;
  await prisma.buyerInvoice.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: { invoiceStatus: InvoiceStatus.SENT, isDraft: false },
  });
  await logInvoiceActivity({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    kind: "buyer",
    invoiceId: invoice.id,
    invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.buyer.name }),
    action: "SENT",
  });
  revalidateLedgers();
}

export async function upsertPublisherInvoice(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  let publisherId = str(formData, "publisherId");

  // Publishers can create/edit invoices for their own linked contact only.
  if (ctx.tenantRole === "PUBLISHER") {
    if (!ctx.linkedPublisherId) return { error: "Your publisher profile is not linked yet." };
    publisherId = ctx.linkedPublisherId;
  } else if (!canWrite(ctx.tenantRole, ctx.platformRole)) {
    return { error: "You cannot edit invoices." };
  }

  if (!publisherId) return { error: "Choose a publisher." };

  const publisher = await prisma.publisher.findFirst({ where: { id: publisherId, tenantId: ctx.tenantId } });
  if (!publisher) return { error: "Publisher not found." };

  const previous = id
    ? await prisma.publisherInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } })
    : null;
  if (id && !previous) return { error: "Invoice not found." };
  if (previous && ctx.tenantRole === "PUBLISHER" && previous.publisherId !== ctx.linkedPublisherId) {
    return { error: "You can only edit your own invoices." };
  }

  const verticalId = str(formData, "verticalId");
  const verticalDefaults = await applyPublisherVerticalDefaults({
    tenantId: ctx.tenantId,
    publisherId,
    verticalId,
    fallbackTermsDays: publisher.defaultPaymentTermsDays ?? 7,
    fallbackTerms: publisher.defaultTerms,
  });

  const rateType = enumValue(str(formData, "rateType"), Object.values(RateType), verticalDefaults.rateType);
  const leadCount = dec(formData, "leadCount");
  let rate = dec(formData, "rate");
  if ((rate == null || Number.isNaN(rate)) && verticalDefaults.rate != null) {
    rate = verticalDefaults.rate;
  }
  const amountInput = dec(formData, "amount");
  const payableInput = dec(formData, "payable");
  const paidInput = ctx.tenantRole === "PUBLISHER" ? null : dec(formData, "paid");
  const transactionAmount = ctx.tenantRole === "PUBLISHER" ? null : dec(formData, "transactionAmount");
  const paymentTermsDaysInput = dec(formData, "paymentTermsDays");
  if (
    hasInvalidNumber(leadCount, rate, amountInput, payableInput, paidInput, transactionAmount, paymentTermsDaysInput)
  ) {
    return { error: "Check the amounts and try again." };
  }
  const computed = lineTotal(rateType, leadCount, rate, amountInput);
  const amount = amountInput != null && !Number.isNaN(amountInput) ? amountInput : computed.toNumber();
  const payable = payableInput != null && !Number.isNaN(payableInput) ? payableInput : amount;
  const termsInput = str(formData, "terms");
  const paymentTermsDays =
    paymentTermsDaysInput ??
    parsePaymentTermsDays(termsInput, verticalDefaults.paymentTermsDays ?? publisher.defaultPaymentTermsDays);
  const terms = termsInput ?? verticalDefaults.terms ?? formatNetTerms(paymentTermsDays);
  const periodEnd = date(formData, "periodEnd");
  const periodStart = date(formData, "periodStart");
  const invoiceDate = date(formData, "invoiceDate") ?? periodStart ?? periodEnd ?? previous?.invoiceDate ?? null;
  const due =
    date(formData, "dueDate") ??
    (invoiceDate || periodEnd || periodStart
      ? dueDate(invoiceDate ?? periodEnd ?? periodStart ?? new Date(), paymentTermsDays)
      : null);
  const closed = await invoiceLockError(
    ctx,
    invoiceDate,
    periodStart,
    periodEnd,
    due,
    previous?.invoiceDate,
    previous?.periodStart,
    previous?.periodEnd,
    previous?.dueDate,
  );
  if (closed) return { error: closed };
  const paymentStatus =
    ctx.tenantRole === "PUBLISHER"
      ? PaymentStatus.UNPAID
      : enumValue(str(formData, "paymentStatus"), Object.values(PaymentStatus), PaymentStatus.UNPAID);
  const markedPaid =
    ctx.tenantRole !== "PUBLISHER" &&
    paymentStatus === PaymentStatus.PAID &&
    previous?.paymentStatus !== PaymentStatus.PAID;

  const data = {
    tenantId: ctx.tenantId,
    publisherId,
    verticalId,
    monthLabel: str(formData, "monthLabel"),
    weekLabel: str(formData, "weekLabel"),
    periodLabel: str(formData, "periodLabel"),
    periodStart,
    periodEnd,
    invoiceDate,
    dueDate: due,
    leadCount,
    countLabel: str(formData, "countLabel"),
    rateType,
    rate,
    rateLabel: str(formData, "rateLabel"),
    amount,
    invoiceNumber: str(formData, "invoiceNumber"),
    terms,
    paymentTermsDays,
    payable,
    paid:
      paymentStatus === PaymentStatus.PAID
        ? settledAmount(paidInput ?? (previous?.paid ? Number(previous.paid) : null), payable)
        : (paidInput ?? (previous?.paid ? Number(previous.paid) : null)),
    transactionAmount,
    paidAt: date(formData, "paidAt") ?? (markedPaid ? new Date() : previous?.paidAt ?? null),
    paymentMethod: str(formData, "paymentMethod"),
    paymentStatus,
    paidApprovalStatus: markedPaid ? PaidApprovalStatus.PENDING : previous?.paidApprovalStatus,
  };

  const saved = id
    ? await prisma.publisherInvoice.update({ where: { id }, data })
    : await prisma.publisherInvoice.create({ data: { ...data, createdById: ctx.userId } });

  const previousPublisherName =
    previous && previous.publisherId !== publisherId
      ? ((await prisma.publisher.findUnique({ where: { id: previous.publisherId }, select: { name: true } }))?.name ?? "")
      : publisher.name;
  const changes = previous
    ? publisherChanges(previous, saved, { before: previousPublisherName, after: publisher.name })
    : null;
  if (!previous || changes) {
    await logInvoiceActivity({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      kind: "publisher",
      invoiceId: saved.id,
      invoiceLabel: invoiceActivityLabel({ ...saved, contactName: publisher.name }),
      action: previous ? "EDITED" : "CREATED",
      details: previous ? changes : `You owe ${formatMoney(Number(saved.payable))}`,
    });
  }

  if (markedPaid) {
    await notifyReviewers({
      tenantId: ctx.tenantId,
      type: NOTIFICATION.PUBLISHER_PAID_APPROVAL,
      title: "Publisher payment needs approval",
      body: `${publisher.name} marked paid (${Number(saved.paid ?? saved.payable).toFixed(2)}). Please review.`,
      href: `/publishers/${saved.id}`,
      excludeUserId: ctx.userId,
    });
  }

  revalidateLedgers();
  redirect(ctx.tenantRole === "PUBLISHER" ? `/publishers/${saved.id}` : "/publishers");
}

export async function deletePublisherInvoice(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return { error: "Invoice not found." };
  const invoice = await prisma.publisherInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { publisher: { select: { name: true } } },
  });
  if (!invoice) return { error: "Invoice not found." };
  const closed = await invoiceLockError(ctx, invoice.periodStart, invoice.periodEnd, invoice.dueDate);
  if (closed) return { error: closed };
  await prisma.publisherInvoice.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  await logInvoiceActivity({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    kind: "publisher",
    invoiceId: invoice.id,
    invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.publisher.name }),
    action: "DELETED",
    details: `You owe ${formatMoney(Number(invoice.payable))}`,
  });
  revalidateLedgers();
  redirect("/publishers");
}

export async function bulkDeletePublisherInvoices(
  _prev: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const ctx = await requireTenantAdmin();
  const ids = [...new Set(formData.getAll("id").map((value) => String(value).trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "Select at least one payable to delete." };

  const invoices = await prisma.publisherInvoice.findMany({
    where: { tenantId: ctx.tenantId, id: { in: ids } },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      dueDate: true,
      invoiceDate: true,
      invoiceNumber: true,
      periodLabel: true,
      payable: true,
      publisher: { select: { name: true } },
    },
  });
  if (invoices.length === 0) return { error: "No matching payables found." };

  for (const invoice of invoices) {
    const closed = await invoiceLockError(
      ctx,
      invoice.periodStart,
      invoice.periodEnd,
      invoice.dueDate,
      invoice.invoiceDate,
    );
    if (closed) return { error: closed };
  }

  await prisma.publisherInvoice.deleteMany({
    where: { tenantId: ctx.tenantId, id: { in: invoices.map((row) => row.id) } },
  });
  for (const invoice of invoices) {
    await logInvoiceActivity({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      kind: "publisher",
      invoiceId: invoice.id,
      invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.publisher.name }),
      action: "DELETED",
      details: `Bulk delete · ${formatMoney(Number(invoice.payable))}`,
    });
  }
  revalidateLedgers();
  return {
    ok: true,
    message:
      invoices.length === 1
        ? "Deleted 1 payable."
        : `Deleted ${invoices.length} payables.`,
  };
}

export async function markPublisherPaid(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  const invoice = await prisma.publisherInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { publisher: true },
  });
  if (!invoice) return;
  if (await invoiceLockError(ctx, invoice.periodStart, invoice.periodEnd, invoice.dueDate)) return;
  const paid = settledAmount(
    dec(formData, "paid") ?? (invoice.paid == null ? null : Number(invoice.paid)),
    Number(invoice.payable),
  );
  await prisma.publisherInvoice.update({
    where: { id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paid,
      paidAt: date(formData, "paidAt") ?? invoice.paidAt ?? new Date(),
      paymentMethod: str(formData, "paymentMethod") ?? invoice.paymentMethod,
      paidApprovalStatus: PaidApprovalStatus.PENDING,
      paidApprovedAt: null,
      paidApprovedById: null,
    },
  });
  await logInvoiceActivity({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    kind: "publisher",
    invoiceId: invoice.id,
    invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.publisher.name }),
    action: "PAID",
    details: `Paid ${formatMoney(paid)} of ${formatMoney(Number(invoice.payable))}`,
  });
  await notifyReviewers({
    tenantId: ctx.tenantId,
    type: NOTIFICATION.PUBLISHER_PAID_APPROVAL,
    title: "Publisher payment needs approval",
    body: `${invoice.publisher.name} marked paid (${paid.toFixed(2)}). Please review and approve.`,
    href: `/publishers/${invoice.id}`,
    excludeUserId: ctx.userId,
  });
  revalidateLedgers();
}

export async function approvePublisherPayment(formData: FormData) {
  const ctx = await requireTenant();
  if (!canApprovePayments(ctx.tenantRole, ctx.platformRole)) return;
  const id = str(formData, "id");
  const decision = str(formData, "decision");
  if (!id) return;
  const invoice = await prisma.publisherInvoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { publisher: { select: { name: true } } },
  });
  if (!invoice) return;
  if (await invoiceLockError(ctx, invoice.periodStart, invoice.periodEnd, invoice.dueDate)) return;
  const rejected = decision === "reject";
  const { count } = await prisma.publisherInvoice.updateMany({
    where: { id, tenantId: ctx.tenantId, paidApprovalStatus: PaidApprovalStatus.PENDING },
    data: {
      paidApprovalStatus: rejected ? PaidApprovalStatus.REJECTED : PaidApprovalStatus.APPROVED,
      paidApprovedAt: new Date(),
      paidApprovedById: ctx.userId,
    },
  });
  if (count > 0) {
    await logInvoiceActivity({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      kind: "publisher",
      invoiceId: invoice.id,
      invoiceLabel: invoiceActivityLabel({ ...invoice, contactName: invoice.publisher.name }),
      action: rejected ? "REJECTED" : "APPROVED",
      details: invoice.paid == null ? null : `Payment of ${formatMoney(Number(invoice.paid))}`,
    });
  }
  revalidateLedgers();
  revalidatePath("/notifications");
}
