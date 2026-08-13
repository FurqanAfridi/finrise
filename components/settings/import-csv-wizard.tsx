"use client";

import { useActionState, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { importCsvAction, type ImportCsvResult } from "@/app/actions/import-csv";
import { WizardSteps } from "@/components/shared/wizard-steps";
import { SettingsSection } from "@/components/settings/settings-ui";

const STEPS = ["What to import", "Paste or upload", "Confirm"];

const KIND_LABEL: Record<string, string> = {
  buyers: "Buyer invoices (historical)",
  publishers: "Publisher payables (historical)",
  expenses: "Expenses (historical)",
};

const TEMPLATES: Record<string, string> = {
  buyers:
    "date_range,name,vertical,count,rate_type,rate,total,invoice_number,payment_terms,due_date,payment_status,invoice_status,receivable,received,payment_date,payment_method\n" +
    "8/1-8/15,Acme Ads,Auto Insurance,120,CPL,25,3000,INV-1001,NET 14,2024-08-29,PAID,SENT,3000,3000,2024-08-28,ACH",
  publishers:
    "date_range,name,vertical,count,rate_type,rate,total,invoice_number,payment_terms,due_date,payment_status,payable,paid,week,month\n" +
    "8/1-8/15,Traffic Co,Auto Insurance,80,CPL,12,960,PUB-2001,NET 7,2024-08-22,PAID,960,960,W1,August",
  expenses:
    "year,month,category,label,actual,paid,notes\n" +
    "2024,8,Software,Email tool,49,49,Historical backfill",
};

export function ImportCsvWizard() {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState("buyers");
  const [mode, setMode] = useState("dry-run");
  const [csv, setCsv] = useState("");
  const [state, action, pending] = useActionState(importCsvAction, {} as ImportCsvResult);

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <Box component="form" action={action}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="csv" value={csv} />

      <SettingsSection
        title="Upload historical data"
        description="Bring in past invoices and expenses from a spreadsheet. Run a dry run first, then commit when the preview looks right."
      >
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
          <WizardSteps steps={STEPS} active={step} />

          {step === 0 ? (
            <Box sx={{ display: "grid", gap: 2, maxWidth: 520 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="What to import"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                helperText="Use one file type at a time. Contacts are created automatically from invoice names."
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              >
                <option value="buyers">Buyer invoices (historical)</option>
                <option value="publishers">Publisher payables (historical)</option>
                <option value="expenses">Expenses (historical)</option>
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
                    ? "Checks rows and shows a preview without saving."
                    : "Writes rows to the ledger. Use only after a clean dry run."
                }
                slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
              >
                <option value="dry-run">Dry run (check only)</option>
                <option value="commit">Commit (save)</option>
              </TextField>
              <Button
                type="button"
                variant="outlined"
                color="primary"
                onClick={() => setCsv(TEMPLATES[kind] ?? "")}
              >
                Load sample template
              </Button>
            </Box>
          ) : null}

          {step === 1 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                Paste CSV or upload a <code>.csv</code> export. Period columns like{" "}
                <code>date_range</code> (<code>8/1-8/15</code>) or <code>period_start</code> /
                <code>period_end</code> help weekly and monthly reports line up correctly.
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <Button component="label" variant="outlined" color="primary" sx={{ alignSelf: "flex-start" }}>
                  Upload CSV file
                  <input
                    hidden
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
              </Stack>
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
            <Stack spacing={1.25} sx={{ maxWidth: 560 }}>
              <Typography variant="body2" color="text.secondary">
                Confirm and run the import.
              </Typography>
              <Review label="Importing" value={KIND_LABEL[kind] ?? kind} />
              <Review label="Mode" value={mode === "dry-run" ? "Dry run (check only)" : "Commit (save)"} />
              <Review
                label="Data rows"
                value={String(Math.max(0, csv.trim().split(/\r?\n/).filter(Boolean).length - 1))}
              />

              {state.error ? <Alert severity="error">{state.error}</Alert> : null}
              {state.ok ? (
                <Alert severity={state.errors?.length ? "warning" : "success"}>
                  {state.commit ? "Saved" : "Dry run"}: {state.created ?? 0} valid row
                  {(state.created ?? 0) === 1 ? "" : "s"}
                  {state.errors?.length ? ` · ${state.errors.length} issue(s)` : ""}.
                </Alert>
              ) : null}
              {state.sample?.length ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                    Sample rows
                  </Typography>
                  {state.sample.map((line) => (
                    <Typography key={line} variant="body2" sx={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              ) : null}
              {state.errors?.length ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                    Issues (first {Math.min(8, state.errors.length)})
                  </Typography>
                  {state.errors.slice(0, 8).map((line) => (
                    <Typography key={line} variant="body2" color="error" sx={{ fontSize: 12 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              ) : null}
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
              <Button type="submit" variant="contained" color="primary" disabled={!csv.trim() || pending}>
                {pending ? "Working…" : mode === "dry-run" ? "Run dry run" : "Import and save"}
              </Button>
            )}
            {state.ok && !state.commit && !(state.errors?.length) ? (
              <Button type="button" variant="outlined" color="primary" onClick={() => setMode("commit")}>
                Switch to commit mode
              </Button>
            ) : null}
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
