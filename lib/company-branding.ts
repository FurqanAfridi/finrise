import { countryName } from "@/lib/countries";
import { DEFAULT_INVOICE_COLOR, routingFieldLabel } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export type CompanyBranding = {
  legalName: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  countryLabel: string | null;
  zipCode: string | null;
  taxId: string | null;
  website: string | null;
  bankName: string | null;
  bankDetails: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  paymentNotes: string | null;
  invoiceColor: string;
  termsAndConditions: string | null;
  defaultNetDays: number;
  logoSrc: string | null;
  hasLogo: boolean;
  hasBank: boolean;
};

export type BankPaymentLine = { label: string; value: string };

type ProfileRow = {
  legalName: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  zipCode: string | null;
  taxId: string | null;
  website: string | null;
  bankName: string | null;
  bankDetails: string | null;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  paymentNotes: string | null;
  invoiceColor: string | null;
  termsAndConditions: string | null;
  defaultNetDays: number | null;
  logoMime: string | null;
  logoData: Uint8Array | Buffer | null;
};

function toDataUrl(mime: string | null, data: Uint8Array | Buffer | null) {
  if (!data || data.length === 0) return null;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return `data:${mime || "image/png"};base64,${buffer.toString("base64")}`;
}

export function bankPaymentLines(branding: CompanyBranding): BankPaymentLine[] {
  const lines: BankPaymentLine[] = [];
  if (branding.bankName) lines.push({ label: "Bank name", value: branding.bankName });
  if (branding.bankAccountNumber) lines.push({ label: "Account number", value: branding.bankAccountNumber });
  if (branding.bankRoutingNumber) {
    lines.push({ label: routingFieldLabel(branding.country || ""), value: branding.bankRoutingNumber });
  }
  if (branding.bankIban) lines.push({ label: "IBAN", value: branding.bankIban });
  if (branding.bankSwift) lines.push({ label: "SWIFT / BIC", value: branding.bankSwift });
  if (lines.length === 0 && branding.bankDetails) {
    lines.push({ label: "Bank details", value: branding.bankDetails });
  }
  return lines;
}

export async function getCompanyBranding(tenantId: string, tenantName: string): Promise<CompanyBranding> {
  const [profiles, companyName] = await Promise.all([
    prisma.$queryRaw<ProfileRow[]>`
      SELECT
        "legalName",
        address,
        email,
        phone,
        country,
        "zipCode",
        "taxId",
        website,
        "bankName",
        "bankDetails",
        "bankAccountNumber",
        "bankRoutingNumber",
        "bankIban",
        "bankSwift",
        "paymentNotes",
        "invoiceColor",
        "termsAndConditions",
        "defaultNetDays",
        "logoMime",
        "logoData"
      FROM "CompanyProfile"
      WHERE "tenantId" = ${tenantId}
      LIMIT 1
    `,
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "companyName" } } }),
  ]);
  const profile = profiles[0];
  const bankName = profile?.bankName ?? null;
  const bankAccountNumber = profile?.bankAccountNumber ?? null;
  const bankIban = profile?.bankIban ?? null;
  const invoiceColor = /^#[0-9A-Fa-f]{6}$/.test(profile?.invoiceColor ?? "")
    ? (profile?.invoiceColor as string).toUpperCase()
    : DEFAULT_INVOICE_COLOR;
  return {
    legalName: profile?.legalName || companyName?.value || tenantName,
    address: profile?.address ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    country: profile?.country ?? null,
    countryLabel: countryName(profile?.country),
    zipCode: profile?.zipCode ?? null,
    taxId: profile?.taxId ?? null,
    website: profile?.website ?? null,
    bankName,
    bankDetails: profile?.bankDetails ?? null,
    bankAccountNumber,
    bankRoutingNumber: profile?.bankRoutingNumber ?? null,
    bankIban,
    bankSwift: profile?.bankSwift ?? null,
    paymentNotes: profile?.paymentNotes ?? null,
    invoiceColor,
    termsAndConditions: profile?.termsAndConditions ?? null,
    defaultNetDays: profile?.defaultNetDays ?? 7,
    logoSrc: toDataUrl(profile?.logoMime ?? null, profile?.logoData ?? null),
    hasLogo: Boolean(profile?.logoData && profile.logoData.length > 0),
    hasBank: Boolean(bankName && (bankAccountNumber || bankIban)),
  };
}

export async function nextBuyerInvoiceNumber(tenantId: string) {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.buyerInvoice.findFirst({
    where: { tenantId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const current = latest?.invoiceNumber?.slice(prefix.length) ?? "0";
  const next = (Number.parseInt(current, 10) || 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
