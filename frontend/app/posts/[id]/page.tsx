import type { Metadata } from "next";
import { headers } from "next/headers";
import { firstMarkdownImage, formatPrice } from "../../lib/format";
import { OG_HEIGHT, OG_WIDTH } from "../../lib/ogImage";
import PostDetailClient from "./PostDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Domain tuyệt đối của site (để og:image là URL đầy đủ — Facebook bắt buộc). */
async function siteBase(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API}/api/posts/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const post = await res.json();
    const kind = post.post_type === "sell" ? "Cần bán" : "Cần mua";
    const price = post.price ? formatPrice(post.price) : "Thỏa thuận";
    const title = `${kind}: ${post.title || "Acc Free Fire"} · ${price}`;
    const desc = (post.caption || "Bài đăng mua bán acc — Shop Acc Huy Trung.").slice(
      0,
      200,
    );
    // Có ảnh (đã upload hoặc trong nội dung) -> dùng ảnh OG 1200×630 tự sinh,
    // đảm bảo Facebook hiển thị được mọi tỉ lệ ảnh gốc.
    const hasImg = !!(
      post.images?.[0]?.image_url || firstMarkdownImage(post.caption)
    );
    const base = await siteBase();
    const ogUrl = hasImg && base ? `${base}/posts/${id}/og` : undefined;
    const images = ogUrl
      ? [{ url: ogUrl, width: OG_WIDTH, height: OG_HEIGHT, alt: title }]
      : undefined;
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: "website",
        images,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: ogUrl ? [ogUrl] : undefined,
      },
    };
  } catch {
    return { title: "Bài đăng — Shop Acc Huy Trung" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostDetailClient id={id} />;
}
