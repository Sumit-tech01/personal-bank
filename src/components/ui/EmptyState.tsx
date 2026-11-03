"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  compact?: boolean;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`empty-card ${compact ? "py-6" : "py-9"}`}>
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-[280px] text-[13px] leading-5 text-ink-secondary">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
