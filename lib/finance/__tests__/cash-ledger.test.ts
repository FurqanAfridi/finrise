import { describe, expect, it } from "vitest";
import { buildCashLedger, parseCashLedgerParams, type CashLedgerEntry } from "../cash-ledger";
import { money } from "../decimal";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const ENTRIES: CashLedgerEntry[] = [
  { id: "2", date: utc(2026, 7, 10), kind: "PUBLISHER_PAYMENT", description: "Pub", reference: null, amount: money(-300) },
  { id: "1", date: utc(2026, 7, 5), kind: "BUYER_PAYMENT", description: "Buyer", reference: null, amount: money(1000) },
  { id: "3", date: utc(2026, 8, 1), kind: "EXPENSE", description: "Rent", reference: null, amount: money(-200) },
  { id: "4", date: utc(2026, 8, 15), kind: "PARTNER_WITHDRAWAL", description: "Rafia", reference: null, amount: money(-100) },
];

describe("buildCashLedger", () => {
  it("sorts oldest first and keeps a running balance", () => {
    const ledger = buildCashLedger(ENTRIES);
    expect(ledger.rows.map((row) => row.id)).toEqual(["1", "2", "3", "4"]);
    expect(ledger.rows.map((row) => row.balance.toNumber())).toEqual([1000, 700, 500, 400]);
    expect(ledger.totalIn.toNumber()).toBe(1000);
    expect(ledger.totalOut.toNumber()).toBe(600);
    expect(ledger.availableBalance.toNumber()).toBe(400);
  });

  it("brings earlier movements forward when a date range is set", () => {
    const ledger = buildCashLedger(ENTRIES, { from: utc(2026, 8, 1), to: utc(2026, 8, 2) });
    expect(ledger.broughtForward.toNumber()).toBe(700);
    expect(ledger.rows.map((row) => row.id)).toEqual(["3"]);
    expect(ledger.closingBalance.toNumber()).toBe(500);
    expect(ledger.availableBalance.toNumber()).toBe(400);
  });

  it("filters by type but keeps the true running balance", () => {
    const ledger = buildCashLedger(ENTRIES, { kinds: ["EXPENSE"] });
    expect(ledger.rows.map((row) => [row.id, row.balance.toNumber()])).toEqual([["3", 500]]);
    expect(ledger.totalOut.toNumber()).toBe(200);
  });
});

describe("parseCashLedgerParams", () => {
  it("makes the to-date inclusive and ignores bad values", () => {
    const parsed = parseCashLedgerParams({ from: "2026-08-01", to: "2026-08-31", kind: "EXPENSE" });
    expect(parsed.from).toEqual(utc(2026, 8, 1));
    expect(parsed.to).toEqual(utc(2026, 9, 1));
    expect(parsed.kind).toBe("EXPENSE");
    expect(parseCashLedgerParams({ from: "nope", kind: "HACK" })).toMatchObject({ from: null, kind: null, fromValue: "" });
  });
});
