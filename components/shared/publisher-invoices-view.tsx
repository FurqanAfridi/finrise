"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { PaidApprovalStatus, PaymentStatus } from "@prisma/client";
import { approvePublisherPayment, markPublisherPaid } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type PublisherInvoiceRow = {
  id: string;
  publisherName: string;
  isInternal: boolean;
  verticalName: string | null;
  periodLabel: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  payable: number;
  paid: number | null;
  varianceAmount: number;
  varianceFlagged: boolean;
  paymentStatus: PaymentStatus;
  paidApprovalStatus: PaidApprovalStatus | null;
};

function DrawerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ textAlign: "right", minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

export function PublisherInvoicesView({
  rows,
  totals,
  canApprove,
  canManage = true,
  isPortal = false,
}: {
  rows: PublisherInvoiceRow[];
  totals: { payable: number; paid: number };
  canApprove: boolean;
  canManage?: boolean;
  isPortal?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const close = useCallback(() => setSelectedId(null), []);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={isPortal ? "No invoices yet" : canManage ? "No publisher payables yet" : "No invoices yet"}
        description={
          isPortal
            ? "Create an invoice to bill this company for your traffic."
            : canManage
              ? "Add a payable when you owe a traffic source."
              : "When this company records payables for you, they will show up here."
        }
        actionHref={isPortal || canManage ? "/publishers/new" : undefined}
        actionLabel={isPortal ? "Create invoice" : canManage ? "New payable" : undefined}
      />
    );
  }

  return (
    <>
      <MainCard content={false} title="Payables">
        <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Publisher</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Due</TableCell>
                <TableCell align="right">You owe</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  tabIndex={0}
                  onClick={() => setSelectedId(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(row.id);
                    }
                  }}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.publisherName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.periodLabel || row.verticalName || (row.isInternal ? "Internal" : "—")}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.invoiceNumber || "—"}</TableCell>
                  <TableCell>{displayDate(row.dueDate)}</TableCell>
                  <TableCell align="right" className="fr-money">
                    {formatMoney(row.payable)}
                  </TableCell>
                  <TableCell align="right" className="fr-money">
                    {row.paid == null ? "—" : formatMoney(row.paid)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                      <StatusPill paymentStatus={row.paymentStatus} />
                      {row.paidApprovalStatus === PaidApprovalStatus.PENDING ? (
                        <StatusPill kind="pending_approval" />
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "var(--fr-surface-muted)" }}>
                <TableCell colSpan={3}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Totals
                  </Typography>
                </TableCell>
                <TableCell align="right" className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(totals.payable)}
                </TableCell>
                <TableCell align="right" className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(totals.paid)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Stack sx={{ display: { xs: "flex", md: "none" } }}>
          {rows.map((row) => (
            <Box
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(row.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedId(row.id);
                }
              }}
              sx={{
                px: 2,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, mb: 0.75 }}>
                <Typography sx={{ fontWeight: 600 }}>{row.publisherName}</Typography>
                <Typography className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(row.payable)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {row.invoiceNumber || "Payable"} · due {displayDate(row.dueDate)}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                <StatusPill paymentStatus={row.paymentStatus} />
                {row.paidApprovalStatus === PaidApprovalStatus.PENDING ? (
                  <StatusPill kind="pending_approval" />
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      </MainCard>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={close}
        title={selected?.publisherName ?? ""}
        subtitle={selected ? `${selected.invoiceNumber || "Payable"} · due ${displayDate(selected.dueDate)}` : undefined}
      >
        {selected ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
              <StatusPill paymentStatus={selected.paymentStatus} />
              {selected.paidApprovalStatus === PaidApprovalStatus.PENDING ? (
                <StatusPill kind="pending_approval" />
              ) : null}
            </Stack>
            <Box>
              <DrawerRow label="You owe">
                <Typography className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(selected.payable)}
                </Typography>
              </DrawerRow>
              <DrawerRow label="Paid">
                <Typography className="fr-money" sx={{ fontWeight: 600 }}>
                  {selected.paid == null ? "—" : formatMoney(selected.paid)}
                </Typography>
              </DrawerRow>
              {selected.varianceFlagged ? (
                <DrawerRow label="Difference">
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                    Paid {formatMoney(Math.abs(selected.varianceAmount))}
                    {selected.varianceAmount >= 0 ? " more than owed" : " less than owed"}
                  </Typography>
                </DrawerRow>
              ) : null}
              <DrawerRow label="Period">
                <Typography variant="body2">{selected.periodLabel || "—"}</Typography>
              </DrawerRow>
              <DrawerRow label="Vertical">
                <Typography variant="body2">{selected.verticalName || "—"}</Typography>
              </DrawerRow>
            </Box>
            <Divider />
            <Stack spacing={1.25}>
              {isPortal ? (
                <>
                  <Button component={Link} href={`/publishers/${selected.id}`} variant="contained" color="primary" fullWidth>
                    Open invoice
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Open the invoice to edit details or send it to company admins and accountants.
                  </Typography>
                </>
              ) : canManage ? (
                <>
                  <Button component={Link} href={`/publishers/${selected.id}`} variant="contained" color="primary" fullWidth>
                    Edit payable
                  </Button>
                  {selected.paymentStatus !== PaymentStatus.PAID ? (
                    <Box component="form" action={markPublisherPaid}>
                      <input type="hidden" name="id" value={selected.id} />
                      <Button type="submit" variant="outlined" color="primary" fullWidth>
                        Mark paid
                      </Button>
                    </Box>
                  ) : null}
                  {canApprove && selected.paidApprovalStatus === PaidApprovalStatus.PENDING ? (
                    <>
                      <Box component="form" action={approvePublisherPayment}>
                        <input type="hidden" name="id" value={selected.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" variant="contained" color="success" fullWidth>
                          Approve payment
                        </Button>
                      </Box>
                      <Box component="form" action={approvePublisherPayment}>
                        <input type="hidden" name="id" value={selected.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" variant="outlined" color="error" fullWidth>
                          Reject payment
                        </Button>
                      </Box>
                    </>
                  ) : null}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This is a read-only view of your invoices with this company.
                </Typography>
              )}
            </Stack>
          </Stack>
        ) : null}
      </DetailDrawer>
    </>
  );
}
