import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPlatformAdminHost } from "@/lib/platform-host";

export const PUBLIC_PREFIXES = ["/login", "/signup", "/invite", "/api/auth"];

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
  const { pathname } = request.nextUrl;
  const adminHost = isPlatformAdminHost(request.headers.get("host"));
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
    return NextResponse.next();
  }

  // Main app host (fundlookup.co): keep /admin off this domain.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!session && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
