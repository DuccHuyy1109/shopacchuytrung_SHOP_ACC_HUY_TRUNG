// Bản đồ nhãn + màu cho dữ liệu Wiki Free Fire.
// Dùng chung cho trang /wiki, thẻ WikiCard và modal chi tiết.

// 3 danh mục hiển thị dạng tab trong trang Wiki.
export const CATEGORY_TABS: { id: number; label: string }[] = [
  { id: 3, label: "Trang Phục" },
  { id: 10, label: "Súng" },
  { id: 4, label: "Bộ Sưu Tập" },
];

export const GENRE_LABELS: Record<number, string> = {
  // Trang phục (cat 3)
  3: "Áo",
  4: "Bộ đồ",
  5: "Quần",
  6: "Giày",
  7: "Phụ kiện",
  9: "Đầu",
  10: "Vẽ mặt",
  22: "Bộ trang phục",
  // Súng (cat 10)
  59: "Skin súng",
  129: "Súng trường",
  130: "Súng ngắm tỉa",
  131: "Súng máy",
  132: "Bắn tỉa",
  133: "Súng lục",
  134: "Shotgun",
  135: "Tiểu liên",
  // Bộ sưu tập (cat 4)
  53: "Skywing",
  56: "Ảnh đại diện",
  57: "Nền",
  58: "Hành động gia nhập",
  64: "Nắm đấm",
  65: "Hành động",
  79: "Biến hình",
  104: "Hiệu ứng kết thúc",
  96: "Đòn kết thúc",
  106: "Động tác",
};

export function genreLabel(id: number): string {
  return GENRE_LABELS[id] || `Thể loại ${id}`;
}

export type RareStyle = { label: string; chip: string; ring: string };

// Màu theo độ hiếm — viền chip + viền khung icon (đồng bộ tông tối + neon).
export const RARE_STYLES: Record<number, RareStyle> = {
  1: { label: "Xám", chip: "border-zinc-500/50 text-zinc-300", ring: "border-zinc-600/60" },
  2: { label: "Lục", chip: "border-emerald-500/50 text-emerald-300", ring: "border-emerald-500/50" },
  3: { label: "Lam", chip: "border-sky-500/50 text-sky-300", ring: "border-sky-500/50" },
  4: { label: "Tím", chip: "border-fuchsia-500/50 text-fuchsia-300", ring: "border-fuchsia-500/50" },
  5: { label: "Cam", chip: "border-orange-500/50 text-orange-300", ring: "border-orange-500/50" },
  6: { label: "Vàng", chip: "border-gold-400/60 text-gold-300", ring: "border-gold-400/60" },
  7: { label: "Đỏ", chip: "border-red-500/50 text-red-300", ring: "border-red-500/50" },
  8: { label: "Tím+", chip: "border-fuchsia-400/70 text-fuchsia-200", ring: "border-fuchsia-400/70" },
  9: { label: "Cam+", chip: "border-amber-400/70 text-amber-200", ring: "border-amber-400/70" },
};

export function rareStyle(id: number): RareStyle {
  return (
    RARE_STYLES[id] || {
      label: `Hiếm ${id}`,
      chip: "border-ink-600 text-zinc-300",
      ring: "border-ink-600",
    }
  );
}
