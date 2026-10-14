import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  InvoiceStatus,
  PaidApprovalStatus,
  PartnerTier,
  PaymentStatus,
  PrismaClient,
  RateType,
  Role,
  TenantRole,
} from "@prisma/client";

/**
 * Full demo dataset for local testing. Everything it creates is tagged so it can be removed:
 * contacts/categories/accounts start with "Demo", invoice numbers start with "DEMOF-",
 * users use @demo.fundlookup.test. Run with --clean to remove it all again.
 *
 *   npm run seed:demo:full
 *   npm run seed:demo:full -- --clean
 */
const prisma = new PrismaClient();
const SLUG = process.env.TENANT_SLUG ?? "finrise";
const DEMO_EMAIL_DOMAIN = "demo.fundlookup.test";
/** Login password for every demo user (local test value only). */
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "DemoPass#2026";
const DEMO_PREFIX = "Demo ";
const INVOICE_PREFIX = "DEMOF-";
/** Contacts owned by seed-demo-month.ts; leave them alone. */
const MONTH_DEMO_NAMES = ["Demo Buyer", "Demo Publisher"];

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const monthName = (m: number) => utc(2000, m, 1).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
const round2 = (n: number) => Math.round(n * 100) / 100;

async function clean(tenantId: string) {
  const buyers = await prisma.buyer.findMany({ where: { tenantId, name: { startsWith: DEMO_PREFIX, notIn: MONTH_DEMO_NAMES } }, select: { id: true } });
  const publishers = await prisma.publisher.findMany({ where: { tenantId, name: { startsWith: DEMO_PREFIX, notIn: MONTH_DEMO_NAMES } }, select: { id: true } });
  const buyerIds = buyers.map((b) => b.id);
  const publisherIds = publishers.map((p) => p.id);

  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } });
  await prisma.buyerDailyFigure.deleteMany({ where: { tenantId, buyerId: { in: buyerIds } } });
  await prisma.publisherDailyFigure.deleteMany({ where: { tenantId, publisherId: { in: publisherIds } } });
  await prisma.buyerInvoice.deleteMany({ where: { tenantId, OR: [{ buyerId: { in: buyerIds } }, { invoiceNumber: { startsWith: INVOICE_PREFIX } }] } });
  await prisma.publisherInvoice.deleteMany({ where: { tenantId, OR: [{ publisherId: { in: publisherIds } }, { invoiceNumber: { startsWith: INVOICE_PREFIX } }] } });
  await prisma.buyer.deleteMany({ where: { id: { in: buyerIds } } });
  await prisma.publisher.deleteMany({ where: { id: { in: publisherIds } } });

  const categories = await prisma.expenseCategory.findMany({ where: { tenantId, name: { startsWith: DEMO_PREFIX } }, select: { id: true } });
  const categoryIds = categories.map((c) => c.id);
  await prisma.expense.deleteMany({ where: { tenantId, categoryId: { in: categoryIds } } });
  await prisma.recurringExpense.deleteMany({ where: { tenantId, categoryId: { in: categoryIds } } });
  await prisma.expenseCategory.deleteMany({ where: { id: { in: categoryIds } } });

  await prisma.partnerWithdrawal.deleteMany({ where: { tenantId, note: { startsWith: "[demo]" } } });
  await prisma.partnerPayout.deleteMany({ where: { tenantId, notes: { startsWith: "[demo]" } } });
  await prisma.fxTransfer.deleteMany({ where: { tenantId, notes: { startsWith: "[demo]" } } });
  await prisma.ccCharge.deleteMany({ where: { tenantId, notes: { startsWith: "[demo]" } } });
  await prisma.monthReconciliation.deleteMany({ where: { tenantId, notes: { startsWith: "[demo]" } } });
  await prisma.bankAccount.deleteMany({ where: { tenantId, name: { startsWith: DEMO_PREFIX } } });
  await prisma.vertical.deleteMany({
    where: { tenantId, name: { startsWith: DEMO_PREFIX }, buyerInvoices: { none: {} }, publisherInvoices: { none: {} } },
  });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: SLUG } });
  if (!tenant) throw new Error("Run npm run seed:admin first.");
  const tenantId = tenant.id;

  await clean(tenantId);
  if (process.argv.includes("--clean")) {
    console.log("Demo data removed.");
    return;
  }

  // ---- Verticals -------------------------------------------------------------------------
  const verticalNames = ["Demo ACA", "Demo Medicare", "Demo Final Expense", "Demo Auto Insurance"];
  const verticals: Record<string, string> = {};
  for (const name of verticalNames) {
    const row = await prisma.vertical.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {},
      create: { tenantId, name },
    });
    verticals[name] = row.id;
  }

  // ---- Buyers (money coming in) ----------------------------------------------------------
  const buyerSpecs = [
    { name: "Demo Apex Health Leads", terms: 7, verticals: [["Demo ACA", 38], ["Demo Medicare", 45]] },
    { name: "Demo BlueRiver Insurance", terms: 15, verticals: [["Demo Medicare", 52]] },
    { name: "Demo Summit Final Expense", terms: 7, verticals: [["Demo Final Expense", 30]] },
    { name: "Demo Northstar Auto", terms: 30, verticals: [["Demo Auto Insurance", 22]] },
  ] as const;
  const buyers: { id: string; name: string; terms: number; verticals: readonly (readonly [string, number])[] }[] = [];
  for (const spec of buyerSpecs) {
    const slug = spec.name.replace(DEMO_PREFIX, "").toLowerCase().replace(/[^a-z]+/g, "");
    const buyer = await prisma.buyer.create({
      data: {
        tenantId,
        name: spec.name,
        email: `billing@${slug}.example`,
        contactName: "Accounts Payable",
        address: "100 Demo Street, Austin, TX",
        defaultPaymentTermsDays: spec.terms,
        defaultMethod: "Bank Wire",
        contractStartDate: utc(2026, 1, 1),
        emails: {
          create: [
            { tenantId, email: `billing@${slug}.example`, label: "Billing", isPrimary: true, sortOrder: 0 },
            { tenantId, email: `finance@${slug}.example`, label: "Finance", sortOrder: 1 },
          ],
        },
        verticalOffers: {
          create: spec.verticals.map(([v, rate]) => ({
            tenantId,
            verticalId: verticals[v],
            rate,
            rateType: RateType.CPL,
            paymentTermsDays: spec.terms,
            terms: `NET ${spec.terms}`,
          })),
        },
      },
    });
    buyers.push({ id: buyer.id, name: spec.name, terms: spec.terms, verticals: spec.verticals });
  }

  // ---- Publishers (money going out) ------------------------------------------------------
  const publisherSpecs = [
    { name: "Demo CallWave Media", vertical: "Demo ACA", rate: 18, internal: false },
    { name: "Demo LeadForge", vertical: "Demo Medicare", rate: 24, internal: false },
    { name: "Demo Prime Dialers", vertical: "Demo Final Expense", rate: 14, internal: false },
    { name: "Demo In-House Team", vertical: "Demo Auto Insurance", rate: 9, internal: true },
  ];
  const publishers: { id: string; name: string; vertical: string; rate: number }[] = [];
  for (const spec of publisherSpecs) {
    const slug = spec.name.replace(DEMO_PREFIX, "").toLowerCase().replace(/[^a-z]+/g, "");
    const publisher = await prisma.publisher.create({
      data: {
        tenantId,
        name: spec.name,
        email: `ap@${slug}.example`,
        contactName: "Payouts",
        defaultPaymentTermsDays: 7,
        isInternal: spec.internal,
        contractStartDate: utc(2026, 1, 1),
        verticalOffers: {
          create: { tenantId, verticalId: verticals[spec.vertical], rate: spec.rate, rateType: RateType.CPL, paymentTermsDays: 7, terms: "NET 7" },
        },
      },
    });
    publishers.push({ id: publisher.id, name: spec.name, vertical: spec.vertical, rate: spec.rate });
  }

  // ---- Invoices: Jul–Sep 2026 (past months) ----------------------------------------------
  // Lead volume per month gives a believable trend; later months have more unpaid items.
  const months = [
    { y: 2026, m: 7, volume: 1.0 },
    { y: 2026, m: 8, volume: 1.15 },
    { y: 2026, m: 9, volume: 1.3 },
  ];
  let invoiceSeq = 1;
  const nextNumber = () => `${INVOICE_PREFIX}${String(invoiceSeq++).padStart(4, "0")}`;

  for (const { y, m, volume } of months) {
    const periodStart = utc(y, m, 1);
    const periodEnd = utc(y, m, lastDay(y, m));
    const periodLabel = `${String(m).padStart(2, "0")}/01 - ${String(m).padStart(2, "0")}/${lastDay(y, m)}`;

    for (const [i, buyer] of buyers.entries()) {
      const lines = buyer.verticals.map(([v, rate], j) => {
        const leads = Math.round((420 + i * 90 + j * 60) * volume);
        return { verticalId: verticals[v], leadCount: leads, rate, amount: round2(leads * rate) };
      });
      const total = round2(lines.reduce((s, l) => s + l.amount, 0));
      const dueDate = utc(y, m + 1 > 12 ? 1 : m + 1, buyer.terms);
      // Jul: all paid. Aug: Northstar still unpaid (overdue). Sep: two paid, one partial, one unpaid.
      let status: PaymentStatus = PaymentStatus.PAID;
      let received = total;
      if (m === 8 && i === 3) {
        status = PaymentStatus.UNPAID;
        received = 0;
      }
      if (m === 9 && i === 2) {
        status = PaymentStatus.WAITING_ON_BUYER;
        received = round2(total * 0.5);
      }
      if (m === 9 && i === 3) {
        status = PaymentStatus.UNPAID;
        received = 0;
      }
      await prisma.buyerInvoice.create({
        data: {
          tenantId,
          buyerId: buyer.id,
          verticalId: lines[0].verticalId,
          periodStart,
          periodEnd,
          periodLabel,
          invoiceDate: utc(y, m + 1 > 12 ? 1 : m + 1, 1),
          dueDate,
          paymentTermsDays: buyer.terms,
          terms: `NET ${buyer.terms}`,
          leadCount: lines.reduce((s, l) => s + l.leadCount, 0),
          rateType: RateType.CPL,
          rate: lines[0].rate,
          revenue: total,
          receivable: total,
          received: received || null,
          bankCredit: received || null,
          paymentStatus: status,
          invoiceStatus: InvoiceStatus.SENT,
          paidAt: status === PaymentStatus.PAID ? dueDate : null,
          paymentMethod: received ? "Bank Wire" : null,
          invoiceNumber: nextNumber(),
          lines: {
            create: lines.map((l, sortOrder) => ({
              tenantId,
              verticalId: l.verticalId,
              leadCount: l.leadCount,
              rateType: RateType.CPL,
              rate: l.rate,
              amount: l.amount,
              sortOrder,
            })),
          },
        },
      });
    }

    for (const [i, publisher] of publishers.entries()) {
      const leads = Math.round((380 + i * 70) * volume);
      const amount = round2(leads * publisher.rate);
      const dueDate = utc(y, m + 1 > 12 ? 1 : m + 1, 7);
      // Sep: one payout waiting for approval, one unpaid.
      let status: PaymentStatus = PaymentStatus.PAID;
      let approval: PaidApprovalStatus = PaidApprovalStatus.APPROVED;
      let paid: number | null = amount;
      if (m === 9 && i === 1) {
        approval = PaidApprovalStatus.PENDING;
      }
      if (m === 9 && i === 2) {
        status = PaymentStatus.UNPAID;
        approval = PaidApprovalStatus.NOT_REQUIRED;
        paid = null;
      }
      await prisma.publisherInvoice.create({
        data: {
          tenantId,
          publisherId: publisher.id,
          verticalId: verticals[publisher.vertical],
          periodStart,
          periodEnd,
          periodLabel,
          monthLabel: monthName(m),
          weekLabel: "Full month",
          invoiceDate: utc(y, m + 1 > 12 ? 1 : m + 1, 2),
          dueDate,
          paymentTermsDays: 7,
          terms: "NET 7",
          leadCount: leads,
          rateType: RateType.CPL,
          rate: publisher.rate,
          amount,
          payable: amount,
          paid,
          transactionAmount: paid,
          paidAt: paid ? dueDate : null,
          paymentMethod: paid ? "ACH" : null,
          paymentStatus: status,
          paidApprovalStatus: approval,
          invoiceNumber: nextNumber(),
        },
      });
    }
  }

  // ---- Unpaid weekly bills (to test marking paid) ----------------------------------------
  // Half carry an invoice number and due date; the rest look like quick ledger entries
  // (no number, no due date), which is how many real bills are entered.
  const weeks = [
    { start: utc(2026, 9, 6), end: utc(2026, 9, 12), label: "6th-12th Sep" },
    { start: utc(2026, 9, 13), end: utc(2026, 9, 19), label: "13th-19th Sep" },
    { start: utc(2026, 9, 20), end: utc(2026, 9, 26), label: "20th-26th Sep" },
    { start: utc(2026, 10, 4), end: utc(2026, 10, 10), label: "4th-10th Oct" },
  ];
  let unpaidCount = 0;
  for (const [w, week] of weeks.entries()) {
    for (const [i, buyer] of buyers.entries()) {
      const [v, rate] = buyer.verticals[0];
      const leads = 40 + ((w * 3 + i * 7) % 25);
      const amount = round2(leads * rate);
      const ledgerStyle = (w + i) % 2 === 1;
      await prisma.buyerInvoice.create({
        data: {
          tenantId,
          buyerId: buyer.id,
          verticalId: verticals[v],
          periodStart: week.start,
          periodEnd: week.end,
          periodLabel: week.label,
          invoiceDate: ledgerStyle ? null : week.end,
          dueDate: ledgerStyle ? null : new Date(week.end.getTime() + buyer.terms * 86400000),
          paymentTermsDays: buyer.terms,
          leadCount: leads,
          rateType: RateType.CPL,
          rate,
          revenue: amount,
          receivable: amount,
          paymentStatus: PaymentStatus.UNPAID,
          invoiceStatus: ledgerStyle ? InvoiceStatus.NOT_SENT : InvoiceStatus.SENT,
          invoiceNumber: ledgerStyle ? null : nextNumber(),
        },
      });
      unpaidCount += 1;
    }
    for (const [i, publisher] of publishers.entries()) {
      const leads = 35 + ((w * 5 + i * 3) % 20);
      const amount = round2(leads * publisher.rate);
      const ledgerStyle = (w + i) % 2 === 1;
      await prisma.publisherInvoice.create({
        data: {
          tenantId,
          publisherId: publisher.id,
          verticalId: verticals[publisher.vertical],
          periodStart: week.start,
          periodEnd: week.end,
          periodLabel: week.label,
          monthLabel: monthName(week.start.getUTCMonth() + 1),
          weekLabel: week.label,
          dueDate: ledgerStyle ? null : new Date(week.end.getTime() + 7 * 86400000),
          paymentTermsDays: 7,
          leadCount: leads,
          rateType: RateType.CPL,
          rate: publisher.rate,
          amount,
          payable: amount,
          paymentStatus: PaymentStatus.UNPAID,
          invoiceNumber: ledgerStyle ? null : nextNumber(),
        },
      });
      unpaidCount += 1;
    }
  }

  // ---- Daily figures: October 2026 so far (not invoiced yet) -----------------------------
  const today = new Date();
  const figureEndDay = today.getUTCFullYear() === 2026 && today.getUTCMonth() === 9 ? today.getUTCDate() - 1 : 13;
  for (let day = 1; day <= figureEndDay; day++) {
    const figureDate = utc(2026, 10, day);
    if ([0, 6].includes(figureDate.getUTCDay())) continue;
    for (const [i, buyer] of buyers.entries()) {
      const [v, rate] = buyer.verticals[0];
      const quantity = 18 + ((day * 7 + i * 5) % 14);
      await prisma.buyerDailyFigure.create({
        data: { tenantId, buyerId: buyer.id, verticalId: verticals[v], figureDate, quantity, rate, rateType: RateType.CPL, amount: round2(quantity * rate) },
      });
    }
    for (const [i, publisher] of publishers.entries()) {
      const quantity = 15 + ((day * 5 + i * 3) % 12);
      await prisma.publisherDailyFigure.create({
        data: {
          tenantId,
          publisherId: publisher.id,
          verticalId: verticals[publisher.vertical],
          figureDate,
          quantity,
          rate: publisher.rate,
          rateType: RateType.CPL,
          amount: round2(quantity * publisher.rate),
        },
      });
    }
  }

  // ---- Expenses --------------------------------------------------------------------------
  const categorySpecs = [
    { name: "Demo Payroll", label: "Team salaries", amount: 14500, recurringDay: 1 },
    { name: "Demo Software", label: "Dialer + CRM licenses", amount: 1850, recurringDay: 5 },
    { name: "Demo Office", label: "Office rent", amount: 2400, recurringDay: 1 },
    { name: "Demo Marketing", label: "Ad spend", amount: 3200, recurringDay: null },
  ];
  for (const spec of categorySpecs) {
    const category = await prisma.expenseCategory.create({ data: { tenantId, name: spec.name } });
    const recurring = spec.recurringDay
      ? await prisma.recurringExpense.create({
          data: { tenantId, categoryId: category.id, label: spec.label, amount: spec.amount, dayOfMonth: spec.recurringDay },
        })
      : null;
    for (const { y, m, volume } of [...months, { y: 2026, m: 10, volume: 1.3 }]) {
      const actual = spec.recurringDay ? spec.amount : round2(spec.amount * volume);
      const isCurrent = m === 10;
      await prisma.expense.create({
        data: {
          tenantId,
          year: y,
          month: m,
          category: spec.name,
          label: spec.label,
          categoryId: category.id,
          recurringExpenseId: recurring?.id,
          actual,
          paid: isCurrent && !spec.recurringDay ? 0 : actual,
          paidAt: isCurrent && !spec.recurringDay ? null : utc(y, m, spec.recurringDay ?? 20),
          method: "Company card",
        },
      });
    }
  }

  // ---- Partners: make sure the split is valid, then record withdrawals -------------------
  const partnerSpecs = [
    { name: "Libby", tier: PartnerTier.TOP_LINE, sharePercent: 10 },
    { name: "Rafia", tier: PartnerTier.EQUITY, sharePercent: 50 },
    { name: "Saad", tier: PartnerTier.EQUITY, sharePercent: 50 },
  ];
  const partnerIds: Record<string, string> = {};
  for (const spec of partnerSpecs) {
    const row = await prisma.partner.upsert({
      where: { tenantId_name: { tenantId, name: spec.name } },
      update: {},
      create: { tenantId, ...spec },
    });
    partnerIds[spec.name] = row.id;
  }
  const withdrawals = [
    { partner: "Rafia", amount: 6000, date: utc(2026, 8, 10), pkrRate: 278.4 },
    { partner: "Saad", amount: 5500, date: utc(2026, 8, 10), pkrRate: 278.4 },
    { partner: "Libby", amount: 2000, date: utc(2026, 9, 5), pkrRate: null },
    { partner: "Rafia", amount: 7000, date: utc(2026, 9, 12), pkrRate: 279.1 },
    { partner: "Saad", amount: 4000, date: utc(2026, 10, 3), pkrRate: 280.2 },
  ];
  for (const w of withdrawals) {
    await prisma.partnerWithdrawal.create({
      data: {
        tenantId,
        partnerId: partnerIds[w.partner],
        amountBase: w.amount,
        baseCurrency: "USD",
        targetCurrency: w.pkrRate ? "PKR" : null,
        conversionRate: w.pkrRate,
        amountConverted: w.pkrRate ? round2(w.amount * w.pkrRate) : null,
        method: w.pkrRate ? "Wise" : "Bank Wire",
        date: w.date,
        note: "[demo] partner draw",
      },
    });
    await prisma.partnerPayout.create({
      data: { tenantId, person: w.partner, amount: w.amount, date: w.date, year: w.date.getUTCFullYear(), month: w.date.getUTCMonth() + 1, notes: "[demo] partner draw" },
    });
    if (w.pkrRate) {
      await prisma.fxTransfer.create({
        data: { tenantId, person: w.partner, usd: w.amount, pkr: round2(w.amount * w.pkrRate), rate: w.pkrRate, date: w.date, notes: "[demo] USD to PKR" },
      });
    }
  }

  // ---- Treasury --------------------------------------------------------------------------
  await prisma.bankAccount.createMany({
    data: [
      { tenantId, name: "Demo Operating Account", balance: 48250.35 },
      { tenantId, name: "Demo Tax Reserve", balance: 15800 },
      { tenantId, name: "Demo Payroll Account", balance: 9100.5 },
    ],
  });
  for (const { y, m } of months) {
    const paid = await prisma.expense.aggregate({ where: { tenantId, year: y, month: m }, _sum: { paid: true } });
    const total = Number(paid._sum.paid ?? 0);
    await prisma.monthReconciliation.upsert({
      where: { tenantId_year_month: { tenantId, year: y, month: m } },
      update: {},
      create: { tenantId, year: y, month: m, statementTotal: m === 9 ? round2(total + 125.4) : total, notes: "[demo] bank statement" },
    });
  }
  await prisma.ccCharge.createMany({
    data: [
      { tenantId, kind: "Card fee", monthLabel: "August", date: utc(2026, 8, 28), amount: 42.5, notes: "[demo] card processing" },
      { tenantId, kind: "Card fee", monthLabel: "September", date: utc(2026, 9, 28), amount: 51.2, notes: "[demo] card processing" },
    ],
  });

  // ---- Company profile (only fills empty fields) ------------------------------------------
  await prisma.companyProfile.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      legalName: "Fundlookup Demo LLC",
      address: "500 Demo Avenue, Suite 200",
      country: "United States",
      zipCode: "78701",
      email: "billing@fundlookup.co",
      phone: "+1 (512) 555-0100",
      website: "https://fundlookup.co",
      bankName: "Demo National Bank",
      paymentNotes: "Wire transfers only. Reference the invoice number.",
      defaultNetDays: 7,
    },
  });

  // ---- Demo users, one per company role ----------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);
  const userSpecs = [
    { email: `broker@${DEMO_EMAIL_DOMAIN}`, name: "Demo Broker", role: TenantRole.BROKER },
    { email: `accountant@${DEMO_EMAIL_DOMAIN}`, name: "Demo Accountant", role: TenantRole.ACCOUNTANT },
    { email: `buyer@${DEMO_EMAIL_DOMAIN}`, name: "Demo Buyer User", role: TenantRole.BUYER, buyerId: buyers[0].id },
    { email: `publisher@${DEMO_EMAIL_DOMAIN}`, name: "Demo Publisher User", role: TenantRole.PUBLISHER, publisherId: publishers[0].id },
  ];
  for (const spec of userSpecs) {
    await prisma.user.create({
      data: {
        email: spec.email,
        name: spec.name,
        passwordHash,
        role: Role.MEMBER,
        memberships: {
          create: { tenantId, role: spec.role, buyerId: spec.buyerId ?? null, publisherId: spec.publisherId ?? null },
        },
      },
    });
  }

  console.log("Full demo data seeded:");
  console.log(`  ${buyers.length} buyers, ${publishers.length} publishers, ${verticalNames.length} verticals`);
  console.log(`  Monthly invoices for Jul–Sep 2026, ${unpaidCount} unpaid weekly bills (Sep–Oct), daily figures for Oct 2026`);
  console.log(`  ${categorySpecs.length} expense categories, ${withdrawals.length} partner withdrawals, 3 bank accounts`);
  console.log(`  Users: ${userSpecs.map((u) => u.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
