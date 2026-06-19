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
  const inputRef = useRef<HTMLInputElement>(null);
  // Chỉ cho sửa/xóa mẫu mô tả khi dùng ở ngữ cảnh admin.
  const canManage = endpoint.includes("/admin/");
  // Đang sửa mẫu mô tả nào (id) + nội dung đang sửa.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

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
    // Giữ bảng gợi ý mở + giữ focus (không ẩn bàn phím mobile) để gõ tiếp.
    setOpen(true);
    inputRef.current?.focus();
  }

  function removeChip(idx: number) {
    commit(selected.filter((_, i) => i !== idx));
  }

  // Xóa hẳn 1 mẫu mô tả khỏi danh sách (DB) — chỉ ở ngữ cảnh admin.
  async function deleteTag(id: number) {
    try {
      await api.del(`/api/admin/description-tags/${id}`);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch {
      /* bỏ qua lỗi nhẹ */
    }
    inputRef.current?.focus();
  }

  function startEdit(tag: DescriptionTag) {
    setEditingId(tag.id);
    setEditText(tag.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    inputRef.current?.focus();
  }

  // Sửa nội dung mẫu mô tả rồi lưu lại vào danh sách (DB).
  async function saveEdit() {
    const id = editingId;
    const text = editText.trim();
    if (id == null || !text) return;
    try {
      await api.put(`/api/admin/description-tags/${id}`, { text });
    } catch {
      // Trùng tên hoặc lỗi -> giữ ô sửa để đổi tên khác.
      return;
    }
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
    setEditingId(null);
    setEditText("");
    inputRef.current?.focus();
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
    .slice(0, 10);
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
          ref={inputRef}
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
          {suggestions.map((s, idx) => {
            const editing = editingId === s.id;
            const iconBtn =
              variant === "dark"
                ? "text-zinc-500 hover:text-white"
                : "text-slate-400 hover:text-slate-700";
            return (
              <div
                key={`description-suggestion-${s.id}-${idx}`}
                className={`flex items-center ${
                  editing
                    ? variant === "dark"
                      ? "bg-fire-500/5"
                      : "bg-orange-50/60"
                    : variant === "dark"
                      ? "hover:bg-fire-500/10"
                      : "hover:bg-orange-50"
                }`}
              >
                {editing ? (
                  <>
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                      className={`min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none ${
                        variant === "dark"
                          ? "text-zinc-100"
                          : "text-zinc-900"
                      }`}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={saveEdit}
                      title="Lưu"
                      aria-label="Lưu"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-base leading-none text-emerald-500 hover:bg-emerald-100/60 hover:text-emerald-600"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={cancelEdit}
                      title="Hủy"
                      aria-label="Hủy"
                      className={`mr-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-base leading-none ${iconBtn}`}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      // preventDefault: không để input mất focus -> giữ bàn phím mobile.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addChip(s.text)}
                      className={`flex-1 px-3 py-2 text-left ${
                        variant === "dark" ? "hover:text-white" : ""
                      }`}
                    >
                      {s.text}
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => startEdit(s)}
                          aria-label={`Sửa "${s.text}"`}
                          title="Sửa"
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm leading-none ${
                            variant === "dark"
                              ? "text-zinc-500 hover:bg-fire-500/20 hover:text-fire-200"
                              : "text-slate-400 hover:bg-orange-100 hover:text-orange-600"
                          }`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => deleteTag(s.id)}
                          aria-label={`Xóa "${s.text}" khỏi danh sách`}
                          title="Xóa khỏi danh sách"
                          className={`mr-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-base leading-none ${
                            variant === "dark"
                              ? "text-zinc-500 hover:bg-ember-500/20 hover:text-ember-300"
                              : "text-slate-400 hover:bg-red-100 hover:text-red-600"
                          }`}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {allowCreate && q && !exactExists && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
