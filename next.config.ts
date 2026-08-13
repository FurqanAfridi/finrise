import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdfkit (and its AFM font files) outside the Turbopack/webpack bundle.
  // Bundling remaps __dirname to /ROOT/... and breaks Helvetica.afm lookups.
  serverExternalPackages: ["pdfkit", "fontkit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
