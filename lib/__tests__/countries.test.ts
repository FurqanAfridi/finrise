import { describe, expect, it } from "vitest";
import { nationalPhoneDigits } from "../countries";

describe("nationalPhoneDigits", () => {
  it("strips the country dial code from a stored E.164 number", () => {
    expect(nationalPhoneDigits("+15551234567", "US")).toBe("5551234567");
    expect(nationalPhoneDigits("+923001234567", "PK")).toBe("3001234567");
  });

  it("returns empty when nothing is stored", () => {
    expect(nationalPhoneDigits(null, "US")).toBe("");
  });
});
