import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { platformDeleteTenant, platformUpsertTenant } from "@/app/actions/platform";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { TENANT_ROLE_LABEL } from "@/lib/status";
import { num } from "@/lib/utils";

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 },
      companyProfile: true,
      financeSettings: true,
      _count: {
        select: {
          buyers: true,
          publishers: true,
          buyerInvoices: true,
          publisherInvoices: true,
          expenses: true,
          partners: true,
        },
      },
    },
  });
  if (!tenant) notFound();

  const [buyerSum, pubSum] = await Promise.all([
    prisma.buyerInvoice.aggregate({
      where: { tenantId: id },
      _sum: { receivable: true, received: true, revenue: true },
    }),
    prisma.publisherInvoice.aggregate({
      where: { tenantId: id },
      _sum: { payable: true, paid: true, amount: true },
    }),
  ]);

  return (
    <>
      <PageHeader title={tenant.name} description={`Slug · ${tenant.slug}`} />

      <Stack
        component="form"
        action={async (fd) => {
          "use server";
          await platformUpsertTenant(fd);
        }}
        spacing={2}
        sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 2, maxWidth: 560, bgcolor: "background.paper" }}
      >
        <input type="hidden" name="id" value={tenant.id} />
        <TextField name="name" label="Name" defaultValue={tenant.name} required fullWidth />
        <TextField name="slug" label="Slug" defaultValue={tenant.slug} required fullWidth />
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained">
            Save company
          </Button>
          <Button href="/admin/tenants" variant="outlined" color="secondary">
            Back
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Stat label="Revenue billed" value={formatMoney(num(buyerSum._sum.revenue))} />
        <Stat label="Receivable" value={formatMoney(num(buyerSum._sum.receivable))} />
        <Stat label="Payable" value={formatMoney(num(pubSum._sum.payable))} />
      </Stack>

      <Typography variant="h3" sx={{ mb: 1 }}>
        Snapshot
      </Typography>
      <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
        <ChipLink href={`/admin/buyers?tenant=${id}`} label={`${tenant._count.buyers} buyers`} />
        <ChipLink href={`/admin/publishers?tenant=${id}`} label={`${tenant._count.publishers} publishers`} />
        <ChipLink href={`/admin/buyer-invoices?tenant=${id}`} label={`${tenant._count.buyerInvoices} buyer invoices`} />
        <ChipLink href={`/admin/publisher-invoices?tenant=${id}`} label={`${tenant._count.publisherInvoices} payables`} />
        <ChipLink href={`/admin/expenses?tenant=${id}`} label={`${tenant._count.expenses} expenses`} />
        <ChipLink href={`/admin/partners?tenant=${id}`} label={`${tenant._count.partners} partners`} />
        <ChipLink href={`/admin/memberships?tenant=${id}`} label={`${tenant.memberships.length}+ members`} />
      </Box>

      <Typography variant="h3" sx={{ mb: 1 }}>
        Members
      </Typography>
      <Stack spacing={1} sx={{ mb: 4 }}>
        {tenant.memberships.map((m) => (
          <Stack
            key={m.id}
            direction="row"
            sx={{ justifyContent: "space-between", gap: 1, p: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}
          >
            <div>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {m.user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {TENANT_ROLE_LABEL[m.role] ?? m.role}
              </Typography>
            </div>
            <Button href={`/admin/users/${m.userId}`} size="small">
              User
            </Button>
          </Stack>
        ))}
      </Stack>

      {tenant.companyProfile ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Legal name: {tenant.companyProfile.legalName || "—"} · {tenant.companyProfile.email || "no email"}
        </Typography>
      ) : null}

      <form
        action={async (fd) => {
          "use server";
          await platformDeleteTenant(fd);
        }}
      >
        <input type="hidden" name="id" value={tenant.id} />
        <Button type="submit" color="error" variant="outlined">
          Delete company and all its data
        </Button>
      </form>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack sx={{ flex: 1, p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Stack>
  );
}

function ChipLink({ href, label }: { href: string; label: string }) {
  return (
    <Button href={href} size="small" variant="outlined" color="secondary">
      {label}
    </Button>
  );
}
