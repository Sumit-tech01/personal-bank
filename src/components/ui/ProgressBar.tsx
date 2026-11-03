import React from "react";

interface ProgressBarProps {
  value: number;
  tone?: "brand" | "positive" | "negative" | "amber" | "sky";
  size?: "sm" | "md";
}

const tones = {
  brand: "bg-brand-600",
  positive: "bg-positive",
  negative: "bg-negative",
  amber: "bg-amber",
  sky: "bg-sky",
};

export default function ProgressBar({ value, tone = "brand", size = "sm" }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-canvas ${size === "sm" ? "h-1.5" : "h-2.5"}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
