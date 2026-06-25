import type { Metadata } from "next";

const title = "Wiki vật phẩm Free Fire — Tra cứu trang phục, súng, skin";
const description =
  "Thư viện tra cứu vật phẩm Free Fire: trang phục, skin súng, nhân vật... " +
  "Tìm nhanh theo loại và độ hiếm. Cung cấp bởi Shop Acc Huy Trung.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/wiki" },
  openGraph: { title, description, url: "/wiki", type: "website" },
};

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
