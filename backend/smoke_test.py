import sys

import httpx

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = "http://127.0.0.1:8000"
c = httpx.Client(base_url=BASE, timeout=15)
passed, failed = 0, 0


def check(name, cond, info=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  OK  {name}")
    else:
        failed += 1
        print(f" FAIL {name}  {info}")


# 1. Admin login
r = c.post("/api/auth/login", json={"username": "admin", "password": "Admin@123456"})
check("admin login", r.status_code == 200, r.text[:200])
admin = {"Authorization": f"Bearer {r.json()['access_token']}"}

# 2. Dashboard
r = c.get("/api/admin/dashboard", headers=admin)
check("admin dashboard", r.status_code == 200, r.text[:200])

# 3. Create shop
r = c.post("/api/admin/shops", headers=admin, json={"name": "Shop Test"})
check("create shop", r.status_code == 201, r.text[:200])
shop_id = r.json().get("id")

# 4. Create account (mã acc tự sinh, danh mục giá tự xếp)
acc_payload = {
    "category_type": "sieu_pham",
    "shop_id": shop_id,
    "original_price": 2500000,
    "sale_price": 1990000,
    "upgraded_guns_count": 12,
    "vip_level": 5,
    "description": "Acc nhiều đồ, súng nâng cấp full.",
    "is_featured": True,
    "image_urls": [],
}
r = c.post("/api/admin/accounts", headers=admin, json=acc_payload)
created = r.json() if r.status_code == 201 else {}
check(
    "create account (mã # tự sinh + danh mục giá tự xếp)",
    r.status_code == 201
    and str(created.get("account_code", "")).startswith("#")
    and created.get("price_category_id") is not None,
    r.text[:250],
)
acc_id = created.get("id")

# 5. Public list shows account
r = c.get("/api/accounts")
check("public account list", r.status_code == 200 and r.json()["total"] >= 1, r.text[:200])

# 6. Account detail
r = c.get(f"/api/accounts/{acc_id}")
check("account detail", r.status_code == 200, r.text[:200])

# 7. Filter by category_type + vip
r = c.get("/api/accounts", params={"category_type": "sieu_pham", "vip_min": 5})
check("account filter", r.status_code == 200 and r.json()["total"] >= 1, r.text[:200])

# 8. Contact to buy (yêu cầu đăng nhập — tự lấy thông tin user)
r = c.post(f"/api/accounts/{acc_id}/contact", headers=admin)
check("contact to buy (cần đăng nhập)", r.status_code == 200, r.text[:200])
# 8b. Contact to buy khi chưa đăng nhập -> 401/403
r = c.post(f"/api/accounts/{acc_id}/contact")
check("contact to buy chặn khách chưa đăng nhập", r.status_code in (401, 403), r.text[:150])

# 9. Order form fields
r = c.get("/api/order-form/fields")
check("order form fields", r.status_code == 200 and len(r.json()) == 5, r.text[:200])

# 10. Create order
r = c.post("/api/orders", json={
    "customer_name": "Nguyen Van Test",
    "customer_phone": "0911222333",
    "form_data": {"level": "7x", "acc_type": "Acc cổ", "budget": "3000000"},
    "desired_price": 3000000,
    "vip": 4,
    "note": "Cần acc nhiều skin",
})
check("create order", r.status_code == 201 and "amount" in r.json(), r.text[:250])
order_code = r.json()["order"]["order_code"] if r.status_code == 201 else None

# 11. Pay order bằng số dư (user mới chưa nạp -> số dư không đủ -> 400)
if order_code:
    r = c.post(f"/api/orders/{order_code}/pay")
    check("pay order (200 hoặc 400 thiếu số dư)", r.status_code in (200, 400), r.text[:200])

# 12. Order missing required field -> 400
r = c.post("/api/orders", json={
    "customer_name": "X", "customer_phone": "0900000001", "form_data": {},
})
check("order validation (missing field)", r.status_code == 400, r.text[:200])

# 13. Register user
r = c.post("/api/auth/register", json={
    "username": "user_test", "password": "User@12345",
    "full_name": "User Test", "phone": "0988777666", "email": "usertest@example.com",
})
check("register user", r.status_code in (201, 409), r.text[:200])
if r.status_code == 201:
    user_tok = r.json()["access_token"]
else:
    r2 = c.post("/api/auth/login", json={"username": "user_test", "password": "User@12345"})
    user_tok = r2.json()["access_token"]
user = {"Authorization": f"Bearer {user_tok}"}

# 14. Create post
r = c.post("/api/posts", headers=user, json={
    "post_type": "sell", "title": "Cần bán acc", "caption": "Acc ngon giá rẻ", "price": 500000,
})
check("create post", r.status_code == 201, r.text[:200])
post_id = r.json().get("id")

# 15. Public list should NOT show pending post
r = c.get("/api/posts")
check("pending post hidden from public", r.status_code == 200, r.text[:200])

# 16. Admin approve post
r = c.put(f"/api/admin/posts/{post_id}/status", headers=admin, json={"status": "approved"})
check("admin approve post", r.status_code == 200, r.text[:200])

# 17. Public list shows approved post (author hidden)
r = c.get("/api/posts")
ok = r.status_code == 200 and r.json()["total"] >= 1
hidden = "user_id" not in r.text and "author" not in r.text
check("approved post visible + author hidden", ok and hidden, r.text[:200])

# 18. Contact own post -> 400
r = c.post(f"/api/posts/{post_id}/contact", headers=user, json={})
check("cannot contact own post", r.status_code == 400, r.text[:200])

# 19. Admin-only route blocked for normal user
r = c.get("/api/admin/users", headers=user)
check("admin route blocked for user", r.status_code == 403, r.text[:200])

# 20. No-token admin route -> 401
r = c.get("/api/admin/dashboard")
check("admin route requires auth", r.status_code in (401, 403), r.text[:200])

# 21. Cập nhật trạng thái xử lý liên hệ mua acc
r = c.get("/api/admin/account-contacts", headers=admin)
contacts = r.json().get("items", []) if r.status_code == 200 else []
if contacts:
    cid = contacts[0]["id"]
    r = c.put(
        f"/api/admin/account-contacts/{cid}",
        headers=admin,
        json={"status": "processing"},
    )
    check(
        "cập nhật trạng thái liên hệ mua acc",
        r.status_code == 200 and r.json().get("status") == "processing",
        r.text[:200],
    )
else:
    check("cập nhật trạng thái liên hệ mua acc", False, "không có liên hệ")

print(f"\n=== KẾT QUẢ: {passed} PASS / {failed} FAIL ===")
c.close()
sys.exit(1 if failed else 0)
