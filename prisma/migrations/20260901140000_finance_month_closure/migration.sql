-- CreateEnum
CREATE TYPE "FinanceMonthOverride" AS ENUM ('CLOSED', 'OPEN');

-- AlterTable
ALTER TABLE "FinanceSettings" ADD COLUMN "monthAutoCloseDay" INTEGER;

-- CreateTable
CREATE TABLE "FinanceMonthClose" (
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "override" "FinanceMonthOverride" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "FinanceMonthClose_pkey" PRIMARY KEY ("tenantId","year","month")
);

-- CreateIndex
CREATE INDEX "FinanceMonthClose_tenantId_idx" ON "FinanceMonthClose"("tenantId");

-- AddForeignKey
ALTER TABLE "FinanceMonthClose" ADD CONSTRAINT "FinanceMonthClose_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
