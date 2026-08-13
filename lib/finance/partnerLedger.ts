import { cents, money, type Decimal } from "./decimal";
import type { PartnerInput, PartnerLedgerRow } from "./types";

export function partnerLedger(
  partners: PartnerInput[],
  entitledByPartnerId: Record<string, Decimal>,
  withdrawnByPartnerId: Record<string, Decimal>,
): PartnerLedgerRow[] {
  return partners.map((partner) => {
    const entitledToDate = cents(entitledByPartnerId[partner.id] ?? 0);
    const withdrawnToDate = cents(withdrawnByPartnerId[partner.id] ?? 0);
    return {
      partnerId: partner.id,
      name: partner.name,
      entitledToDate,
      withdrawnToDate,
      availableBalance: cents(entitledToDate.sub(withdrawnToDate)),
    };
  });
}

export function convertedAmount(
  amountBase: Decimal,
  conversionRate: Decimal | null | undefined,
): Decimal | null {
  if (conversionRate == null) return null;
  return cents(money(amountBase).mul(money(conversionRate)));
}
