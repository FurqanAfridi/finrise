import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { bankPaymentLines, type CompanyBranding } from "@/lib/company-branding";
import { displayDate } from "@/lib/dates";
import { formatNetTerms } from "@/lib/finance/invoice";
import { invoiceOnAccent, normalizeInvoiceColor } from "@/lib/invoice-theme";
import { money } from "@/lib/money";
import { RATE_TYPE_LABEL } from "@/lib/status";
import { num } from "@/lib/utils";

type InvoiceDoc = {
  invoiceNumber: string | null;
  periodLabel: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  leadCount: unknown;
  rateType: keyof typeof RATE_TYPE_LABEL;
  rate: unknown;
  revenue: unknown;
  receivable: unknown;
  terms: string | null;
  paymentTermsDays: number | null;
  comments: string | null;
  buyer: {
    name: string;
    email: string | null;
    address: string | null;
    contactName: string | null;
  };
  vertical: { name: string } | null;
};

export function BuyerInvoiceDocument({
  invoice,
  branding,
  currency,
}: {
  invoice: InvoiceDoc;
  branding: CompanyBranding;
  currency: string;
}) {
  const amount = num(invoice.receivable) || num(invoice.revenue);
  const qty = invoice.leadCount == null ? null : num(invoice.leadCount);
  const rate = invoice.rate == null ? null : num(invoice.rate);
  const description =
    invoice.comments ||
    [invoice.vertical?.name, invoice.periodLabel].filter(Boolean).join(" · ") ||
    "Advertising / lead generation";
  const issueDate = invoice.periodEnd ?? invoice.periodStart ?? invoice.createdAt;
  const accent = normalizeInvoiceColor(branding.invoiceColor);
  const onAccent = invoiceOnAccent(accent);
  const bankLines = bankPaymentLines(branding);
  const terms = formatNetTerms(invoice.paymentTermsDays);

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        color: "#111827",
        p: { xs: 3, md: 5 },
        maxWidth: 860,
        mx: "auto",
        minHeight: "100%",
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          {branding.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoSrc} alt={branding.legalName} style={{ maxHeight: 72, maxWidth: 180, objectFit: "contain" }} />
          ) : null}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>{branding.legalName}</Typography>
            {branding.invoiceRepresentativeName ? (
              <Typography variant="body2" sx={{ color: "#4b5563", mt: 0.25 }}>
                {branding.invoiceRepresentativeName}
              </Typography>
            ) : null}
            {branding.address ? (
              <Typography variant="body2" sx={{ whiteSpace: "pre-line", color: "#4b5563", mt: 0.5 }}>
                {[branding.address, branding.zipCode, branding.countryLabel].filter(Boolean).join(", ")}
              </Typography>
            ) : null}
            <Typography variant="body2" sx={{ color: "#4b5563" }}>
              {[branding.contactEmail, branding.contactPhone, branding.website].filter(Boolean).join(" · ")}
            </Typography>
            {branding.taxId ? (
              <Typography variant="body2" sx={{ color: "#4b5563" }}>
                Tax ID: {branding.taxId}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontWeight: 800, letterSpacing: 2, color: accent, fontSize: 28 }}>INVOICE</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {invoice.invoiceNumber ?? "Draft"}
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} sx={{ mt: 5, justifyContent: "space-between", gap: 3 }}>
        <Box>
          <Typography variant="caption" sx={{ color: "#6b7280", letterSpacing: 1, fontWeight: 700 }}>
            BILL TO
          </Typography>
          <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{invoice.buyer.name}</Typography>
          {invoice.buyer.contactName ? <Typography variant="body2">{invoice.buyer.contactName}</Typography> : null}
          {invoice.buyer.address ? (
            <Typography variant="body2" sx={{ whiteSpace: "pre-line", color: "#4b5563" }}>
              {invoice.buyer.address}
            </Typography>
          ) : null}
          {invoice.buyer.email ? (
            <Typography variant="body2" sx={{ color: "#4b5563" }}>
              {invoice.buyer.email}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ minWidth: 220 }}>
          <Row label="Invoice date" value={displayDate(issueDate)} />
          <Row label="Due date" value={displayDate(invoice.dueDate)} />
          {invoice.periodLabel ? <Row label="Period" value={invoice.periodLabel} /> : null}
          <Row label="Terms" value={terms} />
        </Box>
      </Stack>

      <Box
        component="table"
        sx={{
          width: "100%",
          mt: 4,
          borderCollapse: "collapse",
          "& th": {
            textAlign: "left",
            bgcolor: accent,
            color: onAccent,
            fontSize: 12,
            letterSpacing: 0.6,
            p: 1.25,
          },
          "& td": { p: 1.25, borderBottom: "1px solid #e5e7eb", fontSize: 14 },
          "& td.num, & th.num": { textAlign: "right" },
        }}
      >
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Typography sx={{ fontWeight: 600 }}>{description}</Typography>
              <Typography variant="caption" sx={{ color: "#6b7280" }}>
                {[RATE_TYPE_LABEL[invoice.rateType], invoice.vertical?.name].filter(Boolean).join(" · ")}
              </Typography>
            </td>
            <td className="num">{qty == null ? "n/a" : qty.toLocaleString()}</td>
            <td className="num">{rate == null ? "n/a" : money(rate, currency)}</td>
            <td className="num">{money(amount, currency)}</td>
          </tr>
        </tbody>
      </Box>

      <Stack sx={{ mt: 2, alignItems: "flex-end" }}>
        <Box sx={{ minWidth: 260 }}>
          <Row label="Subtotal" value={money(amount, currency)} />
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 800, color: accent }}>Amount due</Typography>
            <Typography sx={{ fontWeight: 800, color: accent }}>{money(amount, currency)}</Typography>
          </Stack>
        </Box>
      </Stack>

      {bankLines.length > 0 || branding.paymentNotes ? (
        <Box sx={{ mt: 5, p: 2, bgcolor: "#f8fafc", borderRadius: 1, borderLeft: `4px solid ${accent}` }}>
          <Typography variant="caption" sx={{ color: "#6b7280", letterSpacing: 1, fontWeight: 700 }}>
            PAYMENT DETAILS
          </Typography>
          {bankLines.map((line) => (
            <Stack key={line.label} direction="row" sx={{ justifyContent: "space-between", gap: 2, mt: 0.75 }}>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                {line.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "pre-line", textAlign: "right" }}>
                {line.value}
              </Typography>
            </Stack>
          ))}
          {branding.paymentNotes ? (
            <Typography variant="body2" sx={{ mt: 1.5, color: "#4b5563", whiteSpace: "pre-line" }}>
              {branding.paymentNotes}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {branding.termsAndConditions ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="caption" sx={{ color: "#6b7280", letterSpacing: 1, fontWeight: 700 }}>
            TERMS AND CONDITIONS
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, color: "#4b5563", whiteSpace: "pre-line" }}>
            {branding.termsAndConditions}
          </Typography>
        </Box>
      ) : null}

      <Typography variant="caption" sx={{ display: "block", mt: 6, color: "#9ca3af", textAlign: "center" }}>
        Thank you for your business.
      </Typography>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 3, py: 0.25 }}>
      <Typography variant="body2" sx={{ color: "#6b7280" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}
