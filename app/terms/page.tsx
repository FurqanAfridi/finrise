import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/lib/brand";
import { LegalArticle, MarketingFrame, legalH2, legalP } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: `Terms of service · ${APP_NAME}`,
  description: `Terms for using ${APP_NAME} on fundlookup.co and app.fundlookup.co.`,
};

export default function TermsPage() {
  return (
    <MarketingFrame current="terms">
      <LegalArticle title="Terms of service">
        <p style={{ ...legalP, color: "var(--fr-text-muted)" }}>Effective {LEGAL_EFFECTIVE_DATE}</p>
        <p style={legalP}>
          These terms govern use of {APP_NAME} at fundlookup.co, app.fundlookup.co, and admin.fundlookup.co. By
          creating an account or signing in, you agree to them. Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        <h2 style={legalH2}>The service</h2>
        <p style={legalP}>
          {APP_NAME} helps companies record buyer invoices, publisher payables, expenses, and related finance
          activity. It is a bookkeeping and workflow tool. It is not legal, tax, or investment advice, and it is not a
          bank or payment processor.
        </p>

        <h2 style={legalH2}>Accounts</h2>
        <p style={legalP}>
          You must provide accurate information and keep your password private. You are responsible for activity under
          your account. Company identity fields that the product locks after create are meant to stay stable on
          invoices. Invite only people who should see that company’s financial records.
        </p>

        <h2 style={legalH2}>Acceptable use</h2>
        <p style={legalP}>
          Do not misuse the service: no unauthorized access, no disruption, no uploading malware, and no using {APP_NAME}{" "}
          to break the law. Do not attempt to access another company’s data. Do not use the Google connection to
          import data you are not allowed to use.
        </p>

        <h2 style={legalH2}>Your content and accuracy</h2>
        <p style={legalP}>
          You own the ledger data you enter or import. You are responsible for whether amounts, counterparties, and
          invoices are correct. We are not responsible for disputes with buyers, publishers, or partners that arise
          from records you maintain in {APP_NAME}.
        </p>

        <h2 style={legalH2}>Google Sheets</h2>
        <p style={legalP}>
          If you connect Google, you authorize {APP_NAME} to read the spreadsheets you select, as described in the{" "}
          <Link href="/privacy" style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            privacy policy
          </Link>
          . Google’s own terms also apply to your Google account. You can disconnect at any time in Integrations.
        </p>

        <h2 style={legalH2}>Availability</h2>
        <p style={legalP}>
          We aim to keep the service available but do not guarantee uninterrupted access. We may change features,
          including Google import, when APIs or security requirements change.
        </p>

        <h2 style={legalH2}>Fees</h2>
        <p style={legalP}>
          Unless you have a separate written agreement, access to {APP_NAME} is provided under the arrangement set by
          the operator. We may introduce paid plans later; we will not charge a new fee without notice to the account
          admin.
        </p>

        <h2 style={legalH2}>Disclaimer</h2>
        <p style={legalP}>
          The service is provided as is, without warranties of merchantability, fitness for a particular purpose, or
          non-infringement, to the extent allowed by law. We do not warrant that reports will be error-free.
        </p>

        <h2 style={legalH2}>Limitation of liability</h2>
        <p style={legalP}>
          To the extent allowed by law, we are not liable for lost profits, lost data, or indirect damages, and our
          total liability for a claim relating to the service is limited to the fees you paid us for {APP_NAME} in the
          three months before the claim, or one hundred US dollars if you paid no fees.
        </p>

        <h2 style={legalH2}>Termination</h2>
        <p style={legalP}>
          You may stop using the service at any time. We may suspend or close accounts that violate these terms or
          that present a security risk. After closure, we delete or de-identify data as described in the privacy
          policy, except where we must keep records for law or dispute resolution.
        </p>

        <h2 style={legalH2}>Changes</h2>
        <p style={legalP}>
          We may update these terms. Continued use after the effective date means you accept the updated terms. If you
          do not agree, stop using the service and ask us to close the account.
        </p>

        <h2 style={legalH2}>Contact</h2>
        <p style={legalP}>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </LegalArticle>
    </MarketingFrame>
  );
}
