"use client";

import { useActionState, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  copyYesterdayFiguresAction,
  generateCycleDraftsAction,
  removeDailyFigureAction,
  upsertDailyFigureAction,
} from "@/app/actions/daily-figures";
import { NativeSelect, TextInput } from "@/components/forms";
import { displayDate, isoDate } from "@/lib/dates";
import type { DailyFiguresBoard } from "@/lib/daily-figures";
import { lineTotal } from "@/lib/finance/invoice";
import { formatMoney } from "@/lib/money";
import type { FormActionState } from "@/lib/form-state";

export function DailyFiguresPanel({ board }: { board: DailyFiguresBoard }) {
  const [state, action] = useActionState(upsertDailyFigureAction, {} as FormActionState);
  const errors = state.fieldErrors ?? {};
  const [verticalId, setVerticalId] = useState(board.offers[0]?.verticalId ?? "");
  const [quantity, setQuantity] = useState("");
  const offer = useMemo(
    () => board.offers.find((row) => row.verticalId === verticalId) ?? board.offers[0],
    [board.offers, verticalId],
  );
  const estimated = offer ? lineTotal(offer.rateType, Number(quantity) || 0, offer.rate, null).toNumber() : 0;
  const moneyLabel = board.kind === "buyer" ? "to collect" : "to pay";
  const draftReady = board.cycles.some((row) => row.draftReady);

  if (board.offers.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
        Add a vertical with a rate first. Daily calls and leads are tracked per vertical.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      {!board.contractStartDate ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          Add a contract start date in company details so NET periods can prepare draft invoices automatically.
        </Typography>
      ) : null}

      {board.cycles.map((cycle) => (
        <Box
          key={cycle.verticalId}
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: cycle.isLastDay || cycle.draftReady ? "warning.main" : "divider",
            borderRadius: 2,
          }}
        >
          <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 600 }}>{cycle.verticalName}</Typography>
            <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
              {formatMoney(cycle.unbilledAmount)} unbilled
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.55 }}>
            {cycle.progressCopy}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cycle.unbilledQuantity} calls / leads this period · {displayDate(cycle.cycleStart)} to{" "}
            {displayDate(cycle.cycleEnd)}
          </Typography>
        </Box>
      ))}

      {board.missingYesterday ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, lineHeight: 1.55 }}>
            No figures for yesterday. Copy yesterday&apos;s calls if volume was the same.
          </Typography>
          <Box component="form" action={copyYesterdayFiguresAction}>
            <input type="hidden" name="kind" value={board.kind} />
            <input type="hidden" name="contactId" value={board.contactId} />
            <Button type="submit" variant="outlined" color="primary" sx={{ minHeight: 44 }}>
              Copy yesterday
            </Button>
          </Box>
        </Stack>
      ) : null}

      {draftReady ? (
        <Box component="form" action={generateCycleDraftsAction}>
          <input type="hidden" name="kind" value={board.kind} />
          <input type="hidden" name="contactId" value={board.contactId} />
          <Button type="submit" variant="contained" color="primary" sx={{ minHeight: 44 }}>
            Prepare due drafts
          </Button>
        </Box>
      ) : null}

      <Box
        component="form"
        action={action}
        sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { sm: "1fr 1fr" } }}
      >
        <input type="hidden" name="kind" value={board.kind} />
        <input type="hidden" name="contactId" value={board.contactId} />
        <Typography sx={{ fontWeight: 600, fontSize: 16, gridColumn: "1 / -1" }}>Add today&apos;s figures</Typography>
        <NativeSelect
          label="Vertical"
          name="verticalId"
          value={verticalId}
          onChange={(event) => setVerticalId(event.target.value)}
          required
          errorMessage={errors.verticalId}
        >
          {board.offers.map((row) => (
            <option key={row.verticalId} value={row.verticalId}>
              {row.verticalName}
              {row.rate != null ? ` · ${formatMoney(row.rate)}` : ""}
            </option>
          ))}
        </NativeSelect>
        <TextInput
          label="Date"
          name="figureDate"
          type="date"
          defaultValue={isoDate(new Date())}
          required
          errorMessage={errors.figureDate}
        />
        <TextInput
          label="Calls / leads"
          name="quantity"
          kind="decimal"
          maxDecimals={2}
          min={0}
          required
          onValueChange={setQuantity}
          errorMessage={errors.quantity}
        />
        <TextInput label="Note" name="notes" maxLength={200} placeholder="Optional" errorMessage={errors.notes} />
        <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1", lineHeight: 1.55 }}>
          {offer?.rate == null
            ? "Add a rate on this vertical to estimate the amount."
            : `${quantity || "0"} × ${formatMoney(offer.rate)} = ${formatMoney(estimated)} ${moneyLabel} from ${board.contactName}.`}
        </Typography>
        {board.averagePerDay > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
            Recent average: {board.averagePerDay.toLocaleString("en-US", { maximumFractionDigits: 1 })} calls / leads a
            day.
          </Typography>
        ) : null}
        {state.error && !state.fieldErrors ? (
          <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
            {state.error}
          </Typography>
        ) : null}
        {state.ok ? (
          <Typography color="success.main" variant="body2" sx={{ gridColumn: "1 / -1" }}>
            Daily figures saved.
          </Typography>
        ) : null}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Button type="submit" variant="contained" color="secondary" sx={{ minHeight: 44 }}>
            Save figures
          </Button>
        </Box>
      </Box>

      {board.unbilledTotal > 0 ? (
        <Typography className="fr-money" variant="body2" sx={{ fontWeight: 600 }}>
          Unbilled total {formatMoney(board.unbilledTotal)} {moneyLabel}
        </Typography>
      ) : null}

      {board.figures.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No daily figures yet. Add today&apos;s calls or leads to start the running total.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {board.figures.map((row) => (
            <Stack
              key={row.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                alignItems: { sm: "center" },
                justifyContent: "space-between",
                p: 1.25,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {displayDate(row.figureDate)} · {row.verticalName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {row.quantity} calls / leads
                  {row.rate != null ? ` · ${formatMoney(row.rate)}` : ""} · {formatMoney(row.amount)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {row.billed ? (
                  <Typography variant="caption" color="text.secondary">
                    On invoice
                  </Typography>
                ) : (
                  <Box component="form" action={removeDailyFigureAction}>
                    <input type="hidden" name="kind" value={board.kind} />
                    <input type="hidden" name="contactId" value={board.contactId} />
                    <input type="hidden" name="figureId" value={row.id} />
                    <Button type="submit" size="small" color="error" variant="text" sx={{ minHeight: 44 }}>
                      Remove
                    </Button>
                  </Box>
                )}
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
