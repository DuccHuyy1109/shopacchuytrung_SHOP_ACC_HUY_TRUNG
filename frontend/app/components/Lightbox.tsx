"use client";

import { useCallback, useEffect, useState } from "react";
import { imageUrl } from "../lib/api";
import ModalPortal from "./ModalPortal";

/**
 * Trình xem ảnh toàn màn hình (lightbox). Hỗ trợ chuyển ảnh trước/sau,
 * phím mũi tên và Esc để đóng. Truyền vào danh sách URL ảnh + ảnh bắt đầu.
 */
export default function Lightbox({
  images,
  start = 0,
  onClose,
}: {
  images: string[];
  start?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const many = images.length > 1;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!images.length) return null;

  // z-[120]: phải nổi trên các modal chi tiết (z-[100]) khi cùng nằm ở body.
  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Đóng"
        className="absolute top-3 right-4 text-white/80 hover:text-white text-3xl leading-none"
      >
        ×
      </button>

      {many && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="Ảnh trước"
          className="absolute left-3 md:left-6 grid place-items-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl"
        >
          ‹
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl(images[index])}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] object-contain rounded shadow-2xl select-none"
      />

      {many && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="Ảnh sau"
          className="absolute right-3 md:right-6 grid place-items-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl"
        >
          ›
        </button>
      )}

      {many && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
    </ModalPortal>
  );
}
