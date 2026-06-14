"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, imageUrl, uploadImages } from "../lib/api";
import { renderRichText } from "../lib/format";
import type { Announcement } from "../lib/types";

type Draft = {
  title: string;
  content: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

const BLANK: Draft = {
  title: "",
  content: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
};

export default function AnnouncementsManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"new" | number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Announcement[]>("/api/admin/announcements")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Xóa thông báo này?")) return;
    await api.del(`/api/admin/announcements/${id}`);
    load();
  }
  async function toggle(a: Announcement) {
    await api.put(`/api/admin/announcements/${a.id}`, { is_active: !a.is_active });
    load();
  }

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  if (editing !== null) {
    const cur =
      editing === "new" ? null : items.find((x) => x.id === editing) || null;
    return (
      <AnnForm
        initial={
          cur
            ? {
                title: cur.title || "",
                content: cur.content || "",
                image_url: cur.image_url || "",
                is_active: cur.is_active,
                sort_order: cur.sort_order,
              }
            : BLANK
        }
        isNew={editing === "new"}
        onCancel={() => setEditing(null)}
        onSave={async (d) => {
          if (editing === "new") await api.post("/api/admin/announcements", d);
          else await api.put(`/api/admin/announcements/${editing}`, d);
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setEditing("new")} className="btn-primary">
        + Thêm thông báo
      </button>
      <p className="text-xs text-slate-500">
        Thông báo <b>đang hiện</b> sẽ bật popup khi khách vào web. Nhiều hơn 2
        thông báo sẽ tự chạy slideshow.
      </p>
      {items.map((a, idx) => (
        <div
          key={`announcement-${a.id}-${idx}`}
          className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3"
        >
          {a.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(a.image_url)}
              alt=""
              className="w-12 h-12 rounded object-cover border border-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded bg-slate-100 grid place-items-center text-lg">
              🔔
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">
              {a.title || "(Không tiêu đề)"}
            </div>
            <div className="text-xs text-slate-400">
              {a.is_active ? "Đang hiện" : "Đang ẩn"} · thứ tự {a.sort_order}
            </div>
          </div>
          <div className="space-x-3 text-sm shrink-0">
            <button
              onClick={() => toggle(a)}
              className={
                a.is_active
                  ? "text-amber-600 hover:underline"
                  : "text-green-600 hover:underline"
              }
            >
              {a.is_active ? "Ẩn" : "Hiện"}
            </button>
            <button
              onClick={() => setEditing(a.id)}
              className="text-orange-600 hover:underline"
            >
              Sửa
            </button>
            <button
              onClick={() => remove(a.id)}
              className="text-red-600 hover:underline"
            >
              Xóa
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-slate-500 text-sm">Chưa có thông báo.</div>
      )}
    </div>
  );
}

function AnnForm({
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
  const taRef = useRef<HTMLTextAreaElement>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setD((p) => ({ ...p, [k]: v }));
  }

  // Bọc đoạn đang chọn bằng token định dạng (vd ** cho đậm).
  function wrap(token: string) {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = d.content.slice(s, e) || "chữ";
    set("content", d.content.slice(0, s) + token + sel + token + d.content.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + token.length, s + token.length + sel.length);
    });
  }
  // Thêm tiền tố vào đầu dòng hiện tại (vd "# " cho tiêu đề).
  function prefixLine(prefix: string) {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const ls = d.content.lastIndexOf("\n", s - 1) + 1;
    set("content", d.content.slice(0, ls) + prefix + d.content.slice(ls));
    requestAnimationFrame(() => ta.focus());
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const [url] = await uploadImages([file], "thong_bao");
      set("image_url", url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải ảnh");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
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

  return (
    <div className="bg-white rounded-lg border border-orange-300 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {isNew ? "Thêm thông báo" : "Sửa thông báo"}
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
          placeholder="VD: SHOP ACC UY TÍN"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Nội dung
        </label>
        <div className="flex flex-wrap gap-1 mb-1">
          {[
            { t: "**", l: "B", cls: "font-bold" },
            { t: "__", l: "U", cls: "underline" },
            { t: "*", l: "I", cls: "italic" },
            { t: "==", l: "Cam", cls: "text-orange-500 font-semibold" },
          ].map((b) => (
            <button
              key={b.l}
              type="button"
              onClick={() => wrap(b.t)}
              className={`px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 ${b.cls}`}
            >
              {b.l}
            </button>
          ))}
          <button
            type="button"
            onClick={() => prefixLine("# ")}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 font-bold"
          >
            Tiêu đề
          </button>
        </div>
        <textarea
          ref={taRef}
          className="input"
          rows={6}
          value={d.content}
          onChange={(e) => set("content", e.target.value)}
          placeholder={"# SHOP ACC UY TÍN\n__CHẤT LƯỢNG__\nZalo: 0868994712"}
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Định dạng: <code>**đậm**</code> · <code>__gạch chân__</code> ·{" "}
          <code>*nghiêng*</code> · <code>==tô cam==</code> · đầu dòng{" "}
          <code># </code> = tiêu đề lớn.
        </p>
        {d.content.trim() && (
          <div className="mt-2">
            <div className="text-[11px] text-slate-400 mb-1">Xem trước:</div>
            <div
              className="bg-slate-900 text-white rounded-lg p-3 text-center text-sm space-y-0.5"
              dangerouslySetInnerHTML={{ __html: renderRichText(d.content) }}
            />
          </div>
        )}
      </div>

      <div>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-orange-600">
          <span className="border border-orange-300 rounded px-3 py-1.5 hover:bg-orange-50">
            {uploading ? "Đang tải ảnh..." : "🖼️ Thêm/đổi ảnh"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </label>
        {d.image_url && (
          <div className="relative inline-block mt-2 ml-2 align-middle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(d.image_url)}
              alt=""
              className="w-24 h-24 object-cover rounded border border-slate-200"
            />
            <button
              type="button"
              onClick={() => set("image_url", "")}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
            >
              ×
            </button>
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
            checked={d.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
          />
          Đang hiện (bật popup)
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
