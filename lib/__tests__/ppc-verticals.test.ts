import { describe, expect, it } from "vitest";
import { PPC_VERTICALS } from "../ppc-verticals";

describe("PPC vertical catalog", () => {
  it("has unique names", () => {
    expect(new Set(PPC_VERTICALS).size).toBe(PPC_VERTICALS.length);
  });

  it("covers core insurance, home, legal, and finance offers", () => {
    expect(PPC_VERTICALS).toEqual(expect.arrayContaining(["Auto Insurance", "Medicare", "Solar", "Personal Injury", "Debt Settlement"]));
  });
});
