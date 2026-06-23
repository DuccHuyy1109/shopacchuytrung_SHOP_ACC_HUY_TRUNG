import type { Metadata } from "next";
import { firstMarkdownImage, formatPrice } from "../../lib/format";
import { resolveOgImage } from "../../lib/ogImage";
import PostDetailClient from "./PostDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    // Ưu tiên ảnh đã upload; nếu không có thì lấy ảnh đầu trong nội dung (markdown).
    const img = await resolveOgImage(
      post.images?.[0]?.image_url || firstMarkdownImage(post.caption),
    );
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: "website",
        images: img ? [{ ...img, alt: title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: img ? [img.url] : undefined,
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
