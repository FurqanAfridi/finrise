import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";
import { PaidApprovalStatus, PaymentStatus, PrismaClient, RateType } from "@prisma/client";
import { parsePaymentTermsDays } from "../lib/finance/invoice";
import { parseInvoiceStatus, parsePaymentStatus, parseRateType } from "../lib/status";

const prisma = new PrismaClient();
const DEFAULT_TENANT_SLUG = process.env.TENANT_SLUG ?? "finrise";
let TENANT_ID = "";

const XLSX_PATH = path.resolve(
  process.env.XLSX_PATH ?? "./Payment Tracking Buyers_Publisher.xlsx",
);

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

type CellValue = string | number | Date | null;

function rawCell(value: ExcelJS.CellValue): CellValue {
  if (value == null) return null;
  if (typeof value === "number" || typeof value === "string" || value instanceof Date) {
    return value;
  }
  if (typeof value === "object") {
    if ("result" in value) return rawCell(value.result as ExcelJS.CellValue);
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value) return value.text;
    if ("error" in value) return null;
  }
  return null;
}

function asString(value: CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function asNumber(value: CellValue): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return null;
  const cleaned = String(value).replace(/[$,]/g, "").trim();
  if (!cleaned || /[a-z]/i.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function excelSerialToDate(serial: number): Date {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utc);
}

function asDate(value: CellValue): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && value > 20000 && value < 80000) {
    return excelSerialToDate(value);
  }
  const text = asString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePeriod(label: string, year: number): { start: Date | null; end: Date | null } {
  const match = label.match(/(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})/);
  if (!match) return { start: null, end: null };
  const startMonth = Number(match[1]);
  const startDay = Number(match[2]);
  const endMonth = Number(match[3]);
  const endDay = Number(match[4]);
  const endYear = endMonth < startMonth ? year + 1 : year;
  return {
    start: new Date(Date.UTC(year, startMonth - 1, startDay)),
    end: new Date(Date.UTC(endYear, endMonth - 1, endDay)),
  };
}

function parseOverviewPeriod(sheetName: string): { year: number; month: number } | null {
  const name = sheetName.replace(/^Overview For\s+/i, "").trim();
  const withYear = name.match(/^([A-Za-z]+)\s*(\d{2})$/);
  if (withYear) {
    const month = MONTHS[withYear[1].toLowerCase()];
    if (!month) return null;
    const yy = Number(withYear[2]);
    return { year: yy >= 50 ? 1900 + yy : 2000 + yy, month };
  }
  const monthOnly = MONTHS[name.toLowerCase()];
  if (!monthOnly) return null;
  // Unsuffixed sheets: Aug–Dec are 2024, Jan–Jul are 2025.
  const year = monthOnly >= 8 ? 2024 : 2025;
  return { year, month: monthOnly };
}

function parseMonthName(value: string): number | null {
  return MONTHS[value.trim().toLowerCase()] ?? null;
}

async function upsertBuyer(name: string, cache: Map<string, string>) {
  const key = name.trim();
  const hit = cache.get(key);
  if (hit) return hit;
  const row = await prisma.buyer.upsert({
    where: { tenantId_name: { tenantId: TENANT_ID, name: key } },
    update: {},
    create: { tenantId: TENANT_ID, name: key },
  });
  cache.set(key, row.id);
  return row.id;
}

async function upsertPublisher(name: string, cache: Map<string, string>) {
  const key = name.trim();
  const hit = cache.get(key);
  if (hit) return hit;
  const row = await prisma.publisher.upsert({
    where: { tenantId_name: { tenantId: TENANT_ID, name: key } },
    update: {},
    create: { tenantId: TENANT_ID, name: key, isInternal: /internal/i.test(key) },
  });
  cache.set(key, row.id);
  return row.id;
}

async function upsertVertical(name: string, cache: Map<string, string>) {
  const key = name.trim();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit) return hit;
  const row = await prisma.vertical.upsert({
    where: { tenantId_name: { tenantId: TENANT_ID, name: key } },
    update: {},
    create: { tenantId: TENANT_ID, name: key },
  });
  cache.set(key, row.id);
  return row.id;
}

function countAndRate(countRaw: CellValue, rateRaw: CellValue) {
  const countNum = asNumber(countRaw);
  const rateNum = asNumber(rateRaw);
  return {
    leadCount: countNum,
    countLabel: countNum == null ? asString(countRaw) || null : null,
    rate: rateNum,
    rateLabel: rateNum == null ? asString(rateRaw) || null : null,
  };
}

async function createInChunks<T>(model: "buyerInvoice" | "publisherInvoice" | "expense" | "partnerPayout" | "ccCharge" | "fxTransfer", data: T[]) {
  const size = 200;
  for (let i = 0; i < data.length; i += size) {
    const chunk = data.slice(i, i + size);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma[model] as any).createMany({ data: chunk });
  }
}

async function importBuyers(sheet: ExcelJS.Worksheet) {
  const buyers = new Map<string, string>();
  const verticals = new Map<string, string>();
  const payload: Parameters<typeof prisma.buyerInvoice.create>[0]["data"][] = [];
  let year = 2024;
  let lastMonth = 8;
  let imported = 0;
  let skipped = 0;
  let revenue = 0;

  const rows: ExcelJS.Row[] = [];
  sheet.eachRow((row) => rows.push(row));

  for (const row of rows) {
    if (row.number === 1) continue;
    const periodLabel = asString(rawCell(row.getCell(2).value)).replace(/^:\s*/, "");
    const buyerName = asString(rawCell(row.getCell(4).value));
    if (!buyerName) {
      skipped += 1;
      continue;
    }

    const periodMatch = periodLabel.match(/^(\d{1,2})\//);
    if (periodMatch) {
      const month = Number(periodMatch[1]);
      if (lastMonth >= 10 && month <= 3) year += 1;
      lastMonth = month;
    }

    const { start, end } = parsePeriod(periodLabel, year);
    const verticalName = asString(rawCell(row.getCell(5).value));
    const parsed = countAndRate(rawCell(row.getCell(6).value), rawCell(row.getCell(8).value));
    const revenueValue = asNumber(rawCell(row.getCell(9).value)) ?? 0;
    const receivable = asNumber(rawCell(row.getCell(14).value)) ?? revenueValue;
    const received = asNumber(rawCell(row.getCell(15).value));

    const terms = asString(rawCell(row.getCell(11).value)) || null;
    payload.push({
      tenantId: TENANT_ID,
      periodStart: start,
      periodEnd: end,
      periodLabel: periodLabel || null,
      dueDate: asDate(rawCell(row.getCell(3).value)),
      buyerId: await upsertBuyer(buyerName, buyers),
      verticalId: await upsertVertical(verticalName, verticals),
      leadCount: parsed.leadCount,
      countLabel: parsed.countLabel,
      rateType: parseRateType(asString(rawCell(row.getCell(7).value))),
      rate: parsed.rate,
      rateLabel: parsed.rateLabel,
      revenue: revenueValue,
      invoiceNumber: asString(rawCell(row.getCell(10).value)) || null,
      terms,
      paymentTermsDays: parsePaymentTermsDays(terms),
      paymentStatus: parsePaymentStatus(asString(rawCell(row.getCell(12).value))),
      invoiceStatus: parseInvoiceStatus(asString(rawCell(row.getCell(13).value))),
      receivable,
      received,
      paidAt: asDate(rawCell(row.getCell(16).value)),
      paymentMethod: asString(rawCell(row.getCell(17).value)) || null,
      comments: asString(rawCell(row.getCell(18).value)) || null,
    });
    imported += 1;
    revenue += revenueValue;
  }

  await createInChunks("buyerInvoice", payload);
  return { imported, skipped, revenue, buyers: buyers.size, verticals: verticals.size };
}

async function importPublishers(sheet: ExcelJS.Worksheet) {
  const publishers = new Map<string, string>();
  const verticals = new Map<string, string>();
  const payload: Parameters<typeof prisma.publisherInvoice.create>[0]["data"][] = [];
  let year = 2024;
  let currentMonthName = "August";
  let imported = 0;
  let skipped = 0;
  let amount = 0;

  sheet.eachRow((row) => {
    if (row.number === 1) return;
    const banner = asString(rawCell(row.getCell(1).value));
    if (banner && parseMonthName(banner)) {
      const next = parseMonthName(banner)!;
      const prev = parseMonthName(currentMonthName) ?? 8;
      if (prev >= 10 && next <= 3) year += 1;
      currentMonthName = banner;
    }
  });

  year = 2024;
  currentMonthName = "August";

  const rows: ExcelJS.Row[] = [];
  sheet.eachRow((row) => rows.push(row));

  for (const row of rows) {
    if (row.number === 1) continue;
    const banner = asString(rawCell(row.getCell(1).value));
    if (banner && parseMonthName(banner)) {
      const next = parseMonthName(banner)!;
      const prev = parseMonthName(currentMonthName) ?? 8;
      if (prev >= 10 && next <= 3) year += 1;
      currentMonthName = banner;
    }

    const publisherName = asString(rawCell(row.getCell(4).value));
    if (!publisherName) {
      skipped += 1;
      continue;
    }

    const periodLabel = asString(rawCell(row.getCell(3).value)).replace(/^:\s*/, "");
    const periodMatch = periodLabel.match(/^(\d{1,2})\//);
    let rowYear = year;
    if (periodMatch) {
      const month = Number(periodMatch[1]);
      const bannerMonth = parseMonthName(currentMonthName) ?? month;
      if (bannerMonth === 12 && month <= 2) rowYear = year + 1;
    }
    const { start, end } = parsePeriod(periodLabel, rowYear);
    const verticalName = asString(rawCell(row.getCell(5).value));
    const parsed = countAndRate(rawCell(row.getCell(6).value), rawCell(row.getCell(8).value));
    const amountValue = asNumber(rawCell(row.getCell(9).value)) ?? 0;
    const payable = asNumber(rawCell(row.getCell(13).value)) ?? amountValue;
    const rateTypeRaw = asString(rawCell(row.getCell(7).value));

    const terms = asString(rawCell(row.getCell(11).value)) || null;
    const paymentStatus = parsePaymentStatus(asString(rawCell(row.getCell(14).value)));
    const paidStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.EXTRA_PAID, PaymentStatus.COMPENSATED];
    const isPaid = paidStatuses.includes(paymentStatus);

    payload.push({
      tenantId: TENANT_ID,
      monthLabel: currentMonthName || null,
      weekLabel: asString(rawCell(row.getCell(2).value)) || null,
      periodStart: start,
      periodEnd: end,
      periodLabel: periodLabel || null,
      dueDate: asDate(rawCell(row.getCell(12).value)),
      publisherId: await upsertPublisher(publisherName, publishers),
      verticalId: await upsertVertical(verticalName, verticals),
      leadCount: parsed.leadCount,
      countLabel: parsed.countLabel,
      rateType: rateTypeRaw ? parseRateType(rateTypeRaw) : RateType.OTHER,
      rate: parsed.rate,
      rateLabel: parsed.rateLabel,
      amount: amountValue,
      invoiceNumber: asString(rawCell(row.getCell(10).value)) || null,
      terms,
      paymentTermsDays: parsePaymentTermsDays(terms),
      payable,
      paid: isPaid ? payable : null,
      paidApprovalStatus: isPaid ? PaidApprovalStatus.APPROVED : PaidApprovalStatus.NOT_REQUIRED,
      paymentStatus,
    });
    imported += 1;
    amount += amountValue;
  }

  await createInChunks("publisherInvoice", payload);
  return { imported, skipped, amount, publishers: publishers.size, verticals: verticals.size };
}

async function importOverallProfit(sheet: ExcelJS.Worksheet) {
  let snapshots = 0;
  let payouts = 0;
  let savings = 0;

  const totalSavings = asNumber(rawCell(sheet.getRow(1).getCell(23).value));
  const totalWithdrawn = asNumber(rawCell(sheet.getRow(1).getCell(26).value));
  const remaining = asNumber(rawCell(sheet.getRow(3).getCell(24).value));

  if (totalSavings != null) {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: "importedSavings" } },
      update: { value: String(totalSavings) },
      create: { tenantId: TENANT_ID, key: "importedSavings", value: String(totalSavings) },
    });
  }
  if (totalWithdrawn != null) {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: "importedWithdrawn" } },
      update: { value: String(totalWithdrawn) },
      create: { tenantId: TENANT_ID, key: "importedWithdrawn", value: String(totalWithdrawn) },
    });
  }
  if (remaining != null) {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: "importedRemaining" } },
      update: { value: String(remaining) },
      create: { tenantId: TENANT_ID, key: "importedRemaining", value: String(remaining) },
    });
  }

  for (let r = 7; r <= 40; r += 1) {
    const row = sheet.getRow(r);
    const year = asNumber(rawCell(row.getCell(1).value));
    const month = parseMonthName(asString(rawCell(row.getCell(2).value)));
    const value = asNumber(rawCell(row.getCell(3).value));
    if (year && month && value != null) {
      await prisma.monthlySnapshot.upsert({
        where: { tenantId_year_month: { tenantId: TENANT_ID, year, month } },
        update: { savings: value },
        create: { tenantId: TENANT_ID, year, month, savings: value },
      });
      snapshots += 1;
      savings += value;
    }
  }

  for (let r = 15; r <= 80; r += 1) {
    const row = sheet.getRow(r);
    const person = asString(rawCell(row.getCell(11).value));
    const amount = asNumber(rawCell(row.getCell(13).value));
    if (!person || amount == null) continue;
    const year = asNumber(rawCell(row.getCell(1).value));
    const month = parseMonthName(asString(rawCell(row.getCell(2).value)));
    await prisma.partnerPayout.create({
      data: {
        tenantId: TENANT_ID,
        person: person.trim(),
        amount,
        year: year ?? null,
        month: month,
        notes: "Imported from Overall Profit",
      },
    });
    payouts += 1;
  }

  return { snapshots, payouts, savings, totalSavings, totalWithdrawn, remaining };
}

async function importOverviewExpensesAwaited(workbook: ExcelJS.Workbook) {
  let imported = 0;
  let total = 0;
  const seen = new Set<string>();

  for (const sheet of workbook.worksheets) {
    if (!sheet.name.startsWith("Overview For")) continue;
    const period = parseOverviewPeriod(sheet.name);
    if (!period) continue;

    const rows: ExcelJS.Row[] = [];
    sheet.eachRow((row) => rows.push(row));
    for (const row of rows) {
      if (row.number < 18) continue;
      const category = asString(rawCell(row.getCell(11).value));
      if (!category || /^totals?$/i.test(category)) continue;
      const paid = asNumber(rawCell(row.getCell(13).value));
      const actual = asNumber(rawCell(row.getCell(14).value)) ?? paid;
      if (paid == null && actual == null) continue;
      const key = `${period.year}-${period.month}-${category}-${paid}-${actual}-${row.number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await prisma.expense.create({
        data: {
          tenantId: TENANT_ID,
          year: period.year,
          month: period.month,
          category,
          paid: paid ?? actual ?? 0,
          actual: actual ?? paid ?? 0,
          notes: `Imported from ${sheet.name}`,
        },
      });
      imported += 1;
      total += actual ?? paid ?? 0;
    }
  }

  return { imported, total };
}

async function importCc(sheet: ExcelJS.Worksheet) {
  let imported = 0;
  const months = ["April", "May", "June", "July", "August", "September"];
  for (let r = 4; r <= 12; r += 1) {
    const row = sheet.getRow(r);
    const label = asString(rawCell(row.getCell(1).value));
    const amount = asNumber(rawCell(row.getCell(2).value));
    if (label && amount != null && !/^total/i.test(label)) {
      await prisma.ccCharge.create({
        data: {
          tenantId: TENANT_ID,
          kind: "STATEMENT",
          monthLabel: label,
          amount,
          notes: "April till September block",
        },
      });
      imported += 1;
    }
    const tdDate = asDate(rawCell(row.getCell(4).value));
    const tdAmount = asNumber(rawCell(row.getCell(5).value));
    if (tdAmount != null) {
      await prisma.ccCharge.create({
        data: {
          tenantId: TENANT_ID,
          kind: "TD",
          monthLabel: months[r - 4] ?? "October",
          date: tdDate,
          amount: tdAmount,
          notes: "TD charged by CC",
        },
      });
      imported += 1;
    }
  }
  return { imported };
}

async function importRafia(sheet: ExcelJS.Worksheet) {
  let imported = 0;
  const rows: ExcelJS.Row[] = [];
  sheet.eachRow((row) => rows.push(row));
  for (const row of rows) {
    const label = asString(rawCell(row.getCell(1).value));
    if (!/rafia/i.test(label)) continue;
    const usd = asNumber(rawCell(row.getCell(2).value));
    const pkr = asNumber(rawCell(row.getCell(3).value));
    if (usd == null && pkr == null) continue;
    const rateText = asString(rawCell(row.getCell(5).value));
    const rateMatch = rateText.match(/(\d+(?:\.\d+)?)/);
    await prisma.fxTransfer.create({
      data: {
        tenantId: TENANT_ID,
        person: "Rafia",
        usd,
        pkr,
        rate: rateMatch ? Number(rateMatch[1]) : null,
        date: asDate(rawCell(row.getCell(4).value)),
        notes: rateText || "Imported from Rafia sheet",
      },
    });
    imported += 1;
  }
  return { imported };
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });
  if (!tenant) {
    throw new Error(`Tenant '${DEFAULT_TENANT_SLUG}' not found. Run npm run seed:admin first.`);
  }
  TENANT_ID = tenant.id;

  console.log(`Reading ${XLSX_PATH}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  console.log("Clearing imported ledgers...");
  await prisma.buyerInvoice.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.publisherInvoice.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.expense.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.partnerPayout.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.fxTransfer.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.ccCharge.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.monthlySnapshot.deleteMany({ where: { tenantId: TENANT_ID } });

  const buyersSheet = workbook.getWorksheet("Buyers Tracking");
  const pubsSheet = workbook.getWorksheet("Publishers Tracking");
  const profitSheet = workbook.getWorksheet("Overall Profit");
  const ccSheet = workbook.getWorksheet("CC Trans");
  const rafiaSheet = workbook.worksheets.find((s) => s.name.trim() === "Rafia");

  if (!buyersSheet || !pubsSheet || !profitSheet) {
    throw new Error("Workbook is missing a required sheet");
  }

  console.log("Importing buyers...");
  const buyers = await importBuyers(buyersSheet);
  console.log("  ", buyers);

  console.log("Importing publishers...");
  const publishers = await importPublishers(pubsSheet);
  console.log("  ", publishers);

  console.log("Importing overall profit...");
  const profit = await importOverallProfit(profitSheet);
  console.log("  ", profit);

  console.log("Importing monthly expenses...");
  const expenses = await importOverviewExpensesAwaited(workbook);
  console.log("  ", expenses);

  let cc = { imported: 0 };
  if (ccSheet) {
    console.log("Importing CC transactions...");
    cc = await importCc(ccSheet);
    console.log("  ", cc);
  }

  let fx = { imported: 0 };
  if (rafiaSheet) {
    console.log("Importing FX transfers...");
    fx = await importRafia(rafiaSheet);
    console.log("  ", fx);
  }

  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: TENANT_ID, key: "lastImportAt" } },
    update: { value: new Date().toISOString() },
    create: { tenantId: TENANT_ID, key: "lastImportAt", value: new Date().toISOString() },
  });

  console.log("\nReconciliation");
  console.log(`  Buyer invoices: ${buyers.imported}  revenue: ${buyers.revenue.toFixed(2)}`);
  console.log(`  Publisher invoices: ${publishers.imported}  amount: ${publishers.amount.toFixed(2)}`);
  console.log(`  Monthly savings imported: ${profit.savings.toFixed(2)} (sheet total ${profit.totalSavings})`);
  console.log(`  Partner payouts: ${profit.payouts}`);
  console.log(`  Expenses: ${expenses.imported}  actual: ${expenses.total.toFixed(2)}`);
  console.log(`  CC charges: ${cc.imported}`);
  console.log(`  FX transfers: ${fx.imported}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
