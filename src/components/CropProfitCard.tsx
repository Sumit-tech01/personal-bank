import React from "react";
import { formatINR, percentOf } from "@/lib/money";
import ProgressBar from "./ui/ProgressBar";
import type { CropFinancials } from "@/lib/finance";

interface CropProfitCardProps {
  financials: CropFinancials;
  compact?: boolean;
}

export default function CropProfitCard({ financials, compact = false }: CropProfitCardProps) {
  const profit = financials.profitPaise;
  const total = financials.totalExpensesPaise;

  const costItems = [
    { label: "Seed Cost", amount: financials.seedCostPaise },
    { label: "Fertilizer Cost", amount: financials.fertilizerCostPaise },
    { label: "Pesticide Cost", amount: financials.pesticideCostPaise },
    { label: "Labour Cost", amount: financials.labourCostPaise },
    { label: "Machinery Cost", amount: financials.machineryCostPaise },
    { label: "Irrigation Cost", amount: financials.irrigationCostPaise },
    { label: "Other Costs", amount: financials.otherCostPaise },
  ];

  const activeCosts = costItems.filter((item) => item.amount > 0);

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
            Crop profit or loss
          </p>
          <p
            className={`mt-1 text-[28px] font-semibold tracking-[-0.03em] ${
              profit >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {profit >= 0 ? "+" : "−"}
            {formatINR(profit, { absolute: true })}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            {profit >= 0 ? "Profit" : "Loss"} after all crop costs, including pending labour
          </p>
        </div>
        <div className="rounded-2xl bg-canvas px-3 py-2 text-right">
          <p className="text-[10px] text-ink-muted">Cost per acre</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink">
            {formatINR(financials.costPerAcrePaise)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-canvas/80 px-2.5 py-2">
          <p className="text-[10px] text-ink-muted">Crop Income</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-positive">
            {formatINR(financials.totalIncomePaise)}
          </p>
        </div>
        <div className="rounded-xl bg-canvas/80 px-2.5 py-2">
          <p className="text-[10px] text-ink-muted">Total Investment</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">
            {formatINR(financials.totalExpensesPaise)}
          </p>
        </div>
        <div className="rounded-xl bg-canvas/80 px-2.5 py-2">
          <p className="text-[10px] text-ink-muted">Pending Income</p>
          <p className="mt-0.5 truncate text-[12.5px] font-semibold text-amber">
            {formatINR(financials.pendingIncomePaise)}
          </p>
        </div>
      </div>

      {!compact && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-semibold text-ink">Crop Cost Breakdown</p>
          {activeCosts.length === 0 ? (
            <p className="rounded-xl bg-canvas px-3 py-3 text-[12px] text-ink-muted">
              No crop costs recorded yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {activeCosts.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate text-ink-secondary">{item.label}</span>
                    <span className="shrink-0 font-semibold text-ink">
                      {formatINR(item.amount)}
                      <span className="ml-1 text-[10px] font-normal text-ink-muted">
                        {percentOf(item.amount, total)}%
                      </span>
                    </span>
                  </div>
                  <ProgressBar value={percentOf(item.amount, total)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {financials.labourPendingPaise > 0 && (
        <p className="mt-3 rounded-xl bg-amber-light px-3 py-2 text-[11.5px] leading-4 text-amber">
          {formatINR(financials.labourPendingPaise)} of labour is still pending. It is counted
          in crop cost but not in your cash balance until you mark it paid.
        </p>
      )}
    </section>
  );
}
