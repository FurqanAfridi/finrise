import { randomBytes } from "node:crypto";
import { RateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatNetTerms } from "@/lib/finance/invoice";
import {
  formField,
  parseInteger,
  parseMoney,
  parseOptionalText,
} from "@/lib/validation";
import { parseRateType } from "@/lib/status";

export type ContactVerticalOffer = {
  id: string;
  verticalId: string;
  verticalName: string;
  paymentTermsDays: number;
  terms: string | null;
  rate: string | null;
  rateType: RateType;
  rateLabel: string | null;
};

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

export async function listBuyerVerticalOffers(tenantId: string, buyerId: string) {
  const rows = await prisma.buyerVertical.findMany({
    where: { tenantId, buyerId },
    include: { vertical: { select: { name: true } } },
    orderBy: { vertical: { name: "asc" } },
  });
  return rows.map((row) => ({
    id: row.id,
    verticalId: row.verticalId,
    verticalName: row.vertical.name,
    paymentTermsDays: row.paymentTermsDays,
    terms: row.terms,
    rate: row.rate?.toString() ?? null,
    rateType: row.rateType,
    rateLabel: row.rateLabel,
  })) satisfies ContactVerticalOffer[];
}

export async function listPublisherVerticalOffers(tenantId: string, publisherId: string) {
  const rows = await prisma.publisherVertical.findMany({
    where: { tenantId, publisherId },
    include: { vertical: { select: { name: true } } },
    orderBy: { vertical: { name: "asc" } },
  });
  return rows.map((row) => ({
    id: row.id,
    verticalId: row.verticalId,
    verticalName: row.vertical.name,
    paymentTermsDays: row.paymentTermsDays,
    terms: row.terms,
    rate: row.rate?.toString() ?? null,
    rateType: row.rateType,
    rateLabel: row.rateLabel,
  })) satisfies ContactVerticalOffer[];
}

export async function getBuyerVerticalOffer(tenantId: string, buyerId: string, verticalId: string) {
  return prisma.buyerVertical.findFirst({
    where: { tenantId, buyerId, verticalId },
  });
}

export async function getPublisherVerticalOffer(tenantId: string, publisherId: string, verticalId: string) {
  return prisma.publisherVertical.findFirst({
    where: { tenantId, publisherId, verticalId },
  });
}

export type ParsedVerticalOffer = {
  verticalId: string;
  paymentTermsDays: number;
  terms: string;
  rate: number | null;
  rateType: RateType;
  rateLabel: string | null;
};

export function parseVerticalOfferRowsFromForm(formData: FormData) {
  const verticalIds = formData.getAll("offerVerticalId").map((value) => String(value).trim());
  const termsDays = formData.getAll("offerPaymentTermsDays").map((value) => String(value).trim());
  const rates = formData.getAll("offerRate").map((value) => String(value).trim());
  const rateTypes = formData.getAll("offerRateType").map((value) => String(value).trim());
  const terms = formData.getAll("offerTerms").map((value) => String(value).trim());
  const offers: ParsedVerticalOffer[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < verticalIds.length; i += 1) {
    const verticalId = verticalIds[i];
    if (!verticalId) continue;
    if (seen.has(verticalId)) {
      return { ok: false as const, error: "Each vertical can only be added once." };
    }
    seen.add(verticalId);
    const paymentTermsDays = parseInteger(termsDays[i] || "7", "NET days", 0, 365, true);
    if (!paymentTermsDays.ok || paymentTermsDays.value == null) {
      return { ok: false as const, error: paymentTermsDays.ok ? "NET days is required for each vertical." : paymentTermsDays.error };
    }
    const rate = parseMoney(rates[i] ?? "", "Rate per call", false);
    if (!rate.ok) return { ok: false as const, error: rate.error };
    const termsLabel = parseOptionalText(terms[i] ?? "", "Payment terms", 80);
    if (!termsLabel.ok) return { ok: false as const, error: termsLabel.error };
    offers.push({
      verticalId,
      paymentTermsDays: paymentTermsDays.value,
      terms: termsLabel.value || formatNetTerms(paymentTermsDays.value),
      rate: rate.value,
      rateType: parseRateType(rateTypes[i]),
      rateLabel: null,
    });
  }

  return { ok: true as const, value: offers };
}

export function parseVerticalOfferFields(formData: FormData) {
  const paymentTermsDays = parseInteger(
    formField(formData, "paymentTermsDays") || "7",
    "NET days",
    0,
    365,
    true,
  );
  if (!paymentTermsDays.ok || paymentTermsDays.value == null) {
    return { ok: false as const, error: paymentTermsDays.ok ? "NET days is required." : paymentTermsDays.error };
  }
  const rate = parseMoney(formField(formData, "rate"), "Rate per call", false);
  if (!rate.ok) return { ok: false as const, error: rate.error };
  const terms = parseOptionalText(formField(formData, "terms"), "Payment terms", 80);
  if (!terms.ok) return { ok: false as const, error: terms.error };
  const rateLabel = parseOptionalText(formField(formData, "rateLabel"), "Rate label", 80);
  if (!rateLabel.ok) return { ok: false as const, error: rateLabel.error };
  const rateType = parseRateType(formField(formData, "rateType"));
  return {
    ok: true as const,
    value: {
      paymentTermsDays: paymentTermsDays.value,
      terms: terms.value || formatNetTerms(paymentTermsDays.value),
      rate: rate.value,
      rateType,
      rateLabel: rateLabel.value,
    },
  };
}

export async function addBuyerVerticalOffer(input: {
  tenantId: string;
  buyerId: string;
  verticalId: string;
  paymentTermsDays: number;
  terms: string;
  rate: number | null;
  rateType: RateType;
  rateLabel: string | null;
}) {
  await prisma.buyerVertical.create({
    data: {
      id: cuidLike(),
      tenantId: input.tenantId,
      buyerId: input.buyerId,
      verticalId: input.verticalId,
      paymentTermsDays: input.paymentTermsDays,
      terms: input.terms,
      rate: input.rate,
      rateType: input.rateType,
      rateLabel: input.rateLabel,
    },
  });
}

export async function addPublisherVerticalOffer(input: {
  tenantId: string;
  publisherId: string;
  verticalId: string;
  paymentTermsDays: number;
  terms: string;
  rate: number | null;
  rateType: RateType;
  rateLabel: string | null;
}) {
  await prisma.publisherVertical.create({
    data: {
      id: cuidLike(),
      tenantId: input.tenantId,
      publisherId: input.publisherId,
      verticalId: input.verticalId,
      paymentTermsDays: input.paymentTermsDays,
      terms: input.terms,
      rate: input.rate,
      rateType: input.rateType,
      rateLabel: input.rateLabel,
    },
  });
}

export async function removeBuyerVerticalOffer(tenantId: string, offerId: string) {
  await prisma.buyerVertical.deleteMany({ where: { id: offerId, tenantId } });
}

export async function removePublisherVerticalOffer(tenantId: string, offerId: string) {
  await prisma.publisherVertical.deleteMany({ where: { id: offerId, tenantId } });
}

export async function applyBuyerVerticalDefaults(input: {
  tenantId: string;
  buyerId: string;
  verticalId: string | null;
  fallbackTermsDays: number;
  fallbackTerms: string | null;
}) {
  if (!input.verticalId) {
    return {
      paymentTermsDays: input.fallbackTermsDays,
      terms: input.fallbackTerms ?? formatNetTerms(input.fallbackTermsDays),
      rate: null as number | null,
      rateType: RateType.CPL as RateType,
    };
  }
  const offer = await getBuyerVerticalOffer(input.tenantId, input.buyerId, input.verticalId);
  if (!offer) {
    return {
      paymentTermsDays: input.fallbackTermsDays,
      terms: input.fallbackTerms ?? formatNetTerms(input.fallbackTermsDays),
      rate: null as number | null,
      rateType: RateType.CPL as RateType,
    };
  }
  return {
    paymentTermsDays: offer.paymentTermsDays,
    terms: offer.terms ?? formatNetTerms(offer.paymentTermsDays),
    rate: offer.rate == null ? null : Number(offer.rate),
    rateType: offer.rateType,
  };
}

export async function applyPublisherVerticalDefaults(input: {
  tenantId: string;
  publisherId: string;
  verticalId: string | null;
  fallbackTermsDays: number;
  fallbackTerms: string | null;
}) {
  if (!input.verticalId) {
    return {
      paymentTermsDays: input.fallbackTermsDays,
      terms: input.fallbackTerms ?? formatNetTerms(input.fallbackTermsDays),
      rate: null as number | null,
      rateType: RateType.CPL as RateType,
    };
  }
  const offer = await getPublisherVerticalOffer(input.tenantId, input.publisherId, input.verticalId);
  if (!offer) {
    return {
      paymentTermsDays: input.fallbackTermsDays,
      terms: input.fallbackTerms ?? formatNetTerms(input.fallbackTermsDays),
      rate: null as number | null,
      rateType: RateType.CPL as RateType,
    };
  }
  return {
    paymentTermsDays: offer.paymentTermsDays,
    terms: offer.terms ?? formatNetTerms(offer.paymentTermsDays),
    rate: offer.rate == null ? null : Number(offer.rate),
    rateType: offer.rateType,
  };
}
