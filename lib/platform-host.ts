/** Host helpers for FinRise app vs platform admin subdomain. */

export const PLATFORM_ADMIN_HOSTS = new Set([
  "finadmin.ridgerisemedia.com",
  "localhost:3002", // optional local override
]);

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.toLowerCase() || "";
}

export function isPlatformAdminHost(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase();
  if (PLATFORM_ADMIN_HOSTS.has(h)) return true;
  // Match host without worrying about port in production headers.
  const bare = normalizeHost(host);
  return bare === "finadmin.ridgerisemedia.com";
}

export function platformAdminPublicUrl(): string {
  return (
    process.env.PLATFORM_ADMIN_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "").replace("://fin.", "://finadmin.") ||
    "https://finadmin.ridgerisemedia.com"
  );
}
