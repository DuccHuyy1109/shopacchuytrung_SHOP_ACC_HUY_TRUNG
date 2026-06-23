import { firstMarkdownImage } from "../../../lib/format";
import { absImg, composeOgCard } from "../../../lib/ogImage";

// sharp cần Node runtime (không chạy edge).
export const runtime = "nodejs";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Sinh ảnh Open Graph 1200×630 cho bài đăng từ ảnh ĐẦU TIÊN (ưu tiên ảnh upload,
 * fallback ảnh đầu trong nội dung). Trỏ og:image vào route này để link preview
 * (Facebook/Zalo) luôn có ảnh đúng tỉ lệ, mọi kích thước ảnh gốc.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const res = await fetch(`${API}/api/posts/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return new Response("not found", { status: 404 });
    const post = await res.json();
    const src = absImg(
      post.images?.[0]?.image_url || firstMarkdownImage(post.caption),
    );
    if (!src) return new Response("no image", { status: 404 });

    const imgRes = await fetch(src, { next: { revalidate: 86400 } });
    if (!imgRes.ok) return new Response("image fetch failed", { status: 502 });

    const out = await composeOgCard(Buffer.from(await imgRes.arrayBuffer()));
    return new Response(new Uint8Array(out), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new Response("error", { status: 500 });
  }
}
