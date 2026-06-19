"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import SelectField from "../components/SelectField";
import WikiCard from "../components/WikiCard";
import WikiDetailModal from "../components/WikiDetailModal";
import { api } from "../lib/api";
import type { Page, WikiItem, WikiMeta } from "../lib/types";
import { CATEGORY_TABS } from "../lib/wiki";
import { ArrowRight, Search, Sparkles } from "../components/icons";

const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "name", label: "Tên A → Z" },
];

const PAGE_SIZE = 24;

function WikiContent() {
  // null = đang kiểm tra cấu hình; false = chức năng đang tắt.
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [category, setCategory] = useState(3);
  const [meta, setMeta] = useState<WikiMeta | null>(null);
  const [data, setData] = useState<Page<WikiItem> | null>(null);
  const [loading, setLoading] = useState(true);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<number | null>(null);
  const [rare, setRare] = useState<number | null>(null);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<number | null>(null);

  // Kiểm tra cấu hình site: chức năng Tra cứu có đang bật không.
  useEffect(() => {
    api
      .get<Record<string, string>>("/api/site-settings")
      .then((s) => setEnabled(s.wiki_enabled === "1"))
      .catch(() => setEnabled(false));
  }, []);

  // Đổi danh mục -> nạp lại bộ đếm thể loại/độ hiếm cho danh mục đó.
  useEffect(() => {
    setMeta(null);
    api
      .get<WikiMeta>(`/api/wiki/meta?category=${category}`)
      .then(setMeta)
      .catch(() => setMeta(null));
  }, [category]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("category", String(category));
    if (q.trim()) params.set("q", q.trim());
    if (genre) params.set("genre", String(genre));
    if (rare) params.set("rare", String(rare));
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    api
      .get<Page<WikiItem>>(`/api/wiki/items?${params.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [category, q, genre, rare, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  function switchCategory(catId: number) {
    if (catId === category) return;
    setCategory(catId);
    setGenre(null);
    setRare(null);
    setQ("");
    setQInput("");
    setPage(1);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQ(qInput);
  }

  function resetFilters() {
    setQInput("");
    setQ("");
    setGenre(null);
    setRare(null);
    setPage(1);
  }

  // Chức năng đang tắt -> chặn cả khi vào thẳng URL.
  if (enabled === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center clip-chien-sm border border-ink-700 bg-ink-800 text-zinc-500">
          <Sparkles className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold uppercase tracking-wide text-white">
          Chức năng đang tạm tắt
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Mục Tra cứu hiện chưa được bật. Vui lòng quay lại sau.
        </p>
      </div>
    );
  }
  if (enabled === null) {
    return <div className="py-24 text-center text-zinc-500">Đang tải...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Tiêu đề */}
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire">
          <Sparkles className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold uppercase leading-none tracking-wide text-white md:text-3xl">
            Tìm kiếm <span className="text-gradient-gold">đồ bạn cần</span>
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Tra cứu trang phục, súng &amp; bộ sưu tập Free Fire — cập nhật tự động.
          </p>
        </div>
      </div>

      {/* Tab danh mục */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_TABS.map((t) => {
          const active = category === t.id;
          return (
            <button
              key={`cat-${t.id}`}
              onClick={() => switchCategory(t.id)}
              className={`clip-chien-sm px-4 py-2 text-sm font-bold uppercase tracking-wide transition ${
                active
                  ? "bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire"
                  : "border border-ink-700 bg-ink-900 text-zinc-300 hover:border-fire-500 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Thanh tìm kiếm + sắp xếp */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Tìm theo tên..."
              className="w-full rounded-[0.625rem] border border-ink-700 bg-ink-950/80 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-fire-500 focus:ring-2 focus:ring-fire-500/20"
            />
          </div>
        </form>
        <div className="sm:w-52">
          <SelectField
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            options={SORTS}
          />
        </div>
      </div>

      {/* Chip lọc thể loại */}
      {meta && meta.genres.length > 0 && (
        <ChipRow
          items={[
            { id: null, label: "Tất cả", count: meta.total },
            ...meta.genres.map((g) => ({ id: g.id, label: g.label, count: g.count })),
          ]}
          active={genre}
          onPick={(id) => {
            setGenre(id);
            setPage(1);
          }}
        />
      )}

      {/* Chip lọc độ hiếm */}
      {meta && meta.rares.length > 0 && (
        <ChipRow
          items={[
            { id: null, label: "Mọi độ hiếm", count: meta.total },
            ...meta.rares.map((r) => ({ id: r.id, label: r.label, count: r.count })),
          ]}
          active={rare}
          onPick={(id) => {
            setRare(id);
            setPage(1);
          }}
          tone="rare"
        />
      )}

      {/* Kết quả */}
      {loading ? (
        <SkeletonGrid />
      ) : data && data.items.length ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((item, idx) => (
              <WikiCard key={`wiki-${item.id}-${idx}`} item={item} onOpen={(it) => setOpenId(it.id)} />
            ))}
          </div>
          <Pagination
            page={page}
            pages={Math.max(1, data.pages)}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      ) : (
        <div className="surface mt-5 flex flex-col items-center gap-3 py-16 text-center text-zinc-400">
          <span className="grid h-14 w-14 place-items-center clip-chien-sm border border-ink-700 bg-ink-800 text-fire-400">
            <Sparkles className="h-7 w-7" />
          </span>
          Không tìm thấy món phù hợp.
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-sm text-fire-400 transition hover:text-fire-300"
          >
            Xóa bộ lọc <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Cảnh báo: chỉ là công cụ tìm kiếm, không thay thế wiki chính thức */}
      <div className="mt-12 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-4 py-3 text-center text-xs text-zinc-400">
        ⚠️ Công cụ này chỉ giúp <b className="text-gold-300">tra cứu / tìm kiếm</b> trang
        phục, súng &amp; vật phẩm Free Fire. Dữ liệu tham khảo từ wiki.ff.garena.vn —{" "}
        <b className="text-zinc-300">KHÔNG phải bản thay thế</b> cho Wiki Free Fire chính thức.
      </div>

      {openId !== null && (
        <WikiDetailModal itemId={openId} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

/* --------------------------------- Chip lọc --------------------------------- */
function ChipRow({
  items,
  active,
  onPick,
  tone = "genre",
}: {
  items: { id: number | null; label: string; count: number }[];
  active: number | null;
  onPick: (id: number | null) => void;
  tone?: "genre" | "rare";
}) {
  const activeCls =
    tone === "rare"
      ? "border-gold-400/70 bg-gold-500/10 text-gold-200"
      : "border-fire-500/70 bg-fire-500/10 text-fire-200";
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={`chip-${tone}-${it.id ?? "all"}`}
            onClick={() => onPick(it.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? activeCls
                : "border-ink-700 bg-ink-900 text-zinc-300 hover:border-fire-500/50 hover:text-white"
            }`}
          >
            {it.label}
            <span className="ml-1.5 text-[0.65rem] text-zinc-500">{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- Phân trang ------------------------------- */
function pageList(current: number, total: number): (number | "...")[] {
  const set = new Set<number>();
  [1, current - 1, current, current + 1, total].forEach((p) => {
    if (p >= 1 && p <= total) set.add(p);
  });
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("...");
    out.push(p);
    prev = p;
  }
  return out;
}

function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      <PageArrow disabled={page <= 1} onClick={() => onChange(page - 1)} dir="left" />
      {pageList(page, pages).map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="select-none px-2 text-zinc-600">
            …
          </span>
        ) : (
          <button
            key={`wpage-${p}-${i}`}
            onClick={() => onChange(p)}
            className={`h-10 min-w-10 px-3 clip-chien-sm text-sm font-bold transition ${
              p === page
                ? "bg-gradient-to-br from-fire-500 to-ember-500 text-white glow-fire"
                : "border border-ink-700 bg-ink-900 text-zinc-300 hover:border-fire-500 hover:text-white"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <PageArrow disabled={page >= pages} onClick={() => onChange(page + 1)} dir="right" />
    </div>
  );
}

function PageArrow({
  disabled,
  onClick,
  dir,
}: {
  disabled: boolean;
  onClick: () => void;
  dir: "left" | "right";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center clip-chien-sm border border-ink-700 bg-ink-900 text-zinc-300 transition hover:border-fire-500 hover:text-white disabled:opacity-35"
      aria-label={dir === "left" ? "Trang trước" : "Trang sau"}
    >
      <ArrowRight className={`h-4 w-4 ${dir === "left" ? "rotate-180" : ""}`} />
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="surface flex gap-3 p-3">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-ink-800" />
          <div className="flex-1 space-y-2.5 py-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WikiPage() {
  return (
    <Suspense
      fallback={<div className="py-16 text-center text-zinc-500">Đang tải...</div>}
    >
      <WikiContent />
    </Suspense>
  );
}
