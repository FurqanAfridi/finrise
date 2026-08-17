"use client";

import { useActionState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { RateType } from "@prisma/client";
import {
  addBuyerVerticalAction,
  addPublisherVerticalAction,
  removeBuyerVerticalAction,
  removePublisherVerticalAction,
} from "@/app/actions/ops";
import { NativeSelect, NetDaysSelect, TextInput } from "@/components/forms";
import { RATE_TYPE_LABEL } from "@/lib/status";
import type { ContactVerticalOffer } from "@/lib/contact-verticals";

export function ContactVerticalsPanel({
  kind,
  contactId,
  contactName,
  verticals,
  offers,
}: {
  kind: "buyer" | "publisher";
  contactId: string;
  contactName: string;
  verticals: { id: string; name: string; isSystem?: boolean }[];
  offers: ContactVerticalOffer[];
}) {
  const addAction = kind === "buyer" ? addBuyerVerticalAction : addPublisherVerticalAction;
  const [state, action] = useActionState(addAction, {} as { error?: string; ok?: boolean });
  const assigned = new Set(offers.map((row) => row.verticalId));
  const available = verticals.filter((row) => !assigned.has(row.id));

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, lineHeight: 1.55 }}>
        Verticals for {contactName}. Each vertical can have its own rate and NET terms.
      </Typography>
      {offers.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No verticals yet. Add Medicare, Auto, Solar, or any custom offer below.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 1.5 }}>
          {offers.map((row) => (
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
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.verticalName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {row.terms || `Net ${row.paymentTermsDays}`}
                  {row.rate != null ? ` · ${RATE_TYPE_LABEL[row.rateType]} ${row.rate}` : ""}
                </Typography>
              </Box>
              <Box component="form" action={kind === "buyer" ? removeBuyerVerticalAction : removePublisherVerticalAction}>
                <input type="hidden" name="offerId" value={row.id} />
                <Button type="submit" size="small" color="error" variant="text" sx={{ minHeight: 44 }}>
                  Remove
                </Button>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}

      {available.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Every vertical in your catalog is already on this {kind}. Add a custom vertical from the Verticals tab if you need another.
        </Typography>
      ) : (
        <Box
          component="form"
          action={action}
          sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { sm: "1fr 1fr" }, mt: 1 }}
        >
          <input type="hidden" name={kind === "buyer" ? "buyerId" : "publisherId"} value={contactId} />
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
            <NativeSelect label="Vertical" name="verticalId" required defaultValue="">
              <option value="">Choose vertical</option>
              {available.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.isSystem ? "" : " (custom)"}
                </option>
              ))}
            </NativeSelect>
          </Box>
          <NetDaysSelect name="paymentTermsDays" label="NET days" defaultValue={7} required />
          <NativeSelect name="rateType" label="Rate type" defaultValue={RateType.CPL}>
            {Object.values(RateType).map((value) => (
              <option key={value} value={value}>
                {RATE_TYPE_LABEL[value]}
              </option>
            ))}
          </NativeSelect>
          <TextInput label="Rate per call / lead" name="rate" kind="decimal" maxDecimals={4} min={0} />
          <TextInput label="Payment terms label" name="terms" placeholder="e.g. Net 14, biweekly" maxLength={80} />
          {state.error ? (
            <Typography color="error" variant="body2" sx={{ gridColumn: "1 / -1" }}>
              {state.error}
            </Typography>
          ) : null}
          {state.ok ? (
            <Typography color="success.main" variant="body2" sx={{ gridColumn: "1 / -1" }}>
              Vertical saved for {contactName}.
            </Typography>
          ) : null}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Button type="submit" size="small" variant="outlined" color="secondary" sx={{ minHeight: 44 }}>
              Add vertical
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
