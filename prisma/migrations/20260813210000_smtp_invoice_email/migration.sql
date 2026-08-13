-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "SmtpSettings" (
    "tenantId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "InvoiceEmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerInvoiceId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailSendStatus" NOT NULL,
    "error" TEXT,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceEmailLog_tenantId_createdAt_idx" ON "InvoiceEmailLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceEmailLog_buyerInvoiceId_idx" ON "InvoiceEmailLog"("buyerInvoiceId");

-- AddForeignKey
ALTER TABLE "SmtpSettings" ADD CONSTRAINT "SmtpSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceEmailLog" ADD CONSTRAINT "InvoiceEmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceEmailLog" ADD CONSTRAINT "InvoiceEmailLog_buyerInvoiceId_fkey" FOREIGN KEY ("buyerInvoiceId") REFERENCES "BuyerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceEmailLog" ADD CONSTRAINT "InvoiceEmailLog_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
