import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { ContactCardLink, ContactTableRow } from "@/components/directory/contact-link";
import { CustomVerticalForm } from "@/components/directory/custom-vertical-form";
import { DirectoryTabs, type DirectoryTabId } from "@/components/directory/directory-tabs";
import { NativeSelect, TextInput } from "@/components/forms";
import { MainCard } from "@/components/berry/main-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { prisma } from "@/lib/prisma";
import { ensurePpcVerticals } from "@/lib/verticals";
import { requireBrokerOps } from "@/lib/tenant";

function parseDirectoryTab(raw: string | string[] | undefined): DirectoryTabId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "publishers" || value === "verticals") return value;
  return "buyers";
}

function contactSearchWhere(q: string) {
  if (!q) return {};
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { contactName: { contains: q, mode: "insensitive" as const } },
      { verticalOffers: { some: { vertical: { name: { contains: q, mode: "insensitive" as const } } } } },
    ],
  };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; q?: string | string[]; status?: string | string[] }>;
}) {
  const ctx = await requireBrokerOps();
  await ensurePpcVerticals(ctx.tenantId);
  const params = await searchParams;
  const tab = parseDirectoryTab(params.tab);
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const statusRaw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "";
  const activeFilter = status === "active" ? true : status === "inactive" ? false : undefined;

  const [buyers, publishers, verticals, buyerTotal, publisherTotal] = await Promise.all([
    prisma.buyer.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
        ...contactSearchWhere(q),
      },
      include: {
        verticalOffers: { include: { vertical: { select: { name: true } } }, orderBy: { vertical: { name: "asc" } } },
        _count: { select: { invoices: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.publisher.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
        ...contactSearchWhere(q),
      },
      include: {
        verticalOffers: { include: { vertical: { select: { name: true } } }, orderBy: { vertical: { name: "asc" } } },
        _count: { select: { invoices: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.vertical.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: "asc" } }),
    prisma.buyer.count({ where: { tenantId: ctx.tenantId } }),
    prisma.publisher.count({ where: { tenantId: ctx.tenantId } }),
  ]);

  const filtered = Boolean(q || status);

  return (
    <Box>
      <PageHeader
        title="Contacts"
        description="Buyers and publishers you work with. Open a contact to edit details, verticals, and portal access."
      >
        <Link href="/directory/buyers/new">
          <Button variant="contained" color="primary" sx={{ minHeight: 44 }}>
            Create buyer
          </Button>
        </Link>
        <Link href="/directory/publishers/new">
          <Button variant="outlined" color="primary" sx={{ minHeight: 44 }}>
            Create publisher
          </Button>
        </Link>
      </PageHeader>
      <DirectoryTabs active={tab} />

      {tab === "buyers" || tab === "publishers" ? (
        <Box
          component="form"
          method="get"
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr auto" },
            alignItems: "end",
            mb: 3,
          }}
        >
          <input type="hidden" name="tab" value={tab} />
          <TextInput name="q" label="Search" defaultValue={q} placeholder="Name, email, or vertical" />
          <NativeSelect name="status" label="Status" defaultValue={status}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
          <Button type="submit" variant="contained" color="primary" sx={{ minHeight: 44 }}>
            Apply filters
          </Button>
        </Box>
      ) : null}

      {tab === "buyers" ? (
        buyers.length === 0 ? (
          <EmptyState
            title={filtered || buyerTotal > 0 ? "No buyers match these filters" : "No buyers yet"}
            description={
              filtered || buyerTotal > 0
                ? "Try a different name or clear the status filter."
                : "Create a buyer with company details, payment terms, and the verticals they buy."
            }
            actionHref={filtered || buyerTotal > 0 ? undefined : "/directory/buyers/new"}
            actionLabel={filtered || buyerTotal > 0 ? undefined : "Create buyer"}
          />
        ) : (
          <MainCard title={`Buyers · ${buyers.length}`} content={false}>
            <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Verticals</TableCell>
                    <TableCell align="right">Invoices</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buyers.map((row) => (
                    <ContactTableRow key={row.id} href={`/directory/buyers/${row.id}`}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.email || "No email"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.contactName || "None"}</TableCell>
                      <TableCell>
                        {row.verticalOffers.length
                          ? row.verticalOffers.map((offer) => offer.vertical.name).join(", ")
                          : "None"}
                      </TableCell>
                      <TableCell align="right" className="fr-money">
                        {row._count.invoices}
                      </TableCell>
                      <TableCell>
                        <StatusPill kind={row.isActive ? "active" : "inactive"} />
                      </TableCell>
                    </ContactTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack spacing={1.5} sx={{ display: { xs: "grid", md: "none" }, p: 2 }}>
              {buyers.map((row) => (
                <ContactCardLink key={row.id} href={`/directory/buyers/${row.id}`}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                    <StatusPill kind={row.isActive ? "active" : "inactive"} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {row.email || "No email"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.verticalOffers.length
                      ? row.verticalOffers.map((offer) => offer.vertical.name).join(", ")
                      : "No verticals"}
                  </Typography>
                </ContactCardLink>
              ))}
            </Stack>
          </MainCard>
        )
      ) : null}

      {tab === "publishers" ? (
        publishers.length === 0 ? (
          <EmptyState
            title={filtered || publisherTotal > 0 ? "No publishers match these filters" : "No publishers yet"}
            description={
              filtered || publisherTotal > 0
                ? "Try a different name or clear the status filter."
                : "Create a publisher with company details, payment terms, and the verticals they run."
            }
            actionHref={filtered || publisherTotal > 0 ? undefined : "/directory/publishers/new"}
            actionLabel={filtered || publisherTotal > 0 ? undefined : "Create publisher"}
          />
        ) : (
          <MainCard title={`Publishers · ${publishers.length}`} content={false}>
            <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Publisher</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Verticals</TableCell>
                    <TableCell align="right">Payables</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {publishers.map((row) => (
                    <ContactTableRow key={row.id} href={`/directory/publishers/${row.id}`}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.email || "No email"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.contactName || "None"}</TableCell>
                      <TableCell>
                        {row.verticalOffers.length
                          ? row.verticalOffers.map((offer) => offer.vertical.name).join(", ")
                          : "None"}
                      </TableCell>
                      <TableCell align="right" className="fr-money">
                        {row._count.invoices}
                      </TableCell>
                      <TableCell>
                        <StatusPill kind={row.isActive ? "active" : "inactive"} />
                      </TableCell>
                    </ContactTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack spacing={1.5} sx={{ display: { xs: "grid", md: "none" }, p: 2 }}>
              {publishers.map((row) => (
                <ContactCardLink key={row.id} href={`/directory/publishers/${row.id}`}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                    <StatusPill kind={row.isActive ? "active" : "inactive"} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {row.email || "No email"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.verticalOffers.length
                      ? row.verticalOffers.map((offer) => offer.vertical.name).join(", ")
                      : "No verticals"}
                  </Typography>
                </ContactCardLink>
              ))}
            </Stack>
          </MainCard>
        )
      ) : null}

      {tab === "verticals" ? (
        <Stack spacing={3}>
          <MainCard title="Add a custom vertical">
            <CustomVerticalForm />
          </MainCard>
          <MainCard title={`Catalog · ${verticals.length}`} content={false}>
            <List dense sx={{ maxHeight: 520, overflow: "auto" }}>
              {verticals.map((row) => (
                <ListItem key={row.id}>
                  <ListItemText primary={row.name} secondary={row.isSystem ? "PPC catalog" : "Custom"} />
                </ListItem>
              ))}
            </List>
          </MainCard>
        </Stack>
      ) : null}
    </Box>
  );
}
