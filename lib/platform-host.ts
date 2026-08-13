/** Host helpers for FinRise app vs platform admin subdomain. */

export const APP_HOST = "fundlookup.co";
export const PLATFORM_ADMIN_HOST = "admin.fundlookup.co";

/** Production + local admin hosts. Legacy RidgeRise hosts kept during DNS cutover. */
export const PLATFORM_ADMIN_HOSTS = new Set([
  PLATFORM_ADMIN_HOST,
  "finadmin.ridgerisemedia.com",
  "localhost:3002",
]);

export const APP_HOSTS = new Set([
  APP_HOST,
  `www.${APP_HOST}`,
  "fin.ridgerisemedia.com",
  "localhost",
]);

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.toLowerCase() || "";
}

export function isPlatformAdminHost(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase();
  if (PLATFORM_ADMIN_HOSTS.has(h)) return true;
  return PLATFORM_ADMIN_HOSTS.has(normalizeHost(host));
}

export function platformAdminPublicUrl(): string {
  const explicit = process.env.PLATFORM_ADMIN_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const auth = process.env.AUTH_URL?.replace(/\/$/, "");
  if (auth) {
    try {
      const url = new URL(auth);
      if (url.hostname === APP_HOST || url.hostname === `www.${APP_HOST}`) {
        url.hostname = PLATFORM_ADMIN_HOST;
        return url.origin;
      }
      if (url.hostname === "fin.ridgerisemedia.com") {
        url.hostname = "finadmin.ridgerisemedia.com";
        return url.origin;
      }
    } catch {
      // fall through to default
    }
  }

  return `https://${PLATFORM_ADMIN_HOST}`;
}

export function appPublicUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    `https://${APP_HOST}`
  );
}
