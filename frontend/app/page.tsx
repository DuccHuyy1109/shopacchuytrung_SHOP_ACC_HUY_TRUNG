"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import HeroSlideshow from "./components/HeroSlideshow";
import FeatureBanner from "./components/FeatureBanner";
import { api } from "./lib/api";
import type { ContactInfo, Page } from "./lib/types";
import {
  Gem,
  Rocket,
  ScrollText,
  ShieldCheck,
  ArrowRight,
  Flame,
  Layers,
  Tag,
  Sparkles,
  MessageCircle,
} from "./components/icons";

type Accent = "fire" | "ember" | "gold" | "volt" | "violet" | "emerald";

const ACCENT_TEXT: Record<Accent, string> = {
  fire: "text-fire-400",
  ember: "text-ember-400",
  gold: "text-gold-300",
  volt: "text-volt-300",
  violet: "text-violet-300",
  emerald: "text-emerald-300",
};
const ACCENT_BTN: Record<Accent, string> = {
  fire: "from-fire-500 to-ember-500 text-white",
  ember: "from-ember-500 to-fire-600 text-white",
  gold: "from-gold-300 to-gold-500 text-ink-950",
  volt: "from-volt-400 to-volt-600 text-ink-950",
  violet: "from-violet-500 to-fuchsia-500 text-white",
  emerald: "from-emerald-400 to-teal-500 text-ink-950",
};

type Cat = {
  key: string;
  name: string;
  tag: string;
  img: string;
  logo: string; // logo riêng của từng danh mục — hiển thị cùng một vị trí trên mọi thẻ
  href: string;
  query: string | null; // tham số đếm số acc; null = không đếm (Order)
  accent: Accent;
};

const CATS: Cat[] = [
  { key: "acc_co", name: "Acc cổ", tag: "Hàng hiếm", img: "/image/danh_muc/acc-co.gif", logo: "/image/danh_muc/logo_danh_muc1.png", href: "/accounts?type=acc_co", query: "category_type=acc_co", accent: "gold" },
  { key: "sieu_pham", name: "Acc siêu phẩm", tag: "Top VIP", img: "/image/danh_muc/sieu-pham-tet.gif", logo: "/image/danh_muc/logo_danh_muc2.png", href: "/accounts?type=sieu_pham", query: "category_type=sieu_pham", accent: "ember" },
  { key: "duoi1m", name: "Acc dưới 1M", tag: "Giá mềm", img: "/image/danh_muc/duoi1m-tet.gif", logo: "/image/danh_muc/logo_danh_muc3.png", href: "/accounts?category=1", query: "price_category_id=1", accent: "emerald" },
  { key: "1m2m", name: "Acc 1 - 2M", tag: "Phổ biến", img: "/image/danh_muc/1m-2m-tet.gif", logo: "/image/danh_muc/logo_danh_muc4.png", href: "/accounts?category=2", query: "price_category_id=2", accent: "volt" },
  { key: "2m5m", name: "Acc 2 - 5M", tag: "Chất lượng", img: "/image/danh_muc/2m-5m-tet.gif", logo: "/image/danh_muc/logo_danh_muc5.png", href: "/accounts?category=3", query: "price_category_id=3", accent: "violet" },
  { key: "5m10m", name: "Acc 5 - 10M", tag: "Cao cấp", img: "/image/danh_muc/5m-10m-tet.gif", logo: "/image/danh_muc/logo_danh_muc6.png", href: "/accounts?category=4", query: "price_category_id=4", accent: "fire" },
  { key: "10m20m", name: "Acc 10 - 20M", tag: "Đỉnh cao", img: "/image/danh_muc/10m-20m-tet.gif", logo: "/image/danh_muc/logo_danh_muc7.png", href: "/accounts?category=5", query: "price_category_id=5", accent: "gold" },
  { key: "order", name: "Order acc", tag: "Theo yêu cầu", img: "/image/danh_muc/order.gif", logo: "/image/danh_muc/logo_danh_muc8.png", href: "/order", query: null, accent: "volt" },
];

export default function HomePage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [zaloGroup, setZaloGroup] = useState("");

  useEffect(() => {
    Promise.all(
      CATS.filter((c) => c.query).map((c) =>
        api
          .get<Page<unknown>>(`/api/accounts?${c.query}&page_size=1`)
          .then((p) => [c.key, p.total] as const)
          .catch(() => [c.key, 0] as const),
      ),
    ).then((pairs) => setCounts(Object.fromEntries(pairs)));

    api
      .get<ContactInfo>("/api/site/contact")
      .then(setContact)
      .catch(() => {});

    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setZaloGroup(s.zalo_group_link || ""))
      .catch(() => {});
  }, []);

  // Nút "Liên hệ" mục thu mua — KHÔNG dùng SĐT
  const contactHref =
    contact?.zalo_link || contact?.facebook_link || "/guides";
  const contactExternal = Boolean(contact?.zalo_link || contact?.facebook_link);

  // Nút "Tham gia nhóm Zalo"
  const zaloGroupHref = zaloGroup || contact?.zalo_link || "/guides";
  const zaloGroupExternal = Boolean(zaloGroup || contact?.zalo_link);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-12">
      {/* ===================== SLIDESHOW ===================== */}
      <HeroSlideshow />

      {/* ===================== 8 DANH MỤC ===================== */}
      <section>
        <SectionTitle Icon={Layers} title="Danh mục acc" accent="fire" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {CATS.map((c, i) => (
            <CategoryCard key={c.key} cat={c} count={counts[c.key]} delay={i * 60} />
          ))}
        </div>
      </section>

      {/* ===================== BANNER CHỨC NĂNG ===================== */}
      <section>
        <SectionTitle Icon={Sparkles} title="Dịch vụ nổi bật" accent="volt" />
        <div className="space-y-5">
          <FeatureBanner
            image="/image/dich_vu/order_acc.png"
            alt="Order acc Free Fire"
            eyebrow="Dịch vụ riêng"
            Icon={Rocket}
            accent="fire"
            title="Order acc theo yêu cầu"
            desc="Muốn sở hữu acc đúng nhu cầu? Cứ gửi tiêu chí, việc còn lại để shop lo – đảm bảo tìm acc chất lượng nhất trong ngân sách của anh em!" 
            ctaLabel="Order ngay"
            href="/order"
          />
          <FeatureBanner
            image="/image/dich_vu/dang_bai.png"
            alt="Đăng bài mua bán acc"
            eyebrow="Cộng đồng"
            Icon={ScrollText}
            accent="emerald"
            reverse
            title="Đăng bài mua bán acc"
            desc="Tự đăng tin mua/bán acc Free Fire ngay trên web — ẩn danh tính, kết nối nhanh với cộng đồng người chơi, tìm acc & người mua dễ dàng."
            ctaLabel="Xem ngay"
            href="/posts"
          />
          <FeatureBanner
            image="/image/dich_vu/thu_acc.png"
            alt="Hỗ trợ thu mua acc"
            eyebrow="Thu mua"
            Icon={Gem}
            accent="violet"
            title="Thu mua acc giá tốt và hỗ trợ lên đời"
            desc="Anh em có acc muốn bán hoặc lên đời? Hãy liên hệ shop, cam kết thu mua nhanh chóng với mức giá hợp lý, hỗ trợ trả góp lên đời - Giao dịch nhanh gọn và uy tín"
            ctaLabel="Liên hệ ngay"
            href={contactHref}
            external={contactExternal}
          />
          <FeatureBanner
            image="/image/dich_vu/nhom_zalo.png"
            alt="Nhóm Zalo cộng đồng"
            eyebrow="Cộng đồng"
            Icon={MessageCircle}
            accent="volt"
            reverse
            title="Tham gia nhóm Zalo"
            desc="Tham gia nhóm Zalo của shop để cập nhật những acc mới nhất mỗi ngày, giao lưu cùng cộng đồng và nhận hỗ trợ nhanh chóng, trực tiếp từ admin!"
            ctaLabel="Tham gia nhóm"
            href={zaloGroupHref}
            external={zaloGroupExternal}
          />
          <FeatureBanner
            image="/image/dich_vu/bao_hanh.png"
            alt="Chính sách bảo mật và bảo hành"
            eyebrow="An toàn & uy tín"
            Icon={ShieldCheck}
            accent="gold"
            title="Chính sách bảo mật và bảo hành"
            desc="Cam kết bảo mật thông tin khách hàng tuyệt đối. Hướng dẫn đổi & bảo mật thông tin acc an toàn sau khi mua — chuyên nghiệp, minh bạch."
            ctaLabel="Xem chi tiết"
            href="/guides"
          />
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- Thẻ danh mục ----------------------------- */
function CategoryCard({
  cat,
  count,
  delay,
}: {
  cat: Cat;
  count?: number;
  delay: number;
}) {
  const isOrder = cat.query === null;
  return (
    <Link
      href={cat.href}
      className="group frame-chien block animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="frame-chien-in overflow-hidden">
        {/* Ảnh danh mục */}
        <div className="relative aspect-[16/9] overflow-hidden bg-ink-900">
          <Image
            src={cat.img}
            alt={cat.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/10 to-transparent" />

          {/* Logo riêng của danh mục — mọi thẻ dùng chung 1 vị trí & kích thước */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cat.logo}
            alt=""
            className="absolute left-[74%] top-[45%] -translate-x-1/2 -translate-y-1/2 w-60 sm:w-64 md:w-72 lg:w-90 object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.98)] transition duration-500 group-hover:scale-105"
          />

          {/* Tag thay cho "siêu giảm giá" */}
          <span className={`absolute top-3.5 right-3.5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md clip-chien-sm bg-ink-950/85 border border-ink-600 ${ACCENT_TEXT[cat.accent]}`}>
            <Flame className="w-3 h-3" />
            {cat.tag}
          </span>
        </div>

        {/* Thông tin */}
        <div className="p-4 md:p-5">
          <div className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none truncate">
            {cat.name}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${ACCENT_TEXT[cat.accent]}`}>
              {isOrder ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Đặt theo yêu cầu
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  {count === undefined ? (
                    <span className="inline-block w-12 h-3.5 rounded bg-ink-700 animate-pulse" />
                  ) : (
                    <>
                      Đang có <span className="text-white font-bold">{count}</span> acc
                    </>
                  )}
                </>
              )}
            </span>

            <span className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-md clip-chien-sm bg-gradient-to-r ${ACCENT_BTN[cat.accent]} group-hover:brightness-110 transition`}>
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Lóe điện khi hover */}
        <span className="zap-sweep" />
      </div>
    </Link>
  );
}

/* ----------------------------- Tiêu đề mục ----------------------------- */
function SectionTitle({
  Icon,
  title,
  accent,
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  accent: "fire" | "volt";
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className={`h-7 w-1.5 rounded-full bg-gradient-to-b ${
          accent === "volt" ? "from-volt-400 to-sky-500" : "from-fire-500 to-ember-500"
        }`}
      />
      <h2 className="font-display font-bold uppercase tracking-wide text-2xl text-white flex items-center gap-2">
        <Icon className={`w-6 h-6 ${accent === "volt" ? "text-volt-300" : "text-fire-400"}`} />
        {title}
      </h2>
      <span className="flex-1 rule-neon ml-2 opacity-60" />
    </div>
  );
}
