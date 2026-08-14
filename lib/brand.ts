export const APP_NAME = "FundLookup";
export const APP_TAGLINE = "Buyer, publisher, and profit tracking for performance marketing.";
export const POWERED_BY = "Devdabs";
export const POWERED_BY_URL = process.env.POWERED_BY_URL?.replace(/\/$/, "") || "https://devdabs.com";
export const APP_HOST = "fundlookup.co";
export const PLATFORM_ADMIN_HOST = "admin.fundlookup.co";
export const LEGACY_APP_HOSTS = ["fin.ridgerisemedia.com", "www.fin.ridgerisemedia.com"] as const;
export const LEGACY_ADMIN_HOSTS = ["finadmin.ridgerisemedia.com"] as const;
