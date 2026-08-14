import { describe, expect, it } from "vitest";
import { isAppProductHost, isMarketingHost, isPlatformAdminHost, normalizeHost } from "../platform-host";

describe("host routing", () => {
  it("treats the apex and www as the marketing site", () => {
    expect(isMarketingHost("fundlookup.co")).toBe(true);
    expect(isMarketingHost("www.fundlookup.co")).toBe(true);
    expect(isMarketingHost("fundlookup.co:443")).toBe(true);
    expect(isMarketingHost("app.fundlookup.co")).toBe(false);
  });

  it("treats app.fundlookup.co as the product app", () => {
    expect(isAppProductHost("app.fundlookup.co")).toBe(true);
    expect(normalizeHost("app.fundlookup.co:443")).toBe("app.fundlookup.co");
    expect(isAppProductHost("fundlookup.co")).toBe(false);
  });

  it("treats admin.fundlookup.co as platform admin", () => {
    expect(isPlatformAdminHost("admin.fundlookup.co")).toBe(true);
    expect(isPlatformAdminHost("app.fundlookup.co")).toBe(false);
  });
});
