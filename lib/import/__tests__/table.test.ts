import { describe, expect, it } from "vitest";
import { IMPORT_FIELDS, applyColumnMapping, assessSheetCompatibility, guessColumnMapping, mappingIsValid, parseCsvTable } from "../table";

describe("historical import table", () => {
  it("parses csv headers and rows", () => {
    const table = parseCsvTable("Name,Total\nAcme,1200\n");
    expect(table.headers).toEqual(["Name", "Total"]);
    expect(table.rows).toEqual([["Acme", "1200"]]);
  });

  it("guesses buyer columns and maps required fields", () => {
    const headers = ["Buyer", "Date range", "Amount", "Vertical"];
    const mapping = guessColumnMapping("buyers", headers);
    expect(mapping.name).toBe(0);
    expect(mapping.date_range).toBe(1);
    expect(mapping.total).toBe(2);
    expect(mapping.vertical).toBe(3);
    expect(mappingIsValid("buyers", mapping)).toBe(true);
    const rows = applyColumnMapping([["Acme Ads", "8/1-8/15", "3000", "Auto"]], mapping);
    expect(rows[0]).toMatchObject({ name: "Acme Ads", total: "3000", vertical: "Auto" });
  });

  it("marks a template sheet compatible and lists unused columns", () => {
    const headers = ["Buyer name", "Total amount", "Notes from ops"];
    const report = assessSheetCompatibility("buyers", headers);
    expect(report.ready).toBe(true);
    expect(report.summary).toBe("compatible");
    expect(report.matchedRequired).toBe(2);
    expect(report.extraColumns).toEqual(["Notes from ops"]);
    expect(report.fields.find((row) => row.key === "name")?.column).toBe("Buyer name");
  });

  it("flags a sheet that is missing required columns", () => {
    const report = assessSheetCompatibility("buyers", ["Vertical", "Leads"]);
    expect(report.ready).toBe(false);
    expect(report.summary).toBe("needs_mapping");
    expect(report.fields.find((row) => row.key === "total")?.matched).toBe(false);
  });

  it("treats FundLookup sample headers as compatible for every import type", () => {
    for (const kind of ["buyers", "publishers", "expenses"] as const) {
      const headers = IMPORT_FIELDS[kind].map((field) => field.label);
      const report = assessSheetCompatibility(kind, headers);
      expect(report.ready).toBe(true);
      expect(report.matchedRequired).toBe(report.requiredTotal);
    }
  });
});
