"use client";

import { useCallback, useState } from "react";

/** Quản lý tập id đang tích chọn trong bảng admin (cho bulk delete). */
export function useSelection<T extends string | number = number>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Bật/tắt tất cả id truyền vào (thường là các dòng trên trang hiện tại). */
  const toggleAll = useCallback((ids: T[]) => {
    setSelected((prev) => {
      const allOn = ids.length > 0 && ids.every((i) => prev.has(i));
      return allOn ? new Set<T>() : new Set<T>(ids);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set<T>()), []);
  const isSelected = useCallback((id: T) => selected.has(id), [selected]);

  return { selected, toggle, toggleAll, clear, isSelected, count: selected.size };
}
