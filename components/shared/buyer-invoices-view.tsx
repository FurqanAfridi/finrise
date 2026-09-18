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
import { PaymentStatus } from "@prisma/client";
import { bulkDeleteBuyerInvoices, markBuyerPaid } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import {
  InvoiceBulkDeleteBar,
  InvoiceSelectCheckbox,
  useInvoiceSelection,
} from "@/components/shared/invoice-bulk-delete";
import { StatusPill } from "@/components/shared/status-pill";
import { SendInvoiceButton } from "@/components/smtp-form";
import { displayDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { SmtpMailboxPublic } from "@/lib/smtp";

export type BuyerInvoiceRow = {
  id: string;
  buyerName: string;
  buyerEmails: string[];
  verticalName: string | null;
  periodLabel: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  receivable: number;
  received: number | null;
  varianceAmount: number;
  varianceFlagged: boolean;
  paymentStatus: PaymentStatus;
  overdue: boolean;
  isDraft?: boolean;
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

export function BuyerInvoicesView({
  rows,
  totals,
  mailboxes = [],
  canManage = true,
  canBulkDelete = false,
}: {
  rows: BuyerInvoiceRow[];
  totals: { receivable: number; received: number };
  mailboxes?: SmtpMailboxPublic[];
  canManage?: boolean;
  canBulkDelete?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);
  const close = useCallback(() => setSelectedId(null), []);
  const rowIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useInvoiceSelection(rowIds);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={canManage ? "No buyer invoices yet" : "No invoices yet"}
        description={
          canManage
            ? "Create an invoice to track what a buyer owes you."
            : "When this company sends you an invoice, it will show up here."
        }
        actionHref={canManage ? "/buyers/generate" : undefined}
        actionLabel={canManage ? "Create invoice" : undefined}
      />
    );
  }

  return (
    <>
      <MainCard content={false} title="Invoices">
        {canBulkDelete ? (
          <InvoiceBulkDeleteBar
            selectedIds={selection.selectedIds}
            action={bulkDeleteBuyerInvoices}
            noun="invoice"
            onCleared={selection.clear}
          />
        ) : null}

        <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {canBulkDelete ? (
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <InvoiceSelectCheckbox
                      checked={selection.allSelected}
                      indeterminate={selection.someSelected}
                      onChange={selection.toggleAll}
                      label="Select all invoices on this page"
                    />
                  </TableCell>
                ) : null}
                <TableCell>Buyer</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Due</TableCell>
                <TableCell align="right">Amount due</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={canBulkDelete && selection.selectedIds.includes(row.id)}
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
                  {canBulkDelete ? (
                    <TableCell padding="checkbox">
                      <InvoiceSelectCheckbox
                        checked={selection.selectedIds.includes(row.id)}
                        onChange={() => selection.toggleOne(row.id)}
                        label={`Select invoice ${row.invoiceNumber || row.id}`}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.buyerName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.periodLabel || row.verticalName || "None"}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.invoiceNumber || "Draft"}</TableCell>
                  <TableCell>{displayDate(row.dueDate)}</TableCell>
                  <TableCell align="right" className="fr-money">
                    {formatMoney(row.receivable)}
                  </TableCell>
                  <TableCell align="right" className="fr-money">
                    {row.received == null ? "None" : formatMoney(row.received)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                      <StatusPill paymentStatus={row.paymentStatus} />
                      {row.isDraft ? <StatusPill kind="draft" /> : null}
                      {row.overdue ? <StatusPill kind="overdue" /> : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "var(--fr-surface-muted)" }}>
                <TableCell colSpan={canBulkDelete ? 4 : 3}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Totals
                  </Typography>
                </TableCell>
                <TableCell align="right" className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(totals.receivable)}
                </TableCell>
                <TableCell align="right" className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(totals.received)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Stack spacing={0} sx={{ display: { xs: "flex", md: "none" } }}>
          {rows.map((row) => (
            <Box
              key={row.id}
              sx={{
                px: 2,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: canBulkDelete && selection.selectedIds.includes(row.id) ? "action.selected" : undefined,
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                {canBulkDelete ? (
                  <InvoiceSelectCheckbox
                    checked={selection.selectedIds.includes(row.id)}
                    onChange={() => selection.toggleOne(row.id)}
                    label={`Select invoice ${row.invoiceNumber || row.id}`}
                  />
                ) : null}
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(row.id);
                    }
                  }}
                  sx={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, mb: 0.75 }}>
                    <Typography sx={{ fontWeight: 600 }}>{row.buyerName}</Typography>
                    <Typography className="fr-money" sx={{ fontWeight: 700 }}>
                      {formatMoney(row.receivable)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {row.invoiceNumber || "Draft"} · due {displayDate(row.dueDate)}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                    <StatusPill paymentStatus={row.paymentStatus} />
                    {row.isDraft ? <StatusPill kind="draft" /> : null}
                    {row.overdue ? <StatusPill kind="overdue" /> : null}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </MainCard>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={close}
        title={selected?.buyerName ?? ""}
        subtitle={selected ? `${selected.invoiceNumber || "Draft"} · due ${displayDate(selected.dueDate)}` : undefined}
      >
        {selected ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
              <StatusPill paymentStatus={selected.paymentStatus} />
              {selected.isDraft ? <StatusPill kind="draft" /> : null}
              {selected.overdue ? <StatusPill kind="overdue" /> : null}
            </Stack>
            <Box>
              <DrawerRow label="Amount due">
                <Typography className="fr-money" sx={{ fontWeight: 700 }}>
                  {formatMoney(selected.receivable)}
                </Typography>
              </DrawerRow>
              <DrawerRow label="Received">
                <Typography className="fr-money" sx={{ fontWeight: 600 }}>
                  {selected.received == null ? "None" : formatMoney(selected.received)}
                </Typography>
              </DrawerRow>
              {selected.varianceFlagged ? (
                <DrawerRow label="Difference">
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                    {selected.varianceAmount >= 0
                      ? `Buyer paid ${formatMoney(Math.abs(selected.varianceAmount))} more than invoiced`
                      : `Buyer paid ${formatMoney(Math.abs(selected.varianceAmount))} less than invoiced`}
                  </Typography>
                </DrawerRow>
              ) : null}
              <DrawerRow label="Period">
                <Typography variant="body2">{selected.periodLabel || "None"}</Typography>
              </DrawerRow>
              <DrawerRow label="Vertical">
                <Typography variant="body2">{selected.verticalName || "None"}</Typography>
              </DrawerRow>
            </Box>
            <Divider />
            <Stack spacing={1.25}>
              <Button component={Link} href={`/invoices/${selected.id}`} variant="contained" color="primary" fullWidth>
                View / print invoice
              </Button>
              {canManage ? (
                <>
                  <SendInvoiceButton invoiceId={selected.id} toEmails={selected.buyerEmails} mailboxes={mailboxes} />
                  <Button component={Link} href={`/buyers/${selected.id}`} variant="outlined" color="primary" fullWidth>
                    Edit ledger entry
                  </Button>
                  {selected.paymentStatus !== PaymentStatus.PAID ? (
                    <Box component="form" action={markBuyerPaid}>
                      <input type="hidden" name="id" value={selected.id} />
                      <input type="hidden" name="received" value={String(selected.receivable)} />
                      <Button type="submit" variant="outlined" color="primary" fullWidth>
                        Record full payment
                      </Button>
                    </Box>
                  ) : null}
                </>
              ) : null}
            </Stack>
          </Stack>
        ) : null}
      </DetailDrawer>
    </>
  );
}
