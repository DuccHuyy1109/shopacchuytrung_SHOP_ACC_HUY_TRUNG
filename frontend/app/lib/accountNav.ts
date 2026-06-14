import { CATEGORY_LABELS } from "./format";
import type { PriceCategory } from "./types";

export const ACCOUNT_BACK_PARAM = "back";
const STORAGE_KEY = "account_detail_back";

export function buildAccountHref(accountId: number | string, backHref?: string): string {
  const base = `/accounts/${accountId}`;
  if (!backHref) return base;
  const params = new URLSearchParams();
  params.set(ACCOUNT_BACK_PARAM, backHref);
  return `${base}?${params.toString()}`;
}

export function saveAccountBack(backHref: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, backHref);
  } catch {
    /* ignore */
  }
}

export function readStoredAccountBack(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseBackPath(back: string): { pathname: string; searchParams: URLSearchParams } | null {
  try {
    const url = back.startsWith("/")
      ? new URL(back, "https://placeholder.local")
      : new URL(back);
    if (!url.pathname.startsWith("/")) return null;
    return { pathname: url.pathname, searchParams: url.searchParams };
  } catch {
    return null;
  }
}

export function resolveAccountBreadcrumb(
  back: string | null,
  priceCategories: PriceCategory[] = [],
): { href: string; label: string; type: string | null } {
  const fallback = { href: "/accounts", label: "Danh sách acc", type: null as string | null };
  if (!back) return fallback;

  const parsed = parseBackPath(back);
  if (!parsed) return fallback;

  const { pathname, searchParams } = parsed;
  const href = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

  if (pathname === "/") return { href: "/", label: "Trang chủ", type: null };
  if (pathname === "/order") return { href: "/order", label: "Order acc", type: null };

  if (pathname === "/accounts") {
    const type = searchParams.get("type");
    if (type && CATEGORY_LABELS[type]) {
      return { href, label: CATEGORY_LABELS[type], type };
    }

    const catId = searchParams.get("category");
    if (catId) {
      const cat = priceCategories.find((c) => String(c.id) === catId);
      return { href, label: cat?.name || "Acc theo giá", type: null };
    }

    const q = searchParams.get("q")?.trim();
    if (q) return { href, label: `Tìm: ${q}`, type: null };

    return { href, label: "Danh sách acc", type: null };
  }

  return fallback;
}

export function pickAccountBack(
  searchBack: string | null,
  storedBack: string | null,
  referrer: string | null,
): string | null {
  if (searchBack) return searchBack;
  if (storedBack) return storedBack;
  if (!referrer || typeof window === "undefined") return null;

  try {
    const ref = new URL(referrer);
    if (ref.origin !== window.location.origin) return null;
    const path = ref.pathname + ref.search;
    if (path.startsWith("/accounts") && !ref.pathname.match(/^\/accounts\/[^/]+$/)) {
      return path;
    }
    if (ref.pathname === "/" || ref.pathname === "/order") return path;
  } catch {
    /* ignore */
  }

  return null;
}
