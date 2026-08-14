import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { isPublisherPortal, requireTenant } from "@/lib/tenant";
import { num } from "@/lib/utils";

export default async function PayoutsPage() {
  const ctx = await requireTenant();
  if (!isPublisherPortal(ctx)) redirect("/partners");

  const publisherId = ctx.linkedPublisherId ?? "__none__";
  const rows = await prisma.publisherInvoice.findMany({
    where: {
      tenantId: ctx.tenantId,
      publisherId,
      OR: [{ paymentStatus: "PAID" }, { paid: { not: null } }],
    },
    orderBy: [{ paidAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  return (
    <Box>
      <PageHeader
        title="Payment history"
        description="Payments recorded against your invoices with this company."
      />
      <MainCard content={false} title="Payments">
        {rows.length === 0 ? (
          <Box sx={{ px: 3, py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No payments yet. When this company marks your invoice paid, it will show up here.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Paid on</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.invoiceNumber || row.periodLabel || "Payable"}</TableCell>
                  <TableCell>{displayDate(row.paidAt)}</TableCell>
                  <TableCell>{row.paymentMethod || "None"}</TableCell>
                  <TableCell align="right" className="fr-money">
                    {formatMoney(num(row.paid ?? row.payable))}
                  </TableCell>
                  <TableCell>
                    <StatusPill paymentStatus="PAID" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MainCard>
    </Box>
  );
}
