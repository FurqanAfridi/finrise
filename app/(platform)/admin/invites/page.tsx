import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { platformRevokeInvite } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { platformAdminPublicUrl } from "@/lib/platform-host";
import { prisma } from "@/lib/prisma";

export default async function PlatformInvitesPage() {
  await requirePlatformAdmin();
  const rows = await prisma.invite.findMany({
    include: { tenant: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const base = platformAdminPublicUrl();

  return (
    <>
      <PageHeader
        title="Invites"
        description="Pending and recent invitations. Platform invites have no company; company invites belong to a tenant."
      />
      <Table size="small" sx={{ bgcolor: "background.paper" }}>
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Scope</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Expires</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Link</TableCell>
            <TableCell align="right"> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const used = Boolean(row.usedAt);
            const expired = row.expiresAt < new Date();
            const link = `${row.tenantId ? (process.env.AUTH_URL || base).replace(/\/$/, "") : base}/invite/${row.token}`;
            return (
              <TableRow key={row.id} hover>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.tenant?.name ?? "Platform admin"}</TableCell>
                <TableCell>{row.tenantId ? row.tenantRole : row.role}</TableCell>
                <TableCell>{row.expiresAt.toISOString().slice(0, 10)}</TableCell>
                <TableCell>{used ? "Used" : expired ? "Expired" : "Open"}</TableCell>
                <TableCell>
                  {!used && !expired ? (
                    <Typography variant="caption" sx={{ wordBreak: "break-all" }}>
                      {link}
                    </Typography>
                  ) : (
                    "None"
                  )}
                </TableCell>
                <TableCell align="right">
                  {!used ? (
                    <form
                      action={async (fd) => {
                        "use server";
                        await platformRevokeInvite(fd);
                      }}
                    >
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" size="small" color="error">
                        Revoke
                      </Button>
                    </form>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
