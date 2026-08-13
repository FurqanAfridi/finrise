-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('ADMIN', 'BROKER', 'ACCOUNTANT', 'PUBLISHER', 'BUYER');
CREATE TYPE "PartnerTier" AS ENUM ('TOP_LINE', 'EQUITY');
CREATE TYPE "TaxOrder" AS ENUM ('TAX_FIRST', 'TIER1_FIRST');
CREATE TYPE "PaidApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TYPE "RateType" ADD VALUE IF NOT EXISTS 'FLAT';
ALTER TYPE "RateType" ADD VALUE IF NOT EXISTS 'PROFIT_SHARE';

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

INSERT INTO "Tenant" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('clfinrisedefault0000000001', 'Finrise', 'finrise', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'BROKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantMembership_userId_tenantId_key" ON "TenantMembership"("userId", "tenantId");
CREATE INDEX "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");

ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TenantMembership" ("id", "userId", "tenantId", "role", "createdAt")
SELECT 'mem_' || "id", "id", 'clfinrisedefault0000000001',
       CASE WHEN "role" = 'ADMIN' THEN 'ADMIN'::"TenantRole" ELSE 'BROKER'::"TenantRole" END,
       CURRENT_TIMESTAMP
FROM "User";

-- Tenant columns on existing tables
ALTER TABLE "Invite" ADD COLUMN "tenantRole" "TenantRole" NOT NULL DEFAULT 'BROKER';
ALTER TABLE "Invite" ADD COLUMN "tenantId" TEXT;
UPDATE "Invite" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "Invite" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "Invite_tenantId_idx" ON "Invite"("tenantId");
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Buyer" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Buyer" ADD COLUMN "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 7;
UPDATE "Buyer" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "Buyer" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Buyer_name_key";
CREATE UNIQUE INDEX "Buyer_tenantId_name_key" ON "Buyer"("tenantId", "name");
CREATE INDEX "Buyer_tenantId_idx" ON "Buyer"("tenantId");
ALTER TABLE "Buyer" ADD CONSTRAINT "Buyer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Publisher" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Publisher" ADD COLUMN "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "Publisher" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Publisher" SET "tenantId" = 'clfinrisedefault0000000001';
UPDATE "Publisher" SET "isInternal" = true WHERE lower("name") LIKE '%internal%';
ALTER TABLE "Publisher" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Publisher_name_key";
CREATE UNIQUE INDEX "Publisher_tenantId_name_key" ON "Publisher"("tenantId", "name");
CREATE INDEX "Publisher_tenantId_idx" ON "Publisher"("tenantId");
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Vertical" ADD COLUMN "tenantId" TEXT;
UPDATE "Vertical" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "Vertical" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Vertical_name_key";
CREATE UNIQUE INDEX "Vertical_tenantId_name_key" ON "Vertical"("tenantId", "name");
CREATE INDEX "Vertical_tenantId_idx" ON "Vertical"("tenantId");
ALTER TABLE "Vertical" ADD CONSTRAINT "Vertical_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerInvoice" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "BuyerInvoice" ADD COLUMN "paymentTermsDays" INTEGER;
UPDATE "BuyerInvoice" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "BuyerInvoice" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "BuyerInvoice_tenantId_idx" ON "BuyerInvoice"("tenantId");
ALTER TABLE "BuyerInvoice" ADD CONSTRAINT "BuyerInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherInvoice" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PublisherInvoice" ADD COLUMN "paymentTermsDays" INTEGER;
ALTER TABLE "PublisherInvoice" ADD COLUMN "paid" DECIMAL(14,2);
ALTER TABLE "PublisherInvoice" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "PublisherInvoice" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "PublisherInvoice" ADD COLUMN "paidApprovalStatus" "PaidApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "PublisherInvoice" ADD COLUMN "paidApprovedAt" TIMESTAMP(3);
ALTER TABLE "PublisherInvoice" ADD COLUMN "paidApprovedById" TEXT;
UPDATE "PublisherInvoice" SET "tenantId" = 'clfinrisedefault0000000001';
UPDATE "PublisherInvoice"
SET "paid" = "payable",
    "paidApprovalStatus" = 'APPROVED',
    "paidApprovedAt" = CURRENT_TIMESTAMP
WHERE "paymentStatus" IN ('PAID', 'EXTRA_PAID', 'COMPENSATED');
ALTER TABLE "PublisherInvoice" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "PublisherInvoice_tenantId_idx" ON "PublisherInvoice"("tenantId");
CREATE INDEX "PublisherInvoice_paidApprovalStatus_idx" ON "PublisherInvoice"("paidApprovalStatus");
ALTER TABLE "PublisherInvoice" ADD CONSTRAINT "PublisherInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublisherInvoice" ADD CONSTRAINT "PublisherInvoice_paidApprovedById_fkey" FOREIGN KEY ("paidApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "label" TEXT;
ALTER TABLE "Expense" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN "method" TEXT;
ALTER TABLE "Expense" ADD COLUMN "recurringExpenseId" TEXT;
UPDATE "Expense" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "Expense" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Expense_year_month_idx";
CREATE INDEX "Expense_tenantId_year_month_idx" ON "Expense"("tenantId", "year", "month");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerPayout" ADD COLUMN "tenantId" TEXT;
UPDATE "PartnerPayout" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "PartnerPayout" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "PartnerPayout_tenantId_idx" ON "PartnerPayout"("tenantId");
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FxTransfer" ADD COLUMN "tenantId" TEXT;
UPDATE "FxTransfer" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "FxTransfer" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "FxTransfer_tenantId_idx" ON "FxTransfer"("tenantId");
ALTER TABLE "FxTransfer" ADD CONSTRAINT "FxTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CcCharge" ADD COLUMN "tenantId" TEXT;
UPDATE "CcCharge" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "CcCharge" ALTER COLUMN "tenantId" SET NOT NULL;
CREATE INDEX "CcCharge_tenantId_idx" ON "CcCharge"("tenantId");
ALTER TABLE "CcCharge" ADD CONSTRAINT "CcCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlySnapshot" ADD COLUMN "tenantId" TEXT;
UPDATE "MonthlySnapshot" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "MonthlySnapshot" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "MonthlySnapshot_year_month_key";
CREATE UNIQUE INDEX "MonthlySnapshot_tenantId_year_month_key" ON "MonthlySnapshot"("tenantId", "year", "month");
CREATE INDEX "MonthlySnapshot_tenantId_idx" ON "MonthlySnapshot"("tenantId");
ALTER TABLE "MonthlySnapshot" ADD CONSTRAINT "MonthlySnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Setting" ADD COLUMN "tenantId" TEXT;
UPDATE "Setting" SET "tenantId" = 'clfinrisedefault0000000001';
ALTER TABLE "Setting" ALTER COLUMN "tenantId" SET NOT NULL;
DROP INDEX "Setting_key_key";
CREATE UNIQUE INDEX "Setting_tenantId_key_key" ON "Setting"("tenantId", "key");
CREATE INDEX "Setting_tenantId_idx" ON "Setting"("tenantId");
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FinanceSettings" (
    "tenantId" TEXT NOT NULL,
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "varianceToleranceAmount" DECIMAL(14,2) NOT NULL DEFAULT 1.00,
    "taxOrder" "TaxOrder" NOT NULL DEFAULT 'TAX_FIRST',
    "fiscalMonthStartDay" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "FinanceSettings" ADD CONSTRAINT "FinanceSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "FinanceSettings" ("tenantId") VALUES ('clfinrisedefault0000000001');

CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON "ExpenseCategory"("tenantId", "name");
CREATE INDEX "ExpenseCategory_tenantId_idx" ON "ExpenseCategory"("tenantId");
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ExpenseCategory" ("id", "tenantId", "name")
SELECT 'cat_' || md5("category"), 'clfinrisedefault0000000001', "category"
FROM (SELECT DISTINCT "category" FROM "Expense") AS cats;

UPDATE "Expense" e
SET "categoryId" = c."id",
    "label" = e."category"
FROM "ExpenseCategory" c
WHERE c."tenantId" = e."tenantId" AND c."name" = e."category";

CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecurringExpense_tenantId_idx" ON "RecurringExpense"("tenantId");
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "PartnerTier" NOT NULL,
    "sharePercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Partner_tenantId_name_key" ON "Partner"("tenantId", "name");
CREATE INDEX "Partner_tenantId_idx" ON "Partner"("tenantId");
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Partner" ("id", "tenantId", "name", "tier", "sharePercent", "isActive")
VALUES
  ('partner_libby_default', 'clfinrisedefault0000000001', 'Libby', 'TOP_LINE', 10, true),
  ('partner_rafia_default', 'clfinrisedefault0000000001', 'Rafia', 'EQUITY', 50, true),
  ('partner_saad_default', 'clfinrisedefault0000000001', 'Saad', 'EQUITY', 50, true);

CREATE TABLE "PartnerWithdrawal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amountBase" DECIMAL(14,2) NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "targetCurrency" TEXT,
    "conversionRate" DECIMAL(12,4),
    "amountConverted" DECIMAL(16,2),
    "method" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerWithdrawal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PartnerWithdrawal_tenantId_idx" ON "PartnerWithdrawal"("tenantId");
CREATE INDEX "PartnerWithdrawal_partnerId_idx" ON "PartnerWithdrawal"("partnerId");
ALTER TABLE "PartnerWithdrawal" ADD CONSTRAINT "PartnerWithdrawal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerWithdrawal" ADD CONSTRAINT "PartnerWithdrawal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_tenantId_userId_readAt_idx" ON "Notification"("tenantId", "userId", "readAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BankAccount_tenantId_name_key" ON "BankAccount"("tenantId", "name");
CREATE INDEX "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MonthReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "statementTotal" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MonthReconciliation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MonthReconciliation_tenantId_year_month_key" ON "MonthReconciliation"("tenantId", "year", "month");
ALTER TABLE "MonthReconciliation" ADD CONSTRAINT "MonthReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
