import React from "react";

interface StatusPillProps {
  label: string;
  tone?: "positive" | "negative" | "amber" | "sky" | "neutral" | "brand";
  dot?: boolean;
}

const tones = {
  positive: "bg-positive-light text-positive",
  negative: "bg-negative-light text-negative",
  amber: "bg-amber-light text-amber",
  sky: "bg-sky-light text-sky",
  neutral: "bg-canvas text-ink-secondary",
  brand: "bg-brand-50 text-brand-700",
};

export default function StatusPill({ label, tone = "neutral", dot = false }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${tones[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
