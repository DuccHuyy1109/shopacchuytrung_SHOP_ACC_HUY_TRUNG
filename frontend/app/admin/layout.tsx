"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import {
  ArrowRight,
  Coins,
  Crown,
  Layers,
  Rocket,
  ScrollText,
  ShieldCheck,
  Tag,
  User,
} from "../components/icons";

const NAV = [
  { href: "/admin", label: "Tổng quan", Icon: Layers },
  { href: "/admin/accounts", label: "Quản lý Acc", Icon: Crown },
  { href: "/admin/orders", label: "Đơn Order", Icon: Rocket },
  { href: "/admin/posts", label: "Bài đăng & Liên hệ", Icon: ScrollText },
  { href: "/admin/users", label: "Người dùng", Icon: User },
  { href: "/admin/finance", label: "Tài chính", Icon: Coins },
  { href: "/admin/settings", label: "Cấu hình", Icon: ShieldCheck },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin")
    return (
      <div className="py-16 text-center text-zinc-500">
        Đang kiểm tra quyền truy cập...
      </div>
    );

  return (
    <div className="admin-shell mx-auto max-w-7xl px-4 py-6 lg:py-6 grid gap-6">
      <aside className="admin-sidebar h-fit lg:sticky lg:top-24">
        <div className="flex items-center gap-3 px-2 pb-4 mb-3 border-b border-ink-800">
          <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire shrink-0">
            <Tag className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <div className="font-display font-extrabold uppercase tracking-wide text-white leading-none">
              Trung tâm <span className="text-gradient-fire">quản trị</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500 truncate">
              @{user.username} · toàn quyền hệ thống
            </div>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-2 lg:flex lg:flex-1 lg:items-center lg:justify-between lg:gap-2">
          {NAV.map((n) => {
            const active =
              n.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`admin-nav-item ${
                  active
                    ? "admin-nav-active"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <n.Icon className="w-4 h-4 shrink-0" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="mt-3 flex lg:hidden items-center justify-between gap-2.5 rounded-lg border border-ink-700 px-3 py-2.5 text-sm font-semibold text-zinc-400 transition hover:border-fire-500/60 hover:text-white"
        >
          Về trang chủ
          <ArrowRight className="w-4 h-4" />
        </Link>
      </aside>
      <main className="admin-content min-w-0">{children}</main>
    </div>
  );
}
