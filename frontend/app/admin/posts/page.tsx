"use client";

import { useCallback, useEffect, useState } from "react";
import AdminAccountModal from "../../components/AdminAccountModal";
import BulkBar from "../../components/admin/BulkBar";
import DeleteProgressModal from "../../components/admin/DeleteProgressModal";
import { useSelection } from "../../components/admin/useSelection";
import Lightbox from "../../components/Lightbox";
import PhoneZaloLink from "../../components/PhoneZaloLink";
import { api, imageUrl } from "../../lib/api";
import { POST_STATUS_LABELS, formatDate, formatPrice } from "../../lib/format";
import type { Page, PostImage } from "../../lib/types";
import { Pager } from "../orders/page";

interface Author {
  id: number;
  username: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}
interface AdminPost {
  id: number;
  post_type: "buy" | "sell";
  title: string | null;
  caption: string | null;
  price: number | null;
  status: string;
  is_pinned: boolean;
  created_at: string | null;
  author: Author | null;
  images: PostImage[];
}
interface PostContact {
  id: number;
  post_id: number;
  interested_role: string;
  created_at: string | null;
  post: {
    title: string | null;
    post_type: string;
    images: PostImage[];
  } | null;
  interested_user: Author | null;
  poster_user: Author | null;
}
interface AccountContact {
  id: number;
  account_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  created_at: string | null;
  account: { account_code: string; sale_price: number } | null;
  user: Author | null;
}

const ACC_CONTACT_STATUS: Record<string, string> = {
  pending: "Chưa xử lý",
  processing: "Đang xử lý",
  done: "Đã xử lý",
};

export default function AdminPostsPage() {
  const [tab, setTab] = useState<"posts" | "postContacts" | "accContacts">(
    "accContacts",
  );
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Liên hệ & Bài đăng</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { k: "accContacts", label: "Liên hệ mua acc" },
          { k: "posts", label: "Bài đăng" },
          { k: "postContacts", label: "Liên hệ qua bài đăng" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as typeof tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === t.k
                ? "bg-orange-500 text-white"
                : "bg-white border border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "posts" && <PostsTab />}
      {tab === "postContacts" && <PostContactsTab />}
      {tab === "accContacts" && <AccContactsTab />}
    </div>
  );
}

function PostsTab() {
  const [data, setData] = useState<Page<AdminPost> | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ images: string[]; start: number } | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulk, setBulk] = useState<number[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    api
      .get<Page<AdminPost>>(`/api/admin/posts?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q, status]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function setPostStatus(id: number, s: string) {
    await api.put(`/api/admin/posts/${id}/status`, { status: s });
    load();
  }
  async function bulkStatus(s: "approved" | "rejected") {
    await api.post("/api/admin/posts/bulk-status", {
      ids: [...selected],
      status: s,
    });
    setSelected(new Set());
    load();
  }
  async function pinPost(p: AdminPost) {
    await api.put(`/api/admin/posts/${p.id}/pin`, { is_pinned: !p.is_pinned });
    load();
  }
  function remove(id: number) {
    if (confirm("Xóa bài đăng này? Ảnh cũng bị xóa.")) setBulk([id]);
  }

  return (
    <div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm ID bài, tiêu đề, nội dung, người đăng..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(POST_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="btn-primary"
        >
          Tìm
        </button>
        {(q || status) && (
          <button
            onClick={() => {
              setQ("");
              setStatus("");
              setPage(1);
            }}
            className="btn-ghost"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm flex-wrap">
          <span className="font-medium">Đã chọn {selected.size} bài:</span>
          <button
            onClick={() => bulkStatus("approved")}
            className="px-3 py-1 rounded bg-green-600 text-white"
          >
            Duyệt
          </button>
          <button
            onClick={() => bulkStatus("rejected")}
            className="px-3 py-1 rounded bg-amber-600 text-white"
          >
            Từ chối
          </button>
          <button
            onClick={() => {
              if (confirm(`Xóa ${selected.size} bài đăng đã chọn? Ảnh cũng bị xóa.`))
                setBulk([...selected]);
            }}
            className="px-3 py-1 rounded bg-red-600 text-white"
          >
            Xóa
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-slate-500 hover:underline"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 py-8 text-center">Đang tải...</div>
      ) : data && data.items.length ? (
        <div className="space-y-3">
          {data.items.map((p) => (
            <div
              key={p.id}
              className="admin-post-card"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="admin-id-badge">ID #{p.id}</span>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="w-4 h-4"
                />
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    p.post_type === "sell"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {p.post_type === "sell" ? "CẦN BÁN" : "CẦN MUA"}
                </span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                  {POST_STATUS_LABELS[p.status] || p.status}
                </span>
                {p.is_pinned && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                    📌 Ghim
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  {formatDate(p.created_at)}
                </span>
              </div>
              <h3 className="font-display text-xl font-black uppercase mt-3 text-white">
                {p.title || "(Không tiêu đề)"}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.caption}</p>
              <div className="text-sm text-red-600 font-black mt-2">
                {p.price ? formatPrice(p.price) : "Thỏa thuận"}
              </div>
              {p.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() =>
                        setViewer({
                          images: p.images.map((im) => im.image_url),
                          start: i,
                        })
                      }
                      className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden hover:ring-2 hover:ring-orange-400 transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl(img.image_url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {p.author && (
                <div className="admin-author-panel mt-3">
                  <div className="admin-author-title">Người đăng</div>
                  <div className="admin-author-grid">
                    <InfoChip label="User ID" value={`#${p.author.id}`} />
                    <InfoChip label="Tài khoản" value={`@${p.author.username}`} />
                    <InfoChip label="Họ tên" value={p.author.full_name || "—"} />
                    <InfoChip
                      label="SĐT"
                      value={<PhoneZaloLink phone={p.author.phone} />}
                    />
                    <InfoChip label="Email" value={p.author.email || "—"} wide />
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-2 text-sm">
                {p.status !== "approved" && (
                  <button
                    onClick={() => setPostStatus(p.id, "approved")}
                    className="text-green-600 hover:underline"
                  >
                    Duyệt
                  </button>
                )}
                {p.status !== "rejected" && (
                  <button
                    onClick={() => setPostStatus(p.id, "rejected")}
                    className="text-amber-600 hover:underline"
                  >
                    Từ chối
                  </button>
                )}
                <button
                  onClick={() => pinPost(p)}
                  className="text-orange-600 hover:underline"
                >
                  {p.is_pinned ? "Bỏ ghim" : "Ghim"}
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-red-600 hover:underline"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Chưa có bài đăng." />
      )}
      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}
      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="bài đăng"
          deleteOne={(id) => api.del(`/api/admin/posts/${id}`)}
          onClose={() => {
            setBulk(null);
            setSelected(new Set());
            load();
          }}
        />
      )}
      {viewer && (
        <Lightbox
          images={viewer.images}
          start={viewer.start}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

function PostContactsTab() {
  const [data, setData] = useState<Page<PostContact> | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [viewer, setViewer] = useState<{ images: string[]; start: number } | null>(
    null,
  );
  const sel = useSelection<number>();
  const [bulk, setBulk] = useState<number[] | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    api
      .get<Page<PostContact>>(`/api/admin/post-contacts?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null));
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  function removeOne(id: number) {
    if (confirm("Xóa liên hệ này?")) setBulk([id]);
  }

  if (!data) return <div className="text-slate-500 py-8 text-center">Đang tải...</div>;

  return (
    <div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm ID liên hệ, ID bài, tiêu đề, thông tin hai người khách..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setPage(1);
            }}
            className="btn-ghost"
          >
            Xóa lọc
          </button>
        )}
      </div>
      <BulkBar
        count={sel.count}
        onClear={sel.clear}
        onDelete={() => {
          if (confirm(`Xóa ${sel.count} liên hệ đã chọn?`)) setBulk([...sel.selected]);
        }}
      />
      {!data.items.length ? (
        <Empty text="Chưa có liên hệ nào." />
      ) : (
      <div className="space-y-3">
        {data.items.map((c) => {
          const buyer =
            c.interested_role === "buyer" ? c.interested_user : c.poster_user;
          const seller =
            c.interested_role === "buyer" ? c.poster_user : c.interested_user;
          const imgs = c.post?.images?.map((i) => i.image_url) ?? [];
          return (
            <div
              key={c.id}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    className="size-4 accent-orange-500"
                    checked={sel.isSelected(c.id)}
                    onChange={() => sel.toggle(c.id)}
                  />
                  Chọn
                </label>
                <button
                  onClick={() => removeOne(c.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Xóa
                </button>
              </div>
              {/* Thông tin bài đăng */}
              <div className="flex items-start gap-3">
                {imgs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewer({ images: imgs, start: 0 })}
                    className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden shrink-0 hover:ring-2 hover:ring-orange-400 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl(imgs[0])}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        c.post?.post_type === "sell"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {c.post?.post_type === "sell" ? "CẦN BÁN" : "CẦN MUA"}
                    </span>
                    <span className="font-semibold text-sm truncate">
                      {c.post?.title || `Bài #${c.post_id}`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Liên hệ #{c.id} · {formatDate(c.created_at)} · Bài #{c.post_id}
                  </div>
                </div>
              </div>

              {/* Hai bên mua / bán */}
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <PersonCard role="buyer" person={buyer} />
                <PersonCard role="seller" person={seller} />
              </div>
            </div>
          );
        })}
      </div>
      )}
      <Pager page={page} pages={data.pages} onChange={setPage} />
      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="liên hệ"
          deleteOne={(id) => api.del(`/api/admin/post-contacts/${id}`)}
          onClose={() => {
            setBulk(null);
            sel.clear();
            load();
          }}
        />
      )}
      {viewer && (
        <Lightbox
          images={viewer.images}
          start={viewer.start}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

function PersonCard({
  role,
  person,
}: {
  role: "buyer" | "seller";
  person: Author | null;
}) {
  const isBuyer = role === "buyer";
  return (
    <div
      className={`rounded-lg border p-3 ${
        isBuyer ? "border-blue-200 bg-blue-50/60" : "border-red-200 bg-red-50/60"
      }`}
    >
      <div
        className={`text-xs font-bold mb-2 ${
          isBuyer ? "text-blue-700" : "text-red-700"
        }`}
      >
        {isBuyer ? "🛒 NGƯỜI MUA" : "🏷️ NGƯỜI BÁN"}
      </div>
      {person ? (
        <dl className="space-y-1 text-sm">
          <InfoRow label="Họ tên" value={person.full_name || "—"} />
          <InfoRow label="Tài khoản" value={`@${person.username}`} />
          <InfoRow label="SĐT" value={<PhoneZaloLink phone={person.phone} />} />
          <InfoRow label="Email" value={person.email || "—"} />
        </dl>
      ) : (
        <div className="text-sm text-slate-400">Không có thông tin</div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-500 w-20 shrink-0">{label}</dt>
      <dd className="font-medium text-slate-800 break-all">{value}</dd>
    </div>
  );
}

function InfoChip({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`admin-info-chip ${wide ? "sm:col-span-2" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function AccContactsTab() {
  const [data, setData] = useState<Page<AccountContact> | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [modalAcc, setModalAcc] = useState<number | null>(null);
  const sel = useSelection<number>();
  const [bulk, setBulk] = useState<number[] | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    api
      .get<Page<AccountContact>>(`/api/admin/account-contacts?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null));
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: number, status: string) {
    await api.put(`/api/admin/account-contacts/${id}`, { status });
    load();
  }

  function removeOne(id: number) {
    if (confirm("Xóa liên hệ mua acc này?")) setBulk([id]);
  }

  if (!data)
    return <div className="text-slate-500 py-8 text-center">Đang tải...</div>;

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm ID liên hệ, ID acc, mã acc, tên khách, SĐT, tài khoản..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setPage(1);
            }}
            className="btn-ghost"
          >
            Xóa lọc
          </button>
        )}
      </div>
      <BulkBar
        count={sel.count}
        onClear={sel.clear}
        onDelete={() => {
          if (confirm(`Xóa ${sel.count} liên hệ mua acc đã chọn?`)) setBulk([...sel.selected]);
        }}
      />
      {!data.items.length ? (
        <Empty text="Chưa có liên hệ mua acc nào." />
      ) : (
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  className="size-4 accent-orange-500 align-middle"
                  checked={data.items.length > 0 && data.items.every((c) => sel.isSelected(c.id))}
                  onChange={() => sel.toggleAll(data.items.map((c) => c.id))}
                />
              </th>
              <th className="p-3">ID</th>
              <th className="p-3">Acc</th>
              <th className="p-3">Khách</th>
              <th className="p-3">SĐT</th>
              <th className="p-3">Tài khoản</th>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Trạng thái xử lý</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-orange-500 align-middle"
                    checked={sel.isSelected(c.id)}
                    onChange={() => sel.toggle(c.id)}
                  />
                </td>
                <td className="p-3">
                  <span className="admin-id-badge">#{c.id}</span>
                </td>
                <td className="p-3 font-medium">
                  {c.account ? (
                    <button
                      onClick={() => setModalAcc(c.account_id)}
                      className="text-orange-600 hover:underline font-semibold"
                      title="Xem thông tin acc"
                    >
                      {c.account.account_code}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">{c.customer_name || "—"}</td>
                <td className="p-3">
                  <PhoneZaloLink phone={c.customer_phone} />
                </td>
                <td className="p-3">
                  {c.user ? `@${c.user.username}` : "Khách vãng lai"}
                </td>
                <td className="p-3 text-slate-400">
                  {formatDate(c.created_at)}
                </td>
                <td className="p-3">
                  <select
                    value={c.status}
                    onChange={(e) => changeStatus(c.id, e.target.value)}
                    className={`text-xs rounded px-2 py-1 border-0 font-medium ${
                      statusColor[c.status] || "bg-slate-100"
                    }`}
                  >
                    {Object.entries(ACC_CONTACT_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => removeOne(c.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <Pager page={page} pages={data.pages} onChange={setPage} />
      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="liên hệ"
          deleteOne={(id) => api.del(`/api/admin/account-contacts/${id}`)}
          onClose={() => {
            setBulk(null);
            sel.clear();
            load();
          }}
        />
      )}
      {modalAcc !== null && (
        <AdminAccountModal
          accountId={modalAcc}
          onClose={() => setModalAcc(null)}
        />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-slate-500 py-8 text-center bg-white rounded-lg border border-slate-200">
      {text}
    </div>
  );
}
