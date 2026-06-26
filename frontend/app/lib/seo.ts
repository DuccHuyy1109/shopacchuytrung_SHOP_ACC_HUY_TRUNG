/**
 * Hằng số SEO dùng chung cho toàn site (metadata, sitemap, robots, JSON-LD).
 * Sửa một nơi -> áp dụng mọi trang.
 */
export const SITE_NAME = "Shop Acc Huy Trung";
export const SITE_TAGLINE = "Mua bán acc Free Fire uy tín";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/**
 * Domain tuyệt đối của web (dùng cho canonical, OG, sitemap, robots).
 * Ưu tiên: biến tự đặt -> domain production của Vercel -> localhost (chạy máy).
 * Nhờ vậy production KHÔNG bao giờ lỡ dùng localhost dù chưa cấu hình tay.
 * Khi mua tên miền riêng, đặt NEXT_PUBLIC_SITE_URL = https://tenmien-cua-ban.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "Shop Acc Huy Trung — Mua bán tài khoản game Free Fire: acc cổ, acc siêu phẩm, " +
  "acc theo giá. Order acc theo yêu cầu, định giá acc, nạp tiền & giao dịch an toàn, uy tín.";

export const SITE_KEYWORDS = [
  "shop acc huy trung",
  "acc free fire",
  "mua acc free fire",
  "bán acc free fire",
  "acc ff giá rẻ",
  "acc cổ",
  "acc siêu phẩm",
  "acc free fire theo giá",
  "order acc free fire",
  "định giá acc free fire",
  "nick free fire",
  "shop acc ff uy tín",
];

/**
 * Ảnh OG mặc định khi share link lên Facebook/Zalo... — dùng banner slideshow #3
 * của trang chủ (tỉ lệ 2:1, đẹp cho thẻ chia sẻ). Áp dụng cho trang chủ & các
 * trang không có ảnh riêng; trang chi tiết acc/bài đăng vẫn dùng ảnh của nó.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/image/slide/slideshow3.png",
  width: 1774,
  height: 887,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
};
