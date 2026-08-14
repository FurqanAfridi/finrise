ALTER TABLE "CompanyProfile"
ADD COLUMN IF NOT EXISTS "invoiceEmail" TEXT,
ADD COLUMN IF NOT EXISTS "invoicePhone" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceRepresentativeName" TEXT;
