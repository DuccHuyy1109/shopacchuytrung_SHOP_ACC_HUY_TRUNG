"use client";

import { useEffect, useState } from "react";
import { api, imageUrl } from "../lib/api";
import { CATEGORY_LABELS, formatPrice } from "../lib/format";
import type { AccountDetail } from "../lib/types";
import Lightbox from "./Lightbox";
import ModalPortal from "./ModalPortal";

const STATUS_LABEL: Record<string, string> = {
  available: "Còn hàng",
  sold: "Đã bán",
  hidden: "Đang ẩn",
};

/** Popup xem nhanh thông tin + ảnh một acc (dùng trong trang quản trị). */
export default function AdminAccountModal({
  accountId,
  onClose,
}: {
  accountId: number;
  onClose: () => void;
}) {
  const [acc, setAcc] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<AccountDetail>(`/api/admin/accounts/${accountId}`)
      .then(setAcc)
      .catch(() => setAcc(null))
      .finally(() => setLoading(false));
  }, [accountId]);

  const imgs = acc?.images.map((i) => i.image_url) ?? [];
  const tags = (acc?.description || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
          <h3 className="font-bold">
            {loading
              ? "Đang tải..."
              : acc
                ? `Acc ${acc.account_code}`
                : "Không tìm thấy acc"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Đang tải...</div>
        ) : !acc ? (
          <div className="py-12 text-center text-slate-500">
            Acc này có thể đã bị xóa.
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Ảnh */}
            {imgs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {imgs.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightbox(i)}
                    className="w-24 h-24 rounded-lg border border-slate-200 overflow-hidden hover:ring-2 hover:ring-orange-400 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl(url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">Acc chưa có ảnh.</div>
            )}

            {/* Thông tin */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <Info label="Loại acc" value={CATEGORY_LABELS[acc.category_type] || acc.category_type} />
              <Info label="VIP" value={`VIP ${acc.vip_level}`} />
              <Info label="Súng nâng cấp" value={`${acc.upgraded_guns_count} súng`} />
              <Info label="Giá bán" value={formatPrice(acc.sale_price)} highlight />
              <Info label="Giá gốc" value={formatPrice(acc.original_price)} />
              <Info label="Trạng thái" value={STATUS_LABEL[acc.status] || acc.status} />
            </div>

            {/* Mô tả */}
            {tags.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Mô tả</div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span
                      key={t + i}
                      className="inline-flex items-center rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-medium px-3 py-1"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox !== null && imgs.length > 0 && (
        <Lightbox images={imgs} start={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
    </ModalPortal>
  );
}

function Info({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-semibold ${highlight ? "text-red-600" : ""}`}>
        {value}
      </div>
    </div>
  );
}
