"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Coins,
  Crown,
  Gamepad,
  Headset,
  Layers,
  Rocket,
  ScrollText,
  ShieldCheck,
  Tag,
  Trophy,
  User,
  Zap,
} from "../components/icons";
import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import type { DashboardStats } from "../lib/types";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardStats>("/api/admin/dashboard")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-500">
        Đang tải trung tâm quản trị...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-fire-500/30 bg-fire-500/10 p-5 text-fire-200">
        Không tải được thống kê hệ thống.
      </div>
    );
  }

  const detail = [
    { label: "Người dùng", value: stats.total_users, Icon: User, tone: "cyan" },
    { label: "Tổng acc", value: stats.total_accounts, Icon: Gamepad, tone: "fire" },
    { label: "Acc còn hàng", value: stats.available_accounts, Icon: BadgeCheck, tone: "green" },
    { label: "Acc đã bán", value: stats.sold_accounts, Icon: Trophy, tone: "gold" },
    { label: "Tổng đơn order", value: stats.total_orders, Icon: Rocket, tone: "cyan" },
    { label: "Order chờ xử lý", value: stats.pending_orders, Icon: Clock, tone: "gold" },
    { label: "Order đã thanh toán", value: stats.paid_orders, Icon: Coins, tone: "green" },
    { label: "Tổng bài đăng", value: stats.total_posts, Icon: ScrollText, tone: "fire" },
    { label: "Bài đã duyệt", value: stats.approved_posts, Icon: ShieldCheck, tone: "green" },
    { label: "Liên hệ mua acc", value: stats.total_account_contacts, Icon: Headset, tone: "cyan" },
    { label: "Liên hệ qua bài", value: stats.total_post_contacts, Icon: Tag, tone: "gold" },
  ];

  const maxVal = Math.max(
    1,
    ...stats.timeseries.flatMap((p) => [p.accounts, p.orders]),
  );

  return (
    <div className="space-y-6">
      <section className="admin-hero-panel overflow-hidden p-5 sm:p-6">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire">
              <Layers className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">
                Control Center
              </p>
              <h1 className="mt-1 text-3xl sm:text-4xl">
                Tổng quan <span className="text-gradient-fire">quản trị</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-400">
                Theo dõi doanh thu, acc, order, bài đăng và liên hệ trong một bảng điều khiển chi tiết.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-80">
            <MiniStat label="Doanh thu cọc" value={formatPrice(stats.deposit_revenue)} />
            <MiniStat label="Tháng này" value={formatPrice(stats.revenue_this_month)} />
          </div>
        </div>
      </section>

      <section className="admin-quick-grid hidden lg:grid">
        <QuickAction
          href="/admin/accounts"
          label="Kho acc"
          desc="Thêm, sửa, ẩn, bán và kiểm soát ảnh acc."
          Icon={Gamepad}
          tone="fire"
        />
        <QuickAction
          href="/admin/orders"
          label="Xác nhận order"
          desc="Kiểm tra bill, trạng thái thanh toán và tiến độ."
          Icon={Rocket}
          tone="cyan"
        />
        <QuickAction
          href="/admin/posts"
          label="Duyệt bài đăng"
          desc="Quản lý tin mua bán và liên hệ khách hàng."
          Icon={ScrollText}
          tone="gold"
        />
        <QuickAction
          href="/admin/settings"
          label="Cấu hình hệ thống"
          desc="Điều chỉnh dữ liệu động, banner và tùy chọn site."
          Icon={Zap}
          tone="green"
        />
      </section>

      <div className="admin-summary-grid">
        <RevenueCard
          label="Doanh thu cọc đã xác nhận"
          value={formatPrice(stats.deposit_revenue)}
          sub={`Tháng này: ${formatPrice(stats.revenue_this_month)}`}
        />
        <AlertCard
          href="/admin/orders"
          label="Đơn chờ xác nhận"
          value={stats.orders_pending_confirm}
          Icon={Clock}
          tone="gold"
        />
        <AlertCard
          href="/admin/posts"
          label="Bài chờ duyệt"
          value={stats.pending_posts}
          Icon={ScrollText}
          tone="fire"
        />
        <AlertCard
          href="/admin/accounts"
          label="Acc còn hàng"
          value={stats.available_accounts}
          Icon={Crown}
          tone="green"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <section className="admin-panel p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="admin-section-title">Acc & đơn 14 ngày qua</h2>
              <p className="mt-1 text-sm text-zinc-500">
                So sánh lượng acc mới và order phát sinh theo từng ngày.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-fire-400" /> Acc
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Đơn
              </span>
            </div>
          </div>
          <div className="mt-5 flex h-56 items-end gap-1.5 sm:gap-2">
            {stats.timeseries.map((p) => (
              <div
                key={p.date}
                className="group flex min-w-0 flex-1 flex-col items-center gap-2"
                title={`${p.date} · Acc ${p.accounts} · Đơn ${p.orders}`}
              >
                <div className="flex h-44 w-full items-end justify-center gap-1 rounded-t-md border-b border-ink-700/80 bg-white/[0.015] px-0.5">
                  <div
                    className="w-2.5 rounded-t-sm bg-gradient-to-t from-ember-600 to-fire-300 shadow-[0_0_14px_rgba(255,106,0,.32)] transition-all group-hover:brightness-125"
                    style={{ height: `${(p.accounts / maxVal) * 100}%` }}
                  />
                  <div
                    className="w-2.5 rounded-t-sm bg-gradient-to-t from-sky-700 to-sky-300 shadow-[0_0_14px_rgba(56,189,248,.28)] transition-all group-hover:brightness-125"
                    style={{ height: `${(p.orders / maxVal) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-zinc-600">
                  {p.date.slice(8)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="admin-section-title">Acc được quan tâm nhất</h2>
              <p className="mt-1 text-sm text-zinc-500">Xếp theo lượt liên hệ mua.</p>
            </div>
            <Trophy className="h-6 w-6 text-gold-300" />
          </div>
          {stats.top_accounts.length ? (
            <div className="mt-4 space-y-2.5">
              {stats.top_accounts.map((a, i) => (
                <Link
                  key={`top-account-${a.id}-${i}`}
                  href="/admin/accounts"
                  className="group flex items-center gap-3 rounded-lg border border-ink-800 bg-white/[0.025] p-3 transition hover:border-fire-500/50 hover:bg-fire-500/10"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center clip-chien-sm bg-gradient-to-br from-ink-800 to-ink-950 text-sm font-black text-fire-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-black text-white">{a.account_code}</div>
                    <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                      {formatPrice(a.sale_price)} · {a.view_count} lượt xem
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md border border-fire-500/30 bg-fire-500/10 px-2 py-1 text-xs font-black text-fire-300">
                    {a.contact_count} liên hệ
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-ink-800 py-8 text-center text-sm text-zinc-500">
              Chưa có dữ liệu.
            </div>
          )}
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {detail.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-right">
      <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 truncate font-display text-lg font-black text-white">
        {value}
      </div>
    </div>
  );
}

function RevenueCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="admin-revenue-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-100/80">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl font-black text-white">
            {value}
          </div>
          <div className="mt-2 text-xs font-bold text-orange-100/85">{sub}</div>
        </div>
        <Coins className="h-7 w-7 shrink-0 text-white/85" />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  desc,
  Icon,
  tone,
}: {
  href: string;
  label: string;
  desc: string;
  Icon: typeof Gamepad;
  tone: "fire" | "cyan" | "gold" | "green";
}) {
  return (
    <Link href={href} className={`group admin-quick-action admin-quick-${tone}`}>
      <span className="grid h-12 w-12 place-items-center clip-chien-sm admin-quick-icon">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <b className="block font-display text-xl uppercase leading-none text-white">
          {label}
        </b>
        <span className="mt-1 block text-sm font-semibold leading-snug text-zinc-500">
          {desc}
        </span>
      </span>
      <ArrowRight className="ml-auto h-5 w-5 shrink-0 opacity-55 transition group-hover:translate-x-1 group-hover:opacity-100" />
    </Link>
  );
}

function AlertCard({
  href,
  label,
  value,
  Icon,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  Icon: typeof Clock;
  tone: "gold" | "fire" | "green";
}) {
  const tones = {
    gold: "admin-alert-gold",
    fire: "admin-alert-fire",
    green: "admin-alert-green",
  };
  return (
    <Link href={href} className={`admin-alert-card ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-3xl font-black">{value}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-wide opacity-80">
            {label}
          </div>
        </div>
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-black">
        Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: typeof User;
  tone: string;
}) {
  return (
    <div className={`admin-metric-card admin-metric-${tone}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center clip-chien-sm admin-metric-icon">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-2xl font-black leading-none text-white">
          {value}
        </div>
        <div className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-zinc-500">
          {label}
        </div>
      </div>
    </div>
  );
}
