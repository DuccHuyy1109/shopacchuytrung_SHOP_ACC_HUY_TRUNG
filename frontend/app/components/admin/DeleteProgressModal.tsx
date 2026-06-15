"use client";

import { useEffect, useRef, useState } from "react";
import ModalPortal from "../ModalPortal";

type Phase = "running" | "success" | "error";

/**
 * Bảng tiến trình xóa hàng loạt — chặn mọi thao tác trong lúc chạy, hiện % thật
 * (xóa tuần tự từng mục). Xong: thành công thì tự tắt; có lỗi thì báo + nút Đóng.
 */
export default function DeleteProgressModal<T extends string | number>({
  ids,
  deleteOne,
  label = "mục",
  onClose,
}: {
  ids: T[];
  deleteOne: (id: T) => Promise<void>;
  label?: string;
  onClose: (result: { done: number; failed: number }) => void;
}) {
  const total = ids.length;
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const started = useRef(false); // chống StrictMode chạy effect 2 lần

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let okCount = 0;
    let failCount = 0;
    (async () => {
      for (const id of ids) {
        try {
          await deleteOne(id);
          okCount += 1;
          setDone(okCount);
        } catch {
          failCount += 1;
          setFailed(failCount);
        }
      }
      if (failCount === 0) {
        setPhase("success");
        setTimeout(() => onClose({ done: okCount, failed: 0 }), 800);
      } else {
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processed = done + failed;
  const pct = total ? Math.round((processed / total) * 100) : 100;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm grid place-items-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-fire-500/35 bg-ink-950 p-6 text-zinc-200 shadow-[0_0_70px_-16px_rgba(255,77,0,0.8)] text-center">
          {phase === "success" ? (
            <>
              <div className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-2xl">
                ✓
              </div>
              <h3 className="font-display font-bold text-lg uppercase tracking-wide text-emerald-400 mt-3">
                Đã xóa {done} {label}
              </h3>
            </>
          ) : phase === "error" ? (
            <>
              <div className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-ember-500 to-red-600 text-white text-2xl">
                !
              </div>
              <h3 className="font-display font-bold text-lg uppercase tracking-wide text-ember-400 mt-3">
                Hoàn tất với lỗi
              </h3>
              <p className="text-sm text-zinc-400 mt-1.5">
                Thành công <b className="text-emerald-400">{done}</b> · Thất bại{" "}
                <b className="text-ember-400">{failed}</b> / {total}
              </p>
            </>
          ) : (
            <>
              <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
                Đang xóa <span className="text-gradient-fire">{label}</span>...
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {processed} / {total}
                {failed > 0 && (
                  <span className="text-ember-400"> · lỗi {failed}</span>
                )}
              </p>
            </>
          )}

          {/* Thanh tiến trình */}
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-ink-800">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                phase === "error"
                  ? "bg-gradient-to-r from-ember-500 to-red-600"
                  : "bg-gradient-to-r from-fire-500 to-ember-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-zinc-500">{pct}%</div>

          {phase === "error" && (
            <button
              onClick={() => onClose({ done, failed })}
              className="btn-fire w-full justify-center mt-5"
            >
              Đóng
            </button>
          )}
          {phase === "running" && (
            <div className="mt-4 text-xs text-zinc-500">
              Vui lòng không tắt trang trong lúc xóa...
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
