"""Điểm vào (entrypoint) cho Vercel Python Serverless.

Vercel coi mỗi file trong thư mục `api/` là một serverless function. File này
chỉ nạp lại app FastAPI có sẵn ở `app/main.py` và để Vercel phục vụ nó (ASGI).
Thêm thư mục backend vào sys.path để `import app...` chạy được trên Vercel.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402

# Vercel tự nhận biến `app` (ASGI) và phục vụ. Không cần code gì thêm.
