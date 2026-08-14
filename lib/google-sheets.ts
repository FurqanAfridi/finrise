import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/secret";
import { prisma } from "@/lib/prisma";

export const GOOGLE_OAUTH_COOKIE = "google_sheets_oauth";
const REFRESH_KEY = "googleSheetsRefreshToken";
const EMAIL_KEY = "googleSheetsEmail";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export type GoogleSheetFile = { id: string; name: string; modifiedTime?: string };
export type GoogleSheetTab = { title: string };

function clientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

export function googleSheetsConfigured() {
  return Boolean(clientId() && clientSecret());
}

export function googleRedirectUri() {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const site = (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${site}/api/integrations/google/callback`;
}

export function googleAppOrigin() {
  return googleRedirectUri().replace(/\/api\/integrations\/google\/callback$/, "");
}

function sign(value: string) {
  const secret = process.env.AUTH_SECRET || "fundlookup-dev";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function verifySigned(raw: string) {
  const cut = raw.lastIndexOf(".");
  if (cut <= 0) return null;
  const payload = raw.slice(0, cut);
  const sig = raw.slice(cut + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return payload;
}

export function createGoogleOAuthState(input: { tenantId: string; userId: string }) {
  const payload = Buffer.from(
    JSON.stringify({ tenantId: input.tenantId, userId: input.userId, exp: Date.now() + 10 * 60 * 1000 }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function googleAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function readOAuthState(
  state: string | null,
  cookie: string | null,
): { error: string } | { data: { tenantId: string; userId: string; exp: number } } {
  if (!state || !cookie || state !== cookie) return { error: "Google sign-in expired. Connect again." };
  const payload = verifySigned(state);
  if (!payload) return { error: "Google sign-in could not be verified. Connect again." };
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      tenantId: string;
      userId: string;
      exp: number;
    };
    if (!data.tenantId || !data.userId || data.exp < Date.now()) {
      return { error: "Google sign-in expired. Connect again." };
    }
    return { data };
  } catch {
    return { error: "Google sign-in could not be verified. Connect again." };
  }
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      ...body,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google could not issue an access token.");
  }
  return json;
}

export async function exchangeGoogleCode(code: string) {
  return tokenRequest({
    code,
    grant_type: "authorization_code",
    redirect_uri: googleRedirectUri(),
  });
}

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message || "Google Sheets request failed.");
  }
  return json;
}

export async function googleAccountEmail(accessToken: string) {
  const profile = await googleJson<{ email?: string }>("https://www.googleapis.com/oauth2/v2/userinfo", accessToken);
  return profile.email ?? null;
}

export async function saveGoogleConnection(
  tenantId: string,
  refreshToken: string | null,
  email: string | null,
) {
  const ops = [
    prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: EMAIL_KEY } },
      update: { value: email ?? "" },
      create: { tenantId, key: EMAIL_KEY, value: email ?? "" },
    }),
  ];
  if (refreshToken) {
    ops.unshift(
      prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key: REFRESH_KEY } },
        update: { value: encryptSecret(refreshToken) },
        create: { tenantId, key: REFRESH_KEY, value: encryptSecret(refreshToken) },
      }),
    );
  }
  await prisma.$transaction(ops);
}

export async function disconnectGoogleSheets(tenantId: string) {
  await prisma.setting.deleteMany({
    where: { tenantId, key: { in: [REFRESH_KEY, EMAIL_KEY] } },
  });
}

export async function getGoogleSheetsConnection(tenantId: string) {
  const [tokenRow, emailRow] = await Promise.all([
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: REFRESH_KEY } } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: EMAIL_KEY } } }),
  ]);
  if (!tokenRow?.value) return null;
  return { email: emailRow?.value || null, hasRefresh: true };
}

async function accessTokenForTenant(tenantId: string) {
  const row = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId, key: REFRESH_KEY } },
  });
  if (!row?.value) throw new Error("Connect Google Sheets first.");
  let refresh: string;
  try {
    refresh = decryptSecret(row.value);
  } catch {
    throw new Error("Google Sheets access could not be read. Connect the account again.");
  }
  const tokens = await tokenRequest({
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  return tokens.access_token!;
}

function quoteSheet(title: string) {
  return `'${title.replaceAll("'", "''")}'`;
}

export async function listGoogleSpreadsheets(tenantId: string): Promise<GoogleSheetFile[]> {
  const access = await accessTokenForTenant(tenantId);
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    pageSize: "50",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    spaces: "drive",
  });
  const data = await googleJson<{ files?: GoogleSheetFile[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    access,
  );
  return data.files ?? [];
}

export async function listGoogleSheetTabs(tenantId: string, spreadsheetId: string): Promise<GoogleSheetTab[]> {
  const access = await accessTokenForTenant(tenantId);
  const data = await googleJson<{ sheets?: { properties?: { title?: string } }[] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
    access,
  );
  return (data.sheets ?? [])
    .map((sheet) => ({ title: sheet.properties?.title ?? "" }))
    .filter((sheet) => sheet.title);
}

export async function readGoogleSheetValues(
  tenantId: string,
  spreadsheetId: string,
  sheetTitle: string,
  limitRows?: number,
): Promise<{ headers: string[]; rows: string[][] }> {
  const access = await accessTokenForTenant(tenantId);
  const range = limitRows ? `${quoteSheet(sheetTitle)}!A1:ZZ${limitRows}` : quoteSheet(sheetTitle);
  const data = await googleJson<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    access,
  );
  const values = data.values ?? [];
  const headers = (values[0] ?? []).map((cell) => String(cell ?? "").trim());
  const rows = values.slice(1).map((line) => line.map((cell) => String(cell ?? "").trim()));
  return { headers, rows };
}
