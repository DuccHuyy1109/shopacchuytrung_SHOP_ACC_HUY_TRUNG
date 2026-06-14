"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, imageUrl } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDate, formatPrice } from "../../lib/format";
import type { ContactInfo, Post } from "../../lib/types";
import Lightbox from "../../components/Lightbox";
import PostImageGrid from "../../components/PostImageGrid";
import {
  Share,
  MessageCircle,
  Facebook,
  X,
  Sparkles,
  User,
  ArrowRight,
} from "../../components/icons";

export default function PostDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lb, setLb] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Post>(`/api/posts/${id}`)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function doContact() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.phone) {
      setShowContact(true);
      setContact(null);
      setBusy(false);
      setError("Bạn cần cập nhật số điện thoại trong hồ sơ trước khi liên hệ.");
      return;
    }
    setShowContact(true);
    setContact(null);
    setError("");
    setBusy(true);
    try {
      const res = await api.post<{ contact: ContactInfo }>(
        `/api/posts/${id}/contact`,
      );
      setContact(res.contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  function share() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  if (loading)
    return <div className="py-20 text-center text-zinc-500">Đang tải...</div>;
  if (!post)
    return (
      <div className="py-20 text-center text-zinc-400">
        Không tìm thấy bài đăng (có thể đã đóng hoặc chờ duyệt).{" "}
        <Link href="/posts" className="text-fire-400 hover:text-fire-300">
          Quay lại
        </Link>
      </div>
    );

  const images = post.images.length > 0 ? post.images : null;
  const imgUrls = images ? images.map((i) => i.image_url) : [];
  const sell = post.post_type === "sell";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/posts"
          aria-label="Tất cả bài đăng"
          title="Tất cả bài đăng"
          className="grid place-items-center w-10 h-10 clip-chien-sm border border-ink-700 bg-ink-900/70 text-zinc-300 hover:border-fire-500 hover:text-fire-300 hover:bg-fire-500/10 transition shadow-[0_0_15px_-6px_rgba(255,106,0,0.7)]"
        >
          <ArrowRight className="w-5 h-5 rotate-180" />
        </Link>
      </nav>

      <div className="space-y-10">
        <article className="min-w-0 py-1">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-ink-800 border border-ink-700 text-zinc-500">
              <User className="w-5 h-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-zinc-200 flex items-center gap-1 flex-wrap">
                <span>Người dùng ẩn danh</span>
              </div>
              <div className="text-xs text-zinc-500">{formatDate(post.created_at)}</div>
            </div>
            <div className="ml-auto">
              <span
                className={`inline-flex items-center text-[0.9rem] font-bold px-3 py-1.5 rounded-lg border font-display tracking-wide glow-sm ${
                  sell
                    ? "text-ember-300 border-ember-500/50 shadow-[0_0_12px_rgba(255,108,0,0.3)]"
                    : "text-sky-300 border-sky-500/50 shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                }`}
              >
                {sell ? "Cần bán" : "Cần mua"}
              </span>
            </div>
          </div>

          <div className="mt-2.5">
            {post.title && (
              <h1 className="font-display font-bold uppercase tracking-wide text-white">
                {post.title}
              </h1>
            )}
            {post.caption && (
              <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap leading-relaxed">
                {post.caption}
              </p>
            )}
          </div>

          {imgUrls.length > 0 && (
            <div className="mt-3">
              <PostImageGrid images={imgUrls} />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="font-display font-bold text-2xl text-gradient-fire">
              {post.price ? formatPrice(post.price) : "Thỏa thuận"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={share}
                className="inline-flex items-center gap-1.5 border border-ink-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:border-fire-500 hover:text-fire-300 transition"
              >
                <Share className="w-4 h-4" />
                {copied ? "Đã copy!" : "Chia sẻ"}
              </button>
              <button
                onClick={doContact}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-fire-500 to-ember-500 text-white text-sm font-semibold px-4 py-2 rounded-md hover:brightness-110 transition"
              >
                <MessageCircle className="w-4 h-4" />
                Liên hệ
              </button>
            </div>
          </div>
        </article>

        {images && images.length > 0 && (
          <section>
            <SectionTitle Icon={Sparkles} title="Tất cả ảnh của bài đăng" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, i) => (
                <button key={`post-image-${post.id}-${img.id}-${i}`} onClick={() => setLb(i)} className="group frame-soft block">
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
      </div>

      {lb !== null && imgUrls.length > 0 && (
        <Lightbox images={imgUrls} start={lb} onClose={() => setLb(null)} />
      )}

      {/* Modal liên hệ */}
      {showContact && (
        <div
          className="fixed inset-0 z-[80] bg-ink-950/80 backdrop-blur-md grid place-items-center p-4"
          onClick={() => {
            setShowContact(false);
            setContact(null);
          }}
        >
          <div className="surface max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {busy ? (
              <div className="text-center py-6 text-zinc-400">Đang gửi yêu cầu...</div>
            ) : contact ? (
              <>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-emerald-400 uppercase tracking-wide">
                  <MessageCircle className="w-6 h-6" />
                  Đã gửi yêu cầu liên hệ!
                </div>
                <p className="text-sm text-zinc-400 mt-2">
                  Shop đã nhận thông tin và sẽ kết nối hai bên. Bạn có thể chủ động liên hệ shop:
                </p>
                <div className="mt-4 space-y-2.5">
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
              </>
            ) : (
              <div className="text-ember-400 text-sm py-4 flex items-center gap-2">
                <X className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
            <button
              onClick={() => {
                setShowContact(false);
                setContact(null);
              }}
              className="w-full mt-5 border border-ink-700 text-zinc-300 hover:text-white hover:border-fire-500 py-2.5 rounded-lg transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px bg-gradient-to-r from-transparent via-ink-600/70 to-transparent ${className}`}
      role="separator"
    />
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
