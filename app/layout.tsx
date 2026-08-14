import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeRegistry } from "@/components/theme-registry";
import { APP_NAME, APP_PURPOSE, MARKETING_HOST } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${MARKETING_HOST}`),
  title: APP_NAME,
  applicationName: APP_NAME,
  description: APP_PURPOSE,
  keywords: [APP_NAME, "invoices", "publishers", "buyers", "Google Sheets"],
  openGraph: {
    title: APP_NAME,
    siteName: APP_NAME,
    description: APP_PURPOSE,
    url: `https://${MARKETING_HOST}`,
    type: "website",
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  icons: {
    icon: [{ url: `/brand/favicon.png?v=20260814a`, type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0F1419" },
    { media: "(prefers-color-scheme: light)", color: "#FAFBFC" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-color-mode="light" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem('fundlookup-color-mode')||localStorage.getItem('finrise-color-mode');if(m!=='light'&&m!=='dark'){m='light'}document.documentElement.dataset.colorMode=m;document.documentElement.style.colorScheme=m}catch(e){document.documentElement.dataset.colorMode='light';document.documentElement.style.colorScheme='light'}`,
          }}
        />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
