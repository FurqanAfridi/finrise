export const APP_NAME = "FundLookup";
export const APP_TAGLINE = "Buyer, publisher, and profit tracking for performance marketing.";
export const APP_PURPOSE =
  "FundLookup is a web application for performance-marketing finance. Companies use FundLookup to create and track buyer invoices, publisher payouts, expenses, and monthly profit. FundLookup can optionally connect to Google so a signed-in user can import historical invoice rows from a Google Sheet they select.";
export const POWERED_BY = "Devdabs";
export const POWERED_BY_URL = process.env.POWERED_BY_URL?.replace(/\/$/, "") || "https://devdabs.com";
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL?.trim() || "admin@fundlookup.co";
export const LEGAL_EFFECTIVE_DATE = "August 17, 2026";

/** Public marketing site (lander, privacy, terms). */
export const MARKETING_HOST = "fundlookup.co";
/** Product app (sign-in, invoices, integrations). */
export const APP_HOST = "app.fundlookup.co";
export const PLATFORM_ADMIN_HOST = "admin.fundlookup.co";
export const LEGACY_APP_HOSTS = ["fin.ridgerisemedia.com", "www.fin.ridgerisemedia.com"] as const;
export const LEGACY_ADMIN_HOSTS = ["finadmin.ridgerisemedia.com"] as const;
