import type { Metadata } from "next";

const title = "Định giá acc Free Fire miễn phí — Ước tính giá trị nick";
const description =
  "Công cụ định giá acc Free Fire: chọn trang phục, súng nâng cấp để ước tính giá " +
  "trị nick nhanh chóng. Tham khảo trước khi mua bán tại Shop Acc Huy Trung.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/dinh-gia" },
  openGraph: { title, description, url: "/dinh-gia", type: "website" },
};

export default function DinhGiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
