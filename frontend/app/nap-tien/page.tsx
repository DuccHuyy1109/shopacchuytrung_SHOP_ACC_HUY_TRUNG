"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import HudPanel from "../components/HudPanel";
import { api, uploadImages } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatPrice } from "../lib/format";
import {
  Coins,
  Tag,
  BadgeCheck,
  ScrollText,
  ArrowRight,
  ShieldCheck,
} from "../components/icons";
import type { DepositPrepareResponse } from "../lib/types";

type Step = "amount" | "qr" | "done";

const STEPS: { key: Step; label: string; Icon: (p: { className?: string }) => React.ReactNode }[] = [
  { key: "amount", label: "Nhập số tiền", Icon: Coins },
  { key: "qr", label: "Chuyển khoản", Icon: Tag },
  { key: "done", label: "Hoàn tất", Icon: BadgeCheck },
];

const PRESETS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function DepositPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(100000);
  const [deposit, setDeposit] = useState<DepositPrepareResponse | null>(null);
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  async function prepareDeposit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!amount || amount < 10000) {
      setError("Số tiền nạp tối thiểu là 10.000đ");
      return;
    }
    setBusy(true);
    try {
      // Bước 1 chỉ lấy QR + nội dung CK, CHƯA tạo yêu cầu nạp (chống spam).
      const res = await api.post<DepositPrepareResponse>(
        "/api/deposits/prepare",
        { amount },
      );
      setDeposit(res);
      setStep("qr");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo yêu cầu nạp");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTransfer() {
    if (!deposit) return;
    if (!billFiles.length) {
      setError("Vui lòng đính kèm ảnh bill chuyển khoản");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const bill_images = await uploadImages(
        billFiles,
        `deposits/${deposit.deposit_code}`,
      );
      // Chỉ đến bước này (đã CK + có bill) yêu cầu nạp mới được tạo & gửi admin.
      await api.post(`/api/deposits`, {
        amount: deposit.amount,
        deposit_code: deposit.deposit_code,
        transfer_content: deposit.transfer_content,
        bill_images,
      });
      await refreshUser();
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xác nhận");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !user)
    return <div className="py-20 text-center text-zinc-500">Đang tải...</div>;

  const currentStep = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-gold-400 to-ember-600 text-white glow-fire shrink-0">
          <Coins className="w-6 h-6" />
        </span>
        <div>
          <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
            Nạp tiền <span className="text-gradient-fire">vào ví</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Số dư hiện tại:{" "}
            <b className="text-gold-300">{formatPrice(user.balance)}</b>
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mt-6 frame-ember">
        <div className="frame-ember-in p-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = i < currentStep;
              const isActive = i === currentStep;
              return (
                <Fragment key={s.key}>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid place-items-center w-10 h-10 clip-chien-sm border transition ${
                        isActive || done
                          ? "bg-gradient-to-br from-fire-500 to-ember-500 border-transparent text-white glow-fire"
                          : "bg-ink-900 border-ink-700 text-zinc-500"
                      }`}
                    >
                      <s.Icon className="w-5 h-5" />
                    </span>
                    <span
                      className={`text-sm font-bold uppercase tracking-wide hidden sm:block ${
                        isActive ? "text-white" : done ? "text-fire-300" : "text-zinc-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span
                      className={`flex-1 h-0.5 rounded-full ${
                        i < currentStep ? "bg-gradient-to-r from-fire-500 to-ember-500" : "bg-ink-700"
                      }`}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step: amount */}
      {step === "amount" && (
        <div className="frame-ember mt-5">
          <form onSubmit={prepareDeposit} className="frame-ember-in p-5 md:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-ink-700">
              <span className="grid place-items-center w-10 h-10 clip-chien-sm bg-gradient-to-br from-gold-400 to-ember-500 text-white glow-fire shrink-0">
                <Coins className="w-5 h-5" />
              </span>
              <div>
                <div className="font-display font-bold uppercase tracking-wide text-white">
                  Chọn số tiền nạp
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Tối thiểu 10.000đ — tiền vào ví dùng để thanh toán dịch vụ
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-start">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Chọn nhanh
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESETS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-bold transition ${
                        amount === v
                          ? "border-fire-500 bg-fire-500/15 text-fire-200"
                          : "border-ink-700 bg-ink-900/60 text-zinc-300 hover:border-fire-500/50"
                      }`}
                    >
                      {formatPrice(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">
                  Số tiền (đ) <span className="text-ember-400">*</span>
                </label>
                <input
                  className="field"
                  type="number"
                  min={10000}
                  step={1000}
                  value={amount || ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Ví dụ: 100000"
                />
                <div className="text-sm text-gold-300 mt-2 font-semibold">
                  = {formatPrice(amount || 0)}
                </div>

                {error && (
                  <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 mt-3">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={busy} className="btn-fire w-full justify-center mt-4 disabled:opacity-60">
                  {busy ? "Đang tạo..." : <><ArrowRight className="w-5 h-5" />Tiếp tục chuyển khoản</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Step: qr — QR bên trái, thông tin & xác nhận bên phải */}
      {step === "qr" && deposit && (
        <HudPanel accent="gold" className="mt-5 p-5 md:p-8">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl uppercase tracking-wide text-gradient-fire text-glow-fire text-center">
            Quét mã QR để nạp tiền
          </h2>
          <p className="text-sm text-zinc-400 mt-2 text-center">
            Mã yêu cầu: <b className="text-gold-300">{deposit.deposit_code}</b>
          </p>

          <div className="mt-7 grid lg:grid-cols-[auto_1fr] gap-8 items-start">
            {/* Trái: mã QR */}
            <div className="mx-auto lg:mx-0 text-center">
              <div className="mx-auto w-fit rounded-xl bg-white p-3 glow-fire">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={deposit.qr_url} alt="QR nạp tiền" className="w-64 h-auto" />
              </div>
              <div className="mt-3 text-sm text-zinc-400">
                Số tiền nạp
                <div className="font-display text-2xl font-black text-gradient-fire mt-0.5">
                  {formatPrice(deposit.amount)}
                </div>
              </div>
            </div>

            {/* Phải: thông tin chuyển khoản + bill + xác nhận */}
            <div>
              <div className="text-sm bg-ink-900/60 border border-ink-700 rounded-lg p-4 space-y-2">
                <InfoRow label="Ngân hàng" value={deposit.bank.bank_name || deposit.bank.bank_code} />
                <InfoRow label="Số tài khoản" value={deposit.bank.account_number} />
                <InfoRow label="Chủ tài khoản" value={deposit.bank.account_name} />
                <InfoRow label="Số tiền" value={formatPrice(deposit.amount)} highlight />
                <InfoRow label="Nội dung CK" value={deposit.transfer_content} highlight />
              </div>
              <div className="mt-2.5 text-xs text-ember-300 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2">
                ⚠ Nhập <b>đúng nội dung chuyển khoản</b> ở trên để shop đối soát &amp; cộng tiền chính xác.
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                  Ảnh bill chuyển khoản <span className="text-ember-400">*</span>
                </label>
                <label className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-ink-600 bg-ink-900/50 py-4 text-sm text-zinc-400 hover:border-fire-500 hover:text-fire-300 transition">
                  <ScrollText className="w-5 h-5" />
                  {billFiles.length > 0 ? `Đã chọn ${billFiles.length} ảnh bill` : "Bấm để chọn ảnh biên lai"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setBillFiles(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                </label>
                {billFiles.length > 0 ? (
                  <div className="text-xs text-emerald-400 mt-1.5">✓ Đã chọn {billFiles.length} ảnh bill</div>
                ) : (
                  <div className="text-xs text-zinc-500 mt-1.5">
                    Bắt buộc chụp màn hình biên lai chuyển khoản để shop xác nhận.
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 mt-3">
                  {error}
                </div>
              )}
              <button
                onClick={confirmTransfer}
                disabled={busy || billFiles.length === 0}
                className="btn-fire w-full justify-center mt-4 disabled:opacity-60"
              >
                {busy ? "Đang gửi..." : <><BadgeCheck className="w-5 h-5" />Tôi đã chuyển khoản</>}
              </button>
            </div>
          </div>
        </HudPanel>
      )}

      {/* Step: done */}
      {step === "done" && (
        <div className="p-7 mt-5 text-center max-w-xl mx-auto">
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white glow-fire">
            <BadgeCheck className="w-9 h-9" />
          </div>
          <h2 className="font-display font-bold text-xl uppercase tracking-wide text-emerald-400 mt-4">
            Đã gửi yêu cầu nạp tiền!
          </h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Shop đã nhận thông tin chuyển khoản của bạn. Vui lòng{" "}
            <b className="text-zinc-200">chờ admin xác nhận</b>, số dư sẽ được cộng
            ngay sau khi đối soát. Bạn có thể theo dõi ở mục{" "}
            <Link href="/account?tab=finance" className="text-fire-400 hover:text-fire-300 font-semibold">
              Tài chính
            </Link>
            .
          </p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <Link href="/account?tab=finance" className="btn-fire">
              <Coins className="w-5 h-5" />
              Xem ví của tôi
            </Link>
            <button
              onClick={() => {
                setStep("amount");
                setDeposit(null);
                setBillFiles([]);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-5 py-2.5 font-semibold text-zinc-300 hover:border-fire-500/60 hover:text-white transition"
            >
              <ShieldCheck className="w-5 h-5" />
              Nạp tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
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
      <b className={highlight ? "text-gold-300 break-all text-right" : "text-zinc-100 break-all text-right"}>{value}</b>
    </div>
  );
}
