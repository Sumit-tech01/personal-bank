"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
  eyebrow?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  right,
  eyebrow,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/92 backdrop-blur-md">
      <div className="app-container flex min-h-[64px] items-center gap-3 py-3">
        {backHref && (
          <Link
            href={backHref}
            className="icon-button h-10 w-10 shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-[21px] font-semibold tracking-[-0.025em] text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12.5px] text-ink-secondary">
              {subtitle}
            </p>
          )}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  );
}
