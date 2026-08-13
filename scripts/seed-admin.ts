import "dotenv/config";
import bcrypt from "bcryptjs";
import { PartnerTier, PrismaClient, Role, TenantRole } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = "clfinrisedefault0000000001";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@finrise.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "finrise" },
    update: { name: "Finrise" },
    create: { id: DEFAULT_TENANT_ID, name: "Finrise", slug: "finrise" },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, name: "Admin" },
    create: { email, passwordHash, role: Role.ADMIN, name: "Admin" },
  });

  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: TenantRole.ADMIN },
    create: { userId: user.id, tenantId: tenant.id, role: TenantRole.ADMIN },
  });

  await prisma.financeSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  const partners = [
    { name: "Libby", tier: PartnerTier.TOP_LINE, sharePercent: 10 },
    { name: "Rafia", tier: PartnerTier.EQUITY, sharePercent: 50 },
    { name: "Saad", tier: PartnerTier.EQUITY, sharePercent: 50 },
  ];
  for (const partner of partners) {
    await prisma.partner.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: partner.name } },
      update: { tier: partner.tier, sharePercent: partner.sharePercent, isActive: true },
      create: { tenantId: tenant.id, ...partner },
    });
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "companyName" } },
    update: {},
    create: { tenantId: tenant.id, key: "companyName", value: "Evolvetechinnovations" },
  });
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "currency" } },
    update: {},
    create: { tenantId: tenant.id, key: "currency", value: "USD" },
  });

  console.log(`Admin ready: ${user.email} on tenant ${tenant.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
