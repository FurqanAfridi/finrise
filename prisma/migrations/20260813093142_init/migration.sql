-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('CPL', 'CPA', 'DYNAMIC', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'ON_HOLD', 'BUYER_LOST', 'NO_BILLABLES', 'TBD', 'WAITING_FOR_INV', 'BARGAINING', 'COMPENSATED', 'EXTRA_PAID', 'HOLD_ON_TCPA', 'WAITING_ON_BUYER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('SENT', 'NOT_SENT', 'NO_BILLABLES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultTerms" TEXT,
    "defaultMethod" TEXT,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultTerms" TEXT,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vertical" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Vertical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerInvoice" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "periodLabel" TEXT,
    "dueDate" TIMESTAMP(3),
    "buyerId" TEXT NOT NULL,
    "verticalId" TEXT,
    "leadCount" DECIMAL(14,2),
    "countLabel" TEXT,
    "rateType" "RateType" NOT NULL DEFAULT 'OTHER',
    "rate" DECIMAL(14,4),
    "rateLabel" TEXT,
    "revenue" DECIMAL(14,2) NOT NULL,
    "invoiceNumber" TEXT,
    "terms" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'NOT_SENT',
    "receivable" DECIMAL(14,2) NOT NULL,
    "received" DECIMAL(14,2),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherInvoice" (
    "id" TEXT NOT NULL,
    "monthLabel" TEXT,
    "weekLabel" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "periodLabel" TEXT,
    "dueDate" TIMESTAMP(3),
    "publisherId" TEXT NOT NULL,
    "verticalId" TEXT,
    "leadCount" DECIMAL(14,2),
    "countLabel" TEXT,
    "rateType" "RateType" NOT NULL DEFAULT 'OTHER',
    "rate" DECIMAL(14,4),
    "rateLabel" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "invoiceNumber" TEXT,
    "terms" TEXT,
    "payable" DECIMAL(14,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "paid" DECIMAL(14,2) NOT NULL,
    "actual" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3),
    "year" INTEGER,
    "month" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxTransfer" (
    "id" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "usd" DECIMAL(14,2),
    "pkr" DECIMAL(16,2),
    "rate" DECIMAL(12,4),
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcCharge" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "monthLabel" TEXT,
    "date" TIMESTAMP(3),
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CcCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySnapshot" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "savings" DECIMAL(14,2) NOT NULL,
    "withdrawn" DECIMAL(14,2),
    "remaining" DECIMAL(14,2),

    CONSTRAINT "MonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_name_key" ON "Buyer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_name_key" ON "Publisher"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vertical_name_key" ON "Vertical"("name");

-- CreateIndex
CREATE INDEX "BuyerInvoice_buyerId_idx" ON "BuyerInvoice"("buyerId");

-- CreateIndex
CREATE INDEX "BuyerInvoice_paymentStatus_idx" ON "BuyerInvoice"("paymentStatus");

-- CreateIndex
CREATE INDEX "BuyerInvoice_dueDate_idx" ON "BuyerInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "BuyerInvoice_periodStart_idx" ON "BuyerInvoice"("periodStart");

-- CreateIndex
CREATE INDEX "PublisherInvoice_publisherId_idx" ON "PublisherInvoice"("publisherId");

-- CreateIndex
CREATE INDEX "PublisherInvoice_paymentStatus_idx" ON "PublisherInvoice"("paymentStatus");

-- CreateIndex
CREATE INDEX "PublisherInvoice_dueDate_idx" ON "PublisherInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "PublisherInvoice_periodStart_idx" ON "PublisherInvoice"("periodStart");

-- CreateIndex
CREATE INDEX "Expense_year_month_idx" ON "Expense"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySnapshot_year_month_key" ON "MonthlySnapshot"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerInvoice" ADD CONSTRAINT "BuyerInvoice_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerInvoice" ADD CONSTRAINT "BuyerInvoice_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherInvoice" ADD CONSTRAINT "PublisherInvoice_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherInvoice" ADD CONSTRAINT "PublisherInvoice_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE SET NULL ON UPDATE CASCADE;
