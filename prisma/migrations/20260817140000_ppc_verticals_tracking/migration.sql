-- PPC vertical catalog, per-contact vertical terms, and sheet tracking columns.

ALTER TABLE "Vertical" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "BuyerVertical" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 7,
    "terms" TEXT,
    "rate" DECIMAL(14,4),
    "rateType" "RateType" NOT NULL DEFAULT 'CPL',
    "rateLabel" TEXT,

    CONSTRAINT "BuyerVertical_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PublisherVertical" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 7,
    "terms" TEXT,
    "rate" DECIMAL(14,4),
    "rateType" "RateType" NOT NULL DEFAULT 'CPL',
    "rateLabel" TEXT,

    CONSTRAINT "PublisherVertical_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerVertical_buyerId_verticalId_key" ON "BuyerVertical"("buyerId", "verticalId");
CREATE INDEX IF NOT EXISTS "BuyerVertical_tenantId_idx" ON "BuyerVertical"("tenantId");
CREATE INDEX IF NOT EXISTS "BuyerVertical_buyerId_idx" ON "BuyerVertical"("buyerId");

CREATE UNIQUE INDEX IF NOT EXISTS "PublisherVertical_publisherId_verticalId_key" ON "PublisherVertical"("publisherId", "verticalId");
CREATE INDEX IF NOT EXISTS "PublisherVertical_tenantId_idx" ON "PublisherVertical"("tenantId");
CREATE INDEX IF NOT EXISTS "PublisherVertical_publisherId_idx" ON "PublisherVertical"("publisherId");

ALTER TABLE "BuyerVertical"
ADD CONSTRAINT "BuyerVertical_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerVertical"
ADD CONSTRAINT "BuyerVertical_buyerId_fkey"
FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerVertical"
ADD CONSTRAINT "BuyerVertical_verticalId_fkey"
FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherVertical"
ADD CONSTRAINT "PublisherVertical_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherVertical"
ADD CONSTRAINT "PublisherVertical_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherVertical"
ADD CONSTRAINT "PublisherVertical_verticalId_fkey"
FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerInvoice" ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3);
ALTER TABLE "BuyerInvoice" ADD COLUMN IF NOT EXISTS "bankCredit" DECIMAL(14,2);

ALTER TABLE "PublisherInvoice" ADD COLUMN IF NOT EXISTS "invoiceDate" TIMESTAMP(3);
ALTER TABLE "PublisherInvoice" ADD COLUMN IF NOT EXISTS "transactionAmount" DECIMAL(14,2);

UPDATE "BuyerInvoice"
SET "invoiceDate" = COALESCE("periodStart", "periodEnd", "dueDate", "createdAt")
WHERE "invoiceDate" IS NULL;

UPDATE "PublisherInvoice"
SET "invoiceDate" = COALESCE("periodStart", "periodEnd", "dueDate", "createdAt")
WHERE "invoiceDate" IS NULL;
