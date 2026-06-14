"use client";

import { useState } from "react";
import { imageUrl } from "../lib/api";
import Lightbox from "./Lightbox";

/**
 * Lưới ảnh kiểu Facebook: hiển thị tối đa 4 ảnh, nếu nhiều hơn thì ô thứ 4 phủ
 * "+N". Bấm ảnh để mở Lightbox xem toàn bộ.
 */
export default function PostImageGrid({ images }: { images: string[] }) {
  const [view, setView] = useState<number | null>(null);
  if (!images.length) return null;

  const n = images.length;
  const shown = images.slice(0, 4);
  const extra = n - 4;

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {shown.map((url, i) => {
          let cls = "aspect-square";
          if (n === 1) cls = "col-span-2 aspect-[4/3]";
          else if (n === 3 && i === 0) cls = "col-span-2 aspect-[2/1]";
          const isLast = i === 3 && extra > 0;
          return (
            <button
              key={url + i}
              type="button"
              onClick={() => setView(i)}
              className={`relative ${cls} bg-ink-900 overflow-hidden group`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(url)}
                alt=""
                className="w-full h-full object-cover group-hover:opacity-95 transition"
              />
              {isLast && (
                <div className="absolute inset-0 bg-black/55 grid place-items-center text-white text-2xl font-bold">
                  +{extra}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {view !== null && (
        <Lightbox images={images} start={view} onClose={() => setView(null)} />
      )}
    </>
  );
}
