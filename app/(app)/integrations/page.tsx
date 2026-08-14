import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { HistoricalImportWizard } from "@/components/integrations/historical-import-wizard";
import { PageHeader } from "@/components/page-header";
import { SettingsRow, SettingsSection, SettingsValue } from "@/components/settings/settings-ui";
import { disconnectGoogleSheetsAction } from "@/app/actions/integrations";
import { getGoogleSheetsConnection, googleSheetsConfigured } from "@/lib/google-sheets";
import { requireBrokerOps } from "@/lib/tenant";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; google?: string | string[] }>;
}) {
  const ctx = await requireBrokerOps();
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const connectedFlag = (Array.isArray(params.google) ? params.google[0] : params.google) === "connected";
  const configured = googleSheetsConfigured();
  const connection = await getGoogleSheetsConnection(ctx.tenantId);
  const notConfiguredMessage =
    error === "not-configured"
      ? "Google Sheets is not configured on this server yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      : error;

  return (
    <Box sx={{ maxWidth: 920 }}>
      <PageHeader
        title="Integrations"
        description="Connect Google Sheets or upload a spreadsheet to import historical buyer and publisher data."
      />

      {notConfiguredMessage ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {notConfiguredMessage}
        </Alert>
      ) : null}
      {connectedFlag ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          Google Sheets connected. Choose a spreadsheet below to import.
        </Alert>
      ) : null}

      <SettingsSection
        title="Google Sheets"
        description="Connect once, then pick a spreadsheet and label each column. Fundlookup only reads the sheets you choose."
      >
        <SettingsRow
          label="Account"
          hint={
            configured
              ? "Uses Google’s sign-in. You can disconnect at any time."
              : "Ask whoever hosts Fundlookup to set the Google client ID and secret."
          }
          action={
            connection ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Button
                  component="a"
                  href="/api/integrations/google/connect"
                  variant="outlined"
                  color="primary"
                  sx={{ minHeight: 44 }}
                >
                  Reconnect
                </Button>
                <Box component="form" action={disconnectGoogleSheetsAction}>
                  <Button type="submit" variant="outlined" color="primary" sx={{ minHeight: 44 }}>
                    Disconnect
                  </Button>
                </Box>
              </Stack>
            ) : configured ? (
              <Button
                component="a"
                href="/api/integrations/google/connect"
                variant="contained"
                color="primary"
                sx={{ minHeight: 44 }}
              >
                Connect Google Sheets
              </Button>
            ) : (
              <Button variant="contained" color="primary" disabled sx={{ minHeight: 44 }}>
                Connect Google Sheets
              </Button>
            )
          }
        >
          <SettingsValue>
            {connection?.email ? `Connected as ${connection.email}` : connection ? "Connected" : "Not connected"}
          </SettingsValue>
        </SettingsRow>
      </SettingsSection>

      <HistoricalImportWizard googleConnected={Boolean(connection)} />
    </Box>
  );
}
