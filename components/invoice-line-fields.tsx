"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { RateType } from "@prisma/client";
import { lineTotal } from "@/lib/finance/invoice";
import { RATE_TYPE_LABEL } from "@/lib/status";
import { num } from "@/lib/utils";

const DIRECT_TYPES = new Set<RateType>([RateType.FLAT, RateType.PROFIT_SHARE]);

function sanitizeDecimal(value: string, maxDecimals: number) {
  let next = value.replace(/[^\d.]/g, "");
  const dot = next.indexOf(".");
  if (dot !== -1) {
    next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals)}`;
  }
  return next.slice(0, 16);
}

function formatMoneyInput(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

/**
 * Lead count × rate → total. Total stays locked until the user clicks Edit.
 * Flat / profit-share types always allow a manual total.
 */
export function InvoiceLineFields({
  totalName,
  totalLabel,
  mirrorName,
  mirrorLabel,
  defaultLeadCount,
  defaultRate,
  defaultRateType,
  defaultTotal,
  defaultMirror,
}: {
  totalName: "revenue" | "amount";
  totalLabel: string;
  mirrorName?: "receivable" | "payable";
  mirrorLabel?: string;
  defaultLeadCount?: string;
  defaultRate?: string;
  defaultRateType?: RateType;
  defaultTotal?: string;
  defaultMirror?: string;
}) {
  const initialType = defaultRateType ?? RateType.CPL;
  const [leadCount, setLeadCount] = useState(defaultLeadCount ?? "");
  const [rate, setRate] = useState(defaultRate ?? "");
  const [rateType, setRateType] = useState<RateType>(initialType);
  const [unlocked, setUnlocked] = useState(() => DIRECT_TYPES.has(initialType));
  const [manualTotal, setManualTotal] = useState(defaultTotal ?? "");
  const [mirrorUnlocked, setMirrorUnlocked] = useState(false);
  const [manualMirror, setManualMirror] = useState(defaultMirror ?? "");

  const computed = useMemo(() => {
    const total = lineTotal(rateType, leadCount || 0, rate || 0, manualTotal || 0);
    return Number(total.toFixed(2));
  }, [rateType, leadCount, rate, manualTotal]);

  const isDirect = DIRECT_TYPES.has(rateType);
  const totalEditable = unlocked || isDirect;
  const submittedTotal = totalEditable
    ? manualTotal || (isDirect ? "" : formatMoneyInput(computed))
    : formatMoneyInput(computed);
  const displayTotal = totalEditable ? manualTotal : formatMoneyInput(computed);

  const submittedMirror = mirrorUnlocked ? manualMirror || submittedTotal : submittedTotal;
  const displayMirror = mirrorUnlocked ? manualMirror : submittedTotal;

  return (
    <>
      <TextField
        size="small"
        fullWidth
        label="Lead / call count"
        name="leadCount"
        value={leadCount}
        onChange={(e) => setLeadCount(e.target.value.replace(/\D/g, "").slice(0, 10))}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { inputMode: "numeric", maxLength: 10, "aria-label": "Lead / call count" },
        }}
        helperText="Quantity used to calculate the total"
      />

      <TextField
        select
        size="small"
        fullWidth
        label="Rate type"
        name="rateType"
        value={rateType}
        onChange={(e) => {
          const next = e.target.value as RateType;
          setRateType(next);
          setUnlocked(DIRECT_TYPES.has(next));
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
        name="rate"
        value={rate}
        onChange={(e) => setRate(sanitizeDecimal(e.target.value, 4))}
        disabled={isDirect}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: {
            inputMode: "decimal",
            maxLength: 16,
            "aria-label": "Lead cost / rate",
            // Disabled fields are omitted from FormData — keep a value for direct types.
            disabled: isDirect,
          },
        }}
        helperText={isDirect ? "Not used for flat / profit-share lines" : "Multiplied by lead count"}
      />
      {isDirect ? <input type="hidden" name="rate" value={rate || "0"} /> : null}

      <Box sx={{ display: "grid", gap: 0.75 }}>
        <TextField
          size="small"
          fullWidth
          required
          label={totalLabel}
          value={displayTotal}
          onChange={(e) => {
            if (!totalEditable) return;
            setManualTotal(sanitizeDecimal(e.target.value, 2));
          }}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              readOnly: !totalEditable,
              endAdornment: !isDirect ? (
                <InputAdornment position="end">
                  <Button
                    type="button"
                    size="small"
                    onClick={() => {
                      if (!unlocked) {
                        setManualTotal(formatMoneyInput(computed));
                        setUnlocked(true);
                      } else {
                        setUnlocked(false);
                      }
                    }}
                  >
                    {unlocked ? "Use calc" : "Edit"}
                  </Button>
                </InputAdornment>
              ) : undefined,
            },
            htmlInput: {
              inputMode: "decimal",
              maxLength: 16,
              "aria-label": totalLabel,
            },
          }}
          helperText={
            isDirect
              ? "Enter the total for this line"
              : unlocked
                ? "Manual override — click Use calc to return to lead count × rate"
                : `Auto: ${leadCount || "0"} × ${rate || "0"} = ${formatMoneyInput(computed)}. Click Edit to override.`
          }
        />
        <input type="hidden" name={totalName} value={submittedTotal} />
      </Box>

      {mirrorName ? (
        <Box sx={{ display: "grid", gap: 0.75 }}>
          <TextField
            size="small"
            fullWidth
            label={mirrorLabel ?? mirrorName}
            value={displayMirror}
            onChange={(e) => {
              if (!mirrorUnlocked) return;
              setManualMirror(sanitizeDecimal(e.target.value, 2));
            }}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                readOnly: !mirrorUnlocked,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      type="button"
                      size="small"
                      onClick={() => {
                        if (!mirrorUnlocked) {
                          setManualMirror(submittedTotal);
                          setMirrorUnlocked(true);
                        } else {
                          setMirrorUnlocked(false);
                        }
                      }}
                    >
                      {mirrorUnlocked ? "Match total" : "Edit"}
                    </Button>
                  </InputAdornment>
                ),
              },
              htmlInput: { inputMode: "decimal", maxLength: 16 },
            }}
            helperText={
              mirrorUnlocked
                ? "Manual override"
                : `Matches ${totalLabel.toLowerCase()} until you click Edit`
            }
          />
          <input type="hidden" name={mirrorName} value={submittedMirror} />
        </Box>
      ) : null}

      {!isDirect ? (
        <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
          Formula: lead count × lead cost = {totalLabel.toLowerCase()} (
          {formatMoneyInput(num(submittedTotal || 0))}).
        </Typography>
      ) : null}
    </>
  );
}
