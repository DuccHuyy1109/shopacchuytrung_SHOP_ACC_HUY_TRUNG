"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { imageUrl } from "../lib/api";
import { ChevronDown } from "./icons";

/**
 * Slideshow ảnh dùng chung: tự chạy 5s (tạm dừng khi hover), mũi tên + chấm,
 * vuốt trên mobile. Bấm ảnh -> gọi onZoom(index) (mở Lightbox).
 */
export default function ImageSlideshow({
  images,
  onZoom,
  ratio = "aspect-[16/9]",
  className = "",
}: {
  images: string[];
  onZoom?: (i: number) => void;
  ratio?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = images.length;

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);
  const next = useCallback(() => setIndex((i) => (i + 1) % n), [n]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + n) % n), [n]);

  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, n, next]);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchX.current = null;
  }

  if (!n) return null;

  return (
    <section
      className={`group relative overflow-hidden rounded-xl bg-ink-950 select-none ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={`relative w-full ${ratio}`}>
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onZoom?.(i)}
              className="relative h-full w-full shrink-0 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(src)}
                alt=""
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-ink-950/70 backdrop-blur border border-ink-600 text-white opacity-0 group-hover:opacity-100 hover:bg-fire-500 hover:border-fire-500 transition rotate-90"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Ảnh sau"
            className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-ink-950/70 backdrop-blur border border-ink-600 text-white opacity-0 group-hover:opacity-100 hover:bg-fire-500 hover:border-fire-500 transition -rotate-90"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Ảnh ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? "w-7 bg-gradient-to-r from-fire-500 to-ember-500"
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 text-xs font-semibold text-white bg-ink-950/60 backdrop-blur border border-ink-700 rounded-md px-2 py-1">
            {index + 1}/{n}
          </div>
        </>
      )}
    </section>
  );
}
