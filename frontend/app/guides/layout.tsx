import type { Metadata } from "next";

const title = "Hướng dẫn — Mua acc, nạp tiền, giao dịch Free Fire an toàn";
const description =
  "Tổng hợp hướng dẫn mua acc, nạp tiền, định giá và giao dịch acc Free Fire an " +
  "toàn tại Shop Acc Huy Trung. Đọc kỹ trước khi giao dịch để tránh rủi ro.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides" },
  openGraph: { title, description, url: "/guides", type: "website" },
};

export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
