import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/validation";

function cuidLike() {
  return `c${randomBytes(12).toString("hex")}`;
}

export type BuyerEmailRow = {
  id: string;
  email: string;
  label: string | null;
  isPrimary: boolean;
};

export async function listBuyerEmails(tenantId: string, buyerId: string): Promise<BuyerEmailRow[]> {
  const rows = await prisma.buyerEmail.findMany({
    where: { tenantId, buyerId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { email: "asc" }],
    select: { id: true, email: true, label: true, isPrimary: true },
  });
  return rows;
}

export async function listBuyerEmailsByBuyerIds(tenantId: string, buyerIds: string[]) {
  if (buyerIds.length === 0) return {} as Record<string, string[]>;
  const rows = await prisma.buyerEmail.findMany({
    where: { tenantId, buyerId: { in: buyerIds } },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { email: "asc" }],
    select: { buyerId: true, email: true },
  });
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.buyerId]) map[row.buyerId] = [];
    map[row.buyerId].push(row.email);
  }
  return map;
}

export function parseBuyerEmailsFromForm(formData: FormData) {
  const raw = formData.getAll("buyerEmail").map((value) => String(value).trim()).filter(Boolean);
  if (raw.length === 0) {
    const legacy = String(formData.get("email") ?? "").trim();
    if (legacy) raw.push(legacy);
  }
  if (raw.length === 0) return { ok: false as const, error: "Add at least one buyer email." };

  const emails: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const parsed = parseEmail(value, true);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    if (!parsed.value) return { ok: false as const, error: "Add at least one valid buyer email." };
    const key = parsed.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(parsed.value);
  }
  if (emails.length === 0) return { ok: false as const, error: "Add at least one valid buyer email." };
  return { ok: true as const, value: emails };
}

export async function syncBuyerEmails(tenantId: string, buyerId: string, emails: string[]) {
  await prisma.$transaction([
    prisma.buyerEmail.deleteMany({ where: { tenantId, buyerId } }),
    ...emails.map((email, index) =>
      prisma.buyerEmail.create({
        data: {
          id: cuidLike(),
          tenantId,
          buyerId,
          email,
          isPrimary: index === 0,
          sortOrder: index,
        },
      }),
    ),
    prisma.buyer.update({
      where: { id: buyerId },
      data: { email: emails[0] ?? null },
    }),
  ]);
}

export function buyerEmailsForDisplay(stored: string[], legacyEmail: string | null | undefined) {
  if (stored.length > 0) return stored;
  if (legacyEmail?.trim()) return [legacyEmail.trim()];
  return [];
}
