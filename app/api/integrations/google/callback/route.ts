import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  exchangeGoogleCode,
  googleAccountEmail,
  googleAppOrigin,
  getGoogleSheetsConnection,
  readOAuthState,
  saveGoogleConnection,
} from "@/lib/google-sheets";
import { requireBrokerOps } from "@/lib/tenant";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_OAUTH_COOKIE}=`))
    ?.slice(GOOGLE_OAUTH_COOKIE.length + 1);

  const fail = (message: string) => {
    const res = NextResponse.redirect(
      `${googleAppOrigin()}/integrations?error=${encodeURIComponent(message)}`,
    );
    res.cookies.delete(GOOGLE_OAUTH_COOKIE);
    return res;
  };

  if (errorParam) return fail("Google access was not granted.");
  if (!code) return fail("Google did not return an authorization code.");

  const parsed = readOAuthState(state, cookie ? decodeURIComponent(cookie) : null);
  if ("error" in parsed) return fail(parsed.error);

  const ctx = await requireBrokerOps();
  if (parsed.data.tenantId !== ctx.tenantId || parsed.data.userId !== ctx.userId) {
    return fail("Google sign-in did not match this company. Connect again.");
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const existing = await getGoogleSheetsConnection(ctx.tenantId);
    if (!tokens.refresh_token && !existing?.hasRefresh) {
      return fail("Google did not return a lasting connection. Try Connect again and allow access.");
    }
    const email = await googleAccountEmail(tokens.access_token!);
    await saveGoogleConnection(ctx.tenantId, tokens.refresh_token ?? null, email);
    const res = NextResponse.redirect(`${googleAppOrigin()}/integrations?google=connected`);
    res.cookies.delete(GOOGLE_OAUTH_COOKIE);
    return res;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not connect Google Sheets.");
  }
}
