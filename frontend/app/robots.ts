import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/seo";

/**
 * /robots.txt — cho phép Google quét trang công khai, chặn các trang riêng tư
 * (quản trị, tài khoản cá nhân, hành động cần đăng nhập) & trỏ tới sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/login",
        "/register",
        "/nap-tien",
        "/order",
        "/posts/new",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
