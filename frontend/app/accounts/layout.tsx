import type { Metadata } from "next";

const title = "Acc Free Fire giá rẻ — Kho acc cổ, siêu phẩm";
const description =
  "Kho acc Free Fire đa dạng: acc cổ, acc siêu phẩm, acc theo giá. Lọc theo VIP, " +
  "mức giá, số súng nâng cấp. Mua nhanh, giao dịch an toàn tại Shop Acc Huy Trung.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/accounts" },
  openGraph: { title, description, url: "/accounts", type: "website" },
};

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
