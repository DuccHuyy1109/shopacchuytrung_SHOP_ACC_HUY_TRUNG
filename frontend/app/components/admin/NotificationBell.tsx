"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ModalPortal from "../ModalPortal";
import { api } from "../../lib/api";
import {
  Bell,
  Check,
  CheckCheck,
  Headset,
  MessageCircle,
  Rocket,
  ScrollText,
  Tag,
  Trash,
  X,
} from "../icons";

interface NotifItem {
  id: number;
  title: string;
  subtitle: string | null;
  meta: string | null;
  created_at: string | null;
  is_new: boolean;
}
interface NotifCategory {
  key: string;
  label: string;
  unread: number;
  items: NotifItem[];
}
interface NotifSummary {
  total_unread: number;
  categories: NotifCategory[];
}
type Row = NotifItem & { cat: string; label: string };

/** Đường dẫn quản lý tương ứng từng mục thông báo. */
const HREF: Record<string, string> = {
  orders: "/admin/orders",
  account_contacts: "/admin/posts?tab=accContacts",
  posts: "/admin/posts?tab=posts",
  post_contacts: "/admin/posts?tab=postContacts",
};

/** Endpoint xóa bản ghi tương ứng từng mục. */
const DEL_PATH: Record<string, (id: number) => string> = {
  orders: (id) => `/api/admin/orders/${id}`,
  account_contacts: (id) => `/api/admin/account-contacts/${id}`,
  posts: (id) => `/api/admin/posts/${id}`,
  post_contacts: (id) => `/api/admin/post-contacts/${id}`,
};

const CAT_ICON: Record<string, (p: { className?: string }) => React.ReactElement> = {
  orders: Rocket,
  account_contacts: Headset,
  posts: ScrollText,
  post_contacts: MessageCircle,
};

const POLL_MS = 40000;

function capCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd} ngày trước`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function NotificationBell({ username }: { username: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<NotifSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("all");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await api.get<NotifSummary>("/api/admin/notifications"));
    } catch {
      /* im lặng — tránh làm phiền admin khi mạng chập chờn */
    }
  }, []);

  // Tải lần đầu + poll định kỳ để badge luôn cập nhật.
  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Mở drawer -> tải lại ngay cho tươi; đóng -> hủy mọi xác nhận xóa.
  useEffect(() => {
    if (open) load();
    else setConfirmKey(null);
  }, [open, load]);

  // Esc để đóng.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const total = summary?.total_unread ?? 0;
  const cats = useMemo(() => summary?.categories ?? [], [summary]);
  const catByKey = useMemo(
    () => Object.fromEntries(cats.map((c) => [c.key, c])),
    [cats],
  );

  // Danh sách hiển thị theo tab (kèm key mục để biết điều hướng / xóa).
  const rows: Row[] = useMemo(() => {
    const withCat = (c: NotifCategory) =>
      c.items.map((it) => ({ ...it, cat: c.key, label: c.label }));
    if (tab === "all") {
      return cats.flatMap(withCat).sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
    }
    const c = catByKey[tab];
    return c ? withCat(c) : [];
  }, [tab, cats, catByKey]);

  const markSeen = useCallback(
    async (category: string) => {
      try {
        await api.post("/api/admin/notifications/seen", { category });
      } catch {
        /* bỏ qua */
      }
      load();
    },
    [load],
  );

  const goto = useCallback(
    (item: Row) => {
      setOpen(false);
      markSeen(item.cat);
      router.push(HREF[item.cat] ?? "/admin");
    },
    [markSeen, router],
  );

  const removeItem = useCallback(
    async (item: Row) => {
      setConfirmKey(null);
      // Cập nhật lạc quan để cảm giác mượt.
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              total_unread: prev.total_unread - (item.is_new ? 1 : 0),
              categories: prev.categories.map((c) =>
                c.key === item.cat
                  ? {
                      ...c,
                      unread: Math.max(0, c.unread - (item.is_new ? 1 : 0)),
                      items: c.items.filter((it) => it.id !== item.id),
                    }
                  : c,
              ),
            }
          : prev,
      );
      try {
        await api.del(DEL_PATH[item.cat](item.id));
      } catch {
        /* nếu lỗi, tải lại để khôi phục trạng thái đúng */
      }
      load();
    },
    [load],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        className="relative grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire shrink-0 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-fire-400"
      >
        <Tag className="w-6 h-6" />
        {total > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {capCount(total)}
          </span>
        )}
      </button>

      <ModalPortal>
        <div
          className={`fixed inset-0 z-[200] transition ${
            open ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!open}
        >
          {/* Lớp nền mờ */}
          <div
            className={`absolute inset-0 bg-ink-950/75 backdrop-blur-sm transition-opacity duration-300 ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
          />
          {/* Drawer trượt ra từ trái */}
          <aside
            className={`absolute left-0 top-0 h-full w-[88vw] max-w-sm flex flex-col border-r border-fire-500/25 bg-ink-950 shadow-[0_0_44px_-14px_rgba(255,77,0,0.75)] transition-transform duration-300 ease-out ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
            role="dialog"
            aria-label="Bảng thông báo"
          >
            <span className="pointer-events-none absolute right-0 top-6 h-24 w-px bg-gradient-to-b from-transparent via-fire-500 to-transparent" />

            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-ink-800 shrink-0">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-fire-500/15 text-fire-300 shrink-0">
                <Bell className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-extrabold uppercase tracking-wide text-white leading-none">
                  Thông báo
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 truncate">
                  {total > 0
                    ? `${total} thông báo mới · @${username}`
                    : `Không có thông báo mới · @${username}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => markSeen("all")}
                disabled={total === 0}
                title="Đánh dấu tất cả đã đọc"
                className="grid place-items-center w-9 h-9 rounded-lg border border-ink-700 text-zinc-400 transition hover:text-emerald-300 hover:border-emerald-500/50 disabled:opacity-40"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="grid place-items-center w-9 h-9 rounded-lg border border-ember-500/50 text-ember-300 transition hover:text-white hover:border-ember-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs 4 mục */}
            <div className="notif-tabs shrink-0">
              <NotifTab
                active={tab === "all"}
                onClick={() => setTab("all")}
                label="Tất cả"
                count={total}
              />
              {cats.map((c) => (
                <NotifTab
                  key={c.key}
                  active={tab === c.key}
                  onClick={() => setTab(c.key)}
                  label={c.label}
                  count={c.unread}
                  Icon={CAT_ICON[c.key]}
                />
              ))}
            </div>

            {/* Danh sách */}
            <div className="notif-list">
              {rows.length === 0 ? (
                <div className="px-4 py-14 text-center text-sm text-zinc-500">
                  <Bell className="w-9 h-9 mx-auto mb-2 opacity-30" />
                  Chưa có thông báo nào
                </div>
              ) : (
                rows.map((item) => {
                  const Icon = CAT_ICON[item.cat] ?? Bell;
                  const key = `${item.cat}-${item.id}`;
                  return (
                    <div
                      key={key}
                      className={`notif-item ${item.is_new ? "is-new" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => goto(item)}
                        className="notif-item-main"
                      >
                        <span className="notif-item-icon">
                          <Icon className="w-4 h-4" />
                          {item.is_new && (
                            <span className="notif-dot" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-zinc-100 text-sm">
                              {item.title}
                            </span>
                            {item.meta && (
                              <span className="shrink-0 text-[11px] font-bold text-fire-300">
                                {item.meta}
                              </span>
                            )}
                          </span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-zinc-400 mt-0.5">
                              {item.subtitle}
                            </span>
                          )}
                          <span className="block text-[11px] text-zinc-600 mt-0.5">
                            {tab === "all" ? `${item.label} · ` : ""}
                            {timeAgo(item.created_at)}
                          </span>
                        </span>
                      </button>

                      {confirmKey === key ? (
                        <span className="notif-confirm">
                          <button
                            type="button"
                            title="Xác nhận xóa"
                            onClick={() => removeItem(item)}
                            className="notif-act notif-act-del"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Hủy"
                            onClick={() => setConfirmKey(null)}
                            className="notif-act notif-act-cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          title="Xóa thông báo"
                          aria-label="Xóa thông báo"
                          onClick={() => setConfirmKey(key)}
                          className="notif-item-del"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </ModalPortal>
    </>
  );
}

function NotifTab({
  active,
  onClick,
  label,
  count,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  Icon?: (p: { className?: string }) => React.ReactElement;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`notif-tab ${active ? "is-active" : ""}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
      {count > 0 && <span className="notif-tab-count">{capCount(count)}</span>}
    </button>
  );
}
