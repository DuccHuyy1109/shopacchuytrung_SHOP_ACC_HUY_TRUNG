"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

// Ẩn nền này (vì các trang đó có nền riêng)
const HIDE_ON = ["/login", "/register"];

// Sinh danh sách tàn lửa tất định (không lệch hydration)
const EMBERS = Array.from({ length: 40 }).map((_, i) => ({
  left: (i * 47 + 7) % 100, // %
  size: 3 + ((i * 13) % 6), // px
  dur: 13 + ((i * 7) % 14), // s
  delay: (i * 17) % 22, // s
  drift: (i % 2 === 0 ? 1 : -1) * (8 + ((i * 11) % 46)), // px
}));

export default function EmberBackground() {
  const pathname = usePathname();
  if (HIDE_ON.includes(pathname)) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Quầng sáng cố định cho chiều sâu */}
      <div className="absolute -top-24 right-[-8rem] w-[36rem] h-[36rem] rounded-full bg-fire-500/10 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-8rem] w-[34rem] h-[34rem] rounded-full bg-ember-600/10 blur-3xl" />

      {/* Đèn quét chéo chậm */}
      <div className="absolute top-0 left-1/4 h-full w-56 -rotate-12 bg-gradient-to-b from-transparent via-fire-500/8 to-transparent blur-3xl beam-sweep" />

      {/* Tàn lửa bay khắp màn hình */}
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember-fx"
          style={
            {
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
              "--drift": `${e.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
