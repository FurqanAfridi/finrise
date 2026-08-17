import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { Logo } from "@/components/berry/logo";
import { appPublicUrl, marketingSiteUrl } from "@/lib/platform-host";

export type MarketingPage = "privacy" | "terms" | "home" | "deletion";

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

export function MarketingHeader({ current }: { current?: MarketingPage }) {
  const app = appPublicUrl();
  const site = marketingSiteUrl();
  const home = current === "home";
  const featuresHref = home ? "#features" : `${site}/#features`;
  const googleHref = home ? "#google-data" : `${site}/#google-data`;

  return (
    <header className="mk-header">
      <div
        className="mk-wrap"
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={home ? "#main" : site}
          aria-label={`${APP_NAME} home`}
          style={{
            display: "inline-flex",
            minHeight: 44,
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--fr-text)",
          }}
        >
          <Logo compact size={32} />
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>{APP_NAME}</span>
        </Link>
        <nav aria-label="Site" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <Link href={featuresHref} style={navLink}>
            Product
          </Link>
          <Link href={googleHref} style={navLink}>
            Google
          </Link>
          <Link href={`${site}/privacy`} style={navLink} aria-current={current === "privacy" ? "page" : undefined}>
            Privacy
          </Link>
          <Link href={`${app}/login`} style={navLink}>
            Sign in
          </Link>
          <Link href={`${app}/signup`} className="mk-btn mk-btn-primary">
            Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const site = marketingSiteUrl();
  const app = appPublicUrl();
  return (
    <footer style={{ borderTop: "1px solid var(--fr-border)", color: "var(--fr-text-muted)", fontSize: 14 }}>
      <div className="mk-wrap mk-foot">
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 650, color: "var(--fr-text)" }}>{APP_NAME}</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
            A hosted finance ledger for performance-marketing teams. Not a Google product. Not a bank. Privacy and
            terms apply to the signed-in app at app.fundlookup.co.
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 650, color: "var(--fr-text)" }}>Product</p>
          <Link href={`${site}/#features`}>Features</Link>
          <br />
          <Link href={`${site}/#how-it-works`}>How it works</Link>
          <br />
          <Link href={`${app}/signup`}>Create account</Link>
        </div>
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 650, color: "var(--fr-text)" }}>Legal</p>
          <Link href={`${site}/privacy`}>Privacy policy</Link>
          <br />
          <Link href={`${site}/terms`}>Terms of service</Link>
          <br />
          <Link href={`${site}/data-deletion`}>Data deletion</Link>
          <br />
          <Link href={`${site}/#google-data`}>Google user data</Link>
        </div>
        <div>
          <p style={{ margin: "0 0 8px", fontWeight: 650, color: "var(--fr-text)" }}>Support</p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.5 }}>
            Google Sheets and Google Drive are trademarks of Google LLC.
          </p>
        </div>
      </div>
      <div className="mk-wrap" style={{ paddingBottom: 32, fontSize: 12 }}>
        © {new Date().getUTCFullYear()} {APP_NAME}. Operated by Devdabs.
      </div>
    </footer>
  );
}

export function MarketingFrame({
  current,
  children,
}: {
  current?: MarketingPage;
  children: ReactNode;
}) {
  return (
    <div
      className="marketing-frame"
      style={{
        minHeight: "100vh",
        background: "var(--fr-background)",
        color: "var(--fr-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
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
