"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import HudPanel from "../../components/HudPanel";
import { api, uploadImages } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatPrice } from "../../lib/format";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Rocket,
  ScrollText,
  ShieldCheck,
} from "../../components/icons";

type Step = "form" | "pay";

export default function NewPostPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [fee, setFee] = useState(0);
  const [postType, setPostType] = useState<"sell" | "buy">("sell");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [price, setPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setFee(Number(s.post_fee_amount || 0) || 0))
      .catch(() => setFee(0));
  }, []);

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // Có phí -> sang bước xác minh & thanh toán; miễn phí -> đăng luôn.
    if (fee > 0) {
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      doCreate();
    }
  }

  async function doCreate() {
    setBusy(true);
    setError("");
    try {
      // 1) Tạo bài (chưa ảnh) để lấy id -> gom ảnh vào thư mục dang_bai/<id>.
      //    Phí đăng bài (nếu có) được server trừ vào số dư ngay lúc tạo.
      const post = await api.post<{ id: number }>("/api/posts", {
        post_type: postType,
        title: title || undefined,
        caption: caption || undefined,
        price: price ? Number(price) : undefined,
        image_urls: [],
      });
      try {
        if (files.length) {
          const image_urls = await uploadImages(files, `dang_bai/${post.id}`, {
            watermark: true,
          });
          await api.put(`/api/posts/${post.id}`, { image_urls });
        }
      } catch (e) {
        // Lỗi khi tải ảnh -> dọn bài vừa tạo để tránh bài trống.
        await api.del(`/api/posts/${post.id}`).catch(() => {});
        throw e;
      }
      await refreshUser();
      router.push("/account?tab=posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi đăng bài");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user)
    return <div className="py-16 text-center text-zinc-500">Đang tải...</div>;

  if (!user.phone)
    return (
      <Shell>
        <Hero />
        <div className="mt-6 surface p-6 border-l-4 border-l-gold-500 max-w-2xl">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-gold-300 uppercase tracking-wide">
            <ShieldCheck className="w-5 h-5" />
            Cần số điện thoại để đăng bài
          </div>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Vui lòng cập nhật <b className="text-zinc-200">số điện thoại (Zalo)</b>{" "}
            trong hồ sơ trước khi đăng bài để shop liên hệ được khi cần.
          </p>
          <Link href="/account" className="btn-fire mt-4">
            <ArrowRight className="w-5 h-5" />
            Cập nhật hồ sơ ngay
          </Link>
        </div>
      </Shell>
    );

  const balance = user.balance ?? 0;
  const enough = balance >= fee;

  return (
    <Shell>
      <Hero />

      {step === "form" && (
        <div className="frame-ember mt-6">
          <form onSubmit={onSubmitForm} className="frame-ember-in p-5 md:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-ink-700">
              <span className="grid place-items-center w-10 h-10 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire shrink-0">
                <ScrollText className="w-5 h-5" />
              </span>
              <div>
                <div className="font-display font-bold uppercase tracking-wide text-white">
                  Nội dung bài đăng
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Bài sẽ được duyệt trước khi hiển thị — danh tính của bạn được ẩn
                  {fee > 0 && (
                    <>
                      {" "}· Phí đăng bài:{" "}
                      <b className="text-gold-300">{formatPrice(fee)}</b>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Loại bài</label>
              <div className="flex gap-2">
                {[
                  { k: "sell", label: "Cần bán acc" },
                  { k: "buy", label: "Cần mua / tìm acc" },
                ].map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setPostType(t.k as "sell" | "buy")}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition ${
                      postType === t.k
                        ? "border-fire-500 bg-fire-500/15 text-fire-200"
                        : "border-ink-700 bg-ink-900/60 text-zinc-300 hover:border-fire-500/50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Tiêu đề</label>
                <input
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Cần bán acc VIP 6 nhiều skin"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Giá (₫)</label>
                <input
                  className="field"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Để trống nếu thỏa thuận"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                Nội dung / mô tả
              </label>
              <textarea
                className="field"
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Mô tả chi tiết acc..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Ảnh acc</label>
              <label className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-ink-600 bg-ink-900/50 py-4 text-sm text-zinc-400 hover:border-fire-500 hover:text-fire-300 transition">
                <ScrollText className="w-5 h-5" />
                {files.length > 0 ? `Đã chọn ${files.length} ảnh` : "Bấm để chọn ảnh acc"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length > 5) {
                      setError("Mỗi bài đăng chỉ được tối đa 5 ảnh.");
                      setFiles(picked.slice(0, 5));
                    } else {
                      setFiles(picked);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-fire w-full justify-center disabled:opacity-60">
              {busy ? "Đang đăng..." : fee > 0 ? (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Tiếp tục thanh toán
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Đăng bài
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {step === "pay" && (
        <HudPanel accent="fire" className="mt-6 p-5 md:p-8">
          {/* Nút quay lại + tiêu đề */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep("form");
              }}
              aria-label="Quay lại chỉnh sửa bài"
              title="Quay lại chỉnh sửa bài"
              className="absolute left-0 grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl uppercase tracking-wide text-gradient-fire text-glow-fire">
              Xác minh &amp; thanh toán
            </h2>
          </div>
          <p className="text-sm text-zinc-400 mt-2 text-center">
            Kiểm tra lại nội dung bài đăng trước khi thanh toán phí.
          </p>

          <div className="mt-7">
            {/* Thông tin bài đăng */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="grid place-items-center w-9 h-9 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire shrink-0">
                <ScrollText className="w-4.5 h-4.5" />
              </span>
              <span className="font-display font-bold uppercase tracking-wide text-white">
                Thông tin bài đăng
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 text-sm">
              <InfoBlock label="Loại bài" value={postType === "sell" ? "Cần bán acc" : "Cần mua / tìm acc"} />
              <InfoBlock label="Giá" value={price ? formatPrice(Number(price)) : "Thỏa thuận"} />
              <InfoBlock label="Tiêu đề" value={title || "(Không tiêu đề)"} />
              <InfoBlock label="Ảnh đính kèm" value={files.length ? `${files.length} ảnh` : "Không có"} />
              {caption && (
                <div className="sm:col-span-2">
                  <InfoBlock label="Nội dung / mô tả" value={caption} />
                </div>
              )}
            </div>

            {/* Sọc ngang tinh tế */}
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
                <Row label="Phí đăng bài" value={formatPrice(fee)} highlight />
                <Row label="Số dư hiện tại" value={formatPrice(balance)} />
                {enough ? (
                  <Row label="Số dư sau thanh toán" value={formatPrice(balance - fee)} />
                ) : (
                  <Row label="Còn thiếu" value={formatPrice(fee - balance)} />
                )}
              </div>

              {error && (
                <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 mt-3">
                  {error}
                </div>
              )}

              {enough ? (
                <button
                  onClick={doCreate}
                  disabled={busy}
                  className="btn-fire w-full justify-center mt-5 disabled:opacity-60"
                >
                  {busy ? "Đang xử lý..." : (
                    <>
                      <Coins className="w-5 h-5" />
                      Thanh toán &amp; đăng bài
                    </>
                  )}
                </button>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="text-sm text-ember-300 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 text-center">
                    Số dư không đủ để thanh toán phí đăng bài. Vui lòng nạp thêm tiền.
                  </div>
                  <Link href="/nap-tien" className="btn-fire w-full justify-center">
                    <Coins className="w-5 h-5" />
                    Nạp tiền ngay
                  </Link>
                </div>
              )}
            </div>
          </div>
        </HudPanel>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-10">{children}</div>;
}

function Hero() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire shrink-0">
        <ScrollText className="w-6 h-6" />
      </span>
      <div>
        <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
          Đăng bài <span className="text-gradient-fire">mua / bán acc</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1.5">
          Bài đăng được duyệt trước khi hiển thị — danh tính của bạn được ẩn hoàn toàn.
        </p>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-zinc-100 font-medium leading-relaxed break-words whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

function Row({
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
