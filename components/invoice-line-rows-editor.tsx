"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { RateType } from "@prisma/client";
import { lineTotal } from "@/lib/finance/invoice";
import { formatMoney } from "@/lib/money";
import { RATE_TYPE_LABEL } from "@/lib/status";
import type { ContactVerticalOffer } from "@/lib/contact-verticals";

export type InvoiceLineDraft = {
  key: string;
  verticalId: string;
  leadCount: string;
  rateType: RateType;
  rate: string;
  amount: string;
  amountUnlocked: boolean;
  comments: string;
};

const DIRECT_TYPES = new Set<RateType>([RateType.FLAT, RateType.PROFIT_SHARE]);

export function invoiceLineEffectiveAmount(line: InvoiceLineDraft) {
  const count = Number(line.leadCount || 0);
  const unit = Number(line.rate || 0);
  const computed = DIRECT_TYPES.has(line.rateType)
    ? Number(line.amount || 0)
    : Math.round(count * unit * 100) / 100;
  return line.amountUnlocked || DIRECT_TYPES.has(line.rateType) ? Number(line.amount || 0) : computed;
}

/** Always-mounted fields for multi-step invoice wizard submit. */
export function InvoiceWizardHiddenFields({
  emails,
  lines,
}: {
  emails: string[];
  lines: InvoiceLineDraft[];
}) {
  return (
    <>
      {emails.map((email, index) => (
        <input key={`wizard-buyer-email-${index}`} type="hidden" name="buyerEmail" value={email} />
      ))}
      {lines.map((line) => {
        const effectiveAmount = invoiceLineEffectiveAmount(line);
        return (
          <span key={line.key} hidden>
            <input type="hidden" name="lineVerticalId" value={line.verticalId} />
            <input type="hidden" name="lineLeadCount" value={line.leadCount} />
            <input type="hidden" name="lineRateType" value={line.rateType} />
            <input type="hidden" name="lineRate" value={line.rate} />
            <input type="hidden" name="lineAmount" value={String(effectiveAmount || "")} />
            <input type="hidden" name="lineComments" value={line.comments} />
          </span>
        );
      })}
    </>
  );
}

function sanitizeDecimal(value: string, maxDecimals: number) {
  let next = value.replace(/[^\d.]/g, "");
  const dot = next.indexOf(".");
  if (dot !== -1) {
    next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals)}`;
  }
  return next.slice(0, 16);
}

export function createInvoiceLineDraft(verticalId = ""): InvoiceLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    verticalId,
    leadCount: "",
    rateType: RateType.CPL,
    rate: "",
    amount: "",
    amountUnlocked: false,
    comments: "",
  };
}

export function InvoiceLineRowsEditor({
  lines,
  setLines,
  verticals,
  buyerVerticalOffers,
  buyerId,
}: {
  lines: InvoiceLineDraft[];
  setLines: React.Dispatch<React.SetStateAction<InvoiceLineDraft[]>>;
  verticals: { id: string; name: string }[];
  buyerVerticalOffers: Record<string, ContactVerticalOffer[]>;
  buyerId: string;
}) {
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const count = Number(line.leadCount || 0);
        const unit = Number(line.rate || 0);
        const computed = DIRECT_TYPES.has(line.rateType)
          ? Number(line.amount || 0)
          : Math.round(count * unit * 100) / 100;
        const amount =
          line.amountUnlocked || DIRECT_TYPES.has(line.rateType)
            ? Number(line.amount || 0)
            : computed;
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [lines],
  );

  function applyVerticalDefaults(key: string, verticalId: string) {
    const offer = buyerVerticalOffers[buyerId]?.find((row) => row.verticalId === verticalId);
    if (!offer) return;
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              verticalId,
              rate: offer.rate != null ? String(offer.rate) : line.rate,
              rateType: offer.rateType,
              amountUnlocked: DIRECT_TYPES.has(offer.rateType),
            }
          : line,
      ),
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {lines.map((line, index) => {
        const effectiveAmount = invoiceLineEffectiveAmount(line);

        return (
          <Box
            key={line.key}
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { sm: "1fr 1fr" },
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography sx={{ gridColumn: "1 / -1", fontWeight: 600 }}>Line {index + 1}</Typography>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                select
                size="small"
                fullWidth
                required
                label="Vertical"
                value={line.verticalId}
                onChange={(event) => {
                  const nextVerticalId = event.target.value;
                  setLines((current) =>
                    current.map((row) => (row.key === line.key ? { ...row, verticalId: nextVerticalId } : row)),
                  );
                  if (nextVerticalId) applyVerticalDefaults(line.key, nextVerticalId);
                }}
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              >
                <option value="">Select vertical</option>
                {verticals.map((vertical) => (
                  <option key={vertical.id} value={vertical.id}>
                    {vertical.name}
                  </option>
                ))}
              </TextField>
            </Box>
            <TextField
              size="small"
              fullWidth
              label="Quantity / leads"
              value={line.leadCount}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row) =>
                    row.key === line.key ? { ...row, leadCount: event.target.value.replace(/\D/g, "").slice(0, 10) } : row,
                  ),
                )
              }
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 10 } }}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="Rate type"
              value={line.rateType}
              onChange={(event) => {
                const next = event.target.value as RateType;
                setLines((current) =>
                  current.map((row) =>
                    row.key === line.key
                      ? { ...row, rateType: next, amountUnlocked: DIRECT_TYPES.has(next) }
                      : row,
                  ),
                );
              }}
              slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            >
              {Object.values(RateType).map((value) => (
                <option key={value} value={value}>
                  {RATE_TYPE_LABEL[value]}
                </option>
              ))}
            </TextField>
            <TextField
              size="small"
              fullWidth
              label="Lead cost / rate"
              value={line.rate}
              onChange={(event) =>
                setLines((current) =>
                  current.map((row) =>
                    row.key === line.key ? { ...row, rate: sanitizeDecimal(event.target.value, 4) } : row,
                  ),
                )
              }
              disabled={DIRECT_TYPES.has(line.rateType)}
              slotProps={{ htmlInput: { inputMode: "decimal", maxLength: 16 } }}
            />
            <TextField
              size="small"
              fullWidth
              required
              label="Line amount"
              value={
                line.amountUnlocked || DIRECT_TYPES.has(line.rateType)
                  ? line.amount
                  : effectiveAmount
                    ? effectiveAmount.toFixed(2)
                    : ""
              }
              onChange={(event) => {
                if (!(line.amountUnlocked || DIRECT_TYPES.has(line.rateType))) return;
                setLines((current) =>
                  current.map((row) =>
                    row.key === line.key ? { ...row, amount: sanitizeDecimal(event.target.value, 2) } : row,
                  ),
                );
              }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  inputMode: "decimal",
                  maxLength: 16,
                  readOnly: !(line.amountUnlocked || DIRECT_TYPES.has(line.rateType)),
                },
                input: {
                  endAdornment: !DIRECT_TYPES.has(line.rateType) ? (
                    <InputAdornment position="end">
                      <Button
                        type="button"
                        size="small"
                        onClick={() =>
                          setLines((current) =>
                            current.map((row) =>
                              row.key === line.key
                                ? row.amountUnlocked
                                  ? { ...row, amountUnlocked: false }
                                  : { ...row, amount: effectiveAmount.toFixed(2), amountUnlocked: true }
                                : row,
                            ),
                          )
                        }
                      >
                        {line.amountUnlocked ? "Use calc" : "Edit"}
                      </Button>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                size="small"
                fullWidth
                label="Line description"
                value={line.comments}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((row) =>
                      row.key === line.key ? { ...row, comments: event.target.value.slice(0, 500) } : row,
                    ),
                  )
                }
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            </Box>
            {lines.length > 1 ? (
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Button
                  type="button"
                  color="error"
                  variant="text"
                  onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                >
                  Remove line
                </Button>
              </Box>
            ) : null}
          </Box>
        );
      })}
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <Button type="button" variant="outlined" onClick={() => setLines((current) => [...current, createInvoiceLineDraft()])}>
          Add another vertical
        </Button>
        <Typography variant="body2" className="fr-money" sx={{ fontWeight: 700 }}>
          Invoice total: {formatMoney(total)}
        </Typography>
      </Stack>
    </Box>
  );
}

export function BuyerEmailRowsEditor({
  emails,
  setEmails,
  includeHiddenFields = true,
}: {
  emails: string[];
  setEmails: React.Dispatch<React.SetStateAction<string[]>>;
  /** Set false when a parent wizard mounts hidden fields for later steps. */
  includeHiddenFields?: boolean;
}) {
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Add every address that should receive this invoice.
      </Typography>
      {emails.map((email, index) => (
        <Stack key={`${index}-${email}`} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <TextField
            size="small"
            fullWidth
            required={index === 0}
            label={index === 0 ? "Primary email" : `Email ${index + 1}`}
            type="email"
            value={email}
            onChange={(event) =>
              setEmails((current) => current.map((row, rowIndex) => (rowIndex === index ? event.target.value : row)))
            }
          />
          {includeHiddenFields ? <input type="hidden" name="buyerEmail" value={email} /> : null}
          {emails.length > 1 ? (
            <Button
              type="button"
              color="error"
              variant="text"
              sx={{ minHeight: 44, mt: 0.5 }}
              onClick={() => setEmails((current) => current.filter((_, rowIndex) => rowIndex !== index))}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
      ))}
      <Button type="button" variant="outlined" onClick={() => setEmails((current) => [...current, ""])} sx={{ alignSelf: "start" }}>
        Add another email
      </Button>
    </Box>
  );
}
