"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AccountCard from "./AccountCard";
import { ArrowRight } from "./icons";
import type { AccountListItem } from "../lib/types";

/**
 * Carousel acc: 3 acc/hàng (desktop), kéo trái-phải nếu nhiều hơn.
 * Mũi tên tinh tế chỉ hiện khi còn nội dung để cuộn. Cuộn mượt + snap.
 */
export default function AccountCarousel({
  items,
  backHref,
}: {
  items: AccountListItem[];
  backHref?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const t = setTimeout(update, 60);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, [items, update]);

  function scroll(dir: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="relative group/car">
      <Arrow dir="left" show={canLeft} onClick={() => scroll(-1)} />
      <div
        ref={trackRef}
        onScroll={update}
        className="flex gap-4 overflow-x-auto pb-2 snap-x scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((a, idx) => (
          <div
            key={`carousel-account-${a.id}-${idx}`}
            className="snap-start shrink-0 w-[80%] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
          >
            <AccountCard acc={a} backHref={backHref} />
          </div>
        ))}
      </div>
      <Arrow dir="right" show={canRight} onClick={() => scroll(1)} />
    </div>
  );
}

function Arrow({
  dir,
  show,
  onClick,
}: {
  dir: "left" | "right";
  show: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "left" ? "Lùi" : "Tiến"}
      tabIndex={show ? 0 : -1}
      className={`absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-9 h-9 rounded-full bg-ink-950/70 backdrop-blur border border-ink-700/80 text-zinc-300 shadow-lg transition duration-300 hover:text-white hover:border-fire-500 hover:bg-ink-900 ${
        dir === "left" ? "left-1" : "right-1"
      } ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <ArrowRight className={`w-4 h-4 ${dir === "left" ? "rotate-180" : ""}`} />
    </button>
  );
}
