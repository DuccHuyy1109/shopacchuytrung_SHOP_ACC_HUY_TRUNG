export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "saht_access_token";
const REFRESH_KEY = "saht_refresh_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Chuyển đường dẫn ảnh tương đối thành URL đầy đủ. */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isForm
        ? (body as FormData)
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch {
    // fetch ném khi mất mạng / server đang khởi động lại / bị chặn.
    throw new ApiError(
      "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      0,
    );
  }

  if (!res.ok) {
    let detail = "Đã có lỗi xảy ra, vui lòng thử lại";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
      else if (Array.isArray(data?.detail))
        detail = data.detail.map((d: { msg?: string }) => d.msg).join(", ");
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return null as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/**
 * Upload ảnh — tải LẦN LƯỢT từng ảnh (mỗi ảnh 1 request) để tránh payload
 * quá lớn gây fail. `folder` (mã acc) sẽ gom ảnh vào images/<mã acc>/.
 * `onProgress` báo tiến độ (done/total) nếu cần hiển thị.
 */
export async function uploadImages(
  files: File[],
  folder?: string,
  opts?: {
    watermark?: boolean;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<string[]> {
  const urls: string[] = [];
  const qs = new URLSearchParams();
  if (folder) qs.set("folder", folder);
  if (opts?.watermark) qs.set("watermark", "true");
  const path = `/api/uploads/image${qs.toString() ? `?${qs.toString()}` : ""}`;
  for (let i = 0; i < files.length; i++) {
    const form = new FormData();
    form.append("file", files[i]);
    const res = await request<{ url: string }>(path, {
      method: "POST",
      body: form,
    });
    urls.push(res.url);
    opts?.onProgress?.(i + 1, files.length);
  }
  return urls;
}
