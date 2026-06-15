"use client";

/** Thanh hành động nổi khi đang tích chọn nhiều dòng để xóa. */
export default function BulkBar({
  count,
  onClear,
  onDelete,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}) {
  if (count <= 0) return null;
  return (
    <div className="sticky top-2 z-20 mb-3 flex items-center gap-3 rounded-lg border border-fire-500/40 bg-ink-950/95 px-4 py-2.5 shadow-[0_0_28px_-12px_rgba(255,77,0,0.8)] backdrop-blur">
      <span className="text-sm font-semibold text-zinc-200">
        Đã chọn <b className="text-fire-300">{count}</b>
      </span>
      <button
        onClick={onClear}
        className="text-sm text-zinc-400 hover:text-white transition"
      >
        Bỏ chọn
      </button>
      <button
        onClick={onDelete}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-ember-500 to-red-600 px-4 py-1.5 text-sm font-bold text-white hover:brightness-110 transition shadow-[0_0_18px_-8px_rgba(239,68,68,0.9)]"
      >
        Xóa {count} mục
      </button>
    </div>
  );
}
