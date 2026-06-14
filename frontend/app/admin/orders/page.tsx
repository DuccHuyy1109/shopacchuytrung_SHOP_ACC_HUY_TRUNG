"use client";

import { useCallback, useEffect, useState } from "react";
import Lightbox from "../../components/Lightbox";
import ModalPortal from "../../components/ModalPortal";
import PhoneZaloLink from "../../components/PhoneZaloLink";
import { api, imageUrl } from "../../lib/api";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDate,
  formatPrice,
} from "../../lib/format";
import type { Page } from "../../lib/types";

interface AdminOrder {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  form_data: Record<string, unknown> | null;
  desired_price: number | null;
  vip: number | null;
  note: string | null;
  amount: number | null;
  status: string;
  payment_status: string;
  bill_images: string[] | null;
  admin_note: string | null;
  telegram_sent: boolean;
  created_at: string | null;
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<Page<AdminOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (statusFilter) p.set("status", statusFilter);
    api
      .get<Page<AdminOrder>>(`/api/admin/orders?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Đơn Order Acc</h1>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm mã phiếu, tên khách, số điện thoại..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
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
        {(q || statusFilter) && (
          <button
            onClick={() => {
              setQ("");
              setStatusFilter("");
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
                <th className="p-3">Mã phiếu</th>
                <th className="p-3">Khách</th>
                <th className="p-3">SĐT</th>
                <th className="p-3">Thanh toán</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{o.order_code}</td>
                  <td className="p-3">{o.customer_name}</td>
                  <td className="p-3">
                    <PhoneZaloLink phone={o.customer_phone} />
                  </td>
                  <td className="p-3">
                    <PaymentBadge status={o.payment_status} />
                  </td>
                  <td className="p-3">{ORDER_STATUS_LABELS[o.status]}</td>
                  <td className="p-3 text-slate-400">
                    {formatDate(o.created_at)}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelected(o)}
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
          Chưa có đơn order nào.
        </div>
      )}

      {data && (
        <Pager page={page} pages={data.pages} onChange={setPage} />
      )}

      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function OrderDetail({
  order,
  onClose,
  onSaved,
}: {
  order: AdminOrder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status);
  const [adminNote, setAdminNote] = useState(order.admin_note || "");
  const [busy, setBusy] = useState(false);
  const [billView, setBillView] = useState<number | null>(null);
  const bills = order.bill_images || [];

  async function save() {
    setBusy(true);
    try {
      await api.put(`/api/admin/orders/${order.id}`, {
        status,
        payment_status: paymentStatus,
        admin_note: adminNote || null,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Xóa phiếu order này?")) return;
    await api.del(`/api/admin/orders/${order.id}`);
    onSaved();
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm grid place-items-center p-4">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-fire-500/30 bg-ink-950 p-5 text-zinc-200 shadow-[0_0_70px_-18px_rgba(255,77,0,0.7)]">
        <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
          Phiếu <span className="text-gradient-fire">{order.order_code}</span>
        </h3>
        <div className="mt-1 h-px bg-gradient-to-r from-fire-500/50 via-ink-700 to-transparent" />

        <div className="mt-4 text-sm bg-ink-900/60 border border-ink-700 rounded-lg p-4 space-y-2">
          <DRow label="Khách" value={order.customer_name} />
          <div className="flex items-start justify-between gap-3">
            <span className="text-zinc-400 shrink-0">SĐT / Zalo</span>
            <PhoneZaloLink
              phone={order.customer_phone}
              className="text-sky-300 hover:text-sky-200 font-bold"
            />
          </div>
          {order.customer_email && <DRow label="Email" value={order.customer_email} />}
          {order.desired_price != null && (
            <DRow label="Giá mong muốn" value={formatPrice(order.desired_price)} gold />
          )}
          {order.vip != null && <DRow label="VIP" value={String(order.vip)} />}
          {order.amount != null && (
            <DRow label="Phí order" value={formatPrice(order.amount)} gold />
          )}
          {order.note && <DRow label="Ghi chú KH" value={order.note} />}
        </div>

        {order.form_data && Object.keys(order.form_data).length > 0 && (
          <div className="mt-3 text-sm bg-ink-900/60 border border-ink-700 rounded-lg p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Yêu cầu chi tiết
            </div>
            <div className="space-y-2">
              {Object.entries(order.form_data).map(([k, v]) => (
                <DRow
                  key={k}
                  label={k}
                  value={Array.isArray(v) ? v.join(", ") : String(v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ảnh bill chuyển khoản */}
        <div className="mt-4">
          <div className="text-sm font-semibold text-zinc-300 mb-1.5">
            Ảnh bill chuyển khoản{" "}
            <span className="text-zinc-500 font-normal">({bills.length})</span>
          </div>
          {bills.length ? (
            <div className="flex flex-wrap gap-2">
              {bills.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setBillView(i)}
                  className="w-20 h-20 rounded-lg border border-ink-700 overflow-hidden hover:ring-2 hover:ring-fire-400 transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">Khách chưa gửi ảnh bill.</div>
          )}
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Trạng thái</label>
            <select
              className="field"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
              Thanh toán
            </label>
            <select
              className="field"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
              Ghi chú nội bộ
            </label>
            <textarea
              className="field"
              rows={2}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={remove}
            className="px-4 py-2 text-ember-400 border border-ember-500/40 rounded-lg hover:bg-ember-500/10 transition"
          >
            Xóa
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 border border-ink-700 rounded-lg text-zinc-300 hover:border-fire-500/50 hover:text-white transition"
          >
            Đóng
          </button>
          <button onClick={save} disabled={busy} className="btn-fire disabled:opacity-60">
            {busy ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
      {billView !== null && bills.length > 0 && (
        <Lightbox
          images={bills}
          start={billView}
          onClose={() => setBillView(null)}
        />
      )}
    </div>
    </ModalPortal>
  );
}

/** Dòng nhãn–giá trị trong modal tối. */
function DRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-400 shrink-0">{label}</span>
      <b className={`text-right break-words ${gold ? "text-gold-300" : "text-zinc-100"}`}>
        {value}
      </b>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    unpaid: "bg-slate-100 text-slate-500",
    pending_confirm: "bg-amber-100 text-amber-700",
    confirmed: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded font-medium ${
        color[status] || "bg-slate-100 text-slate-500"
      }`}
    >
      {PAYMENT_STATUS_LABELS[status] || status}
    </span>
  );
}

export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  // Hiển thị cả khi chỉ có 1 trang. Dãy số trang gọn: luôn có trang đầu & cuối,
  // vài trang quanh trang hiện tại, chèn "…" khi cách xa nhau.
  const total = Math.max(1, pages);
  const nums: (number | "gap")[] = [];
  const span = 1; // số trang hiển thị mỗi bên trang hiện tại
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= page - span && i <= page + span)) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== "gap") {
      nums.push("gap");
    }
  }
  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5 mt-4">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-sm hover:bg-slate-50 disabled:opacity-40"
      >
        Trước
      </button>
      {nums.map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1.5 text-slate-400 select-none">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`min-w-[36px] px-2.5 py-1.5 rounded border text-sm ${
              n === page
                ? "border-orange-500 bg-orange-500 text-white font-semibold"
                : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            {n}
          </button>
        ),
      )}
      <button
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-sm hover:bg-slate-50 disabled:opacity-40"
      >
        Sau
      </button>
    </div>
  );
}
