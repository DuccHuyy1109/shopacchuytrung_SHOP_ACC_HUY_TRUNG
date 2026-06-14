import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Be_Vietnam_Pro, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth";
import Header from "./components/Header";
import ConditionalFooter from "./components/ConditionalFooter";
import AnnouncementPopup from "./components/AnnouncementPopup";
import EmberBackground from "./components/EmberBackground";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "Shop Acc Huy Trung — Mua bán acc Free Fire uy tín",
  description:
    "Shop Acc Huy Trung — Mua bán tài khoản game Free Fire: acc cổ, acc siêu phẩm, acc theo giá. Order acc theo yêu cầu, giao dịch an toàn.",
  appleWebApp: { capable: true, title: "Shop Acc Huy Trung" },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
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
