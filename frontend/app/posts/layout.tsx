import type { Metadata } from "next";

const title = "Chợ mua bán acc Free Fire — Tin đăng từ cộng đồng";
const description =
  "Bảng tin mua bán acc Free Fire: đăng tin cần mua, cần bán acc theo nhu cầu. " +
  "Kết nối người mua – người bán an toàn qua Shop Acc Huy Trung.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/posts" },
  openGraph: { title, description, url: "/posts", type: "website" },
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
