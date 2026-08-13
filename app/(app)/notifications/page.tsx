import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { markNotificationRead, markNotificationsRead } from "@/app/actions/ops";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { displayDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export default async function NotificationsPage() {
  const ctx = await requireTenant();
  const rows = await prisma.notification.findMany({
    where: { tenantId: ctx.tenantId, userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <Box>
      <PageHeader title="Notifications" description="Overdue invoices, variance flags, publisher payment approvals, withdrawals." />
      <Box component="form" action={markNotificationsRead} sx={{ mb: 2 }}>
        <Button type="submit" variant="outlined">
          Mark all read
        </Button>
      </Box>
      <MainCard content={false}>
        <List>
          {rows.map((row) => (
            <ListItem
              key={row.id}
              secondaryAction={
                row.readAt ? null : (
                  <Box component="form" action={markNotificationRead}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" size="small">
                      Read
                    </Button>
                  </Box>
                )
              }
            >
              <ListItemText
                primary={`${row.title}${row.readAt ? "" : " · new"}`}
                secondary={`${displayDate(row.createdAt)} · ${row.body}${row.href ? ` · ${row.href}` : ""}`}
              />
            </ListItem>
          ))}
        </List>
      </MainCard>
    </Box>
  );
}
