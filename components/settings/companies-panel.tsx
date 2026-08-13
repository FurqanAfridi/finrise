import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { TenantRole } from "@prisma/client";
import { leaveCompanyAction, switchTenantAction } from "@/app/actions/ops";
import { MainCard } from "@/components/berry/main-card";
import { CompanyCreateForm } from "@/components/company-create-form";
import { gridSpacing } from "@/theme/berry";

export type CompanyMembershipRow = {
  id: string;
  tenantId: string;
  role: TenantRole;
  tenant: {
    name: string;
    slug: string;
    _count: { memberships: number };
    memberships: { id: string }[];
  };
};

export function CompaniesPanel({
  memberships,
  currentTenantId,
}: {
  memberships: CompanyMembershipRow[];
  currentTenantId: string;
}) {
  return (
    <Grid container spacing={gridSpacing}>
      {memberships.map((row) => {
        const isCurrent = row.tenantId === currentTenantId;
        const isAdmin = row.role === TenantRole.ADMIN;
        const canLeave = !isAdmin || row.tenant.memberships.length > 1;
        return (
          <Grid key={row.id} size={{ xs: 12, md: 6 }}>
            <MainCard
              title={row.tenant.name}
              secondary={
                <Stack direction="row" spacing={1}>
                  {isCurrent ? <Chip size="small" color="secondary" label="Current" /> : null}
                  <Chip size="small" label={row.role} variant="outlined" />
                </Stack>
              }
              contentSX={{ display: "grid", gap: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                {row.tenant.slug} · {row.tenant._count.memberships}{" "}
                {row.tenant._count.memberships === 1 ? "member" : "members"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {isCurrent ? (
                  <Button variant="outlined" disabled>
                    Working here
                  </Button>
                ) : (
                  <Box component="form" action={switchTenantAction}>
                    <input type="hidden" name="tenantId" value={row.tenantId} />
                    <Button type="submit" variant="contained" color="secondary">
                      Switch to this company
                    </Button>
                  </Box>
                )}
                {canLeave ? (
                  <Box component="form" action={leaveCompanyAction}>
                    <input type="hidden" name="tenantId" value={row.tenantId} />
                    <Button type="submit" color="inherit">
                      Leave
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                    Last admin cannot leave
                  </Typography>
                )}
              </Stack>
            </MainCard>
          </Grid>
        );
      })}
      <Grid size={{ xs: 12, md: 6 }}>
        <MainCard title="Create a company" contentSX={{ display: "grid", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            You become the admin. Company name, address, and contact details are locked after create.
          </Typography>
          <CompanyCreateForm submitLabel="Create company" />
        </MainCard>
      </Grid>
    </Grid>
  );
}
