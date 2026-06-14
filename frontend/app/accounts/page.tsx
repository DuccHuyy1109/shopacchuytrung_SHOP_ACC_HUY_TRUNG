"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AccountCard from "../components/AccountCard";
import CompareDialog from "../components/CompareDialog";
import SelectField from "../components/SelectField";
import TechModal from "../components/TechModal";
import { api } from "../lib/api";
import { CATEGORY_LABELS } from "../lib/format";
import type { AccountListItem, Page, PriceCategory } from "../lib/types";
import {
  Search,
  Filter,
  Crown,
  Gem,
  Layers,
  Flame,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
} from "../components/icons";

const SORTS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "vip_desc", label: "VIP cao nhất" },
];

function AccountsContent() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const listBackHref = useMemo(() => {
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, sp]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categories, setCategories] = useState<PriceCategory[]>([]);
  const [data, setData] = useState<Page<AccountListItem> | null>(null);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState(sp.get("type") || "");
  const [category, setCategory] = useState(sp.get("category") || "");
  const [q, setQ] = useState(sp.get("q") || "");
  const [vipMin, setVipMin] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get<PriceCategory[]>("/api/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setType(sp.get("type") || "");
    setCategory(sp.get("category") || "");
    setQ(sp.get("q") || "");
    setPage(1);
  }, [sp]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (type) params.set("category_type", type);
    if (category) params.set("price_category_id", category);
    if (vipMin) params.set("vip_min", vipMin);
    if (priceMin) params.set("price_min", priceMin);
    if (priceMax) params.set("price_max", priceMax);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("page_size", "9");
    api
      .get<Page<AccountListItem>>(`/api/accounts?${params.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [q, type, category, vipMin, priceMin, priceMax, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  function resetFilters() {
    setType("");
    setCategory("");
    setQ("");
    setVipMin("");
    setPriceMin("");
    setPriceMax("");
    setPage(1);
  }

  const TitleIcon = type === "acc_co" ? Crown : type === "sieu_pham" ? Gem : Layers;
  const title = type ? CATEGORY_LABELS[type] || "Danh sách acc" : "Danh sách acc";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Thanh công cụ */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 clip-chien-sm bg-gradient-to-br from-fire-500 to-ember-600 text-white glow-fire">
            <TitleIcon className="w-6 h-6" />
          </span>
          <div>
            <h1 className="font-display font-extrabold uppercase tracking-wide text-2xl md:text-3xl text-white leading-none">
              {title}
            </h1>
            {data && (
              <div className="text-sm text-zinc-400 mt-1">
                Tìm thấy <b className="text-fire-400">{data.total}</b> acc
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sắp xếp — chỉ chevron (xuống=đóng, lên=mở) */}
          <SortDropdown
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
          />

          <IconBtn label="So sánh acc" Icon={ArrowLeftRight} onClick={() => setCompareOpen(true)} />
          <IconBtn label="Bộ lọc" Icon={Filter} onClick={() => setFilterOpen(true)} active={filterOpen} />
        </div>
      </div>

      {/* Kết quả */}
      {loading ? (
        <SkeletonGrid />
      ) : data && data.items.length ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.items.map((a, idx) => (
              <AccountCard key={`account-${a.id}-${idx}`} acc={a} backHref={listBackHref} />
            ))}
          </div>
          <Pagination page={page} pages={Math.max(1, data.pages)} onChange={setPage} />
        </>
      ) : (
        <div className="surface py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
          <span className="grid place-items-center w-14 h-14 clip-chien-sm bg-ink-800 border border-ink-700 text-fire-400">
            <Flame className="w-7 h-7" />
          </span>
          Không tìm thấy acc phù hợp.
          <button
            onClick={resetFilters}
            className="text-sm text-fire-400 hover:text-fire-300 inline-flex items-center gap-1"
          >
            Xóa bộ lọc <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal bộ lọc */}
      {filterOpen && (
        <TechModal title="Bộ lọc" Icon={Filter} onClose={() => setFilterOpen(false)}>
          <div className="space-y-4">
            <FilterField label="Tìm kiếm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Mã / tên acc..."
                  className="w-full rounded-[0.625rem] border border-ink-700 bg-ink-950/80 pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-fire-500 focus:ring-2 focus:ring-fire-500/20 transition"
                />
              </div>
            </FilterField>

            <div className="grid sm:grid-cols-2 gap-4">
              <FilterField label="Loại acc">
                <SelectField
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "", label: "Tất cả" },
                    { value: "acc_co", label: "Acc cổ" },
                    { value: "sieu_pham", label: "Acc siêu phẩm" },
                    { value: "acc_thuong", label: "Acc thường" },
                  ]}
                />
              </FilterField>
              <FilterField label="Mức giá">
                <SelectField
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: "", label: "Tất cả mức giá" },
                    ...categories.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                    })),
                  ]}
                />
              </FilterField>
            </div>

            <FilterField label="VIP tối thiểu">
              <SelectField
                value={vipMin}
                onChange={setVipMin}
                options={[
                  { value: "", label: "Không lọc" },
                  ...[1, 2, 3, 4, 5, 6, 7, 8].map((v) => ({
                    value: String(v),
                    label: `VIP ${v}+`,
                  })),
                ]}
              />
            </FilterField>

            <FilterField label="Khoảng giá (₫)">
              <div className="flex gap-2">
                <input
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="Từ"
                  inputMode="numeric"
                  className="field"
                />
                <input
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="Đến"
                  inputMode="numeric"
                  className="field"
                />
              </div>
            </FilterField>

            <div className="flex gap-2 pt-1">
              <button
                onClick={resetFilters}
                className="btn-ghost flex-1 justify-center"
              >
                Xóa lọc
              </button>
              <button
                onClick={() => {
                  setPage(1);
                  setFilterOpen(false);
                }}
                className="btn-fire flex-1 justify-center"
              >
                <Filter className="w-4 h-4" />
                Áp dụng
              </button>
            </div>
          </div>
        </TechModal>
      )}

      {compareOpen && <CompareDialog onClose={() => setCompareOpen(false)} />}
    </div>
  );
}

/* ----------------------------- Phân trang thông minh ----------------------------- */
function pageList(current: number, total: number): (number | "...")[] {
  const set = new Set<number>();
  [1, current, current + 1, current + 2, total].forEach((p) => {
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
  return (
    <div className="flex justify-center items-center gap-1.5 mt-10 flex-wrap">
      <PageArrow disabled={page <= 1} onClick={() => onChange(page - 1)} dir="left" />
      {pageList(page, pages).map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-2 text-zinc-600 select-none">
            …
          </span>
        ) : (
          <button
            key={`page-${p}-${i}`}
            onClick={() => onChange(p)}
            className={`min-w-10 h-10 px-3 clip-chien-sm text-sm font-bold transition ${
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
      className="grid place-items-center w-10 h-10 clip-chien-sm border border-ink-700 bg-ink-900 text-zinc-300 hover:border-fire-500 hover:text-white disabled:opacity-35 transition"
      aria-label={dir === "left" ? "Trang trước" : "Trang sau"}
    >
      <ArrowRight className={`w-4 h-4 ${dir === "left" ? "rotate-180" : ""}`} />
    </button>
  );
}

/* ----------------------------- Sắp xếp (chevron) ----------------------------- */
function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
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
        aria-label="Sắp xếp"
        className={`grid place-items-center w-10 h-10 clip-chien-sm border transition ${
          open
            ? "bg-fire-500/15 border-fire-500 text-fire-300"
            : "bg-ink-900 border-ink-700 text-zinc-300 hover:border-fire-500 hover:text-white"
        }`}
      >
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {!open && (
        <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
          Sắp xếp
        </span>
      )}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 surface shadow-2xl py-1.5 z-40 animate-rise">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                onChange(s.value);
                setOpen(false);
              }}
              className={`flex items-center justify-between gap-2 w-full px-4 py-2.5 text-sm transition ${
                s.value === value
                  ? "text-gold-300 bg-gold-500/10 font-semibold"
                  : "text-zinc-300 hover:bg-fire-500/10 hover:text-white"
              }`}
            >
              {s.label}
              {s.value === value && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Nút icon + tooltip ----------------------------- */
function IconBtn({
  label,
  Icon,
  onClick,
  active,
}: {
  label: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        aria-label={label}
        className={`grid place-items-center w-10 h-10 clip-chien-sm border transition ${
          active
            ? "bg-fire-500/15 border-fire-500 text-fire-300"
            : "bg-ink-900 border-ink-700 text-zinc-300 hover:border-fire-500 hover:text-white"
        }`}
      >
        <Icon className="w-5 h-5" />
      </button>
      <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-950 border border-ink-700 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover/tip:opacity-100 transition z-30">
        {label}
      </span>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-ink-700 bg-ink-850">
          <div className="aspect-[5/4] bg-ink-800 animate-pulse" />
          <div className="p-3 space-y-2.5">
            <div className="h-4 w-32 bg-ink-800 rounded animate-pulse" />
            <div className="h-5 w-24 bg-ink-800 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-zinc-500">Đang tải...</div>}>
      <AccountsContent />
    </Suspense>
  );
}
