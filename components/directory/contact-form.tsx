"use client";

import { useActionState, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { RateType } from "@prisma/client";
import { upsertDirectory } from "@/app/actions/ops";
import { NativeSelect, NetDaysSelect, TextInput } from "@/components/forms";
import { netTermsReminder } from "@/lib/billing-cycle";
import { isoDate } from "@/lib/dates";
import { RATE_TYPE_LABEL } from "@/lib/status";
import type { FormActionState } from "@/lib/form-state";

type OfferDraft = {
  key: string;
  verticalId: string;
  paymentTermsDays: string;
  rate: string;
  rateType: RateType;
  terms: string;
};

export function ContactForm({
  kind,
  contact,
  verticals,
}: {
  kind: "buyer" | "publisher";
  contact?: {
    id: string;
    name: string;
    email: string | null;
    contactName: string | null;
    address: string | null;
    defaultTerms: string | null;
    defaultMethod?: string | null;
    defaultPaymentTermsDays: number;
    contractStartDate?: Date | string | null;
    isInternal?: boolean;
  };
  verticals: { id: string; name: string; isSystem?: boolean }[];
}) {
  const [state, action] = useActionState(upsertDirectory, {} as FormActionState);
  const errors = state.fieldErrors ?? {};
  const [netDays, setNetDays] = useState(String(contact?.defaultPaymentTermsDays ?? 7));
  const [offers, setOffers] = useState<OfferDraft[]>([
    { key: "1", verticalId: "", paymentTermsDays: "7", rate: "", rateType: RateType.CPL, terms: "" },
  ]);
  const editing = Boolean(contact?.id);

  return (
    <Box component="form" action={action} sx={{ display: "grid", gap: 2, gridTemplateColumns: { md: "1fr 1fr" } }}>
      <input type="hidden" name="kind" value={kind} />
      {contact?.id ? <input type="hidden" name="id" value={contact.id} /> : null}

      <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "1 / -1", lineHeight: 1.55 }}>
        {kind === "buyer"
          ? "Company, billing contact, contract start, default payment terms, and the verticals this buyer buys."
          : "Company, contact, contract start, default payment terms, and the verticals this publisher runs."}
      </Typography>

      <TextInput
        label="Company name"
        name="name"
        required
        maxLength={120}
        defaultValue={contact?.name ?? ""}
        errorMessage={errors.name}
        autoComplete="organization"
      />
      <TextInput
        label="Contact name"
        name="contactName"
        required
        kind="letters"
        maxLength={80}
        defaultValue={contact?.contactName ?? ""}
        errorMessage={errors.contactName}
        autoComplete="name"
      />
      <TextInput
        label="Email"
        name="email"
        type="email"
        required
        maxLength={254}
        defaultValue={contact?.email ?? ""}
        errorMessage={errors.email}
        autoComplete="email"
      />
      <NetDaysSelect
        name="defaultPaymentTermsDays"
        label="Default NET days"
        value={netDays}
        onChange={(event) => setNetDays(event.target.value)}
        required
        errorMessage={errors.defaultPaymentTermsDays}
        helperText={netTermsReminder(kind, Number(netDays) || 7)}
      />
      <TextInput
        label="Contract start date"
        name="contractStartDate"
        type="date"
        required={!editing}
        defaultValue={isoDate(contact?.contractStartDate) || isoDate(new Date())}
        errorMessage={errors.contractStartDate}
        helperText="Daily figures roll into a draft invoice at the end of each NET period from this date."
      />
      <Box sx={{ gridColumn: "1 / -1" }}>
        <TextInput
          label="Address"
          name="address"
          required
          maxLength={200}
          defaultValue={contact?.address ?? ""}
          errorMessage={errors.address}
          autoComplete="street-address"
        />
      </Box>
      <TextInput
        label="Default payment terms"
        name="defaultTerms"
        maxLength={80}
        defaultValue={contact?.defaultTerms ?? ""}
        placeholder="e.g. Net 14, weekly"
      />
      {kind === "buyer" ? (
        <TextInput
          label="Default payment method"
          name="defaultMethod"
          maxLength={80}
          defaultValue={contact?.defaultMethod ?? ""}
          placeholder="e.g. ACH, wire"
        />
      ) : (
        <NativeSelect label="Publisher type" name="isInternal" defaultValue={contact?.isInternal ? "true" : "false"}>
          <option value="false">External</option>
          <option value="true">Internal</option>
        </NativeSelect>
      )}

      {!editing ? (
        <Box sx={{ gridColumn: "1 / -1", display: "grid", gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 16 }}>Verticals</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            A {kind} can have more than one vertical, each with its own rate and NET terms. You can add more later.
          </Typography>
          {offers.map((row, index) => (
            <Box
              key={row.key}
              sx={{
                display: "grid",
                gap: 1.25,
                gridTemplateColumns: { sm: "1fr 1fr" },
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
            >
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <NativeSelect
                  label={`Vertical ${index + 1}`}
                  name="offerVerticalId"
                  value={row.verticalId}
                  onChange={(event) => {
                    const next = event.target.value;
                    setOffers((current) =>
                      current.map((item) => (item.key === row.key ? { ...item, verticalId: next } : item)),
                    );
                  }}
                >
                  <option value="">None yet</option>
                  {verticals.map((vertical) => (
                    <option key={vertical.id} value={vertical.id}>
                      {vertical.name}
                      {vertical.isSystem ? "" : " (custom)"}
                    </option>
                  ))}
                </NativeSelect>
              </Box>
              <NetDaysSelect
                name="offerPaymentTermsDays"
                label="NET days"
                value={row.paymentTermsDays}
                onChange={(event) => {
                  const next = event.target.value;
                  setOffers((current) =>
                    current.map((item) => (item.key === row.key ? { ...item, paymentTermsDays: next } : item)),
                  );
                }}
                required
              />
              <Typography variant="caption" color="text.secondary" sx={{ gridColumn: { sm: "1 / -1" }, lineHeight: 1.5 }}>
                {netTermsReminder(kind, Number(row.paymentTermsDays) || 7)}
              </Typography>
              <NativeSelect name="offerRateType" label="Rate type" defaultValue={row.rateType}>
                {Object.values(RateType).map((value) => (
                  <option key={value} value={value}>
                    {RATE_TYPE_LABEL[value]}
                  </option>
                ))}
              </NativeSelect>
              <TextInput label="Rate per call / lead" name="offerRate" kind="decimal" maxDecimals={4} min={0} />
              <TextInput label="Payment terms label" name="offerTerms" maxLength={80} placeholder="e.g. Net 14" />
              {offers.length > 1 ? (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Button
                    type="button"
                    size="small"
                    color="error"
                    variant="text"
                    onClick={() => setOffers((current) => current.filter((item) => item.key !== row.key))}
                    sx={{ minHeight: 44 }}
                  >
                    Remove this vertical
                  </Button>
                </Box>
              ) : null}
            </Box>
          ))}
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            onClick={() =>
              setOffers((current) => [
                ...current,
                {
                  key: String(Date.now()),
                  verticalId: "",
                  paymentTermsDays: "7",
                  rate: "",
                  rateType: RateType.CPL,
                  terms: "",
                },
              ])
            }
            sx={{ justifySelf: "start", minHeight: 44 }}
          >
            Add another vertical
          </Button>
        </Box>
      ) : null}

      {state.error && !state.fieldErrors ? (
        <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
          {state.error}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ gridColumn: "1 / -1", flexWrap: "wrap" }}>
        <Button type="submit" variant="contained" color="secondary" sx={{ minHeight: 44 }}>
          {editing ? `Save ${kind}` : `Create ${kind}`}
        </Button>
      </Stack>
    </Box>
  );
}
