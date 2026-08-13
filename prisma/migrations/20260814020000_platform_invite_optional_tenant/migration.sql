-- Platform-admin invites do not belong to a company.
ALTER TABLE "Invite" ALTER COLUMN "tenantId" DROP NOT NULL;
