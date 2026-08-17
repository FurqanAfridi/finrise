-- Contract start dates, daily call/lead figures, and auto-draft invoice cycles.

CREATE TYPE "InvoiceOrigin" AS ENUM ('MANUAL', 'DAILY_CYCLE');

ALTER TABLE "Buyer" ADD COLUMN IF NOT EXISTS "contractStartDate" DATE;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "contractStartDate" DATE;

ALTER TABLE "BuyerInvoice" ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BuyerInvoice" ADD COLUMN IF NOT EXISTS "origin" "InvoiceOrigin" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "BuyerInvoice" ADD COLUMN IF NOT EXISTS "cycleKey" TEXT;

ALTER TABLE "PublisherInvoice" ADD COLUMN IF NOT EXISTS "isDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublisherInvoice" ADD COLUMN IF NOT EXISTS "origin" "InvoiceOrigin" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "PublisherInvoice" ADD COLUMN IF NOT EXISTS "cycleKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerInvoice_cycleKey_key" ON "BuyerInvoice"("cycleKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PublisherInvoice_cycleKey_key" ON "PublisherInvoice"("cycleKey");

CREATE TABLE IF NOT EXISTS "BuyerDailyFigure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "figureDate" DATE NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(14,4),
    "rateType" "RateType" NOT NULL DEFAULT 'CPL',
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "buyerInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerDailyFigure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PublisherDailyFigure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL,
    "figureDate" DATE NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(14,4),
    "rateType" "RateType" NOT NULL DEFAULT 'CPL',
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "publisherInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherDailyFigure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerDailyFigure_buyerId_verticalId_figureDate_key" ON "BuyerDailyFigure"("buyerId", "verticalId", "figureDate");
CREATE INDEX IF NOT EXISTS "BuyerDailyFigure_tenantId_figureDate_idx" ON "BuyerDailyFigure"("tenantId", "figureDate");
CREATE INDEX IF NOT EXISTS "BuyerDailyFigure_buyerId_figureDate_idx" ON "BuyerDailyFigure"("buyerId", "figureDate");

CREATE UNIQUE INDEX IF NOT EXISTS "PublisherDailyFigure_publisherId_verticalId_figureDate_key" ON "PublisherDailyFigure"("publisherId", "verticalId", "figureDate");
CREATE INDEX IF NOT EXISTS "PublisherDailyFigure_tenantId_figureDate_idx" ON "PublisherDailyFigure"("tenantId", "figureDate");
CREATE INDEX IF NOT EXISTS "PublisherDailyFigure_publisherId_figureDate_idx" ON "PublisherDailyFigure"("publisherId", "figureDate");

ALTER TABLE "BuyerDailyFigure"
ADD CONSTRAINT "BuyerDailyFigure_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerDailyFigure"
ADD CONSTRAINT "BuyerDailyFigure_buyerId_fkey"
FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerDailyFigure"
ADD CONSTRAINT "BuyerDailyFigure_verticalId_fkey"
FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerDailyFigure"
ADD CONSTRAINT "BuyerDailyFigure_buyerInvoiceId_fkey"
FOREIGN KEY ("buyerInvoiceId") REFERENCES "BuyerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublisherDailyFigure"
ADD CONSTRAINT "PublisherDailyFigure_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherDailyFigure"
ADD CONSTRAINT "PublisherDailyFigure_publisherId_fkey"
FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherDailyFigure"
ADD CONSTRAINT "PublisherDailyFigure_verticalId_fkey"
FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublisherDailyFigure"
ADD CONSTRAINT "PublisherDailyFigure_publisherInvoiceId_fkey"
FOREIGN KEY ("publisherInvoiceId") REFERENCES "PublisherInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
