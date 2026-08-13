import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { ContactInviteButton, DirectoryAddForm } from "@/components/directory/directory-forms";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireBrokerOps } from "@/lib/tenant";
import { gridSpacing } from "@/theme/berry";

type LinkedMember = { buyerId: string | null; publisherId: string | null; email: string; name: string | null };
type OpenInvite = { buyerId: string | null; publisherId: string | null; email: string };

export default async function DirectoryPage() {
  const ctx = await requireBrokerOps();
  const now = new Date();
  const [buyers, publishers, verticals, memberships, openInvites] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        name: string;
        email: string | null;
        address: string | null;
        contactName: string | null;
      }[]
    >`
      SELECT id, name, email, address, "contactName"
      FROM "Buyer"
      WHERE "tenantId" = ${ctx.tenantId}
      ORDER BY name ASC
    `,
    prisma.$queryRaw<
      {
        id: string;
        name: string;
        email: string | null;
        address: string | null;
        contactName: string | null;
      }[]
    >`
      SELECT id, name, email, address, "contactName"
      FROM "Publisher"
      WHERE "tenantId" = ${ctx.tenantId}
      ORDER BY name ASC
    `,
    prisma.vertical.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } }),
    // Raw SQL so a stale Prisma singleton mid-hot-reload still works after the migration.
    prisma.$queryRaw<LinkedMember[]>`
      SELECT m."buyerId", m."publisherId", u.email, u.name
      FROM "TenantMembership" m
      INNER JOIN "User" u ON u.id = m."userId"
      WHERE m."tenantId" = ${ctx.tenantId}
        AND (m."buyerId" IS NOT NULL OR m."publisherId" IS NOT NULL)
    `,
    prisma.$queryRaw<OpenInvite[]>`
      SELECT "buyerId", "publisherId", email
      FROM "Invite"
      WHERE "tenantId" = ${ctx.tenantId}
        AND "usedAt" IS NULL
        AND "expiresAt" > ${now}
        AND ("buyerId" IS NOT NULL OR "publisherId" IS NOT NULL)
    `,
  ]);

  const buyerMember = new Map(
    memberships.filter((row) => row.buyerId).map((row) => [row.buyerId!, { email: row.email, name: row.name }]),
  );
  const publisherMember = new Map(
    memberships.filter((row) => row.publisherId).map((row) => [row.publisherId!, { email: row.email, name: row.name }]),
  );
  const buyerInvite = new Map(
    openInvites.filter((row) => row.buyerId).map((row) => [row.buyerId!, row.email]),
  );
  const publisherInvite = new Map(
    openInvites.filter((row) => row.publisherId).map((row) => [row.publisherId!, row.email]),
  );

  return (
    <Box>
      <PageHeader
        title="Contacts"
        description="Buyers and publishers for this company. Invite each contact so they only see their own invoices."
      />
      <MainCard title="Add contact" sx={{ mb: 3 }}>
        <DirectoryAddForm />
      </MainCard>

      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title={`Buyers · ${buyers.length}`} content={false}>
            <List dense>
              {buyers.length === 0 ? (
                <ListItem>
                  <ListItemText secondary="No buyers yet" />
                </ListItem>
              ) : (
                buyers.map((row) => {
                  const member = buyerMember.get(row.id);
                  const pending = buyerInvite.get(row.id);
                  return (
                    <ListItem
                      key={row.id}
                      alignItems="flex-start"
                      sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, py: 1.5 }}
                    >
                      <ListItemText
                        primary={row.name}
                        secondary={[row.contactName, row.email, row.address].filter(Boolean).join(" · ") || undefined}
                      />
                      {member ? (
                        <Typography variant="caption" color="success.main">
                          Portal: {member.email}
                        </Typography>
                      ) : pending ? (
                        <ContactInviteButton
                          kind="buyer"
                          contactId={row.id}
                          email={row.email}
                          disabled
                          statusLabel={`Invite pending · ${pending}`}
                        />
                      ) : (
                        <ContactInviteButton kind="buyer" contactId={row.id} email={row.email} />
                      )}
                    </ListItem>
                  );
                })
              )}
            </List>
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title={`Publishers · ${publishers.length}`} content={false}>
            <List dense>
              {publishers.length === 0 ? (
                <ListItem>
                  <ListItemText secondary="No publishers yet" />
                </ListItem>
              ) : (
                publishers.map((row) => {
                  const member = publisherMember.get(row.id);
                  const pending = publisherInvite.get(row.id);
                  return (
                    <ListItem
                      key={row.id}
                      alignItems="flex-start"
                      sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, py: 1.5 }}
                    >
                      <ListItemText
                        primary={row.name}
                        secondary={[row.contactName, row.email, row.address].filter(Boolean).join(" · ") || undefined}
                      />
                      {member ? (
                        <Typography variant="caption" color="success.main">
                          Portal: {member.email}
                        </Typography>
                      ) : pending ? (
                        <ContactInviteButton
                          kind="publisher"
                          contactId={row.id}
                          email={row.email}
                          disabled
                          statusLabel={`Invite pending · ${pending}`}
                        />
                      ) : (
                        <ContactInviteButton kind="publisher" contactId={row.id} email={row.email} />
                      )}
                    </ListItem>
                  );
                })
              )}
            </List>
          </MainCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MainCard title={`Verticals · ${verticals.length}`} content={false}>
            <List dense>
              {verticals.length === 0 ? (
                <ListItem>
                  <ListItemText secondary="No verticals yet" />
                </ListItem>
              ) : (
                verticals.map((row) => (
                  <ListItem key={row.id}>
                    <ListItemText primary={row.name} />
                  </ListItem>
                ))
              )}
            </List>
          </MainCard>
        </Grid>
      </Grid>
    </Box>
  );
}
