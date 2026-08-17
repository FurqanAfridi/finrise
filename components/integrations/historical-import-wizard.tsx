"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  importGoogleSheetAction,
  importUploadedWorkbookAction,
  listGoogleSheetTabsAction,
  listGoogleSpreadsheetsAction,
  previewGoogleSheetAction,
  previewUploadedWorkbookAction,
} from "@/app/actions/integrations";
import type { ImportRunResult } from "@/lib/import/historical";
import {
  IMPORT_FIELDS,
  IMPORT_KIND_LABEL,
  assessSheetCompatibility,
  guessColumnMapping,
  mappingIsValid,
  type ImportKind,
} from "@/lib/import/table";
import { WizardSteps } from "@/components/shared/wizard-steps";
import { StatusPill } from "@/components/shared/status-pill";
import { SettingsSection } from "@/components/settings/settings-ui";
import { nativeSelectSlotProps } from "@/components/forms";

const STEPS = ["What to import", "Choose data", "Match columns", "Confirm"];

export function HistoricalImportWizard({
  googleConnected,
}: {
  googleConnected: boolean;
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ImportKind>("buyers");
  const [mode, setMode] = useState("dry-run");
  const [source, setSource] = useState<"google" | "file">(googleConnected ? "google" : "file");
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [tabs, setTabs] = useState<string[]>([]);
  const [sheetTitle, setSheetTitle] = useState("");
  const [upload, setUpload] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingPreview, startPreview] = useTransition();
  const [googleState, googleAction, googlePending] = useActionState(importGoogleSheetAction, {} as ImportRunResult);
  const [fileState, fileAction, filePending] = useActionState(importUploadedWorkbookAction, {} as ImportRunResult);
  const state = source === "google" ? googleState : fileState;
  const pending = source === "google" ? googlePending : filePending;

  const fields = IMPORT_FIELDS[kind];
  const mappingJson = JSON.stringify(mapping);
  const canMap = mappingIsValid(kind, mapping) && headers.length > 0;
  const compatibility = useMemo(
    () => (headers.length ? assessSheetCompatibility(kind, headers, mapping) : null),
    [kind, headers, mapping],
  );

  useEffect(() => {
    if (!googleConnected || source !== "google") return;
    let cancelled = false;
    listGoogleSpreadsheetsAction().then((result) => {
      if (cancelled) return;
      if (result.error) setLoadError(result.error);
      setFiles(result.files ?? []);
      setFilesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [googleConnected, source]);

  useEffect(() => {
    setMapping(guessColumnMapping(kind, headers));
  }, [kind, headers]);

  const sampleHeaders = useMemo(
    () => headers.map((header, index) => header || `Column ${index + 1}`),
    [headers],
  );

  function applyPreview(next: {
    error?: string;
    sheets?: string[];
    sheet?: string;
    headers?: string[];
    preview?: string[][];
    rowCount?: number;
  }) {
    if (next.error) {
      setLoadError(next.error);
      return;
    }
    setLoadError(null);
    if (next.sheets?.length) setTabs(next.sheets);
    if (next.sheet) setSheetTitle(next.sheet);
    setHeaders(next.headers ?? []);
    setPreview(next.preview ?? []);
    setRowCount(next.rowCount ?? 0);
  }

  function onSpreadsheet(id: string) {
    setSpreadsheetId(id);
    setSheetTitle("");
    setHeaders([]);
    setPreview([]);
    if (!id) return;
    startPreview(async () => {
      const listed = await listGoogleSheetTabsAction(id);
      if (listed.error) {
        setLoadError(listed.error);
        return;
      }
      const nextTabs = listed.tabs ?? [];
      setTabs(nextTabs);
      const first = nextTabs[0] ?? "";
      setSheetTitle(first);
      if (!first) return;
      applyPreview(await previewGoogleSheetAction(id, first));
    });
  }

  function onTab(title: string) {
    setSheetTitle(title);
    if (!spreadsheetId || !title) return;
    startPreview(async () => {
      applyPreview(await previewGoogleSheetAction(spreadsheetId, title));
    });
  }

  function onFile(file: File | null) {
    setUpload(file);
    setHeaders([]);
    setPreview([]);
    if (!file) return;
    const data = new FormData();
    data.set("file", file);
    startPreview(async () => {
      applyPreview(await previewUploadedWorkbookAction(data));
    });
  }

  function onFileSheet(name: string) {
    if (!upload) return;
    setSheetTitle(name);
    const data = new FormData();
    data.set("file", upload);
    data.set("sheet", name);
    startPreview(async () => {
      applyPreview(await previewUploadedWorkbookAction(data));
    });
  }

  return (
    <SettingsSection
      title="Import historical data"
      description="Bring in past buyer invoices or publisher payables from Google Sheets, Excel, or CSV. Download the sample workbook to see compatible columns, then match each field."
    >
      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, width: "100%", minWidth: 0 }}>
        <WizardSteps steps={STEPS} active={step} />

        {step === 0 ? (
          <Box
            sx={{
              display: "grid",
              gap: { xs: 2, md: 3 },
              gridTemplateColumns: { xs: "1fr", lg: "minmax(280px, 420px) minmax(0, 1fr)" },
              alignItems: "start",
            }}
          >
            <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="What to import"
                value={kind}
                onChange={(event) => setKind(event.target.value as ImportKind)}
                helperText="Contacts are created automatically from names in the sheet."
                slotProps={nativeSelectSlotProps}
              >
                <option value="buyers">Buyer invoices (historical)</option>
                <option value="publishers">Publisher payables (historical)</option>
                <option value="expenses">Expenses (historical)</option>
              </TextField>
              <TextField
                select
                size="small"
                fullWidth
                label="Source"
                value={source}
                onChange={(event) => setSource(event.target.value as "google" | "file")}
                helperText={
                  source === "google"
                    ? googleConnected
                      ? "Pick a Google spreadsheet you can view."
                      : "Connect Google Sheets above first."
                    : "CSV and Excel (.xlsx) use the same column matching."
                }
                slotProps={nativeSelectSlotProps}
              >
                <option value="google">Google Sheets</option>
                <option value="file">CSV or Excel file</option>
              </TextField>
              <TextField
                select
                size="small"
                fullWidth
                label="Mode"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                helperText={
                  mode === "dry-run"
                    ? "Checks rows and shows a preview without saving."
                    : "Writes rows to the ledger. Use only after a clean dry run."
                }
                slotProps={nativeSelectSlotProps}
              >
                <option value="dry-run">Dry run (check only)</option>
                <option value="commit">Commit (save)</option>
              </TextField>
              <Button
                component="a"
                href="/api/integrations/sample-workbook"
                download="FundLookup-import-sample.xlsx"
                variant="outlined"
                color="primary"
                sx={{ minHeight: 44, alignSelf: "start" }}
              >
                Download sample Excel
              </Button>
            </Box>
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: { xs: 2, md: 2.5 },
                bgcolor: "var(--fr-surface-muted)",
                minWidth: 0,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Compatible sheets
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                The sample has three tabs: buyer invoices, publisher payables, and expenses. Keep the header row so
                FundLookup can match columns automatically. Extra columns are ignored.
              </Typography>
            </Box>
          </Box>
        ) : null}

        {step === 1 ? (
          <Box
            sx={{
              display: "grid",
              gap: { xs: 2, md: 3 },
              gridTemplateColumns: { xs: "1fr", lg: "minmax(260px, 380px) minmax(0, 1fr)" },
              alignItems: "start",
            }}
          >
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              {source === "google" ? (
                <>
                  {!googleConnected ? (
                    <Alert severity="info">
                      Connect Google Sheets from Integrations first, then return here or import from that page.
                    </Alert>
                  ) : (
                    <>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        label="Spreadsheet"
                        value={spreadsheetId}
                        onChange={(event) => onSpreadsheet(event.target.value)}
                        slotProps={nativeSelectSlotProps}
                      >
                        <option value="">Select a spreadsheet</option>
                        {files.map((file) => (
                          <option key={file.id} value={file.id}>
                            {file.name}
                          </option>
                        ))}
                      </TextField>
                      {filesLoaded && files.length === 0 && !loadError ? (
                        <Typography variant="body2" color="text.secondary">
                          No Google Sheets were found on this account. Create a sheet, then refresh this page.
                        </Typography>
                      ) : null}
                      {tabs.length > 0 ? (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          label="Sheet tab"
                          value={sheetTitle}
                          onChange={(event) => onTab(event.target.value)}
                          slotProps={nativeSelectSlotProps}
                        >
                          {tabs.map((tab) => (
                            <option key={tab} value={tab}>
                              {tab}
                            </option>
                          ))}
                        </TextField>
                      ) : null}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button component="label" variant="outlined" color="primary" sx={{ alignSelf: "flex-start", minHeight: 44 }}>
                    {upload ? "Change file" : "Upload CSV or Excel"}
                    <input
                      hidden
                      type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(event) => onFile(event.target.files?.[0] ?? null)}
                    />
                  </Button>
                  {upload ? (
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                      {upload.name}
                    </Typography>
                  ) : null}
                  {tabs.length > 1 ? (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Sheet tab"
                      value={sheetTitle}
                      onChange={(event) => onFileSheet(event.target.value)}
                      slotProps={nativeSelectSlotProps}
                    >
                      {tabs.map((tab) => (
                        <option key={tab} value={tab}>
                          {tab}
                        </option>
                      ))}
                    </TextField>
                  ) : null}
                </>
              )}
              {pendingPreview ? (
                <Typography variant="body2" color="text.secondary">
                  Reading columns…
                </Typography>
              ) : null}
              {loadError ? <Alert severity="error">{loadError}</Alert> : null}
              {headers.length ? (
                <Typography variant="body2" color="text.secondary">
                  {rowCount} data row{rowCount === 1 ? "" : "s"} · {headers.length} columns
                </Typography>
              ) : null}
              <Button
                component="a"
                href="/api/integrations/sample-workbook"
                download="FundLookup-import-sample.xlsx"
                variant="text"
                color="primary"
                sx={{ minHeight: 44, alignSelf: "start" }}
              >
                Download sample Excel
              </Button>
            </Stack>
            {compatibility ? (
              <CompatibilityPanel report={compatibility} sampleRow={preview[0]} />
            ) : (
              <Box
                sx={{
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2.5,
                  minHeight: { xs: 120, lg: 220 },
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 360 }}>
                  Pick a sheet tab to see how each column matches a FundLookup field.
                </Typography>
              </Box>
            )}
          </Box>
        ) : null}

        {step === 2 ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Label each FundLookup field with the matching column from your sheet. Required fields must be mapped.
              Compatibility updates as you change a match.
            </Typography>
            {compatibility ? <CompatibilityPanel report={compatibility} sampleRow={preview[0]} /> : null}
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" },
              }}
            >
              {fields.map((field) => (
                <TextField
                  key={field.key}
                  select
                  size="small"
                  fullWidth
                  required={field.required}
                  label={field.required ? `${field.label} (required)` : field.label}
                  value={mapping[field.key] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMapping((current) => {
                      const next = { ...current };
                      if (value === "") delete next[field.key];
                      else next[field.key] = Number(value);
                      return next;
                    });
                  }}
                  helperText={field.hint}
                  slotProps={nativeSelectSlotProps}
                >
                  <option value="">{field.required ? "Select a column" : "Skip this field"}</option>
                  {sampleHeaders.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </TextField>
              ))}
            </Box>
            {preview.length ? (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                  First rows
                </Typography>
                {preview.slice(0, 3).map((row, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontSize: 12,
                      mb: 0.5,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {row.filter(Boolean).slice(0, 6).join(" · ") || "Empty row"}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {step === 3 ? (
          <Stack spacing={1.25} sx={{ maxWidth: { xs: "100%", md: 640 }, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              Confirm and run the import.
            </Typography>
            <Review label="Importing" value={IMPORT_KIND_LABEL[kind]} />
            <Review label="Source" value={source === "google" ? "Google Sheets" : upload?.name || "File"} />
            <Review label="Sheet" value={sheetTitle || "None"} />
            <Review label="Mode" value={mode === "dry-run" ? "Dry run (check only)" : "Commit (save)"} />
            <Review label="Data rows" value={String(rowCount)} />

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

            {source === "google" ? (
              <Box component="form" action={googleAction}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="mode" value={mode} />
                <input type="hidden" name="spreadsheetId" value={spreadsheetId} />
                <input type="hidden" name="sheetTitle" value={sheetTitle} />
                <input type="hidden" name="mapping" value={mappingJson} />
                <Button type="submit" variant="contained" color="primary" disabled={pending || !canMap} sx={{ minHeight: 44 }}>
                  {pending ? "Working…" : mode === "dry-run" ? "Run dry run" : "Import and save"}
                </Button>
              </Box>
            ) : (
              <Box
                component="form"
                action={(formData) => {
                  if (upload) formData.set("file", upload);
                  fileAction(formData);
                }}
              >
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="mode" value={mode} />
                <input type="hidden" name="sheet" value={sheetTitle} />
                <input type="hidden" name="mapping" value={mappingJson} />
                <Button type="submit" variant="contained" color="primary" disabled={pending || !canMap || !upload} sx={{ minHeight: 44 }}>
                  {pending ? "Working…" : mode === "dry-run" ? "Run dry run" : "Import and save"}
                </Button>
              </Box>
            )}
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
          {step > 0 ? (
            <Button type="button" variant="outlined" color="primary" onClick={() => setStep((s) => s - 1)} sx={{ minHeight: 44 }}>
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="contained"
              color="primary"
              disabled={
                (step === 0 && source === "google" && !googleConnected) ||
                (step === 1 && headers.length === 0) ||
                (step === 2 && !canMap)
              }
              onClick={() => setStep((s) => s + 1)}
              sx={{ minHeight: 44 }}
            >
              Continue
            </Button>
          ) : null}
          {state.ok && !state.commit && !(state.errors?.length) ? (
            <Button type="button" variant="outlined" color="primary" onClick={() => setMode("commit")} sx={{ minHeight: 44 }}>
              Switch to commit mode
            </Button>
          ) : null}
        </Stack>
      </Box>
    </SettingsSection>
  );
}

function CompatibilityPanel({
  report,
  sampleRow,
}: {
  report: ReturnType<typeof assessSheetCompatibility>;
  sampleRow?: string[];
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: { xs: 1.5, md: 2 },
        bgcolor: "background.paper",
        minWidth: 0,
        width: "100%",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        <StatusPill kind={report.ready ? "compatible" : "needs_mapping"} />
        <Typography variant="body2" sx={{ fontWeight: 600, flex: "1 1 180px", minWidth: 0 }}>
          {report.ready
            ? "This sheet matches the required FundLookup fields."
            : "Some required fields are missing. Map them on the next step, or use the sample Excel."}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Required {report.matchedRequired} of {report.requiredTotal} · Optional {report.matchedOptional} of{" "}
        {report.optionalTotal}
        {report.extraColumns.length
          ? ` · ${report.extraColumns.length} unused column${report.extraColumns.length === 1 ? "" : "s"}`
          : ""}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        {report.fields.map((row) => {
          const sample =
            row.columnIndex != null && sampleRow?.[row.columnIndex]
              ? String(sampleRow[row.columnIndex]).trim()
              : "";
          return (
            <Stack
              key={row.key}
              direction="row"
              spacing={1}
              sx={{
                justifyContent: "space-between",
                gap: 1,
                alignItems: "flex-start",
                minHeight: 44,
                minWidth: 0,
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: row.required ? "var(--fr-primary-muted)" : "var(--fr-surface-muted)",
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.label}
                  {row.required ? " · required" : ""}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.5, overflowWrap: "anywhere" }}
                >
                  {row.matched
                    ? `Sheet column: ${row.column}${sample ? ` · sample: ${sample}` : ""}`
                    : "No matching column yet"}
                </Typography>
              </Box>
              <StatusPill kind={row.matched ? "matched" : "not_in_sheet"} />
            </Stack>
          );
        })}
      </Box>
      {report.extraColumns.length ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, lineHeight: 1.5 }}>
          Unused in FundLookup: {report.extraColumns.join(", ")}
        </Typography>
      ) : null}
    </Box>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, py: 0.75, minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere", minWidth: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}
