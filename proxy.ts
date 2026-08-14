import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { APP_HOST, PLATFORM_ADMIN_HOST } from "@/lib/brand";
import { isLegacyAdminHost, isLegacyAppHost, isLocalDevHost, isPlatformAdminHost } from "@/lib/platform-host";

export const PUBLIC_PREFIXES = ["/login", "/signup", "/invite", "/forgot-password", "/reset-password", "/api/auth"];

function hasSession(request: NextRequest) {
  return Boolean(
    request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token"),
  );
}

function isPublicPath(pathname: string, adminHost: boolean) {
  if (adminHost && (pathname === "/signup" || pathname.startsWith("/signup/"))) {
    return false;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;

  if (isLegacyAppHost(host)) {
    return NextResponse.redirect(`https://${APP_HOST}${pathname}${search}`, 308);
  }
  if (isLegacyAdminHost(host)) {
    return NextResponse.redirect(`https://${PLATFORM_ADMIN_HOST}${pathname}${search}`, 308);
  }

  const adminHost = isPlatformAdminHost(host);
  const session = hasSession(request);
  const isPublic = isPublicPath(pathname, adminHost);

  if (adminHost) {
    if (pathname === "/signup" || pathname.startsWith("/signup/")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname === "/") {
      return NextResponse.redirect(new URL(session ? "/admin" : "/login", request.url));
    }
    // Platform admin UI lives under /admin; keep auth/invite public.
    const adminArea =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      isPublic;
    if (!adminArea) {
      return NextResponse.redirect(new URL(session ? "/admin" : "/login", request.url));
    }
    if (!session && !isPublic) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (session && (pathname === "/no-tenant" || pathname === "/dashboard")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Production app host: keep /admin off this domain. Localhost serves both.
  if (!isLocalDevHost(host) && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!session && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (session && (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname.startsWith("/reset-password"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
