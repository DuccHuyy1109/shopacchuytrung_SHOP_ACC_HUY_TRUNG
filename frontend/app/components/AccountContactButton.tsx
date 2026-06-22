"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ContactInfo } from "../lib/types";
import { BadgeCheck, Facebook, MessageCircle, X } from "./icons";
import ModalPortal from "./ModalPortal";

export default function AccountContactButton({
  accountId,
  accountCode,
  compact = false,
}: {
  accountId: number;
  accountCode: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.phone) {
      setOpen(true);
      setContact(null);
      setBusy(false);
      setError("Bạn cần cập nhật số điện thoại trong hồ sơ trước khi liên hệ mua.");
      return;
    }

    setOpen(true);
    setContact(null);
    setError("");
    setBusy(true);
    try {
      const res = await api.post<ContactInfo>(`/api/accounts/${accountId}/contact`);
      setContact(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  function close(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(false);
    setContact(null);
    setError("");
  }

  // Nội dung kết quả (dùng chung cho lớp phủ trong thẻ & modal chi tiết).
  const body = (
    <>
      {busy ? (
        <div className="text-center py-6 text-zinc-400">Đang gửi yêu cầu...</div>
      ) : contact ? (
        <>
          <div className="flex items-center gap-2 font-display font-bold text-lg text-emerald-400 uppercase tracking-wide">
            <BadgeCheck className="w-6 h-6 shrink-0" />
            Đã gửi yêu cầu mua acc!
          </div>
          <p className="text-sm text-zinc-400 mt-2">
            Thông tin của bạn đã được gửi tới shop. Liên hệ ngay qua{" "}
            <b className="text-zinc-200">{contact.name}</b> để mua acc{" "}
            <b className="text-zinc-200">{accountCode}</b>:
          </p>
          <div className="mt-4 space-y-2.5">
            {contact.zalo_link && (
              <a
                href={contact.zalo_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <MessageCircle className="w-5 h-5" />
                Nhắn Zalo
              </a>
            )}
            {contact.facebook_link && (
              <a
                href={contact.facebook_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <Facebook className="w-5 h-5" />
                Nhắn Facebook
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="text-ember-400 text-sm py-4 flex items-center gap-2">
          <X className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      <button
        onClick={close}
        className="w-full mt-5 border border-ink-700 text-zinc-300 hover:text-white hover:border-fire-500 py-2.5 rounded-lg transition"
      >
        Đóng
      </button>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? "shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-fire-400/40 bg-transparent text-fire-300 hover:bg-fire-500/10 hover:border-fire-300/60 shadow-[0_0_8px_rgba(255,120,0,0.15)] hover:shadow-[0_0_12px_rgba(255,120,0,0.25)] text-xs font-bold tracking-wide transition-all duration-300"
            : "w-full justify-center inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-fire-400/40 bg-transparent text-fire-300 hover:bg-fire-500/10 hover:border-fire-300/60 shadow-[0_0_10px_rgba(255,120,0,0.15)] hover:shadow-[0_0_15px_rgba(255,120,0,0.25)] transition-all duration-300"
        }
      >
        <MessageCircle className={compact ? "w-3.5 h-3.5" : "w-5 h-5"} />
        {compact ? "Liên hệ" : "Liên hệ mua acc này"}
      </button>

      {/* compact: lớp phủ nằm GỌN TRONG thẻ (absolute theo thẻ relative) -> không
          bị transform của thẻ làm nhảy ra ngoài / nhấp nháy. */}
      {open && compact && (
        <div
          className="absolute inset-0 z-30 grid place-items-center p-3 bg-ink-950/92 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="surface w-full max-h-full overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {body}
          </div>
        </div>
      )}

      {/* không compact (trang chi tiết): modal thật, render ra body qua Portal. */}
      {open && !compact && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[80] bg-ink-950/80 backdrop-blur-md grid place-items-center p-4"
            onClick={close}
          >
            <div
              className="surface max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {body}
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
