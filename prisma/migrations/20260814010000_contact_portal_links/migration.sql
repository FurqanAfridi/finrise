-- Publisher contact details (mirror Buyer)
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Publisher" ADD COLUMN IF NOT EXISTS "contactName" TEXT;

-- Link memberships to a specific buyer or publisher portal identity
ALTER TABLE "TenantMembership" ADD COLUMN IF NOT EXISTS "buyerId" TEXT;
ALTER TABLE "TenantMembership" ADD COLUMN IF NOT EXISTS "publisherId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_buyerId_key" ON "TenantMembership"("buyerId");
CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_publisherId_key" ON "TenantMembership"("publisherId");

DO $$ BEGIN
  ALTER TABLE "TenantMembership"
    ADD CONSTRAINT "TenantMembership_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TenantMembership"
    ADD CONSTRAINT "TenantMembership_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invites can target a specific contact
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "buyerId" TEXT;
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "publisherId" TEXT;

CREATE INDEX IF NOT EXISTS "Invite_buyerId_idx" ON "Invite"("buyerId");
CREATE INDEX IF NOT EXISTS "Invite_publisherId_idx" ON "Invite"("publisherId");

DO $$ BEGIN
  ALTER TABLE "Invite"
    ADD CONSTRAINT "Invite_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Invite"
    ADD CONSTRAINT "Invite_publisherId_fkey"
    FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
