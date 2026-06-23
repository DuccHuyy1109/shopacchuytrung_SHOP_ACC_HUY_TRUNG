/**
 * Tiện ích dựng ảnh Open Graph cho link preview (chia sẻ qua Zalo/Facebook...).
 *
 * Cung cấp KÈM width/height giúp các nền tảng (đặc biệt Zalo & Facebook) hiển
 * thị ảnh ngay lần unfurl đầu thay vì để trống/đen (do chúng tải ảnh og bất
 * đồng bộ, thiếu kích thước thì hay bỏ qua ở lần quét đầu).
 */
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type OgImage = { url: string; width?: number; height?: number };

/** Đổi đường dẫn tương đối thành URL tuyệt đối. */
export function absImg(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${API}${url}`;
}

/**
 * Trả về ảnh OG (kèm kích thước nếu đọc được). Luôn an toàn: lỗi đọc kích thước
 * thì vẫn trả URL để nền tảng tự xử lý; không có ảnh thì trả undefined.
 */
/** Kích thước OG chuẩn 1.91:1 — Facebook hiển thị ổn định mọi nền tảng. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Dựng thẻ OG 1200×630 từ ảnh gốc BẤT KỲ tỉ lệ nào: nền là chính ảnh đó phóng
 * to + làm mờ + tối nhẹ để phủ kín, ảnh gốc đặt trọn ở giữa (không cắt mất chi
 * tiết). Nhờ luôn đúng tỉ lệ chuẩn, Facebook hiển thị được cả ảnh dọc 9:16 lẫn
 * ảnh ngang 2:1.
 */
export async function composeOgCard(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const bg = await sharp(input)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
    .blur(26)
    .modulate({ brightness: 0.55 })
    .toBuffer();
  const fg = await sharp(input)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "inside" })
    .toBuffer();
  return sharp(bg)
    .composite([{ input: fg, gravity: "centre" }])
    .jpeg({ quality: 82 })
    .toBuffer();
}

export async function resolveOgImage(
  url: string | null | undefined,
): Promise<OgImage | undefined> {
  const abs = absImg(url);
  if (!abs) return undefined;
  try {
    // Cache 1 ngày để không tải lại ảnh ở mỗi lần render trang.
    const res = await fetch(abs, { next: { revalidate: 86400 } });
    if (!res.ok) return { url: abs };
    const buf = Buffer.from(await res.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();
    if (meta.width && meta.height) {
      return { url: abs, width: meta.width, height: meta.height };
    }
    return { url: abs };
  } catch {
    return { url: abs };
  }
}
