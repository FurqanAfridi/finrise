import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/lib/brand";
import { LegalArticle, MarketingFrame, legalH2, legalP } from "@/components/marketing/shell";

export const metadata: Metadata = {
  title: `Privacy policy · ${APP_NAME}`,
  description: `How ${APP_NAME} collects, uses, and stores account data and optional Google Sheets data.`,
};

export default function PrivacyPage() {
  return (
    <MarketingFrame current="privacy">
      <LegalArticle title="Privacy policy">
        <p style={{ ...legalP, color: "var(--fr-text-muted)" }}>Effective {LEGAL_EFFECTIVE_DATE}</p>
        <p style={legalP}>
          This policy explains how {APP_NAME} (“we”, “us”) handles personal data. It is written for Google’s OAuth
          verification and for people who use the product. If you have questions, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        <h2 style={legalH2}>Who we are</h2>
        <p style={legalP}>
          {APP_NAME} is a hosted finance ledger for performance-marketing teams. The service is operated by Devdabs.
          The product site is fundlookup.co. The signed-in application is app.fundlookup.co. Platform administration
          is admin.fundlookup.co.
        </p>

        <h2 style={legalH2}>What we collect from your {APP_NAME} account</h2>
        <p style={legalP}>
          When you create an account or join a company, we store the information you provide: name, email, password
          hash, company identity, bank details you enter for invoices, buyer and publisher records, invoice amounts,
          expenses, and similar ledger data. We also store session cookies so you stay signed in, and server logs that
          may include IP address, timestamps, and URLs for security and debugging.
        </p>

        <h2 style={legalH2}>Google user data (Sheets import)</h2>
        <p style={legalP}>
          Connecting Google is optional. If you choose Connect Google Sheets, we request these Google scopes:
        </p>
        <ul style={{ ...legalP, paddingLeft: 20 }}>
          <li>spreadsheets.readonly: read cell values from a spreadsheet you pick</li>
          <li>
            drive.metadata.readonly: list spreadsheet names and ids so you can choose a file. This does not grant
            access to Google Docs, Photos, or other Drive file types, and it does not let us read a spreadsheet until
            you select it in {APP_NAME}
          </li>
          <li>userinfo.email: show which Google account is connected</li>
        </ul>
        <p style={legalP}>
          We use that access only to import historical buyer and publisher rows that you map and confirm. We store a
          refresh token for your company so you do not have to reconnect every import, plus the Google email of the
          connected account. We do not request write access. We do not scan your Drive. We do not read spreadsheets you
          never select in {APP_NAME}.
        </p>
        <p style={legalP}>
          After import, the copied ledger rows live in your {APP_NAME} company like any other invoice data. The Google
          file itself stays in Google.
        </p>

        <h2 style={legalH2}>Google API Services User Data Policy and Limited Use</h2>
        <p style={legalP}>
          {APP_NAME}’s use of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            style={{ color: "var(--fr-primary)", fontWeight: 600 }}
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <ul style={{ ...legalP, paddingLeft: 20 }}>
          <li>We use Google user data only to provide and improve the Sheets import feature you see in the app.</li>
          <li>We do not sell Google user data.</li>
          <li>We do not use Google user data for advertising, including retargeting, personalized ads, or ads measurement.</li>
          <li>
            We do not allow humans to read Google user data unless you give us permission, it is necessary for security
            or legal compliance, or the data is aggregated and no longer tied to you, all as allowed by Google’s Limited
            Use rules.
          </li>
          <li>We do not transfer Google user data to third parties except as needed to run the import feature on our hosting infrastructure, or as required by law.</li>
        </ul>

        <h2 style={legalH2}>How we use other data</h2>
        <p style={legalP}>
          Account and ledger data is used to operate {APP_NAME}: invoices, emails you ask us to send, reports, access
          control, and support. We do not sell it. We do not use it to build advertising profiles.
        </p>

        <h2 style={legalH2}>Sharing</h2>
        <p style={legalP}>
          People in your company see data according to their role. We use infrastructure providers to host the app and
          database, and an email provider if you configure SMTP. Those processors see data only to provide that
          service. We may disclose information if required by law or to protect users from fraud or abuse.
        </p>

        <h2 style={legalH2}>Retention and deletion</h2>
        <p style={legalP}>
          Ledger data stays until your company deletes records or the account is closed. To disconnect Google, open
          Integrations in the app and choose Disconnect. That removes the stored Google refresh token and email from
          our database. You can also revoke {APP_NAME} under Google Account permissions. Previously imported invoices
          are not automatically deleted; you can delete those in {APP_NAME} like other records. Step-by-step
          instructions:{" "}
          <Link href="/data-deletion" style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            How to delete your data
          </Link>
          . To request deletion of a company or account, email {SUPPORT_EMAIL} from the address on the account. We aim
          to complete those requests within 30 days.
        </p>

        <h2 style={legalH2}>Security</h2>
        <p style={legalP}>
          Access is authenticated. Secrets such as Google refresh tokens are stored encrypted at rest where the app
          encrypts secrets. Transport uses HTTPS on the public site. No method is perfect; protect your password and
          invite links.
        </p>

        <h2 style={legalH2}>Cookies</h2>
        <p style={legalP}>
          We use a session cookie after you sign in to {APP_NAME}. The marketing pages do not require that cookie. We
          do not use advertising cookies.
        </p>

        <h2 style={legalH2}>Children</h2>
        <p style={legalP}>{APP_NAME} is for business use. It is not directed at children under 13, and we do not knowingly collect their data.</p>

        <h2 style={legalH2}>Your choices</h2>
        <p style={legalP}>
          You can access and update much of your data in Settings. You can disconnect Google. You can ask us for a copy
          or deletion of account data by emailing {SUPPORT_EMAIL}. If you are in a region with additional privacy
          rights, we will honor valid requests.
        </p>

        <h2 style={legalH2}>Changes</h2>
        <p style={legalP}>
          We may update this policy. The effective date at the top will change. Material changes that affect Google
          user data will be reflected here before we expand how that data is used.
        </p>

        <h2 style={legalH2}>Contact</h2>
        <p style={legalP}>
          Privacy requests:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          .           Related:{" "}
          <Link href="/terms" style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            Terms of service
          </Link>
          {" · "}
          <Link href="/data-deletion" style={{ color: "var(--fr-primary)", fontWeight: 600 }}>
            How to delete your data
          </Link>
          .
        </p>
      </LegalArticle>
    </MarketingFrame>
  );
}
