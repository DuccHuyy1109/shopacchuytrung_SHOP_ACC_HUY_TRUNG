"use client";

import { useCallback, useEffect, useState } from "react";
import BulkBar from "../../components/admin/BulkBar";
import DeleteProgressModal from "../../components/admin/DeleteProgressModal";
import { useSelection } from "../../components/admin/useSelection";
import Lightbox from "../../components/Lightbox";
import ModalPortal from "../../components/ModalPortal";
import PhoneZaloLink from "../../components/PhoneZaloLink";
import { api, imageUrl } from "../../lib/api";
import {
  DEPOSIT_STATUS_LABELS,
  TXN_TYPE_LABELS,
  formatDate,
  formatPrice,
} from "../../lib/format";
import type { Page } from "../../lib/types";
import { Pager } from "../orders/page";

interface AdminDeposit {
  id: number;
  deposit_code: string;
  amount: number;
  transfer_content: string;
  status: string;
  bill_images: string[] | null;
  admin_note: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  user_id: number;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  telegram_sent: boolean;
}

interface TxnDepositRef {
  id: number;
  deposit_code: string;
  status: string;
  transfer_content: string;
  bill_images: string[] | null;
  admin_note: string | null;
}

interface AdminTxn {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: number | null;
  note: string | null;
  created_at: string | null;
  user_id: number;
  username: string | null;
  full_name: string | null;
  // Chỉ có với giao dịch nạp tiền — để xem chi tiết + ảnh bill.
  deposit?: TxnDepositRef | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function AdminFinancePage() {
  const [view, setView] = useState<"deposits" | "transactions">("deposits");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tài chính</h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("deposits")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            view === "deposits"
              ? "bg-orange-500 text-white"
              : "bg-white border border-slate-300"
          }`}
        >
          Yêu cầu nạp tiền
        </button>
        <button
          onClick={() => setView("transactions")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            view === "transactions"
              ? "bg-orange-500 text-white"
              : "bg-white border border-slate-300"
          }`}
        >
          Lịch sử giao dịch
        </button>
      </div>
      {view === "deposits" ? <DepositsView /> : <TransactionsView />}
    </div>
  );
}

function DepositsView() {
  const [data, setData] = useState<Page<AdminDeposit> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<AdminDeposit | null>(null);
  const sel = useSelection<number>();
  const [bulk, setBulk] = useState<number[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (statusFilter) p.set("status", statusFilter);
    api
      .get<Page<AdminDeposit>>(`/api/admin/deposits?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm mã, nội dung CK, tên/SĐT người dùng..."
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
          {Object.entries(DEPOSIT_STATUS_LABELS).map(([k, v]) => (
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

      <BulkBar
        count={sel.count}
        onClear={sel.clear}
        onDelete={() => {
          if (confirm(`Xóa ${sel.count} yêu cầu nạp đã chọn?`)) setBulk([...sel.selected]);
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
                    checked={data.items.length > 0 && data.items.every((d) => sel.isSelected(d.id))}
                    onChange={() => sel.toggleAll(data.items.map((d) => d.id))}
                  />
                </th>
                <th className="p-3">Mã</th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Nội dung CK</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-orange-500 align-middle"
                      checked={sel.isSelected(d.id)}
                      onChange={() => sel.toggle(d.id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{d.deposit_code}</td>
                  <td className="p-3">
                    {d.full_name || d.username}
                    <div className="text-xs text-slate-400">
                      @{d.username} · <PhoneZaloLink phone={d.phone} />
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-orange-600">
                    {formatPrice(d.amount)}
                  </td>
                  <td className="p-3 font-mono text-xs">{d.transfer_content}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        STATUS_COLOR[d.status] || "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {DEPOSIT_STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{formatDate(d.created_at)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelected(d)}
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
          Không có yêu cầu nạp nào.
        </div>
      )}

      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}

      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="yêu cầu nạp"
          deleteOne={(id) => api.del(`/api/admin/deposits/${id}`)}
          onClose={() => {
            setBulk(null);
            sel.clear();
            load();
          }}
        />
      )}

      {selected && (
        <DepositDetail
          deposit={selected}
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

function TransactionsView() {
  const [data, setData] = useState<Page<AdminTxn> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<AdminTxn | null>(null);
  const sel = useSelection<number>();
  const [bulk, setBulk] = useState<number[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), page_size: "20" });
    if (q.trim()) p.set("q", q.trim());
    if (typeFilter) p.set("type", typeFilter);
    api
      .get<Page<AdminTxn>>(`/api/admin/transactions?${p.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, q, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-filter-panel mb-4">
        <input
          className="input"
          placeholder="Tìm tên / username / SĐT / ghi chú..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả loại giao dịch</option>
          {Object.entries(TXN_TYPE_LABELS).map(([k, v]) => (
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
        {(q || typeFilter) && (
          <button
            onClick={() => {
              setQ("");
              setTypeFilter("");
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
          if (
            confirm(
              `Xóa ${sel.count} giao dịch đã chọn? Chỉ xóa lịch sử, KHÔNG đổi số dư người dùng. ` +
                `Ảnh bill của các giao dịch nạp tiền cũng sẽ bị xóa khỏi kho lưu trữ.`,
            )
          )
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
                    checked={data.items.length > 0 && data.items.every((t) => sel.isSelected(t.id))}
                    onChange={() => sel.toggleAll(data.items.map((t) => t.id))}
                  />
                </th>
                <th className="p-3">Người dùng</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Số tiền</th>
                <th className="p-3">Số dư sau GD</th>
                <th className="p-3">Ghi chú</th>
                <th className="p-3">Thời gian</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => {
                const credit = t.amount >= 0;
                return (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-orange-500 align-middle"
                        checked={sel.isSelected(t.id)}
                        onChange={() => sel.toggle(t.id)}
                      />
                    </td>
                    <td className="p-3">
                      {t.full_name || t.username}
                      <div className="text-xs text-slate-400">
                        @{t.username} · ID {t.user_id}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          t.type === "deposit"
                            ? "bg-green-100 text-green-700"
                            : t.type === "order_payment"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {TXN_TYPE_LABELS[t.type] || t.type}
                      </span>
                    </td>
                    <td
                      className={`p-3 font-semibold whitespace-nowrap ${
                        credit ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {credit ? "+" : "−"}
                      {formatPrice(Math.abs(t.amount))}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatPrice(t.balance_after)}
                    </td>
                    <td className="p-3 text-slate-500">{t.note || "—"}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {t.deposit ? (
                        <button
                          onClick={() => setSelectedTxn(t)}
                          className="text-orange-600 hover:underline"
                        >
                          Chi tiết
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-slate-500 py-8 text-center bg-white rounded-lg border border-slate-200">
          Chưa có giao dịch nào.
        </div>
      )}

      {data && <Pager page={page} pages={data.pages} onChange={setPage} />}

      {bulk && (
        <DeleteProgressModal
          ids={bulk}
          label="giao dịch"
          deleteOne={(id) => api.del(`/api/admin/transactions/${id}`)}
          onClose={() => {
            setBulk(null);
            sel.clear();
            load();
          }}
        />
      )}

      {selectedTxn && (
        <TxnDetail txn={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  );
}

function TxnDetail({
  txn,
  onClose,
}: {
  txn: AdminTxn;
  onClose: () => void;
}) {
  const [billView, setBillView] = useState<number | null>(null);
  const dep = txn.deposit || null;
  const bills = dep?.bill_images || [];
  const credit = txn.amount >= 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm grid place-items-center p-4">
        <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-fire-500/30 bg-ink-950 p-5 text-zinc-200 shadow-[0_0_70px_-18px_rgba(255,77,0,0.7)]">
          <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
            Chi tiết{" "}
            <span className="text-gradient-fire">
              {TXN_TYPE_LABELS[txn.type] || txn.type}
            </span>
          </h3>
          <div className="mt-1 h-px bg-gradient-to-r from-fire-500/50 via-ink-700 to-transparent" />

          <div className="mt-4 text-sm bg-ink-900/60 border border-ink-700 rounded-lg p-4 space-y-2">
            <DRow
              label="Người dùng"
              value={`${txn.full_name || txn.username} (@${txn.username})`}
            />
            <DRow
              label="Số tiền"
              value={`${credit ? "+" : "−"}${formatPrice(Math.abs(txn.amount))}`}
              gold
            />
            <DRow label="Số dư sau GD" value={formatPrice(txn.balance_after)} />
            <DRow label="Thời gian" value={formatDate(txn.created_at)} />
            {txn.note && <DRow label="Ghi chú" value={txn.note} />}
          </div>

          {dep && (
            <>
              <div className="mt-4 text-sm bg-ink-900/60 border border-ink-700 rounded-lg p-4 space-y-2">
                <DRow label="Mã yêu cầu nạp" value={dep.deposit_code} gold />
                <DRow label="Nội dung CK" value={dep.transfer_content} gold />
                <DRow
                  label="Trạng thái"
                  value={DEPOSIT_STATUS_LABELS[dep.status] || dep.status}
                />
                {dep.admin_note && (
                  <DRow label="Ghi chú admin" value={dep.admin_note} />
                )}
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-zinc-300 mb-1.5">
                  Ảnh bill chuyển khoản{" "}
                  <span className="text-zinc-500 font-normal">
                    ({bills.length})
                  </span>
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
                  <div className="text-sm text-zinc-500">
                    Chưa có ảnh bill (có thể đã bị xóa khỏi kho lưu trữ).
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex mt-5">
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2 border border-ink-700 rounded-lg text-zinc-300 hover:border-fire-500/50 hover:text-white transition"
            >
              Đóng
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

function DepositDetail({
  deposit,
  onClose,
  onSaved,
}: {
  deposit: AdminDeposit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(deposit.admin_note || "");
  const [error, setError] = useState("");
  const [billView, setBillView] = useState<number | null>(null);
  const bills = deposit.bill_images || [];
  const pending = deposit.status === "pending";

  async function confirm() {
    if (!confirm0("Xác nhận đã nhận tiền và cộng vào ví người dùng?")) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/admin/deposits/${deposit.id}/confirm`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xác nhận");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/admin/deposits/${deposit.id}/reject`, {
        note: note || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi từ chối");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm grid place-items-center p-4">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-fire-500/30 bg-ink-950 p-5 text-zinc-200 shadow-[0_0_70px_-18px_rgba(255,77,0,0.7)]">
        <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white">
          Yêu cầu nạp <span className="text-gradient-fire">{deposit.deposit_code}</span>
        </h3>
        <div className="mt-1 h-px bg-gradient-to-r from-fire-500/50 via-ink-700 to-transparent" />

        <div className="mt-4 text-sm bg-ink-900/60 border border-ink-700 rounded-lg p-4 space-y-2">
          <DRow
            label="Người dùng"
            value={`${deposit.full_name || deposit.username} (@${deposit.username})`}
          />
          <div className="flex items-start justify-between gap-3">
            <span className="text-zinc-400 shrink-0">SĐT</span>
            <PhoneZaloLink
              phone={deposit.phone}
              className="text-sky-300 hover:text-sky-200 font-bold"
            />
          </div>
          <DRow label="Số tiền" value={formatPrice(deposit.amount)} gold />
          <DRow label="Nội dung CK" value={deposit.transfer_content} gold />
          <DRow label="Ngày tạo" value={formatDate(deposit.created_at)} />
          <DRow
            label="Trạng thái"
            value={DEPOSIT_STATUS_LABELS[deposit.status] || deposit.status}
          />
        </div>

        {/* Ảnh bill */}
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
            <div className="text-sm text-zinc-500">Chưa có ảnh bill.</div>
          )}
        </div>

        {pending && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
              Ghi chú (nếu từ chối)
            </label>
            <textarea
              className="field"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do từ chối (tuỳ chọn)"
            />
          </div>
        )}
        {deposit.status === "rejected" && deposit.admin_note && (
          <div className="mt-2 text-sm text-ember-400">
            Lý do từ chối: {deposit.admin_note}
          </div>
        )}

        {error && <div className="mt-3 text-sm text-ember-400">{error}</div>}

        <div className="flex gap-2 mt-5">
          {pending && (
            <button
              onClick={reject}
              disabled={busy}
              className="px-4 py-2 text-ember-400 border border-ember-500/40 rounded-lg hover:bg-ember-500/10 transition disabled:opacity-50"
            >
              Từ chối
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 border border-ink-700 rounded-lg text-zinc-300 hover:border-fire-500/50 hover:text-white transition"
          >
            Đóng
          </button>
          {pending && (
            <button onClick={confirm} disabled={busy} className="btn-fire disabled:opacity-60">
              {busy ? "Đang xử lý..." : "Xác nhận & cộng tiền"}
            </button>
          )}
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
      <b className={`text-right break-all ${gold ? "text-gold-300" : "text-zinc-100"}`}>
        {value}
      </b>
    </div>
  );
}

// confirm() bị trùng tên với hàm component nên gọi window.confirm qua alias.
function confirm0(msg: string): boolean {
  return typeof window !== "undefined" ? window.confirm(msg) : true;
}
