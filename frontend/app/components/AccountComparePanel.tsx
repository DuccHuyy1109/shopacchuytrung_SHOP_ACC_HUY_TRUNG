"use client";

import { useState } from "react";
import { imageUrl } from "../lib/api";
import {
  CATEGORY_LABELS,
  discountPercent,
  formatPrice,
  showsAccountCategoryBadge,
} from "../lib/format";
import type { AccountDetail } from "../lib/types";
import Lightbox from "./Lightbox";
import { ArrowRight, Flame } from "./icons";

/** Một cửa sổ chi tiết acc (ảnh + thông tin) — dùng trong so sánh. Trong suốt, không khung. */
export default function AccountComparePanel({ acc }: { acc: AccountDetail }) {
  const [active, setActive] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  const imgs = acc.images.map((i) => i.image_url);
  const discount = discountPercent(acc.original_price, acc.sale_price);
  const tags = (acc.description || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="relative">
      {/* Ảnh chính 5:4 */}
      <div className="relative aspect-[5/4] bg-ink-900 rounded-lg overflow-hidden grid place-items-center">
        {imgs.length ? (
          <button type="button" onClick={() => setLb(active)} className="w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(imgs[active])}
              alt={acc.account_code}
              className="w-full h-full object-contain"
            />
          </button>
        ) : (
          <span className="text-zinc-600 text-sm flex flex-col items-center gap-1">
            <Flame className="w-7 h-7" />
            Không có ảnh
          </span>
        )}
      </div>

      {imgs.length > 1 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {imgs.map((u, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`w-12 h-12 rounded-md border shrink-0 overflow-hidden transition ${
                i === active ? "border-fire-500" : "border-ink-700 hover:border-ink-600"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(u)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            {showsAccountCategoryBadge(acc.category_type) && (
              <div className="text-xs text-fire-400 font-semibold uppercase tracking-wide">
                {CATEGORY_LABELS[acc.category_type] || acc.category_type}
              </div>
            )}
            <h3 className="font-display font-bold text-lg text-white mt-0.5">
              Acc <span className="text-gradient-fire">{acc.account_code}</span>
            </h3>
          </div>
          {/* Nút icon -> trang chi tiết (tooltip hover) */}
          <div className="relative group/tip shrink-0">
            <a
              href={`/accounts/${acc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Xem trang chi tiết"
              className="grid place-items-center w-9 h-9 clip-chien-sm border border-ink-700 bg-ink-900 text-zinc-300 hover:border-fire-500 hover:text-white transition"
            >
              <ArrowRight className="w-5 h-5" />
            </a>
            <span className="pointer-events-none absolute top-full mt-2 right-0 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
              Xem trang chi tiết
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
          <span className="text-2xl font-display font-extrabold text-gradient-fire">
            {formatPrice(acc.sale_price)}
          </span>
          {discount > 0 && (
            <>
              <span className="text-zinc-500 line-through text-sm">
                {formatPrice(acc.original_price)}
              </span>
              <span className="text-ember-400 text-xs font-bold [text-shadow:0_0_8px_rgba(255,32,32,0.7)]">
                -{discount}%
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <Info label="VIP" value={`VIP ${acc.vip_level}`} />
          <Info label="Súng nâng cấp" value={`${acc.upgraded_guns_count} súng`} />
          <Info label="Mức giá" value={acc.price_category?.name || "—"} />
          <Info label="Trạng thái" value={acc.status === "available" ? "Còn hàng" : "Đã bán"} />
        </div>

        {tags.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wide">Mô tả</div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex rounded-md bg-fire-500/10 text-fire-300 border border-fire-500/30 text-xs font-medium px-2.5 py-1"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {lb !== null && imgs.length > 0 && (
        <Lightbox images={imgs} start={lb} onClose={() => setLb(null)} />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900/60 border border-ink-700 rounded-lg p-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
