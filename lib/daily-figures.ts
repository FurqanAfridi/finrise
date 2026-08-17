import { randomBytes } from "node:crypto";
import { InvoiceOrigin, InvoiceStatus, PaymentStatus, RateType } from "@prisma/client";
import {
  completedBillingCycles,
  currentBillingCycle,
  cycleKey,
  cycleProgressCopy,
  utcDay,
} from "@/lib/billing-cycle";
import { nextBuyerInvoiceNumber, nextPublisherInvoiceNumber } from "@/lib/company-branding";
import { displayDate, isoDate } from "@/lib/dates";
import { dueDate, formatNetTerms, lineTotal } from "@/lib/finance/invoice";
import { lockedFinanceErrorForDates } from "@/lib/finance/month-lock";
import { formatMoney } from "@/lib/money";
import { NOTIFICATION, notifyReviewers } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

export type DailyOffer = {
  verticalId: string;
  verticalName: string;
  paymentTermsDays: number;
  rate: number | null;
  rateType: RateType;
};

export type DailyFigureRow = {
  id: string;
  figureDate: string;
  verticalId: string;
  verticalName: string;
  quantity: number;
  rate: number | null;
  amount: number;
  billed: boolean;
  notes: string | null;
};

export type CycleSummary = {
  verticalId: string;
  verticalName: string;
  paymentTermsDays: number;
  cycleStart: string;
  cycleEnd: string;
  dayInCycle: number;
  length: number;
  daysRemaining: number;
  isLastDay: boolean;
  unbilledQuantity: number;
  unbilledAmount: number;
  progressCopy: string;
  draftReady: boolean;
};

export type DailyFiguresBoard = {
  kind: "buyer" | "publisher";
  contactId: string;
  contactName: string;
  contractStartDate: string | null;
  defaultNetDays: number;
  offers: DailyOffer[];
  figures: DailyFigureRow[];
  cycles: CycleSummary[];
  missingYesterday: boolean;
  averagePerDay: number;
  unbilledTotal: number;
};

function toOffer(row: {
  verticalId: string;
  paymentTermsDays: number;
  rate: { toString(): string } | number | null;
  rateType: RateType;
  vertical: { name: string };
}): DailyOffer {
  return {
    verticalId: row.verticalId,
    verticalName: row.vertical.name,
    paymentTermsDays: row.paymentTermsDays,
    rate: row.rate == null ? null : Number(row.rate),
    rateType: row.rateType,
  };
}

export async function getDailyFiguresBoard(
  tenantId: string,
  kind: "buyer" | "publisher",
  contactId: string,
): Promise<DailyFiguresBoard | null> {
  const since = utcDay(new Date());
  since.setUTCDate(since.getUTCDate() - 21);

  if (kind === "buyer") {
    const buyer = await prisma.buyer.findFirst({
      where: { id: contactId, tenantId },
      include: {
        verticalOffers: { include: { vertical: { select: { name: true } } }, orderBy: { vertical: { name: "asc" } } },
        dailyFigures: {
          where: { figureDate: { gte: since } },
          include: { vertical: { select: { name: true } } },
          orderBy: [{ figureDate: "desc" }, { vertical: { name: "asc" } }],
        },
      },
    });
    if (!buyer) return null;
    const offers = buyer.verticalOffers.map(toOffer);
    const figures = buyer.dailyFigures.map((row) => ({
      id: row.id,
      figureDate: isoDate(row.figureDate),
      verticalId: row.verticalId,
      verticalName: row.vertical.name,
      quantity: num(row.quantity),
      rate: row.rate == null ? null : num(row.rate),
      amount: num(row.amount),
      billed: Boolean(row.buyerInvoiceId),
      notes: row.notes,
    }));
    return assembleBoard("buyer", buyer.id, buyer.name, buyer.contractStartDate, buyer.defaultPaymentTermsDays, offers, figures);
  }

  const publisher = await prisma.publisher.findFirst({
    where: { id: contactId, tenantId },
    include: {
      verticalOffers: { include: { vertical: { select: { name: true } } }, orderBy: { vertical: { name: "asc" } } },
      dailyFigures: {
        where: { figureDate: { gte: since } },
        include: { vertical: { select: { name: true } } },
        orderBy: [{ figureDate: "desc" }, { vertical: { name: "asc" } }],
      },
    },
  });
  if (!publisher) return null;
  const offers = publisher.verticalOffers.map(toOffer);
  const figures = publisher.dailyFigures.map((row) => ({
    id: row.id,
    figureDate: isoDate(row.figureDate),
    verticalId: row.verticalId,
    verticalName: row.vertical.name,
    quantity: num(row.quantity),
    rate: row.rate == null ? null : num(row.rate),
    amount: num(row.amount),
    billed: Boolean(row.publisherInvoiceId),
    notes: row.notes,
  }));
  return assembleBoard(
    "publisher",
    publisher.id,
    publisher.name,
    publisher.contractStartDate,
    publisher.defaultPaymentTermsDays,
    offers,
    figures,
  );
}

function assembleBoard(
  kind: "buyer" | "publisher",
  contactId: string,
  contactName: string,
  contractStartDate: Date | null,
  defaultNetDays: number,
  offers: DailyOffer[],
  figures: DailyFigureRow[],
): DailyFiguresBoard {
  const today = isoDate(new Date());
  const yesterday = isoDate(addDaysIso(today, -1));
  const unbilled = figures.filter((row) => !row.billed);
  const cycles = offers.map((offer) => {
    const netDays = offer.paymentTermsDays || defaultNetDays;
    const start = contractStartDate ?? new Date();
    const cycle = currentBillingCycle(start, netDays);
    const inCycle = unbilled.filter(
      (row) =>
        row.verticalId === offer.verticalId &&
        row.figureDate >= isoDate(cycle.start) &&
        row.figureDate <= isoDate(cycle.end),
    );
    const unbilledQuantity = inCycle.reduce((sum, row) => sum + row.quantity, 0);
    const unbilledAmount = inCycle.reduce((sum, row) => sum + row.amount, 0);
    const olderUnbilled = unbilled.filter(
      (row) => row.verticalId === offer.verticalId && row.figureDate < isoDate(cycle.start) && row.amount > 0,
    );
    return {
      verticalId: offer.verticalId,
      verticalName: offer.verticalName,
      paymentTermsDays: netDays,
      cycleStart: isoDate(cycle.start),
      cycleEnd: isoDate(cycle.end),
      dayInCycle: cycle.dayInCycle,
      length: cycle.length,
      daysRemaining: cycle.daysRemaining,
      isLastDay: cycle.isLastDay,
      unbilledQuantity,
      unbilledAmount,
      progressCopy: cycleProgressCopy(kind, cycle, offer.verticalName),
      draftReady: olderUnbilled.length > 0,
    };
  });
  const recent = figures.filter((row) => row.figureDate >= addDaysIso(today, -6));
  const dayCount = new Set(recent.map((row) => row.figureDate)).size || 1;
  return {
    kind,
    contactId,
    contactName,
    contractStartDate: contractStartDate ? isoDate(contractStartDate) : null,
    defaultNetDays,
    offers,
    figures,
    cycles,
    missingYesterday: offers.length > 0 && !figures.some((row) => row.figureDate === yesterday),
    averagePerDay: recent.reduce((sum, row) => sum + row.quantity, 0) / dayCount,
    unbilledTotal: unbilled.reduce((sum, row) => sum + row.amount, 0),
  };
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export async function upsertDailyFigure(input: {
  tenantId: string;
  kind: "buyer" | "publisher";
  contactId: string;
  verticalId: string;
  figureDate: Date;
  quantity: number;
  notes: string | null;
}) {
  const locked = lockedFinanceErrorForDates([input.figureDate]);
  if (locked) return { ok: false as const, error: locked };
  const day = utcDay(input.figureDate);

  if (input.kind === "buyer") {
    const offer = await prisma.buyerVertical.findFirst({
      where: { tenantId: input.tenantId, buyerId: input.contactId, verticalId: input.verticalId },
    });
    if (!offer) return { ok: false as const, error: "Choose a vertical this buyer already has." };
    const existing = await prisma.buyerDailyFigure.findFirst({
      where: { buyerId: input.contactId, verticalId: input.verticalId, figureDate: day },
    });
    if (existing?.buyerInvoiceId) return { ok: false as const, error: "That day is already on a draft invoice." };
    const rate = offer.rate == null ? null : Number(offer.rate);
    const amount = lineTotal(offer.rateType, input.quantity, rate, null).toNumber();
    const data = {
      tenantId: input.tenantId,
      buyerId: input.contactId,
      verticalId: input.verticalId,
      figureDate: day,
      quantity: input.quantity,
      rate,
      rateType: offer.rateType,
      amount,
      notes: input.notes,
    };
    if (existing) {
      await prisma.buyerDailyFigure.update({ where: { id: existing.id }, data });
    } else {
      await prisma.buyerDailyFigure.create({ data: { id: cuidLike(), ...data } });
    }
    return { ok: true as const, amount };
  }

  const offer = await prisma.publisherVertical.findFirst({
    where: { tenantId: input.tenantId, publisherId: input.contactId, verticalId: input.verticalId },
  });
  if (!offer) return { ok: false as const, error: "Choose a vertical this publisher already has." };
  const existing = await prisma.publisherDailyFigure.findFirst({
    where: { publisherId: input.contactId, verticalId: input.verticalId, figureDate: day },
  });
  if (existing?.publisherInvoiceId) return { ok: false as const, error: "That day is already on a draft payable." };
  const rate = offer.rate == null ? null : Number(offer.rate);
  const amount = lineTotal(offer.rateType, input.quantity, rate, null).toNumber();
  const data = {
    tenantId: input.tenantId,
    publisherId: input.contactId,
    verticalId: input.verticalId,
    figureDate: day,
    quantity: input.quantity,
    rate,
    rateType: offer.rateType,
    amount,
    notes: input.notes,
  };
  if (existing) {
    await prisma.publisherDailyFigure.update({ where: { id: existing.id }, data });
  } else {
    await prisma.publisherDailyFigure.create({ data: { id: cuidLike(), ...data } });
  }
  return { ok: true as const, amount };
}

export async function copyYesterdayFigures(tenantId: string, kind: "buyer" | "publisher", contactId: string) {
  const today = utcDay(new Date());
  const yesterday = utcDay(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  let copied = 0;

  if (kind === "buyer") {
    const rows = await prisma.buyerDailyFigure.findMany({
      where: { tenantId, buyerId: contactId, figureDate: yesterday },
    });
    for (const row of rows) {
      const already = await prisma.buyerDailyFigure.findFirst({
        where: { buyerId: contactId, verticalId: row.verticalId, figureDate: today },
      });
      if (already) continue;
      const result = await upsertDailyFigure({
        tenantId,
        kind: "buyer",
        contactId,
        verticalId: row.verticalId,
        figureDate: today,
        quantity: Number(row.quantity),
        notes: row.notes,
      });
      if (result.ok) copied += 1;
    }
    return copied;
  }

  const rows = await prisma.publisherDailyFigure.findMany({
    where: { tenantId, publisherId: contactId, figureDate: yesterday },
  });
  for (const row of rows) {
    const already = await prisma.publisherDailyFigure.findFirst({
      where: { publisherId: contactId, verticalId: row.verticalId, figureDate: today },
    });
    if (already) continue;
    const result = await upsertDailyFigure({
      tenantId,
      kind: "publisher",
      contactId,
      verticalId: row.verticalId,
      figureDate: today,
      quantity: Number(row.quantity),
      notes: row.notes,
    });
    if (result.ok) copied += 1;
  }
  return copied;
}

export async function removeDailyFigure(tenantId: string, kind: "buyer" | "publisher", figureId: string) {
  if (kind === "buyer") {
    const row = await prisma.buyerDailyFigure.findFirst({ where: { id: figureId, tenantId } });
    if (!row) return { ok: false as const, error: "Figure not found." };
    if (row.buyerInvoiceId) return { ok: false as const, error: "This day is already on an invoice." };
    const locked = lockedFinanceErrorForDates([row.figureDate]);
    if (locked) return { ok: false as const, error: locked };
    await prisma.buyerDailyFigure.delete({ where: { id: row.id } });
    return { ok: true as const };
  }
  const row = await prisma.publisherDailyFigure.findFirst({ where: { id: figureId, tenantId } });
  if (!row) return { ok: false as const, error: "Figure not found." };
  if (row.publisherInvoiceId) return { ok: false as const, error: "This day is already on a payable." };
  const locked = lockedFinanceErrorForDates([row.figureDate]);
  if (locked) return { ok: false as const, error: locked };
  await prisma.publisherDailyFigure.delete({ where: { id: row.id } });
  return { ok: true as const };
}

export async function generateDueDraftInvoices(tenantId: string, contact?: { kind: "buyer" | "publisher"; id: string }) {
  const created: string[] = [];
  const buyers = await prisma.buyer.findMany({
    where: {
      tenantId,
      isActive: true,
      contractStartDate: { not: null },
      ...(contact?.kind === "buyer" ? { id: contact.id } : contact ? { id: "__none__" } : {}),
    },
    include: { verticalOffers: { include: { vertical: { select: { name: true } } } } },
  });
  for (const buyer of buyers) {
    if (!buyer.contractStartDate) continue;
    for (const offer of buyer.verticalOffers) {
      const cycles = completedBillingCycles(buyer.contractStartDate, offer.paymentTermsDays || buyer.defaultPaymentTermsDays).slice(-6);
      for (const cycle of cycles) {
        const key = cycleKey("buyer", buyer.id, offer.verticalId, cycle.start);
        const exists = await prisma.buyerInvoice.findFirst({ where: { tenantId, cycleKey: key } });
        if (exists) continue;
        const figures = await prisma.buyerDailyFigure.findMany({
          where: {
            tenantId,
            buyerId: buyer.id,
            verticalId: offer.verticalId,
            buyerInvoiceId: null,
            figureDate: { gte: cycle.start, lte: cycle.end },
          },
        });
        if (figures.length === 0) continue;
        const quantity = figures.reduce((sum, row) => sum + Number(row.quantity), 0);
        const amount = figures.reduce((sum, row) => sum + Number(row.amount), 0);
        if (amount <= 0) continue;
        const locked = lockedFinanceErrorForDates([cycle.end]);
        if (locked) continue;
        const invoiceDate = utcDay(new Date());
        const invoice = await prisma.buyerInvoice.create({
          data: {
            id: cuidLike(),
            tenantId,
            buyerId: buyer.id,
            verticalId: offer.verticalId,
            periodStart: cycle.start,
            periodEnd: cycle.end,
            periodLabel: `${displayDate(cycle.start)} to ${displayDate(cycle.end)}`,
            invoiceDate,
            dueDate: dueDate(invoiceDate, offer.paymentTermsDays || buyer.defaultPaymentTermsDays),
            leadCount: quantity,
            countLabel: "calls / leads",
            rateType: offer.rateType,
            rate: offer.rate,
            revenue: amount,
            receivable: amount,
            invoiceNumber: await nextBuyerInvoiceNumber(tenantId),
            terms: offer.terms ?? formatNetTerms(offer.paymentTermsDays || buyer.defaultPaymentTermsDays),
            paymentTermsDays: offer.paymentTermsDays || buyer.defaultPaymentTermsDays,
            paymentStatus: PaymentStatus.UNPAID,
            invoiceStatus: InvoiceStatus.NOT_SENT,
            isDraft: true,
            origin: InvoiceOrigin.DAILY_CYCLE,
            cycleKey: key,
            comments: `Draft from daily figures for ${offer.vertical.name}. Review before sending.`,
          },
        });
        await prisma.buyerDailyFigure.updateMany({
          where: { id: { in: figures.map((row) => row.id) } },
          data: { buyerInvoiceId: invoice.id },
        });
        created.push(invoice.id);
        await notifyReviewers({
          tenantId,
          type: NOTIFICATION.DRAFT_INVOICE,
          title: `Draft invoice ready for ${buyer.name}`,
          body: `${offer.vertical.name} · ${formatMoney(amount)} from ${displayDate(cycle.start)} to ${displayDate(cycle.end)}`,
          href: `/invoices/${invoice.id}`,
        });
      }
    }
  }

  const publishers = await prisma.publisher.findMany({
    where: {
      tenantId,
      isActive: true,
      contractStartDate: { not: null },
      ...(contact?.kind === "publisher" ? { id: contact.id } : contact ? { id: "__none__" } : {}),
    },
    include: { verticalOffers: { include: { vertical: { select: { name: true } } } } },
  });
  for (const publisher of publishers) {
    if (!publisher.contractStartDate) continue;
    for (const offer of publisher.verticalOffers) {
      const cycles = completedBillingCycles(
        publisher.contractStartDate,
        offer.paymentTermsDays || publisher.defaultPaymentTermsDays,
      ).slice(-6);
      for (const cycle of cycles) {
        const key = cycleKey("publisher", publisher.id, offer.verticalId, cycle.start);
        const exists = await prisma.publisherInvoice.findFirst({ where: { tenantId, cycleKey: key } });
        if (exists) continue;
        const figures = await prisma.publisherDailyFigure.findMany({
          where: {
            tenantId,
            publisherId: publisher.id,
            verticalId: offer.verticalId,
            publisherInvoiceId: null,
            figureDate: { gte: cycle.start, lte: cycle.end },
          },
        });
        if (figures.length === 0) continue;
        const quantity = figures.reduce((sum, row) => sum + Number(row.quantity), 0);
        const amount = figures.reduce((sum, row) => sum + Number(row.amount), 0);
        if (amount <= 0) continue;
        const locked = lockedFinanceErrorForDates([cycle.end]);
        if (locked) continue;
        const invoiceDate = utcDay(new Date());
        const invoice = await prisma.publisherInvoice.create({
          data: {
            id: cuidLike(),
            tenantId,
            publisherId: publisher.id,
            verticalId: offer.verticalId,
            periodStart: cycle.start,
            periodEnd: cycle.end,
            periodLabel: `${displayDate(cycle.start)} to ${displayDate(cycle.end)}`,
            invoiceDate,
            dueDate: dueDate(invoiceDate, offer.paymentTermsDays || publisher.defaultPaymentTermsDays),
            leadCount: quantity,
            countLabel: "calls / leads",
            rateType: offer.rateType,
            rate: offer.rate,
            amount,
            payable: amount,
            invoiceNumber: await nextPublisherInvoiceNumber(tenantId),
            terms: offer.terms ?? formatNetTerms(offer.paymentTermsDays || publisher.defaultPaymentTermsDays),
            paymentTermsDays: offer.paymentTermsDays || publisher.defaultPaymentTermsDays,
            paymentStatus: PaymentStatus.UNPAID,
            isDraft: true,
            origin: InvoiceOrigin.DAILY_CYCLE,
            cycleKey: key,
          },
        });
        await prisma.publisherDailyFigure.updateMany({
          where: { id: { in: figures.map((row) => row.id) } },
          data: { publisherInvoiceId: invoice.id },
        });
        created.push(invoice.id);
        await notifyReviewers({
          tenantId,
          type: NOTIFICATION.DRAFT_PAYABLE,
          title: `Draft payable ready for ${publisher.name}`,
          body: `${offer.vertical.name} · ${formatMoney(amount)} from ${displayDate(cycle.start)} to ${displayDate(cycle.end)}`,
          href: `/publishers/${invoice.id}`,
        });
      }
    }
  }

  return created;
}

export type DailyLogContact = {
  id: string;
  name: string;
  verticals: { id: string; name: string; rate: number | null; rateType: RateType }[];
};

export type DailyLogEntry = {
  id: string;
  figureId: string;
  date: string;
  kind: "buyer" | "publisher";
  contactId: string;
  contactName: string;
  verticalId: string;
  verticalName: string;
  quantity: number;
  amount: number;
  rate: number | null;
  rateType: RateType;
  billed: boolean;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceHref: string | null;
  invoiceIsDraft: boolean;
  contactHref: string;
};

export type DailyFigureLogFilters = {
  from: Date;
  to: Date;
  contactId?: string;
  verticalId?: string;
  status?: "invoiced" | "unbilled";
};

export type DailyFigureLog = {
  entries: DailyLogEntry[];
  contacts: DailyLogContact[];
  totalAmount: number;
  totalQuantity: number;
};

function billedWhere(status: DailyFigureLogFilters["status"], invoiceField: "buyerInvoiceId" | "publisherInvoiceId") {
  if (status === "invoiced") return { [invoiceField]: { not: null } };
  if (status === "unbilled") return { [invoiceField]: null };
  return {};
}

export async function listDailyFigureLog(
  tenantId: string,
  kind: "buyer" | "publisher",
  filters: DailyFigureLogFilters,
): Promise<DailyFigureLog> {
  const fromDay = utcDay(filters.from);
  const toDay = utcDay(filters.to);
  const contactId = filters.contactId?.trim() || undefined;
  const verticalId = filters.verticalId?.trim() || undefined;

  if (kind === "buyer") {
    const [buyers, figures] = await Promise.all([
      prisma.buyer.findMany({
        where: { tenantId, isActive: true, verticalOffers: { some: {} } },
        include: {
          verticalOffers: {
            include: { vertical: { select: { name: true } } },
            orderBy: { vertical: { name: "asc" } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.buyerDailyFigure.findMany({
        where: {
          tenantId,
          figureDate: { gte: fromDay, lte: toDay },
          ...(verticalId ? { verticalId } : {}),
          ...(contactId ? { buyerId: contactId } : {}),
          ...billedWhere(filters.status, "buyerInvoiceId"),
        },
        include: {
          buyer: { select: { name: true } },
          vertical: { select: { name: true } },
          invoice: { select: { id: true, invoiceNumber: true, isDraft: true } },
        },
        orderBy: [{ figureDate: "desc" }, { buyer: { name: "asc" } }, { vertical: { name: "asc" } }],
      }),
    ]);
    const contacts: DailyLogContact[] = buyers.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
      verticals: buyer.verticalOffers.map((offer) => ({
        id: offer.verticalId,
        name: offer.vertical.name,
        rate: offer.rate == null ? null : Number(offer.rate),
        rateType: offer.rateType,
      })),
    }));
    const entries: DailyLogEntry[] = figures.map((row) => ({
      id: row.id,
      figureId: row.id,
      date: isoDate(row.figureDate),
      kind: "buyer" as const,
      contactId: row.buyerId,
      contactName: row.buyer.name,
      verticalId: row.verticalId,
      verticalName: row.vertical.name,
      quantity: num(row.quantity),
      amount: num(row.amount),
      rate: row.rate == null ? null : num(row.rate),
      rateType: row.rateType,
      billed: Boolean(row.buyerInvoiceId),
      invoiceId: row.invoice?.id ?? null,
      invoiceNumber: row.invoice?.invoiceNumber ?? null,
      invoiceHref: row.invoice ? `/buyers/${row.invoice.id}` : null,
      invoiceIsDraft: Boolean(row.invoice?.isDraft),
      contactHref: `/directory/buyers/${row.buyerId}`,
    }));
    return summarizeLog(entries, contacts);
  }

  const [publishers, figures] = await Promise.all([
    prisma.publisher.findMany({
      where: { tenantId, isActive: true, verticalOffers: { some: {} } },
      include: {
        verticalOffers: {
          include: { vertical: { select: { name: true } } },
          orderBy: { vertical: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.publisherDailyFigure.findMany({
      where: {
        tenantId,
        figureDate: { gte: fromDay, lte: toDay },
        ...(verticalId ? { verticalId } : {}),
        ...(contactId ? { publisherId: contactId } : {}),
        ...billedWhere(filters.status, "publisherInvoiceId"),
      },
      include: {
        publisher: { select: { name: true } },
        vertical: { select: { name: true } },
        invoice: { select: { id: true, invoiceNumber: true, isDraft: true } },
      },
      orderBy: [{ figureDate: "desc" }, { publisher: { name: "asc" } }, { vertical: { name: "asc" } }],
    }),
  ]);
  const contacts: DailyLogContact[] = publishers.map((publisher) => ({
    id: publisher.id,
    name: publisher.name,
    verticals: publisher.verticalOffers.map((offer) => ({
      id: offer.verticalId,
      name: offer.vertical.name,
      rate: offer.rate == null ? null : Number(offer.rate),
      rateType: offer.rateType,
    })),
  }));
  const entries: DailyLogEntry[] = figures.map((row) => ({
    id: row.id,
    figureId: row.id,
    date: isoDate(row.figureDate),
    kind: "publisher" as const,
    contactId: row.publisherId,
    contactName: row.publisher.name,
    verticalId: row.verticalId,
    verticalName: row.vertical.name,
    quantity: num(row.quantity),
    amount: num(row.amount),
    rate: row.rate == null ? null : num(row.rate),
    rateType: row.rateType,
    billed: Boolean(row.publisherInvoiceId),
    invoiceId: row.invoice?.id ?? null,
    invoiceNumber: row.invoice?.invoiceNumber ?? null,
    invoiceHref: row.invoice ? `/publishers/${row.invoice.id}` : null,
    invoiceIsDraft: Boolean(row.invoice?.isDraft),
    contactHref: `/directory/publishers/${row.publisherId}`,
  }));
  return summarizeLog(entries, contacts);
}

function summarizeLog(entries: DailyLogEntry[], contacts: DailyLogContact[]): DailyFigureLog {
  return {
    entries,
    contacts,
    totalAmount: entries.reduce((sum, row) => sum + row.amount, 0),
    totalQuantity: entries.reduce((sum, row) => sum + row.quantity, 0),
  };
}
