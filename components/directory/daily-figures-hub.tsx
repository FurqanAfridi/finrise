"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { upsertDailyFigureAction } from "@/app/actions/daily-figures";
import { NativeSelect, TextInput } from "@/components/forms";
import { MainCard } from "@/components/berry/main-card";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { displayDate, isoDate } from "@/lib/dates";
import type { DailyLogContact, DailyLogEntry } from "@/lib/daily-figures";
import { lineTotal } from "@/lib/finance/invoice";
import { formatMoney } from "@/lib/money";
import type { FormActionState } from "@/lib/form-state";

type Draft = {
  date: string;
  contactId: string;
  verticalId: string;
  quantity: string;
  entry?: DailyLogEntry;
};

function figureStatus(entry: DailyLogEntry) {
  if (!entry.billed) return "unbilled" as const;
  if (entry.invoiceIsDraft) return "on_draft" as const;
  return "invoiced" as const;
}

export function DailyFiguresHub({
  entries,
  contacts,
  kind,
  moneyLabel,
}: {
  entries: DailyLogEntry[];
  contacts: DailyLogContact[];
  kind: "buyer" | "publisher";
  moneyLabel: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const today = isoDate(new Date());
  const contactLabel = kind === "buyer" ? "Buyer" : "Publisher";

  function openAdd(date = today) {
    setDraft({
      date,
      contactId: contacts[0]?.id ?? "",
      verticalId: contacts[0]?.verticals[0]?.id ?? "",
      quantity: "",
    });
  }

  function openEntry(row: DailyLogEntry) {
    setDraft({
      date: row.date,
      contactId: row.contactId,
      verticalId: row.verticalId,
      quantity: String(row.quantity),
      entry: row,
    });
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        title={kind === "buyer" ? "No buyer verticals to log" : "No publisher verticals to log"}
        description="Add a contact with at least one vertical in Contacts, then come back to log daily calls and leads."
        actionHref={kind === "buyer" ? "/directory/buyers/new" : "/directory/publishers/new"}
        actionLabel={kind === "buyer" ? "Create buyer" : "Create publisher"}
      />
    );
  }

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" color="primary" sx={{ minHeight: 44 }} onClick={() => openAdd()}>
          Add figures
        </Button>
      </Stack>

      {entries.length === 0 ? (
        <EmptyState
          title="No figures match these filters"
          description="Try another buyer, publisher, vertical, date, or invoice status. You can also add a missed past date."
        />
      ) : (
        <MainCard content={false} title="Figures">
          <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>{contactLabel}</TableCell>
                  <TableCell>Vertical</TableCell>
                  <TableCell align="right">Calls / leads</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    tabIndex={0}
                    onClick={() => openEntry(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEntry(row);
                      }
                    }}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {displayDate(row.date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.contactName}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.verticalName}</TableCell>
                    <TableCell align="right" className="fr-money">
                      {row.quantity}
                    </TableCell>
                    <TableCell align="right" className="fr-money">
                      {formatMoney(row.amount)}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                        <StatusPill kind={figureStatus(row)} />
                        {row.invoiceHref && row.invoiceNumber ? (
                          <Link
                            href={row.invoiceHref}
                            onClick={(event) => event.stopPropagation()}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                              {row.invoiceNumber}
                            </Typography>
                          </Link>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack spacing={1.5} sx={{ display: { xs: "grid", md: "none" }, p: 2 }}>
            {entries.map((row) => (
              <Box
                key={row.id}
                role="button"
                tabIndex={0}
                onClick={() => openEntry(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEntry(row);
                  }
                }}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  minHeight: 44,
                  cursor: "pointer",
                }}
              >
                <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, alignItems: "flex-start" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{row.contactName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {displayDate(row.date)} · {row.verticalName}
                    </Typography>
                  </Box>
                  <Typography className="fr-money" sx={{ fontWeight: 700 }}>
                    {formatMoney(row.amount)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ mt: 1, justifyContent: "space-between", gap: 1, alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" className="fr-money">
                    {row.quantity} calls / leads
                  </Typography>
                  <StatusPill kind={figureStatus(row)} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </MainCard>
      )}

      <DetailDrawer
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.entry ? "Edit figures" : "Add figures"}
        subtitle={draft ? "Today or any past date you missed." : undefined}
      >
        {draft ? (
          <LogFigureForm
            key={`${draft.date}-${draft.contactId}-${draft.verticalId}-${draft.entry?.id ?? "new"}`}
            kind={kind}
            contacts={contacts}
            moneyLabel={moneyLabel}
            draft={draft}
          />
        ) : null}
      </DetailDrawer>
    </>
  );
}

function LogFigureForm({
  kind,
  contacts,
  moneyLabel,
  draft,
}: {
  kind: "buyer" | "publisher";
  contacts: DailyLogContact[];
  moneyLabel: string;
  draft: Draft;
}) {
  const [state, action] = useActionState(upsertDailyFigureAction, {} as FormActionState);
  const [contactId, setContactId] = useState(draft.contactId);
  const [verticalId, setVerticalId] = useState(draft.verticalId);
  const [quantity, setQuantity] = useState(draft.quantity);
  const contact = useMemo(() => contacts.find((row) => row.id === contactId) ?? contacts[0], [contacts, contactId]);
  const verticals = contact?.verticals ?? [];
  const vertical = verticals.find((row) => row.id === verticalId) ?? verticals[0];
  const estimated = vertical ? lineTotal(vertical.rateType, Number(quantity) || 0, vertical.rate, null).toNumber() : 0;
  const errors = state.fieldErrors ?? {};
  const billed = Boolean(draft.entry?.billed);

  return (
    <Stack spacing={2}>
      {billed ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          This day is already on an invoice, so it cannot be changed here.
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {vertical?.rate == null
            ? "Add a rate on this vertical in Contacts to estimate the amount."
            : `${quantity || "0"} × ${formatMoney(vertical.rate)} = ${formatMoney(estimated)} ${moneyLabel}.`}
        </Typography>
      )}
      <Box component="form" action={action} sx={{ display: "grid", gap: 1.5 }}>
        <input type="hidden" name="kind" value={kind} />
        <TextInput
          label="Date"
          name="figureDate"
          type="date"
          required
          defaultValue={draft.date}
          errorMessage={errors.figureDate}
          helperText="Use a missed past date if you forgot to log that day."
        />
        <NativeSelect
          label={kind === "buyer" ? "Buyer" : "Publisher"}
          name="contactId"
          value={contact?.id ?? ""}
          onChange={(event) => {
            const nextId = event.target.value;
            setContactId(nextId);
            const next = contacts.find((row) => row.id === nextId);
            setVerticalId(next?.verticals[0]?.id ?? "");
          }}
          required
        >
          {contacts.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          label="Vertical"
          name="verticalId"
          value={vertical?.id ?? ""}
          onChange={(event) => setVerticalId(event.target.value)}
          required
          errorMessage={errors.verticalId}
        >
          {verticals.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
              {row.rate != null ? ` · ${formatMoney(row.rate)}` : ""}
            </option>
          ))}
        </NativeSelect>
        <TextInput
          label="Calls / leads"
          name="quantity"
          kind="decimal"
          maxDecimals={2}
          min={0}
          required
          defaultValue={draft.quantity}
          onValueChange={setQuantity}
          errorMessage={errors.quantity}
        />
        {state.error && !state.fieldErrors ? (
          <Typography color="error" variant="body2">
            {state.error}
          </Typography>
        ) : null}
        {state.ok ? (
          <Typography color="success.main" variant="body2">
            Figures saved.
          </Typography>
        ) : null}
        {!billed ? (
          <Button type="submit" variant="contained" color="secondary" sx={{ minHeight: 44 }}>
            Save figures
          </Button>
        ) : null}
      </Box>
      {draft.entry ? (
        <Button component={Link} href={draft.entry.contactHref} variant="outlined" color="primary" sx={{ minHeight: 44 }}>
          Open contact
        </Button>
      ) : null}
      {draft.entry?.invoiceHref ? (
        <Button component={Link} href={draft.entry.invoiceHref} variant="text" color="primary" sx={{ minHeight: 44 }}>
          Open invoice
        </Button>
      ) : null}
    </Stack>
  );
}
