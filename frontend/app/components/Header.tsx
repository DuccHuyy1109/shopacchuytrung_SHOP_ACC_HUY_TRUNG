"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatPrice } from "../lib/format";
import type { PriceCategory } from "../lib/types";
import {
  Search,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Crown,
  Flame,
  Gamepad,
  Gem,
  Tag,
  Rocket,
  ScrollText,
  Layers,
  Zap,
  Sparkles,
} from "./icons";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const typeParam = sp.get("type");
  const onAccounts = pathname.startsWith("/accounts");
  const active = {
    home: pathname === "/",
    accCo: onAccounts && typeParam === "acc_co",
    sieuPham: onAccounts && typeParam === "sieu_pham",
    theoGia:
      onAccounts &&
      typeParam !== "acc_co" &&
      typeParam !== "sieu_pham" &&
      typeParam !== "acc_thuong",
    order: pathname.startsWith("/order"),
    dinhGia: pathname.startsWith("/dinh-gia"),
    posts: pathname.startsWith("/posts"),
    guides: pathname.startsWith("/guides"),
    wiki: pathname.startsWith("/wiki"),
  };
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [siteName, setSiteName] = useState("Shop Acc Huy Trung");
  // Chức năng mua acc bằng ví (cấu hình site) — tắt thì ẩn mục "Acc của tôi".
  const [buyEnabled, setBuyEnabled] = useState(false);
  // Chức năng Tra cứu (Wiki) — mặc định ẩn, admin bật/tắt qua cấu hình site.
  const [wikiEnabled, setWikiEnabled] = useState(false);
  const [search, setSearch] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);
  const [mobilePriceOpen, setMobilePriceOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Chỉ render khối tài khoản sau khi mount: Header nằm trong Suspense nên có
  // thể hydrate SAU khi auth đã load xong -> server (chưa đăng nhập) khác
  // client (đã đăng nhập) gây lỗi hydration. Gate bằng mounted để 2 bên khớp.
  const [mounted, setMounted] = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  // Dropdown "Acc theo giá" đặt NGOÀI thanh nav cuộn ngang (tránh bị cắt).
  const navRef = useRef<HTMLElement>(null);
  const priceMenuRef = useRef<HTMLDivElement>(null);
  const [pricePos, setPricePos] = useState<{ left: number } | null>(null);
  // Kéo-thả chuột để cuộn thanh danh mục ngang (desktop).
  const navScrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  // Mở/đóng dropdown giá — tính vị trí theo nút (do nút nằm trong vùng cuộn).
  function togglePrice() {
    if (priceOpen) {
      setPriceOpen(false);
      return;
    }
    const navR = navRef.current?.getBoundingClientRect();
    const btnR = priceRef.current?.getBoundingClientRect();
    if (navR && btnR) {
      const left = Math.max(8, Math.min(btnR.left - navR.left, navR.width - 232));
      setPricePos({ left });
    }
    setPriceOpen(true);
  }

  // Kéo chuột để cuộn thanh danh mục (touch dùng cuộn tự nhiên).
  function onNavPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = navScrollRef.current;
    if (!el) return;
    dragRef.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  }
  function onNavPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    const el = navScrollRef.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.startLeft - dx;
  }
  function onNavPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current.down = false;
    navScrollRef.current?.releasePointerCapture?.(e.pointerId);
  }
  // Nếu vừa kéo (di chuyển) thì chặn click điều hướng/đóng-mở dropdown.
  function onNavClickCapture(e: React.MouseEvent) {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mở menu người dùng -> nạp lại cấu hình để mục "Acc của tôi" phản ánh
  // đúng trạng thái bật/tắt mới nhất (admin vừa đổi không cần reload trang).
  useEffect(() => {
    if (!userOpen) return;
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setBuyEnabled(s.buy_account_enabled === "1"))
      .catch(() => {});
  }, [userOpen]);

  useEffect(() => {
    api
      .get<PriceCategory[]>("/api/categories")
      .then(setCategories)
      .catch(() => {});
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => {
        if (s.site_name) setSiteName(s.site_name);
        setBuyEnabled(s.buy_account_enabled === "1");
        setWikiEnabled(s.wiki_enabled === "1");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        priceRef.current &&
        !priceRef.current.contains(t) &&
        (!priceMenuRef.current || !priceMenuRef.current.contains(t))
      )
        setPriceOpen(false);
      if (userRef.current && !userRef.current.contains(t)) setUserOpen(false);
    }
    function onResize() {
      setPriceOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/accounts?q=${encodeURIComponent(search.trim())}`);
    setMobileOpen(false);
  }

  const searchBox = (
    <form onSubmit={submitSearch} className="w-full">
      <div className="frame-chien-thin">
        <div className="frame-chien-thin-in flex items-stretch overflow-hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm acc theo mã, tên, mô tả..."
            className="w-full bg-transparent px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 bg-gradient-to-br from-fire-500 to-ember-500 text-white text-sm font-semibold hover:brightness-110 transition"
            aria-label="Tìm kiếm"
          >
            <Search className="w-4 h-4" />
            <span className="hidden lg:block">Tìm</span>
          </button>
        </div>
      </div>
    </form>
  );

  const authBox = !mounted ? (
    // Khung giữ chỗ cùng kích thước để tránh nhảy layout khi hydrate.
    <div
      aria-hidden
      className="h-11 w-24 sm:w-40 rounded-lg border border-white/10 bg-ink-900/50 animate-pulse"
    />
  ) : user ? (
    <div className="relative" ref={userRef}>
      <button
        onClick={() => setUserOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-ink-900/60 pl-1.5 pr-2.5 text-sm shadow-[0_0_18px_-12px_rgba(255,255,255,0.9)] transition hover:border-fire-500/60 hover:text-white"
      >
        <span className="grid place-items-center w-8 h-8 rounded-md bg-gradient-to-br from-fire-500 to-ember-600 font-bold text-xs text-white">
          {user.username.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block text-zinc-200 font-medium max-w-[8rem] truncate">
          {user.username}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>
      {userOpen && (
        <div className="absolute right-0 mt-2 w-56 surface shadow-2xl py-1.5 text-sm animate-rise z-50">
          <UserMenuLink href="/account" onClick={() => setUserOpen(false)} Icon={User}>
            Tài khoản của tôi
          </UserMenuLink>
          <UserMenuLink href="/account?tab=posts" onClick={() => setUserOpen(false)} Icon={ScrollText}>
            Bài đăng của tôi
          </UserMenuLink>
          <UserMenuLink href="/account?tab=orders" onClick={() => setUserOpen(false)} Icon={Tag}>
            Đơn order của tôi
          </UserMenuLink>
          {buyEnabled && (
            <UserMenuLink
              href="/account?tab=purchases"
              onClick={() => setUserOpen(false)}
              Icon={Gamepad}
            >
              Acc của tôi
            </UserMenuLink>
          )}
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-4 py-2.5 text-gold-300 font-semibold hover:bg-gold-500/10 transition"
              onClick={() => setUserOpen(false)}
            >
              <Crown className="w-4 h-4" />
              Trang quản trị
            </Link>
          )}
          <div className="my-1 border-t border-ink-700" />
          {/* Số dư ví — bấm vào để mở trang tài chính */}
          <Link
            href="/account?tab=finance"
            onClick={() => setUserOpen(false)}
            className="block px-4 py-3 text-center hover:bg-fire-500/10 transition"
            title="Xem ví tài chính"
          >
            <span className="font-display text-2xl font-black text-gradient-fire drop-shadow-[0_0_14px_rgba(255,77,0,0.4)]">
              {formatPrice(user.balance)}
            </span>
          </Link>
          <div className="my-1 border-t border-ink-700" />
          <button
            onClick={() => {
              logout();
              setUserOpen(false);
              router.push("/");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-ember-400 hover:bg-ember-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  ) : (
    <>
      <Link
        href="/login"
        className="inline-flex h-11 items-center px-3 sm:px-4 rounded-lg text-sm font-semibold text-zinc-200 border border-white/25 bg-ink-900/60 shadow-[0_0_18px_-12px_rgba(255,255,255,0.9)] hover:border-fire-500/60 hover:text-white transition"
      >
        Đăng nhập
      </Link>
      <Link
        href="/register"
        className="inline-flex h-11 items-center gap-1.5 px-3 sm:px-4 rounded-lg clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white text-sm font-bold hover:brightness-110 transition glow-fire"
      >
        Đăng ký
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40">
      {/* Vạch gradient lửa trên cùng */}
      <div className="h-0.5 w-full bg-gradient-to-r from-fire-500 via-ember-500 to-gold-400" />

      {/* Top bar */}
      <div className="relative z-20 bg-ink-950/95 backdrop-blur-md border-b border-ink-800">
        <div className="mx-auto max-w-7xl px-4 py-4 md:py-5">
          <div className="flex items-center gap-3">
            {/* Logo — không khung, phát sáng rìa + điện giật */}
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              <span className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt={siteName}
                  className="logo-electric h-16 w-16 md:h-20 md:w-20 object-contain"
                />
                {/* Tia điện chớp quanh logo */}
                <Zap className="spark absolute -top-1 -right-1 w-4 h-4 text-volt-300" />
                <Zap className="spark spark-2 absolute bottom-0 -left-2 w-3.5 h-3.5 text-white" />
                <Zap className="spark spark-3 absolute top-1/2 -right-2 w-3 h-3 text-fire-300" />
              </span>
              <span className="hidden sm:flex flex-col leading-none">
                <span className="font-display font-extrabold text-xl md:text-2xl tracking-wide text-white uppercase">
                  {siteName}
                </span>
                <span className="text-[0.62rem] md:text-[0.68rem] font-semibold tracking-[0.3em] text-fire-400 uppercase mt-1">
                  Acc khó mà lại có !
                </span>
              </span>
            </Link>

            {/* Search — co giãn theo bề rộng màn hình (desktop) */}
            <div className="hidden md:block min-w-0 flex-1 px-2">
              <div className="mx-auto max-w-lg">{searchBox}</div>
            </div>

            {/* Hamburger (luôn hiện) + Auth */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                className="grid h-11 w-11 place-items-center rounded-lg border border-white/25 bg-ink-900/60 text-zinc-200 shadow-[0_0_18px_-12px_rgba(255,255,255,0.9)] transition hover:border-fire-500/60 hover:text-white"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở danh mục"
              >
                <Menu className="w-5 h-5" />
              </button>
              {authBox}
            </div>
          </div>

          {/* Search — mobile (hàng riêng) */}
          <div className="md:hidden mt-3">{searchBox}</div>
        </div>
      </div>

      {/* Nav bar */}
      <nav ref={navRef} className="relative z-10 hidden bg-ink-900/90 backdrop-blur-md border-b border-ink-800 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.9)] md:block">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          {/* Cuộn ngang (vuốt hoặc kéo chuột) để xem hết danh mục khi màn hình hẹp */}
          <div
            ref={navScrollRef}
            className="flex items-center gap-1 overflow-x-auto cursor-grab select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={() => setPriceOpen(false)}
            onPointerDown={onNavPointerDown}
            onPointerMove={onNavPointerMove}
            onPointerUp={onNavPointerUp}
            onClickCapture={onNavClickCapture}
          >
            <Link href="/" className={navItemCls(active.home)} onClick={() => setMobileOpen(false)}>
              <Flame className="w-4 h-4 text-fire-400" />
              Trang chủ
            </Link>
            <Link href="/accounts?type=acc_co" className={navItemCls(active.accCo)} onClick={() => setMobileOpen(false)}>
              <Crown className="w-4 h-4 text-gold-400" />
              Acc cổ
            </Link>
            <Link href="/accounts?type=sieu_pham" className={navItemCls(active.sieuPham)} onClick={() => setMobileOpen(false)}>
              <Gem className="w-4 h-4 text-ember-400" />
              Acc siêu phẩm
            </Link>

            {/* Acc theo giá — nút (dropdown đặt ngoài vùng cuộn để không bị cắt) */}
            <div ref={priceRef} className="shrink-0">
              <button onClick={togglePrice} className={navItemCls(active.theoGia)}>
                <Tag className="w-4 h-4 text-fire-400" />
                Acc theo giá
                <ChevronDown className={`w-3.5 h-3.5 transition ${priceOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            <Link href="/order" className={navItemCls(active.order)} onClick={() => setMobileOpen(false)}>
              <Rocket className="w-4 h-4 text-volt-400" />
              Order acc
            </Link>
            <Link href="/dinh-gia" className={navItemCls(active.dinhGia)} onClick={() => setMobileOpen(false)}>
              <Gem className="w-4 h-4 text-gold-400" />
              Định giá acc
            </Link>
            <Link href="/posts" className={navItemCls(active.posts)} onClick={() => setMobileOpen(false)}>
              <ScrollText className="w-4 h-4 text-emerald-400" />
              Đăng bài
            </Link>
            <Link href="/guides" className={navItemCls(active.guides)} onClick={() => setMobileOpen(false)}>
              <Crown className="w-4 h-4 text-violet-400" />
              Hướng dẫn
            </Link>
            {wikiEnabled && (
              <Link href="/wiki" className={navItemCls(active.wiki)} onClick={() => setMobileOpen(false)}>
                <Sparkles className="w-4 h-4 text-gold-300" />
                Tra cứu
              </Link>
            )}
          </div>
        </div>

        {/* Dropdown "Acc theo giá" — đặt ngoài vùng cuộn ngang để không bị cắt */}
        {priceOpen && (
          <div
            ref={priceMenuRef}
            style={{ left: pricePos?.left ?? 16 }}
            className="absolute top-full mt-1 w-56 surface shadow-2xl py-1.5 text-sm z-50 animate-rise"
          >
            <Link
              href="/accounts"
              className="flex items-center gap-2.5 px-4 py-2.5 font-semibold text-zinc-100 hover:bg-fire-500/10 transition"
              onClick={() => {
                setPriceOpen(false);
                setMobileOpen(false);
              }}
            >
              <Layers className="w-4 h-4 text-fire-400" />
              Tất cả mức giá
            </Link>
            {categories.map((c, idx) => (
              <Link
                key={`header-category-${c.id}-${idx}`}
                href={`/accounts?category=${c.id}`}
                className="flex items-center gap-2.5 px-4 py-2.5 text-zinc-300 hover:bg-fire-500/10 hover:text-white transition"
                onClick={() => {
                  setPriceOpen(false);
                  setMobileOpen(false);
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-fire-500" />
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div
        className={`fixed inset-0 z-[80] transition ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-ink-950/75 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => {
            setMobileOpen(false);
            setMobilePriceOpen(false);
          }}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[82vw] max-w-sm border-r border-fire-500/25 bg-ink-950 shadow-[0_0_44px_-14px_rgba(255,77,0,0.75)] transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <span className="pointer-events-none absolute right-0 top-6 h-24 w-px bg-gradient-to-b from-transparent via-fire-500 to-transparent" />
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt={siteName} className="h-12 w-12 object-contain" />
              <div>
                <div className="font-display font-bold uppercase tracking-wide text-white">
                  Danh mục
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-fire-400">
                  Acc khó mà lại có !
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                setMobilePriceOpen(false);
              }}
              aria-label="Đóng danh mục"
              className="grid h-10 w-10 place-items-center clip-chien-sm border border-ember-500/55 text-ember-300 transition hover:border-ember-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[calc(100%-81px)] overflow-auto px-3 py-4">
            <MobileNavLink href="/" active={active.home} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={Flame} iconClass="text-fire-400">
              Trang chủ
            </MobileNavLink>

            <div className="my-2">
              <button
                onClick={() => setMobilePriceOpen((v) => !v)}
                className={`w-full ${mobileNavItemCls(active.theoGia)}`}
              >
                <Tag className="w-4 h-4 text-fire-400" />
                <span className="flex-1 text-left">Acc theo giá</span>
                <ChevronDown className={`w-4 h-4 transition ${mobilePriceOpen ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  mobilePriceOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="ml-4 mt-1 border-l border-ink-700 pl-3">
                  <Link
                    href="/accounts"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-zinc-200 hover:text-fire-300"
                    onClick={() => {
                      setMobilePriceOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    <Layers className="w-4 h-4 text-fire-400" />
                    Tất cả mức giá
                  </Link>
                  {categories.map((c, idx) => (
                    <Link
                      key={`mobile-header-category-${c.id}-${idx}`}
                      href={`/accounts?category=${c.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:text-white"
                      onClick={() => {
                        setMobilePriceOpen(false);
                        setMobileOpen(false);
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-fire-500" />
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <MobileNavLink href="/accounts?type=acc_co" active={active.accCo} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={Crown} iconClass="text-gold-400">
              Acc cổ
            </MobileNavLink>
            <MobileNavLink href="/accounts?type=sieu_pham" active={active.sieuPham} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={Gem} iconClass="text-ember-400">
              Acc siêu phẩm
            </MobileNavLink>

            <MobileNavLink href="/order" active={active.order} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={Rocket} iconClass="text-volt-400">
              Order acc
            </MobileNavLink>
            <MobileNavLink href="/dinh-gia" active={active.dinhGia} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={Gem} iconClass="text-gold-400">
              Định giá acc
            </MobileNavLink>
            <MobileNavLink href="/posts" active={active.posts} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={ScrollText} iconClass="text-emerald-400">
              Đăng bài
            </MobileNavLink>
            <MobileNavLink href="/guides" active={active.guides} onClick={() => {
              setMobileOpen(false);
              setMobilePriceOpen(false);
            }} Icon={Crown} iconClass="text-violet-400">
              Hướng dẫn
            </MobileNavLink>
            {wikiEnabled && (
              <MobileNavLink href="/wiki" active={active.wiki} onClick={() => {
                setMobileOpen(false);
                setMobilePriceOpen(false);
              }} Icon={Sparkles} iconClass="text-gold-300">
                Tra cứu
              </MobileNavLink>
            )}
          </div>
        </aside>
      </div>
    </header>
  );
}

function navItemCls(isActive: boolean) {
  return `group flex shrink-0 items-center gap-2 px-3.5 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
    isActive
      ? "text-white border-fire-500 bg-fire-500/10 [text-shadow:0_0_14px_rgba(255,106,0,0.55)]"
      : "text-zinc-300 border-transparent hover:text-white hover:border-fire-500 hover:bg-white/[0.03]"
  }`;
}

function UserMenuLink({
  href,
  onClick,
  Icon,
  children,
}: {
  href: string;
  onClick: () => void;
  Icon: (p: { className?: string }) => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-zinc-300 hover:bg-fire-500/10 hover:text-white transition"
      onClick={onClick}
    >
      <Icon className="w-4 h-4 text-zinc-500" />
      {children}
    </Link>
  );
}

function mobileNavItemCls(isActive: boolean) {
  return `group flex items-center gap-3 rounded-lg border px-3.5 py-3 text-sm font-semibold transition ${
    isActive
      ? "border-fire-500/45 bg-fire-500/10 text-white shadow-[0_0_18px_-12px_rgba(255,106,0,0.8)]"
      : "border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
  }`;
}

function MobileNavLink({
  href,
  active,
  onClick,
  Icon,
  iconClass,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  Icon: (p: { className?: string }) => React.ReactNode;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={mobileNavItemCls(active)} onClick={onClick}>
      <Icon className={`w-4 h-4 ${iconClass}`} />
      {children}
    </Link>
  );
}
