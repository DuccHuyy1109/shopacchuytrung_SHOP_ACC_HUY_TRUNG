"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, imageUrl, uploadImages } from "../lib/api";

interface GuideItem {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  sort_order: number;
  is_published: boolean;
}

type Draft = {
  title: string;
  content: string;
  sort_order: number;
  is_published: boolean;
};

const BLANK: Draft = { title: "", content: "", sort_order: 0, is_published: true };

const IMG_RE = /!\[[^\]]*\]\(([^)]+)\)/g;

function extractImages(content: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IMG_RE);
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out;
}

function removeImageToken(content: string, url: string): string {
  return content
    .split(`![](${url})`)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Lấy thư mục ảnh (guides/<token>) từ ảnh đã có trong nội dung, nếu có. */
function guideFolderFromContent(content: string): string | null {
  const m = content.match(/\/images\/(guides\/[A-Za-z0-9_-]+)\//);
  return m ? m[1] : null;
}

/** Trình quản lý bài Hướng dẫn (có chèn ảnh vào nội dung). */
export default function GuidesManager() {
  const [items, setItems] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"new" | number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<GuideItem[]>("/api/admin/guides")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Xóa bài hướng dẫn này?")) return;
    await api.del(`/api/admin/guides/${id}`);
    load();
  }

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  if (editing !== null) {
    const current =
      editing === "new" ? null : items.find((g) => g.id === editing) || null;
    return (
      <GuideForm
        initial={
          current
            ? {
                title: current.title,
                content: current.content || "",
                sort_order: current.sort_order,
                is_published: current.is_published,
              }
            : BLANK
        }
        isNew={editing === "new"}
        onCancel={() => setEditing(null)}
        onSave={async (d) => {
          if (editing === "new") await api.post("/api/admin/guides", d);
          else await api.put(`/api/admin/guides/${editing}`, d);
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEditing("new")} className="btn-primary">
        + Thêm bài hướng dẫn
      </button>
      {items.map((g, idx) => (
        <div
          key={`guide-manager-${g.id}-${idx}`}
          className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{g.title}</div>
            <div className="text-xs text-slate-400">
              {g.is_published ? "Đã xuất bản" : "Bản nháp"} · /{g.slug}
            </div>
          </div>
          <div className="space-x-3 text-sm shrink-0">
            <button
              onClick={() => setEditing(g.id)}
              className="text-orange-600 hover:underline"
            >
              Sửa
            </button>
            <button
              onClick={() => remove(g.id)}
              className="text-red-600 hover:underline"
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-slate-500 text-sm">Chưa có bài hướng dẫn.</div>
      )}
    </div>
  );
}

function GuideForm({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: Draft;
  isNew: boolean;
  onSave: (d: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const folderRef = useRef("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }

  // Bọc đoạn đang chọn bằng cú pháp (in đậm / nghiêng / gạch chân...)
  function wrapSelection(before: string, after: string) {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || "văn bản";
    set("content", value.slice(0, s) + before + sel + after + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }
  // Thêm tiền tố đầu dòng (cỡ chữ: "# " lớn, "## " vừa)
  function prefixLine(prefix: string) {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    set("content", value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  }

  function ensureFolder(): string {
    if (!folderRef.current) {
      folderRef.current =
        guideFolderFromContent(d.content) || `guides/${crypto.randomUUID()}`;
    }
    return folderRef.current;
  }

  async function onUpload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await uploadImages(files, ensureFolder());
      const md = urls.map((u) => `\n![](${u})\n`).join("");
      setD((p) => ({ ...p, content: (p.content.trimEnd() + md).trim() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải ảnh");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!d.title.trim()) {
      setError("Vui lòng nhập tiêu đề bài hướng dẫn");
      return;
    }
    if (extractImages(d.content).length === 0) {
      setError("Bài hướng dẫn phải có ít nhất 1 ảnh.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({ ...d, title: d.title.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setBusy(false);
    }
  }

  const images = extractImages(d.content);

  return (
    <div className="bg-white rounded-lg border border-orange-300 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {isNew ? "Thêm bài hướng dẫn" : "Sửa bài hướng dẫn"}
        </h3>
        <button onClick={onCancel} className="text-sm text-slate-500">
          ← Quay lại
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Tiêu đề
        </label>
        <input
          className="input"
          value={d.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="VD: Hướng dẫn giao dịch an toàn"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Nội dung
        </label>
        {/* Thanh định dạng: in đậm / nghiêng / gạch chân / cỡ chữ */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <button type="button" onClick={() => wrapSelection("**", "**")} title="In đậm" className="w-8 h-8 text-sm font-bold border border-slate-300 rounded hover:bg-slate-100">B</button>
          <button type="button" onClick={() => wrapSelection("*", "*")} title="In nghiêng" className="w-8 h-8 text-sm italic border border-slate-300 rounded hover:bg-slate-100">I</button>
          <button type="button" onClick={() => wrapSelection("__", "__")} title="Gạch chân" className="w-8 h-8 text-sm underline border border-slate-300 rounded hover:bg-slate-100">U</button>
          <span className="self-stretch w-px bg-slate-200 mx-1" />
          <button type="button" onClick={() => prefixLine("# ")} title="Cỡ chữ lớn" className="px-2.5 h-8 text-sm font-bold border border-slate-300 rounded hover:bg-slate-100">Cỡ lớn</button>
          <button type="button" onClick={() => prefixLine("## ")} title="Cỡ chữ vừa" className="px-2.5 h-8 text-sm font-semibold border border-slate-300 rounded hover:bg-slate-100">Cỡ vừa</button>
        </div>
        <textarea
          ref={taRef}
          className="input font-mono"
          rows={8}
          value={d.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder="Nội dung bài hướng dẫn... Bôi đen chữ rồi bấm B/I/U hoặc Cỡ lớn/vừa."
        />
        <p className="text-xs text-slate-400 mt-1">
          Định dạng: <code className="bg-slate-100 px-1 rounded">**đậm**</code>,{" "}
          <code className="bg-slate-100 px-1 rounded">*nghiêng*</code>,{" "}
          <code className="bg-slate-100 px-1 rounded">__gạch chân__</code>; đầu dòng{" "}
          <code className="bg-slate-100 px-1 rounded"># </code> cỡ lớn,{" "}
          <code className="bg-slate-100 px-1 rounded">## </code> cỡ vừa. Ảnh:{" "}
          <code className="bg-slate-100 px-1 rounded">![](đường-dẫn)</code>.
        </p>
      </div>

      {/* Chèn ảnh */}
      <div>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-orange-600">
          <span className="border border-orange-300 rounded px-3 py-1.5 hover:bg-orange-50">
            {uploading ? "Đang tải ảnh..." : "🖼️ Chèn ảnh vào bài"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(Array.from(e.target.files || []))}
          />
        </label>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((url, i) => (
              <div key={url + i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(url)}
                  alt=""
                  className="w-20 h-20 object-cover rounded border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => set("content", removeImageToken(d.content, url))}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                  aria-label="Bỏ ảnh"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Thứ tự
          </label>
          <input
            className="input"
            type="number"
            value={d.sort_order}
            onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm mt-6">
          <input
            type="checkbox"
            checked={d.is_published}
            onChange={(e) => set("is_published", e.target.checked)}
          />
          Xuất bản (hiển thị cho khách)
        </label>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? "Đang lưu..." : isNew ? "Thêm" : "Lưu"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 rounded"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
