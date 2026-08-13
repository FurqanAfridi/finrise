import { cents, money, type Decimal } from "./decimal";
import type { DistributionResult, FinanceSettingsInput, PartnerInput, PartnerShare } from "./types";

export class PartnerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerConfigError";
  }
}

/** Calm, user-facing config message — null when equity setup is valid for distribution. */
export function partnerConfigIssue(partners: PartnerInput[]): string | null {
  const equity = partners.filter((partner) => partner.tier === "EQUITY");
  if (equity.length === 0) {
    return "Add at least one equity partner before profit can be split.";
  }
  const equityTotal = equity.reduce((sum, partner) => sum.add(money(partner.sharePercent)), money(0));
  if (!equityTotal.eq(100)) {
    return `Equity shares must add up to 100% (currently ${equityTotal.toFixed(2)}%). Adjust the percentages below, then profit splits will appear.`;
  }
  return null;
}

export function validatePartners(partners: PartnerInput[]): void {
  const issue = partnerConfigIssue(partners);
  if (issue) throw new PartnerConfigError(issue);
}

function shareOf(base: Decimal, sharePercent: Decimal): Decimal {
  return cents(base.mul(money(sharePercent)).div(100));
}

function allocateEvenly(base: Decimal, partners: PartnerInput[]): PartnerShare[] {
  if (partners.length === 0) return [];
  const each = cents(base.div(partners.length));
  return partners.map((partner) => ({
    partnerId: partner.id,
    name: partner.name,
    amount: each,
  }));
}

function allocateByPercent(base: Decimal, partners: PartnerInput[]): PartnerShare[] {
  return partners.map((partner) => ({
    partnerId: partner.id,
    name: partner.name,
    amount: shareOf(base, partner.sharePercent),
  }));
}

export function distributeProfit(
  profit: Decimal,
  partners: PartnerInput[],
  settings: FinanceSettingsInput,
): DistributionResult {
  validatePartners(partners);
  const roundedProfit = cents(profit);
  const taxRate = money(settings.taxRatePercent);
  const topLine = partners.filter((partner) => partner.tier === "TOP_LINE");
  const equity = partners.filter((partner) => partner.tier === "EQUITY");

  if (settings.taxOrder === "TIER1_FIRST") {
    const tier1 = allocateByPercent(roundedProfit, topLine);
    const afterTier1 = cents(roundedProfit.sub(tier1.reduce((sum, row) => sum.add(row.amount), money(0))));
    const taxReserve = cents(afterTier1.mul(taxRate).div(100));
    const afterTax = cents(afterTier1.sub(taxReserve));
    const tier2 = allocateEvenOrPercent(afterTax, equity);
    return {
      profit: roundedProfit,
      taxReserve,
      afterTax,
      tier1,
      distributableToEquity: afterTax,
      tier2,
    };
  }

  const taxReserve = cents(roundedProfit.mul(taxRate).div(100));
  const afterTax = cents(roundedProfit.sub(taxReserve));
  const tier1 = allocateByPercent(afterTax, topLine);
  const distributableToEquity = cents(afterTax.sub(tier1.reduce((sum, row) => sum.add(row.amount), money(0))));
  const tier2 = allocateEvenOrPercent(distributableToEquity, equity);

  return {
    profit: roundedProfit,
    taxReserve,
    afterTax,
    tier1,
    distributableToEquity,
    tier2,
  };
}

/** Same as distributeProfit, but returns null when partner shares are incomplete. */
export function tryDistributeProfit(
  profit: Decimal,
  partners: PartnerInput[],
  settings: FinanceSettingsInput,
): DistributionResult | null {
  if (partnerConfigIssue(partners)) return null;
  return distributeProfit(profit, partners, settings);
}

function allocateEvenOrPercent(base: Decimal, equity: PartnerInput[]): PartnerShare[] {
  const equalSplit = equity.length > 0 && equity.every((partner) => money(partner.sharePercent).eq(money(equity[0].sharePercent)));
  if (equalSplit) return allocateEvenly(base, equity);
  return allocateByPercent(base, equity);
}
