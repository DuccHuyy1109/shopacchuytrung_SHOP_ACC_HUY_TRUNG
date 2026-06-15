"use client";

import { useCallback, useEffect, useState } from "react";
import AccountDetailModal from "../../components/AccountDetailModal";
import BulkBar from "../../components/admin/BulkBar";
import DeleteProgressModal from "../../components/admin/DeleteProgressModal";
import { useSelection } from "../../components/admin/useSelection";
import DescriptionTagsInput from "../../components/DescriptionTagsInput";
import PhoneZaloLink from "../../components/PhoneZaloLink";
import SelectField from "../../components/SelectField";
import { api, imageUrl, uploadImages } from "../../lib/api";
import { CATEGORY_LABELS, formatDate, formatPrice } from "../../lib/format";
import type { AccountDetail, AccountListItem, Page, Shop } from "../../lib/types";
import { Pager } from "../orders/page";

interface ContactSetting {
  id: number;
  name: string;
}

type FormState = {
  category_type: string;
  shop_id: string;
  contact_id: string;
  original_price: string;
  sale_price: string;
  upgraded_guns_count: string;
  vip_level: string;
  description: string;
  status: string;
  is_featured: boolean;
};

const EMPTY: FormState = {
  category_type: "acc_co",
  shop_id: "",
  contact_id: "",
  original_price: "0",
  sale_price: "0",
  upgraded_guns_count: "0",
  vip_level: "1",
  description: "",
  status: "available",
  is_featured: false,
};

const DEFAULT_MAX_GUNS = 30;

export default function AdminAccountsPage() {
  const [view, setView] = useState<"list" | "purchases">("list");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Quản lý Acc</h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            view === "list"
              ? "bg-orange-500 text-white"
              : "bg-white border border-slate-300"
          }`}
        >
          Danh sách acc
        </button>
        <button
          onClick={() => setView("purchases")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            view === "purchases"
              ? "bg-orange-500 text-white"
              : "bg-white border border-slate-300"
          }`}
        >
          Lịch sử mua acc
        </button>
      </div>
      {view === "list" ? <AccountsListView /> : <PurchaseHistoryView />}
    </div>
  );
}

function AccountsListView() {
  const [data, setData] = useState<Page<AccountListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const sel = useSelection<number>();
  const [bulk, setBulk] = useState<number[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vipFilter, setVipFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [shops, setShops] = useState<Shop[]>([]);
  const [contacts, setContacts] = useState<ContactSetting[]>([]);
  const [maxGuns, setMaxGuns] = useState(DEFAULT_MAX_GUNS);

  const [editing, setEditing] = useState<"new" | number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadInfo, setUploadInfo] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (categoryFilter) p.set("category_type", categoryFilter);
    if (vipFilter) p.set("vip_level", vipFilter);
    if (minPrice.trim()) p.set("min_price", minPrice.trim());
    if (maxPrice.trim()) p.set("max_price", maxPrice.trim());
    api
      .get<Page<AccountListItem>>(`/api/admin/accounts?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q, categoryFilter, vipFilter, minPrice, maxPrice]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get<Shop[]>("/api/admin/shops").then(setShops).catch(() => {});
    api
      .get<ContactSetting[]>("/api/admin/contacts")
      .then(setContacts)
      .catch(() => {});
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => {
        const n = Number(s.max_upgraded_guns);
        if (Number.isFinite(n) && n > 0) setMaxGuns(n);
      })
      .catch(() => {});
  }, []);

  async function openNew() {
    setForm(EMPTY);
    setEditCode("");
    setExistingImages([]);
    setNewFiles([]);
    setError("");
    setEditing("new");
    // Lấy trước mã acc để gom ảnh vào thư mục riêng ngay khi upload.
    try {
      const r = await api.get<{ account_code: string }>(
        "/api/admin/accounts/next-code",
      );
      setEditCode(r.account_code);
    } catch {
      setEditCode("");
    }
  }

  async function openEdit(id: number) {
    setError("");
    const acc = await api.get<AccountDetail>(`/api/admin/accounts/${id}`);
    setForm({
      // Acc cũ loại "theo_gia" (đã bỏ) -> quy về "acc_co".
      category_type:
        acc.category_type === "sieu_pham" || acc.category_type === "acc_thuong"
          ? acc.category_type
          : "acc_co",
      shop_id: acc.shop_id ? String(acc.shop_id) : "",
      contact_id: acc.contact_id ? String(acc.contact_id) : "",
      original_price: String(acc.original_price),
      sale_price: String(acc.sale_price),
      upgraded_guns_count: String(acc.upgraded_guns_count),
      // VIP chỉ 1-8; acc cũ vip=0 -> đưa về 1.
      vip_level: String(acc.vip_level >= 1 && acc.vip_level <= 8 ? acc.vip_level : 1),
      description: acc.description || "",
      status: acc.status,
      is_featured: acc.is_featured,
    });
    setEditCode(acc.account_code);
    setExistingImages(acc.images.map((i) => i.image_url));
    setNewFiles([]);
    setEditing(id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Kiểm tra thông tin bắt buộc trước khi lưu.
    const missing: string[] = [];
    if (!(Number(form.sale_price) > 0)) missing.push("Nhập giá bán lớn hơn 0₫");
    if (existingImages.length + newFiles.length === 0)
      missing.push("Thêm ít nhất 1 ảnh cho acc");
    if (!form.description.trim()) missing.push("Thêm ít nhất 1 mô tả tài khoản");
    if (missing.length) {
      setError(
        "Chưa thể lưu — vui lòng bổ sung:\n" +
          missing.map((m) => "• " + m).join("\n"),
      );
      return;
    }

    setBusy(true);
    try {
      // Gom ảnh vào thư mục theo mã acc (backend tự bỏ ký tự '#').
      const uploaded = newFiles.length
        ? await uploadImages(newFiles, editCode, {
            watermark: true,
            onProgress: (d, t) => setUploadInfo(`Đang tải ảnh ${d}/${t}...`),
          })
        : [];
      setUploadInfo("");
      const payload = {
        ...(editing === "new" && editCode ? { account_code: editCode } : {}),
        category_type: form.category_type,
        shop_id: form.shop_id ? Number(form.shop_id) : null,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        original_price: Number(form.original_price),
        sale_price: Number(form.sale_price),
        upgraded_guns_count: Number(form.upgraded_guns_count),
        vip_level: Number(form.vip_level),
        description: form.description || null,
        status: form.status,
        is_featured: form.is_featured,
        image_urls: [...existingImages, ...uploaded],
      };
      if (editing === "new") {
        await api.post("/api/admin/accounts", payload);
      } else {
        await api.put(`/api/admin/accounts/${editing}`, payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu acc");
    } finally {
      setBusy(false);
      setUploadInfo("");
    }
  }

  function remove(id: number) {
    // Xóa 1 acc cũng đi qua bảng tiến trình cho nhất quán.
    if (confirm("Xóa acc này? Ảnh của acc cũng bị xóa.")) setBulk([id]);
  }

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function moveImage(from: number, to: number) {
    setExistingImages((imgs) => {
      const next = [...imgs];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  }

  // ---- Form view ----
  if (editing !== null) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            {editing === "new" ? "Thêm acc mới" : `Sửa acc ${editCode}`}
          </h1>
          <button
            onClick={() => setEditing(null)}
            className="text-sm text-slate-500"
          >
            ← Quay lại danh sách
          </button>
        </div>
        <form
          onSubmit={save}
          className="bg-white rounded-lg border border-slate-200 p-5 grid sm:grid-cols-2 gap-4"
        >
          {editing === "new" ? (
            <div className="sm:col-span-2 text-sm bg-amber-50 text-amber-700 rounded p-2">
              Mã acc: <b>{editCode || "đang tạo..."}</b> (tạo sẵn) — ảnh sẽ lưu
              trong thư mục riêng theo mã này. Danh mục giá tự xếp theo giá bán.
            </div>
          ) : (
            <div className="sm:col-span-2 text-sm bg-slate-50 rounded p-2">
              Mã acc: <b>{editCode}</b> (hệ thống tự tạo, không sửa được)
            </div>
          )}
          <L label="Loại acc">
            <select
              className="input"
              value={form.category_type}
              onChange={(e) => setF("category_type", e.target.value)}
            >
              <option value="acc_co">Acc cổ</option>
              <option value="sieu_pham">Acc siêu phẩm</option>
              <option value="acc_thuong">Acc thường</option>
            </select>
          </L>
          <L label="Shop (chỉ admin thấy)">
            <select
              className="input"
              value={form.shop_id}
              onChange={(e) => setF("shop_id", e.target.value)}
            >
              <option value="">-- Không --</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </L>
          <L label="Liên hệ mua">
            <select
              className="input"
              value={form.contact_id}
              onChange={(e) => setF("contact_id", e.target.value)}
            >
              <option value="">-- Mặc định --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </L>
          <L label="Giá gốc (₫)">
            <input
              className="input"
              type="number"
              value={form.original_price}
              onChange={(e) => setF("original_price", e.target.value)}
            />
          </L>
          <L label="Giá bán (₫)">
            <input
              className="input"
              type="number"
              value={form.sale_price}
              onChange={(e) => setF("sale_price", e.target.value)}
            />
          </L>
          <L label="Số súng nâng cấp">
            <select
              className="input"
              value={form.upgraded_guns_count}
              onChange={(e) => setF("upgraded_guns_count", e.target.value)}
            >
              {Array.from(
                { length: Math.max(maxGuns, Number(form.upgraded_guns_count) || 0) + 1 },
                (_, i) => i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} súng
                </option>
              ))}
            </select>
          </L>
          <L label="VIP (1-8)">
            <select
              className="input"
              value={form.vip_level}
              onChange={(e) => setF("vip_level", e.target.value)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
                <option key={v} value={v}>
                  VIP {v}
                </option>
              ))}
            </select>
          </L>
          <L label="Trạng thái">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setF("status", e.target.value)}
            >
              <option value="available">Còn hàng</option>
              <option value="sold">Đã bán</option>
              <option value="hidden">Ẩn</option>
            </select>
          </L>
          <L label="Acc nổi bật">
            <label className="flex items-center gap-2 text-sm h-9">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setF("is_featured", e.target.checked)}
              />
              Hiển thị ở mục nổi bật
            </label>
          </L>
          <div className="sm:col-span-2">
            <L label="Mô tả tài khoản">
              <DescriptionTagsInput
                value={form.description}
                onChange={(v) => setF("description", v)}
                tagType={1}
              />
              <p className="text-xs text-slate-400 mt-1">
                Gõ để gợi ý mô tả có sẵn, chọn để thêm thành thẻ. Từ chưa có sẽ
                hiện nút + để lưu vào danh sách.
              </p>
            </L>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Ảnh acc</label>
            {existingImages.length > 0 && (
              <>
                <p className="text-xs text-slate-400 mb-1">
                  Kéo-thả để sắp xếp — ảnh đầu tiên là ảnh đại diện.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingImages.map((url, i) => (
                    <div
                      key={url}
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i);
                        setDragIdx(null);
                      }}
                      onDragEnd={() => setDragIdx(null)}
                      className={`relative cursor-move rounded border ${
                        dragIdx === i
                          ? "opacity-40 border-orange-400"
                          : "border-slate-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl(url)}
                        alt=""
                        className="w-20 h-20 object-cover rounded"
                      />
                      {i === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-orange-500/90 text-white text-[10px] text-center rounded-b">
                          Đại diện
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setExistingImages((imgs) =>
                            imgs.filter((_, idx) => idx !== i),
                          )
                        }
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                const room = Math.max(0, 25 - existingImages.length);
                if (picked.length > room) {
                  setError(`Mỗi acc tối đa 25 ảnh (còn ${room} chỗ trống).`);
                  setNewFiles(picked.slice(0, room));
                } else {
                  setNewFiles(picked);
                }
              }}
              className="text-sm"
            />
            {newFiles.length > 0 && (
              <span className="text-xs text-slate-500 ml-2">
                + {newFiles.length} ảnh mới
              </span>
            )}
          </div>
          {error && (
            <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 whitespace-pre-line">
              {error}
            </div>
          )}
          <div className="sm:col-span-2">
            <button disabled={busy} className="btn-primary">
              {busy ? uploadInfo || "Đang lưu..." : "Lưu acc"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div>
      <div className="flex items-center justify-end mb-4 flex-wrap gap-2">
        <button onClick={openNew} className="btn-primary">
          + Thêm acc
        </button>
      </div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm ID, mã acc, mô tả..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <SelectField
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
          placeholder="Loại acc"
          options={[
            { value: "", label: "Tất cả loại acc" },
            { value: "acc_co", label: CATEGORY_LABELS.acc_co || "Acc cổ" },
            { value: "sieu_pham", label: CATEGORY_LABELS.sieu_pham || "Acc siêu phẩm" },
            { value: "acc_thuong", label: CATEGORY_LABELS.acc_thuong || "Acc thường" },
          ]}
        />
        <SelectField
          value={vipFilter}
          onChange={(value) => {
            setVipFilter(value);
            setPage(1);
          }}
          placeholder="VIP"
          options={[
            { value: "", label: "Tất cả VIP" },
            ...[1, 2, 3, 4, 5, 6, 7, 8].map((vip) => ({
              value: String(vip),
              label: `VIP ${vip}`,
            })),
          ]}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Giá từ"
          value={minPrice}
          onChange={(e) => {
            setMinPrice(e.target.value);
            setPage(1);
          }}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Giá đến"
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(e.target.value);
            setPage(1);
          }}
        />
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="btn-primary"
        >
          Tìm
        </button>
        {(q || categoryFilter || vipFilter || minPrice || maxPrice) && (
          <button
            onClick={() => {
              setQ("");
              setCategoryFilter("");
              setVipFilter("");
              setMinPrice("");
              setMaxPrice("");
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
          if (confirm(`Xóa ${sel.count} acc đã chọn? Ảnh của acc cũng bị xóa.`))
            setBulk([...sel.selected]);
        }}
      />

      {loading ? (
        <div className="text-slate-500 py-8 text-center">Đang tải...</div>
      ) : data && data.items.length ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    className="size-4 accent-orange-500 align-middle"
                    checked={data.items.length > 0 && data.items.every((a) => sel.isSelected(a.id))}
                    onChange={() => sel.toggleAll(data.items.map((a) => a.id))}
                  />
                </th>
                <th className="p-3">Mã acc</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Giá bán</th>
                <th className="p-3">VIP</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-orange-500 align-middle"
                      checked={sel.isSelected(a.id)}
                      onChange={() => sel.toggle(a.id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{a.account_code}</td>
                  <td className="p-3">
                    {CATEGORY_LABELS[a.category_type] || a.category_type}
                  </td>
                  <td className="p-3 text-red-600 font-semibold">
                    {formatPrice(a.sale_price)}
                  </td>
                  <td className="p-3">VIP {a.vip_level}</td>
                  <td className="p-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(a.id)}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-slate-500 py-8 text-center bg-white rounded-lg border border-slate-200">
          Chưa có acc nào.
        </div>
      )}

      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}

      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="acc"
          deleteOne={(id) => api.del(`/api/admin/accounts/${id}`)}
          onClose={() => {
            setBulk(null);
            sel.clear();
            load();
          }}
        />
      )}
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    sold: "bg-slate-200 text-slate-600",
    hidden: "bg-amber-100 text-amber-700",
  };
  const label: Record<string, string> = {
    available: "Còn hàng",
    sold: "Đã bán",
    hidden: "Ẩn",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded ${map[status] || ""}`}>
      {label[status] || status}
    </span>
  );
}

/* ----------------- Lịch sử mua acc (thanh toán bằng ví) ----------------- */
interface AdminPurchase {
  account_id: number;
  account_code: string;
  amount: number;
  purchased_at: string | null;
  thumbnail: string | null;
  status: string;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  phone: string | null;
}

function PurchaseHistoryView() {
  const [data, setData] = useState<Page<AdminPurchase> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [modalAcc, setModalAcc] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    api
      .get<Page<AdminPurchase>>(`/api/admin/purchases?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm mã acc, tên / username / SĐT người mua..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="btn-primary"
        >
          Tìm
        </button>
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

      {loading ? (
        <div className="text-slate-500 py-8 text-center">Đang tải...</div>
      ) : data && data.items.length ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-3">Acc</th>
                <th className="p-3">Người mua</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Ngày mua</th>
                <th className="p-3">Trạng thái acc</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p, idx) => (
                <tr key={`purchase-${p.account_id}-${idx}`} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{p.account_code}</td>
                  <td className="p-3">
                    {p.full_name || p.username || "—"}
                    <div className="text-xs text-slate-400">
                      @{p.username || "?"} · <PhoneZaloLink phone={p.phone} />
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-orange-600 whitespace-nowrap">
                    {formatPrice(p.amount)}
                  </td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {formatDate(p.purchased_at)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setModalAcc(p.account_id)}
                      className="text-orange-600 hover:underline"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-slate-500 py-8 text-center bg-white rounded-lg border border-slate-200">
          Chưa có lượt mua acc nào.
        </div>
      )}

      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}

      {modalAcc !== null && (
        <AccountDetailModal accountId={modalAcc} onClose={() => setModalAcc(null)} />
      )}
    </div>
  );
}
