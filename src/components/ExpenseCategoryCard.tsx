"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProgressBar from "./ui/ProgressBar";
import { formatINR, percentOf } from "@/lib/money";

interface ExpenseCategoryCardProps {
  label: string;
  amountPaise: number;
  totalPaise: number;
  icon: React.ReactNode;
  tone?: "brand" | "sky" | "amber" | "neutral" | "negative" | "purple";
  href?: string;
  onClick?: () => void;
  count?: number;
}

const tones = {
  brand: "bg-brand-50 text-brand-700",
  sky: "bg-sky-light text-sky",
  amber: "bg-amber-light text-amber",
  neutral: "bg-canvas text-ink-secondary",
  negative: "bg-negative-light text-negative",
  purple: "bg-purple-50 text-purple-700",
};

export default function ExpenseCategoryCard({
  label,
  amountPaise,
  totalPaise,
  icon,
  tone = "brand",
  href,
  onClick,
  count,
}: ExpenseCategoryCardProps) {
  const percent = percentOf(amountPaise, totalPaise);
  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{label}</p>
          <p className="text-[10.5px] text-ink-muted">
            {percent}%{typeof count === "number" ? ` · ${count} entries` : ""}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
      </div>
      <p className="mt-2.5 text-[17px] font-semibold tracking-[-0.02em] text-ink">
        {formatINR(amountPaise)}
      </p>
      <div className="mt-2">
        <ProgressBar
          value={percent}
          tone={tone === "neutral" || tone === "purple" ? "brand" : tone}
          size="sm"
        />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-line bg-white p-3.5 transition active:scale-[0.99]"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-2xl border border-line bg-white p-3.5 text-left transition active:scale-[0.99]"
    >
      {inner}
    </button>
  );
}
