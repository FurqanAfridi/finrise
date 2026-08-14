"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { saveCompanyBankAction, saveCompanyProfile, saveSettings } from "@/app/actions/ops";
import { BankFields, type BankFieldValues } from "@/components/bank-fields";
import { DayOfMonthSelect, NativeSelect, NetDaysSelect, TextInput } from "@/components/forms";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-ui";
import { DEFAULT_INVOICE_COLOR } from "@/lib/invoice-theme";

function InvoiceColorField({ defaultValue }: { defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);
  const valid = /^#[0-9A-F]{6}$/.test(color);

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: "100%", maxWidth: 360 }}>
      <Box
        component="input"
        type="color"
        value={valid ? color : DEFAULT_INVOICE_COLOR}
        onChange={(event) => setColor(event.target.value.toUpperCase())}
        sx={{
          width: 40,
          height: 40,
          p: 0,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "transparent",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="Pick invoice color"
      />
      <TextField
        size="small"
        fullWidth
        name="invoiceColor"
        value={color}
        onChange={(event) => setColor(event.target.value.toUpperCase())}
        slotProps={{ htmlInput: { "aria-label": "Invoice hex color" } }}
      />
    </Stack>
  );
}

export function CompanyExtrasForm({
  website,
  taxId,
  paymentNotes,
  invoiceColor,
  defaultNetDays,
  termsAndConditions,
  logoSrc,
  hasLogo,
  invoiceEmail,
  invoicePhone,
  invoiceRepresentativeName,
  companyEmail,
  companyPhone,
}: {
  website?: string | null;
  taxId?: string | null;
  paymentNotes?: string | null;
  invoiceColor?: string | null;
  defaultNetDays?: number | null;
  termsAndConditions?: string | null;
  logoSrc?: string | null;
  hasLogo: boolean;
  invoiceEmail?: string | null;
  invoicePhone?: string | null;
  invoiceRepresentativeName?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
}) {
  const [state, action] = useActionState(saveCompanyProfile, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Box component="form" action={action}>
      <SettingsSection
        title="Look"
        description="Logo and color appear on printable invoices and in emails you send to buyers."
      >
        <SettingsRow label="Logo" hint="PNG, JPG, WebP, GIF, or SVG up to 2 MB.">
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", width: "100%" }}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Company logo" style={{ maxHeight: 48, maxWidth: 140, objectFit: "contain" }} />
            ) : (
              <Typography color="text.secondary" variant="body2">
                No logo yet
              </Typography>
            )}
            <Button component="label" variant="outlined" size="small">
              {hasLogo ? "Change" : "Upload"}
              <input type="file" name="logo" hidden accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" />
            </Button>
            {hasLogo ? (
              <Typography variant="body2" component="label" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <input type="checkbox" name="removeLogo" value="true" />
                Remove
              </Typography>
            ) : null}
          </Stack>
        </SettingsRow>
        <SettingsRow label="Invoice color" hint="Heading, table header, and amount due on the invoice.">
          <InvoiceColorField defaultValue={invoiceColor || DEFAULT_INVOICE_COLOR} />
        </SettingsRow>
        <SettingsRow label="Website" hint="Optional. Shown under your company name.">
          <TextInput label="Website" name="website" defaultValue={website ?? ""} hideLabel errorMessage={errors.website} />
        </SettingsRow>
        <SettingsRow label="Tax ID" hint="Optional. Printed on the invoice if you add one.">
          <TextInput label="Tax ID" name="taxId" defaultValue={taxId ?? ""} hideLabel errorMessage={errors.taxId} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Invoice contact"
        description="These print on invoices. They can differ from the locked company email and phone. Leave a field blank to use the company detail instead."
      >
        <SettingsRow
          label="Representative name"
          hint="The person buyers should contact about this invoice."
        >
          <TextInput
            label="Company representative name"
            name="invoiceRepresentativeName"
            kind="letters"
            defaultValue={invoiceRepresentativeName ?? ""}
            hideLabel
            maxLength={80}
            errorMessage={errors.invoiceRepresentativeName}
          />
        </SettingsRow>
        <SettingsRow
          label="Invoice email"
          hint={companyEmail ? `Company email is ${companyEmail}.` : "Shown on the invoice and in invoice emails."}
        >
          <TextInput
            label="Invoice email"
            name="invoiceEmail"
            type="email"
            defaultValue={invoiceEmail ?? ""}
            hideLabel
            maxLength={254}
            errorMessage={errors.invoiceEmail}
          />
        </SettingsRow>
        <SettingsRow
          label="Invoice phone"
          hint={companyPhone ? `Company phone is ${companyPhone}.` : "Shown on the invoice under your company name."}
        >
          <TextInput
            label="Invoice phone"
            name="invoicePhone"
            kind="phone"
            defaultValue={invoicePhone ?? ""}
            hideLabel
            errorMessage={errors.invoicePhone}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Payment terms"
        description="These apply to new invoices. You can still change NET days on a single invoice when you create it."
      >
        <SettingsRow label="Default NET days" hint="Printed as Net - those days. Due date is invoice date plus this many days.">
          <Box sx={{ maxWidth: 160, width: "100%" }}>
            <NetDaysSelect
              name="defaultNetDays"
              label="Default NET days"
              defaultValue={defaultNetDays ?? 7}
              required
              hideLabel
              errorMessage={errors.defaultNetDays}
            />
          </Box>
        </SettingsRow>
        <SettingsRow
          label="Terms and conditions"
          hint="Attached at the bottom of every invoice and included in the email."
          align="start"
        >
          <TextInput label="Terms and conditions" name="termsAndConditions" multiline rows={6} defaultValue={termsAndConditions ?? ""} hideLabel maxLength={8000} errorMessage={errors.termsAndConditions} />
        </SettingsRow>
        <SettingsRow label="Payment notes" hint="Short note under the bank details, such as a payment reference." align="start">
          <TextInput label="Payment notes" name="paymentNotes" multiline defaultValue={paymentNotes ?? ""} hideLabel maxLength={500} />
        </SettingsRow>
      </SettingsSection>

      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {state.error}
        </Typography>
      ) : null}
      <Button type="submit" variant="contained" color="secondary">
        Save branding
      </Button>
    </Box>
  );
}

export function CompanyBankCompleteForm({
  country,
  defaults,
}: {
  country: string;
  defaults?: BankFieldValues;
}) {
  const [state, action] = useActionState(saveCompanyBankAction, {});

  return (
    <Box component="form" action={action} sx={{ px: 3, py: 2.5, display: "grid", gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        Add the account buyers should pay. It is printed on invoices and cannot be changed later.
      </Typography>
      <BankFields country={country} defaults={defaults} size="small" fieldErrors={state.fieldErrors} />
      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2">
          {state.error}
        </Typography>
      ) : null}
      <Box>
        <Button type="submit" variant="contained" color="secondary">
          Save bank account
        </Button>
      </Box>
    </Box>
  );
}

export function FinanceSettingsForm({
  currency,
  taxRatePercent,
  taxOrder,
  varianceToleranceAmount,
  fiscalMonthStartDay,
  lastImportAt,
}: {
  currency: string;
  taxRatePercent: number;
  taxOrder: string;
  varianceToleranceAmount: number;
  fiscalMonthStartDay: number;
  lastImportAt?: string | null;
}) {
  const [state, action] = useActionState(saveSettings, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Box component="form" action={action}>
      <SettingsSection
        title="Money rules"
        description="Used for monthly profit, tax, partner splits, and payment variance flags."
      >
        <SettingsRow label="Currency" hint="Three-letter code used on invoices, for example USD.">
          <Box sx={{ maxWidth: 160, width: "100%" }}>
            <TextInput label="Currency" name="currency" defaultValue={currency} required kind="currency" hideLabel errorMessage={errors.currency} />
          </Box>
        </SettingsRow>
        <SettingsRow label="Tax rate" hint="Percent of profit set aside for tax before partner payouts.">
          <Box sx={{ maxWidth: 160, width: "100%" }}>
            <TextInput
              label="Tax rate %"
              name="taxRatePercent"
              defaultValue={taxRatePercent}
              required
              kind="decimal"
              maxDecimals={2}
              min={0}
              max={100}
              hideLabel
              errorMessage={errors.taxRatePercent}
            />
          </Box>
        </SettingsRow>
        <SettingsRow label="Payout order" hint="The order profit is split after expenses.">
          <NativeSelect label="Tax order" name="taxOrder" defaultValue={taxOrder} hideLabel>
            <option value="TAX_FIRST">Tax first, then top-line partners, then equity</option>
            <option value="TIER1_FIRST">Top-line partners first, then tax, then equity</option>
          </NativeSelect>
        </SettingsRow>
        <SettingsRow
          label="Variance tolerance"
          hint="Flag a payment if received or paid differs from the invoice by more than this amount."
        >
          <Box sx={{ maxWidth: 160, width: "100%" }}>
            <TextInput
              label="Variance tolerance"
              name="varianceToleranceAmount"
              defaultValue={varianceToleranceAmount}
              required
              kind="decimal"
              maxDecimals={2}
              min={0}
              hideLabel
              errorMessage={errors.varianceToleranceAmount}
            />
          </Box>
        </SettingsRow>
        <SettingsRow label="Fiscal month start" hint="Day of the month books roll to the next period. Usually 1.">
          <Box sx={{ maxWidth: 160, width: "100%" }}>
            <DayOfMonthSelect
              name="fiscalMonthStartDay"
              label="Fiscal month start day"
              defaultValue={fiscalMonthStartDay}
              required
              hideLabel
              errorMessage={errors.fiscalMonthStartDay}
            />
          </Box>
        </SettingsRow>
        <SettingsRow label="Last CSV import" hint="When buyer, publisher, or expense rows were last imported.">
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
            {lastImportAt ? new Date(lastImportAt).toLocaleString() : "Not imported yet"}
          </Typography>
        </SettingsRow>
      </SettingsSection>
      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {state.error}
        </Typography>
      ) : null}
      <Button type="submit" variant="contained" color="secondary">
        Save finance rules
      </Button>
    </Box>
  );
}
