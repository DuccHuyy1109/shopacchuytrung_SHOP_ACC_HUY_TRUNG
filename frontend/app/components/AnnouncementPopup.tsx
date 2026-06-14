"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, imageUrl } from "../lib/api";
import { renderRichText } from "../lib/format";
import type { Announcement } from "../lib/types";

const SEEN_KEY = "saht_ann_seen";

/**
 * Popup thông báo hiện khi khách vào web. Hiện 1 lần mỗi phiên (sessionStorage).
 * Nhiều thông báo -> điều hướng bằng chấm/mũi tên; >2 thông báo -> tự chạy slide.
 * Không hiện trong khu vực admin.
 */
export default function AnnouncementPopup() {
  const pathname = usePathname();
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(SEEN_KEY)) return;
    api
      .get<Announcement[]>("/api/announcements")
      .then((d) => {
        if (d.length) {
          setItems(d);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Tự chạy slide khi có hơn 2 thông báo.
  useEffect(() => {
    if (!open || items.length <= 2) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      5000,
    );
    return () => clearInterval(t);
  }, [open, items.length]);

  if (!open || !items.length) return null;

  const a = items[idx];
  const many = items.length > 1;

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  function go(dir: number) {
    setIdx((i) => (i + dir + items.length) % items.length);
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/82 p-4 backdrop-blur-md"
      onClick={close}
    >
      <div
        className="group animate-rise relative flex max-h-[88vh] w-full max-w-[34rem] flex-col overflow-hidden rounded-[4px] border border-fire-500/30 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 text-white shadow-[0_0_36px_-16px_rgba(255,77,0,0.85)] transition duration-300 md:h-[80vh] md:w-[50vw] md:max-w-none md:hover:shadow-[0_0_54px_-14px_rgba(255,106,0,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pointer-events-none absolute z-10 h-6 w-6 border-l-2 border-t-2 border-fire-400 transition-all duration-300 group-hover:h-9 group-hover:w-9" />
        <span className="pointer-events-none absolute right-0 z-10 h-6 w-6 border-r-2 border-t-2 border-ember-400 transition-all duration-300 group-hover:h-9 group-hover:w-9" />
        <span className="pointer-events-none absolute bottom-0 z-10 h-6 w-6 border-b-2 border-l-2 border-ember-400 transition-all duration-300 group-hover:h-9 group-hover:w-9" />
        <span className="pointer-events-none absolute bottom-0 right-0 z-10 h-6 w-6 border-b-2 border-r-2 border-fire-400 transition-all duration-300 group-hover:h-9 group-hover:w-9" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fire-400 to-transparent" />
        <div className="pointer-events-none absolute inset-y-8 right-0 w-px bg-gradient-to-b from-transparent via-ember-400/60 to-transparent" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fire-500/16 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-ember-500/12 blur-3xl" />

        <button
          onClick={close}
          aria-label="Đóng"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center clip-chien-sm border border-ember-500/60 bg-transparent text-xl leading-none text-ember-300 shadow-[0_0_20px_-8px_rgba(255,32,32,0.95)] transition hover:border-ember-400 hover:text-white hover:shadow-[0_0_32px_-6px_rgba(255,32,32,1)]"
        >
          ×
        </button>

        <div className="relative px-6 pb-3 pt-6 text-center md:px-10 md:pt-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-fire-300 animate-pulse [text-shadow:0_0_14px_rgba(255,106,0,0.7)]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-fire-400" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-fire-400 shadow-[0_0_10px_rgba(255,106,0,0.95)]" />
            Bản tin shop
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember-400 shadow-[0_0_10px_rgba(255,77,0,0.95)]" />
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-ember-400" />
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold uppercase tracking-wide leading-none text-white md:text-4xl">
            Thông báo <span className="text-gradient-fire text-glow-fire">Shopacchuytrung</span>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto px-6 pb-10 text-center md:px-10 md:pb-12">
          {a.image_url && (
            <div className="mx-auto mb-5 w-full">
              <div className="relative aspect-[2/1] overflow-hidden rounded-[4px] border border-fire-500/25 bg-ink-950/50 shadow-[0_18px_55px_-28px_rgba(255,77,0,0.8)]">
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(a.image_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}
          {a.title && (
            <div className="mx-auto mb-3 max-w-3xl">
              <div className="inline-block border-y border-fire-500/35 px-4 py-2">
                <div className="font-display text-2xl font-extrabold uppercase tracking-wide leading-tight text-gradient-fire md:text-3xl">
                  {a.title}
                </div>
              </div>
            </div>
          )}
          {a.content && (
            <div
              className="mx-auto max-w-3xl space-y-2 text-base font-semibold leading-relaxed text-zinc-100 md:text-lg"
              dangerouslySetInnerHTML={{ __html: renderRichText(a.content) }}
            />
          )}
        </div>

        {many && (
          <div className="relative flex items-center justify-center gap-3 py-2">
            <button
              onClick={() => go(-1)}
              aria-label="Trước"
              className="grid h-8 w-8 place-items-center rounded-[4px] border border-white/10 bg-transparent text-white/75 transition hover:border-fire-400/70 hover:text-white"
            >
              ‹
            </button>
            <div className="flex items-center gap-1.5">
              {items.map((_, i) => (
                <button
                  key={`announcement-dot-${i}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Thông báo ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition ${
                    i === idx ? "bg-fire-400 shadow-[0_0_14px_rgba(255,106,0,0.95)]" : "bg-white/25 hover:bg-white/45"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => go(1)}
              aria-label="Sau"
              className="grid h-8 w-8 place-items-center rounded-[4px] border border-white/10 bg-transparent text-white/75 transition hover:border-fire-400/70 hover:text-white"
            >
              ›
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
