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

export default async function PublisherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBrokerOps();
  const { id } = await params;
  const now = new Date();
  const [publisher, { verticals }, member, pendingInvite, figures] = await Promise.all([
    prisma.publisher.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        verticalOffers: { include: { vertical: { select: { name: true } } }, orderBy: { vertical: { name: "asc" } } },
        _count: { select: { invoices: true } },
      },
    }),
    getDirectoryOptions(ctx.tenantId),
    prisma.tenantMembership.findFirst({
      where: { tenantId: ctx.tenantId, publisherId: id },
      include: { user: { select: { email: true } } },
    }),
    prisma.invite.findFirst({
      where: { tenantId: ctx.tenantId, publisherId: id, usedAt: null, expiresAt: { gt: now } },
      select: { email: true },
    }),
    getDailyFiguresBoard(ctx.tenantId, "publisher", id),
  ]);
  if (!publisher) notFound();

  return (
    <Box>
      <PageHeader
        title={publisher.name}
        description="Publisher details, daily figures, verticals, and portal access. Payables for this publisher live under Payables."
      >
        <Link href="/directory?tab=publishers">
          <Button variant="outlined" color="primary" sx={{ minHeight: 44 }}>
            All publishers
          </Button>
        </Link>
        <Link href={`/publishers?publisher=${publisher.id}`}>
          <Button variant="contained" color="primary" sx={{ minHeight: 44 }}>
            View payables
          </Button>
        </Link>
      </PageHeader>

      <Stack spacing={3}>
        <MainCard title="Overview" content={false}>
          <Stack spacing={1.5} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <StatusPill kind={publisher.isActive ? "active" : "inactive"} />
              {publisher.isInternal ? (
                <Typography variant="caption" color="text.secondary">
                  Internal
                </Typography>
              ) : null}
              <Typography variant="body2" color="text.secondary">
                {publisher._count.invoices} payable{publisher._count.invoices === 1 ? "" : "s"}
              </Typography>
            </Stack>
            <Typography variant="body2">
              {[publisher.contactName, publisher.email, publisher.address].filter(Boolean).join(" · ")}
            </Typography>
            {publisher.contractStartDate ? (
              <Typography variant="body2" color="text.secondary">
                Contract started {displayDate(publisher.contractStartDate)} · NET {publisher.defaultPaymentTermsDays} by
                default
              </Typography>
            ) : null}
            {member ? (
              <Typography variant="body2" color="success.main">
                Portal: {member.user.email}
              </Typography>
            ) : publisher.isActive ? (
              <>
                {pendingInvite ? (
                  <Typography variant="caption" color="text.secondary">
                    Invite pending · {pendingInvite.email}
                  </Typography>
                ) : null}
                <ContactInviteButton
                  kind="publisher"
                  contactId={publisher.id}
                  email={publisher.email}
                  resend={Boolean(pendingInvite)}
                />
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Reactivate to invite again.
              </Typography>
            )}
            <ContactLifecycleActions
              kind="publisher"
              contactId={publisher.id}
              isActive={publisher.isActive}
              hasInvoices={publisher._count.invoices > 0}
            />
          </Stack>
        </MainCard>

        <MainCard title="Company details">
          <ContactForm
            kind="publisher"
            contact={{
              id: publisher.id,
              name: publisher.name,
              email: publisher.email,
              contactName: publisher.contactName,
              address: publisher.address,
              defaultTerms: publisher.defaultTerms,
              defaultPaymentTermsDays: publisher.defaultPaymentTermsDays,
              contractStartDate: publisher.contractStartDate,
              isInternal: publisher.isInternal,
            }}
            verticals={verticals}
          />
        </MainCard>

        <MainCard title="Daily figures">
          {figures ? <DailyFiguresPanel board={figures} /> : null}
        </MainCard>

        <MainCard title="Verticals">
          <ContactVerticalsPanel
            kind="publisher"
            contactId={publisher.id}
            contactName={publisher.name}
            verticals={verticals}
            offers={publisher.verticalOffers.map((offer) => ({
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
