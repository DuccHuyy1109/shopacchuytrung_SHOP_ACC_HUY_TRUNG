"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { WikiItem, WikiItemDetail } from "../lib/types";
import { genreLabel, rareStyle } from "../lib/wiki";
import TechModal from "./TechModal";
import { Sparkles, Layers, ArrowRight } from "./icons";

export default function WikiDetailModal({
  itemId,
  onClose,
}: {
  itemId: number;
  onClose: () => void;
}) {
  const [currentId, setCurrentId] = useState(itemId);
  const [detail, setDetail] = useState<WikiItemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<WikiItemDetail>(`/api/wiki/items/${currentId}`)
      .then((d) => active && setDetail(d))
      .catch(() => active && setDetail(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [currentId]);

  const item = detail?.item;
  const rare = item ? rareStyle(item.rare) : null;

  return (
    <TechModal title="Chi tiết món" Icon={Sparkles} onClose={onClose}>
      {loading || !item || !rare ? (
        <div className="py-12 text-center text-zinc-500">Đang tải...</div>
      ) : (
        <div className="space-y-5">
          {/* Món chính */}
          <div className="flex items-center gap-4">
            <div
              className={`grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border bg-ink-950/70 ${rare.ring}`}
            >
              {item.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.icon}
                  alt={item.name_vi}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="text-xs text-zinc-600">Không ảnh</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold leading-tight text-white">
                {item.name_vi}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-ink-700 bg-ink-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  {genreLabel(item.genre)}
                </span>
                <span
                  className={`rounded border bg-ink-950/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${rare.chip}`}
                >
                  {rare.label}
                </span>
                {item.sub_items && (
                  <span className="rounded bg-gold-500/90 px-2 py-0.5 text-xs font-bold uppercase text-ink-950">
                    Trọn bộ
                  </span>
                )}
              </div>
            </div>
          </div>

          {detail.pieces.length > 0 && (
            <RelatedSection
              title="Các món trong bộ"
              items={detail.pieces}
              onPick={setCurrentId}
            />
          )}

          {detail.bundles.length > 0 && (
            <RelatedSection
              title="Thuộc bộ"
              items={detail.bundles}
              onPick={setCurrentId}
            />
          )}

          {detail.pieces.length === 0 && detail.bundles.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3 text-sm text-zinc-400">
              <Layers className="h-4 w-4 text-zinc-500" />
              Món lẻ — không thuộc bộ nào.
            </div>
          )}
        </div>
      )}
    </TechModal>
  );
}

function RelatedSection({
  title,
  items,
  onPick,
}: {
  title: string;
  items: WikiItem[];
  onPick: (id: number) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gold-300">
        <ArrowRight className="h-4 w-4" />
        {title}
        <span className="text-xs font-normal text-zinc-500">({items.length})</span>
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((it) => {
          const r = rareStyle(it.rare);
          return (
            <button
              key={`rel-${it.id}`}
              type="button"
              onClick={() => onPick(it.id)}
              className="surface group flex items-center gap-2 p-2 text-left transition hover:border-fire-500/40"
            >
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-ink-950/70 ${r.ring}`}
              >
                {it.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.icon}
                    alt={it.name_vi}
                    loading="lazy"
                    className="h-full w-full object-contain p-0.5"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-xs font-medium text-zinc-200 group-hover:text-white">
                  {it.name_vi}
                </div>
                <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-zinc-500">
                  {genreLabel(it.genre)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
