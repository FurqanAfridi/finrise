"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PartnerTier, Role, TaxOrder, TenantRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps, requireSessionUser, requireTenant, requireTenantAdmin, TENANT_COOKIE } from "@/lib/tenant";
import { convertedAmount } from "@/lib/finance/partnerLedger";
import { money } from "@/lib/finance/decimal";
import { NOTIFICATION, notifyReviewers } from "@/lib/notifications";
import { createCompanyForUser } from "@/lib/company";
import { getCompanyBranding } from "@/lib/company-branding";
import { inviteEmailContent } from "@/lib/invite-email";
import { INVITE_FROM_EMAIL, platformMailReady, sendPlatformMail } from "@/lib/platform-mail";
import {
  formField,
  parseBankFromForm,
  parseCompanyIdentity,
  parseCompanyName,
  parseCurrency,
  parseEmail,
  parseHexColor,
  parseInteger,
  parseMoney,
  parsePassword,
  parsePercent,
  parsePersonName,
  parseSharePercent,
  parseTaxId,
  parseTermsAndConditions,
  parseWebsite,
} from "@/lib/validation";

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function dec(formData: FormData, key: string) {
  const parsed = parseMoney(String(formData.get(key) ?? ""), key, false);
  if (!parsed.ok) return Number.NaN;
  return parsed.value;
}

function hasInvalidNumber(...values: Array<number | null | undefined>) {
  return values.some((value) => value != null && Number.isNaN(value));
}

function revalidateFinance() {
  revalidatePath("/expenses");
  revalidatePath("/pnl");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/partners");
  revalidatePath("/payouts");
  revalidatePath("/treasury");
  revalidatePath("/settings");
}

async function setActiveCompanyCookie(tenantId: string) {
  const jar = await cookies();
  jar.set(TENANT_COOKIE, tenantId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function switchTenantAction(formData: FormData) {
  const session = await requireSessionUser();
  const tenantId = str(formData, "tenantId");
  if (!tenantId) return;
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: session.user.id, tenantId } },
  });
  if (!membership) return;
  await setActiveCompanyCookie(tenantId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function upsertExpense(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const category = str(formData, "category");
  const paid = dec(formData, "paid") ?? 0;
  const actual = dec(formData, "actual") ?? paid;
  if (!category || !year || !month || hasInvalidNumber(paid, actual, year, month)) return;

  const categoryRow = await prisma.expenseCategory.upsert({
    where: { tenantId_name: { tenantId: ctx.tenantId, name: category } },
    update: {},
    create: { tenantId: ctx.tenantId, name: category },
  });

  const data = {
    tenantId: ctx.tenantId,
    year,
    month,
    category,
    label: str(formData, "label") ?? category,
    categoryId: categoryRow.id,
    paid,
    actual,
    notes: str(formData, "notes"),
    paidAt: str(formData, "paidAt") ? new Date(String(formData.get("paidAt"))) : null,
    method: str(formData, "method"),
  };
  if (id) await prisma.expense.updateMany({ where: { id, tenantId: ctx.tenantId }, data });
  else await prisma.expense.create({ data });
  revalidateFinance();
}

export async function deleteExpense(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  await prisma.expense.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidateFinance();
}

export async function upsertRecurringExpense(formData: FormData) {
  const ctx = await requireTenant();
  const category = str(formData, "category");
  const label = str(formData, "label");
  const amount = dec(formData, "amount");
  const dayOfMonth = Number(formData.get("dayOfMonth") ?? 1);
  if (!category || !label || amount == null || hasInvalidNumber(amount, dayOfMonth)) return;
  const categoryRow = await prisma.expenseCategory.upsert({
    where: { tenantId_name: { tenantId: ctx.tenantId, name: category } },
    update: {},
    create: { tenantId: ctx.tenantId, name: category },
  });
  const id = str(formData, "id");
  const data = {
    tenantId: ctx.tenantId,
    categoryId: categoryRow.id,
    label,
    amount,
    dayOfMonth: Math.min(28, Math.max(1, dayOfMonth || 1)),
    isActive: str(formData, "isActive") !== "false",
  };
  if (id) await prisma.recurringExpense.updateMany({ where: { id, tenantId: ctx.tenantId }, data });
  else await prisma.recurringExpense.create({ data });
  revalidatePath("/expenses");
}

export async function generateRecurringForMonth(formData: FormData) {
  const ctx = await requireTenant();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!year || !month) return;
  const templates = await prisma.recurringExpense.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: { category: true },
  });
  for (const template of templates) {
    const existing = await prisma.expense.findFirst({
      where: { tenantId: ctx.tenantId, recurringExpenseId: template.id, year, month },
    });
    if (existing) continue;
    await prisma.expense.create({
      data: {
        tenantId: ctx.tenantId,
        year,
        month,
        category: template.category.name,
        label: template.label,
        categoryId: template.categoryId,
        recurringExpenseId: template.id,
        actual: template.amount,
        paid: template.amount,
      },
    });
  }
  revalidateFinance();
}

export async function upsertPartner(formData: FormData) {
  const ctx = await requireTenantAdmin();
  const name = parsePersonName(formField(formData, "name"), "Name");
  if (!name.ok) return;
  const sharePercent = parseSharePercent(formField(formData, "sharePercent"));
  if (!sharePercent.ok) return;
  const tier = str(formData, "tier") === "TOP_LINE" ? PartnerTier.TOP_LINE : PartnerTier.EQUITY;
  const id = str(formData, "id");
  const data = {
    tenantId: ctx.tenantId,
    name: name.value,
    tier,
    sharePercent: sharePercent.value,
    isActive: str(formData, "isActive") !== "false",
  };
  if (id) await prisma.partner.updateMany({ where: { id, tenantId: ctx.tenantId }, data });
  else await prisma.partner.create({ data });
  revalidatePath("/partners");
}

export async function recordWithdrawal(formData: FormData) {
  const ctx = await requireTenant();
  const partnerId = str(formData, "partnerId");
  const amountBase = parseMoney(formField(formData, "amountBase"), "USD amount", true);
  if (!partnerId || !amountBase.ok || amountBase.value == null) return;
  if (amountBase.value <= 0) return;
  const conversionRateRaw = formField(formData, "conversionRate");
  const conversionRate = conversionRateRaw
    ? parseMoney(conversionRateRaw, "Conversion rate", false)
    : { ok: true as const, value: null as number | null };
  if (!conversionRate.ok) return;
  const amountConvertedRaw = formField(formData, "amountConverted");
  const amountConvertedParsed = amountConvertedRaw
    ? parseMoney(amountConvertedRaw, "Converted amount", false)
    : { ok: true as const, value: null as number | null };
  if (!amountConvertedParsed.ok) return;
  const partner = await prisma.partner.findFirst({ where: { id: partnerId, tenantId: ctx.tenantId } });
  if (!partner) return;
  const amountConverted = conversionRate.value
    ? convertedAmount(money(amountBase.value), money(conversionRate.value))?.toNumber()
    : amountConvertedParsed.value;
  const targetCurrency = formField(formData, "targetCurrency").trim().toUpperCase() || null;
  if (targetCurrency && !/^[A-Z]{3}$/.test(targetCurrency)) return;
  await prisma.partnerWithdrawal.create({
    data: {
      tenantId: ctx.tenantId,
      partnerId,
      amountBase: amountBase.value,
      baseCurrency: str(formData, "baseCurrency") ?? "USD",
      targetCurrency,
      conversionRate: conversionRate.value,
      amountConverted,
      method: str(formData, "method"),
      date: str(formData, "date") ? new Date(String(formData.get("date"))) : new Date(),
      note: str(formData, "note"),
    },
  });
  await notifyReviewers({
    tenantId: ctx.tenantId,
    type: NOTIFICATION.WITHDRAWAL,
    title: "Partner withdrawal recorded",
    body: `${partner.name} withdrew ${amountBase.value.toFixed(2)} USD`,
    href: "/partners",
    excludeUserId: ctx.userId,
  });
  revalidateFinance();
}

export async function upsertPayout(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  const person = str(formData, "person");
  const amount = dec(formData, "amount");
  if (!person || amount == null || hasInvalidNumber(amount)) return;
  const data = {
    tenantId: ctx.tenantId,
    person,
    amount,
    year: dec(formData, "year"),
    month: dec(formData, "month"),
    date: str(formData, "date") ? new Date(String(formData.get("date"))) : null,
    notes: str(formData, "notes"),
  };
  if (id) await prisma.partnerPayout.updateMany({ where: { id, tenantId: ctx.tenantId }, data });
  else await prisma.partnerPayout.create({ data });
  revalidatePath("/payouts");
  revalidatePath("/dashboard");
}

export async function deletePayout(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  await prisma.partnerPayout.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidatePath("/payouts");
}

export async function upsertDirectory(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ctx = await requireBrokerOps();
  const kind = str(formData, "kind");
  const name = parseCompanyName(formField(formData, "name"));
  if (!kind || !name.ok) return { error: name.ok ? "Choose a contact type." : name.error };

  if (kind === "buyer") {
    const email = parseEmail(formField(formData, "email"), true);
    if (!email.ok || !email.value) return { error: email.ok ? "Email is required." : email.error };
    const contactName = parsePersonName(formField(formData, "contactName"), "Contact name");
    if (!contactName.ok) return { error: contactName.error };
    const address = formField(formData, "address").trim();
    if (address.length < 5) return { error: "Enter a full billing address." };
    const termsDays = parseInteger(formField(formData, "defaultPaymentTermsDays") || "7", "NET days", 0, 365, true);
    if (!termsDays.ok || termsDays.value == null) return { error: termsDays.ok ? "NET days is required." : termsDays.error };
    const defaultMethod = str(formData, "defaultMethod");
    const defaultTerms = str(formData, "defaultTerms");
    const dup = await prisma.buyer.findFirst({
      where: { tenantId: ctx.tenantId, name: name.value },
      select: { id: true },
    });
    if (dup) return { error: "A buyer with that name already exists in this company." };
    const id = `c${randomBytes(12).toString("hex")}`;
    await prisma.$executeRaw`
      INSERT INTO "Buyer" (
        id, "tenantId", name, email, address, "contactName",
        "defaultTerms", "defaultMethod", "defaultPaymentTermsDays"
      )
      VALUES (
        ${id}, ${ctx.tenantId}, ${name.value}, ${email.value}, ${address}, ${contactName.value},
        ${defaultTerms}, ${defaultMethod}, ${termsDays.value}
      )
    `;
  }

  if (kind === "publisher") {
    const email = parseEmail(formField(formData, "email"), true);
    if (!email.ok || !email.value) return { error: email.ok ? "Email is required." : email.error };
    const contactName = parsePersonName(formField(formData, "contactName"), "Contact name");
    if (!contactName.ok) return { error: contactName.error };
    const address = formField(formData, "address").trim();
    if (address.length < 5) return { error: "Enter a full address." };
    const termsDays = parseInteger(formField(formData, "defaultPaymentTermsDays") || "7", "NET days", 0, 365, true);
    if (!termsDays.ok || termsDays.value == null) return { error: termsDays.ok ? "NET days is required." : termsDays.error };
    const isInternal = str(formData, "isInternal") === "true";
    const defaultTerms = str(formData, "defaultTerms");
    const dup = await prisma.publisher.findFirst({
      where: { tenantId: ctx.tenantId, name: name.value },
      select: { id: true },
    });
    if (dup) return { error: "A publisher with that name already exists in this company." };
    const id = `c${randomBytes(12).toString("hex")}`;
    // Raw insert: stale Next Prisma clients may not know Publisher.email/contactName/address yet.
    await prisma.$executeRaw`
      INSERT INTO "Publisher" (
        id, "tenantId", name, email, address, "contactName",
        "defaultTerms", "defaultPaymentTermsDays", "isInternal"
      )
      VALUES (
        ${id}, ${ctx.tenantId}, ${name.value}, ${email.value}, ${address}, ${contactName.value},
        ${defaultTerms}, ${termsDays.value}, ${isInternal}
      )
    `;
  }

  if (kind === "vertical") {
    try {
      await prisma.vertical.create({ data: { tenantId: ctx.tenantId, name: name.value } });
    } catch {
      return { error: "A vertical with that name already exists." };
    }
  }

  revalidatePath("/directory");
  revalidatePath("/buyers");
  revalidatePath("/publishers");
  return { ok: true };
}

async function sendInviteEmail(input: {
  email: string;
  token: string;
  tenantName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  tenantRole: TenantRole;
  expiresAt: Date;
}) {
  const base = (process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${base}/invite/${input.token}`;
  const content = inviteEmailContent({
    inviteeEmail: input.email,
    companyName: input.tenantName,
    inviterName: input.inviterName,
    inviterEmail: input.inviterEmail,
    tenantRole: input.tenantRole,
    inviteUrl,
    expiresAt: input.expiresAt,
  });

  if (!platformMailReady()) {
    return {
      ok: true as const,
      emailed: false,
      inviteUrl,
      error: `Invite created, but platform email is not configured. Share this link, or set PLATFORM_SMTP_* so invites send from ${INVITE_FROM_EMAIL}.`,
    };
  }

  try {
    const sent = await sendPlatformMail({
      to: input.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    if ("error" in sent) {
      return { ok: true as const, emailed: false, inviteUrl, error: `Invite created, but email failed: ${sent.error}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the invitation email.";
    return { ok: true as const, emailed: false, inviteUrl, error: `Invite created, but email failed: ${message}` };
  }

  return { ok: true as const, emailed: true, inviteUrl };
}

export async function createInvite(
  _prev: { error?: string; ok?: boolean; emailed?: boolean; inviteUrl?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; emailed?: boolean; inviteUrl?: string }> {
  const ctx = await requireTenantAdmin();
  const email = parseEmail(formField(formData, "email"), true);
  if (!email.ok || !email.value) return { error: email.ok ? "Email is required." : email.error };
  const tenantRole = (str(formData, "tenantRole") as TenantRole | null) ?? TenantRole.BROKER;
  if (tenantRole === TenantRole.BUYER || tenantRole === TenantRole.PUBLISHER) {
    return { error: "Invite buyers and publishers from Contacts, so they are linked to the right company record." };
  }
  const role = tenantRole === TenantRole.ADMIN ? Role.ADMIN : Role.MEMBER;
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.invite.create({
    data: {
      email: email.value,
      token,
      role,
      tenantRole,
      tenantId: ctx.tenantId,
      expiresAt,
      createdById: ctx.userId,
    },
  });

  const result = await sendInviteEmail({
    email: email.value,
    token,
    tenantName: ctx.tenantName,
    inviterName: ctx.name,
    inviterEmail: ctx.email,
    tenantRole,
    expiresAt,
  });
  revalidatePath("/settings");
  return result;
}

/** Invite a specific buyer or publisher portal user from Contacts. */
export async function inviteContact(
  _prev: { error?: string; ok?: boolean; emailed?: boolean; inviteUrl?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; emailed?: boolean; inviteUrl?: string }> {
  const ctx = await requireBrokerOps();
  const kind = str(formData, "kind");
  const contactId = str(formData, "contactId");
  if (!kind || !contactId) return { error: "Choose a contact to invite." };

  let emailValue: string;
  let tenantRole: TenantRole;
  let buyerId: string | null = null;
  let publisherId: string | null = null;

  if (kind === "buyer") {
    const buyers = await prisma.$queryRaw<{ id: string; email: string | null }[]>`
      SELECT id, email FROM "Buyer" WHERE id = ${contactId} AND "tenantId" = ${ctx.tenantId} LIMIT 1
    `;
    const buyer = buyers[0];
    if (!buyer) return { error: "Buyer not found." };
    const email = parseEmail(formField(formData, "email") || buyer.email || "", true);
    if (!email.ok || !email.value) return { error: email.ok ? "Add an email on this buyer before inviting." : email.error };
    emailValue = email.value;
    tenantRole = TenantRole.BUYER;
    buyerId = buyer.id;
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "TenantMembership" WHERE "buyerId" = ${buyer.id} LIMIT 1
    `;
    if (existing[0]) return { error: "This buyer already has portal access." };
    if (buyer.email !== emailValue) {
      await prisma.$executeRaw`
        UPDATE "Buyer" SET email = ${emailValue} WHERE id = ${buyer.id} AND "tenantId" = ${ctx.tenantId}
      `;
    }
  } else if (kind === "publisher") {
    const publishers = await prisma.$queryRaw<{ id: string; email: string | null }[]>`
      SELECT id, email FROM "Publisher" WHERE id = ${contactId} AND "tenantId" = ${ctx.tenantId} LIMIT 1
    `;
    const publisher = publishers[0];
    if (!publisher) return { error: "Publisher not found." };
    const email = parseEmail(formField(formData, "email") || publisher.email || "", true);
    if (!email.ok || !email.value) return { error: email.ok ? "Add an email on this publisher before inviting." : email.error };
    emailValue = email.value;
    tenantRole = TenantRole.PUBLISHER;
    publisherId = publisher.id;
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "TenantMembership" WHERE "publisherId" = ${publisher.id} LIMIT 1
    `;
    if (existing[0]) return { error: "This publisher already has portal access." };
    if (publisher.email !== emailValue) {
      await prisma.$executeRaw`
        UPDATE "Publisher" SET email = ${emailValue} WHERE id = ${publisher.id} AND "tenantId" = ${ctx.tenantId}
      `;
    }
  } else {
    return { error: "Only buyers and publishers can be invited from Contacts." };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Raw insert so a stale Prisma singleton still writes portal link columns.
  await prisma.$executeRaw`
    INSERT INTO "Invite" (
      id, email, token, role, "tenantRole", "expiresAt", "createdById", "tenantId", "buyerId", "publisherId", "createdAt"
    )
    VALUES (
      ${`c${randomBytes(12).toString("hex")}`},
      ${emailValue},
      ${token},
      ${Role.MEMBER}::"Role",
      ${tenantRole}::"TenantRole",
      ${expiresAt},
      ${ctx.userId},
      ${ctx.tenantId},
      ${buyerId},
      ${publisherId},
      NOW()
    )
  `;

  const result = await sendInviteEmail({
    email: emailValue,
    token,
    tenantName: ctx.tenantName,
    inviterName: ctx.name,
    inviterEmail: ctx.email,
    tenantRole,
    expiresAt,
  });
  revalidatePath("/directory");
  revalidatePath("/settings");
  return result;
}

export async function saveSettings(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireTenantAdmin();
  const currency = parseCurrency(formField(formData, "currency") || "USD");
  if (!currency.ok) return { error: currency.error };
  const taxRate = parsePercent(formField(formData, "taxRatePercent"), "Tax rate");
  if (!taxRate.ok) return { error: taxRate.error };
  const variance = parseMoney(formField(formData, "varianceToleranceAmount"), "Variance tolerance", true);
  if (!variance.ok || variance.value == null) return { error: variance.ok ? "Variance tolerance is required." : variance.error };
  const fiscalDay = parseInteger(formField(formData, "fiscalMonthStartDay"), "Fiscal month start day", 1, 28, true);
  if (!fiscalDay.ok || fiscalDay.value == null) {
    return { error: fiscalDay.ok ? "Fiscal month start day is required." : fiscalDay.error };
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: ctx.tenantId, key: "currency" } },
    update: { value: currency.value },
    create: { tenantId: ctx.tenantId, key: "currency", value: currency.value },
  });
  await prisma.financeSettings.upsert({
    where: { tenantId: ctx.tenantId },
    update: {
      taxRatePercent: taxRate.value,
      varianceToleranceAmount: variance.value,
      taxOrder: str(formData, "taxOrder") === "TIER1_FIRST" ? TaxOrder.TIER1_FIRST : TaxOrder.TAX_FIRST,
      fiscalMonthStartDay: fiscalDay.value,
    },
    create: { tenantId: ctx.tenantId },
  });
  revalidateFinance();
  return {};
}

const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export async function saveCompanyProfile(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireTenantAdmin();
  const logo = formData.get("logo");
  const removeLogo = str(formData, "removeLogo") === "true";
  const taxId = parseTaxId(formField(formData, "taxId"));
  if (!taxId.ok) return { error: taxId.error };
  const website = parseWebsite(formField(formData, "website"));
  if (!website.ok) return { error: website.error };
  const invoiceColor = parseHexColor(formField(formData, "invoiceColor"));
  if (!invoiceColor.ok) return { error: invoiceColor.error };
  const defaultNetDays = parseInteger(formField(formData, "defaultNetDays"), "Default NET days", 0, 365, true);
  if (!defaultNetDays.ok || defaultNetDays.value == null) {
    return { error: defaultNetDays.ok ? "Default NET days is required." : defaultNetDays.error };
  }
  const termsAndConditions = parseTermsAndConditions(formField(formData, "termsAndConditions"));
  if (!termsAndConditions.ok) return { error: termsAndConditions.error };
  const paymentNotes = str(formData, "paymentNotes");

  let logoMime: string | null | undefined;
  let logoData: Uint8Array<ArrayBuffer> | null | undefined;
  if (removeLogo) {
    logoMime = null;
    logoData = null;
  } else if (logo instanceof File && logo.size > 0) {
    if (!LOGO_TYPES.has(logo.type) || logo.size > LOGO_MAX_BYTES) {
      return { error: "Logo must be PNG, JPG, WebP, GIF, or SVG up to 2 MB." };
    }
    logoMime = logo.type;
    logoData = new Uint8Array(await logo.arrayBuffer());
  }

  if (removeLogo) {
    await prisma.$executeRaw`
      INSERT INTO "CompanyProfile" (
        "tenantId", "taxId", website, "paymentNotes", "invoiceColor", "defaultNetDays", "termsAndConditions",
        "logoMime", "logoData"
      )
      VALUES (
        ${ctx.tenantId}, ${taxId.value}, ${website.value}, ${paymentNotes}, ${invoiceColor.value},
        ${defaultNetDays.value}, ${termsAndConditions.value}, NULL, NULL
      )
      ON CONFLICT ("tenantId") DO UPDATE SET
        "taxId" = EXCLUDED."taxId",
        website = EXCLUDED.website,
        "paymentNotes" = EXCLUDED."paymentNotes",
        "invoiceColor" = EXCLUDED."invoiceColor",
        "defaultNetDays" = EXCLUDED."defaultNetDays",
        "termsAndConditions" = EXCLUDED."termsAndConditions",
        "logoMime" = NULL,
        "logoData" = NULL
    `;
  } else if (logoData) {
    await prisma.$executeRaw`
      INSERT INTO "CompanyProfile" (
        "tenantId", "taxId", website, "paymentNotes", "invoiceColor", "defaultNetDays", "termsAndConditions",
        "logoMime", "logoData"
      )
      VALUES (
        ${ctx.tenantId}, ${taxId.value}, ${website.value}, ${paymentNotes}, ${invoiceColor.value},
        ${defaultNetDays.value}, ${termsAndConditions.value}, ${logoMime}, ${logoData}
      )
      ON CONFLICT ("tenantId") DO UPDATE SET
        "taxId" = EXCLUDED."taxId",
        website = EXCLUDED.website,
        "paymentNotes" = EXCLUDED."paymentNotes",
        "invoiceColor" = EXCLUDED."invoiceColor",
        "defaultNetDays" = EXCLUDED."defaultNetDays",
        "termsAndConditions" = EXCLUDED."termsAndConditions",
        "logoMime" = EXCLUDED."logoMime",
        "logoData" = EXCLUDED."logoData"
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "CompanyProfile" (
        "tenantId", "taxId", website, "paymentNotes", "invoiceColor", "defaultNetDays", "termsAndConditions"
      )
      VALUES (
        ${ctx.tenantId}, ${taxId.value}, ${website.value}, ${paymentNotes}, ${invoiceColor.value},
        ${defaultNetDays.value}, ${termsAndConditions.value}
      )
      ON CONFLICT ("tenantId") DO UPDATE SET
        "taxId" = EXCLUDED."taxId",
        website = EXCLUDED.website,
        "paymentNotes" = EXCLUDED."paymentNotes",
        "invoiceColor" = EXCLUDED."invoiceColor",
        "defaultNetDays" = EXCLUDED."defaultNetDays",
        "termsAndConditions" = EXCLUDED."termsAndConditions"
    `;
  }

  revalidatePath("/settings");
  revalidatePath("/buyers/generate");
  revalidatePath("/invoices");
  revalidatePath("/", "layout");
  return {};
}

export async function saveCompanyBankAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireTenantAdmin();
  const branding = await getCompanyBranding(ctx.tenantId, ctx.tenantName);
  if (branding.hasBank) return { error: "Company bank details are locked and cannot be changed." };
  if (!branding.country) return { error: "Company country is missing. Bank details follow the locked country." };
  const bank = parseBankFromForm(formData, branding.country);
  if (!bank.ok) return { error: bank.error };

  await prisma.$executeRaw`
    INSERT INTO "CompanyProfile" (
      "tenantId", "bankName", "bankDetails", "bankAccountNumber", "bankRoutingNumber", "bankIban", "bankSwift"
    )
    VALUES (
      ${ctx.tenantId},
      ${bank.value.bankName},
      ${bank.value.bankDetails},
      ${bank.value.bankAccountNumber},
      ${bank.value.bankRoutingNumber},
      ${bank.value.bankIban},
      ${bank.value.bankSwift}
    )
    ON CONFLICT ("tenantId") DO UPDATE SET
      "bankName" = EXCLUDED."bankName",
      "bankDetails" = EXCLUDED."bankDetails",
      "bankAccountNumber" = EXCLUDED."bankAccountNumber",
      "bankRoutingNumber" = EXCLUDED."bankRoutingNumber",
      "bankIban" = EXCLUDED."bankIban",
      "bankSwift" = EXCLUDED."bankSwift"
  `;
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return {};
}

export async function createTenantAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const session = await requireSessionUser();
  const identity = parseCompanyIdentity({
    name: formField(formData, "name"),
    country: formField(formData, "country"),
    phone: formField(formData, "phone"),
    address: formField(formData, "address"),
    zipCode: formField(formData, "zipCode"),
    email: session.user.email ?? undefined,
    bankName: formField(formData, "bankName"),
    bankAccountNumber: formField(formData, "bankAccountNumber"),
    bankRoutingNumber: formField(formData, "bankRoutingNumber"),
    bankIban: formField(formData, "bankIban"),
    bankSwift: formField(formData, "bankSwift"),
  });
  if (!identity.ok) return { error: identity.error };
  const result = await createCompanyForUser(session.user.id, {
    name: identity.value.name,
    email: identity.value.email ?? session.user.email ?? null,
    phone: identity.value.phone,
    address: identity.value.address,
    country: identity.value.country,
    zipCode: identity.value.zipCode,
    bank: identity.value.bank,
  });
  if ("error" in result) return { error: result.error };
  await setActiveCompanyCookie(result.tenant.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function renameCompanyAction(_formData: FormData) {
  return;
}

export async function leaveCompanyAction(formData: FormData) {
  const session = await requireSessionUser();
  const tenantId = str(formData, "tenantId");
  if (!tenantId) return;
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: session.user.id, tenantId } },
  });
  if (!membership) return;
  if (membership.role === TenantRole.ADMIN) {
    const adminCount = await prisma.tenantMembership.count({
      where: { tenantId, role: TenantRole.ADMIN },
    });
    if (adminCount <= 1) return;
  }
  await prisma.tenantMembership.delete({ where: { id: membership.id } });
  const remaining = await prisma.tenantMembership.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  const jar = await cookies();
  const current = jar.get(TENANT_COOKIE)?.value;
  revalidatePath("/", "layout");
  if (remaining.length === 0) {
    jar.delete(TENANT_COOKIE);
    redirect("/no-tenant");
  }
  if (!current || current === tenantId || !remaining.some((row) => row.tenantId === current)) {
    await setActiveCompanyCookie(remaining[0].tenantId);
  }
  redirect("/settings?tab=companies");
}

export async function acceptInvite(formData: FormData) {
  const token = str(formData, "token");
  const name = parsePersonName(formField(formData, "name"), "Name");
  const password = parsePassword(String(formData.get("password") ?? ""));
  if (!token) return { error: "Invite is invalid." };

  const inviteRows = await prisma.$queryRaw<
    {
      id: string;
      email: string;
      role: Role;
      tenantRole: TenantRole;
      expiresAt: Date;
      usedAt: Date | null;
      tenantId: string | null;
      buyerId: string | null;
      publisherId: string | null;
    }[]
  >`
    SELECT id, email, role, "tenantRole", "expiresAt", "usedAt", "tenantId", "buyerId", "publisherId"
    FROM "Invite"
    WHERE token = ${token}
    LIMIT 1
  `;
  const invite = inviteRows[0];
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { error: "This invite has expired or was already used." };
  }

  let user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (!user) {
    if (!name.ok) return { error: name.error };
    if (!password.ok) return { error: password.error };
    user = await prisma.user.create({
      data: {
        email: invite.email,
        name: name.value,
        passwordHash: await bcrypt.hash(password.value, 12),
        role: invite.role,
      },
    });
  } else if (invite.role === Role.ADMIN && user.role !== Role.ADMIN) {
    await prisma.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });
  }

  // Platform-admin invites have no company membership.
  if (invite.tenantId) {
    const membershipId = `c${randomBytes(12).toString("hex")}`;
    await prisma.$executeRaw`
      INSERT INTO "TenantMembership" (
        id, "userId", "tenantId", role, "buyerId", "publisherId", "createdAt"
      )
      VALUES (
        ${membershipId},
        ${user.id},
        ${invite.tenantId},
        ${invite.tenantRole}::"TenantRole",
        ${invite.buyerId},
        ${invite.publisherId},
        NOW()
      )
      ON CONFLICT ("userId", "tenantId") DO UPDATE SET
        role = EXCLUDED.role,
        "buyerId" = EXCLUDED."buyerId",
        "publisherId" = EXCLUDED."publisherId"
    `;
    await setActiveCompanyCookie(invite.tenantId);
  }

  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  return { ok: true };
}

export async function upsertTreasuryCharge(formData: FormData) {
  const ctx = await requireTenant();
  const amount = parseMoney(formField(formData, "amount"), "Amount", true);
  if (!amount.ok || amount.value == null) return;
  await prisma.ccCharge.create({
    data: {
      tenantId: ctx.tenantId,
      kind: str(formData, "kind") ?? "STATEMENT",
      monthLabel: str(formData, "monthLabel"),
      date: str(formData, "date") ? new Date(String(formData.get("date"))) : null,
      amount: amount.value,
      notes: str(formData, "notes"),
    },
  });
  revalidatePath("/treasury");
}

export async function upsertFxTransfer(formData: FormData) {
  const ctx = await requireTenant();
  const usd = dec(formData, "usd");
  const pkr = dec(formData, "pkr");
  const rate = dec(formData, "rate");
  if (hasInvalidNumber(usd, pkr, rate)) return;
  await prisma.fxTransfer.create({
    data: {
      tenantId: ctx.tenantId,
      person: str(formData, "person") ?? "Rafia",
      usd,
      pkr,
      rate,
      date: str(formData, "date") ? new Date(String(formData.get("date"))) : null,
      notes: str(formData, "notes"),
    },
  });
  revalidatePath("/treasury");
}

export async function upsertBankAccount(formData: FormData) {
  const ctx = await requireTenant();
  const name = str(formData, "name");
  const balance = dec(formData, "balance") ?? 0;
  if (!name || hasInvalidNumber(balance)) return;
  await prisma.bankAccount.upsert({
    where: { tenantId_name: { tenantId: ctx.tenantId, name } },
    update: { balance },
    create: { tenantId: ctx.tenantId, name, balance },
  });
  revalidatePath("/treasury");
  revalidatePath("/dashboard");
}

export async function upsertMonthReconciliation(formData: FormData) {
  const ctx = await requireTenant();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const statementTotal = dec(formData, "statementTotal");
  if (!year || !month || statementTotal == null || hasInvalidNumber(statementTotal, year, month)) return;
  await prisma.monthReconciliation.upsert({
    where: { tenantId_year_month: { tenantId: ctx.tenantId, year, month } },
    update: { statementTotal, notes: str(formData, "notes") },
    create: { tenantId: ctx.tenantId, year, month, statementTotal, notes: str(formData, "notes") },
  });
  revalidatePath("/treasury");
}

export async function markNotificationsRead() {
  const ctx = await requireTenant();
  await prisma.notification.updateMany({
    where: { tenantId: ctx.tenantId, userId: ctx.userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

export async function markNotificationRead(formData: FormData) {
  const ctx = await requireTenant();
  const id = str(formData, "id");
  if (!id) return;
  await prisma.notification.updateMany({
    where: { id, tenantId: ctx.tenantId, userId: ctx.userId },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
