import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/utils";

export default async function PlatformAdminHome() {
  await requirePlatformAdmin();

  const [
    users,
    tenants,
    memberships,
    buyerInvoices,
    publisherInvoices,
    buyers,
    publishers,
    expenses,
    openBuyer,
    openPub,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.tenantMembership.count(),
    prisma.buyerInvoice.count(),
    prisma.publisherInvoice.count(),
    prisma.buyer.count(),
    prisma.publisher.count(),
    prisma.expense.count(),
    prisma.buyerInvoice.aggregate({
      _sum: { receivable: true, received: true },
      where: { paymentStatus: { in: ["UNPAID", "ON_HOLD", "WAITING_ON_BUYER", "BARGAINING"] } },
    }),
    prisma.publisherInvoice.aggregate({
      _sum: { payable: true, paid: true },
      where: { paymentStatus: { in: ["UNPAID", "ON_HOLD", "WAITING_FOR_INV"] } },
    }),
  ]);

  const cards = [
    { label: "Users", value: String(users), href: "/admin/users", hint: "Accounts across the platform" },
    { label: "Companies", value: String(tenants), href: "/admin/tenants", hint: "Tenant workspaces" },
    { label: "Memberships", value: String(memberships), href: "/admin/memberships", hint: "User ↔ company links" },
    { label: "Buyer invoices", value: String(buyerInvoices), href: "/admin/buyer-invoices", hint: "Money coming in" },
    { label: "Payables", value: String(publisherInvoices), href: "/admin/publisher-invoices", hint: "Publisher invoices" },
    { label: "Buyers", value: String(buyers), href: "/admin/buyers", hint: "Buyer contacts" },
    { label: "Publishers", value: String(publishers), href: "/admin/publishers", hint: "Publisher contacts" },
    { label: "Expenses", value: String(expenses), href: "/admin/expenses", hint: "All expense rows" },
  ];

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Manage every company, user, and invoice across Fundlookup. Invite-only, with no public signup on this admin site."
      />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Open receivables: money buyers still owe
            </Typography>
            <Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
              {formatMoney(num(openBuyer._sum.receivable) - num(openBuyer._sum.received))}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Open payables: money still owed to publishers
            </Typography>
            <Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
              {formatMoney(num(openPub._sum.payable) - num(openPub._sum.paid))}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.href} size={{ xs: 12, sm: 6, md: 3 }}>
            <Link href={card.href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
              <Card sx={{ height: 1 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", my: 0.5 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.hint}
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Tip: start with Users to invite another platform admin, or Companies to inspect a workspace’s data.
        </Typography>
      </Box>
    </>
  );
}
