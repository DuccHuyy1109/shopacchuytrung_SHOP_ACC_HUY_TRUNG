/**
 * Khung HUD 4 góc phát sáng — đóng khung form/bảng quan trọng.
 * accent: "volt" (xanh nước biển) | "fire" (đỏ cam) | "gold" (vàng).
 */
export default function HudPanel({
  accent = "volt",
  className = "",
  children,
}: {
  accent?: "volt" | "fire" | "gold";
  className?: string;
  children: React.ReactNode;
}) {
  const STYLES = {
    volt: {
      border: "border-volt-500/35",
      bracket: "border-volt-400",
      shadow: "shadow-[0_0_34px_-12px_rgba(6,182,212,0.8)]",
    },
    fire: {
      border: "border-fire-500/35",
      bracket: "border-fire-500",
      shadow: "shadow-[0_0_34px_-12px_rgba(255,77,0,0.8)]",
    },
    gold: {
      border: "border-gold-400/35",
      bracket: "border-gold-300",
      shadow: "shadow-[0_0_34px_-12px_rgba(212,175,55,0.7)]",
    },
  } as const;
  const s = STYLES[accent];
  return (
    <div
      className={`relative rounded-[4px] border ${s.border} bg-ink-900/45 ${s.shadow} ${className}`}
    >
      <span className={`pointer-events-none absolute z-10 w-5 h-5 top-0 left-0 border-t-2 border-l-2 ${s.bracket}`} />
      <span className={`pointer-events-none absolute z-10 w-5 h-5 top-0 right-0 border-t-2 border-r-2 ${s.bracket}`} />
      <span className={`pointer-events-none absolute z-10 w-5 h-5 bottom-0 left-0 border-b-2 border-l-2 ${s.bracket}`} />
      <span className={`pointer-events-none absolute z-10 w-5 h-5 bottom-0 right-0 border-b-2 border-r-2 ${s.bracket}`} />
      {children}
    </div>
  );
}
