import logging

import httpx

from app.config import settings

logger = logging.getLogger("telegram")

_API = "https://api.telegram.org"


def send_message(text: str) -> bool:
    """Gửi thông báo về Telegram của admin (đồng bộ — gửi xong mới trả về).

    Đồng bộ để chạy được trên serverless (Vercel đóng băng tiến trình ngay
    sau khi trả response, background task sẽ không kịp chạy).
    Trả về True nếu gửi thành công. Không raise lỗi để tránh làm
    hỏng luồng nghiệp vụ chính (order/contact vẫn được lưu).
    """
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID
    if not token or not chat_id:
        logger.warning("Telegram chưa được cấu hình — bỏ qua gửi thông báo.")
        return False

    url = f"{_API}/bot{token}/sendMessage"
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )
        if resp.status_code != 200:
            logger.error("Telegram trả về lỗi %s: %s", resp.status_code, resp.text)
            return False
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Không gửi được Telegram: %s", exc)
        return False
