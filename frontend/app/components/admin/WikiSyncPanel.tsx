"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type SyncResult = {
  message: string;
  added: number;
  updated: number;
  scanned: number;
};

export default function WikiSyncPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái hiển thị mục Tra cứu trên web (cấu hình site wiki_enabled).
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setEnabled(s.wiki_enabled === "1"))
      .catch(() => setEnabled(false));
  }, []);

  async function toggle() {
    const next = !enabled;
    setToggling(true);
    try {
      await api.put("/api/admin/site-settings/wiki_enabled", {
        value: next ? "1" : "0",
      });
      setEnabled(next);
    } catch {
      /* giữ nguyên trạng thái nếu lỗi */
    } finally {
      setToggling(false);
    }
  }

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<SyncResult>("/api/admin/wiki/sync");
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Bật/tắt hiển thị trên web */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Hiển thị mục Tra cứu</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bật để hiện mục <b>Tra cứu</b> trên menu web cho khách. Mặc định ẩn.
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={enabled === null || toggling}
            className={`relative h-7 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${
              enabled ? "bg-emerald-500" : "bg-slate-300"
            }`}
            aria-label="Bật/tắt mục Tra cứu"
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                enabled ? "left-7" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <div className="mt-2 text-sm font-semibold">
          {enabled === null ? (
            <span className="text-slate-400">Đang tải...</span>
          ) : enabled ? (
            <span className="text-emerald-600">● Đang HIỆN trên web</span>
          ) : (
            <span className="text-slate-500">● Đang ẨN</span>
          )}
        </div>
      </div>

      {/* Cập nhật dữ liệu */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-800">Dữ liệu Wiki Free Fire</h2>
        <p className="mt-1 text-sm text-slate-500">
          Trang phục, súng &amp; bộ sưu tập lấy từ wiki.ff.garena.vn. Ảnh hiển thị trực
          tiếp từ link gốc (không tải về). Cập nhật vẫn chạy kể cả khi mục đang ẩn.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={busy} className="btn-primary">
            {busy ? "Đang cập nhật..." : "Cập nhật nhanh"}
          </button>
          <span className="text-xs text-slate-400">
            Quét phần mới/thay đổi ở đầu danh sách (vài giây).
          </span>
        </div>

        {result && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="font-semibold">{result.message}</div>
            <div className="mt-1 text-emerald-700">
              Thêm mới: <b>{result.added}</b> · Cập nhật: <b>{result.updated}</b> ·
              Đã quét: <b>{result.scanned}</b> món.
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <b className="text-slate-700">Lưu ý:</b> Toàn bộ dữ liệu được đồng bộ đầy đủ tự
        động mỗi ngày qua GitHub Actions — hoạt động <b>bất kể bật hay tắt</b> hiển thị.
      </div>
    </div>
  );
}
