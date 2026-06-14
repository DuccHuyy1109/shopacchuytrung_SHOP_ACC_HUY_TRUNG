"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "./icons";

export type SelectOption = {
  value: string;
  label: string;
};

export default function SelectField({
  value,
  options,
  onChange,
  placeholder = "Chọn",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`field flex items-center justify-between gap-3 text-left ${
          open ? "border-fire-500 shadow-[0_0_0_3px_rgba(255,106,0,0.18)]" : ""
        }`}
      >
        <span className={selected ? "text-zinc-100" : "text-zinc-500"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-fire-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[90] mt-2 overflow-hidden rounded-lg border border-fire-500/35 bg-ink-950 shadow-[0_18px_42px_-20px_rgba(255,77,0,0.85)] animate-rise">
          <div className="max-h-64 overflow-auto py-1">
            {options.map((option, idx) => {
              const active = option.value === value;
              return (
                <button
                  key={`select-option-${option.value}-${idx}`}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-fire-500/16 text-fire-300"
                      : "text-zinc-200 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span>{option.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-fire-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
