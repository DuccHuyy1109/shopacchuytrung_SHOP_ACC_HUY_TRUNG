"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

// Các trang ẩn Footer (chỉ còn Header + nội dung)
const HIDE_ON = ["/login", "/register"];

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (HIDE_ON.includes(pathname)) return null;
  return <Footer />;
}
