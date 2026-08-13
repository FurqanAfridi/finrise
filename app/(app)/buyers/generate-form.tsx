"use client";

import { useActionState, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { RateType } from "@prisma/client";
import { generateBuyerInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import { WizardSteps } from "@/components/shared/wizard-steps";
import { formatMoney } from "@/lib/money";
import { isoDate } from "@/lib/dates";
import { RATE_TYPE_LABEL } from "@/lib/status";

type BuyerOption = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  contactName: string | null;
  defaultTerms: string | null;
  defaultPaymentTermsDays: number;
};

const STEPS = ["Buyer", "Amount", "Dates", "Review"];

export function GenerateInvoiceForm({
  buyers,
  verticals,
  nextNumber,
  defaultNetDays,
}: {
  buyers: BuyerOption[];
  verticals: { id: string; name: string }[];
  nextNumber: string;
  defaultNetDays: number;
}) {
  const [step, setStep] = useState(0);
  const [buyerId, setBuyerId] = useState(buyers[0]?.id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(nextNumber);
  const [invoiceDate, setInvoiceDate] = useState(isoDate(new Date()));
  const [contact, setContact] = useState(buyers[0]?.contactName ?? "");
  const [email, setEmail] = useState(buyers[0]?.email ?? "");
  const [address, setAddress] = useState(buyers[0]?.address ?? "");
  const [verticalId, setVerticalId] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [leadCount, setLeadCount] = useState("");
  const [rateType, setRateType] = useState<RateType>(RateType.CPL);
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [comments, setComments] = useState("");
  const [state, action] = useActionState(generateBuyerInvoice, {});

  const buyer = useMemo(() => buyers.find((row) => row.id === buyerId), [buyers, buyerId]);
  const netDaysDefault = buyer?.defaultPaymentTermsDays ?? defaultNetDays ?? 7;
  const [netDays, setNetDays] = useState(String(netDaysDefault));
  const verticalName = verticals.find((row) => row.id === verticalId)?.name;

  if (buyers.length === 0) {
    return (
      <MainCard title="Generate invoice">
        Add a buyer in Contacts first, then come back to create an invoice.
      </MainCard>
    );
  }

  const canNext =
    (step === 0 && Boolean(buyerId)) ||
    (step === 1 && Boolean(amount) && Number(amount) > 0) ||
    step === 2 ||
    step === 3;

  return (
    <MainCard title="Create invoice">
      <WizardSteps steps={STEPS} active={step} />
      <Box component="form" action={action}>
        <input type="hidden" name="buyerId" value={buyerId} />
        <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
        <input type="hidden" name="invoiceDate" value={invoiceDate} />
        <input type="hidden" name="buyerContact" value={contact} />
        <input type="hidden" name="buyerEmail" value={email} />
        <input type="hidden" name="buyerAddress" value={address} />
        <input type="hidden" name="verticalId" value={verticalId} />
        <input type="hidden" name="periodLabel" value={periodLabel} />
        <input type="hidden" name="periodStart" value={periodStart} />
        <input type="hidden" name="periodEnd" value={periodEnd} />
        <input type="hidden" name="dueDate" value={dueDate} />
        <input type="hidden" name="leadCount" value={leadCount} />
        <input type="hidden" name="rateType" value={rateType} />
        <input type="hidden" name="rate" value={rate} />
        <input type="hidden" name="revenue" value={amount} />
        <input type="hidden" name="paymentTermsDays" value={netDays} />
        <input type="hidden" name="comments" value={comments} />

        {step === 0 ? (
          <Box sx={{ display: "grid", gap: 2, maxWidth: 560 }}>
            <Typography variant="body2" color="text.secondary">
              Who is this invoice for?
            </Typography>
            <TextField
              select
              size="small"
              fullWidth
              required
              label="Buyer"
              value={buyerId}
              onChange={(event) => {
                const nextBuyerId = event.target.value;
                setBuyerId(nextBuyerId);
                const nextBuyer = buyers.find((row) => row.id === nextBuyerId);
                setContact(nextBuyer?.contactName ?? "");
                setEmail(nextBuyer?.email ?? "");
                setAddress(nextBuyer?.address ?? "");
                setNetDays(String(nextBuyer?.defaultPaymentTermsDays ?? defaultNetDays ?? 7));
              }}
              slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            >
              {buyers.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </TextField>
            <TextField size="small" fullWidth label="Contact name" value={contact} onChange={(e) => setContact(e.target.value)} />
            <TextField
              size="small"
              fullWidth
              label="Buyer email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="Used when you email this invoice"
            />
            <TextField
              size="small"
              fullWidth
              label="Buyer address"
              multiline
              minRows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Box>
        ) : null}

        {step === 1 ? (
          <Box sx={{ display: "grid", gap: 2, maxWidth: 560, gridTemplateColumns: { sm: "1fr 1fr" } }}>
            <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
              What are you billing for?
            </Typography>
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                select
                size="small"
                fullWidth
                label="Vertical"
                value={verticalId}
                onChange={(e) => setVerticalId(e.target.value)}
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              >
                <option value="">None</option>
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
              value={leadCount}
              onChange={(e) => setLeadCount(e.target.value.replace(/\D/g, "").slice(0, 10))}
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 10 } }}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="Rate type"
              value={rateType}
              onChange={(e) => setRateType(e.target.value as RateType)}
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
              label="Rate"
              value={rate}
              onChange={(e) => {
                let next = e.target.value.replace(/[^\d.]/g, "");
                const dot = next.indexOf(".");
                if (dot !== -1) {
                  next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, "").slice(0, 4)}`;
                }
                setRate(next.slice(0, 16));
              }}
              slotProps={{ htmlInput: { inputMode: "decimal", maxLength: 16 } }}
            />
            <TextField
              size="small"
              fullWidth
              required
              label="Amount"
              value={amount}
              onChange={(e) => {
                let next = e.target.value.replace(/[^\d.]/g, "");
                const dot = next.indexOf(".");
                if (dot !== -1) {
                  next = `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, "").slice(0, 2)}`;
                }
                setAmount(next.slice(0, 16));
              }}
              slotProps={{ htmlInput: { inputMode: "decimal", maxLength: 16 } }}
              helperText="Total the buyer owes"
            />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                size="small"
                fullWidth
                label="Line description"
                multiline
                minRows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value.slice(0, 500))}
                helperText="Shown on the invoice under the line item"
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            </Box>
          </Box>
        ) : null}

        {step === 2 ? (
          <Box sx={{ display: "grid", gap: 2, maxWidth: 560, gridTemplateColumns: { sm: "1fr 1fr" } }}>
            <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
              When is this for, and when is payment due?
            </Typography>
            <TextField
              size="small"
              fullWidth
              required
              label="Invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              required
              type="date"
              label="Invoice date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              fullWidth
              label="Period label"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              helperText="e.g. Aug 2026 week 2"
            />
            <TextField
              size="small"
              fullWidth
              required
              label="NET days"
              value={netDays}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                const n = digits === "" ? "" : String(Math.min(365, Number(digits)));
                setNetDays(n);
              }}
              helperText={`Printed as Net - ${netDays || "0"}`}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { inputMode: "numeric", maxLength: 3 },
              }}
            />
            <TextField
              size="small"
              fullWidth
              type="date"
              label="Period start"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              fullWidth
              type="date"
              label="Period end"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              fullWidth
              type="date"
              label="Due date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              helperText="Leave blank to use invoice date + NET days"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
          </Box>
        ) : null}

        {step === 3 ? (
          <Box sx={{ maxWidth: 560 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Check the details, then create the invoice.
            </Typography>
            <Stack spacing={1.25} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <ReviewRow label="Buyer" value={buyer?.name ?? "—"} />
              <ReviewRow label="Email" value={email || "—"} />
              <ReviewRow label="Invoice #" value={invoiceNumber} />
              <ReviewRow label="Amount" value={amount ? formatMoney(Number(amount)) : "—"} money />
              <ReviewRow label="Terms" value={`Net - ${netDays || "0"}`} />
              <ReviewRow label="Rate" value={`${RATE_TYPE_LABEL[rateType]}${rate ? ` · ${rate}` : ""}`} />
              <ReviewRow label="Vertical" value={verticalName || "None"} />
              <ReviewRow label="Period" value={periodLabel || "—"} />
              <ReviewRow label="Description" value={comments || "—"} />
            </Stack>
          </Box>
        ) : null}

        {state.error ? (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {state.error}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
          {step > 0 ? (
            <Button type="button" variant="outlined" color="primary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="contained"
              color="primary"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" variant="contained" color="primary" size="large">
              Create invoice
            </Button>
          )}
        </Stack>
      </Box>
    </MainCard>
  );
}

function ReviewRow({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" className={money ? "fr-money" : undefined} sx={{ fontWeight: 600, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
