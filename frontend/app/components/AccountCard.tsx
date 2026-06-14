"use client";

import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "../lib/api";
import { buildAccountHref, saveAccountBack } from "../lib/accountNav";
import {
  CATEGORY_LABELS,
  discountPercent,
  formatPrice,
  showsAccountCategoryBadge,
} from "../lib/format";
import type { AccountListItem } from "../lib/types";
import AccountContactButton from "./AccountContactButton";
import { Crown, Zap, Star, Flame } from "./icons";

export default function AccountCard({
  acc,
  backHref,
}: {
  acc: AccountListItem;
  backHref?: string;
}) {
  const discount = discountPercent(acc.original_price, acc.sale_price);
  const href = buildAccountHref(acc.id, backHref);

  return (
    <div className="group relative block rounded-2xl overflow-hidden bg-ink-850 border border-ink-700 transition duration-200 hover:-translate-y-1 hover:border-fire-500/70 hover:shadow-[0_18px_40px_-18px_rgba(255,77,0,0.55)]">
      <Link
        href={href}
        onClick={() => backHref && saveAccountBack(backHref)}
        className="block"
      >
        {/* Ảnh 5:4 */}
        <div className="relative aspect-[5/4] bg-ink-900 overflow-hidden">
          {acc.thumbnail ? (
            <Image
              src={imageUrl(acc.thumbnail)}
              alt={acc.account_code}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-zinc-600 text-sm gap-1">
              <Flame className="w-7 h-7" />
              Không có ảnh
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/45 via-transparent to-transparent" />

          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-0.5 text-sm font-extrabold text-ember-400 [text-shadow:0_0_10px_rgba(255,32,32,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              <Zap className="w-3.5 h-3.5" />-{discount}%
            </span>
          )}
          {acc.is_featured && (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-sm font-extrabold text-gold-300 [text-shadow:0_0_10px_rgba(212,175,55,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              <Crown className="w-3.5 h-3.5" />
              VIP
            </span>
          )}

          {showsAccountCategoryBadge(acc.category_type) && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-fire-300 [text-shadow:0_1px_8px_rgba(0,0,0,0.95)]">
              <Star className="w-3 h-3" />
              {CATEGORY_LABELS[acc.category_type] || acc.category_type}
            </span>
          )}
        </div>

        <div className="p-3 pb-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-display font-bold text-base text-white whitespace-nowrap">
              MS: <span className="text-gradient-fire">{acc.account_code}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="chip">
                <Crown className="w-3 h-3 text-gold-400" />
                VIP {acc.vip_level}
              </span>
              <span className="chip">
                <Zap className="w-3 h-3 text-fire-400" />
                {acc.upgraded_guns_count} NC
              </span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-3 pt-2.5 flex items-center justify-between gap-2">
        <Link
          href={href}
          onClick={() => backHref && saveAccountBack(backHref)}
          className="flex items-baseline gap-2 min-w-0"
        >
          <span className="text-2xl font-display font-extrabold text-gradient-fire">
            {formatPrice(acc.sale_price)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-zinc-500 line-through">
              {formatPrice(acc.original_price)}
            </span>
          )}
        </Link>
        {acc.status === "available" ? (
          <AccountContactButton
            accountId={acc.id}
            accountCode={acc.account_code}
            compact
          />
        ) : (
          <span className="shrink-0 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Đã bán
          </span>
        )}
      </div>
    </div>
  );
}
