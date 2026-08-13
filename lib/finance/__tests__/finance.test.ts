import { describe, expect, it } from "vitest";
import { cents, money } from "../decimal";
import { lineTotal } from "../invoice";
import { computeMonthlyOverview } from "../monthlyOverview";
import { partnerLedger } from "../partnerLedger";
import { distributeProfit } from "../profitDistribution";
import { invoiceVariance } from "../variance";

const DEMO_PARTNERS = [
  { id: "libby", name: "Libby", tier: "TOP_LINE" as const, sharePercent: money(10) },
  { id: "rafia", name: "Rafia", tier: "EQUITY" as const, sharePercent: money(50) },
  { id: "saad", name: "Saad", tier: "EQUITY" as const, sharePercent: money(50) },
];

const TAX_FIRST = { taxRatePercent: money(30), taxOrder: "TAX_FIRST" as const };

describe("worked example 2099-01", () => {
  it("matches the spreadsheet monthly math, tax, and 50/50 split", () => {
    const overview = computeMonthlyOverview({
      buyerInvoiced: money("40371.27"),
      buyerReceived: money("40371.27"),
      publisherOwed: money("6000"),
      publisherPaid: money("6000"),
      expensesActual: money("22001"),
      expensesPaid: money("22001"),
    });

    expect(overview.revenue.toFixed(2)).toBe("34371.27");
    expect(overview.profit.toFixed(2)).toBe("12370.27");
    expect(overview.marginPercent?.toFixed(2)).toBe("35.99");
    expect(overview.profitLabel).toBe("Profit");
    expect(overview.expectedProfit.toFixed(2)).toBe("12370.27");
    expect(overview.cashGap.toFixed(2)).toBe("0.00");

    const dist = distributeProfit(overview.profit, DEMO_PARTNERS, TAX_FIRST);
    expect(dist.taxReserve.toFixed(2)).toBe("3711.08");
    expect(dist.afterTax.toFixed(2)).toBe("8659.19");
    expect(dist.tier1[0]?.amount.toFixed(2)).toBe("865.92");
    expect(dist.distributableToEquity.toFixed(2)).toBe("7793.27");
    expect(dist.tier2.map((row) => row.amount.toFixed(2))).toEqual(["3896.64", "3896.64"]);
  });
});

describe("monthly overview edge cases", () => {
  it("labels negative profit as Decrease in Profit", () => {
    const overview = computeMonthlyOverview({
      buyerInvoiced: money(100),
      buyerReceived: money(50),
      publisherOwed: money(40),
      publisherPaid: money(40),
      expensesActual: money(30),
      expensesPaid: money(30),
    });
    expect(overview.profit.toFixed(2)).toBe("-20.00");
    expect(overview.profitLabel).toBe("Decrease in Profit");
  });

  it("returns null margin when cash revenue is zero", () => {
    const overview = computeMonthlyOverview({
      buyerInvoiced: money(100),
      buyerReceived: money(0),
      publisherOwed: money(0),
      publisherPaid: money(0),
      expensesActual: money(10),
      expensesPaid: money(10),
    });
    expect(overview.revenue.toFixed(2)).toBe("0.00");
    expect(overview.marginPercent).toBeNull();
    expect(overview.profit.toFixed(2)).toBe("-10.00");
  });
});

describe("invoice line totals", () => {
  it("uses count × rate for CPL/CPA", () => {
    expect(lineTotal("CPL", 100, "2.50", null).toFixed(2)).toBe("250.00");
  });

  it("uses the entered amount for FLAT and PROFIT_SHARE with no count/rate", () => {
    expect(lineTotal("FLAT", null, null, "1500.00").toFixed(2)).toBe("1500.00");
    expect(lineTotal("PROFIT_SHARE", null, null, "6000").toFixed(2)).toBe("6000.00");
  });
});

describe("variance", () => {
  it("flags short-pays beyond tolerance", () => {
    const result = invoiceVariance("100.00", "90.00", 1);
    expect(result.amount.toFixed(2)).toBe("-10.00");
    expect(result.flagged).toBe(true);
  });

  it("flags overpays beyond tolerance", () => {
    const result = invoiceVariance("100.00", "105.50", 1);
    expect(result.amount.toFixed(2)).toBe("5.50");
    expect(result.flagged).toBe(true);
  });

  it("does not flag variance within $1", () => {
    const result = invoiceVariance("100.00", "100.40", 1);
    expect(result.flagged).toBe(false);
  });
});

describe("partner ledger", () => {
  it("allows a negative available balance when over-withdrawn", () => {
    const rows = partnerLedger(DEMO_PARTNERS, {
      libby: cents("865.92"),
      rafia: cents("3896.64"),
      saad: cents("3896.64"),
    }, {
      libby: cents("0"),
      rafia: cents("5000"),
      saad: cents("0"),
    });
    const rafia = rows.find((row) => row.partnerId === "rafia");
    expect(rafia?.availableBalance.toFixed(2)).toBe("-1103.36");
  });
});
