"use client";

import Link from "next/link";
import { useState, type InputHTMLAttributes } from "react";
import {
  ShieldCheck,
  BadgeCheck,
  Zap,
  ArrowRight,
  Eye,
  EyeOff,
} from "./icons";

type Mode = "login" | "register";

const BRAND: Record<
  Mode,
  { image: string; eyebrow: string; heading: string; sub: string }
> = {
  login: {
    image: "/image/slide/slideshow1.jpeg",
    eyebrow: "Welcome back",
    heading: "Chiến binh trở lại!",
    sub: "Đăng nhập để tiếp tục săn acc giá rẻ nhất thị trường, order theo yêu cầu & quản lý giao dịch của bạn.",
  },
  register: {
    image: "/image/slide/slideshow2.jpg",
    eyebrow: "Tân binh gia nhập",
    heading: "Lên đồ — chiến ngay!",
    sub: "Tạo tài khoản để tìm và mua acc, order & đăng bài acc Free Fire — nhanh chóng, an toàn, uy tín.",
  },
};

const CHIPS = [
  { Icon: ShieldCheck, label: "An toàn" },
  { Icon: BadgeCheck, label: "Uy tín" },
  { Icon: Zap, label: "Nhanh chóng" },
];

export default function AuthShell({
  mode,
  title,
  subtitle,
  children,
  switchPrompt,
  switchLabel,
  switchHref,
}: {
  mode: Mode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
}) {
  const b = BRAND[mode];

  return (
    <section className="relative grid place-items-center min-h-[calc(100vh-150px)] px-4 py-10 overflow-hidden">
      {/* Nền trang trí */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 w-[28rem] h-[28rem] rounded-full bg-fire-500/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-10 w-[26rem] h-[26rem] rounded-full bg-ember-600/12 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-gold-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
      </div>

      <div className="relative w-full max-w-4xl animate-rise">
        <div className="relative grid md:grid-cols-2 rounded-xl overflow-hidden border border-ink-700 bg-ink-900/85 backdrop-blur-xl shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]">
          {/* Vạch lửa trên cùng */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-fire-500 via-ember-500 to-gold-400 z-20" />

          {/* PANEL THƯƠNG HIỆU (desktop) */}
          <div className="relative hidden md:flex flex-col items-center justify-center text-center gap-5 p-8 min-h-[500px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/75 to-ink-900/55" />
            <div className="absolute inset-0 bg-fire-600/10" />

            <div className="relative flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="logo"
                className="h-40 w-40 object-contain drop-shadow-[0_0_26px_rgba(255,106,0,0.65)]"
              />
              <div className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.28em] text-fire-300">
                <Zap className="w-3.5 h-3.5" />
                {b.eyebrow}
              </div>
            </div>

            <div className="relative">
              <h2 className="font-display font-extrabold uppercase tracking-wide text-3xl lg:text-4xl text-white leading-tight">
                {b.heading}
              </h2>
              <p className="mt-3 text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
                {b.sub}
              </p>
            </div>

            <div className="relative flex flex-wrap justify-center gap-2">
              {CHIPS.map(({ Icon, label }) => (
                <span key={label} className="chip text-gold-300 border-gold-500/30 bg-ink-950/50">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* PANEL FORM */}
          <div className="relative p-7 md:p-9">
            {/* Logo nhỏ cho mobile */}
            <div className="md:hidden flex items-center gap-3 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="logo"
                className="h-12 w-12 object-contain drop-shadow-[0_0_14px_rgba(255,106,0,0.6)]"
              />
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-fire-300">
                {b.eyebrow}
              </div>
            </div>

            <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>

            <div className="mt-6">{children}</div>

            <div className="mt-6 text-sm text-zinc-400 text-center">
              {switchPrompt}{" "}
              <Link
                href={switchHref}
                className="inline-flex items-center gap-1 font-semibold text-fire-400 hover:text-fire-300 transition"
              >
                {switchLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------- Ô nhập có icon + ẩn/hiện mật khẩu --------------------- */
export function AuthField({
  Icon,
  type = "text",
  ...rest
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const inputType = isPw ? (show ? "text" : "password") : type;

  return (
    <div className="group relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-fire-400 transition" />
      <input
        type={inputType}
        {...rest}
        className="w-full rounded-md border border-ink-700 bg-ink-950/70 pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-fire-500 focus:ring-2 focus:ring-fire-500/25 transition"
      />
      {isPw && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-fire-400 transition"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
