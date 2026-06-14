"""Gửi thông báo về Telegram cho admin.

Các hàm chạy ĐỒNG BỘ ngay trong request (trước khi trả response) để chắc
chắn gửi được trên serverless — Vercel đóng băng tiến trình ngay sau khi
trả response nên background task có thể không bao giờ chạy.
Mỗi hàm tự mở session DB riêng, đánh dấu cờ telegram_sent sau khi gửi
thành công, và không raise lỗi để không hỏng luồng nghiệp vụ chính.
"""

from app.database import SessionLocal
from app.models import (
    Account,
    AccountContact,
    DepositRequest,
    Order,
    Post,
    PostContact,
    User,
)
from app.services.telegram import send_message


def _fmt_price(value) -> str:
    try:
        return f"{int(value):,} đ".replace(",", ".")
    except (TypeError, ValueError):
        return "—"


def notify_account_contact(contact_id: int) -> None:
    """Thông báo khi khách nhấn 'Liên hệ mua' một acc."""
    db = SessionLocal()
    try:
        c = db.get(AccountContact, contact_id)
        if not c:
            return
        acc = c.account
        lines = [
            "🛒 <b>KHÁCH LIÊN HỆ MUA ACC</b>",
            f"• Mã acc: <b>{acc.account_code if acc else '?'}</b>",
        ]
        if acc:
            lines.append(f"• Giá bán: {_fmt_price(acc.sale_price)}")
        lines.append(f"• Khách: {c.customer_name or '(khách vãng lai)'}")
        lines.append(f"• SĐT: {c.customer_phone or '—'}")
        if c.user:
            lines.append(f"• Tài khoản: {c.user.username} (ID {c.user.id})")
        if send_message("\n".join(lines)):
            c.telegram_sent = True
            db.commit()
    finally:
        db.close()


def notify_order(order_id: int) -> None:
    """Thông báo khi có phiếu Order Acc đã chuyển khoản."""
    db = SessionLocal()
    try:
        o = db.get(Order, order_id)
        if not o:
            return
        lines = [
            "📥 <b>ORDER ACC — KHÁCH BÁO ĐÃ CK (CHỜ XÁC NHẬN)</b>",
            f"• Mã phiếu: <b>{o.order_code}</b>",
            f"• Khách: {o.customer_name}",
            f"• SĐT (Zalo): {o.customer_phone}",
        ]
        if o.customer_email:
            lines.append(f"• Email: {o.customer_email}")
        if o.desired_price:
            lines.append(f"• Giá mong muốn: {_fmt_price(o.desired_price)}")
        if o.vip:
            lines.append(f"• VIP: {o.vip}")
        if o.amount:
            lines.append(f"• Tiền cọc: {_fmt_price(o.amount)}")
        if o.form_data:
            lines.append("• Chi tiết yêu cầu:")
            for key, value in o.form_data.items():
                if isinstance(value, list):
                    value = ", ".join(str(x) for x in value)
                lines.append(f"   - {key}: {value}")
        if o.note:
            lines.append(f"• Ghi chú: {o.note}")
        if o.user:
            lines.append(f"• Tài khoản: {o.user.username} (ID {o.user.id})")
        if send_message("\n".join(lines)):
            o.telegram_sent = True
            db.commit()
    finally:
        db.close()


def notify_account_purchase(account_id: int, user_id: int, amount: float) -> None:
    """Thông báo khi khách MUA ACC trực tiếp bằng số dư ví (tiền đã trừ)."""
    db = SessionLocal()
    try:
        acc = db.get(Account, account_id)
        u = db.get(User, user_id)
        lines = [
            "💳 <b>KHÁCH MUA ACC — ĐÃ THANH TOÁN BẰNG VÍ</b>",
            f"• Mã acc: <b>{acc.account_code if acc else '?'}</b>",
            f"• Số tiền đã trừ: {_fmt_price(amount)}",
        ]
        if u:
            lines.append(
                f"• Khách: {u.full_name or u.username} (@{u.username}, ID {u.id})"
            )
            lines.append(f"• SĐT: {u.phone or '—'}")
            lines.append(f"• Số dư còn lại: {_fmt_price(u.balance)}")
        lines.append("→ Liên hệ giao acc cho khách sớm nhé!")
        send_message("\n".join(lines))
    finally:
        db.close()


def notify_deposit(deposit_id: int) -> None:
    """Thông báo khi khách gửi yêu cầu nạp tiền (đã CK, chờ admin xác nhận)."""
    db = SessionLocal()
    try:
        d = db.get(DepositRequest, deposit_id)
        if not d:
            return
        lines = [
            "💰 <b>YÊU CẦU NẠP TIỀN — CHỜ XÁC NHẬN</b>",
            f"• Mã: <b>{d.deposit_code}</b>",
            f"• Số tiền: {_fmt_price(d.amount)}",
            f"• Nội dung CK: <b>{d.transfer_content}</b>",
        ]
        if d.user:
            lines.append(
                f"• Tài khoản: {d.user.full_name or d.user.username} "
                f"(@{d.user.username}, ID {d.user.id})"
            )
            lines.append(f"• SĐT: {d.user.phone or '—'}")
        if send_message("\n".join(lines)):
            d.telegram_sent = True
            db.commit()
    finally:
        db.close()


def notify_post_contact(post_contact_id: int) -> None:
    """Thông báo khi 2 người dùng liên hệ mua/bán qua bài đăng.

    Admin nhận đầy đủ danh tính ai mua - ai bán (vốn ẩn với người dùng).
    """
    db = SessionLocal()
    try:
        pc = db.get(PostContact, post_contact_id)
        if not pc:
            return
        post: Post = pc.post
        poster = pc.poster_user
        interested = pc.interested_user

        if pc.interested_role == "buyer":
            buyer, seller = interested, poster
        else:
            buyer, seller = poster, interested

        def who(u) -> str:
            if not u:
                return "—"
            return (
                f"{u.full_name or u.username} | @{u.username} | "
                f"SĐT {u.phone or '—'} | {u.email or '—'} (ID {u.id})"
            )

        lines = [
            "🤝 <b>LIÊN HỆ QUA BÀI ĐĂNG</b>",
            f"• Bài đăng #{post.id} ({'CẦN MUA' if post.post_type == 'buy' else 'CẦN BÁN'})",
            f"• Tiêu đề: {post.title or '—'}",
            f"• Nội dung: {post.caption or '—'}",
            f"• Giá: {_fmt_price(post.price)}",
            "",
            f"👤 NGƯỜI MUA: {who(buyer)}",
            f"👤 NGƯỜI BÁN: {who(seller)}",
        ]
        if send_message("\n".join(lines)):
            pc.telegram_sent = True
            db.commit()
    finally:
        db.close()
