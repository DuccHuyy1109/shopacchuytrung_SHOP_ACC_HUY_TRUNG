"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import PostImageGrid from "../components/PostImageGrid";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatDate, formatPrice } from "../lib/format";
import type { ContactInfo, Page, Post } from "../lib/types";
import {
  ScrollText,
  Plus,
  ChevronDown,
  User,
  MessageCircle,
  Facebook,
  ArrowRight,
  Star,
  X,
  Share,
} from "../components/icons";

type Filter = "" | "buy" | "sell";
const FILTERS: { k: Filter; label: string }[] = [
  { k: "", label: "Tất cả" },
  { k: "sell", label: "Cần bán" },
  { k: "buy", label: "Cần mua" },
];

const PAGE_SIZE = 5;

export default function PostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement | null>(null);

  const [contactPost, setContactPost] = useState<Post | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(Math.floor(posts.length / PAGE_SIZE) + 1),
        page_size: String(PAGE_SIZE),
      });
      if (filter) params.set("post_type", filter);
      const data = await api.get<Page<Post>>(`/api/posts?${params.toString()}`);
      setPosts((prev) => [...prev, ...data.items]);
      setHasMore(data.items.length === PAGE_SIZE && data.pages > Math.floor((posts.length + PAGE_SIZE) / PAGE_SIZE));
    } catch (e) {
      console.error("Error loading posts:", e);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [posts.length, filter, loading, hasMore]);

  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    setInitialLoading(true);
  }, [filter]);

  useEffect(() => {
    if (initialLoading && posts.length === 0) {
      loadMore();
    }
  }, [initialLoading, posts.length, loadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observerRef.current = observer;
    if (lastPostRef.current) {
      observer.observe(lastPostRef.current);
    }
    return () => {
      if (lastPostRef.current) {
        observer.unobserve(lastPostRef.current);
      }
      observer.disconnect();
    };
  }, [loadMore, hasMore, loading]);

  useEffect(() => {
    if (lastPostRef.current && observerRef.current) {
      observerRef.current.observe(lastPostRef.current);
      return () => {
        if (lastPostRef.current) {
          observerRef.current?.unobserve(lastPostRef.current);
        }
      };
    }
  }, [posts.length]);

  async function doContact(post: Post) {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!user.phone) {
      setContactPost(post);
      setContact(null);
      setBusy(false);
      setError("Bạn cần cập nhật số điện thoại trong hồ sơ trước khi liên hệ.");
      return;
    }
    setContactPost(post);
    setContact(null);
    setError("");
    setBusy(true);
    try {
      const res = await api.post<{ contact: ContactInfo }>(`/api/posts/${post.id}/contact`);
      setContact(res.contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Thanh công cụ: header + dropdown lọc + nút thêm (cùng 1 hàng) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire shrink-0">
            <ScrollText className="w-6 h-6" />
          </span>
          <div>
            <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
              Bài đăng <span className="text-gradient-fire">mua bán</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5">
              Cộng đồng — danh tính người đăng được ẩn hoàn toàn.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 md:flex-row md:items-center">
          <div className="relative group/tip order-1 md:order-2">
            <Link
              href="/posts/new"
              aria-label="Đăng bài"
              className="grid place-items-center w-10 h-10 clip-chien-sm border border-fire-500/45 bg-transparent text-fire-300 hover:text-white hover:border-fire-500 hover:bg-fire-500/10 transition shadow-[0_0_15px_-5px_rgba(255,106,0,0.6)]"
            >
              <Plus className="w-5 h-5" />
            </Link>
            <span className="pointer-events-none absolute top-full mt-2 right-0 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
              Đăng bài
            </span>
          </div>
          <div className="order-2 md:order-1">
            <FilterDropdown
              value={filter}
              onChange={(v) => {
                setFilter(v);
              }}
            />
          </div>
        </div>
      </div>

      {/* Danh sách */}
      <div className="mt-6">
        {initialLoading ? (
          <div className="py-16 text-center text-zinc-500">Đang tải...</div>
        ) : posts.length ? (
          <>
            <div className="divide-y divide-ink-800">
              {posts.map((p, idx) => (
                <div
                  key={`post-${p.id}-${idx}`}
                  ref={idx === posts.length - 1 ? lastPostRef : null}
                >
                  <PostRow post={p} onContact={doContact} />
                </div>
              ))}
            </div>
            {loading && (
              <div className="py-8 text-center text-zinc-500">Đang tải thêm...</div>
            )}
            {!hasMore && (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <span className="grid place-items-center w-12 h-12 clip-chien-sm bg-ink-800 border border-ink-700 text-zinc-500">
                  <ScrollText className="w-6 h-6" />
                </span>
                <div className="text-zinc-400 font-semibold tracking-wide">Hết bài đăng</div>
              </div>
            )}
          </>
        ) : (
          <div className="surface py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
            <span className="grid place-items-center w-14 h-14 clip-chien-sm bg-ink-800 border border-ink-700 text-fire-400">
              <ScrollText className="w-7 h-7" />
            </span>
            Chưa có bài đăng nào.
          </div>
        )}
      </div>

      {/* Modal liên hệ */}
      {contactPost && (
        <div
          className="fixed inset-0 z-[80] bg-ink-950/80 backdrop-blur-md grid place-items-center p-4"
          onClick={() => {
            setContactPost(null);
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
                setContactPost(null);
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

/* ----------------------------- 1 bài đăng ----------------------------- */
function PostRow({ post, onContact }: { post: Post; onContact: (p: Post) => void }) {
   const sell = post.post_type === "sell";
   const [copied, setCopied] = useState(false);

   function share() {
     navigator.clipboard?.writeText(`${window.location.origin}/posts/${post.id}`).then(() => {
       setCopied(true);
       setTimeout(() => setCopied(false), 3000);
     }).catch(() => {});
   }

   return (
     <article className="py-6">
       <div className="flex items-center gap-2.5">
         {post.by_admin ? (
           <img
             src="/logo_web.png"
             alt="Shop Acc Huy Trung"
             className="w-9 h-9 rounded-full object-cover border border-gold-500/50 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
           />
         ) : (
           <span className="grid place-items-center w-9 h-9 rounded-full bg-ink-800 border border-ink-700 text-zinc-500">
             <User className="w-5 h-5" />
           </span>
         )}
         <div className="leading-tight">
           <div className="text-sm font-semibold text-zinc-200 flex items-center gap-1 flex-wrap">
              <span className={post.by_admin ? "text-gradient-fire" : ""}>
                {post.by_admin ? "Shop Acc Huy Trung" : "Người dùng ẩn danh"}
              </span>
            </div>
           <div className="text-xs text-zinc-500">{formatDate(post.created_at)}</div>
         </div>
         <div className="ml-auto flex items-center gap-1.5">
           {post.is_pinned && (
             <span className="inline-flex items-center gap-1.5 text-[0.9rem] font-bold uppercase px-3 py-1.5 rounded-lg border font-display tracking-wide glow-sm text-gold-300 border-gold-500/50 shadow-[0_0_12px_rgba(212,175,55,0.3)]">
               <Star className="w-4 h-4" />
               Ghim
             </span>
           )}
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

                <Link href={`/posts/${post.id}`} className="block group mt-2.5">
          {post.title && (
            <h3 className="font-display font-bold uppercase tracking-wide text-white group-hover:text-fire-300 transition">
              {post.title}
            </h3>
          )}
          {post.caption && (
            <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap line-clamp-3 leading-relaxed">
              {post.caption}
            </p>
          )}
        </Link>

       {post.images.length > 0 && (
         <div className="mt-3">
           <PostImageGrid images={post.images.map((i) => i.image_url)} />
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
             onClick={() => onContact(post)}
             className="inline-flex items-center gap-1.5 bg-gradient-to-r from-fire-500 to-ember-500 text-white text-sm font-semibold px-4 py-2 rounded-md hover:brightness-110 transition"
           >
             <MessageCircle className="w-4 h-4" />
             Liên hệ
           </button>
         </div>
       </div>
    </article>
  );
}

/* ----------------------------- Dropdown lọc (chevron) ----------------------------- */
function FilterDropdown({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (v: Filter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative group/tip" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Lọc bài đăng"
        className={`grid place-items-center w-10 h-10 clip-chien-sm border transition ${
          open || value
            ? "bg-transparent border-volt-400/70 text-volt-300 shadow-[0_0_18px_-10px_rgba(56,189,248,0.85)]"
            : "bg-transparent border-volt-400/35 text-volt-300 hover:border-volt-300 hover:text-white hover:shadow-[0_0_18px_-10px_rgba(56,189,248,0.85)]"
        }`}
      >
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {!open && (
        <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
          Lọc bài
        </span>
      )}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 surface shadow-2xl py-1.5 z-40 animate-rise">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              onClick={() => {
                onChange(f.k);
                setOpen(false);
              }}
              className={`flex items-center justify-between gap-2 w-full px-4 py-2.5 text-sm transition ${
                f.k === value
                  ? "text-volt-300 bg-volt-500/10 font-semibold"
                  : "text-zinc-300 hover:bg-volt-500/10 hover:text-white"
              }`}
            >
              {f.label}
              {f.k === value && <span className="w-1.5 h-1.5 rounded-full bg-volt-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
