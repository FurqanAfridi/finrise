import type { ReactNode } from "react";
import Link from "next/link";
import { APP_NAME, APP_PURPOSE, SUPPORT_EMAIL } from "@/lib/brand";
import { MarketingFrame } from "@/components/marketing/shell";
import { GoogleScopes, HowItWorks, ProductShowcase } from "@/components/marketing/lander-interactive";
import { appPublicUrl, marketingSiteUrl } from "@/lib/platform-host";

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
            "@graph": [
              {
                "@type": "SoftwareApplication",
                name: APP_NAME,
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: site,
                description: APP_PURPOSE,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                publisher: { "@type": "Organization", name: "Devdabs", url: "https://devdabs.com" },
              },
              {
                "@type": "WebSite",
                name: APP_NAME,
                url: site,
                publisher: { "@type": "Organization", name: APP_NAME, email: SUPPORT_EMAIL, url: site },
              },
            ],
          }),
        }}
      />

      <div className="mk-hero-band">
        <section className="mk-wrap mk-hero" aria-labelledby="hero-heading">
          <div>
            <p className="mk-badge">Finance for media buyers</p>
            <h1 id="hero-heading" className="mk-h1">
              See the money. Send the invoice. Close the month.
            </h1>
            <p className="mk-lead">
              {APP_NAME} keeps buyer invoices, publisher payouts, and daily figures in one calm ledger, so you are not
              chasing five spreadsheets at month end.
            </p>
            <div className="mk-hero-actions">
              <Link href={`${app}/signup`} className="mk-btn mk-btn-primary">
                Create a free account
              </Link>
              <Link href="#features" className="mk-btn mk-btn-ghost">
                See how it works
              </Link>
            </div>
            <div className="mk-pills" aria-label="Product notes">
              <span>Not a bank</span>
              <span>Not a Google product</span>
              <span>Read-only Sheets import</span>
            </div>
          </div>
          <ProductShowcase />
        </section>
      </div>

      <section id="features" className="mk-section" aria-labelledby="features-heading">
        <div className="mk-wrap">
          <div className="mk-section-head">
            <p className="mk-badge">The product</p>
            <h2 id="features-heading" className="mk-h2">
              Everything you already track, without the tab chaos
            </h2>
            <p className="mk-lead">Tap a card. Each one is a real screen in {APP_NAME}, not a slogan.</p>
          </div>
          <div className="mk-grid-3">
            <Feature
              title="Invoices that get paid"
              body="Send what buyers owe. Unpaid, overdue, draft, and paid sit in the same list, with a label and icon every time."
              icon="invoices"
              tone="success"
            />
            <Feature
              title="Payables you can trust"
              body="See what you owe publishers, who still needs approval, and what already left the account."
              icon="payables"
              tone="warning"
            />
            <Feature
              title="Daily figures, by date"
              body="Log calls and leads for a buyer or publisher. Missed yesterday? Add that date. Filter by vertical or invoice status."
              icon="figures"
              tone="info"
            />
            <Feature
              title="Drafts when NET is up"
              body="When a cycle ends, a draft invoice or payable is ready. You review it. Nothing sends itself."
              icon="drafts"
              tone="primary"
            />
            <Feature
              title="Profit you can explain"
              body="Money in, payouts, expenses, profit. Variances in a sentence, not a mystery column."
              icon="profit"
              tone="success"
            />
            <Feature
              title="Bring an old Google Sheet"
              body="Optional. Connect Google, pick one spreadsheet, map columns, import. Disconnect whenever you want."
              icon="sheets"
              tone="info"
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mk-section mk-section-tint" aria-labelledby="how-heading">
        <div className="mk-wrap">
          <div className="mk-section-head">
            <p className="mk-badge">How it works</p>
            <h2 id="how-heading" className="mk-h2">
              Four clicks from empty books to a month you can close
            </h2>
            <p className="mk-lead">Choose a step. Your company data stays in your {APP_NAME} workspace.</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      <section className="mk-section" aria-labelledby="who-heading">
        <div className="mk-wrap">
          <div className="mk-section-head">
            <p className="mk-badge">Who it is for</p>
            <h2 id="who-heading" className="mk-h2">
              One company. Three views. No extra noise.
            </h2>
          </div>
          <div className="mk-grid-3">
            <article className="mk-role tone-success">
              <h3 className="mk-h3">Brokers and accountants</h3>
              <p>Collect, pay, overdue, and drafts on one dashboard. The rest of the team only sees what they need.</p>
            </article>
            <article className="mk-role tone-warning">
              <h3 className="mk-h3">Publishers</h3>
              <p>Signed-in publishers see their payables and payment history for that company. Nothing else.</p>
            </article>
            <article className="mk-role tone-info">
              <h3 className="mk-h3">Buyers</h3>
              <p>Signed-in buyers see invoices to pay on their account, not the whole ledger.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="google-data" className="mk-section mk-section-tint" aria-labelledby="google-heading">
        <div className="mk-wrap">
          <div className="mk-section-head">
            <p className="mk-badge">Google Sheets</p>
            <h2 id="google-heading" className="mk-h2">
              Import history. Keep Google in its place.
            </h2>
            <p className="mk-lead">
              Connecting Google is optional. {APP_NAME} is not a Google product. Use of Google API data follows the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy">Limited Use</a> rules: no
              ads, no selling, read-only, only the file you pick.
            </p>
          </div>
          <GoogleScopes />
          <p className="mk-legal-line">
            We do not scan Drive. We do not write to Sheets. Disconnect in Integrations, or revoke access in your{" "}
            <a href="https://myaccount.google.com/permissions">Google Account</a>.{" "}
            <Link href={`${site}/privacy`}>Privacy</Link>
            {" · "}
            <Link href={`${site}/data-deletion`}>Delete data</Link>
            {" · "}
            <Link href={`${site}/terms`}>Terms</Link>
            {" · "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </section>

      <section id="faq" className="mk-section" aria-labelledby="faq-heading">
        <div className="mk-wrap mk-faq-wrap">
          <div className="mk-section-head">
            <p className="mk-badge">FAQ</p>
            <h2 id="faq-heading" className="mk-h2">
              Straight answers
            </h2>
          </div>
          <div className="mk-faq">
            <Faq q={`Is ${APP_NAME} made by Google?`}>
              No. {APP_NAME} is operated by Devdabs. Google Sheets and Google Drive belong to Google. Connecting them
              is optional.
            </Faq>
            <Faq q="Why Google Drive at all?">
              Only to list spreadsheet names and ids. We ask for drive.metadata.readonly, not full Drive, and we do not
              open files you never select.
            </Faq>
            <Faq q="What happens to my Sheet?">
              We read the tab you map, then copy those rows into your ledger. The file stays in Google. We never write
              back.
            </Faq>
            <Faq q="Can I remove Google later?">
              Yes. Integrations, then Disconnect. That drops the token we stored. Imported rows stay until you delete
              them. Full wipe: the{" "}
              <Link href={`${site}/data-deletion`}>data deletion</Link> page or {SUPPORT_EMAIL}.
            </Faq>
            <Faq q="Does this move money?">
              No. It records invoices and payouts you already handle at your bank.
            </Faq>
          </div>
        </div>
      </section>

      <section className="mk-section mk-section-bottom" aria-labelledby="cta-heading">
        <div className="mk-wrap">
          <div className="mk-cta">
            <div>
              <h2 id="cta-heading" className="mk-h2" style={{ color: "inherit" }}>
                Put the ledger in one place
              </h2>
              <p>
                Create a company on app.fundlookup.co. Read privacy and terms before you connect Google.
              </p>
            </div>
            <div className="mk-hero-actions">
              <Link href={`${app}/signup`} className="mk-btn mk-btn-on-green">
                Create account
              </Link>
              <Link href={`${site}/privacy`} className="mk-btn mk-btn-on-green-ghost">
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}

function Feature({
  title,
  body,
  icon,
  tone,
}: {
  title: string;
  body: string;
  icon: "invoices" | "payables" | "figures" | "drafts" | "profit" | "sheets";
  tone: "primary" | "success" | "warning" | "info";
}) {
  return (
    <article className={`mk-card mk-card-lift tone-${tone}`}>
      <div className={`mk-icon tone-${tone}`} aria-hidden>
        <FeatureIcon name={icon} />
      </div>
      <h3 className="mk-h3">{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function FeatureIcon({ name }: { name: "invoices" | "payables" | "figures" | "drafts" | "profit" | "sheets" }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 } as const;
  if (name === "invoices") {
    return (
      <svg {...common}>
        <path d="M7 3h8l4 4v14H7z" strokeLinejoin="round" />
        <path d="M15 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "payables") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 15h4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "figures") {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" strokeLinecap="round" />
        <path d="M8 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "drafts") {
    return (
      <svg {...common}>
        <path d="M12 20h9" strokeLinecap="round" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "profit") {
    return (
      <svg {...common}>
        <path d="M4 16l5-5 4 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 4h8v4H8zM6 8h12v12H6z" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details>
      <summary>
        {q}
        <span className="mk-faq-plus" aria-hidden>
          +
        </span>
      </summary>
      <p>{children}</p>
    </details>
  );
}
