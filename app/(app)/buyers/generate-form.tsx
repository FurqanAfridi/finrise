"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { generateBuyerInvoice } from "@/app/actions/invoices";
import { MainCard } from "@/components/berry/main-card";
import {
  BuyerEmailRowsEditor,
  createInvoiceLineDraft,
  InvoiceLineRowsEditor,
  InvoiceWizardHiddenFields,
  type InvoiceLineDraft,
} from "@/components/invoice-line-rows-editor";
import { NetDaysSelect } from "@/components/forms";
import { WizardSteps } from "@/components/shared/wizard-steps";
import { formatMoney } from "@/lib/money";
import { isoDate } from "@/lib/dates";
import type { ContactVerticalOffer } from "@/lib/contact-verticals";

type BuyerOption = {
  id: string;
  name: string;
  email: string | null;
  emails: string[];
  address: string | null;
  contactName: string | null;
  defaultTerms: string | null;
  defaultPaymentTermsDays: number;
};

const STEPS = ["Buyer", "Line items", "Dates", "Review"];
const REVIEW_STEP = STEPS.length - 1;

export function GenerateInvoiceForm({
  buyers,
  verticals,
  buyerVerticalOffers,
  nextNumber,
  defaultNetDays,
}: {
  buyers: BuyerOption[];
  verticals: { id: string; name: string }[];
  buyerVerticalOffers: Record<string, ContactVerticalOffer[]>;
  nextNumber: string;
  defaultNetDays: number;
}) {
  const [step, setStep] = useState(0);
  const [buyerId, setBuyerId] = useState(buyers[0]?.id ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(nextNumber);
  const [invoiceDate, setInvoiceDate] = useState(isoDate(new Date()));
  const [contact, setContact] = useState(buyers[0]?.contactName ?? "");
  const [emails, setEmails] = useState<string[]>(
    buyers[0]?.emails.length ? buyers[0].emails : buyers[0]?.email ? [buyers[0].email] : [""],
  );
  const [address, setAddress] = useState(buyers[0]?.address ?? "");
  const [lines, setLines] = useState<InvoiceLineDraft[]>([createInvoiceLineDraft()]);
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [state, action] = useActionState(generateBuyerInvoice, {});
  const [canSubmit, setCanSubmit] = useState(false);

  const isReviewStep = step === REVIEW_STEP;

  useEffect(() => {
    if (!isReviewStep) {
      setCanSubmit(false);
      return;
    }
    const frame = requestAnimationFrame(() => setCanSubmit(true));
    return () => {
      cancelAnimationFrame(frame);
      setCanSubmit(false);
    };
  }, [isReviewStep]);

  const buyer = useMemo(() => buyers.find((row) => row.id === buyerId), [buyers, buyerId]);
  const netDaysDefault = buyer?.defaultPaymentTermsDays ?? defaultNetDays ?? 7;
  const [netDays, setNetDays] = useState(String(netDaysDefault));

  const invoiceTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const count = Number(line.leadCount || 0);
        const unit = Number(line.rate || 0);
        const computed = Math.round(count * unit * 100) / 100;
        const amount =
          line.amountUnlocked || line.rateType === "FLAT" || line.rateType === "PROFIT_SHARE"
            ? Number(line.amount || 0)
            : computed;
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [lines],
  );

  const reviewLines = useMemo(
    () =>
      lines
        .filter((line) => line.verticalId)
        .map((line) => {
          const verticalName = verticals.find((row) => row.id === line.verticalId)?.name ?? "Vertical";
          const count = Number(line.leadCount || 0);
          const unit = Number(line.rate || 0);
          const computed = Math.round(count * unit * 100) / 100;
          const amount =
            line.amountUnlocked || line.rateType === "FLAT" || line.rateType === "PROFIT_SHARE"
              ? Number(line.amount || 0)
              : computed;
          return `${verticalName} · ${formatMoney(amount)}`;
        }),
    [lines, verticals],
  );

  if (buyers.length === 0) {
    return (
      <MainCard title="Generate invoice">
        Add a buyer in Contacts first, then come back to create an invoice.
      </MainCard>
    );
  }

  const hasValidLines = lines.some((line) => line.verticalId && invoiceTotal > 0);
  const hasValidEmails = emails.some((email) => email.trim().length > 0);
  const canNext =
    (step === 0 && Boolean(buyerId) && hasValidEmails) ||
    (step === 1 && hasValidLines) ||
    step === 2;

  function goToNextStep() {
    if (step >= REVIEW_STEP) return;
    setStep((current) => current + 1);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!isReviewStep) {
      event.preventDefault();
    }
  }

  return (
    <MainCard title="Create invoice">
      <WizardSteps steps={STEPS} active={step} />
      <Box component="form" action={action} onSubmit={handleFormSubmit}>
        <input type="hidden" name="buyerId" value={buyerId} />
        <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
        <input type="hidden" name="invoiceDate" value={invoiceDate} />
        <input type="hidden" name="buyerContact" value={contact} />
        <input type="hidden" name="buyerAddress" value={address} />
        <input type="hidden" name="periodLabel" value={periodLabel} />
        <input type="hidden" name="periodStart" value={periodStart} />
        <input type="hidden" name="periodEnd" value={periodEnd} />
        <input type="hidden" name="dueDate" value={dueDate} />
        <input type="hidden" name="paymentTermsDays" value={netDays} />
        <InvoiceWizardHiddenFields emails={emails} lines={lines} />

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
                setEmails(
                  nextBuyer?.emails.length
                    ? nextBuyer.emails
                    : nextBuyer?.email
                      ? [nextBuyer.email]
                      : [""],
                );
                setAddress(nextBuyer?.address ?? "");
                setNetDays(String(nextBuyer?.defaultPaymentTermsDays ?? defaultNetDays ?? 7));
                setLines([createInvoiceLineDraft()]);
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
            <BuyerEmailRowsEditor emails={emails} setEmails={setEmails} includeHiddenFields={false} />
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
          <Box sx={{ maxWidth: 720 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add one line per vertical. You can bill multiple verticals on the same invoice.
            </Typography>
            <InvoiceLineRowsEditor
              lines={lines}
              setLines={setLines}
              verticals={verticals}
              verticalOffers={buyerVerticalOffers}
              contactId={buyerId}
            />
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
            <NetDaysSelect
              name="paymentTermsDaysPreview"
              value={netDays}
              onChange={(e) => setNetDays(e.target.value)}
              required
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

        {step === REVIEW_STEP ? (
          <Box sx={{ maxWidth: 560 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Check the details, then create the invoice.
            </Typography>
            <Stack spacing={1.25} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <ReviewRow label="Buyer" value={buyer?.name ?? "None"} />
              <ReviewRow label="Emails" value={emails.filter(Boolean).join(", ") || "None"} />
              <ReviewRow label="Invoice #" value={invoiceNumber} />
              <ReviewRow label="Amount" value={invoiceTotal ? formatMoney(invoiceTotal) : "None"} money />
              <ReviewRow label="Terms" value={`Net - ${netDays || "0"}`} />
              <ReviewRow label="Lines" value={reviewLines.length ? reviewLines.join(" · ") : "None"} />
              <ReviewRow label="Period" value={periodLabel || "None"} />
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
          {step < REVIEW_STEP ? (
            <Button
              type="button"
              variant="contained"
              color="primary"
              disabled={!canNext}
              onClick={(event) => {
                event.preventDefault();
                goToNextStep();
              }}
            >
              Continue
            </Button>
          ) : (
            <Button type="submit" variant="contained" color="primary" size="large" disabled={!canSubmit}>
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
