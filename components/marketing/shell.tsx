import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { Logo } from "@/components/berry/logo";
import { appPublicUrl, marketingSiteUrl } from "@/lib/platform-host";

const navLink: CSSProperties = {
  color: "var(--fr-text)",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 8px",
};

const primaryBtn: CSSProperties = {
  ...navLink,
  background: "var(--fr-primary)",
  color: "var(--fr-primary-foreground)",
  borderRadius: "var(--fr-radius-pill)",
  padding: "0 16px",
};

export function MarketingHeader({ current }: { current?: "privacy" | "terms" | "home" }) {
  const app = appPublicUrl();
  const site = marketingSiteUrl();

  return (
    <header
      style={{
        borderBottom: "1px solid var(--fr-border)",
        background: "var(--fr-surface)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--fr-content-max)",
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link href={site} aria-label={`${APP_NAME} home`} style={{ display: "inline-flex", minHeight: 44, alignItems: "center", gap: 10, textDecoration: "none", color: "var(--fr-text)" }}>
          <Logo compact size={32} />
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{APP_NAME}</span>
        </Link>
        <nav aria-label="Site" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <Link href={`${site}/privacy`} style={navLink} aria-current={current === "privacy" ? "page" : undefined}>
            Privacy
          </Link>
          <Link href={`${site}/terms`} style={navLink} aria-current={current === "terms" ? "page" : undefined}>
            Terms
          </Link>
          <Link href={`${app}/login`} style={navLink}>
            Sign in
          </Link>
          <Link href={`${app}/signup`} style={primaryBtn}>
            Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const site = marketingSiteUrl();
  return (
    <footer
      style={{
        borderTop: "1px solid var(--fr-border)",
        padding: "24px 16px 40px",
        color: "var(--fr-text-muted)",
        fontSize: 12,
      }}
    >
      <div style={{ maxWidth: "var(--fr-content-max)", margin: "0 auto", display: "grid", gap: 8 }}>
        <p style={{ margin: 0 }}>
          {APP_NAME} is a hosted finance application for performance-marketing teams. Privacy and terms apply to the
          signed-in product at app.fundlookup.co. Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p style={{ margin: 0, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href={`${site}/privacy`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            Privacy policy
          </Link>
          <Link href={`${site}/terms`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            Terms of service
          </Link>
        </p>
      </div>
    </footer>
  );
}

export function MarketingFrame({
  current,
  children,
}: {
  current?: "privacy" | "terms" | "home";
  children: ReactNode;
}) {
  return (
    <div className="marketing-frame" style={{ minHeight: "100vh", background: "var(--fr-background)", color: "var(--fr-text)", display: "flex", flexDirection: "column" }}>
      <MarketingHeader current={current} />
      <main id="main" style={{ flex: 1 }}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

export function LegalArticle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "40px 16px 64px",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>{title}</h1>
      {children}
    </article>
  );
}

export const legalP: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--fr-text)",
  margin: "0 0 16px",
};

export const legalH2: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: "28px 0 8px",
};
