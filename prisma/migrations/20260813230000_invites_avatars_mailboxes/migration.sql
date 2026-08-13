-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "SmtpMailbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpMailbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmtpMailbox_tenantId_idx" ON "SmtpMailbox"("tenantId");

-- AddForeignKey
ALTER TABLE "SmtpMailbox" ADD CONSTRAINT "SmtpMailbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single SMTP rows into mailboxes
INSERT INTO "SmtpMailbox" (
  "id", "tenantId", "label", "host", "port", "secure", "username", "passwordEnc",
  "fromEmail", "fromName", "isDefault", "createdAt", "updatedAt"
)
SELECT
  'mb' || substr(md5(random()::text || "tenantId"), 1, 22),
  "tenantId",
  COALESCE(NULLIF("fromName", ''), 'Mailbox'),
  "host",
  "port",
  "secure",
  "username",
  "passwordEnc",
  "fromEmail",
  "fromName",
  true,
  CURRENT_TIMESTAMP,
  "updatedAt"
FROM "SmtpSettings";

-- DropTable
DROP TABLE IF EXISTS "SmtpSettings";
