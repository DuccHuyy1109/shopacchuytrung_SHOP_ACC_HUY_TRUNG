"use client";

import { useCallback, useEffect, useState } from "react";
import BulkBar from "../../components/admin/BulkBar";
import DeleteProgressModal from "../../components/admin/DeleteProgressModal";
import { useSelection } from "../../components/admin/useSelection";
import ModalPortal from "../../components/ModalPortal";
import PhoneZaloLink from "../../components/PhoneZaloLink";
import { api } from "../../lib/api";
import { formatDate, formatPrice } from "../../lib/format";
import type { Page, User } from "../../lib/types";
import { Pager } from "../orders/page";

export default function AdminUsersPage() {
  const [data, setData] = useState<Page<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [adjusting, setAdjusting] = useState<User | null>(null);
  const sel = useSelection<number>();
  const [bulk, setBulk] = useState<number[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    api
      .get<Page<User>>(`/api/admin/users?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleRole(u: User) {
    await api.put(`/api/admin/users/${u.id}`, {
      role: u.role === "admin" ? "user" : "admin",
    });
    load();
  }
  function remove(id: number) {
    // Xóa 1 người dùng cũng đi qua bảng tiến trình.
    if (confirm("Xóa người dùng này? Mọi dữ liệu liên quan sẽ bị xóa."))
      setBulk([id]);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Người dùng</h1>
      <div className="flex gap-2 mb-3">
        <input
          className="input max-w-xs"
          placeholder="Tìm username / tên / SĐT / email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          className="px-4 py-2 bg-slate-800 text-white rounded text-sm"
        >
          Tìm
        </button>
      </div>

      <BulkBar
        count={sel.count}
        onClear={sel.clear}
        onDelete={() => {
          if (confirm(`Xóa ${sel.count} người dùng đã chọn? Mọi dữ liệu liên quan sẽ bị xóa.`))
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
                    checked={
                      data.items.length > 0 &&
                      data.items.every((u) => sel.isSelected(u.id))
                    }
                    onChange={() => sel.toggleAll(data.items.map((u) => u.id))}
                  />
                </th>
                <th className="p-3">Username</th>
                <th className="p-3">Họ tên</th>
                <th className="p-3">SĐT</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số dư</th>
                <th className="p-3">Quyền</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-orange-500 align-middle"
                      checked={sel.isSelected(u.id)}
                      onChange={() => sel.toggle(u.id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3">{u.full_name || "—"}</td>
                  <td className="p-3">
                    <PhoneZaloLink phone={u.phone} />
                  </td>
                  <td className="p-3">{u.email || "—"}</td>
                  <td className="p-3 font-semibold text-orange-600 whitespace-nowrap">
                    {formatPrice(u.balance)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        u.role === "admin"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="p-3 space-x-2 whitespace-nowrap text-xs">
                    <button
                      onClick={() => setAdjusting(u)}
                      className="text-emerald-600 hover:underline"
                    >
                      Điều chỉnh
                    </button>
                    <button
                      onClick={() => toggleRole(u)}
                      className="text-orange-600 hover:underline"
                    >
                      {u.role === "admin" ? "Hạ quyền" : "Cấp admin"}
                    </button>
                    <button
                      onClick={() => remove(u.id)}
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
          Không có người dùng.
        </div>
      )}

      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}

      {adjusting && (
        <AdjustBalanceModal
          user={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            load();
          }}
        />
      )}

      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="người dùng"
          deleteOne={(id) => api.del(`/api/admin/users/${id}`)}
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

function AdjustBalanceModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // sign = 1: cộng tiền, sign = -1: trừ tiền — thực hiện ngay khi bấm nút.
  async function adjust(sign: 1 | -1) {
    if (!amount || amount <= 0) {
      setError("Nhập số tiền lớn hơn 0");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/admin/users/${user.id}/adjust-balance`, {
        amount: sign * amount,
        note: note || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi điều chỉnh");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm grid place-items-center p-4">
      <div className="relative w-full max-w-sm rounded-xl border border-fire-500/30 bg-ink-950 p-5 text-zinc-200 shadow-[0_0_70px_-18px_rgba(255,77,0,0.7)]">
        <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
          Điều chỉnh <span className="text-gradient-fire">số dư</span>
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          @{user.username} · Số dư hiện tại:{" "}
          <b className="text-gold-300">{formatPrice(user.balance)}</b>
        </p>
        <div className="mt-2 h-px bg-gradient-to-r from-fire-500/50 via-ink-700 to-transparent" />

        <div className="mt-4">
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
            Số tiền (đ)
          </label>
          <input
            className="field"
            type="number"
            min={0}
            step={1000}
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Ví dụ: 50000"
          />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Ghi chú</label>
          <input
            className="field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Lý do điều chỉnh"
          />
        </div>

        {error && <div className="mt-3 text-sm text-ember-400">{error}</div>}

        {/* 2 nút bấm thực hiện ngay */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => adjust(1)}
            disabled={busy}
            className="py-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold hover:brightness-110 transition shadow-[0_0_18px_-8px_rgba(16,185,129,0.8)] disabled:opacity-50"
          >
            {busy ? "Đang xử lý..." : "+ Cộng tiền"}
          </button>
          <button
            onClick={() => adjust(-1)}
            disabled={busy}
            className="py-2.5 rounded-lg bg-gradient-to-br from-ember-500 to-red-600 text-white font-bold hover:brightness-110 transition shadow-[0_0_18px_-8px_rgba(239,68,68,0.8)] disabled:opacity-50"
          >
            {busy ? "Đang xử lý..." : "− Trừ tiền"}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full py-2 rounded-lg border border-ink-700 text-zinc-300 hover:border-fire-500/50 hover:text-white transition"
        >
          Hủy
        </button>
      </div>
    </div>
    </ModalPortal>
  );
}
