"use client";

import React from "react";
import {
  CalendarDays,
  Layers,
  MapPin,
  Pencil,
  Sprout,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import { useApp } from "@/context/AppContext";
import { cropFinancials } from "@/lib/finance";
import { formatDate } from "@/lib/dates";
import { formatINR, formatNumber } from "@/lib/money";
import type { Land } from "@/lib/types";

interface LandDetailSheetProps {
  open: boolean;
  onClose: () => void;
  land?: Land | null;
  onEdit: (land: Land) => void;
}

export default function LandDetailSheet({
  open,
  onClose,
  land,
  onEdit,
}: LandDetailSheetProps) {
  const { crops, transactions, labourPayments, cropSales, inventory } = useApp();

  if (!land) return null;

  // Crops belonging to this land parcel
  const parcelCrops = crops.filter((c) => c.landId === land.id);
  const activeCrops = parcelCrops.filter(
    (c) => c.status === "ACTIVE" || c.status === "HARVESTING"
  );
  const completedCrops = parcelCrops.filter((c) => c.status === "COMPLETED");
  const plannedCrops = parcelCrops.filter((c) => c.status === "PLANNED");

  // Cumulative parcel financials
  let totalParcelInvestment = 0;
  let totalParcelRevenue = 0;
  for (const crop of parcelCrops) {
    const fin = cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory);
    totalParcelInvestment += fin.totalInvestmentPaise;
    totalParcelRevenue += fin.salesRevenuePaise;
  }
  const parcelNetProfit = totalParcelRevenue - totalParcelInvestment;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={land.name}
      subtitle={
        land.surveyNumber
          ? `Gat / Survey No. ${land.surveyNumber} · ${formatNumber(land.areaAcres)} acres`
          : `${formatNumber(land.areaAcres)} acres`
      }
      footer={
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit(land);
          }}
          className="btn-secondary w-full"
        >
          <Pencil className="h-4 w-4" />
          Edit plot details
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Parcel Overview Card */}
        <div className="rounded-2xl border border-line bg-canvas/40 p-3.5 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <span className="block text-[10.5px] uppercase tracking-wider text-ink-muted">
                Total Area
              </span>
              <span className="font-semibold text-ink">
                {land.totalArea || land.areaAcres} {land.areaUnit || "Acre"}
                {land.areaUnit && land.areaUnit !== "Acre" ? ` (${land.areaAcres} acres)` : ""}
              </span>
            </div>
            {land.surveyNumber && (
              <div>
                <span className="block text-[10.5px] uppercase tracking-wider text-ink-muted">
                  Gat / Survey
                </span>
                <span className="font-semibold text-ink">{land.surveyNumber}</span>
              </div>
            )}
            {land.soilType && (
              <div>
                <span className="block text-[10.5px] uppercase tracking-wider text-ink-muted">
                  Soil Type
                </span>
                <span className="font-semibold text-ink">{land.soilType}</span>
              </div>
            )}
            {land.irrigation && (
              <div>
                <span className="block text-[10.5px] uppercase tracking-wider text-ink-muted">
                  Irrigation
                </span>
                <span className="font-semibold text-ink">{land.irrigation}</span>
              </div>
            )}
            {land.location && (
              <div className="col-span-2">
                <span className="block text-[10.5px] uppercase tracking-wider text-ink-muted">
                  Location
                </span>
                <span className="font-semibold text-ink">{land.location}</span>
              </div>
            )}
          </div>
          {land.notes && (
            <p className="border-t border-line/60 pt-2 text-[11.5px] text-ink-secondary">
              {land.notes}
            </p>
          )}
        </div>

        {/* Parcel Lifetime Financials */}
        {parcelCrops.length > 0 && (
          <div className="rounded-2xl border border-line bg-white p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Plot Lifetime Returns
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-canvas p-2">
                <p className="text-[10px] text-ink-muted">Total Invested</p>
                <p className="text-[13px] font-semibold text-ink">
                  {formatINR(totalParcelInvestment)}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-2">
                <p className="text-[10px] text-ink-muted">Total Revenue</p>
                <p className="text-[13px] font-semibold text-positive">
                  {formatINR(totalParcelRevenue)}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-2">
                <p className="text-[10px] text-ink-muted">Net Return</p>
                <p
                  className={`text-[13px] font-semibold ${
                    parcelNetProfit >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {parcelNetProfit >= 0 ? "+" : "−"}
                  {formatINR(parcelNetProfit, { absolute: true })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Crops */}
        {activeCrops.length > 0 && (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
              Growing Now ({activeCrops.length})
            </h3>
            <div className="space-y-2">
              {activeCrops.map((crop) => {
                const fin = cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory);
                return (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{crop.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {crop.season} {crop.year} · {crop.areaAcres} acres
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-ink">
                        {formatINR(fin.totalInvestmentPaise)}
                      </p>
                      <StatusPill label={crop.status} tone="positive" dot />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Planned Crops */}
        {plannedCrops.length > 0 && (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
              Planned Crops ({plannedCrops.length})
            </h3>
            <div className="space-y-2">
              {plannedCrops.map((crop) => (
                <div
                  key={crop.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{crop.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {crop.season} {crop.year} · {crop.areaAcres} acres
                    </p>
                  </div>
                  <StatusPill label="Planned" tone="neutral" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Crops Grown */}
        <div>
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
            Historical Completed Crops ({completedCrops.length})
          </h3>
          {completedCrops.length === 0 ? (
            <p className="rounded-xl bg-canvas p-3 text-center text-[12px] text-ink-muted">
              No historical completed crop records on this plot yet.
            </p>
          ) : (
            <div className="space-y-2">
              {completedCrops.map((crop) => {
                const fin = cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory);
                return (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{crop.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {crop.season} {crop.year} · {crop.areaAcres} acres
                        {crop.actualHarvestDate ? ` · Harvested ${formatDate(crop.actualHarvestDate)}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[12.5px] font-semibold ${
                          fin.profitPaise >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {fin.profitPaise >= 0 ? "+" : "−"}
                        {formatINR(fin.profitPaise, { absolute: true })}
                      </p>
                      <span className="text-[10px] text-ink-muted">
                        Rev: {formatINR(fin.salesRevenuePaise)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
