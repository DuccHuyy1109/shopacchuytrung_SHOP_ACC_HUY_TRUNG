import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Be_Vietnam_Pro, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth";
import Header from "./components/Header";
import ConditionalFooter from "./components/ConditionalFooter";
import AnnouncementPopup from "./components/AnnouncementPopup";
import EmberBackground from "./components/EmberBackground";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "./lib/seo";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin", "vietnamese"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    // Trang con chỉ cần đặt tiêu đề ngắn -> tự thêm " | Shop Acc Huy Trung".
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: { canonical: "/" },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "vi_VN",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: { capable: true, title: SITE_NAME },
  // Sau khi xác minh ở Google Search Console, dán mã vào đây:
  // verification: { google: "ma-xac-minh-cua-ban" },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
};

/** Dữ liệu có cấu trúc (JSON-LD) giúp Google hiểu đây là một cửa hàng + bật ô
 *  tìm kiếm thương hiệu. Đặt ở <head> qua thẻ script. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Store",
      "@id": `${SITE_URL}/#store`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      image: `${SITE_URL}/logo_web.png`,
      description: SITE_DESCRIPTION,
      priceRange: "10.000₫ - 50.000.000₫",
      areaServed: "VN",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "vi-VN",
      publisher: { "@id": `${SITE_URL}/#store` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/accounts?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`h-full ${beVietnam.variable} ${oswald.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col antialiased"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <EmberBackground />
        <AuthProvider>
          <Suspense
            fallback={
              <div className="h-[2px] w-full bg-gradient-to-r from-fire-500 via-ember-500 to-gold-400" />
            }
          >
            <Header />
          </Suspense>
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
          <AnnouncementPopup />
        </AuthProvider>
      </body>
    </html>
  );
}
