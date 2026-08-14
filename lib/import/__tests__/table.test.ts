import { describe, expect, it } from "vitest";
import { applyColumnMapping, guessColumnMapping, mappingIsValid, parseCsvTable } from "../table";

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
});
