"""Cập nhật nội dung 9 bài Hướng dẫn cho Shop Acc Huy Trung.

Chạy:  python update_guides_content.py

Script chỉ thay phần CHỮ của từng bài (tra theo slug). Ảnh đang có trong bài
được GIỮ NGUYÊN: script tự trích các token ảnh ![](...) trong nội dung cũ rồi
gắn lại xuống cuối bài (mỗi ảnh 1 dòng để slideshow đầu trang nhận đúng).

Cú pháp định dạng dùng trong nội dung (khớp với renderGuideContent ở frontend):
  "# "  -> tiêu đề lớn (gradient lửa)      "## " -> tiêu đề vừa (trắng)
  **đậm**   *nghiêng*   __gạch chân__   ==tô lửa==   ![](url) -> ảnh
"""

import re
import sys

# In được tiếng Việt trên console Windows.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

from app.database import SessionLocal
from app.models import Guide

IMG_TOKEN_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")


# Nội dung mới — tra theo slug của từng bài (slug giữ nguyên, không đổi tiêu đề).
CONTENT: dict[str, str] = {
    # 1) Trang giới thiệu / uy tín
    "shop-uy-tin-va-uoc-nhieu-anh-em-tin-tuong": """# Shop Acc Huy Trung — Acc khó mà lại có!

Chào anh em! Cảm ơn anh em đã ghé Shop Acc Huy Trung. Shop chuyên **mua bán acc Free Fire uy tín**, hoạt động minh bạch và đặt chữ tín lên hàng đầu — bởi với shop, ==giữ được lòng tin của anh em mới là tài sản lớn nhất==.

## Vì sao anh em yên tâm chọn shop?

**Acc rõ ràng, đúng mô tả.** Mỗi acc đều có mã số riêng, hình ảnh thật, thông tin VIP, số súng nâng cấp và mô tả chi tiết — anh em xem gì là nhận đúng cái đó.

**Giao dịch rõ ràng, có hỗ trợ trực tiếp.** Với mỗi acc, anh em bấm nút **Liên hệ mua acc này** để shop tiếp nhận và hỗ trợ chốt giao dịch qua Zalo/Facebook. Trong thời gian tới, shop dự kiến mở thêm tính năng **mua bằng số dư trong ví** ngay trên web để anh em thanh toán nhanh và chủ động hơn.

**Hỗ trợ nhiệt tình.** Cần tư vấn hay đã chọn được acc ưng ý, anh em cứ nhắn Zalo/Facebook của shop ở cuối trang — shop phản hồi nhanh và hỗ trợ anh em tận tâm.

**Bảo hành khi sang chính chủ.** Acc mua tại shop được **hỗ trợ đổi sang chính chủ**, và shop **bảo hành tài khoản trong suốt quá trình sang mail xác thực chính chủ** để anh em an tâm sở hữu acc.

## Tại shop có gì cho anh em?

Anh em có thể **mua acc có sẵn** trong các mục Acc cổ, Acc siêu phẩm, Acc theo giá; **Order acc theo yêu cầu** khi chưa tìm được acc ưng; **Định giá acc** để biết giá trị tài khoản; hoặc **Đăng bài** mua/bán acc ngay trên web.

Mỗi mục đều có bài hướng dẫn riêng trong trang này — anh em đọc qua một lượt là nắm được cách sử dụng nha!

==Acc khó mà lại có — cần gì cứ nhắn shop, shop luôn sẵn sàng hỗ trợ anh em!==""",

    # 2) Liên hệ shop
    "huong-dan-lien-he-shop": """# Cần hỗ trợ? Shop luôn sẵn sàng

Anh em cần tư vấn, mua acc, bán acc hay hỗ trợ trong giao dịch? Hãy liên hệ shop qua các kênh chính thức dưới đây nhé!

## Các kênh liên hệ chính thức

**Zalo:** Nhắn trực tiếp để được tư vấn nhanh nhất — báo acc, chốt giá và hỗ trợ sang tên chính chủ.

**Facebook:** Inbox fanpage của shop để xem thêm đánh giá và acc mới về.

**Nhóm Zalo cộng đồng:** Nơi shop cập nhật acc mới, ưu đãi và các thông báo dành cho anh em.

Các nút liên hệ này nằm ở **cuối trang (Footer)**, và cũng hiện ra khi anh em bấm **Liên hệ mua acc này** ở mỗi acc.

## Liên hệ thế nào cho nhanh?

**1.** Khi xem một acc, bấm **Liên hệ mua acc này** — shop tiếp nhận đúng mã acc đó và hỗ trợ anh em ngay về acc mình quan tâm.

**2.** Khi nhắn tin, anh em gửi kèm **mã acc (MS)** để shop tra cứu và phản hồi nhanh hơn.

**3.** Để dùng tính năng order hoặc liên hệ mua, anh em nhớ **cập nhật số điện thoại (Zalo)** trong hồ sơ — shop sẽ chủ động liên hệ lại khi có acc phù hợp.

==Shop phản hồi nhanh và hỗ trợ anh em nhiệt tình — có thắc mắc gì cứ nhắn nhé!==""",

    # 3) Thu mua acc
    "huong-dan-thu-mua-acc": """# Shop thu mua acc — giá tốt, thủ tục nhanh gọn

Anh em muốn bán lại acc Free Fire? Shop nhận **thu mua acc với giá tốt, cạnh tranh**, thủ tục gọn gàng và thanh toán nhanh chóng. Anh em làm theo các bước sau nhé!

## Bước 1 · Định giá để tham khảo

Vào mục **Định giá acc**, chọn các đặc điểm và súng nâng cấp của acc để có ngay mức giá tham khảo. Bước này giúp anh em nắm được giá trị acc của mình trước khi báo shop.

## Bước 2 · Liên hệ báo acc

Nhắn **Zalo/Facebook** của shop (nút liên hệ ở cuối trang), gửi kèm **thông tin và hình ảnh acc**: VIP, level, số súng nâng cấp, trang phục, kim cương... Thông tin càng đầy đủ, shop báo giá càng chính xác.

## Bước 3 · Shop kiểm tra & báo giá

Shop kiểm tra acc rồi báo lại mức giá thu mua. Hai bên thống nhất giá là tiến hành giao dịch — minh bạch, rõ ràng.

## Bước 4 · Bàn giao & nhận tiền

Anh em bàn giao thông tin acc cho shop, shop **thanh toán qua chuyển khoản** ngay sau khi nhận acc. An toàn và nhanh chóng cho cả hai bên.

## Cách khác: Đăng bài cần bán

Anh em cũng có thể vào mục **Đăng bài**, chọn **Cần bán acc** để rao bán công khai. Bài đăng được **ẩn danh tính** và **kiểm duyệt trước khi hiển thị** — vừa an toàn, vừa tiếp cận được nhiều người mua.

==Acc đẹp, acc cổ, acc VIP — anh em cứ liên hệ shop để được báo giá tốt nhất!==""",

    # 4) Mua acc
    "huong-dan-mua-acc": """# Mua acc chỉ với vài bước

Mua acc tại Shop Huy Trung rất đơn giản — anh em làm theo các bước dưới đây nhé!

## Bước 1 · Tìm acc ưng ý

Lướt các mục **Acc cổ**, **Acc siêu phẩm**, **Acc theo giá** trên menu, hoặc dùng **ô tìm kiếm** để tìm theo mã acc, VIP hoặc mô tả. Bấm vào acc để xem chi tiết: hình ảnh, VIP, số súng nâng cấp và mô tả đầy đủ.

## Bước 2 · Đăng nhập & cập nhật hồ sơ

Anh em **đăng nhập** (chưa có tài khoản thì đăng ký nhanh), sau đó vào hồ sơ **cập nhật số điện thoại (Zalo)**. Đây là số shop dùng để liên hệ lại và hỗ trợ anh em trong quá trình nhận acc.

## Bước 3 · Liên hệ mua

Tại trang acc, bấm **Liên hệ mua acc này**. Shop tiếp nhận đúng mã acc anh em quan tâm và hiện ngay kênh **Zalo/Facebook** để hai bên trao đổi, chốt giao dịch.

## Bước 4 · Thanh toán & nhận acc

Anh em thanh toán theo hướng dẫn của shop. Sau khi hoàn tất, shop bàn giao toàn bộ thông tin acc, **hỗ trợ anh em đổi sang chính chủ** và **bảo hành tài khoản trong quá trình sang mail xác thực chính chủ**.

## Mua bằng số dư trong ví (sắp có)

Trong thời gian tới, shop dự kiến mở tính năng **Mua ngay bằng số dư**. Khi tính năng được bật, anh em chỉ cần bấm **Mua ngay** để thanh toán trực tiếp bằng số dư trong ví; acc được giữ riêng cho anh em ngay lập tức, sau đó anh em nhắn shop qua Zalo/Facebook để nhận tài khoản.

==Acc rõ ràng, đúng mô tả, giao dịch an toàn — anh em cứ yên tâm chọn acc mình thích!==""",

    # 5) Order acc
    "huong-dan-order-acc": """# Order acc — shop tìm acc đúng ý anh em

Chưa tìm được acc ưng ý? Hãy để shop tìm giúp anh em! Order acc là cách anh em ==đặt acc theo đúng tiêu chí== và shop sẽ tìm đúng acc đó.

## Bước 1 · Vào mục Order acc

Trên menu chọn **Order acc**. Anh em cần **đăng nhập** và đã **cập nhật số điện thoại (Zalo)** trong hồ sơ để shop liên hệ lại được.

## Bước 2 · Điền tiêu chí acc

Điền form yêu cầu: **Level**, **Kiểu acc** (chọn các đặc điểm mong muốn), **Giá mong muốn**, **VIP** và **Yêu cầu khác**. Anh em điền càng chi tiết, shop càng tìm trúng acc mong muốn. Ngay khi điền, web sẽ **gợi ý các acc đang có** khớp tiêu chí để anh em tham khảo nhanh.

## Bước 3 · Gửi yêu cầu & thanh toán phí order

Bấm **Gửi yêu cầu order**. Phí order sẽ được **trừ vào số dư trong ví** của anh em (nếu ví chưa đủ, anh em nạp thêm theo bài *Hướng dẫn nạp tiền*). Khoản phí này giúp shop ưu tiên tìm và giữ chỗ cho yêu cầu của anh em.

## Bước 4 · Shop tìm acc & liên hệ lại

Sau khi gửi, shop bắt đầu tìm acc phù hợp và **chủ động liên hệ** với anh em qua Zalo/Facebook khi có acc hợp ý. Anh em có thể theo dõi trạng thái đơn ở mục **Đơn order của tôi** bất cứ lúc nào.

==Anh em mô tả acc mong muốn — phần tìm acc cứ để shop lo!==""",

    # 6) Định giá acc
    "huong-dan-inh-gia-acc": """# Acc của anh em đáng giá bao nhiêu?

Anh em muốn biết acc của mình (hoặc acc định mua) đáng giá bao nhiêu? Hãy dùng công cụ **Định giá acc** của shop để có ngay mức giá tham khảo theo thị trường nhé!

## Bước 1 · Vào mục Định giá acc

Chọn **Định giá acc** trên menu. Công cụ sử dụng được ngay, không cần thao tác phức tạp.

## Bước 2 · Chọn đặc điểm acc

Ở ô **Đặc điểm acc**, gõ và chọn các đặc điểm mà acc có: ví dụ Acc cổ, Full nhân vật, Nhiều skin súng, Pet đầy đủ... Anh em chọn càng nhiều đặc điểm đúng thì giá càng sát thực tế.

## Bước 3 · Thêm súng nâng cấp

Ở ô **Súng nâng cấp**, bấm dấu **+** để chọn level súng và **số lượng** tương ứng. Súng nâng cấp là yếu tố ảnh hưởng nhiều đến giá trị acc.

## Bước 4 · Xem kết quả & acc gợi ý

Bấm **Bắt đầu định giá ngay** để xem **mức giá ước tính**. Shop còn **gợi ý các acc đang bán cùng tầm giá** để anh em dễ so sánh và lựa chọn.

*Lưu ý: đây là mức giá tham khảo dựa trên các đặc điểm anh em chọn. Nếu shop có áp dụng phí định giá, hệ thống sẽ hiển thị phí mỗi lượt (trừ vào số dư ví) trước khi tính. Để được định giá chính xác nhất khi mua hoặc bán, anh em vui lòng liên hệ shop kèm hình ảnh acc.*

==Biết giá trước khi mua bán — anh em luôn ở thế chủ động!==""",

    # 7) Đăng bài
    "huong-dan-ang-bai-tim-hoac-mua-acc": """# Đăng bài mua / bán acc ngay trên web

Anh em có thể tự **đăng bài** trên web để bán acc của mình hoặc tìm acc đang cần. Bài đăng được **ẩn danh tính** và **kiểm duyệt trước khi hiển thị** — an toàn cho cả người mua lẫn người bán.

## Bước 1 · Vào mục Đăng bài

Chọn **Đăng bài** trên menu. Anh em cần **đăng nhập** và đã **cập nhật số điện thoại (Zalo)** trong hồ sơ để shop liên hệ khi cần.

## Bước 2 · Chọn loại bài

Chọn **Cần bán acc** nếu anh em muốn bán, hoặc **Cần mua / tìm acc** nếu đang tìm acc theo nhu cầu.

## Bước 3 · Điền thông tin & thêm ảnh

Nhập **tiêu đề**, **giá** (để trống nếu muốn thỏa thuận) và **mô tả chi tiết** acc. Anh em đính kèm **tối đa 5 ảnh** rõ nét để bài đăng thu hút và uy tín hơn.

## Bước 4 · Đăng bài & chờ duyệt

Bấm **Đăng bài**. Bài sẽ được shop **kiểm duyệt** rồi mới hiển thị công khai (để lọc bài rác, tránh lừa đảo) — đây là bước bảo vệ anh em. Nếu shop có áp dụng phí đăng bài, hệ thống sẽ hiển thị bước thanh toán phí (trừ vào số dư ví) trước khi đăng. Anh em quản lý bài của mình tại mục **Bài đăng của tôi**.

==Đăng bài an toàn, ẩn danh và được kiểm duyệt — anh em mua bán cứ yên tâm!==""",

    # 8) Nạp tiền
    "huong-dan-nap-tien": """# Nạp tiền vào ví — nhanh chóng qua mã QR

Số dư trong ví dùng để thanh toán các dịch vụ của shop (ví dụ phí order, và sắp tới là mua acc bằng số dư). Anh em nạp tiền nhanh chóng qua **mã QR ngân hàng** theo các bước sau nhé!

## Bước 1 · Mở trang nạp tiền

Đăng nhập, bấm vào **số dư ví** ở góc tài khoản (hoặc nút **Nạp tiền ngay** xuất hiện khi thanh toán) để mở trang nạp tiền.

## Bước 2 · Chọn số tiền

Chọn nhanh một mức có sẵn hoặc tự nhập số tiền (**tối thiểu 10.000đ**), rồi bấm **Tiếp tục chuyển khoản**.

## Bước 3 · Chuyển khoản theo mã QR

Mở app ngân hàng và **quét mã QR** hiện ra. Anh em vui lòng ==chuyển đúng số tiền và đúng NỘI DUNG CHUYỂN KHOẢN== mà hệ thống cấp, để shop đối soát và cộng tiền chính xác.

## Bước 4 · Gửi ảnh bill & xác nhận

Chụp lại **biên lai chuyển khoản (bill)**, bấm chọn ảnh để đính kèm rồi bấm **Tôi đã chuyển khoản**. Bước này bắt buộc để shop xác nhận giao dịch của anh em.

## Bước 5 · Chờ cộng tiền

Shop kiểm tra và **cộng tiền vào ví** ngay sau khi đối soát. Anh em xem lại lịch sử nạp và số dư tại mục **Tài chính** trong tài khoản.

==Nạp đúng nội dung và đính kèm bill đầy đủ — tiền vào ví nhanh chóng, an toàn!==""",

    # 9) Bảo mật & bảo hành
    "huong-dan-bao-mat-va-bao-hanh": """# Bảo mật & bảo hành acc

Khi mua acc tại shop, anh em được **hỗ trợ đổi sang chính chủ** để sở hữu acc một cách an toàn. Anh em đọc kỹ phần này để bảo vệ tài khoản của mình nhé!

## Sau khi nhận acc — đổi thông tin ngay

Để acc thật sự thuộc về anh em, hãy lần lượt:

**1.** Đổi **mật khẩu** đăng nhập sang mật khẩu riêng của anh em.

**2.** Gỡ liên kết cũ và **liên kết lại** với tài khoản mạng xã hội / Google của anh em.

**3.** **Sang email xác thực** chính chủ — đây là bước quan trọng nhất để khóa chặt acc, người khác không thể lấy lại.

Shop sẽ **hỗ trợ anh em từng bước** trong quá trình đổi và sang tên, anh em cứ làm theo hướng dẫn của shop là an tâm.

## Chính sách bảo hành của shop

**Shop bảo hành tài khoản trong suốt quá trình anh em sang mail xác thực chính chủ.** Đây là cam kết để anh em yên tâm nhận và hoàn tất sang tên acc.

==Lưu ý quan trọng về việc HỦY bảo hành:== Trong quá trình sang mail xác thực, nếu anh em **tự ý hủy mà không báo trước**, **tự ý bán lại acc mà không báo shop**, hoặc các trường hợp tương tự, thì shop **xin phép ngừng bảo hành và không chịu trách nhiệm** với acc đó.

## Lời nhắn từ shop

Mọi vướng mắc trong lúc đổi thông tin hay sang tên, anh em **liên hệ shop ngay** qua Zalo/Facebook — shop sẽ hỗ trợ anh em nhiệt tình cho tới khi hoàn tất.

==Sang chính chủ sớm để acc an toàn — shop luôn đồng hành cùng anh em!==""",
}


def build_content(new_text: str, old_content: str | None) -> str:
    """Ghép phần chữ mới với các ảnh đang có (giữ nguyên thứ tự ảnh cũ)."""
    images = IMG_TOKEN_RE.findall(old_content or "")
    body = new_text.strip()
    if images:
        body += "\n\n" + "\n\n".join(images)
    return body


def main() -> None:
    db = SessionLocal()
    updated, missing = 0, []
    try:
        for slug, text in CONTENT.items():
            guide = db.query(Guide).filter(Guide.slug == slug).first()
            if not guide:
                missing.append(slug)
                print(f"[!] Không tìm thấy bài có slug: {slug}")
                continue
            guide.content = build_content(text, guide.content)
            n_img = len(IMG_TOKEN_RE.findall(guide.content))
            print(f"[+] Cập nhật: {guide.title}  (giữ {n_img} ảnh)")
            updated += 1
        db.commit()
        print(f"\n=== HOÀN TẤT: cập nhật {updated}/{len(CONTENT)} bài ===")
        if missing:
            print(f"[!] Thiếu {len(missing)} slug: {', '.join(missing)}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
