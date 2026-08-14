import {
  APP_HOST,
  LEGACY_ADMIN_HOSTS,
  LEGACY_APP_HOSTS,
  PLATFORM_ADMIN_HOST,
} from "@/lib/brand";

export { APP_HOST, PLATFORM_ADMIN_HOST };

export const PLATFORM_ADMIN_HOSTS = new Set([PLATFORM_ADMIN_HOST, "localhost:3002"]);

export function isLocalDevHost(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase();
  return h.startsWith("localhost") || h.startsWith("127.0.0.1");
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]?.toLowerCase() || "";
}

export function isPlatformAdminHost(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase();
  if (PLATFORM_ADMIN_HOSTS.has(h)) return true;
  const bare = normalizeHost(host);
  if (PLATFORM_ADMIN_HOSTS.has(bare)) return true;
  return bare === PLATFORM_ADMIN_HOST;
}

export function isLegacyAppHost(host: string | null | undefined): boolean {
  const bare = normalizeHost(host);
  return (LEGACY_APP_HOSTS as readonly string[]).includes(bare);
}

export function isLegacyAdminHost(host: string | null | undefined): boolean {
  const bare = normalizeHost(host);
  return (LEGACY_ADMIN_HOSTS as readonly string[]).includes(bare);
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
    } catch {
      // fall through
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
