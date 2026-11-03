import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  sub?: string;
  tone?: "default" | "positive" | "negative" | "amber" | "brand" | "neutral";
  icon?: React.ReactNode;
}

const toneClasses = {
  default: "text-ink",
  neutral: "text-ink",
  positive: "text-positive",
  negative: "text-negative",
  amber: "text-amber",
  brand: "text-brand-700",
};

export default function StatCard({
  label,
  value,
  hint,
  sub,
  tone = "default",
  icon,
}: StatCardProps) {
  const subtitle = hint || sub;
  return (
    <div className="rounded-2xl border border-line bg-white p-3.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-ink-muted">{icon}</span>}
        <p className="truncate text-[11.5px] font-medium text-ink-secondary">{label}</p>
      </div>
      <p
        className={`mt-1 truncate text-[19px] font-semibold tracking-[-0.02em] ${toneClasses[tone]}`}
      >
        {value}
      </p>
      {subtitle && <p className="mt-0.5 truncate text-[11px] text-ink-muted">{subtitle}</p>}
    </div>
  );
}
