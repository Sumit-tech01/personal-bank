"use client";

import React from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "Filter",
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-line bg-white p-1.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`flex h-10 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-ink-secondary hover:bg-canvas"
            }`}
          >
            {option.label}
            {typeof option.count === "number" && option.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  active ? "bg-white/20 text-white" : "bg-canvas text-ink-secondary"
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
