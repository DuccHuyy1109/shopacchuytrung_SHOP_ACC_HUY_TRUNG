"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ô nhập dạng text + gợi ý: người dùng gõ chữ, hệ thống gợi ý các từ trong
 * danh sách (vd: Mô tả tài khoản). Chọn gợi ý sẽ chèn vào dưới dạng text, các
 * mục cách nhau bằng dấu phẩy. KHÔNG hiển thị thẻ/dấu x, KHÔNG thêm từ vào cấu
 * hình. Người dùng vẫn có thể tự gõ từ bất kỳ.
 */
export default function TagTextInput({
  value,
  onChange,
  suggestions,
  placeholder = "Nhập để gợi ý...",
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const parts = value.split(",");
  const segment = parts[parts.length - 1].trim().toLowerCase();
  const completed = parts
    .slice(0, -1)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(segment))
    .filter((s) => !completed.includes(s.toLowerCase()))
    .slice(0, 5);

  function pick(s: string) {
    const before = parts
      .slice(0, -1)
      .map((p) => p.trim())
      .filter(Boolean);
    onChange([...before, s].join(", ") + ", ");
    setOpen(true);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className="field"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full surface shadow-2xl py-1.5 text-sm max-h-60 overflow-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pick(s)}
              className="block w-full text-left px-3 py-2 text-zinc-300 hover:bg-fire-500/10 hover:text-white transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
