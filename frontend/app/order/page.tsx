"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import AccountCarousel from "../components/AccountCarousel";
import HudPanel from "../components/HudPanel";
import SelectField from "../components/SelectField";
import TagTextInput from "../components/TagTextInput";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatPrice } from "../lib/format";
import {
  Rocket,
  ScrollText,
  Tag,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Facebook,
  ArrowRight,
  ArrowLeft,
  Zap,
  Gem,
  Headset,
  Coins,
} from "../components/icons";
import type {
  AccountListItem,
  ContactInfo,
  DescriptionTag,
  OrderCreateResponse,
  OrderPayResponse,
  OrderFormField,
  Page,
} from "../lib/types";

type Step = "form" | "qr" | "done";

const STEPS: { key: Step; label: string; Icon: (p: { className?: string }) => React.ReactNode }[] = [
  { key: "form", label: "Điền yêu cầu", Icon: ScrollText },
  { key: "qr", label: "Thanh toán", Icon: Tag },
  { key: "done", label: "Hoàn tất", Icon: BadgeCheck },
];

const BENEFITS = [
  { Icon: ShieldCheck, title: "Uy tín — bảo đảm", desc: "Đặt cọc giữ chỗ, minh bạch từng bước.", img: "/image/order_acc/cam_ket1.png" },
  { Icon: Gem, title: "Giá tốt nhất", desc: "Săn đúng acc, đúng giá bạn mong muốn.", img: "/image/order_acc/cam_ket2.png" },
  { Icon: Zap, title: "Giao acc nhanh", desc: "Tìm & bàn giao acc trong thời gian ngắn.", img: "/image/order_acc/cam_ket3.png" },
  { Icon: Headset, title: "Hỗ trợ tận tình", desc: "Admin liên hệ lại ngay khi có acc hợp ý.", img: "/image/order_acc/cam_ket4.png" },
];

export default function OrderPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [fields, setFields] = useState<OrderFormField[]>([]);
  const [descTags, setDescTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("form");

  const [values, setValues] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<AccountListItem[]>([]);

  const [order, setOrder] = useState<OrderCreateResponse | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    api
      .get<OrderFormField[]>("/api/order-form/fields")
      .then(setFields)
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
    api
      .get<DescriptionTag[]>("/api/description-tags")
      .then((d) => setDescTags(d.map((t) => t.text)))
      .catch(() => setDescTags([]));
  }, []);

  // Gợi ý acc có sẵn khớp tiêu chí — có debounce.
  useEffect(() => {
    const params = new URLSearchParams();
    let has = false;
    for (const f of fields) {
      const v = (values[f.field_key] || "").trim();
      if (!v) continue;
      if (f.field_type === "multiselect") {
        params.set("desc_any", v.replace(/[,\s]+$/, ""));
        has = true;
      } else if (f.field_type === "number" && Number(v) > 0) {
        params.set("price_max", String(Number(v)));
        has = true;
      } else if (f.field_key === "vip" || f.label.toLowerCase().includes("vip")) {
        params.set("vip_min", v);
        params.set("vip_max", v);
        has = true;
      }
    }
    if (!has) {
      setSuggestions([]);
      return;
    }
    params.set("page_size", "10");
    params.set("sort", "price_desc");
    const t = setTimeout(() => {
      api
        .get<Page<AccountListItem>>(`/api/accounts?${params.toString()}`)
        .then((d) => setSuggestions(d.items.slice(0, 10)))
        .catch(() => setSuggestions([]));
    }, 500);
    return () => clearTimeout(t);
  }, [values, fields]);

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function cleanedForm(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of fields) {
      let v = (values[f.field_key] || "").trim();
      if (f.field_type === "multiselect") v = v.replace(/[,\s]+$/, "").trim();
      if (v !== "") out[f.field_key] = v;
    }
    return out;
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const form = cleanedForm();
    for (const f of fields) {
      if (f.is_required && !form[f.field_key]) {
        setError(`Vui lòng điền: ${f.label}`);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await api.post<OrderCreateResponse>("/api/orders", {
        form_data: form,
      });
      setOrder(res);
      setStep("qr");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi gửi yêu cầu");
    } finally {
      setBusy(false);
    }
  }

  async function payWithBalance() {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.post<OrderPayResponse>(
        `/api/orders/${order.order.order_code}/pay`,
      );
      setContact(res.contact);
      await refreshUser();
      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi thanh toán");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !user || loading)
    return <div className="py-20 text-center text-zinc-500">Đang tải...</div>;

  if (!user.phone) {
    return (
      <Shell>
        <OrderHero />
        <div className="mt-6 surface p-6 border-l-4 border-l-gold-500 max-w-2xl">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-gold-300 uppercase tracking-wide">
            <ShieldCheck className="w-5 h-5" />
            Cần số điện thoại để order
          </div>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Vì thông tin liên hệ được lấy tự động từ hồ sơ, bạn vui lòng cập nhật{" "}
            <b className="text-zinc-200">số điện thoại (Zalo)</b> trong hồ sơ
            trước khi order để shop liên hệ lại được.
          </p>
          <Link href="/account" className="btn-fire mt-4">
            <ArrowRight className="w-5 h-5" />
            Cập nhật hồ sơ ngay
          </Link>
        </div>
      </Shell>
    );
  }

  const currentStep = STEPS.findIndex((s) => s.key === step);

  return (
    <Shell>
      <OrderHero />

      {/* Stepper — chém góc đỏ nhẹ */}
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

      {/* Step: form */}
      {step === "form" && (
        <>
          <div className="frame-ember mt-5">
            <form onSubmit={submitOrder} className="frame-ember-in p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-ink-700">
                <span className="grid place-items-center w-10 h-10 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire shrink-0">
                  <ScrollText className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-display font-bold uppercase tracking-wide text-white">
                    Tiêu chí acc bạn muốn
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Điền càng chi tiết, shop càng tìm đúng acc cho bạn
                  </div>
                </div>
              </div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
              {fields.map((f, idx) => {
                const long = f.field_type === "textarea" || f.field_type === "multiselect";
                return (
                  <div key={`order-field-${f.id}-${idx}`} className={long ? "sm:col-span-2" : ""}>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
                      {f.label}
                      {f.is_required && <span className="text-ember-400"> *</span>}
                    </label>
                    {f.field_type === "multiselect" ? (
                      <TagTextInput
                        value={values[f.field_key] || ""}
                        onChange={(v) => setValue(f.field_key, v)}
                        suggestions={descTags}
                        placeholder={f.placeholder || "Nhập để gợi ý (vd: Lv 92)..."}
                      />
                    ) : f.field_type === "select" ? (
                      <SelectField
                        value={values[f.field_key] || ""}
                        onChange={(v) => setValue(f.field_key, v)}
                        placeholder="-- Chọn --"
                        options={[
                          { value: "", label: "-- Chọn --" },
                          ...(f.options || []).map((o) => ({
                            value: o,
                            label: o,
                          })),
                        ]}
                      />
                    ) : f.field_type === "textarea" ? (
                      <textarea
                        className="field"
                        rows={3}
                        required={f.is_required}
                        placeholder={f.placeholder || ""}
                        value={values[f.field_key] || ""}
                        onChange={(e) => setValue(f.field_key, e.target.value)}
                      />
                    ) : (
                      <input
                        className="field"
                        type={f.field_type === "number" ? "number" : "text"}
                        required={f.is_required}
                        placeholder={f.placeholder || ""}
                        value={values[f.field_key] || ""}
                        onChange={(e) => setValue(f.field_key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-fire w-full justify-center disabled:opacity-60">
              {busy ? (
                "Đang gửi..."
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  Gửi yêu cầu order
                </>
              )}
            </button>
            </form>
          </div>

          {/* Có acc gợi ý -> hiện gợi ý (ẩn cam kết); không có -> hiện cam kết.
              Đổi qua lại có hiệu ứng fade/slide (key + animate-rise). */}
          <div className="mt-10">
            {suggestions.length > 0 ? (
              <section key="suggest" className="animate-rise">
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-fire-500 to-ember-500" />
                  <h2 className="font-display font-bold uppercase tracking-wide text-2xl text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-fire-400" />
                    Shop có sẵn {suggestions.length} acc hợp ý bạn
                  </h2>
                  <span className="flex-1 rule-neon ml-2 opacity-60" />
                </div>
                <p className="text-xs text-zinc-400 -mt-3 mb-4">
                  Mua acc có sẵn sẽ nhanh hơn — bấm để xem chi tiết.
                </p>
                <AccountCarousel items={suggestions} backHref="/order" />
              </section>
            ) : (
              <section key="camket" className="animate-rise">
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-gold-300 to-gold-500" />
                  <h2 className="font-display font-bold uppercase tracking-wide text-2xl text-white flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-gold-400" />
                    Cam kết của shop
                  </h2>
                  <span className="flex-1 rule-neon ml-2 opacity-60" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {BENEFITS.map(({ Icon, title, desc, img }, idx) => (
                    <BenefitCard key={`benefit-${title}-${idx}`} Icon={Icon} title={title} desc={desc} img={img} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {/* Step: Thanh toán bằng số dư */}
      {step === "qr" && order && (() => {
        const balance = user?.balance ?? order.balance ?? 0;
        const price = order.amount;
        const enough = balance >= price;
        const formData = order.order.form_data || {};
        return (
          <HudPanel accent="fire" className="mt-5 p-5 md:p-8">
            {/* Nút quay lại bước 1 + tiêu đề */}
            <div className="relative flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("form");
                }}
                aria-label="Quay lại bước điền yêu cầu"
                title="Quay lại bước điền yêu cầu"
                className="absolute left-0 grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl uppercase tracking-wide text-gradient-fire text-glow-fire">
                Xác minh &amp; thanh toán
              </h2>
            </div>
            <p className="text-sm text-zinc-400 mt-2 text-center">
              Mã phiếu: <b className="text-gold-300">{order.order.order_code}</b>
            </p>

            <div className="mt-7">
              {/* Thông tin phiếu — hiển thị đầy đủ, không viền */}
              <div className="flex items-center gap-2.5 mb-5">
                <span className="grid place-items-center w-9 h-9 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire shrink-0">
                  <ScrollText className="w-4.5 h-4.5" />
                </span>
                <span className="font-display font-bold uppercase tracking-wide text-white">
                  Thông tin phiếu order
                </span>
              </div>
              {Object.keys(formData).length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 text-sm">
                  {Object.entries(formData).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {k}
                      </div>
                      <div className="mt-1 text-zinc-100 font-medium leading-relaxed break-words">
                        {Array.isArray(v) ? v.join(", ") : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm">Không có thông tin chi tiết.</div>
              )}

              {/* Sọc ngang tinh tế ngăn cách 2 mục */}
              <div className="my-8 h-px bg-gradient-to-r from-transparent via-fire-500/45 to-transparent" />

              {/* Thanh toán — nằm dưới, không viền */}
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
                  <InfoRow label="Phí order" value={formatPrice(price)} highlight />
                  <InfoRow label="Số dư hiện tại" value={formatPrice(balance)} />
                  {enough ? (
                    <InfoRow label="Số dư sau thanh toán" value={formatPrice(balance - price)} />
                  ) : (
                    <InfoRow label="Còn thiếu" value={formatPrice(price - balance)} />
                  )}
                </div>

                {error && (
                  <div className="text-sm text-ember-400 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 mt-3">
                    {error}
                  </div>
                )}

                {enough ? (
                  <button
                    onClick={payWithBalance}
                    disabled={busy}
                    className="btn-fire w-full justify-center mt-5 disabled:opacity-60"
                  >
                    {busy ? "Đang xử lý..." : (
                      <>
                        <Coins className="w-5 h-5" />
                        Thanh toán bằng số dư
                      </>
                    )}
                  </button>
                ) : (
                  <div className="mt-5 space-y-3">
                    <div className="text-sm text-ember-300 bg-ember-500/10 border border-ember-500/30 rounded-md px-3 py-2 text-center">
                      Số dư không đủ để thanh toán. Vui lòng nạp thêm tiền.
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
        );
      })()}

      {/* Step: done */}
      {step === "done" && contact && (
        <div className="relative p-7 mt-5 text-center max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => {
              setOrder(null);
              setContact(null);
              setError("");
              setStep("form");
            }}
            aria-label="Tạo đơn order mới"
            title="Tạo đơn order mới"
            className="absolute left-0 top-7 grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white glow-fire">
            <BadgeCheck className="w-9 h-9" />
          </div>
          <h2 className="font-display font-bold text-xl uppercase tracking-wide text-emerald-400 mt-4">
            Yêu cầu đã được gửi!
          </h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Shop đã nhận yêu cầu và ảnh chuyển khoản của bạn. Vui lòng{" "}
            <b className="text-zinc-200">chờ admin xác nhận</b> và tìm acc phù hợp.
            Bạn có thể xem trạng thái đơn ở mục{" "}
            <Link href="/account?tab=orders" className="text-fire-400 hover:text-fire-300 font-semibold">
              Đơn order của tôi
            </Link>
            .
          </p>
          <div className="mt-5 grid gap-2.5 max-w-xs mx-auto">
            {contact.zalo_link && (
              <a
                href={contact.zalo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <MessageCircle className="w-5 h-5" />
                Nhắn Zalo
              </a>
            )}
            {contact.facebook_link && (
              <a
                href={contact.facebook_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
              >
                <Facebook className="w-5 h-5" />
                Nhắn Facebook
              </a>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ----------------------------- Khung ----------------------------- */
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-10">{children}</div>;
}

function OrderHero() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire shrink-0">
        <Rocket className="w-6 h-6" />
      </span>
      <div>
        <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
          Order Acc <span className="text-gradient-fire">theo yêu cầu</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1.5">
          Đặt acc đúng ý — shop tìm &amp; liên hệ lại với bạn.
        </p>
      </div>
    </div>
  );
}

function BenefitCard({
  Icon,
  title,
  desc,
  img,
}: {
  Icon: (p: { className?: string }) => React.ReactNode;
  title: string;
  desc: string;
  img: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[4px] min-h-[170px] border border-gold-400/25 bg-ink-900 shadow-[0_0_22px_-10px_rgba(212,175,55,0.5)] hover:shadow-[0_0_38px_-8px_rgba(212,175,55,0.75)] hover:-translate-y-1 transition duration-300">
      {/* Ngoặc HUD vàng 4 góc */}
      <span className="pointer-events-none absolute z-10 w-5 h-5 top-0 left-0 border-t-2 border-l-2 border-gold-300 transition-all duration-300 group-hover:w-7 group-hover:h-7" />
      <span className="pointer-events-none absolute z-10 w-5 h-5 top-0 right-0 border-t-2 border-r-2 border-gold-300 transition-all duration-300 group-hover:w-7 group-hover:h-7" />
      <span className="pointer-events-none absolute z-10 w-5 h-5 bottom-0 left-0 border-b-2 border-l-2 border-gold-300 transition-all duration-300 group-hover:w-7 group-hover:h-7" />
      <span className="pointer-events-none absolute z-10 w-5 h-5 bottom-0 right-0 border-b-2 border-r-2 border-gold-300 transition-all duration-300 group-hover:w-7 group-hover:h-7" />

      {/* Ảnh nền */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/70 to-ink-950/45" />

      <div className="relative h-full p-4 flex flex-col items-center justify-center text-center gap-2">
        <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-ink-950/70 border border-gold-500/40 text-gold-300 transition">
          <Icon className="w-6 h-6" />
        </span>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-zinc-300 leading-relaxed">{desc}</div>
      </div>
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
      <b className={highlight ? "text-gold-300" : "text-zinc-100"}>{value}</b>
    </div>
  );
}
