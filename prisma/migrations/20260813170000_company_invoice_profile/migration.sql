ALTER TABLE "Buyer" ADD COLUMN "email" TEXT;
ALTER TABLE "Buyer" ADD COLUMN "address" TEXT;
ALTER TABLE "Buyer" ADD COLUMN "contactName" TEXT;

CREATE TABLE "CompanyProfile" (
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "bankDetails" TEXT,
    "paymentNotes" TEXT,
    "logoMime" TEXT,
    "logoData" BYTEA,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
