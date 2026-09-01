-- CreateTable
CREATE TABLE "BuyerEmail" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BuyerEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerInvoiceLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerInvoiceId" TEXT NOT NULL,
    "verticalId" TEXT,
    "leadCount" DECIMAL(14,2),
    "rateType" "RateType" NOT NULL DEFAULT 'CPL',
    "rate" DECIMAL(14,4),
    "amount" DECIMAL(14,2) NOT NULL,
    "comments" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BuyerInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuyerEmail_tenantId_idx" ON "BuyerEmail"("tenantId");
CREATE INDEX "BuyerEmail_buyerId_idx" ON "BuyerEmail"("buyerId");
CREATE UNIQUE INDEX "BuyerEmail_buyerId_email_key" ON "BuyerEmail"("buyerId", "email");

CREATE INDEX "BuyerInvoiceLine_tenantId_idx" ON "BuyerInvoiceLine"("tenantId");
CREATE INDEX "BuyerInvoiceLine_buyerInvoiceId_idx" ON "BuyerInvoiceLine"("buyerInvoiceId");

-- AddForeignKey
ALTER TABLE "BuyerEmail" ADD CONSTRAINT "BuyerEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyerEmail" ADD CONSTRAINT "BuyerEmail_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerInvoiceLine" ADD CONSTRAINT "BuyerInvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyerInvoiceLine" ADD CONSTRAINT "BuyerInvoiceLine_buyerInvoiceId_fkey" FOREIGN KEY ("buyerInvoiceId") REFERENCES "BuyerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyerInvoiceLine" ADD CONSTRAINT "BuyerInvoiceLine_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill buyer emails from legacy single email field
INSERT INTO "BuyerEmail" ("id", "tenantId", "buyerId", "email", "isPrimary", "sortOrder")
SELECT
  'c' || substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 24),
  "tenantId",
  "id",
  trim(email),
  true,
  0
FROM "Buyer"
WHERE email IS NOT NULL AND trim(email) <> '';

-- Backfill one line per existing invoice from header fields
INSERT INTO "BuyerInvoiceLine" (
  "id", "tenantId", "buyerInvoiceId", "verticalId", "leadCount", "rateType", "rate", "amount", "comments", "sortOrder"
)
SELECT
  'c' || substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 24),
  "tenantId",
  "id",
  "verticalId",
  "leadCount",
  "rateType",
  "rate",
  "revenue",
  "comments",
  0
FROM "BuyerInvoice";
