import { describe, expect, it } from "vitest";
import { parseVerticalOfferRowsFromForm } from "../contact-verticals";

function form(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}

describe("parseVerticalOfferRowsFromForm", () => {
  it("skips empty vertical rows", () => {
    const parsed = parseVerticalOfferRowsFromForm(
      form({
        offerVerticalId: ["", "v1"],
        offerPaymentTermsDays: ["7", "14"],
        offerRate: ["", "12.5"],
        offerRateType: ["CPL", "CPL"],
        offerTerms: ["", "Net 14"],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toHaveLength(1);
    expect(parsed.value[0]).toMatchObject({
      verticalId: "v1",
      paymentTermsDays: 14,
      rate: 12.5,
      terms: "Net 14",
    });
  });

  it("rejects duplicate verticals", () => {
    const parsed = parseVerticalOfferRowsFromForm(
      form({
        offerVerticalId: ["v1", "v1"],
        offerPaymentTermsDays: ["7", "7"],
        offerRate: ["1", "2"],
        offerRateType: ["CPL", "CPL"],
        offerTerms: ["", ""],
      }),
    );
    expect(parsed.ok).toBe(false);
  });
});
