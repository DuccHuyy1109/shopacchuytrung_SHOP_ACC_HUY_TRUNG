"use client";

import { useEffect, useState } from "react";
import { api, imageUrl } from "../lib/api";
import { discountPercent, formatPrice } from "../lib/format";
import type { AccountDetail } from "../lib/types";
import ModalPortal from "./ModalPortal";
import { Flame, Share } from "./icons";

/**
 * Popup chi tiết acc cho trang quản trị — bố cục giống phần đầu trang chi tiết
 * acc công khai (ảnh + thumbnail bên trái, MS/giá/thông tin/mô tả bên phải),
 * chỉ giữ lại nút Chia sẻ.
 */
export default function AccountDetailModal({
  accountId,
  onClose,
}: {
  accountId: number;
  onClose: () => void;
}) {
  const [acc, setAcc] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<AccountDetail>(`/api/admin/accounts/${accountId}`)
      .then((a) => {
        setAcc(a);
        setActive(0);
      })
      .catch(() => setAcc(null))
      .finally(() => setLoading(false));
  }, [accountId]);

  const images = acc?.images ?? [];
  const descTags = (acc?.description || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const discount = acc ? discountPercent(acc.original_price, acc.sale_price) : 0;

  function share() {
    const url = `${window.location.origin}/accounts/${accountId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm grid place-items-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-xl border border-fire-500/30 bg-ink-950 p-5 md:p-6 text-zinc-200 shadow-[0_0_70px_-18px_rgba(255,77,0,0.7)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-3 right-4 z-10 text-zinc-500 hover:text-white text-3xl leading-none"
          >
            ×
          </button>

          {loading ? (
            <div className="py-16 text-center text-zinc-500">Đang tải...</div>
          ) : !acc ? (
            <div className="py-16 text-center text-zinc-500">Không tìm thấy acc.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5 md:gap-6 items-stretch">
              {/* Ảnh chính + thumbnail */}
              <div className="flex flex-col gap-2">
                <div className="relative aspect-[5/4] surface overflow-hidden grid place-items-center">
                  {images.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(images[active]?.image_url)}
                      alt={acc.account_code}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-zinc-600 flex flex-col items-center gap-1">
                      <Flame className="w-8 h-8" />
                      Không có ảnh
                    </span>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {images.map((img, i) => (
                      <button
                        key={`adm-thumb-${img.id}-${i}`}
                        onClick={() => setActive(i)}
                        className={`w-14 h-14 rounded-md border overflow-hidden transition ${
                          i === active
                            ? "border-fire-500"
                            : "border-ink-700 hover:border-ink-600"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl(img.image_url)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Thông tin */}
              <div className="surface p-5 flex flex-col min-h-0">
                <h3 className="font-display font-extrabold uppercase tracking-wide text-2xl text-white pr-8">
                  MS: <span className="text-gradient-fire">{acc.account_code}</span>
                </h3>

                <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-display font-extrabold text-gradient-fire">
                    {formatPrice(acc.sale_price)}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-zinc-500 line-through">
                        {formatPrice(acc.original_price)}
                      </span>
                      <span className="text-ember-400 text-sm font-bold [text-shadow:0_0_8px_rgba(255,32,32,0.7)]">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <Info label="VIP" value={`VIP ${acc.vip_level}`} />
                  <Info label="Súng nâng cấp" value={`${acc.upgraded_guns_count} súng`} />
                  <Info label="Mức giá" value={acc.price_category?.name || "—"} />
                  <Info
                    label="Trạng thái"
                    value={
                      acc.status === "available"
                        ? "Còn hàng"
                        : acc.status === "sold"
                          ? "Đã bán"
                          : "Đang ẩn"
                    }
                  />
                </div>

                {descTags.length > 0 && (
                  <div className="mt-5">
                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
                      Mô tả tài khoản
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {descTags.map((t, i) => (
                        <span
                          key={t + i}
                          className="inline-flex items-center rounded-md bg-fire-500/10 text-fire-300 border border-fire-500/30 text-sm font-medium px-3 py-1"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-5">
                  <div className="mb-4 h-px bg-gradient-to-r from-transparent via-ink-600/70 to-transparent" />
                  <button
                    onClick={share}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg clip-chien-sm border border-ink-600 text-zinc-300 hover:border-fire-500 hover:text-white font-semibold text-sm transition"
                  >
                    <Share className="w-4 h-4" />
                    {copied ? "Đã copy link!" : "Chia sẻ"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900/60 border border-ink-700 rounded-lg p-2.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-semibold text-zinc-100">{value}</div>
    </div>
  );
}
