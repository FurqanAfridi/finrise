import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  createGoogleOAuthState,
  googleAppOrigin,
  googleAuthorizeUrl,
  googleRedirectUri,
  googleSheetsConfigured,
} from "@/lib/google-sheets";
import { requireBrokerOps } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireBrokerOps();
  if (!googleSheetsConfigured()) {
    return NextResponse.redirect(`${googleAppOrigin()}/integrations?error=not-configured`);
  }
  const state = createGoogleOAuthState({ tenantId: ctx.tenantId, userId: ctx.userId });
  const res = NextResponse.redirect(googleAuthorizeUrl(state));
  res.cookies.set(GOOGLE_OAUTH_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: googleRedirectUri().startsWith("https://"),
  });
  return res;
}
