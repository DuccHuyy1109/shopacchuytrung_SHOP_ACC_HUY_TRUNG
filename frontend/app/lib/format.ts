export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN").format(value) + "₫";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const CATEGORY_LABELS: Record<string, string> = {
  acc_co: "Acc cổ",
  sieu_pham: "Acc siêu phẩm",
  acc_thuong: "Acc thường",
  theo_gia: "Acc theo giá",
};

/** Acc thường không hiển thị nhãn danh mục trên thẻ / chi tiết. */
export function showsAccountCategoryBadge(categoryType: string): boolean {
  return categoryType !== "acc_thuong";
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  pending_confirm: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
};

export const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã cộng tiền",
  rejected: "Từ chối",
};

export const TXN_TYPE_LABELS: Record<string, string> = {
  deposit: "Nạp tiền",
  order_payment: "Thanh toán order",
  account_purchase: "Mua acc",
  post_fee: "Phí đăng bài",
  valuation_fee: "Phí định giá",
  adjust: "Điều chỉnh",
  refund: "Hoàn tiền",
};

export const POST_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  closed: "Đã bán/xong",
};

export function discountPercent(original: number, sale: number): number {
  if (!original || original <= sale) return 0;
  return Math.round(((original - sale) / original) * 100);
}

/**
 * Định dạng nội dung thông báo -> HTML an toàn (đã escape).
 * Cú pháp: **đậm**, __gạch chân__, *nghiêng*, ==tô cam==,
 * đầu dòng "# " = tiêu đề lớn. Mỗi dòng là một khối căn giữa.
 */
export function renderRichText(text: string | null | undefined): string {
  if (!text) return "";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/__([^_]+)__/g, "<u>$1</u>")
      .replace(/==([^=]+)==/g, '<span class="text-orange-400 font-semibold">$1</span>')
      .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  return text
    .split("\n")
    .map((raw) => {
      const line = raw.trimEnd();
      if (line.startsWith("# "))
        return `<div class="text-lg font-bold">${inline(line.slice(2))}</div>`;
      if (line === "") return '<div style="height:6px"></div>';
      return `<div>${inline(line)}</div>`;
    })
    .join("");
}

const MD_IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g;

/** Bỏ cú pháp ảnh markdown khỏi văn bản (dùng cho đoạn xem trước). */
export function stripMarkdownImages(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(MD_IMAGE_RE, "").replace(/\n{2,}/g, "\n").trim();
}

/** Lấy URL ảnh ĐẦU TIÊN trong nội dung markdown (![](url)), nếu có. */
export function firstMarkdownImage(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return m ? m[1] : null;
}

/** Lấy TẤT CẢ URL ảnh trong nội dung markdown (![](url)). */
export function allMarkdownImages(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

/**
 * Render nội dung bài hướng dẫn -> HTML an toàn (đã escape). Bỏ ảnh (đã đưa lên slideshow).
 * Cú pháp: **đậm**, *nghiêng*, __gạch chân__, ==tô lửa==;
 * đầu dòng "# " = cỡ lớn, "## " = cỡ vừa.
 */
export function renderGuideContent(text: string | null | undefined): string {
  if (!text) return "";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s.replace(/!\[[^\]]*\]\([^)]+\)/g, "")) // bỏ token ảnh inline (nếu có)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/__([^_]+)__/g, "<u>$1</u>")
      .replace(/==([^=]+)==/g, '<span class="text-fire-400 font-semibold">$1</span>')
      .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  const IMG_LINE = /^!\[[^\]]*\]\([^)]+\)\s*$/;
  return text
    .split("\n")
    .map((raw) => {
      const line = raw.trimEnd();
      if (IMG_LINE.test(line)) return ""; // ảnh -> slideshow
      if (line.startsWith("## "))
        return `<h3 class="font-display font-bold uppercase tracking-wide text-xl text-white mt-4 mb-1">${inline(line.slice(3))}</h3>`;
      if (line.startsWith("# "))
        return `<h2 class="font-display font-bold uppercase tracking-wide text-2xl text-gradient-fire mt-5 mb-1">${inline(line.slice(2))}</h2>`;
      if (line === "") return '<div style="height:8px"></div>';
      return `<p class="text-zinc-300 leading-relaxed">${inline(line)}</p>`;
    })
    .join("");
}
