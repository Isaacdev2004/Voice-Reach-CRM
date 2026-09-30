import type { Metadata } from "next";
import { Caveat, Cormorant_Garamond, Inter } from "next/font/google";
import { MarketingScripts } from "@/components/marketing/marketing-scripts";
import { Providers } from "@/components/providers";
import { BRAND_NAME } from "@/lib/brand";
import { getClerkPublishableKey } from "@/lib/clerk-env";
import { DEFAULT_OG_IMAGE, SITE_URL, siteMetadata } from "@/lib/seo/site";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} CRM | Automated Lead Follow-Up for Realtors`,
    template: `%s | ${BRAND_NAME} CRM`,
  },
  description:
    "ARI helps real estate agents capture, organize, and automatically follow up with leads so opportunities don't fall through the cracks. Start your 14-day free trial.",
  robots: { index: true, follow: true },
  icons: {
    icon: "/brand/ari-logo.png",
    apple: "/brand/ari-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: siteMetadata.siteName,
    title: `${BRAND_NAME} | Never Let Another Lead Fall Through the Cracks`,
    description:
      "Automate your lead follow-up, organize your pipeline, and turn more opportunities into clients with ARI.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "ARI real estate CRM dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | Never Let Another Lead Fall Through the Cracks`,
    description:
      "Automate your lead follow-up, organize your pipeline, and turn more opportunities into clients with ARI.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = getClerkPublishableKey();

  return (
    <html lang="en" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${cormorant.variable} ${caveat.variable} font-sans antialiased`}
      >
        <MarketingScripts />
        <Providers publishableKey={clerkPublishableKey}>{children}</Providers>
      </body>
    </html>
  );
}
