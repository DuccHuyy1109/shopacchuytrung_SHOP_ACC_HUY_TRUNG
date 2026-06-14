"use client";

import { X } from "./icons";

export default function TechModal({
  title,
  Icon,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}: {
  title: string;
  Icon: (p: { className?: string }) => React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-ink-950/80 backdrop-blur-md grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className={`group w-full ${maxWidth} animate-rise`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-md border border-gold-400/45 bg-gradient-to-br from-gold-500/12 via-ink-900 to-ink-900 shadow-[0_0_55px_-10px_rgba(212,175,55,0.6)]">
          {/* Nội dung cuộn */}
          <div className="relative max-h-[88vh] overflow-y-auto overflow-x-hidden">
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gold-500/25 bg-ink-900/95 backdrop-blur">
              <h3 className="flex items-center gap-2.5 font-display font-bold uppercase tracking-wide text-white">
                <span className="grid place-items-center w-9 h-9 clip-chien-sm bg-ink-900 border border-gold-500/50 text-gold-300">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-gradient-gold">{title}</span>
              </h3>
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="grid place-items-center w-9 h-9 clip-chien-sm border border-ink-700 text-zinc-400 hover:text-white hover:border-ember-500 hover:bg-ember-500/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </div>

          {/* Lớp hiệu ứng robot/điện tử (đè lên, không chặn click) */}
          <div className="pointer-events-none absolute inset-0 z-10 scanlines opacity-30" />
          <div className="scan-line z-10" />
          <span className="hud-bracket z-10 text-gold-300 top-1.5 left-1.5 border-t-2 border-l-2" />
          <span className="hud-bracket z-10 text-gold-300 top-1.5 right-1.5 border-t-2 border-r-2" />
          <span className="hud-bracket z-10 text-gold-300 bottom-1.5 left-1.5 border-b-2 border-l-2" />
          <span className="hud-bracket z-10 text-gold-300 bottom-1.5 right-1.5 border-b-2 border-r-2" />
        </div>
      </div>
    </div>
  );
}
