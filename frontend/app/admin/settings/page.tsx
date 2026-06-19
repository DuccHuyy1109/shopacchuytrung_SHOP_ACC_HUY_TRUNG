"use client";

import { useCallback, useEffect, useState } from "react";
import AnnouncementsManager from "../../components/AnnouncementsManager";
import GuidesManager from "../../components/GuidesManager";
import BulkBar from "../../components/admin/BulkBar";
import DeleteProgressModal from "../../components/admin/DeleteProgressModal";
import WikiSyncPanel from "../../components/admin/WikiSyncPanel";
import { useSelection } from "../../components/admin/useSelection";
import { api } from "../../lib/api";
import { Pager } from "../orders/page";

const CRUD_PAGE_SIZE = 10;

type FieldType = "text" | "number" | "textarea" | "checkbox" | "select" | "tags";
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}
type Item = Record<string, unknown>;

const TABS = [
  { k: "categories", label: "Danh mục giá" },
  { k: "shops", label: "Shop" },
  { k: "descTags", label: "Mô tả tài khoản" },
  { k: "orderFields", label: "Trường form Order" },
  { k: "contacts", label: "Liên hệ Zalo/FB" },
  { k: "payments", label: "Thanh toán (QR)" },
  { k: "site", label: "Cấu hình site" },
  { k: "announcements", label: "Thông báo" },
  { k: "guides", label: "Hướng dẫn" },
  { k: "wiki", label: "Wiki Trang Phục" },
] as const;

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>("categories");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Cấu hình hệ thống</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              tab === t.k
                ? "bg-orange-500 text-white"
                : "bg-white border border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" && (
        <Crud
          base="/api/admin/categories"
          fields={[
            { key: "name", label: "Tên danh mục", type: "text" },
            { key: "min_price", label: "Giá từ", type: "number" },
            { key: "max_price", label: "Giá đến", type: "number" },
            { key: "sort_order", label: "Thứ tự", type: "number" },
            { key: "is_active", label: "Hiển thị", type: "checkbox" },
          ]}
          blank={{
            name: "",
            min_price: 0,
            max_price: 0,
            sort_order: 0,
            is_active: true,
          }}
          summary={(i) => `${i.name}`}
        />
      )}
      {tab === "shops" && (
        <Crud
          base="/api/admin/shops"
          fields={[
            { key: "name", label: "Tên shop", type: "text" },
            { key: "description", label: "Mô tả", type: "textarea" },
            { key: "is_active", label: "Hoạt động", type: "checkbox" },
          ]}
          blank={{ name: "", description: "", is_active: true }}
          summary={(i) => `${i.name}`}
        />
      )}
      {tab === "descTags" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-orange-600 border-b border-orange-200 pb-2">Đặc điểm chung</h2>
            <Crud
              base="/api/admin/description-tags"
              fields={[
                { key: "text", label: "Nội dung mô tả (vd: Kim long, Đồ ngủ, ...)", type: "text" },
                { key: "gia_tien", label: "Giá tiền định giá (đ)", type: "number" },
                { key: "sort_order", label: "Thứ tự", type: "number" },
              ]}
              blank={{ text: "", gia_tien: 0, sort_order: 0, tag_type: 1 }}
              filter={(i) => !(i as any).tag_type || Number((i as any).tag_type) === 1}
              onBeforeSave={(data) => ({ ...data, tag_type: 1 })}
              summary={(i) => `${String((i as any).text)} · ${Number((i as any).gia_tien || 0).toLocaleString("vi-VN")}đ`}
              searchable
              searchPlaceholder="Tìm đặc điểm..."
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-volt-500 border-b border-volt-200 pb-2">Súng nâng cấp</h2>
            <Crud
              base="/api/admin/description-tags"
              fields={[
                { key: "text", label: "Tên súng & Level (vd: M4A1 Lv.7)", type: "text" },
                { key: "gia_tien", label: "Giá tiền định giá (đ)", type: "number" },
                { key: "sort_order", label: "Thứ tự", type: "number" },
              ]}
              blank={{ text: "", gia_tien: 0, sort_order: 0, tag_type: 2 }}
              filter={(i) => Number((i as any).tag_type) === 2}
              onBeforeSave={(data) => ({ ...data, tag_type: 2 })}
              summary={(i) => `${String((i as any).text)} · ${Number((i as any).gia_tien || 0).toLocaleString("vi-VN")}đ`}
              searchable
              searchPlaceholder="Tìm súng nâng cấp..."
            />
          </div>
        </div>
      )}
      {tab === "orderFields" && (
        <Crud
          base="/api/admin/order-form/fields"
          fields={[
            { key: "field_key", label: "Mã trường (a-z, _)", type: "text" },
            { key: "label", label: "Nhãn hiển thị", type: "text" },
            {
              key: "field_type",
              label: "Kiểu",
              type: "select",
              options: ["text", "textarea", "number", "select", "multiselect"],
            },
            { key: "options", label: "Lựa chọn (phân cách dấu phẩy)", type: "tags" },
            { key: "placeholder", label: "Gợi ý nhập", type: "text" },
            { key: "is_required", label: "Bắt buộc", type: "checkbox" },
            { key: "sort_order", label: "Thứ tự", type: "number" },
            { key: "is_active", label: "Hiển thị", type: "checkbox" },
          ]}
          blank={{
            field_key: "",
            label: "",
            field_type: "text",
            options: [],
            placeholder: "",
            is_required: false,
            sort_order: 0,
            is_active: true,
          }}
          summary={(i) => `${i.label} (${i.field_key})`}
        />
      )}
      {tab === "contacts" && (
        <Crud
          base="/api/admin/contacts"
          fields={[
            { key: "name", label: "Tên liên hệ", type: "text" },
            { key: "zalo_link", label: "Link Zalo", type: "text" },
            { key: "facebook_link", label: "Link Facebook", type: "text" },
            { key: "phone", label: "Số điện thoại", type: "text" },
            { key: "is_default", label: "Mặc định", type: "checkbox" },
            { key: "is_active", label: "Hoạt động", type: "checkbox" },
          ]}
          blank={{
            name: "",
            zalo_link: "",
            facebook_link: "",
            phone: "",
            is_default: false,
            is_active: true,
          }}
          summary={(i) => `${i.name}`}
        />
      )}
      {tab === "payments" && (
        <Crud
          base="/api/admin/payments"
          fields={[
            { key: "bank_code", label: "Mã ngân hàng (VCB, MB...)", type: "text" },
            { key: "bank_name", label: "Tên ngân hàng", type: "text" },
            { key: "account_number", label: "Số tài khoản", type: "text" },
            { key: "account_name", label: "Tên chủ TK (in hoa)", type: "text" },
            {
              key: "template",
              label: "Mẫu QR",
              type: "select",
              options: ["compact2", "compact", "qr_only", "print"],
            },
            { key: "is_active", label: "Đang dùng", type: "checkbox" },
          ]}
          blank={{
            bank_code: "",
            bank_name: "",
            account_number: "",
            account_name: "",
            template: "compact2",
            is_active: true,
          }}
          summary={(i) => `${i.bank_code} - ${i.account_number}`}
        />
      )}
      {tab === "guides" && <GuidesManager />}
      {tab === "announcements" && <AnnouncementsManager />}
      {tab === "site" && <SiteSettings />}
      {tab === "wiki" && <WikiSyncPanel />}
    </div>
  );
}

function Crud({
  base,
  fields,
  blank,
  summary,
  filter,
  onBeforeSave,
  searchable,
  searchPlaceholder,
}: {
  base: string;
  fields: FieldDef[];
  blank: Item;
  summary: (i: Item) => string;
  filter?: (i: Item) => boolean;
  onBeforeSave?: (data: Item) => Item;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [cpage, setCpage] = useState(1);
  const sel = useSelection<string>();
  const [bulk, setBulk] = useState<string[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<any>(base)
      .then((res) => {
        // Hỗ trợ cả trường hợp API trả về mảng trực tiếp hoặc object Page { items: [] }
        const data = Array.isArray(res) ? res : res?.items || [];
        setItems(data);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  const filteredItems = Array.isArray(items) ? (filter ? items.filter(filter) : items) : [];
  // Tìm kiếm theo nội dung hiển thị (summary), không phân biệt hoa thường.
  const q = query.trim().toLowerCase();
  const searchedItems = q
    ? filteredItems.filter((i) => summary(i).toLowerCase().includes(q))
    : filteredItems;

  // Phân trang client-side.
  const totalPages = Math.max(1, Math.ceil(searchedItems.length / CRUD_PAGE_SIZE));
  const curPage = Math.min(cpage, totalPages);
  const pageItems = searchedItems.slice(
    (curPage - 1) * CRUD_PAGE_SIZE,
    curPage * CRUD_PAGE_SIZE,
  );

  return (
    <div className="space-y-3">
      {searchable && (
        <input
          className="input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCpage(1);
          }}
          placeholder={searchPlaceholder || "Tìm kiếm..."}
        />
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} className="btn-primary">
          + Thêm mới
        </button>
      )}
      {adding && (
        <ItemForm
          fields={fields}
          initial={blank}
          isNew
          onCancel={() => setAdding(false)}
          onSave={async (data) => {
            const payload = onBeforeSave ? onBeforeSave(data) : data;
            await api.post(base, payload);
            setAdding(false);
            load();
          }}
        />
      )}

      <BulkBar
        count={sel.count}
        onClear={sel.clear}
        onDelete={() => {
          if (confirm(`Xóa ${sel.count} mục đã chọn?`)) setBulk([...sel.selected]);
        }}
      />

      {pageItems.map((it) => (
        <div key={String(it.id)} className="flex items-start gap-2">
          <input
            type="checkbox"
            className="size-4 accent-orange-500 mt-3.5 shrink-0"
            checked={sel.isSelected(String(it.id))}
            onChange={() => sel.toggle(String(it.id))}
          />
          <div className="flex-1 min-w-0">
            <ItemRow
              item={it}
              fields={fields}
              summary={summary}
              onSave={async (data) => {
                const payload = onBeforeSave ? onBeforeSave(data) : data;
                await api.put(`${base}/${it.id}`, payload);
                load();
              }}
              onDelete={() => setBulk([String(it.id)])}
            />
          </div>
        </div>
      ))}
      {searchedItems.length === 0 && (
        <div className="text-slate-500 text-sm">
          {q ? "Không tìm thấy mục nào." : "Chưa có dữ liệu."}
        </div>
      )}
      <Pager page={curPage} pages={totalPages} onChange={setCpage} />

      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="mục"
          deleteOne={(id) => api.del(`${base}/${id}`)}
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

function ItemRow({
  item,
  fields,
  summary,
  onSave,
  onDelete,
}: {
  item: Item;
  fields: FieldDef[];
  summary: (i: Item) => string;
  onSave: (d: Item) => Promise<void>;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
        <span className="font-medium text-sm">{summary(item)}</span>
        <div className="space-x-3 text-sm">
          <button
            onClick={() => setOpen(true)}
            className="text-orange-600 hover:underline"
          >
            Sửa
          </button>
          <button
            onClick={() => {
              if (confirm("Xóa mục này?")) onDelete();
            }}
            className="text-red-600 hover:underline"
          >
            Xóa
          </button>
        </div>
      </div>
    );
  return (
    <ItemForm
      fields={fields}
      initial={item}
      onCancel={() => setOpen(false)}
      onSave={async (d) => {
        await onSave(d);
        setOpen(false);
      }}
    />
  );
}

function ItemForm({
  fields,
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  fields: FieldDef[];
  initial: Item;
  isNew?: boolean;
  onSave: (d: Item) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState<Item>(() => {
    // Trường "tags" lưu dạng mảng -> đổi sang chuỗi "a, b, c" để gõ tự do.
    const d: Item = { ...initial };
    for (const f of fields) {
      if (f.type === "tags" && Array.isArray(d[f.key])) {
        d[f.key] = (d[f.key] as string[]).join(", ");
      }
    }
    return d;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: unknown) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      // Trường "tags": tách chuỗi thành mảng ngay trước khi gửi API.
      const payload: Item = { ...data };
      for (const f of fields) {
        if (f.type === "tags") {
          payload[f.key] = String(payload[f.key] ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      await onSave(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-orange-300 p-4 grid sm:grid-cols-2 gap-3">
      {fields.map((f) => (
        <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {f.label}
          </label>
          {f.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={Boolean(data[f.key])}
              onChange={(e) => set(f.key, e.target.checked)}
            />
          ) : f.type === "textarea" ? (
            <textarea
              className="input"
              rows={3}
              value={String(data[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : f.type === "select" ? (
            <select
              className="input"
              value={String(data[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
            >
              {(f.options || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : f.type === "tags" ? (
            <input
              className="input"
              value={String(data[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder="Cách nhau bởi dấu phẩy, vd: 5x, 6x, 7x"
            />
          ) : (
            <input
              className="input"
              type={f.type === "number" ? "number" : "text"}
              value={String(data[f.key] ?? "")}
              onChange={(e) =>
                set(
                  f.key,
                  f.type === "number"
                    ? e.target.value === ""
                      ? null
                      : Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          )}
        </div>
      ))}
      {error && (
        <div className="sm:col-span-2 text-red-600 text-sm">{error}</div>
      )}
      <div className="sm:col-span-2 flex gap-2">
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

interface SiteSetting {
  key: string;
  value: string | null;
  description: string | null;
}

function SiteSettings() {
  const [items, setItems] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<SiteSetting[]>("/api/admin/site-settings")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string, value: string) {
    await api.put(`/api/admin/site-settings/${key}`, { value });
    setMsg(`Đã lưu "${key}"`);
    setTimeout(() => setMsg(""), 2000);
  }

  if (loading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="space-y-3">
      {msg && <div className="text-green-600 text-sm">{msg}</div>}
      {items.map((s) => (
        <SiteRow key={s.key} setting={s} onSave={save} />
      ))}
      {items.length === 0 && (
        <div className="text-slate-500 text-sm">Chưa có cấu hình.</div>
      )}
    </div>
  );
}

function SiteRow({
  setting,
  onSave,
}: {
  setting: SiteSetting;
  onSave: (k: string, v: string) => Promise<void>;
}) {
  const [value, setValue] = useState(setting.value || "");
  const [busy, setBusy] = useState(false);

  // Key dạng *_enabled -> hiển thị công tắc bật/tắt thay vì ô nhập text.
  const isToggle = setting.key.endsWith("_enabled");
  const on = value === "1";

  async function toggle() {
    const v = on ? "0" : "1";
    setValue(v);
    setBusy(true);
    await onSave(setting.key, v);
    setBusy(false);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="text-sm font-medium">
        {setting.description || setting.key}
      </div>
      <div className="text-xs text-slate-400 mb-1">{setting.key}</div>
      {isToggle ? (
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-pressed={on}
            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full transition ${
              on ? "bg-orange-500" : "bg-slate-300"
            } disabled:opacity-60`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
                on ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-semibold ${
              on ? "text-orange-600" : "text-slate-500"
            }`}
          >
            {busy ? "Đang lưu..." : on ? "Đang bật" : "Đang tắt"}
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            onClick={async () => {
              setBusy(true);
              await onSave(setting.key, value);
              setBusy(false);
            }}
            disabled={busy}
            className="btn-primary"
          >
            Lưu
          </button>
        </div>
      )}
    </div>
  );
}
