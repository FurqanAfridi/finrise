import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/lib/brand";
import { LegalArticle, MarketingFrame, legalH2, legalP } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: `Delete your data · ${APP_NAME}`,
  description: `How to disconnect Google, delete imported rows, and request deletion of your ${APP_NAME} account.`,
};

export default function DataDeletionPage() {
  return (
    <MarketingFrame current="deletion">
      <LegalArticle title="How to delete your data">
        <p style={{ ...legalP, color: "var(--fr-text-muted)" }}>Effective {LEGAL_EFFECTIVE_DATE}</p>
        <p style={legalP}>
          This page is for people who use {APP_NAME} and for Google’s OAuth verification. It explains how to remove
          Google access, imported rows, and a full account. Questions:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        <h2 style={legalH2}>1. Disconnect Google Sheets</h2>
        <p style={legalP}>
          Sign in at app.fundlookup.co, open Integrations, and choose Disconnect. That deletes the Google refresh token
          and connected email we stored for your company. {APP_NAME} cannot list or read your spreadsheets after that
          until you connect again.
        </p>
        <p style={legalP}>
          You should also revoke {APP_NAME} in{" "}
          <a href="https://myaccount.google.com/permissions" style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            Google Account permissions
          </a>
          so Google stops issuing tokens to us.
        </p>

        <h2 style={legalH2}>2. Delete imported ledger rows</h2>
        <p style={legalP}>
          Disconnecting Google does not erase invoices or payables that were already copied into {APP_NAME}. Those
          rows are your company ledger. Delete them in Invoices or Payables the same way you delete other records, or
          ask an admin on the account to do so.
        </p>

        <h2 style={legalH2}>3. Close the {APP_NAME} account</h2>
        <p style={legalP}>
          Email {SUPPORT_EMAIL} from the address on the account. Say that you want the company and user deleted. We
          remove account credentials, Google tokens, and ledger data we hold for that company, except records we must
          keep for law, dispute, or security logs, as described in the{" "}
          <Link href="/privacy" style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            privacy policy
          </Link>
          . We aim to complete deletion requests within 30 days.
        </p>

        <h2 style={legalH2}>What we never keep from Google</h2>
        <p style={legalP}>
          We do not store copies of your whole Drive. We do not keep spreadsheet files. After import we store only the
          mapped invoice fields you confirmed, plus the token until you disconnect.
        </p>
      </LegalArticle>
    </MarketingFrame>
  );
}
