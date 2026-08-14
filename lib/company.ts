import { Prisma, TenantRole } from "@prisma/client";
import { ensureDefaultExpenseCategories } from "@/lib/finance/expense-categories";
import { prisma } from "@/lib/prisma";

export function slugifyCompanyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";
}

export type CompanyBankDetails = {
  bankName: string;
  bankAccountNumber: string | null;
  bankRoutingNumber: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  bankDetails: string;
};

export type CompanyDetails = {
  name: string;
  email?: string | null;
  phone: string;
  address: string;
  country: string;
  zipCode: string;
  bank: CompanyBankDetails;
};

export async function findExistingCompany(name: string, exceptTenantId?: string) {
  const slug = slugifyCompanyName(name);
  return prisma.tenant.findFirst({
    where: {
      ...(exceptTenantId ? { id: { not: exceptTenantId } } : {}),
      OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }],
    },
  });
}

export async function createCompanyForUser(userId: string, details: CompanyDetails, email?: string | null) {
  const name = details.name.trim();
  const existing = await findExistingCompany(name);
  if (existing) {
    return {
      error:
        "A company with this name already exists. Ask an admin for an invite, or choose a different name.",
    } as const;
  }

  const user =
    (userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : null) ??
    (email
      ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } })
      : null);
  if (!user) {
    return {
      error: "Your session is out of date. Sign in again, then create the company.",
    } as const;
  }

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: slugifyCompanyName(name),
        memberships: { create: { userId: user.id, role: TenantRole.ADMIN } },
        financeSettings: { create: {} },
        settings: { create: { key: "companyName", value: name } },
      },
    });
    await ensureDefaultExpenseCategories(tenant.id);
    await prisma.$executeRaw`
      INSERT INTO "CompanyProfile" (
        "tenantId", "legalName", email, phone, address, country, "zipCode",
        "bankName", "bankDetails", "bankAccountNumber", "bankRoutingNumber", "bankIban", "bankSwift"
      )
      VALUES (
        ${tenant.id},
        ${name},
        ${details.email ?? null},
        ${details.phone},
        ${details.address},
        ${details.country},
        ${details.zipCode},
        ${details.bank.bankName},
        ${details.bank.bankDetails},
        ${details.bank.bankAccountNumber},
        ${details.bank.bankRoutingNumber},
        ${details.bank.bankIban},
        ${details.bank.bankSwift}
      )
      ON CONFLICT ("tenantId") DO NOTHING
    `;
    return { tenant };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error:
            "A company with this name already exists. Ask an admin for an invite, or choose a different name.",
        } as const;
      }
      if (error.code === "P2003") {
        return {
          error: "Your session is out of date. Sign in again, then create the company.",
        } as const;
      }
    }
    throw error;
  }
}
