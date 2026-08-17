"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceStatus, PaidApprovalStatus, PaymentStatus, RateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenant, canApprovePayments, canWrite } from "@/lib/tenant";
import { dueDate, formatNetTerms, lineTotal, parsePaymentTermsDays } from "@/lib/finance/invoice";
import { invoiceVariance } from "@/lib/finance/variance";
import { getFinanceSettings } from "@/lib/finance/queries";
import { NOTIFICATION, notifyReviewers } from "@/lib/notifications";
import { nextBuyerInvoiceNumber } from "@/lib/company-branding";
import { applyBuyerVerticalDefaults, applyPublisherVerticalDefaults } from "@/lib/contact-verticals";
import { lockedFinanceErrorForDates } from "@/lib/finance/month-lock";
import {
  formField,
  parseEmail,
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

function invoiceLockError(...dates: Array<Date | null | undefined>) {
  return lockedFinanceErrorForDates(dates);
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

  const verticalId = str(formData, "verticalId");
  const verticalDefaults = await applyBuyerVerticalDefaults({
    tenantId: ctx.tenantId,
    buyerId,
    verticalId,
    fallbackTermsDays: buyer.defaultPaymentTermsDays ?? 7,
    fallbackTerms: buyer.defaultTerms,
  });

  const rateType = enumValue(str(formData, "rateType"), Object.values(RateType), verticalDefaults.rateType);
  const leadCount = dec(formData, "leadCount");
  let rate = dec(formData, "rate");
  if ((rate == null || Number.isNaN(rate)) && verticalDefaults.rate != null) {
    rate = verticalDefaults.rate;
  }
  const revenueInput = dec(formData, "revenue");
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

  const closed = invoiceLockError(
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

  const data = {
    tenantId: ctx.tenantId,
    buyerId,
    verticalId,
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
    paymentStatus: enumValue(str(formData, "paymentStatus"), Object.values(PaymentStatus), PaymentStatus.UNPAID),
    invoiceStatus: enumValue(str(formData, "invoiceStatus"), Object.values(InvoiceStatus), InvoiceStatus.NOT_SENT),
    receivable,
    received,
    bankCredit,
    paidAt: date(formData, "paidAt"),
    paymentMethod: str(formData, "paymentMethod"),
    comments: str(formData, "comments"),
  };

  const saved = id
    ? await prisma.buyerInvoice.update({ where: { id }, data })
    : await prisma.buyerInvoice.create({ data });

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
  const invoice = await prisma.buyerInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) return { error: "Invoice not found." };
  const closed = invoiceLockError(invoice.periodStart, invoice.periodEnd, invoice.dueDate);
  if (closed) return { error: closed };
  await prisma.buyerInvoice.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidateLedgers();
  redirect("/buyers");
}

export async function markBuyerPaid(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  const invoice = await prisma.buyerInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) return;
  const closed = invoiceLockError(invoice.periodStart, invoice.periodEnd, invoice.dueDate);
  if (closed) return;
  const received = dec(formData, "received") ?? Number(invoice.received ?? invoice.receivable);
  await prisma.buyerInvoice.update({
    where: { id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      received,
      paidAt: date(formData, "paidAt") ?? invoice.paidAt ?? new Date(),
      paymentMethod: str(formData, "paymentMethod") ?? invoice.paymentMethod,
    },
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

  const buyerEmail = parseEmail(formField(formData, "buyerEmail"), false);
  if (!buyerEmail.ok) return { error: buyerEmail.error };
  const buyerContact = parseOptionalPersonName(formField(formData, "buyerContact"), "Contact name");
  if (!buyerContact.ok) return { error: buyerContact.error };
  const buyerAddress = str(formData, "buyerAddress") ?? buyer.address;
  const verticalId = str(formData, "verticalId");
  const verticalDefaults = await applyBuyerVerticalDefaults({
    tenantId: ctx.tenantId,
    buyerId,
    verticalId,
    fallbackTermsDays: buyer.defaultPaymentTermsDays ?? 7,
    fallbackTerms: buyer.defaultTerms,
  });

  const leadCount = parseInteger(formField(formData, "leadCount"), "Quantity", 0, 1_000_000, false);
  if (!leadCount.ok) return { error: leadCount.error };
  const rateParsed = parseMoney(formField(formData, "rate"), "Rate", false);
  if (!rateParsed.ok) return { error: rateParsed.error };
  const rateValue =
    rateParsed.value == null || rateParsed.value === 0
      ? verticalDefaults.rate ?? rateParsed.value
      : rateParsed.value;
  const amount = parseMoney(formField(formData, "revenue"), "Amount", false);
  if (!amount.ok) return { error: amount.error };
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
      email = ${buyerEmail.value ?? buyer.email},
      address = ${buyerAddress},
      "contactName" = ${buyerContact.value ?? buyer.contactName}
    WHERE id = ${buyer.id} AND "tenantId" = ${ctx.tenantId}
  `;

  const rateType = enumValue(str(formData, "rateType"), Object.values(RateType), verticalDefaults.rateType);
  const revenueFromForm = amount.value;
  const computedRevenue = lineTotal(rateType, leadCount.value, rateValue, revenueFromForm).toNumber();
  const revenue = revenueFromForm && revenueFromForm > 0 ? revenueFromForm : computedRevenue;
  if (!revenue || revenue <= 0) return { error: "Enter lead count and rate, or set the amount." };
  const receivable = revenue;
  const paymentTermsDays = netDays.value ?? verticalDefaults.paymentTermsDays;
  const terms = str(formData, "terms") ?? verticalDefaults.terms ?? formatNetTerms(paymentTermsDays);
  const invoiceDate = invoiceDateResult.value;
  const periodStart = periodStartResult.value ?? invoiceDate;
  const periodEnd = periodEndResult.value ?? invoiceDate;
  const due = dueDateResult.value ?? dueDate(invoiceDate, paymentTermsDays);
  const closed = invoiceLockError(invoiceDate, periodStart, periodEnd, due);
  if (closed) return { error: closed };
  const invoiceNumber = str(formData, "invoiceNumber") ?? (await nextBuyerInvoiceNumber(ctx.tenantId));

  const saved = await prisma.buyerInvoice.create({
    data: {
      tenantId: ctx.tenantId,
      buyerId,
      verticalId,
      periodLabel: str(formData, "periodLabel"),
      periodStart,
      periodEnd,
      invoiceDate,
      dueDate: due,
      leadCount: leadCount.value,
      rateType,
      rate: rateValue,
      revenue,
      invoiceNumber,
      terms,
      paymentTermsDays,
      paymentStatus: PaymentStatus.UNPAID,
      invoiceStatus: InvoiceStatus.SENT,
      receivable,
      comments: str(formData, "comments"),
    },
  });

  revalidateLedgers();
  redirect(`/invoices/${saved.id}`);
}

export async function markBuyerInvoiceSent(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  const invoice = await prisma.buyerInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) return;
  if (invoiceLockError(invoice.periodStart, invoice.periodEnd, invoice.dueDate)) return;
  await prisma.buyerInvoice.updateMany({
    where: { id, tenantId: ctx.tenantId },
      data: { invoiceStatus: InvoiceStatus.SENT, isDraft: false },
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
  const closed = invoiceLockError(
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
    paid: paidInput ?? (markedPaid ? payable : previous?.paid ? Number(previous.paid) : null),
    transactionAmount,
    paidAt: date(formData, "paidAt") ?? (markedPaid ? new Date() : previous?.paidAt ?? null),
    paymentMethod: str(formData, "paymentMethod"),
    paymentStatus,
    paidApprovalStatus: markedPaid ? PaidApprovalStatus.PENDING : previous?.paidApprovalStatus,
  };

  const saved = id
    ? await prisma.publisherInvoice.update({ where: { id }, data })
    : await prisma.publisherInvoice.create({ data });

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
  const invoice = await prisma.publisherInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) return { error: "Invoice not found." };
  const closed = invoiceLockError(invoice.periodStart, invoice.periodEnd, invoice.dueDate);
  if (closed) return { error: closed };
  await prisma.publisherInvoice.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidateLedgers();
  redirect("/publishers");
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
  if (invoiceLockError(invoice.periodStart, invoice.periodEnd, invoice.dueDate)) return;
  const paid = dec(formData, "paid") ?? Number(invoice.paid ?? invoice.payable);
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
  const invoice = await prisma.publisherInvoice.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!invoice) return;
  if (invoiceLockError(invoice.periodStart, invoice.periodEnd, invoice.dueDate)) return;
  await prisma.publisherInvoice.updateMany({
    where: { id, tenantId: ctx.tenantId, paidApprovalStatus: PaidApprovalStatus.PENDING },
    data: {
      paidApprovalStatus: decision === "reject" ? PaidApprovalStatus.REJECTED : PaidApprovalStatus.APPROVED,
      paidApprovedAt: new Date(),
      paidApprovedById: ctx.userId,
    },
  });
  revalidateLedgers();
  revalidatePath("/notifications");
}
