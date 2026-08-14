import { NextResponse } from "next/server";

export function GET(request: Request) {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (!token) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = new URL(request.url).searchParams.get("file");
  const expected = process.env.GOOGLE_SITE_VERIFICATION_FILE?.trim();
  if (expected && file !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(`google-site-verification: ${token}\n`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
