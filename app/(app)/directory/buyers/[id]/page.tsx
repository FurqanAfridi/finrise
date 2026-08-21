import Link from "next/link";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  ContactInviteButton,
  ContactLifecycleActions,
} from "@/components/directory/directory-forms";
import { DailyFiguresPanel } from "@/components/directory/daily-figures-panel";
import { ContactForm } from "@/components/directory/contact-form";
import { ContactVerticalsPanel } from "@/components/directory/contact-verticals-panel";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { displayDate } from "@/lib/dates";
import { getDailyFiguresBoard } from "@/lib/daily-figures";
import { prisma } from "@/lib/prisma";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrokerOps();
  const { id } = await params;
  const now = new Date();
  const [buyer, { verticals }, member, pendingInvite, figures] = await Promise.all([
    prisma.buyer.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        verticalOffers: { include: { vertical: { select: { name: true } } }, orderBy: { vertical: { name: "asc" } } },
        _count: { select: { invoices: true, dailyFigures: true } },
      },
    }),
    getDirectoryOptions(ctx.tenantId),
    prisma.tenantMembership.findFirst({
      where: { tenantId: ctx.tenantId, buyerId: id },
      include: { user: { select: { email: true } } },
    }),
    prisma.invite.findFirst({
      where: { tenantId: ctx.tenantId, buyerId: id, usedAt: null, expiresAt: { gt: now } },
      select: { email: true },
    }),
    getDailyFiguresBoard(ctx.tenantId, "buyer", id),
  ]);
  if (!buyer) notFound();

  return (
    <Box>
      <PageHeader
        title={buyer.name}
        description="Buyer details, daily figures, verticals, and portal access. Invoices for this buyer live under Invoices."
      >
        <Link href="/directory?tab=buyers">
          <Button variant="outlined" color="primary" sx={{ minHeight: 44 }}>
            All buyers
          </Button>
        </Link>
        <Link href={`/buyers?buyer=${buyer.id}`}>
          <Button variant="contained" color="primary" sx={{ minHeight: 44 }}>
            View invoices
          </Button>
        </Link>
      </PageHeader>

      <Stack spacing={3}>
        <MainCard title="Overview" content={false}>
          <Stack spacing={1.5} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <StatusPill kind={buyer.isActive ? "active" : "inactive"} />
              <Typography variant="body2" color="text.secondary">
                {buyer._count.invoices} invoice{buyer._count.invoices === 1 ? "" : "s"}
              </Typography>
            </Stack>
            <Typography variant="body2">{[buyer.contactName, buyer.email, buyer.address].filter(Boolean).join(" · ")}</Typography>
            {buyer.contractStartDate ? (
              <Typography variant="body2" color="text.secondary">
                Contract started {displayDate(buyer.contractStartDate)} · NET {buyer.defaultPaymentTermsDays} by default
              </Typography>
            ) : null}
            {member ? (
              <Typography variant="body2" color="success.main">
                Portal: {member.user.email}
              </Typography>
            ) : buyer.isActive ? (
              <>
                {pendingInvite ? (
                  <Typography variant="caption" color="text.secondary">
                    Invite pending · {pendingInvite.email}
                  </Typography>
                ) : null}
                <ContactInviteButton
                  kind="buyer"
                  contactId={buyer.id}
                  email={buyer.email}
                  resend={Boolean(pendingInvite)}
                />
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Reactivate to invite again.
              </Typography>
            )}
            <ContactLifecycleActions
              kind="buyer"
              contactId={buyer.id}
              isActive={buyer.isActive}
              hasInvoices={buyer._count.invoices > 0 || buyer._count.dailyFigures > 0}
              canDeleteWithHistory={ctx.tenantRole === "ADMIN" || ctx.platformRole === "ADMIN"}
            />
          </Stack>
        </MainCard>

        <MainCard title="Company details">
          <ContactForm
            kind="buyer"
            contact={{
              id: buyer.id,
              name: buyer.name,
              email: buyer.email,
              contactName: buyer.contactName,
              address: buyer.address,
              defaultTerms: buyer.defaultTerms,
              defaultMethod: buyer.defaultMethod,
              defaultPaymentTermsDays: buyer.defaultPaymentTermsDays,
              contractStartDate: buyer.contractStartDate,
            }}
            verticals={verticals}
          />
        </MainCard>

        <MainCard title="Daily figures">
          {figures ? <DailyFiguresPanel board={figures} /> : null}
        </MainCard>

        <MainCard title="Verticals">
          <ContactVerticalsPanel
            kind="buyer"
            contactId={buyer.id}
            contactName={buyer.name}
            verticals={verticals}
            offers={buyer.verticalOffers.map((offer) => ({
              id: offer.id,
              verticalId: offer.verticalId,
              verticalName: offer.vertical.name,
              paymentTermsDays: offer.paymentTermsDays,
              terms: offer.terms,
              rate: offer.rate?.toString() ?? null,
              rateType: offer.rateType,
              rateLabel: offer.rateLabel,
            }))}
          />
        </MainCard>
      </Stack>
    </Box>
  );
}
