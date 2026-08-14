import type { CSSProperties } from "react";
import Link from "next/link";
import { APP_NAME, APP_PURPOSE, APP_TAGLINE, SUPPORT_EMAIL } from "@/lib/brand";
import { MarketingFrame } from "@/components/marketing/shell";
import { appPublicUrl, marketingSiteUrl } from "@/lib/platform-host";

const card: CSSProperties = {
  background: "var(--fr-surface)",
  border: "1px solid var(--fr-border)",
  borderRadius: "var(--fr-radius-md)",
  padding: 20,
  boxShadow: "var(--fr-shadow)",
};

const bodyText: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  color: "var(--fr-text)",
  margin: "0 0 16px",
  maxWidth: 720,
};

export function MarketingLander() {
  const app = appPublicUrl();
  const site = marketingSiteUrl();

  return (
    <MarketingFrame current="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: APP_NAME,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: site,
            description: APP_PURPOSE,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />

      <section
        style={{
          maxWidth: "var(--fr-content-max)",
          margin: "0 auto",
          padding: "48px 16px 16px",
        }}
      >
        <p style={{ color: "var(--fr-text-muted)", fontSize: 12, margin: "0 0 12px" }}>
          Application name: {APP_NAME}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 12px", maxWidth: 720 }}>{APP_NAME}</h1>
        <p style={bodyText}>{APP_TAGLINE}</p>
        <p style={bodyText}>{APP_PURPOSE}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <Link
            href={`${app}/signup`}
            style={{
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              padding: "0 20px",
              borderRadius: "var(--fr-radius-pill)",
              background: "var(--fr-primary)",
              color: "var(--fr-primary-foreground)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Create a {APP_NAME} account
          </Link>
          <Link
            href={`${app}/login`}
            style={{
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              padding: "0 20px",
              borderRadius: "var(--fr-radius-pill)",
              border: "1px solid var(--fr-border)",
              background: "var(--fr-surface)",
              color: "var(--fr-text)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Sign in to {APP_NAME}
          </Link>
        </div>
        <p style={{ ...bodyText, color: "var(--fr-text-muted)", marginBottom: 0 }}>
          Signed-in product: app.fundlookup.co. Privacy policy and terms are on this site.
        </p>
      </section>

      <section
        aria-labelledby="purpose-heading"
        style={{ maxWidth: "var(--fr-content-max)", margin: "0 auto", padding: "8px 16px 32px" }}
      >
        <h2 id="purpose-heading" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 12px" }}>
          Purpose of the {APP_NAME} application
        </h2>
        <p style={bodyText}>
          {APP_NAME} exists so brokers, accountants, publishers, and buyers can keep campaign money in one ledger
          instead of scattered spreadsheets. In {APP_NAME} you can:
        </p>
        <ul style={{ ...bodyText, paddingLeft: 20 }}>
          <li>Issue and track buyer invoices, including paid, unpaid, and overdue states.</li>
          <li>Record publisher payables and what has been paid out.</li>
          <li>Log expenses and see monthly profit after publisher payouts and costs.</li>
          <li>
            Optionally connect a Google account to import historical buyer and publisher rows from a Google Sheet you
            pick. {APP_NAME} requests read-only access to spreadsheets, Drive file names, and your Google email for that
            import. You can disconnect in Integrations at any time.
          </li>
        </ul>
        <p style={bodyText}>
          {APP_NAME} is not a bank or payment processor. It does not sell Google user data or use it for advertising.
          Details:{" "}
          <Link href={`${site}/privacy`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            Privacy policy
          </Link>
          {" and "}
          <Link href={`${site}/terms`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            Terms of service
          </Link>
          . Support:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section
        aria-labelledby="features-heading"
        style={{ maxWidth: "var(--fr-content-max)", margin: "0 auto", padding: "8px 16px 48px" }}
      >
        <h2 id="features-heading" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>
          What {APP_NAME} includes
        </h2>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          }}
        >
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Invoices and payouts</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--fr-text-muted)" }}>
              Send buyer invoices, track publisher payables, and see overdue items in one place.
            </p>
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Profit you can explain</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--fr-text-muted)" }}>
              Monthly overviews show revenue after publisher payouts and expenses, with variances in plain language.
            </p>
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Google Sheets import</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--fr-text-muted)" }}>
              Optional Google sign-in lets you pick a spreadsheet and map columns. {APP_NAME} only reads the sheet you
              choose.
            </p>
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}
