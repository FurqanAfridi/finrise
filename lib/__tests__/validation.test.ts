import { describe, expect, it } from "vitest";
import {
  parseAbaRouting,
  parseAccountNumber,
  parseBankDetails,
  parseEmail,
  parseFormDate,
  parseIban,
  parseMoney,
  parsePersonName,
  parsePhone,
  parseSharePercent,
  parseSwift,
  parseZipCode,
} from "../validation";

describe("field validation", () => {
  it("rejects names with digits", () => {
    expect(parsePersonName("John2", "First name").ok).toBe(false);
    expect(parsePersonName("John", "First name")).toEqual({ ok: true, value: "John" });
  });

  it("rejects invalid emails", () => {
    expect(parseEmail("not-an-email").ok).toBe(false);
    expect(parseEmail("john@acme.com")).toEqual({ ok: true, value: "john@acme.com" });
  });

  it("requires a country code and digits-only phone", () => {
    expect(parsePhone("abc123", "US").ok).toBe(false);
    expect(parsePhone("(555) 123-4567", "US")).toEqual({ ok: true, value: "+15551234567" });
    expect(parsePhone("3001234567", "PK")).toEqual({ ok: true, value: "+923001234567" });
  });

  it("validates zip codes by country", () => {
    expect(parseZipCode("94143", "US").ok).toBe(true);
    expect(parseZipCode("ABCDE", "US").ok).toBe(false);
    expect(parseZipCode("SW1A 1AA", "GB").ok).toBe(true);
  });

  it("rejects money with letters", () => {
    expect(parseMoney("12a", "Amount").ok).toBe(false);
    expect(parseMoney("12.50", "Amount")).toEqual({ ok: true, value: 12.5 });
  });

  it("checks authentic US routing and IBAN checksums", () => {
    expect(parseAbaRouting("021000021").ok).toBe(true);
    expect(parseAbaRouting("12345678").ok).toBe(true);
    expect(parseAbaRouting("1234567").ok).toBe(false);
    expect(parseAbaRouting("123456789").ok).toBe(false);
    expect(parseAccountNumber("abc123").ok).toBe(false);
    expect(parseAccountNumber("12345678").ok).toBe(true);
    expect(parseIban("GB82WEST12345698765432").ok).toBe(true);
    expect(parseIban("GB00WEST12345698765432").ok).toBe(false);
    expect(parseSwift("CHASUS33").ok).toBe(true);
    expect(parseSwift("NOPE").ok).toBe(false);
  });

  it("requires routing for US bank details", () => {
    const nine = parseBankDetails({
      country: "US",
      bankName: "Chase",
      accountNumber: "123456789",
      routingNumber: "021000021",
      iban: "",
      swift: "CHASUS33",
    });
    expect(nine.ok).toBe(true);
    const eight = parseBankDetails({
      country: "US",
      bankName: "Chase",
      accountNumber: "123456789",
      routingNumber: "02100002",
      iban: "",
      swift: "",
    });
    expect(eight.ok).toBe(true);
  });

  it("requires a valid IBAN and SWIFT outside the US", () => {
    const result = parseBankDetails({
      country: "GB",
      bankName: "HSBC",
      accountNumber: "",
      routingNumber: "",
      iban: "GB82WEST12345698765432",
      swift: "HBUKGB4B",
    });
    expect(result.ok).toBe(true);
    expect(parseBankDetails({
      country: "GB",
      bankName: "HSBC",
      accountNumber: "",
      routingNumber: "",
      iban: "GB00WEST12345698765432",
      swift: "HBUKGB4B",
    }).ok).toBe(false);
  });

  it("accepts calendar dates and rejects out-of-range years", () => {
    expect(parseFormDate("2026-08-13", "Invoice date").ok).toBe(true);
    expect(parseFormDate("209873-08-08", "Invoice date").ok).toBe(false);
    expect(parseFormDate("13/08/2026", "Invoice date").ok).toBe(false);
  });

  it("requires share percent between 1 and 100", () => {
    expect(parseSharePercent("0").ok).toBe(false);
    expect(parseSharePercent("100.1").ok).toBe(false);
    expect(parseSharePercent("33.5")).toEqual({ ok: true, value: 33.5 });
    expect(parseSharePercent("100")).toEqual({ ok: true, value: 100 });
  });
});
