import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeRegistry } from "@/components/theme-registry";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FINRISE",
  description: "Buyer, publisher, and profit tracking for performance marketing.",
  icons: {
    icon: [{ url: `/brand/logo-mark.png?v=20260813g`, type: "image/png" }],
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
            __html: `try{var m=localStorage.getItem('finrise-color-mode');if(m!=='light'&&m!=='dark'){m='light'}document.documentElement.dataset.colorMode=m;document.documentElement.style.colorScheme=m}catch(e){document.documentElement.dataset.colorMode='light';document.documentElement.style.colorScheme='light'}`,
          }}
        />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
