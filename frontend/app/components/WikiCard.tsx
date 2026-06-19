"use client";

import type { WikiItem } from "../lib/types";
import { genreLabel, rareStyle } from "../lib/wiki";

/**
 * Thẻ món (trang phục / súng / sưu tập) — icon hotlink CDN + tên VI + chip
 * thể loại/độ hiếm. Bấm để mở chi tiết. Súng có cấp tiến hóa hiện số cấp ở góc ảnh.
 */
export default function WikiCard({
  item,
  onOpen,
}: {
  item: WikiItem;
  onOpen: (item: WikiItem) => void;
}) {
  const rare = rareStyle(item.rare);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="surface group flex items-center gap-3 overflow-hidden p-3 text-left transition hover:border-fire-500/40 hover:shadow-[0_0_28px_-14px_rgba(255,77,0,0.8)]"
    >
      <div
        className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border bg-ink-950/70 ${rare.ring}`}
      >
        {item.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.icon}
            alt={item.name_vi}
            loading="lazy"
            className="h-full w-full object-contain p-1 transition group-hover:scale-105"
          />
        ) : (
          <span className="text-[0.65rem] text-zinc-600">Không ảnh</span>
        )}
        {item.level ? (
          <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded bg-fire-500/95 px-1 text-[0.7rem] font-black leading-none text-white shadow-[0_0_10px_-2px_rgba(255,77,0,0.9)]">
            {item.level}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className="line-clamp-2 font-semibold leading-snug text-zinc-100 group-hover:text-white"
          title={item.name_vi}
        >
          {item.name_vi}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-ink-700 bg-ink-800 px-1.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-zinc-300">
            {genreLabel(item.genre)}
          </span>
          <span
            className={`rounded border bg-ink-950/60 px-1.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide ${rare.chip}`}
          >
            {rare.label}
          </span>
        </div>
      </div>
    </button>
  );
}
