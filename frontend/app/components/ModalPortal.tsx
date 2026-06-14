"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Render overlay/modal ra thẳng document.body để thoát mọi stacking context
 * của trang (vd: `.admin-content > *` đặt z-index 1 khiến modal dù z-[100]
 * vẫn bị header z-40 che). Chỉ render sau khi mount để tránh lệch SSR.
 */
export default function ModalPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
