import { cents, isZero, percent } from "./decimal";
import type { MonthlyOverview, MonthlyTotals } from "./types";

export function computeMonthlyOverview(totals: MonthlyTotals): MonthlyOverview {
  const buyerInvoiced = cents(totals.buyerInvoiced);
  const buyerReceived = cents(totals.buyerReceived);
  const publisherOwed = cents(totals.publisherOwed);
  const publisherPaid = cents(totals.publisherPaid);
  const expensesActual = cents(totals.expensesActual);
  const expensesPaid = cents(totals.expensesPaid);

  const revenue = cents(buyerReceived.sub(publisherPaid));
  const expenses = expensesPaid;
  const profit = cents(revenue.sub(expenses));
  const expectedProfit = cents(buyerInvoiced.sub(publisherOwed).sub(expensesActual));
  const cashGap = cents(expectedProfit.sub(profit));
  const marginPercent = isZero(revenue) ? null : percent(profit.div(revenue).mul(100));

  return {
    buyerInvoiced,
    buyerReceived,
    publisherOwed,
    publisherPaid,
    expensesActual,
    expensesPaid,
    revenue,
    expenses,
    profit,
    marginPercent,
    profitLabel: profit.gte(0) ? "Profit" : "Decrease in Profit",
    expectedProfit,
    cashGap,
  };
}
