-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "cardHolderName" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "cardBrand" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "cardNumber" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "cardExpiry" TEXT;
