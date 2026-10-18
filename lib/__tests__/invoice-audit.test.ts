import { describe, expect, it } from "vitest";
import { describeChanges, invoiceActivityLabel } from "../invoice-audit";

describe("describeChanges", () => {
  it("lists only the fields that changed", () => {
    expect(
      describeChanges([
        { label: "Amount due", before: "500", after: "700", money: true },
        { label: "Received", before: null, after: null, money: true },
        { label: "Status", before: "Unpaid", after: "Paid" },
      ]),
    ).toBe("Amount due $500.00 → $700.00; Status Unpaid → Paid");
  });

  it("treats 500 and 500.00 as the same amount, and empty as empty", () => {
    expect(
      describeChanges([
        { label: "Amount due", before: "500.00", after: 500, money: true },
        { label: "Invoice number", before: "", after: null },
      ]),
    ).toBeNull();
  });

  it("shows a value that was cleared as empty", () => {
    expect(describeChanges([{ label: "Invoice number", before: "INV-1", after: null }])).toBe(
      "Invoice number INV-1 → empty",
    );
  });
});

describe("invoiceActivityLabel", () => {
  it("joins the number, contact, and period, skipping blanks", () => {
    expect(invoiceActivityLabel({ invoiceNumber: null, contactName: "HealthBox", periodLabel: "6th-12th Sep" })).toBe(
      "HealthBox · 6th-12th Sep",
    );
  });
});
