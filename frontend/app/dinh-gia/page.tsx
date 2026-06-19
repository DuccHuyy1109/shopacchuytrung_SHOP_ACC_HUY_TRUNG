"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatPrice } from "../lib/format";
import {
  Gem,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Plus,
  X,
  Gamepad,
  Coins,
} from "../components/icons";
import AccountCarousel from "../components/AccountCarousel";
import TechModal from "../components/TechModal";
import type { AccountListItem, DescriptionTag, Page } from "../lib/types";

export default function ValuationPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [allTags, setAllTags] = useState<DescriptionTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<DescriptionTag[]>([]);
  const [selectedGuns, setSelectedGuns] = useState<{ tag: DescriptionTag; quantity: number }[]>([]);
  const [valuatedPrice, setValuatedPrice] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State cho Modal thêm súng
  const [isGunModalOpen, setIsGunModalOpen] = useState(false);
  const [tempGunTagId, setTempGunTagId] = useState<number>(0);
  const [tempGunQuantity, setTempGunQuantity] = useState<number>(1);

  // Phí định giá mỗi lượt (cấu hình site) — 0 là miễn phí.
  const [fee, setFee] = useState(0);
  const [feeError, setFeeError] = useState("");

  useEffect(() => {
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setFee(Number(s.valuation_fee_amount || 0) || 0))
      .catch(() => setFee(0));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    api
      .get<DescriptionTag[]>("/api/description-tags")
      .then(setAllTags)
      .catch(() => setAllTags([]))
      .finally(() => setLoading(false));
  }, []);

  // Hàm định giá và tìm acc gợi ý
  async function handleValuate() {
    if (selectedTags.length === 0 && selectedGuns.length === 0) return;
    setFeeError("");

    // Có phí định giá -> cần đăng nhập và trừ phí vào số dư trước khi tính.
    if (fee > 0) {
      if (!user) {
        router.push("/login");
        return;
      }
      setBusy(true);
      try {
        await api.post("/api/valuation/pay");
        await refreshUser();
      } catch (err) {
        setFeeError(err instanceof Error ? err.message : "Lỗi thanh toán phí");
        setBusy(false);
        return;
      }
    }
    setBusy(true);

    // Tính tổng giá trị dựa trên các tag đã chọn
    const tagsTotal = selectedTags.reduce((sum, tag) => sum + (tag.gia_tien || 0), 0);
    // Tính tổng giá trị súng nâng cấp: giá định giá * số lượng
    const gunsTotal = selectedGuns.reduce((sum, g) => sum + (g.tag.gia_tien || 0) * g.quantity, 0);
    
    const total = tagsTotal + gunsTotal;
    setValuatedPrice(total);

    try {
      // Tìm các acc trong khoảng giá gần với giá định giá (+/- 20%)
      const min = total * 0.8;
      const max = total * 1.2;
      const res = await api.get<Page<AccountListItem>>(
        `/api/accounts?price_min=${min}&price_max=${max}&page_size=10`
      );
      setSuggestions(res.items);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setBusy(false);
    }
  }

  const addTag = (tag: DescriptionTag) => {
    setSelectedTags([...selectedTags, tag]);
    setQuery("");
    // Giữ bảng mở + giữ focus (không ẩn bàn phím) để chọn tiếp.
    setOpen(true);
    inputRef.current?.focus();
    // Reset kết quả khi thay đổi tag
    setValuatedPrice(null);
    setSuggestions([]);
  };

  const removeTag = (id: number) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== id));
    setValuatedPrice(null);
    setSuggestions([]);
  };

  const addGun = () => {
    const tag = allTags.find(t => t.id === tempGunTagId);
    if (!tag) return;
    setSelectedGuns([...selectedGuns, { tag, quantity: tempGunQuantity }]);
    setIsGunModalOpen(false);
    setValuatedPrice(null);
    setSuggestions([]);
    setTempGunTagId(0);
    setTempGunQuantity(1);
  };

  const removeGun = (index: number) => {
    setSelectedGuns(selectedGuns.filter((_, i) => i !== index));
    setValuatedPrice(null);
    setSuggestions([]);
  };

  const handleClearAll = () => {
    setSelectedTags([]);
    setSelectedGuns([]);
    setValuatedPrice(null);
    setSuggestions([]);
  };

  // Tách mẫu mô tả theo loại: tag_type=1 (đặc điểm chung) vs tag_type=2 (súng nâng cấp)
  const featureTags = allTags.filter((t) => Number(t.tag_type) !== 2);
  const gunTags = allTags.filter((t) => Number(t.tag_type) === 2);

  if (loading) return <div className="py-20 text-center text-zinc-500">Đang tải...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      {/* Header đồng bộ với Order Acc */}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire shrink-0">
          <Gem className="w-6 h-6" />
        </span>
        <div>
          <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
            Định giá <span className="text-gradient-fire">tài khoản</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Mô tả và định giá
          </p>
        </div>
      </div>

      <div className="mt-8 frame-ember !overflow-visible">
        <div className="frame-ember-in p-4 md:p-6 !overflow-visible">
          {/* Tiêu đề mục giống trang thông báo, căn giữa */}
          <div className="text-center mb-6 md:mb-8">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide leading-none text-white md:text-4xl">
              Mô tả <span className="text-gradient-fire text-glow-fire">Tài khoản</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-[1.25fr_auto_0.75fr] gap-6 md:gap-8 items-start !overflow-visible">
            {/* Bên trái: Form nhập đặc điểm */}
            <div className="space-y-6 relative z-40 !overflow-visible">
              {/* Ô nhập mô tả dạng chip (Đặc điểm khác) */}
              <div className="relative space-y-3 z-50 !overflow-visible" ref={boxRef}>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Đặc điểm acc</label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 p-2.5 min-h-[52px] focus-within:border-fire-500 transition-all duration-300">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-fire-500/20 text-fire-300 text-xs font-bold pl-3 pr-1.5 py-1 border border-fire-500/30 animate-pop"
                    >
                      {tag.text}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        aria-label={`Xóa ${tag.text}`}
                        className="grid place-items-center w-4 h-4 rounded-full bg-fire-500/30 hover:bg-fire-500/50 text-white transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-500"
                    placeholder={selectedTags.length ? "Thêm đặc điểm..." : "Gõ để tìm đặc điểm (vd: Acc cổ)..."}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                  />
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="grid place-items-center w-6 h-6 rounded-full bg-ink-700 hover:bg-fire-500/20 text-zinc-400 hover:text-fire-400 transition ml-auto"
                      aria-label="Xóa hết đặc điểm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {open && (
                  <div className="absolute z-[100] mt-1.5 w-full surface shadow-2xl py-1.5 text-sm max-h-[224px] overflow-auto animate-rise border border-fire-500/30">
                    {featureTags
                      .filter((t) => t.text.toLowerCase().includes(query.toLowerCase()))
                      .filter((t) => !selectedTags.some((s) => s.id === t.id))
                      .slice(0, 10) // Hiện tối đa 10 (khung cao ~5 dòng, cuộn xem tiếp)
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          // preventDefault: giữ focus input -> không ẩn bàn phím mobile.
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addTag(tag)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-zinc-300 hover:bg-fire-500/10 hover:text-white transition font-medium"
                        >
                          <Plus className="w-4 h-4 text-fire-500" />
                          {tag.text}
                        </button>
                      ))}
                    {query && featureTags.filter((t) => t.text.toLowerCase().includes(query.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-zinc-500 italic">Không tìm thấy đặc điểm này trong danh sách...</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Phần Súng nâng cấp */}
              <div className="space-y-3 relative z-0">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 ml-1">Súng nâng cấp</label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 p-2.5 min-h-[52px] focus-within:border-volt-500 transition-all">
                  {selectedGuns.map((g, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-volt-500/20 text-volt-300 text-xs font-bold pl-3 pr-1.5 py-1 border border-volt-500/30 animate-pop"
                    >
                      {g.tag.text} (x{g.quantity})
                      <button
                        type="button"
                        onClick={() => removeGun(i)}
                        className="grid place-items-center w-4 h-4 rounded-full bg-volt-500/30 hover:bg-volt-500/50 text-white transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsGunModalOpen(true)}
                    className="ml-auto grid place-items-center w-8 h-8 rounded-md bg-volt-500/20 border border-volt-500/40 text-volt-400 hover:text-white hover:bg-volt-500 transition"
                    aria-label="Thêm súng nâng cấp"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>


            </div>

            {/* Kẻ dọc tinh tế ngăn cách */}
            <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-ink-700 to-transparent self-stretch" />

            {/* Bên phải: Kết quả định giá */}
            <div className="space-y-14 relative z-10">
              <div className="flex flex-col items-center justify-center text-center min-h-[150px] md:min-h-[200px]">
                {valuatedPrice !== null ? (
                  <div className="animate-rise">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-fire-400 mb-2">Giá trị ước tính</div>
                    <div className="font-display text-4xl md:text-5xl font-black text-gradient-fire drop-shadow-[0_0_15px_rgba(255,77,0,0.4)]">
                      {formatPrice(valuatedPrice)}
                    </div>
                    <div className="mt-4 text-xs text-zinc-500 italic">
                      * Lưu ý: Đây là mức giá tham khảo dựa trên các đặc điểm bạn chọn.
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-500 flex flex-col items-center gap-3">
                    <Sparkles className="w-10 h-10 opacity-20" />
                    <p className="text-sm">Vui lòng chọn các đặc điểm bên trái để bắt đầu định giá</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {feeError && (
                  <div className="text-sm text-ember-300 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 text-center">
                    {feeError}{" "}
                    <Link href="/nap-tien" className="font-bold text-fire-300 hover:text-fire-200 underline">
                      Nạp tiền ngay
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleValuate}
                  disabled={(selectedTags.length === 0 && selectedGuns.length === 0) || busy}
                  className="w-full justify-center inline-flex items-center gap-2 py-3.5 rounded-lg clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white font-bold hover:brightness-110 transition glow-fire disabled:opacity-50 disabled:grayscale"
                >
                  {busy ? "Đang phân tích..." : "Bắt đầu định giá ngay"}
                </button>
                {fee > 0 && (
                  <div className="text-xs text-zinc-500 text-center flex items-center justify-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-gold-400" />
                    Phí mỗi lượt định giá:{" "}
                    <b className="text-gold-300">{formatPrice(fee)}</b>
                    {user && (
                      <>
                        {" "}· Số dư:{" "}
                        <b className="text-zinc-300">{formatPrice(user.balance)}</b>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phần gợi ý acc */}
      <div className="mt-12">
        {suggestions.length > 0 ? (
          <section className="animate-rise">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-fire-500 to-ember-500" />
              <h2 className="font-display font-bold uppercase tracking-wide text-2xl text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-fire-400" />
                Acc vừa tầm giá
              </h2>
              <span className="flex-1 rule-neon ml-2 opacity-60" />
            </div>
            <AccountCarousel items={suggestions} backHref="/dinh-gia" />
          </section>
        ) : (
          <section>
            {/* Hiển thị thông báo nếu đã định giá xong nhưng không có acc nào gợi ý
            {valuatedPrice !== null && (
              <div className="text-zinc-500 text-sm mb-8 text-center bg-ink-900/40 py-4 rounded-lg border border-ink-800 animate-rise">
                Rất tiếc, hiện tại chưa có tài khoản nào trong tầm giá này. Bạn có thể thử định giá lại với các đặc điểm khác.
              </div>
            )} */}
              <div className="flex items-center gap-3 mb-6">
                <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-gold-300 to-gold-500" />
                <h2 className="font-display font-bold uppercase tracking-wide text-2xl text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-gold-400" />
                  Tại sao nên định giá tại Shop?
                </h2>
                <span className="flex-1 rule-neon ml-2 opacity-60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6"> {/* Removed text-sm text-zinc-400 */}
                <ValuationFeatureCard // New component for feature cards
                  image="/image/bao_mat/bao_mat1.jpg"
                  title="Dữ liệu cập nhật"
                  desc="Giá được cập nhật liên tục theo giá thị trường."
                  Icon={ShieldCheck}
                  accent="gold"
                />
                <ValuationFeatureCard
                  image="/image/bao_mat/bao_mat2.jpg"
                  title="Định giá Acc"
                  desc="Giúp anh em biết được giá trị tài khoản của mình đang ở mức nào so với thị trường."
                  Icon={Sparkles}
                  accent="volt"
                />
                <ValuationFeatureCard
                  image="/image/bao_mat/bao_mat3.png"
                  title="Quyết định"
                  desc="Giúp anh em có giá tham khảo khi mua bán."
                  Icon={Gem}
                  accent="emerald"
                />
              </div>
            </section>
        )}
      </div>

      {/* Modal thêm súng - Chuyển ra ngoài cùng để đè lên mọi thứ */}
      {isGunModalOpen && (
        <TechModal title="Thêm súng nâng cấp" Icon={Gamepad} onClose={() => setIsGunModalOpen(false)} maxWidth="max-w-md">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-3">Chọn Level súng</label>
              <div className="max-h-64 overflow-y-auto pr-2 grid grid-cols-2 gap-2 custom-scrollbar">
                {gunTags.length > 0 ? (
                  gunTags.map((tag) => {
                    const isActive = tempGunTagId === tag.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setTempGunTagId(tag.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-300 ${
                          isActive
                            ? "border-volt-400 bg-volt-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                            : "border-ink-700 bg-ink-950/40 text-zinc-400 hover:border-volt-500/50 hover:bg-ink-900"
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-tight">{tag.text}</span>
                        {/* {tag.gia_tien > 0 && (
                          <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-volt-300" : "text-zinc-500"}`}>
                            +{formatPrice(tag.gia_tien)}
                          </span>
                        )} */}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-4 text-center text-zinc-500 text-xs italic">
                    Chưa có danh sách level súng...
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Số lượng</label>
              <input
                type="number"
                min="1"
                className="field focus:border-volt-500 focus:shadow-[0_0_0_3px_rgba(6,182,212,0.18)] transition-all"
                value={tempGunQuantity}
                onChange={(e) => setTempGunQuantity(Number(e.target.value))}
                placeholder="Ví dụ: 1"
              />
            </div>
            <button
              type="button"
              onClick={addGun}
              disabled={!tempGunTagId}
              className="w-full py-3.5 rounded-lg border border-volt-500/50 bg-transparent text-volt-400 font-bold hover:bg-volt-500/10 hover:border-volt-400 hover:text-white shadow-[0_0_20px_-8px_rgba(6,182,212,0.5)] transition duration-300 disabled:opacity-50 disabled:grayscale"
            >
              Thêm vào danh sách
            </button>
          </div>
        </TechModal>
      )}
    </div>
  );
}

// New component for the feature cards, similar to FeatureBanner but simplified
function ValuationFeatureCard({
  image,
  title,
  desc,
  Icon,
  accent,
}: {
  image: string;
  title: string;
  desc: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  accent: "gold" | "volt" | "emerald";
}) {
  const ACCENT_STYLES: Record<
    typeof accent,
    {
      panel: string;
      icon: string;
      border: string;
      bracket: string;
      shadow: string;
    }
  > = {
    gold: {
      panel: "from-gold-500/10 via-ink-900 to-ink-900",
      icon: "text-gold-300",
      border: "border-gold-400/25",
      bracket: "border-gold-300",
      shadow: "shadow-[0_0_22px_-9px_rgba(212,175,55,0.5)]",
    },
    volt: {
      panel: "from-volt-500/10 via-ink-900 to-ink-900",
      icon: "text-volt-300",
      border: "border-volt-400/25",
      bracket: "border-volt-400",
      shadow: "shadow-[0_0_22px_-9px_rgba(6,182,212,0.55)]",
    },
    emerald: {
      panel: "from-emerald-500/10 via-ink-900 to-ink-900",
      icon: "text-emerald-300",
      border: "border-emerald-400/25",
      bracket: "border-emerald-400",
      shadow: "shadow-[0_0_22px_-9px_rgba(16,185,129,0.55)]",
    },
  };

  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-[4px] border ${styles.border} bg-ink-900 ${styles.shadow} transition duration-300 hover:-translate-y-1 animate-rise`}
    >
      {/* Ngoặc HUD 4 góc */}
      <span className={`pointer-events-none absolute z-10 w-5 h-5 top-0 left-0 border-t-2 border-l-2 ${styles.bracket} transition-all duration-300 group-hover:w-7 group-hover:h-7`} />
      <span className={`pointer-events-none absolute z-10 w-5 h-5 top-0 right-0 border-t-2 border-r-2 ${styles.bracket} transition-all duration-300 group-hover:w-7 group-hover:h-7`} />
      <span className={`pointer-events-none absolute z-10 w-5 h-5 bottom-0 left-0 border-b-2 border-l-2 ${styles.bracket} transition-all duration-300 group-hover:w-7 group-hover:h-7`} />
      <span className={`pointer-events-none absolute z-10 w-5 h-5 bottom-0 right-0 border-b-2 border-r-2 ${styles.bracket} transition-all duration-300 group-hover:w-7 group-hover:h-7`} />

      <div className="relative flex flex-col items-stretch min-h-[180px]">
        {/* Image background - giữ nguyên tỉ lệ nhưng giảm chiều cao trên mobile nếu cần */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/70 to-ink-950/45" />
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-center items-center text-center gap-2 p-4">
          <span className={`grid place-items-center w-10 h-10 md:w-12 md:h-12 clip-chien-sm bg-ink-950/70 border ${styles.border.replace('/25', '/40')} ${styles.icon} transition`}>
            <Icon className="w-6 h-6" />
          </span>
          <h3 className="font-display font-extrabold uppercase tracking-wide text-xl text-white leading-tight">
            {title}
          </h3>
          <p className="text-sm text-zinc-300 max-w-xs leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}