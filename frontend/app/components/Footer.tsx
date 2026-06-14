"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ContactInfo } from "../lib/types";
import {
  MessageCircle,
  Facebook,
  ShieldCheck,
  BadgeCheck,
  Tag,
  Layers,
  Rocket,
  ScrollText,
  ArrowRight,
} from "./icons";

export default function Footer() {
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [siteName, setSiteName] = useState("Shop Acc Huy Trung");
  const [zaloGroup, setZaloGroup] = useState("");

  useEffect(() => {
    api
      .get<ContactInfo>("/api/site/contact")
      .then(setContact)
      .catch(() => {});
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => {
        if (s.site_name) setSiteName(s.site_name);
        setZaloGroup(s.zalo_group_link || "");
      })
      .catch(() => {});
  }, []);

  const links = [
    { href: "/accounts", label: "Danh sách acc", Icon: Layers },
    { href: "/order", label: "Order acc theo yêu cầu", Icon: Rocket },
    { href: "/posts", label: "Bài đăng mua bán", Icon: ScrollText },
    { href: "/guides", label: "Hướng dẫn giao dịch", Icon: ShieldCheck },
  ];

  const badges = [
    { Icon: ShieldCheck, label: "Giao dịch bảo đảm", cls: "text-gold-300 border-gold-500/30" },
    { Icon: BadgeCheck, label: "Uy tín", cls: "text-volt-300 border-volt-500/30" },
    { Icon: Tag, label: "Giá mềm", cls: "text-emerald-300 border-emerald-500/30" },
  ];

  return (
    <footer className="relative mt-16 border-t border-ink-800 bg-ink-950/80">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-fire-500/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {/* Brand — logo căn giữa, to gấp đôi + tên shop + chip */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={siteName}
            className="h-40 w-40 object-contain drop-shadow-[0_0_22px_rgba(255,106,0,0.5)]"
          />
          <div className="mt-2 font-display font-bold text-xl uppercase tracking-wide text-white">
            {siteName}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {badges.map(({ Icon, label, cls }) => (
              <span key={label} className={`chip ${cls}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <div className="font-display font-semibold uppercase tracking-wide text-white mb-4 text-sm">
            Khám phá
          </div>
          <ul className="space-y-2.5">
            {links.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-2.5 text-sm text-zinc-400 hover:text-fire-400 transition"
                >
                  <Icon className="w-4 h-4 text-zinc-600 group-hover:text-fire-500 transition" />
                  {label}
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact — KHÔNG hiển thị SĐT */}
        <div>
          <div className="font-display font-semibold uppercase tracking-wide text-white mb-4 text-sm">
            Liên hệ
          </div>
          {zaloGroup || (contact && (contact.zalo_link || contact.facebook_link)) ? (
            <ul className="space-y-2.5 text-sm">
              {zaloGroup && (
                <li>
                  <a
                    href={zaloGroup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 text-zinc-300 hover:text-white transition"
                  >
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 text-cyan-400 group-hover:border-cyan-400/60 transition">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    Nhóm Zalo cộng đồng
                  </a>
                </li>
              )}
              {contact?.zalo_link && (
                <li>
                  <a
                    href={contact.zalo_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 text-zinc-300 hover:text-white transition"
                  >
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 text-sky-400 group-hover:border-sky-400/60 transition">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    Chat Zalo
                  </a>
                </li>
              )}
              {contact?.facebook_link && (
                <li>
                  <a
                    href={contact.facebook_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 text-zinc-300 hover:text-white transition"
                  >
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 text-blue-400 group-hover:border-blue-400/60 transition">
                      <Facebook className="w-4 h-4" />
                    </span>
                    Facebook
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Đang cập nhật...</p>
          )}
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()}{" "}
          <span className="text-zinc-400 font-medium">{siteName}</span>.
        </div>
      </div>
    </footer>
  );
}
