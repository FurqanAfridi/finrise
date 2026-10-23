import { describe, expect, it } from "vitest";
import { RateType } from "@prisma/client";
import { parseInvoiceLineRowsFromForm, summarizeInvoiceLines } from "../invoice-lines";

function form(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}

describe("parseInvoiceLineRowsFromForm", () => {
  it("parses several verticals on one payable and totals them", () => {
    const parsed = parseInvoiceLineRowsFromForm(
      form({
        lineVerticalId: ["v-auto", "v-home"],
        lineLeadCount: ["100", ""],
        lineRateType: [RateType.CPL, RateType.FLAT],
        lineRate: ["2.5", "0"],
        lineAmount: ["250", "400"],
        lineComments: ["", "Bonus"],
      }),
      "amount",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.map((line) => [line.verticalId, line.amount])).toEqual([
      ["v-auto", 250],
      ["v-home", 400],
    ]);
    expect(summarizeInvoiceLines(parsed.value).revenue).toBe(650);
  });

  it("rejects the same vertical twice", () => {
    const parsed = parseInvoiceLineRowsFromForm(
      form({
        lineVerticalId: ["v-auto", "v-auto"],
        lineLeadCount: ["1", "1"],
        lineRateType: [RateType.CPL, RateType.CPL],
        lineRate: ["10", "10"],
        lineAmount: ["", ""],
        lineComments: ["", ""],
      }),
      "amount",
    );
    expect(parsed.ok).toBe(false);
  });

  it("falls back to the publisher form's single amount field", () => {
    const parsed = parseInvoiceLineRowsFromForm(
      form({ verticalId: "v-auto", rateType: RateType.FLAT, amount: "120" }),
      "amount",
    );
    expect(parsed.ok && parsed.value[0].amount).toBe(120);
  });
});
