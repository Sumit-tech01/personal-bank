"use client";

import React from "react";

interface QuickActionButtonProps {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "brand" | "positive" | "negative" | "sky" | "amber";
}

const tones = {
  brand: "bg-brand-50 text-brand-700",
  positive: "bg-positive-light text-positive",
  negative: "bg-negative-light text-negative",
  sky: "bg-sky-light text-sky",
  amber: "bg-amber-light text-amber",
};

export default function QuickActionButton({
  label,
  hint,
  icon,
  onClick,
  tone = "brand",
}: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[68px] w-full flex-col items-start justify-center rounded-2xl border border-line bg-white p-3 text-left transition active:scale-[0.98]"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </span>
      <span className="mt-1.5 block w-full truncate text-[12px] font-semibold text-ink">
        {label}
      </span>
      {hint && (
        <span className="block w-full truncate text-[10px] text-ink-muted">{hint}</span>
      )}
    </button>
  );
}
