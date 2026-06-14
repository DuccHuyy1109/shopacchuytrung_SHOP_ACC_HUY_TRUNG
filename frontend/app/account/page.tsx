"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import HudPanel from "../components/HudPanel";
import { api, imageUrl, setTokens } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  DEPOSIT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  POST_STATUS_LABELS,
  TXN_TYPE_LABELS,
  formatDate,
  formatPrice,
} from "../lib/format";
import type {
  AuthToken,
  DepositRequest,
  Order,
  Post,
  PurchasedAccount,
  WalletMe,
} from "../lib/types";
import {
  ArrowRight,
  Coins,
  Facebook,
  Gamepad,
  Headset,
  Lock,
  MessageCircle,
  Plus,
  ScrollText,
  ShieldCheck,
  Tag,
  Trash,
  User,
  Zap,
} from "../components/icons";
import ModalPortal from "../components/ModalPortal";

const ALL_TABS = [
  {
    k: "profile",
    label: "Hồ sơ",
    sub: "Thông tin cá nhân",
    Icon: User,
    accent: "from-volt-500 to-fire-500",
  },
  {
    k: "posts",
    label: "Bài đăng",
    sub: "Tin mua bán của bạn",
    Icon: ScrollText,
    accent: "from-fire-500 to-ember-500",
  },
  {
    k: "orders",
    label: "Đơn order",
    sub: "Theo dõi yêu cầu",
    Icon: Tag,
    accent: "from-gold-400 to-fire-500",
  },
  {
    k: "purchases",
    label: "Acc đã mua",
    sub: "Acc bạn đã thanh toán",
    Icon: Gamepad,
    accent: "from-emerald-400 to-teal-500",
  },
  {
    k: "finance",
    label: "Tài chính",
    sub: "Số dư & nạp tiền",
    Icon: Coins,
    accent: "from-gold-300 to-ember-500",
  },
] as const;
type TabKey = (typeof ALL_TABS)[number]["k"];

function AccountContent() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const initial = (sp.get("tab") as TabKey) || "profile";
  const [tab, setTab] = useState<TabKey>(
    ALL_TABS.some((t) => t.k === initial) ? initial : "profile",
  );
  // Chức năng mua acc (cấu hình site) — tắt thì ẩn tab "Acc đã mua".
  const [buyEnabled, setBuyEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const t = sp.get("tab") as TabKey;
    if (t && ALL_TABS.some((x) => x.k === t)) setTab(t);
  }, [sp]);

  useEffect(() => {
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setBuyEnabled(s.buy_account_enabled === "1"))
      .catch(() => setBuyEnabled(false));
  }, []);

  // Tắt chức năng mà đang đứng ở tab Acc đã mua -> quay về Hồ sơ.
  useEffect(() => {
    if (buyEnabled === false && tab === "purchases") setTab("profile");
  }, [buyEnabled, tab]);

  // Mặc định 4 tab; tab "Acc đã mua" CHỈ xuất hiện khi đã xác nhận bật
  // (tránh chớp 5 tab trong lúc cấu hình chưa load xong).
  const tabs = ALL_TABS.filter(
    (t) => t.k !== "purchases" || buyEnabled === true,
  );

  if (loading || !user)
    return <div className="py-16 text-center text-zinc-500">Đang tải...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-volt-500 to-fire-500 text-white glow-fire shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <div>
            <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
              Tài khoản <span className="text-gradient-fire">của tôi</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5">
              Quản lý hồ sơ, bài đăng, đơn order và bảo mật tài khoản.
            </p>
          </div>
        </div>
      </section>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5 ${
          tabs.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
        }`}
      >
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`group frame-chien no-lift text-left ${
              tab === t.k
                ? ""
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <span className="frame-chien-in flex items-center gap-3 p-4 min-h-20 overflow-hidden">
              <span className="zap-sweep" />
              <span
                className={`relative grid place-items-center w-11 h-11 clip-chien-sm bg-gradient-to-br ${t.accent} text-white shadow-[0_0_24px_-10px_rgba(255,106,0,0.9)] shrink-0`}
              >
                <t.Icon className="w-5 h-5" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block font-display font-bold uppercase tracking-wide text-lg text-white">
                  {t.label}
                </span>
                <span className="block text-sm text-zinc-500 mt-0.5">
                  {t.sub}
                </span>
              </span>
              <ArrowRight
                className={`relative w-5 h-5 shrink-0 transition ${
                  tab === t.k
                    ? "text-fire-300"
                    : "text-zinc-600 group-hover:text-fire-300"
                }`}
              />
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "profile" && <ProfileTab refreshUser={refreshUser} />}
        {tab === "posts" && <MyPostsTab />}
        {tab === "orders" && <MyOrdersTab />}
        {tab === "purchases" && <PurchasesTab />}
        {tab === "finance" && <FinanceTab />}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-zinc-500">Đang tải...</div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}

function ProfileTab({ refreshUser }: { refreshUser: () => Promise<void> }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setBusy(true);
    try {
      await api.put("/api/auth/me", {
        full_name: fullName || undefined,
        phone: phone || undefined,
        email: email || undefined,
      });
      await refreshUser();
      setMsg("Đã cập nhật hồ sơ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <HudPanel accent="fire" className="p-5 md:p-8">
      <form onSubmit={save} className="space-y-5">
      <h2 className="text-center font-display font-bold uppercase tracking-wide text-2xl text-white">
        Thông tin <span className="text-gradient-fire">tài khoản</span>
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-zinc-300">Tên đăng nhập</label>
          <input className="field bg-ink-950/70 text-zinc-500" value={user?.username} disabled />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-zinc-300">Họ tên</label>
          <input
            className="field"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-zinc-300">
            Số điện thoại (Zalo)
          </label>
          <input
            className="field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-zinc-300">Email</label>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      {msg && <div className="text-emerald-400 text-sm text-center">{msg}</div>}
      {error && <div className="text-ember-400 text-sm text-center">{error}</div>}
      <div className="flex justify-center gap-3 pt-1 flex-wrap">
        <HudButton disabled={busy}>
          {busy ? "Đang lưu..." : "Lưu thay đổi"}
        </HudButton>
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-[4px] border border-volt-500/40 px-6 py-3 font-bold text-volt-300 shadow-[0_0_22px_-10px_rgba(6,182,212,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-volt-500/10 hover:text-white"
        >
          <Lock className="w-4 h-4" />
          {showPw ? "Đóng đổi mật khẩu" : "Đổi mật khẩu"}
        </button>
      </div>
      </form>
    </HudPanel>
    {showPw && (
      <div className="mt-6">
        <PasswordTab />
      </div>
    )}
    </>
  );
}

function MyPostsTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Post[]>("/api/posts/me/list")
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Xóa bài đăng này?")) return;
    await api.del(`/api/posts/${id}`);
    load();
  }
  async function toggleSold(id: number) {
    await api.post(`/api/posts/${id}/toggle-sold`);
    load();
  }

  if (loading)
    return <div className="text-zinc-500 text-center py-8">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="w-10" aria-hidden />
        <h2 className="text-center font-display font-bold uppercase tracking-wide text-2xl text-white">
          Bài đăng <span className="text-gradient-fire">của tôi</span>
        </h2>
        <Link
          href="/posts/new"
          aria-label="Đăng bài mới"
          title="Đăng bài mới"
          className="grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 bg-transparent text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>
      {posts.length ? (
        <div className="divide-y divide-ink-800 border-y border-ink-800">
          {posts.map((p, idx) => (
            <article key={`post-${p.id}-${idx}`} className="flex items-center gap-3 py-4">
              <Link
                href={`/posts/${p.id}`}
                className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 overflow-hidden bg-ink-900 frame-soft"
                aria-label={p.title || "Chi tiết bài đăng"}
              >
                <span className="frame-soft-in block h-full">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(p.images[0].image_url)}
                      alt=""
                      className="w-full h-full object-cover transition duration-300 hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-zinc-600">
                      <ScrollText className="w-7 h-7" />
                    </span>
                  )}
                </span>
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-zinc-500">
                    {formatDate(p.created_at)}
                  </span>
                  <span className="text-xs bg-ink-800 text-zinc-300 border border-ink-700 px-2 py-0.5 rounded">
                    {POST_STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                <Link href={`/posts/${p.id}`} className="group block">
                  <h3 className="font-display font-bold uppercase tracking-wide text-white break-words group-hover:text-fire-300 transition">
                    {p.title || "(Không tiêu đề)"}
                  </h3>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap break-words">
                    {p.caption}
                  </p>
                </Link>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded border ${
                    p.post_type === "sell"
                      ? "bg-ember-500/15 text-ember-300 border-ember-500/30"
                      : "bg-volt-500/15 text-volt-300 border-volt-500/30"
                  }`}
                >
                  {p.post_type === "sell" ? "CẦN BÁN" : "CẦN MUA"}
                </span>
                <span className="font-display font-bold text-gradient-fire text-lg md:text-xl whitespace-nowrap">
                  {p.price ? formatPrice(p.price) : "Thỏa thuận"}
                </span>
                <div className="flex items-center gap-2">
                  {(p.status === "approved" || p.status === "closed") && (
                    <div className="relative group/tip">
                      <button
                        onClick={() => toggleSold(p.id)}
                        aria-label={p.status === "closed" ? "Mở lại" : "Đánh dấu đã bán"}
                        className={`grid place-items-center w-9 h-9 clip-chien-sm border transition ${
                          p.status === "closed"
                            ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                            : "border-gold-500/45 text-gold-300 hover:bg-gold-500/10"
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                      </button>
                      <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
                        {p.status === "closed" ? "Mở lại" : "Đánh dấu đã bán"}
                      </span>
                    </div>
                  )}
                  <div className="relative group/tip">
                    <button
                      onClick={() => remove(p.id)}
                      aria-label="Xóa"
                      className="grid place-items-center w-9 h-9 clip-chien-sm border border-ember-500/45 text-ember-400 hover:text-white hover:bg-ember-500/10 transition"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                    <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
                      Xóa bài đăng
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-zinc-500 text-center py-8 surface">
          Bạn chưa có bài đăng nào.
        </div>
      )}
    </div>
  );
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "bg-gold-500/15 text-gold-300 border border-gold-500/30",
  paid: "bg-volt-500/15 text-volt-300 border border-volt-500/30",
  processing: "bg-volt-500/15 text-volt-300 border border-volt-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  cancelled: "bg-ink-800 text-zinc-500 border border-ink-700",
};
const PAYMENT_COLOR: Record<string, string> = {
  unpaid: "bg-ink-800 text-zinc-500 border border-ink-700",
  pending_confirm: "bg-gold-500/15 text-gold-300 border border-gold-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
};

function MyOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>("/api/orders/me/list")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="text-zinc-500 text-center py-8">Đang tải...</div>;
  if (!orders.length)
    return (
      <div className="mx-auto max-w-2xl text-center py-8 space-y-4">
        <h2 className="font-display font-bold uppercase tracking-wide text-2xl text-white">
          Đơn order <span className="text-gradient-fire">của tôi</span>
        </h2>
        <p className="text-zinc-500">Bạn chưa có đơn order nào.</p>
        <div className="flex justify-center">
          <HudLink href="/order">Order ngay</HudLink>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="w-10" aria-hidden />
        <h2 className="text-center font-display font-bold uppercase tracking-wide text-2xl text-white">
          Đơn order <span className="text-gradient-fire">của tôi</span>
        </h2>
        <Link
          href="/order"
          aria-label="Tạo đơn order"
          title="Tạo đơn order"
          className="grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 bg-transparent text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>
      <div className="space-y-3">
        {orders.map((o, idx) => (
          <article
            key={`order-${o.id}-${idx}`}
            className="group relative overflow-hidden rounded-[4px] border border-fire-500/20 bg-transparent p-4 transition duration-300 hover:border-fire-500/40 hover:shadow-[0_0_34px_-12px_rgba(255,77,0,0.75)]"
          >
            <span className="pointer-events-none absolute z-10 w-4 h-4 top-0 left-0 border-t-2 border-l-2 border-fire-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
            <span className="pointer-events-none absolute z-10 w-4 h-4 top-0 right-0 border-t-2 border-r-2 border-ember-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
            <span className="pointer-events-none absolute z-10 w-4 h-4 bottom-0 left-0 border-b-2 border-l-2 border-fire-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
            <span className="pointer-events-none absolute z-10 w-4 h-4 bottom-0 right-0 border-b-2 border-r-2 border-ember-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />

            <div className="relative flex flex-col md:flex-row md:items-start gap-4">
              <div className="grid place-items-center w-12 h-12 clip-chien-sm border border-fire-500/35 text-fire-300 shrink-0">
                <Tag className="w-6 h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div>
                  <div className="font-display font-bold uppercase tracking-wide text-white text-lg">
                    {o.order_code}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {formatDate(o.created_at)}
                  </div>
                </div>
              </div>

              <div className="md:min-w-52 flex md:flex-col items-start md:items-end gap-2 flex-wrap">
                <span
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    ORDER_STATUS_COLOR[o.status] || "bg-ink-800 text-zinc-500 border border-ink-700"
                  }`}
                >
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    PAYMENT_COLOR[o.payment_status] || "bg-ink-800 text-zinc-500 border border-ink-700"
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status}
                </span>
                {o.amount != null && (
                  <div className="font-display font-bold text-gradient-fire text-lg whitespace-nowrap">
                    {formatPrice(o.amount)}
                  </div>
                )}
              </div>
            </div>

            {o.form_data && Object.keys(o.form_data).length > 0 && (
              <div className="relative mt-4 border-t border-ink-700/70 pt-3 text-sm text-zinc-300 space-y-0.5">
                {Object.entries(o.form_data).map(([k, v]) => (
                  <div key={`order-${o.id}-${k}`}>
                    {k}: <b className="text-zinc-100">{Array.isArray(v) ? v.join(", ") : String(v)}</b>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

const DEPOSIT_COLOR: Record<string, string> = {
  pending: "bg-gold-500/15 text-gold-300 border border-gold-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-ember-500/15 text-ember-300 border border-ember-500/30",
};

const FIN_PAGE_SIZE = 6;

/** Pager số trang — bản dark cho giao diện người dùng. */
function DarkPager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  const total = Math.max(1, pages);
  const nums: (number | "gap")[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= page - 1 && i <= page + 1)) {
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
        className="px-3 py-1.5 rounded border border-ink-700 bg-ink-900/60 text-sm text-zinc-300 hover:border-fire-500/50 hover:text-white transition disabled:opacity-40"
      >
        Trước
      </button>
      {nums.map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1.5 text-zinc-600 select-none">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? "page" : undefined}
            className={`min-w-[36px] px-2.5 py-1.5 rounded border text-sm transition ${
              n === page
                ? "border-fire-500 bg-gradient-to-br from-fire-500 to-ember-500 text-white font-bold glow-fire"
                : "border-ink-700 bg-ink-900/60 text-zinc-300 hover:border-fire-500/50 hover:text-white"
            }`}
          >
            {n}
          </button>
        ),
      )}
      <button
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded border border-ink-700 bg-ink-900/60 text-sm text-zinc-300 hover:border-fire-500/50 hover:text-white transition disabled:opacity-40"
      >
        Sau
      </button>
    </div>
  );
}

function FinanceTab() {
  const { user, refreshUser } = useAuth();
  const [wallet, setWallet] = useState<WalletMe | null>(null);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [depPage, setDepPage] = useState(1);
  const [txnPage, setTxnPage] = useState(1);

  useEffect(() => {
    Promise.all([
      api.get<WalletMe>("/api/wallet/me").catch(() => null),
      api.get<DepositRequest[]>("/api/deposits/me").catch(() => []),
    ])
      .then(([w, d]) => {
        setWallet(w);
        setDeposits(d || []);
      })
      .finally(() => setLoading(false));
    // Đồng bộ lại số dư trên header/hồ sơ.
    refreshUser();
  }, [refreshUser]);

  const balance = wallet?.balance ?? user?.balance ?? 0;
  const txns = wallet?.transactions || [];

  const depPages = Math.max(1, Math.ceil(deposits.length / FIN_PAGE_SIZE));
  const txnPages = Math.max(1, Math.ceil(txns.length / FIN_PAGE_SIZE));
  const depItems = deposits.slice(
    (Math.min(depPage, depPages) - 1) * FIN_PAGE_SIZE,
    Math.min(depPage, depPages) * FIN_PAGE_SIZE,
  );
  const txnItems = txns.slice(
    (Math.min(txnPage, txnPages) - 1) * FIN_PAGE_SIZE,
    Math.min(txnPage, txnPages) * FIN_PAGE_SIZE,
  );

  if (loading)
    return <div className="text-zinc-500 text-center py-8">Đang tải...</div>;

  return (
    <div className="space-y-6">
      {/* Thẻ số dư — rộng bằng khung trang */}
      <div className="relative overflow-hidden rounded-[6px] border border-gold-400/30 bg-gradient-to-br from-ink-900 via-ink-900 to-gold-500/5 p-6 md:p-8 shadow-[0_0_40px_-16px_rgba(212,175,55,0.6)]">
        <span className="pointer-events-none absolute z-10 w-5 h-5 top-0 left-0 border-t-2 border-l-2 border-gold-300" />
        <span className="pointer-events-none absolute z-10 w-5 h-5 top-0 right-0 border-t-2 border-r-2 border-gold-300" />
        <span className="pointer-events-none absolute z-10 w-5 h-5 bottom-0 left-0 border-b-2 border-l-2 border-gold-300" />
        <span className="pointer-events-none absolute z-10 w-5 h-5 bottom-0 right-0 border-b-2 border-r-2 border-gold-300" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 text-center sm:text-left">
          <div>
            <h2 className="font-display font-bold uppercase tracking-wide text-xl text-white mb-3">
              Ví <span className="text-gradient-fire">tài chính</span>
            </h2>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold-400 mb-1.5">
              Số dư khả dụng
            </div>
            <div className="font-display text-4xl md:text-5xl font-black text-gradient-fire drop-shadow-[0_0_15px_rgba(255,77,0,0.35)]">
              {formatPrice(balance)}
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-4">
            <span className="hidden sm:grid place-items-center w-14 h-14 clip-chien-sm bg-gradient-to-br from-gold-400 to-ember-600 text-white glow-fire shrink-0">
              <Coins className="w-7 h-7" />
            </span>
            <HudLink href="/nap-tien">
              <span className="inline-flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Nạp tiền
              </span>
            </HudLink>
          </div>
        </div>
      </div>

      {/* 2 cột luôn cao bằng nhau: Lịch sử nạp | Biến động số dư */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lịch sử nạp tiền */}
        <HudPanel accent="gold" className="p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-ink-700">
            <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-gold-300 to-gold-500" />
            <h3 className="font-display font-bold uppercase tracking-wide text-lg text-white">
              Lịch sử nạp tiền
            </h3>
          </div>
          <div className="flex-1">
            {depItems.length ? (
              <div className="divide-y divide-ink-800">
                {depItems.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-100">{formatPrice(d.amount)}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 break-all">
                        {d.transfer_content} · {formatDate(d.created_at)}
                      </div>
                      {d.status === "rejected" && d.admin_note && (
                        <div className="text-xs text-ember-300 mt-0.5">Lý do: {d.admin_note}</div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs px-2.5 py-1 rounded font-medium ${
                        DEPOSIT_COLOR[d.status] || "bg-ink-800 text-zinc-500 border border-ink-700"
                      }`}
                    >
                      {DEPOSIT_STATUS_LABELS[d.status] || d.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm py-6 text-center">
                Bạn chưa có lượt nạp nào.
              </div>
            )}
          </div>
          <DarkPager page={Math.min(depPage, depPages)} pages={depPages} onChange={setDepPage} />
        </HudPanel>

        {/* Biến động số dư */}
        <HudPanel accent="fire" className="p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-ink-700">
            <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-fire-500 to-ember-500" />
            <h3 className="font-display font-bold uppercase tracking-wide text-lg text-white">
              Biến động số dư
            </h3>
          </div>
          <div className="flex-1">
            {txnItems.length ? (
              <div className="divide-y divide-ink-800">
                {txnItems.map((t) => {
                  const credit = t.amount >= 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-200">
                          {TXN_TYPE_LABELS[t.type] || t.type}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {t.note || "—"} · {formatDate(t.created_at)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={`font-display font-bold ${
                            credit ? "text-emerald-400" : "text-ember-400"
                          }`}
                        >
                          {credit ? "+" : "−"}
                          {formatPrice(Math.abs(t.amount))}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Số dư: {formatPrice(t.balance_after)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm py-6 text-center">
                Chưa có giao dịch nào.
              </div>
            )}
          </div>
          <DarkPager page={Math.min(txnPage, txnPages)} pages={txnPages} onChange={setTxnPage} />
        </HudPanel>
      </div>
    </div>
  );
}

function PurchasesTab() {
  const [items, setItems] = useState<PurchasedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactFor, setContactFor] = useState<PurchasedAccount | null>(null);

  useEffect(() => {
    api
      .get<PurchasedAccount[]>("/api/purchases/me")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="text-zinc-500 text-center py-8">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-center font-display font-bold uppercase tracking-wide text-2xl text-white">
        Acc <span className="text-gradient-fire">đã mua</span>
      </h2>
      {items.length ? (
        <>
          <p className="text-sm text-zinc-500 text-center -mt-2">
            Acc đã thanh toán được shop giữ riêng cho bạn — bấm{" "}
            <b className="text-fire-300">Liên hệ</b> để nhận acc.
          </p>
          <div className="divide-y divide-ink-800 border-y border-ink-800">
            {items.map((p, idx) => (
              <div
                key={`purchase-${p.account_id}-${idx}`}
                className="flex items-center gap-3 py-4"
              >
                <Link
                  href={`/accounts/${p.account_id}`}
                  className="relative w-20 h-20 shrink-0 overflow-hidden bg-ink-900 frame-soft"
                  aria-label={`Chi tiết acc ${p.account_code}`}
                >
                  <span className="frame-soft-in block h-full">
                    {p.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl(p.thumbnail)}
                        alt=""
                        className="w-full h-full object-cover transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-zinc-600">
                        <Gamepad className="w-7 h-7" />
                      </span>
                    )}
                  </span>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/accounts/${p.account_id}`}
                    className="font-display font-bold uppercase tracking-wide text-white hover:text-fire-300 transition"
                  >
                    {p.account_code}
                  </Link>
                  <div className="text-xs text-zinc-500 mt-1">
                    Mua ngày {formatDate(p.purchased_at)}
                  </div>
                  <span className="inline-flex mt-1.5 text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                    Đã thanh toán
                  </span>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <div className="font-display font-bold text-gradient-fire text-lg whitespace-nowrap">
                    {formatPrice(p.amount)}
                  </div>
                  {p.contact && (
                    <button
                      type="button"
                      onClick={() => setContactFor(p)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg clip-chien-sm border border-fire-500/45 text-fire-300 text-sm font-semibold hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-6px_rgba(255,106,0,0.6)]"
                    >
                      <Headset className="w-4 h-4" />
                      Liên hệ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="surface max-w-xl mx-auto p-8 md:p-10 text-center">
          <span className="mx-auto grid place-items-center w-14 h-14 clip-chien-sm bg-ink-900 border border-fire-500/35 text-fire-400 shadow-[0_0_24px_-10px_rgba(255,106,0,0.8)]">
            <Gamepad className="w-7 h-7" />
          </span>
          <div className="mt-4 font-display font-bold uppercase tracking-wide text-xl text-white">
            Bạn chưa mua acc nào
          </div>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
            Hàng loạt acc Free Fire đang chờ chủ mới — thanh toán nhanh gọn bằng
            số dư ví, nhận acc ngay từ shop.
          </p>
          <Link href="/accounts" className="btn-fire mt-5">
            <Zap className="w-5 h-5" />
            Tìm acc ngay
          </Link>
        </div>
      )}

      {contactFor && (
        <ContactReceiveModal
          purchase={contactFor}
          onClose={() => setContactFor(null)}
        />
      )}
    </div>
  );
}

/** Bảng liên hệ nhận acc — theo liên hệ (Zalo/Facebook) đã gắn với từng acc. */
function ContactReceiveModal({
  purchase,
  onClose,
}: {
  purchase: PurchasedAccount;
  onClose: () => void;
}) {
  const c = purchase.contact;
  if (!c) return null;
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm grid place-items-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-xl border border-fire-500/30 bg-ink-950 p-6 text-zinc-200 shadow-[0_0_60px_-18px_rgba(255,77,0,0.7)] text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mx-auto grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire">
            <Headset className="w-6 h-6" />
          </span>
          <h3 className="font-display font-bold text-lg uppercase tracking-wide text-white mt-3">
            Nhận acc <span className="text-gradient-fire">{purchase.account_code}</span>
          </h3>
          <p className="text-sm text-zinc-400 mt-1.5">
            Nhắn <b className="text-zinc-200">{c.name || "shop"}</b> để được bàn
            giao acc nhanh nhất.
          </p>

          <div className="mt-5 grid gap-2.5">
            {c.zalo_link && (
              <a
                href={c.zalo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <MessageCircle className="w-5 h-5" />
                Nhắn Zalo
              </a>
            )}
            {c.facebook_link && (
              <a
                href={c.facebook_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <Facebook className="w-5 h-5" />
                Nhắn Facebook
              </a>
            )}
            {!c.zalo_link && !c.facebook_link && (
              <div className="text-sm text-zinc-400">
                SĐT liên hệ: <b className="text-gold-300">{c.phone || "—"}</b>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-2 rounded-lg border border-ink-700 text-zinc-300 hover:border-fire-500/50 hover:text-white transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

function PasswordTab() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    if (newPw.length < 6) {
      setError("Mật khẩu mới phải từ 6 ký tự");
      return;
    }
    setBusy(true);
    try {
      // Đổi mật khẩu vô hiệu mọi token cũ -> lưu lại token mới cho phiên này.
      const res = await api.post<AuthToken>("/api/auth/change-password", {
        old_password: oldPw,
        new_password: newPw,
      });
      setTokens(res.access_token, res.refresh_token);
      setMsg("Đổi mật khẩu thành công. Các thiết bị khác đã bị đăng xuất.");
      setOldPw("");
      setNewPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HudPanel accent="volt" className="p-5 md:p-8">
      <form onSubmit={submit} className="space-y-5">
      <h2 className="text-center font-display font-bold uppercase tracking-wide text-2xl text-white">
        Đổi <span className="text-gradient-fire">mật khẩu</span>
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-zinc-300">
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            className="field"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-zinc-300">Mật khẩu mới</label>
          <input
            type="password"
            className="field"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            required
          />
        </div>
      </div>
      {msg && <div className="text-emerald-400 text-sm text-center">{msg}</div>}
      {error && <div className="text-ember-400 text-sm text-center">{error}</div>}
      <div className="flex justify-center pt-1">
        <HudButton disabled={busy}>
          {busy ? "Đang xử lý..." : "Đổi mật khẩu"}
        </HudButton>
      </div>
      </form>
    </HudPanel>
  );
}

function HudButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[4px] border border-fire-500/30 bg-transparent px-6 py-3 font-bold text-white shadow-[0_0_22px_-10px_rgba(255,77,0,0.6)] transition duration-300 hover:-translate-y-0.5 hover:text-fire-300 hover:shadow-[0_0_38px_-8px_rgba(255,77,0,0.85)] disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <span className="pointer-events-none absolute z-10 w-4 h-4 top-0 left-0 border-t-2 border-l-2 border-fire-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="pointer-events-none absolute z-10 w-4 h-4 top-0 right-0 border-t-2 border-r-2 border-ember-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="pointer-events-none absolute z-10 w-4 h-4 bottom-0 left-0 border-b-2 border-l-2 border-fire-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="pointer-events-none absolute z-10 w-4 h-4 bottom-0 right-0 border-b-2 border-r-2 border-ember-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="relative">{children}</span>
    </button>
  );
}

function HudLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center justify-center overflow-hidden rounded-[4px] border border-fire-500/30 bg-transparent px-6 py-3 font-bold text-white shadow-[0_0_22px_-10px_rgba(255,77,0,0.6)] transition duration-300 hover:-translate-y-0.5 hover:text-fire-300 hover:shadow-[0_0_38px_-8px_rgba(255,77,0,0.85)]"
    >
      <span className="pointer-events-none absolute z-10 w-4 h-4 top-0 left-0 border-t-2 border-l-2 border-fire-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="pointer-events-none absolute z-10 w-4 h-4 top-0 right-0 border-t-2 border-r-2 border-ember-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="pointer-events-none absolute z-10 w-4 h-4 bottom-0 left-0 border-b-2 border-l-2 border-fire-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="pointer-events-none absolute z-10 w-4 h-4 bottom-0 right-0 border-b-2 border-r-2 border-ember-500 transition-all duration-300 group-hover:w-6 group-hover:h-6" />
      <span className="relative">{children}</span>
    </Link>
  );
}
