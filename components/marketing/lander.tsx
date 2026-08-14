import type { CSSProperties } from "react";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { MarketingFrame } from "@/components/marketing/shell";
import { appPublicUrl } from "@/lib/platform-host";

const card: CSSProperties = {
  background: "var(--fr-surface)",
  border: "1px solid var(--fr-border)",
  borderRadius: "var(--fr-radius-md)",
  padding: 20,
  boxShadow: "var(--fr-shadow)",
};

export function MarketingLander() {
  const app = appPublicUrl();

  return (
    <MarketingFrame current="home">
      <section
        style={{
          maxWidth: "var(--fr-content-max)",
          margin: "0 auto",
          padding: "48px 16px 24px",
        }}
      >
        <p style={{ color: "var(--fr-text-muted)", fontSize: 12, margin: "0 0 12px", letterSpacing: 0.02 }}>
          Finance for performance marketing
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 12px", maxWidth: 640 }}>{APP_NAME}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--fr-text)", maxWidth: 640, margin: "0 0 24px" }}>
          {APP_TAGLINE} Keep buyer invoices, publisher payouts, expenses, and profit in one place, with a clear record
          of what was billed and what was paid.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
            Create account
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
            Sign in
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        style={{ maxWidth: "var(--fr-content-max)", margin: "0 auto", padding: "8px 16px 48px" }}
      >
        <h2 id="features-heading" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>
          What you can do
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
              Send buyer invoices, track publisher payables, and see overdue items without a spreadsheet maze.
            </p>
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Profit you can explain</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--fr-text-muted)" }}>
              Monthly overviews show revenue after publisher payouts and expenses, with variances in plain language.
            </p>
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Import from Google Sheets</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--fr-text-muted)" }}>
              Optional Google sign-in lets you pick a spreadsheet and map columns. {APP_NAME} only reads the sheet you
              choose, and you can disconnect at any time.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="google-heading"
        style={{ maxWidth: "var(--fr-content-max)", margin: "0 auto", padding: "0 16px 64px" }}
      >
        <div style={{ ...card, background: "var(--fr-primary-muted)", borderColor: "transparent" }}>
          <h2 id="google-heading" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
            Google user data
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>
            If you connect Google Sheets, we request read-only access to spreadsheets, file names in Drive, and your
            Google email so we can import historical invoices you select. We do not sell this data, use it for ads, or
            share it except as described in the privacy policy.
          </p>
          <Link href="/privacy" style={{ color: "var(--fr-primary)", fontWeight: 600, fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
            Read how Google data is used
          </Link>
        </div>
      </section>
    </MarketingFrame>
  );
}
