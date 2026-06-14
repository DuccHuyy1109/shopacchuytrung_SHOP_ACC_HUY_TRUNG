import random
import string
import unicodedata
from datetime import datetime


def gen_order_code() -> str:
    """Sinh mã phiếu order, ví dụ: ORD250517-4821."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"ORD{datetime.now():%y%m%d}-{suffix}"


def gen_deposit_code() -> str:
    """Sinh mã yêu cầu nạp tiền nội bộ, ví dụ: NAP250610-4821."""
    suffix = "".join(random.choices(string.digits, k=4))
    return f"NAP{datetime.now():%y%m%d}-{suffix}"


def to_ascii_upper(text: str) -> str:
    """Bỏ dấu tiếng Việt, viết HOA, chỉ giữ chữ và số (cho nội dung CK)."""
    text = unicodedata.normalize("NFKD", text or "")
    text = text.encode("ascii", "ignore").decode("ascii")
    return "".join(ch for ch in text if ch.isalnum()).upper()


def make_deposit_transfer(account_name: str) -> tuple[str, str]:
    """Tạo nội dung chuyển khoản nạp tiền: NAPTIEN<TÊN><MÃ>.

    Tên bỏ dấu/viết hoa và cắt ngắn để vừa giới hạn nội dung CK; mã ngẫu nhiên
    5 ký tự HOA để admin đối soát. Trả về (transfer_content, code).
    """
    name = to_ascii_upper(account_name)[:10]
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"NAPTIEN{name}{code}", code


def gen_account_code() -> str:
    """Sinh mã acc: dấu # + 6 ký tự chữ HOA và số ngẫu nhiên, ví dụ: #48HA21."""
    chars = string.ascii_uppercase + string.digits
    return "#" + "".join(random.choices(chars, k=6))


def slugify(text: str) -> str:
    """Chuyển chuỗi tiếng Việt thành slug không dấu."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    out = []
    for ch in text:
        if ch.isalnum():
            out.append(ch)
        elif ch in " -_":
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-") or "muc"
