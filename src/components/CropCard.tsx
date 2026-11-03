"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Sprout } from "lucide-react";
import StatusPill from "./ui/StatusPill";
import { formatINR } from "@/lib/money";
import type { Crop } from "@/lib/types";
import type { CropFinancials } from "@/lib/finance";

interface CropCardProps {
  crop: Crop;
  financials: CropFinancials;
}

export default function CropCard({ crop, financials }: CropCardProps) {
  const profit = financials.profitPaise;
  const statusLabel =
    crop.status === "ACTIVE"
      ? "Active"
      : crop.status === "HARVESTING"
      ? "Harvesting"
      : crop.status === "PLANNED"
      ? "Planned"
      : "Completed";
  const statusTone =
    crop.status === "ACTIVE"
      ? "positive"
      : crop.status === "HARVESTING"
      ? "amber"
      : crop.status === "PLANNED"
      ? "neutral"
      : "neutral";

  return (
    <Link
      href={`/farm/crop/${crop.id}`}
      className="block rounded-2xl border border-line bg-white p-4 transition active:scale-[0.995]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Sprout className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-semibold text-ink">{crop.name}</p>
            <StatusPill
              label={statusLabel}
              tone={statusTone}
              dot={crop.status === "ACTIVE" || crop.status === "HARVESTING"}
            />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
            {[crop.variety, `${crop.season} ${crop.year}`, `${crop.areaAcres} acre${crop.areaAcres === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
            <MapPin className="h-3 w-3" />
            {crop.landName || "Unassigned plot"}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-canvas/80 px-3 py-2.5">
        <div>
          <p className="text-[10px] text-ink-muted">Sales</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-positive">
            {formatINR(financials.salesRevenuePaise)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-ink-muted">Investment</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">
            {formatINR(financials.totalInvestmentPaise)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-ink-muted">{profit >= 0 ? "Profit" : "Loss"}</p>
          <p
            className={`mt-0.5 truncate text-[12.5px] font-semibold ${
              profit >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {profit >= 0 ? "+" : "−"}
            {formatINR(profit, { absolute: true })}
          </p>
        </div>
      </div>
    </Link>
  );
}
