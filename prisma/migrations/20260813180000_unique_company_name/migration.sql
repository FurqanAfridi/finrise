CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_name_lower_key" ON "Tenant" (lower("name"));
