-- CreateTable
CREATE TABLE "PublisherInvoiceLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publisherInvoiceId" TEXT NOT NULL,
    "verticalId" TEXT,
    "leadCount" DECIMAL(14,2),
    "rateType" "RateType" NOT NULL DEFAULT 'CPL',
    "rate" DECIMAL(14,4),
    "amount" DECIMAL(14,2) NOT NULL,
    "comments" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PublisherInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublisherInvoiceLine_tenantId_idx" ON "PublisherInvoiceLine"("tenantId");
CREATE INDEX "PublisherInvoiceLine_publisherInvoiceId_idx" ON "PublisherInvoiceLine"("publisherInvoiceId");

-- AddForeignKey
ALTER TABLE "PublisherInvoiceLine" ADD CONSTRAINT "PublisherInvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublisherInvoiceLine" ADD CONSTRAINT "PublisherInvoiceLine_publisherInvoiceId_fkey" FOREIGN KEY ("publisherInvoiceId") REFERENCES "PublisherInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublisherInvoiceLine" ADD CONSTRAINT "PublisherInvoiceLine_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES "Vertical"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one line per existing payable from header fields
INSERT INTO "PublisherInvoiceLine" (
  "id", "tenantId", "publisherInvoiceId", "verticalId", "leadCount", "rateType", "rate", "amount", "sortOrder"
)
SELECT
  'c' || substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 24),
  "tenantId",
  "id",
  "verticalId",
  "leadCount",
  "rateType",
  "rate",
  "amount",
  0
FROM "PublisherInvoice";
