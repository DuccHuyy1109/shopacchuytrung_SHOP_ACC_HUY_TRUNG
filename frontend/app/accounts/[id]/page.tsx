import type { Metadata } from "next";
import { Suspense } from "react";
import { formatPrice } from "../../lib/format";
import AccountDetailClient from "./AccountDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function absImg(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${API}${url}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API}/api/accounts/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const acc = await res.json();
    const title = `Acc ${acc.account_code} · ${formatPrice(acc.sale_price)} — VIP ${acc.vip_level}`;
    const desc =
      (acc.description || "")
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(" · ") ||
      `Acc Free Fire VIP ${acc.vip_level}, ${acc.upgraded_guns_count} súng nâng cấp — Shop Acc Huy Trung.`;
    const img = absImg(acc.images?.[0]?.image_url);
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: "website",
        images: img ? [{ url: img }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: img ? [img] : undefined,
      },
    };
  } catch {
    return { title: "Chi tiết acc — Shop Acc Huy Trung" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-500">Đang tải...</div>}>
      <AccountDetailClient id={id} />
    </Suspense>
  );
}
