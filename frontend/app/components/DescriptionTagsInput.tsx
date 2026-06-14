"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

interface DescriptionTag {
  id: number;
  text: string;
  gia_tien?: number;
  tag_type: number;
  sort_order: number;
}

/** Mỗi mục mô tả tách nhau bằng xuống dòng khi lưu vào trường description. */
const SEP = "\n";

/**
 * Ô nhập mô tả tài khoản dạng "chip": gõ -> gợi ý từ danh sách mẫu mô tả,
 * chọn -> hiện chip có dấu ×. Nếu từ chưa có trong danh sách thì có nút +
 * để thêm luôn vào danh sách mẫu (lưu ở backend), dùng lại cho lần sau.
 */
export default function DescriptionTagsInput({
  value,
  onChange,
  endpoint = "/api/admin/description-tags",
  allowCreate = true,
  placeholder,
  variant = "light",
  tagType,
}: {
  value: string;
  onChange: (v: string) => void;
  endpoint?: string;
  allowCreate?: boolean;
  placeholder?: string;
  variant?: "light" | "dark";
  /** Lọc gợi ý theo loại: 1 = đặc điểm chung, 2 = súng nâng cấp. Bỏ trống = tất cả. */
  tagType?: number;
}) {
  const selected = useMemo(
    () =>
      value
        .split(SEP)
        .map((s) => s.trim())
        .filter(Boolean),
    [value],
  );
  const [tags, setTags] = useState<DescriptionTag[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadTags = () =>
    api
      .get<DescriptionTag[]>(endpoint)
      .then(setTags)
      .catch(() => {});

  useEffect(() => {
    loadTags();
  }, [endpoint]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function commit(next: string[]) {
    // Khử trùng lặp, giữ nguyên thứ tự.
    const seen = new Set<string>();
    const uniq = next.filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    onChange(uniq.join(SEP));
  }

  function addChip(text: string) {
    const t = text.trim();
    if (!t) return;
    commit([...selected, t]);
    setQuery("");
    setOpen(false);
  }

  function removeChip(idx: number) {
    commit(selected.filter((_, i) => i !== idx));
  }

  // Lọc theo loại: tag_type=2 là súng nâng cấp, còn lại coi là đặc điểm chung.
  const visibleTags =
    tagType == null
      ? tags
      : tags.filter((t) =>
          tagType === 2 ? Number(t.tag_type) === 2 : Number(t.tag_type) !== 2,
        );

  const q = query.trim().toLowerCase();
  const suggestions = visibleTags
    .filter((t) => t.text.toLowerCase().includes(q))
    .filter((t) => !selected.some((s) => s.toLowerCase() === t.text.toLowerCase()))
    .slice(0, 8);
  const exactExists =
    visibleTags.some((t) => t.text.toLowerCase() === q) ||
    selected.some((s) => s.toLowerCase() === q);

  async function createAndAdd() {
    const text = query.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await api.post("/api/admin/description-tags", {
        text,
        ...(tagType != null ? { tag_type: tagType } : {}),
      });
      await loadTags();
    } catch {
      /* trùng hoặc lỗi nhẹ -> vẫn thêm vào acc */
    } finally {
      setSaving(false);
    }
    addChip(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) addChip(suggestions[0].text);
      else if (allowCreate && q) createAndAdd();
    } else if (e.key === "Backspace" && !query && selected.length) {
      removeChip(selected.length - 1);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div
        className={`flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border p-2 focus-within:border-orange-500 ${
          variant === "dark"
            ? "border-ink-700 bg-ink-950/70 shadow-[0_0_24px_-18px_rgba(255,106,0,0.75)]"
            : "border-slate-300 bg-white"
        }`}
      >
        {selected.map((t, i) => (
          <span
            key={t + i}
            className={`chip-pop inline-flex items-center gap-1 rounded-full text-xs font-medium pl-3 pr-1 py-1 ${
              variant === "dark"
                ? "border border-fire-500/30 bg-fire-500/12 text-fire-200"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {t}
            <button
              type="button"
              onClick={() => removeChip(i)}
              aria-label={`Xóa ${t}`}
              className={`grid h-4 w-4 place-items-center rounded-full leading-none ${
                variant === "dark"
                  ? "bg-fire-500/20 text-fire-100 hover:bg-fire-500/35"
                  : "bg-orange-200 text-orange-700 hover:bg-orange-300"
              }`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className={`min-w-[140px] flex-1 bg-transparent py-1 text-sm outline-none ${
            variant === "dark"
              ? "text-zinc-100 placeholder:text-zinc-600"
              : "text-zinc-950 placeholder:text-slate-400"
          }`}
          placeholder={
            selected.length
              ? "Thêm mô tả..."
              : placeholder || "Nhập để gợi ý (vd: 17 nâng cấp)..."
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && (
        <div
          className={`absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border py-1 text-sm shadow-lg ${
            variant === "dark"
              ? "border-fire-500/25 bg-ink-950 text-zinc-200 shadow-[0_18px_42px_-20px_rgba(255,77,0,0.85)]"
              : "border-slate-200 bg-white"
          }`}
        >
          {suggestions.map((s, idx) => (
            <button
              key={`description-suggestion-${s.id}-${idx}`}
              type="button"
              onClick={() => addChip(s.text)}
              className={`block w-full px-3 py-2 text-left ${
                variant === "dark"
                  ? "hover:bg-fire-500/10 hover:text-white"
                  : "hover:bg-orange-50"
              }`}
            >
              {s.text}
            </button>
          ))}
          {allowCreate && q && !exactExists && (
            <button
              type="button"
              onClick={createAndAdd}
              disabled={saving}
              className={`flex w-full items-center gap-2 border-t px-3 py-2 text-left text-orange-600 disabled:opacity-50 ${
                variant === "dark"
                  ? "border-ink-800 hover:bg-fire-500/10"
                  : "border-slate-100 hover:bg-orange-50"
              }`}
            >
              <span className="grid place-items-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs leading-none">
                +
              </span>
              Thêm &ldquo;{query.trim()}&rdquo; vào danh sách mô tả
            </button>
          )}
          {suggestions.length === 0 && !q && (
            <div className={`px-3 py-2 ${variant === "dark" ? "text-zinc-500" : "text-slate-400"}`}>
              Gõ để tìm mẫu mô tả có sẵn...
            </div>
          )}
          {suggestions.length === 0 && q && exactExists && (
            <div className={`px-3 py-2 ${variant === "dark" ? "text-zinc-500" : "text-slate-400"}`}>Đã thêm mô tả này rồi.</div>
          )}
        </div>
      )}
    </div>
  );
}
