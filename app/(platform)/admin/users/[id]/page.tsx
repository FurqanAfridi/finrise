import Link from "next/link";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { platformDeleteUser, platformUpdateUser, platformUpsertMembership } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/roles";
import { TENANT_ROLE_LABEL } from "@/lib/status";
import { TenantRole } from "@prisma/client";
import { notFound } from "next/navigation";

export default async function PlatformUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const [user, tenants] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        memberships: { include: { tenant: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!user) notFound();

  return (
    <>
      <PageHeader title={user.email} description="Edit this account, reset their password, or attach them to a company." />

      <Stack
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpdateUser(fd);
        }}
        spacing={2}
        sx={{ mb: 4, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", maxWidth: 560 }}
      >
        <input type="hidden" name="id" value={user.id} />
        <TextField name="email" label="Email" defaultValue={user.email} required fullWidth />
        <TextField name="name" label="Name" defaultValue={user.name ?? ""} fullWidth />
        <TextField name="role" label="Platform role" select defaultValue={user.role} fullWidth>
          <MenuItem value={Role.MEMBER}>MEMBER</MenuItem>
          <MenuItem value={Role.ADMIN}>ADMIN (platform)</MenuItem>
        </TextField>
        <TextField
          name="password"
          type="password"
          label="New password (optional)"
          helperText="Leave blank to keep the current password."
          fullWidth
        />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">
            Save user
          </Button>
          <Button component={Link} href="/admin/users" variant="outlined" color="secondary">
            Back
          </Button>
        </Stack>
      </Stack>

      <Typography variant="h3" sx={{ mb: 1 }}>
        Company memberships
      </Typography>
      <Stack spacing={1} sx={{ mb: 3 }}>
        {user.memberships.map((m) => (
          <Stack
            key={m.id}
            direction={{ xs: "column", sm: "row" }}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
              gap: 1,
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <div>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {m.tenant.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {TENANT_ROLE_LABEL[m.role] ?? m.role}
              </Typography>
            </div>
            <Button component={Link} href={`/admin/tenants/${m.tenantId}`} size="small">
              Open company
            </Button>
          </Stack>
        ))}
        {user.memberships.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No company memberships yet.
          </Typography>
        ) : null}
      </Stack>

      <Stack
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpsertMembership(fd);
        }}
        spacing={2}
        sx={{ mb: 4, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", maxWidth: 560 }}
      >
        <Typography variant="subtitle2">Add to a company</Typography>
        <input type="hidden" name="userId" value={user.id} />
        <TextField name="tenantId" label="Company" select required fullWidth defaultValue="">
          {tenants.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="role" label="Company role" select defaultValue={TenantRole.BROKER} fullWidth>
          {Object.values(TenantRole).map((role) => (
            <MenuItem key={role} value={role}>
              {TENANT_ROLE_LABEL[role] ?? role}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained">
          Add membership
        </Button>
      </Stack>

      <form
        action={async (fd) => {
          "use server";
          await platformDeleteUser(fd);
        }}
      >
        <input type="hidden" name="id" value={user.id} />
        <Button type="submit" color="error" variant="outlined">
          Delete user
        </Button>
      </form>
    </>
  );
}
