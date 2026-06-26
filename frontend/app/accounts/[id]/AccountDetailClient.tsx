"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, imageUrl } from "../../lib/api";
import {
  ACCOUNT_BACK_PARAM,
  pickAccountBack,
  readStoredAccountBack,
  resolveAccountBreadcrumb,
} from "../../lib/accountNav";
import { useAuth } from "../../lib/auth";
import AccountContactButton from "../../components/AccountContactButton";
import CompareDialog from "../../components/CompareDialog";
import AccountCarousel from "../../components/AccountCarousel";
import HudPanel from "../../components/HudPanel";
import Lightbox from "../../components/Lightbox";
import {
  CATEGORY_LABELS,
  discountPercent,
  formatPrice,
  showsAccountCategoryBadge,
} from "../../lib/format";
import type {
  AccountBuyResponse,
  AccountDetail,
  AccountListItem,
  Page,
  PriceCategory,
} from "../../lib/types";
import {
  Crown,
  Gem,
  Layers,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Coins,
  Facebook,
  MessageCircle,
  ScrollText,
  Share,
  ShieldCheck,
  Sparkles,
  Flame,
  Zap,
} from "../../components/icons";

export default function AccountDetailClient({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [compareOpen, setCompareOpen] = useState(false);
  const [acc, setAcc] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  const [suggest, setSuggest] = useState<AccountListItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [referrerBack, setReferrerBack] = useState<string | null>(null);

  // Mua acc trực tiếp bằng số dư ví (bật/tắt qua cấu hình site).
  const [buyEnabled, setBuyEnabled] = useState(false);
  const [view, setView] = useState<"detail" | "pay" | "done">("detail");
  const [buyBusy, setBuyBusy] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyResult, setBuyResult] = useState<AccountBuyResponse | null>(null);

  function share() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function startBuy() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBuyError("");
    setView("pay");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function payNow() {
    if (!acc) return;
    setBuyBusy(true);
    setBuyError("");
    try {
      const res = await api.post<AccountBuyResponse>(
        `/api/accounts/${acc.id}/buy`,
      );
      setBuyResult(res);
      await refreshUser();
      // Acc đã được giữ cho khách — cập nhật trạng thái tại chỗ.
      setAcc((a) => (a ? { ...a, status: "sold" } : a));
      setView("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Lỗi thanh toán");
    } finally {
      setBuyBusy(false);
    }
  }

  useEffect(() => {
    api.get<PriceCategory[]>("/api/categories").then(setPriceCategories).catch(() => {});
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setBuyEnabled(s.buy_account_enabled === "1"))
      .catch(() => setBuyEnabled(false));
  }, []);

  useEffect(() => {
    setReferrerBack(document.referrer || null);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<AccountDetail>(`/api/accounts/${id}`)
      .then(setAcc)
      .catch(() => setAcc(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Ghi nhận lượt xem ĐÚNG 1 lần cho mỗi acc. Dùng ref khóa theo id để
  // StrictMode (dev double-invoke) hay re-render không gọi trùng -> không
  // còn cảnh 1 lần mở = 2 lượt xem.
  const viewedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewedIdRef.current === id) return;
    viewedIdRef.current = id;
    api.post(`/api/accounts/${id}/view`).catch(() => {});
  }, [id]);

  const listBackHref = searchParams.get(ACCOUNT_BACK_PARAM) ?? undefined;

  const breadcrumb = useMemo(() => {
    const back = pickAccountBack(
      searchParams.get(ACCOUNT_BACK_PARAM),
      readStoredAccountBack(),
      referrerBack,
    );
    return resolveAccountBreadcrumb(back, priceCategories);
  }, [searchParams, priceCategories, referrerBack]);

  // Gợi ý acc cùng tầm giá
  useEffect(() => {
    if (!acc) return;
    const price = acc.sale_price;
    const params = new URLSearchParams();
    params.set("page_size", "12");
    if (price > 0) {
      params.set("price_min", String(Math.floor(price * 0.6)));
      params.set("price_max", String(Math.ceil(price * 1.5)));
      params.set("sort", "price_desc");
    } else {
      params.set("sort", "newest");
    }
    api
      .get<Page<AccountListItem>>(`/api/accounts?${params.toString()}`)
      .then((d) => setSuggest(d.items.filter((a) => a.id !== acc.id).slice(0, 10)))
      .catch(() => setSuggest([]));
  }, [acc]);

  if (loading)
    return <div className="py-20 text-center text-zinc-500">Đang tải...</div>;
  if (!acc)
    return (
      <div className="py-20 text-center text-zinc-400">
        Không tìm thấy acc.{" "}
        <Link href="/accounts" className="text-fire-400 hover:text-fire-300">
          Quay lại
        </Link>
      </div>
    );

  const discount = discountPercent(acc.original_price, acc.sale_price);
  const images = acc.images.length ? acc.images : null;
  const imgUrls = images ? images.map((i) => i.image_url) : [];
  const descTags = (acc.description || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const CatIcon =
    acc.category_type === "acc_co" ? Crown : acc.category_type === "sieu_pham" ? Gem : Layers;
  const BreadcrumbIcon =
    breadcrumb.type === "acc_co" ? Crown : breadcrumb.type === "sieu_pham" ? Gem : Layers;

  /* ---------- Màn Xác minh & thanh toán (mua acc bằng số dư ví) ---------- */
  if (view === "pay") {
    const balance = user?.balance ?? 0;
    const price = acc.sale_price;
    const enough = balance >= price;
    const cover = images ? images[0].image_url : null;
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <HudPanel accent="fire" className="p-5 md:p-8">
          {/* Quay lại + tiêu đề */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setView("detail")}
              aria-label="Quay lại chi tiết acc"
              title="Quay lại chi tiết acc"
              className="absolute left-0 grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl uppercase tracking-wide">
              <span className="text-gradient-fire text-glow-fire">Mua acc</span>{" "}
              <span className="text-gold-300">{acc.account_code}</span>
            </h2>
          </div>
          <p className="text-sm text-zinc-400 mt-2 text-center">
            Xác minh thông tin &amp; thanh toán — trừ thẳng vào số dư ví của bạn
          </p>

          <div className="mt-7 grid lg:grid-cols-[minmax(0,420px)_1fr] gap-8 items-start">
            {/* Ảnh đại diện duy nhất */}
            <div className="frame-soft">
              <div className="frame-soft-in relative aspect-[5/4] overflow-hidden bg-ink-900 grid place-items-center">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(cover)}
                    alt={acc.account_code}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-zinc-600 flex flex-col items-center gap-1">
                    <Flame className="w-8 h-8" />
                    Không có ảnh
                  </span>
                )}
                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md clip-chien-sm bg-ink-950/85 border border-fire-500/40 text-fire-300">
                  <CatIcon className="w-3.5 h-3.5" />
                  {acc.account_code}
                </span>
              </div>
            </div>

            {/* Toàn bộ thông tin acc */}
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="grid place-items-center w-9 h-9 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire shrink-0">
                  <ScrollText className="w-4.5 h-4.5" />
                </span>
                <span className="font-display font-bold uppercase tracking-wide text-white">
                  Thông tin acc
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 text-sm">
                <PayInfo label="Mã acc" value={acc.account_code} />
                <PayInfo
                  label="Loại acc"
                  value={CATEGORY_LABELS[acc.category_type] || acc.category_type}
                />
                <PayInfo label="Mức giá" value={acc.price_category?.name || "—"} />
                <PayInfo label="VIP" value={`VIP ${acc.vip_level}`} />
                <PayInfo label="Súng nâng cấp" value={`${acc.upgraded_guns_count} súng`} />
                <PayInfo
                  label="Giá gốc"
                  value={acc.original_price > 0 ? formatPrice(acc.original_price) : "—"}
                />
              </div>
              {descTags.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Mô tả tài khoản
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {descTags.map((t, i) => (
                      <span
                        key={t + i}
                        className="inline-flex items-center rounded-md bg-fire-500/10 text-fire-300 border border-fire-500/30 text-sm font-medium px-3 py-1"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 flex items-baseline gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Giá bán
                </span>
                <span className="font-display text-3xl font-extrabold text-gradient-fire">
                  {formatPrice(acc.sale_price)}
                </span>
                {discount > 0 && (
                  <span className="text-zinc-500 line-through">
                    {formatPrice(acc.original_price)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sọc ngang tinh tế ngăn cách */}
          <div className="my-8 h-px bg-gradient-to-r from-transparent via-fire-500/45 to-transparent" />

          {/* Thanh toán */}
          <div className="flex items-center gap-2.5 mb-5">
            <span className="grid place-items-center w-9 h-9 clip-chien-sm bg-gradient-to-br from-gold-400 to-ember-600 text-white glow-fire shrink-0">
              <Coins className="w-4.5 h-4.5" />
            </span>
            <span className="font-display font-bold uppercase tracking-wide text-white">
              Thanh toán
            </span>
          </div>
          <div className="max-w-xl mx-auto">
            <div className="space-y-2.5 text-sm">
              <PayRow label="Giá acc" value={formatPrice(price)} highlight />
              <PayRow label="Số dư hiện tại" value={formatPrice(balance)} />
              {enough ? (
                <PayRow label="Số dư sau thanh toán" value={formatPrice(balance - price)} />
              ) : (
                <PayRow label="Còn thiếu" value={formatPrice(price - balance)} />
              )}
            </div>

            {buyError && (
              <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 mt-3">
                {buyError}
              </div>
            )}

            {enough ? (
              <button
                onClick={payNow}
                disabled={buyBusy}
                className="btn-fire w-full justify-center mt-5 disabled:opacity-60"
              >
                {buyBusy ? "Đang xử lý..." : (
                  <>
                    <Coins className="w-5 h-5" />
                    Thanh toán bằng số dư
                  </>
                )}
              </button>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="text-sm text-ember-300 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 text-center">
                  Số dư không đủ để mua acc này. Vui lòng nạp thêm tiền.
                </div>
                <Link href="/nap-tien" className="btn-fire w-full justify-center">
                  <Coins className="w-5 h-5" />
                  Nạp tiền ngay
                </Link>
              </div>
            )}
            <p className="text-xs text-zinc-500 text-center mt-3 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Sau khi thanh toán, acc được giữ riêng cho bạn — shop bàn giao qua Zalo/Facebook.
            </p>
          </div>
        </HudPanel>
      </div>
    );
  }

  /* ---------- Màn thanh toán thành công ---------- */
  if (view === "done" && buyResult) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="max-w-2xl mx-auto text-center p-6 md:p-10">
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white glow-fire">
            <BadgeCheck className="w-9 h-9" />
          </div>
          <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide text-emerald-400 mt-4">
            Thanh toán thành công!
          </h2>
          <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
            Bạn đã mua acc <b className="text-gold-300">{buyResult.account_code}</b>.
            Acc đã được <b className="text-zinc-100">giữ riêng cho bạn</b> — vui lòng
            liên hệ shop để nhận acc.
          </p>
          <div className="mt-2 text-sm text-zinc-500">
            Số dư còn lại:{" "}
            <b className="text-gold-300">{formatPrice(buyResult.balance)}</b>
          </div>

          <div className="mt-6 grid gap-2.5 max-w-xs mx-auto">
            {buyResult.contact.zalo_link && (
              <a
                href={buyResult.contact.zalo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <MessageCircle className="w-5 h-5" />
                Nhắn Zalo nhận acc
              </a>
            )}
            {buyResult.contact.facebook_link && (
              <a
                href={buyResult.contact.facebook_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <Facebook className="w-5 h-5" />
                Nhắn Facebook nhận acc
              </a>
            )}
          </div>

          <div className="mt-7 flex justify-center gap-3 flex-wrap">
            <Link
              href="/accounts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg clip-chien-sm border border-fire-500/45 text-fire-300 font-semibold hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-6px_rgba(255,106,0,0.6)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Xem acc khác
            </Link>
            <Link
              href="/account?tab=finance"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg clip-chien-sm border border-gold-400/45 text-gold-300 font-semibold hover:text-white hover:border-gold-400 hover:bg-gold-500/10 transition shadow-[0_0_15px_-6px_rgba(212,175,55,0.55)]"
            >
              <Coins className="w-4 h-4" />
              Ví của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 flex-wrap text-sm">
          <li>
            <Link
              href={breadcrumb.href}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-fire-400 transition font-medium"
            >
              <BreadcrumbIcon className="w-4 h-4 shrink-0 opacity-80" />
              {breadcrumb.label}
            </Link>
          </li>
          <li aria-hidden className="text-ink-600">
            <ArrowRight className="w-3.5 h-3.5" />
          </li>
          <li className="font-display font-bold uppercase tracking-wide text-white">
            MS: <span className="text-gradient-fire">{acc.account_code}</span>
          </li>
        </ol>
      </nav>

      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Ảnh chính 5:4; thumbnail giữ cố định */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => images && setLb(activeImg)}
            className="relative aspect-[5/4] surface overflow-hidden grid place-items-center w-full group"
          >
            {images ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(images[activeImg].image_url)}
                alt={acc.account_code}
                className="w-full h-full object-contain transition group-hover:scale-[1.02]"
              />
            ) : (
              <span className="text-zinc-600 flex flex-col items-center gap-1">
                <Flame className="w-8 h-8" />
                Không có ảnh
              </span>
            )}
          </button>
          {images && images.length > 1 && (
            <div className="flex gap-2 flex-wrap shrink-0">
              {images.map((img, i) => (
                <button
                  key={`account-thumb-${acc.id}-${img.id}-${i}`}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-md border overflow-hidden transition ${
                    i === activeImg ? "border-fire-500" : "border-ink-700 hover:border-ink-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thông tin — luôn cao bằng cột ảnh, nút ở cuối */}
        <div className="surface p-5 md:p-6 flex flex-col h-full min-h-0">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white">
                MS: <span className="text-gradient-fire">{acc.account_code}</span>
              </h1>
              {showsAccountCategoryBadge(acc.category_type) && (
                <div className="inline-flex items-center gap-1.5 text-xs text-fire-400 font-bold uppercase tracking-wide shrink-0">
                  <CatIcon className="w-4 h-4" />
                  {CATEGORY_LABELS[acc.category_type] || acc.category_type}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-display font-extrabold text-gradient-fire">
                {formatPrice(acc.sale_price)}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-zinc-500 line-through">
                    {formatPrice(acc.original_price)}
                  </span>
                  <span className="text-ember-400 text-sm font-bold [text-shadow:0_0_8px_rgba(255,32,32,0.7)]">
                    -{discount}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <Info label="VIP" value={`VIP ${acc.vip_level}`} />
            <Info label="Súng nâng cấp" value={`${acc.upgraded_guns_count} súng`} />
            <Info label="Mức giá" value={acc.price_category?.name || "—"} />
            <Info label="Trạng thái" value={acc.status === "available" ? "Còn hàng" : "Đã bán"} />
          </div>

          {descTags.length > 0 && (
              <div className="mt-5">
                <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
                  Mô tả tài khoản
                </div>
                <div className="flex flex-wrap gap-2">
                  {descTags.map((t, i) => (
                    <span
                      key={t + i}
                      className="inline-flex items-center rounded-md bg-fire-500/10 text-fire-300 border border-fire-500/30 text-sm font-medium px-3 py-1"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
          )}

          <div className="mt-auto pt-5">
            <SectionDivider className="mb-5" />
            {acc.status === "available" ? (
              <>
                {buyEnabled && acc.sale_price > 0 && (
                  <button
                    onClick={startBuy}
                    className="btn-fire w-full justify-center mb-2.5"
                  >
                    <Zap className="w-5 h-5" />
                    Mua ngay
                  </button>
                )}
                <AccountContactButton accountId={acc.id} accountCode={acc.account_code} />
              </>
            ) : (
              <div className="text-center bg-ink-900 border border-ink-700 rounded-lg py-2.5 text-zinc-400">
                Acc này đã được bán
              </div>
            )}
            {!user && acc.status === "available" && (
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Bạn cần đăng nhập để liên hệ mua acc.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setCompareOpen(true)}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg clip-chien-sm border border-volt-500/40 text-volt-300 hover:bg-volt-500/10 font-semibold text-sm transition"
              >
                <ArrowLeftRight className="w-4 h-4" />
                So sánh
              </button>
              <button
                onClick={share}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg clip-chien-sm border border-ink-600 text-zinc-300 hover:border-fire-500 hover:text-white font-semibold text-sm transition"
              >
                <Share className="w-4 h-4" />
                {copied ? "Đã copy!" : "Chia sẻ"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tất cả ảnh — 3/hàng, chém góc nhẹ, 5:4, bấm để phóng to */}
      {images && (
        <section className="mt-10">
          <SectionTitle Icon={Sparkles} title="Tất cả ảnh của acc" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <button key={`account-image-${acc.id}-${img.id}-${i}`} onClick={() => setLb(i)} className="group frame-soft block">
                <div className="frame-soft-in relative aspect-[5/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(img.image_url)}
                    alt=""
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Gợi ý acc cùng tầm giá — carousel */}
      {suggest.length > 0 && (
        <section className="mt-12">
          <SectionTitle Icon={Flame} title="Acc gợi ý cùng tầm giá" />
          <AccountCarousel items={suggest} backHref={listBackHref} />
        </section>
      )}

      {/* Phóng to ảnh */}
      {lb !== null && imgUrls.length > 0 && (
        <Lightbox images={imgUrls} start={lb} onClose={() => setLb(null)} />
      )}

      {compareOpen && (
        <CompareDialog initialCode={acc.account_code} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}

function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`my-5 h-px bg-gradient-to-r from-transparent via-ink-600/70 to-transparent ${className}`}
      role="separator"
    />
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900/60 border border-ink-700 rounded-lg p-2.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

/** Khối nhãn–giá trị trong màn Xác minh & thanh toán. */
function PayInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-zinc-100 font-medium leading-relaxed break-words">{value}</div>
    </div>
  );
}

/** Dòng nhãn–giá trị trong bảng thanh toán. */
function PayRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <b className={highlight ? "text-gold-300" : "text-zinc-100"}>{value}</b>
    </div>
  );
}

function SectionTitle({
  Icon,
  title,
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-fire-500 to-ember-500" />
      <h2 className="font-display font-bold uppercase tracking-wide text-xl md:text-2xl text-white flex items-center gap-2">
        <Icon className="w-6 h-6 text-fire-400" />
        {title}
      </h2>
      <span className="flex-1 rule-neon ml-2 opacity-60" />
    </div>
  );
}
