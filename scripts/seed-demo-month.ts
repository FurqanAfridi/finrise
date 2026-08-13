import "dotenv/config";
import { PaidApprovalStatus, PaymentStatus, PrismaClient, RateType } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = process.env.TENANT_SLUG ?? "finrise";

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (!tenant) throw new Error("Run npm run seed:admin first.");

  const year = 2099;
  const month = 1;
  const periodStart = new Date(Date.UTC(year, 0, 1));
  const periodEnd = new Date(Date.UTC(year, 0, 31));

  await prisma.buyerInvoice.deleteMany({ where: { tenantId: tenant.id, periodStart } });
  await prisma.publisherInvoice.deleteMany({ where: { tenantId: tenant.id, periodStart } });
  await prisma.expense.deleteMany({ where: { tenantId: tenant.id, year, month } });

  const buyer = await prisma.buyer.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Demo Buyer" } },
    update: {},
    create: { tenantId: tenant.id, name: "Demo Buyer", defaultPaymentTermsDays: 7 },
  });
  const publisher = await prisma.publisher.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Demo Publisher" } },
    update: {},
    create: { tenantId: tenant.id, name: "Demo Publisher" },
  });
  const vertical = await prisma.vertical.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "ACA" } },
    update: {},
    create: { tenantId: tenant.id, name: "ACA" },
  });
  const category = await prisma.expenseCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Operating" } },
    update: {},
    create: { tenantId: tenant.id, name: "Operating" },
  });

  await prisma.buyerInvoice.create({
    data: {
      tenantId: tenant.id,
      buyerId: buyer.id,
      verticalId: vertical.id,
      periodStart,
      periodEnd,
      periodLabel: "01/01 - 01/31",
      dueDate: new Date(Date.UTC(year, 0, 8)),
      paymentTermsDays: 7,
      leadCount: 1,
      rateType: RateType.FLAT,
      rate: 40371.27,
      revenue: 40371.27,
      receivable: 40371.27,
      received: 40371.27,
      invoiceNumber: "DEMO-2099-01",
      paymentStatus: PaymentStatus.PAID,
      paidAt: periodEnd,
      paymentMethod: "Bank Wire",
    },
  });

  await prisma.publisherInvoice.create({
    data: {
      tenantId: tenant.id,
      publisherId: publisher.id,
      verticalId: vertical.id,
      periodStart,
      periodEnd,
      periodLabel: "01/01 - 01/31",
      monthLabel: "January",
      weekLabel: "Demo",
      rateType: RateType.PROFIT_SHARE,
      amount: 6000,
      payable: 6000,
      paid: 6000,
      paidAt: periodEnd,
      paymentStatus: PaymentStatus.PAID,
      paidApprovalStatus: PaidApprovalStatus.APPROVED,
      invoiceNumber: "INTERNAL",
    },
  });

  await prisma.expense.create({
    data: {
      tenantId: tenant.id,
      year,
      month,
      category: "Operating",
      label: "Demo operating expenses",
      categoryId: category.id,
      actual: 22001,
      paid: 22001,
      notes: "Worked example: Revenue 34371.27, Profit 12370.27, Margin 35.99%",
    },
  });

  console.log("Demo month 2099-01 seeded.");
  console.log("  Buyer invoiced/received 40371.27");
  console.log("  Publisher owed/paid 6000");
  console.log("  Expenses 22001");
  console.log("  Expected: Revenue 34371.27, Profit 12370.27, Margin 35.99%");
  console.log("  Tax 3711.08, Distributable 8659.19, Libby 865.92, equity 3896.64 each");
  console.log("Open /reports/monthly/2099/1");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
