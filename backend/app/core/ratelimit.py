"""Giới hạn số lần đăng nhập sai theo IP (chống dò mật khẩu).

In-memory, sliding window đơn giản — đủ cho quy mô shop (1 tiến trình). Nếu
chạy nhiều worker/instance thì nên thay bằng Redis.
"""

import time

# Cấu hình: tối đa 10 lần SAI trong cửa sổ, vượt thì khóa hết cửa sổ.
MAX_ATTEMPTS = 10
WINDOW_SECONDS = 15 * 60  # 15 phút

# ip -> danh sách timestamp các lần đăng nhập SAI gần đây.
_failures: dict[str, list[float]] = {}


def _prune(ip: str, now: float) -> list[float]:
    items = [t for t in _failures.get(ip, []) if now - t < WINDOW_SECONDS]
    if items:
        _failures[ip] = items
    else:
        _failures.pop(ip, None)
    return items


def retry_after(ip: str) -> int:
    """Số giây phải chờ nếu IP đang bị khóa; 0 nếu được phép thử."""
    now = time.time()
    items = _prune(ip, now)
    if len(items) < MAX_ATTEMPTS:
        return 0
    # Khóa đến khi lần sai cũ nhất rời khỏi cửa sổ.
    return max(1, int(WINDOW_SECONDS - (now - items[0])))


def record_failure(ip: str) -> None:
    _failures.setdefault(ip, []).append(time.time())


def reset(ip: str) -> None:
    _failures.pop(ip, None)
