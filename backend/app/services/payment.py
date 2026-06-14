from urllib.parse import quote

_VIETQR_BASE = "https://img.vietqr.io/image"


def build_vietqr_url(
    bank_code: str,
    account_number: str,
    account_name: str,
    amount: int | float,
    description: str,
    template: str = "compact2",
) -> str:
    """Tạo URL ảnh QR chuyển khoản theo chuẩn VietQR (miễn phí, không cần key).

    Người dùng quét QR bằng app ngân hàng để chuyển khoản với số tiền và
    nội dung đã điền sẵn.
    """
    url = f"{_VIETQR_BASE}/{bank_code}-{account_number}-{template}.png"
    params = [
        f"amount={int(amount)}",
        f"addInfo={quote(description)}",
        f"accountName={quote(account_name)}",
    ]
    return f"{url}?{'&'.join(params)}"
