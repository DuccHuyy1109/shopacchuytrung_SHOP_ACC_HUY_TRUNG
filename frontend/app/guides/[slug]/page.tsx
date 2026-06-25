import type { Metadata } from "next";
import { firstMarkdownImage } from "../../lib/format";
import { resolveOgImage } from "../../lib/ogImage";
import { SITE_NAME } from "../../lib/seo";
import GuideDetailClient from "./GuideDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API}/api/guides/${slug}`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const guide = await res.json();
    const title = guide.title || "Hướng dẫn";
    // Bỏ ký hiệu markdown để lấy đoạn mô tả sạch cho thẻ description.
    const plain = String(guide.content || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/[#*`>_~[\]()-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const description = plain
      ? plain.slice(0, 200)
      : `Hướng dẫn mua bán & giao dịch acc Free Fire an toàn tại ${SITE_NAME}.`;
    const img = await resolveOgImage(firstMarkdownImage(guide.content));
    return {
      title,
      description,
      alternates: { canonical: `/guides/${slug}` },
      openGraph: {
        title,
        description,
        type: "article",
        url: `/guides/${slug}`,
        images: img ? [{ ...img, alt: title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: img ? [img.url] : undefined,
      },
    };
  } catch {
    return { title: "Hướng dẫn" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GuideDetailClient slug={slug} />;
}
