"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "./icons";

type Accent = "fire" | "volt" | "gold" | "violet" | "emerald";

const ACCENT: Record<
  Accent,
  {
    panel: string;
    btn: string;
    eyebrow: string;
    orb: string;
    bracket: string;
    border: string;
    ring: string;
    hoverRing: string;
  }
> = {
  fire: {
    panel: "from-fire-600/20 via-ink-900 to-ink-900",
    btn: "from-fire-500 to-ember-500 text-white",
    eyebrow: "text-fire-300",
    orb: "bg-fire-500/20",
    bracket: "border-fire-500",
    border: "border-fire-500/25",
    ring: "shadow-[0_0_22px_-9px_rgba(255,77,0,0.55)]",
    hoverRing: "group-hover:shadow-[0_0_40px_-6px_rgba(255,77,0,0.8)]",
  },
  emerald: {
    panel: "from-emerald-500/20 via-ink-900 to-ink-900",
    btn: "from-emerald-400 to-teal-500 text-ink-950",
    eyebrow: "text-emerald-300",
    orb: "bg-emerald-500/20",
    bracket: "border-emerald-400",
    border: "border-emerald-400/25",
    ring: "shadow-[0_0_22px_-9px_rgba(16,185,129,0.55)]",
    hoverRing: "group-hover:shadow-[0_0_40px_-6px_rgba(16,185,129,0.8)]",
  },
  volt: {
    panel: "from-volt-500/20 via-ink-900 to-ink-900",
    btn: "from-volt-400 to-volt-600 text-ink-950",
    eyebrow: "text-volt-300",
    orb: "bg-volt-500/20",
    bracket: "border-volt-400",
    border: "border-volt-400/25",
    ring: "shadow-[0_0_22px_-9px_rgba(6,182,212,0.55)]",
    hoverRing: "group-hover:shadow-[0_0_40px_-6px_rgba(6,182,212,0.85)]",
  },
  gold: {
    panel: "from-gold-500/20 via-ink-900 to-ink-900",
    btn: "from-gold-300 to-gold-500 text-ink-950",
    eyebrow: "text-gold-300",
    orb: "bg-gold-500/20",
    bracket: "border-gold-400",
    border: "border-gold-400/25",
    ring: "shadow-[0_0_22px_-9px_rgba(212,175,55,0.5)]",
    hoverRing: "group-hover:shadow-[0_0_40px_-6px_rgba(212,175,55,0.8)]",
  },
  violet: {
    panel: "from-violet-500/20 via-ink-900 to-ink-900",
    btn: "from-violet-500 to-fuchsia-500 text-white",
    eyebrow: "text-violet-300",
    orb: "bg-violet-500/20",
    bracket: "border-violet-400",
    border: "border-violet-400/25",
    ring: "shadow-[0_0_22px_-9px_rgba(168,85,247,0.55)]",
    hoverRing: "group-hover:shadow-[0_0_40px_-6px_rgba(168,85,247,0.85)]",
  },
};

function Corner({ cls }: { cls: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-10 w-5 h-5 transition-all duration-300 group-hover:w-8 group-hover:h-8 ${cls}`}
    />
  );
}

export default function FeatureBanner({
  image,
  alt,
  eyebrow,
  Icon,
  title,
  desc,
  ctaLabel,
  href,
  external = false,
  accent = "fire",
  reverse = false,
}: {
  image?: string;
  alt: string;
  eyebrow?: string;
  Icon?: (p: { className?: string }) => React.ReactNode;
  title: string;
  desc: React.ReactNode;
  ctaLabel: string;
  href: string;
  external?: boolean;
  accent?: Accent;
  reverse?: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);
  const a = ACCENT[accent];

  const btnCls = `inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-md bg-gradient-to-r ${a.btn} hover:brightness-110 transition shadow-lg`;
  const cta = external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={btnCls}>
      {ctaLabel}
      <ArrowRight className="w-4 h-4" />
    </a>
  ) : (
    <Link href={href} className={btnCls}>
      {ctaLabel}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );

  return (
    <div
      className={`group relative overflow-hidden rounded-[3px] border ${a.border} bg-gradient-to-br ${a.panel} ${a.ring} ${a.hoverRing} transition duration-300 hover:-translate-y-1 animate-rise`}
    >
      {/* Ngoặc HUD 4 góc (màu theo mục) */}
      <Corner cls={`top-0 left-0 border-t-2 border-l-2 ${a.bracket}`} />
      <Corner cls={`top-0 right-0 border-t-2 border-r-2 ${a.bracket}`} />
      <Corner cls={`bottom-0 left-0 border-b-2 border-l-2 ${a.bracket}`} />
      <Corner cls={`bottom-0 right-0 border-b-2 border-r-2 ${a.bracket}`} />

      {/* Vầng sáng trang trí */}
      <div className={`pointer-events-none absolute -top-16 ${reverse ? "left-1/4" : "right-1/4"} w-72 h-72 rounded-full blur-3xl ${a.orb}`} />

      <div
        className={`relative flex flex-col ${
          reverse ? "md:flex-row-reverse" : "md:flex-row"
        } items-stretch min-h-[210px]`}
      >
        {/* Ảnh — mobile: hiện full ảnh tỉ lệ 2:1, không phủ khói; desktop: fade hoà vào nền */}
        <div className="relative md:w-[46%] aspect-[2/1] md:aspect-auto md:min-h-0 overflow-hidden">
          {image && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={alt}
              onError={() => setImgOk(false)}
              className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className={`w-44 h-44 rounded-full blur-2xl ${a.orb}`} />
            </div>
          )}
          {/* Fade hoà ảnh vào nền — chỉ trên desktop, mobile để ảnh sạch */}
          <div
            className={`hidden md:block absolute inset-0 bg-gradient-to-${
              reverse ? "l" : "r"
            } from-transparent via-transparent to-ink-900`}
          />
        </div>

        {/* Nội dung */}
        <div className="relative flex-1 flex flex-col justify-center gap-3 p-6 md:p-8">
          {eyebrow && (
            <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${a.eyebrow}`}>
              {Icon && <Icon className="w-4 h-4" />}
              {eyebrow}
            </div>
          )}
          <h3 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-tight">
            {title}
          </h3>
          <p className="text-sm md:text-base text-zinc-300 max-w-md leading-relaxed">
            {desc}
          </p>
          <div className="mt-1">{cta}</div>
        </div>
      </div>
    </div>
  );
}
