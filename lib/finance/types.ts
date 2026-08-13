import type { Decimal } from "./decimal";

export type TaxOrder = "TAX_FIRST" | "TIER1_FIRST";
export type PartnerTier = "TOP_LINE" | "EQUITY";
export type RateType = "CPL" | "CPA" | "DYNAMIC" | "OTHER" | "FLAT" | "PROFIT_SHARE";

export type MonthlyTotals = {
  buyerInvoiced: Decimal;
  buyerReceived: Decimal;
  publisherOwed: Decimal;
  publisherPaid: Decimal;
  expensesActual: Decimal;
  expensesPaid: Decimal;
};

export type MonthlyOverview = MonthlyTotals & {
  revenue: Decimal;
  expenses: Decimal;
  profit: Decimal;
  marginPercent: Decimal | null;
  profitLabel: "Profit" | "Decrease in Profit";
  expectedProfit: Decimal;
  cashGap: Decimal;
};

export type FinanceSettingsInput = {
  taxRatePercent: Decimal;
  taxOrder: TaxOrder;
};

export type PartnerInput = {
  id: string;
  name: string;
  tier: PartnerTier;
  sharePercent: Decimal;
};

export type PartnerShare = {
  partnerId: string;
  name: string;
  amount: Decimal;
};

export type DistributionResult = {
  profit: Decimal;
  taxReserve: Decimal;
  afterTax: Decimal;
  tier1: PartnerShare[];
  distributableToEquity: Decimal;
  tier2: PartnerShare[];
};

export type PartnerLedgerRow = {
  partnerId: string;
  name: string;
  entitledToDate: Decimal;
  withdrawnToDate: Decimal;
  availableBalance: Decimal;
};

export type VarianceResult = {
  expected: Decimal;
  actual: Decimal;
  amount: Decimal;
  flagged: boolean;
};
