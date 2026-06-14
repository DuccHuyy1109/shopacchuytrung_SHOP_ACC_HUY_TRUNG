"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "./icons";

const SLIDES = [
  "/image/slide/slideshow1.png",
  "/image/slide/slideshow2.png",
  "/image/slide/slideshow3.png",
];

const INTERVAL = 5000;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = SLIDES.length;

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);
  const next = useCallback(() => setIndex((i) => (i + 1) % n), [n]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + n) % n), [n]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, INTERVAL);
    return () => clearInterval(t);
  }, [paused, next]);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    touchX.current = null;
  }

  return (
    <section
      className="group relative overflow-hidden neon-edge select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      {/* Khung tỉ lệ 2:1 */}
      <div className="relative w-full aspect-[2/1]">
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0">
              <Image
                src={src}
                alt={`Banner ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* Lớp phủ tối nhẹ 2 mép cho sang */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/30 via-transparent to-ink-950/30" />
      </div>

      {/* Mũi tên điều hướng — hiện khi hover (desktop) */}
      <button
        onClick={prev}
        aria-label="Ảnh trước"
        className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-full bg-ink-950/70 border border-ink-600 text-white opacity-0 group-hover:opacity-100 hover:bg-fire-500 hover:border-fire-500 transition rotate-90"
      >
        <ChevronDown className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        aria-label="Ảnh sau"
        className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-full bg-ink-950/70 border border-ink-600 text-white opacity-0 group-hover:opacity-100 hover:bg-fire-500 hover:border-fire-500 transition -rotate-90"
      >
        <ChevronDown className="w-6 h-6" />
      </button>

      {/* Chấm điều hướng */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Tới ảnh ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? "w-7 bg-gradient-to-r from-fire-500 to-ember-500"
                : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
