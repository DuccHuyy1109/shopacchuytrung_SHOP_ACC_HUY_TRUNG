"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, imageUrl } from "../lib/api";
import { firstMarkdownImage, formatDate } from "../lib/format";
import type { Guide } from "../lib/types";
import { ShieldCheck, Clock, ArrowRight, Flame } from "../components/icons";

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Guide[]>("/api/guides")
      .then(setGuides)
      .catch(() => setGuides([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Tiêu đề — logo + (tên mục / mô tả) cùng nhóm */}
      <div className="flex items-center gap-3 mb-6">
        <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950 glow-gold shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </span>
        <div>
          <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
            Hướng <span className="text-gradient-gold">dẫn</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Các bài hướng dẫn mua bán, giao dịch an toàn &amp; bảo mật acc.
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : guides.length ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {guides.map((g, i) => (
            <GuideCard key={`guide-${g.id}-${i}`} guide={g} delay={i * 60} />
          ))}
        </div>
      ) : (
        <div className="surface py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
          <span className="grid place-items-center w-14 h-14 clip-chien-sm bg-ink-800 border border-ink-700 text-gold-400">
            <ShieldCheck className="w-7 h-7" />
          </span>
          Chưa có bài hướng dẫn nào.
        </div>
      )}
    </div>
  );
}

function GuideCard({ guide, delay }: { guide: Guide; delay: number }) {
  const img = firstMarkdownImage(guide.content);
  return (
    <Link
      href={`/guides/${guide.slug}`}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative block overflow-hidden rounded-[5px] aspect-[4/3] border border-gold-400/20 bg-ink-900 shadow-[0_0_20px_-12px_rgba(212,175,55,0.45)] hover:border-gold-400/55 hover:shadow-[0_0_36px_-10px_rgba(212,175,55,0.7)] hover:-translate-y-1 transition duration-300 animate-rise"
    >
      {/* Ảnh đầu tiên (làm nền) */}
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(img)}
          alt={guide.title}
          className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-ink-800 to-ink-950 text-zinc-700">
          <Flame className="w-10 h-10" />
        </div>
      )}
      {/* Phủ tối dần lên cho chữ nổi */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/5" />

      {/* Ngoặc HUD 2 góc (tinh tế) */}
      <span className="pointer-events-none absolute z-10 w-5 h-5 top-0 left-0 border-t-2 border-l-2 border-gold-300/80 transition-all duration-300 group-hover:w-8 group-hover:h-8" />
      <span className="pointer-events-none absolute z-10 w-5 h-5 bottom-0 right-0 border-b-2 border-r-2 border-gold-300/80 transition-all duration-300 group-hover:w-8 group-hover:h-8" />

      {/* Ngày tạo */}
      {guide.created_at && (
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-200 bg-ink-950/65 backdrop-blur border border-gold-500/25 rounded-md px-2 py-1">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(guide.created_at)}
        </span>
      )}

      {/* Tiêu đề + CTA nổi trên ảnh */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h2 className="font-display font-extrabold uppercase tracking-wide text-lg md:text-xl text-white leading-snug line-clamp-2 group-hover:text-gold-200 transition [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]">
          {guide.title}
        </h2>
        <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-fire-400 group-hover:text-fire-300 transition">
          Đọc hướng dẫn
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[5px] overflow-hidden border border-ink-700 bg-ink-900">
          <div className="aspect-[16/9] bg-ink-800 animate-pulse" />
          <div className="p-4 space-y-2.5">
            <div className="h-4 w-3/4 bg-ink-800 rounded animate-pulse" />
            <div className="h-3 w-full bg-ink-800 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
