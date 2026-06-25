import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/seo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Gọi API công khai an toàn — lỗi/đứt mạng thì trả null, sitemap vẫn dựng được. */
async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type ListPage<T> = { items: T[] };
type AccountRow = { id: number; created_at: string | null };
type PostRow = { id: number; created_at: string | null; updated_at?: string | null };
type GuideRow = { slug: string; created_at: string | null };

/**
 * /sitemap.xml — bản đồ trang cho Google. Gồm các trang tĩnh công khai + acc,
 * bài đăng, hướng dẫn lấy động từ API. Cache lại 1 giờ để khỏi gọi liên tục.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/accounts`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/posts`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${SITE_URL}/dinh-gia`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/wiki`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  const [accounts, posts, guides] = await Promise.all([
    fetchJson<ListPage<AccountRow>>("/api/accounts?page_size=100&sort=newest"),
    fetchJson<ListPage<PostRow>>("/api/posts?page_size=100"),
    fetchJson<GuideRow[]>("/api/guides"),
  ]);

  const accountRoutes: MetadataRoute.Sitemap = (accounts?.items ?? []).map((a) => ({
    url: `${SITE_URL}/accounts/${a.id}`,
    lastModified: a.created_at ? new Date(a.created_at) : now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const postRoutes: MetadataRoute.Sitemap = (posts?.items ?? []).map((p) => ({
    url: `${SITE_URL}/posts/${p.id}`,
    lastModified: new Date(p.updated_at || p.created_at || now),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const guideRoutes: MetadataRoute.Sitemap = (guides ?? []).map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: g.created_at ? new Date(g.created_at) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...accountRoutes, ...postRoutes, ...guideRoutes];
}
