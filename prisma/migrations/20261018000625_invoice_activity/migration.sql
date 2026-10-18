-- CreateEnum
CREATE TYPE "InvoiceActivityAction" AS ENUM ('CREATED', 'EDITED', 'PAID', 'APPROVED', 'REJECTED', 'SENT', 'EMAILED', 'DELETED');

-- CreateTable
CREATE TABLE "InvoiceActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceLabel" TEXT NOT NULL,
    "action" "InvoiceActivityAction" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceActivity_tenantId_createdAt_idx" ON "InvoiceActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceActivity_tenantId_userId_idx" ON "InvoiceActivity"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "InvoiceActivity_invoiceId_idx" ON "InvoiceActivity"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceActivity" ADD CONSTRAINT "InvoiceActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceActivity" ADD CONSTRAINT "InvoiceActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
