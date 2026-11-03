"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { formatINR } from "@/lib/money";
import { useApp } from "@/context/AppContext";
import type { LabourSummary } from "@/lib/finance";

interface LabourCostCardProps {
  summary: LabourSummary;
  title?: string;
  href?: string;
  compact?: boolean;
}

export default function LabourCostCard({
  summary,
  title,
  href,
  compact = false,
}: LabourCostCardProps) {
  const { t } = useApp();
  const displayTitle = title || t("labour.title");

  const paymentsText =
    summary.count === 1
      ? t("labour.paymentCount", { count: 1 })
      : t("labour.paymentCountPlural", { count: summary.count });

  const workerDaysText =
    summary.totalWorkerDays === 1
      ? t("labour.workerDay", { count: 1 })
      : t("labour.workerDayPlural", { count: summary.totalWorkerDays });

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-light text-amber">
          <Users className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">{displayTitle}</p>
          <p className="text-[11px] text-ink-muted">
            {paymentsText} · {workerDaysText}
          </p>
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
          >
            {t("common.view")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-canvas/80 px-2.5 py-2">
          <p className="text-[10px] text-ink-muted">{t("common.total")}</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">
            {formatINR(summary.totalPaise)}
          </p>
        </div>
        <div className="rounded-xl bg-positive-light/60 px-2.5 py-2">
          <p className="text-[10px] text-ink-muted">{t("labour.paid")}</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-positive">
            {formatINR(summary.paidPaise)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-light/70 px-2.5 py-2">
          <p className="text-[10px] text-ink-muted">{t("labour.unpaid")}</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-amber">
            {formatINR(summary.pendingPaise)}
          </p>
        </div>
      </div>

      {!compact && summary.byActivity.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          {summary.byActivity.slice(0, 4).map((activity) => (
            <div key={activity.name} className="flex items-center justify-between text-[11.5px]">
              <span className="truncate text-ink-secondary">{activity.name}</span>
              <span className="shrink-0 font-medium text-ink">{formatINR(activity.amountPaise)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
