"use client";

import { useState } from "react";
import ModalPortal from "./ModalPortal";

/**
 * Số điện thoại bấm được (dùng trong trang quản trị): bấm vào hiện bảng
 * xác nhận "Vào Zalo số này?" — Đồng ý sẽ mở Zalo (zalo.me) của số đó.
 */
export default function PhoneZaloLink({
  phone,
  className = "text-sky-600 hover:underline",
}: {
  phone?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!phone || !phone.trim()) return <>—</>;
  const clean = phone.replace(/[^0-9+]/g, "");

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`font-medium ${className}`}
        title={`Mở Zalo của ${phone}`}
      >
        {phone}
      </button>
      {open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-sky-500/40 bg-ink-950 p-5 text-zinc-200 shadow-[0_0_60px_-18px_rgba(56,189,248,0.7)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
                Mở <span className="text-sky-400">Zalo</span>
              </h3>
              <div className="mt-1 h-px bg-gradient-to-r from-sky-500/50 via-ink-700 to-transparent" />
              <p className="text-sm text-zinc-400 mt-3">
                Vào Zalo của số{" "}
                <b className="text-sky-300 text-base">{phone}</b>?
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto px-4 py-2 border border-ink-700 rounded-lg text-zinc-300 hover:border-sky-500/50 hover:text-white transition"
                >
                  Hủy
                </button>
                <a
                  href={`https://zalo.me/${clean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold hover:brightness-110 transition shadow-[0_0_18px_-8px_rgba(56,189,248,0.8)]"
                >
                  Đồng ý
                </a>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
