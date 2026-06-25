"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Lightbox from "../../components/Lightbox";
import ImageSlideshow from "../../components/ImageSlideshow";
import { api } from "../../lib/api";
import { allMarkdownImages, formatDate, renderGuideContent } from "../../lib/format";
import type { Guide } from "../../lib/types";
import { ArrowRight, Clock, ShieldCheck } from "../../components/icons";

export default function GuideDetailClient({ slug }: { slug: string }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Guide>(`/api/guides/${slug}`)
      .then(setGuide)
      .catch(() => setGuide(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const images = useMemo(() => allMarkdownImages(guide?.content), [guide?.content]);
  const html = useMemo(() => renderGuideContent(guide?.content), [guide?.content]);

  if (loading)
    return <div className="py-20 text-center text-zinc-500">Đang tải...</div>;
  if (!guide)
    return (
      <div className="py-20 text-center text-zinc-400">
        Không tìm thấy bài hướng dẫn.{" "}
        <Link href="/guides" className="text-fire-400 hover:text-fire-300">
          Quay lại
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Tiêu đề + mũi tên quay lại ở cùng 1 hàng (mũi tên bên phải) */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-gold-300 to-gold-500 text-ink-950 glow-gold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none break-words">
              {guide.title}
            </h1>
            {guide.created_at && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-zinc-400">
                <Clock className="w-4 h-4 text-gold-400" />
                {formatDate(guide.created_at)}
              </div>
            )}
          </div>
        </div>
        <div className="relative group/tip shrink-0">
          <Link
            href="/guides"
            aria-label="Tất cả hướng dẫn"
            className="grid place-items-center w-10 h-10 clip-chien-sm border border-ink-700 bg-ink-900 text-zinc-300 hover:border-fire-500 hover:text-white transition"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Link>
          <span className="pointer-events-none absolute top-full mt-2 right-0 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
            Tất cả hướng dẫn
          </span>
        </div>
      </div>

      {/* Ảnh — slideshow */}
      {images.length > 0 && (
        <div className="mb-8">
          <ImageSlideshow
            images={images}
            onZoom={(i) => setLightbox(i)}
            ratio="aspect-[2/1]"
            className="frame-glow"
          />
        </div>
      )}

      {/* Nội dung */}
      {html ? (
        <article
          className="space-y-1 text-base"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-zinc-500">Bài hướng dẫn chưa có nội dung.</p>
      )}

      {lightbox !== null && images.length > 0 && (
        <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
