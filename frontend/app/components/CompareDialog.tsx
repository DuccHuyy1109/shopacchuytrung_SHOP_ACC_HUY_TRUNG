"use client";

import { useState } from "react";
import { api } from "../lib/api";
import type { AccountDetail } from "../lib/types";
import AccountComparePanel from "./AccountComparePanel";
import TechModal from "./TechModal";
import { ArrowLeftRight } from "./icons";

/**
 * Hộp thoại so sánh: nhập 2 mã acc -> hiện 2 cửa sổ chi tiết đầy đủ cạnh nhau
 * (PC: trái/phải; điện thoại: trên/dưới).
 */
export default function CompareDialog({
  initialCode = "",
  onClose,
}: {
  initialCode?: string;
  onClose: () => void;
}) {
  const [code1, setCode1] = useState(initialCode);
  const [code2, setCode2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accs, setAccs] = useState<[AccountDetail, AccountDetail] | null>(null);

  async function compare(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code1.trim() || !code2.trim()) {
      setError("Vui lòng nhập đủ mã 2 acc.");
      return;
    }
    setBusy(true);
    try {
      const [a, b] = await Promise.all([
        api.get<AccountDetail>(
          `/api/accounts/by-code/${encodeURIComponent(code1.trim())}`,
        ),
        api.get<AccountDetail>(
          `/api/accounts/by-code/${encodeURIComponent(code2.trim())}`,
        ),
      ]);
      setAccs([a, b]);
    } catch {
      setError(
        "Không tìm thấy 1 trong 2 acc. Kiểm tra lại mã (vd: #769865).",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <TechModal title="So sánh acc" Icon={ArrowLeftRight} onClose={onClose} maxWidth="max-w-5xl">
      {!accs ? (
        <form onSubmit={compare} className="space-y-3.5 max-w-md mx-auto">
          <p className="text-sm text-zinc-400">
            Nhập mã 2 acc muốn so sánh (vd:{" "}
            <b className="text-zinc-200">#769865</b>) rồi bấm So sánh.
          </p>
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Mã acc 1</label>
            <input
              className="field"
              value={code1}
              onChange={(e) => setCode1(e.target.value)}
              placeholder="#XXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Mã acc 2</label>
            <input
              className="field"
              value={code2}
              onChange={(e) => setCode2(e.target.value)}
              placeholder="#XXXXXX"
            />
          </div>
          {error && (
            <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button disabled={busy} className="btn-fire w-full justify-center disabled:opacity-60">
            {busy ? "Đang tải..." : "So sánh"}
          </button>
        </form>
      ) : (
        <div>
          <div className="grid h-[70vh] grid-rows-[1fr_auto_1fr] md:h-auto md:grid-cols-[1fr_1px_1fr] md:grid-rows-none md:gap-x-4 md:gap-y-4">
            <div className="min-h-0 overflow-y-auto pr-1 md:max-h-[66vh] md:pr-2">
              <AccountComparePanel acc={accs[0]} />
            </div>
            <div className="my-3 h-px bg-gradient-to-r from-transparent via-gold-500/45 to-transparent md:my-0 md:h-auto md:bg-gradient-to-b" />
            <div className="min-h-0 overflow-y-auto pr-1 md:max-h-[66vh] md:pr-2">
              <AccountComparePanel acc={accs[1]} />
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-gold-500/20">
            <button
              type="button"
              onClick={() => setAccs(null)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg clip-chien-sm border border-gold-500/40 bg-ink-900/60 text-gold-300 hover:bg-gold-500/10 hover:border-gold-400/60 font-semibold text-sm transition"
            >
              <ArrowLeftRight className="w-4 h-4" />
              So sánh 2 acc khác
            </button>
          </div>
        </div>
      )}
    </TechModal>
  );
}
