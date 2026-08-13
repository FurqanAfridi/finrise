"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { importCsvAction } from "@/app/actions/import-csv";
import { WizardSteps } from "@/components/shared/wizard-steps";
import { SettingsSection } from "@/components/settings/settings-ui";

const STEPS = ["What to import", "Paste CSV", "Confirm"];

const KIND_LABEL: Record<string, string> = {
  buyers: "Buyer invoices",
  publishers: "Publisher payables",
  expenses: "Expenses",
};

export function ImportCsvWizard() {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState("buyers");
  const [mode, setMode] = useState("dry-run");
  const [csv, setCsv] = useState("");

  return (
    <Box component="form" action={importCsvAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="csv" value={csv} />

      <SettingsSection
        title="CSV import"
        description="Load rows from a spreadsheet. Start with a dry run so nothing is saved until you are ready."
      >
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
          <WizardSteps steps={STEPS} active={step} />

          {step === 0 ? (
            <Box sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="What to import"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              >
                <option value="buyers">Buyer invoices</option>
                <option value="publishers">Publisher payables</option>
                <option value="expenses">Expenses</option>
              </TextField>
              <TextField
                select
                size="small"
                fullWidth
                label="Mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                helperText={
                  mode === "dry-run"
                    ? "Checks for problems without saving."
                    : "Writes rows to the ledger. Use only after a clean dry run."
                }
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              />
            </Box>
          ) : null}

          {step === 1 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                Paste rows with a header line. Common columns: date_range, name, vertical, count, rate_type, rate,
                total, invoice_number, payment_terms, due_date, payment_status.
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={10}
                required
                label="CSV"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                slotProps={{
                  input: {
                    sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 },
                  },
                }}
              />
            </Box>
          ) : null}

          {step === 2 ? (
            <Stack spacing={1.25} sx={{ maxWidth: 480 }}>
              <Typography variant="body2" color="text.secondary">
                Confirm and run the import.
              </Typography>
              <Review label="Importing" value={KIND_LABEL[kind] ?? kind} />
              <Review label="Mode" value={mode === "dry-run" ? "Dry run (check only)" : "Commit (save)"} />
              <Review label="Rows pasted" value={String(csv.trim() ? csv.trim().split(/\r?\n/).length : 0)} />
            </Stack>
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
                disabled={step === 1 && !csv.trim()}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </Button>
            ) : (
              <Button type="submit" variant="contained" color="primary" disabled={!csv.trim()}>
                {mode === "dry-run" ? "Run dry run" : "Import and save"}
              </Button>
            )}
          </Stack>
        </Box>
      </SettingsSection>
    </Box>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}
