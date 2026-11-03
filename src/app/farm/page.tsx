"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronRight,
  History,
  MapPin,
  Plus,
  Sprout,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import CropCard from "@/components/CropCard";
import LabourCostCard from "@/components/LabourCostCard";
import CropSheet from "@/components/forms/CropSheet";
import LabourSheet from "@/components/forms/LabourSheet";
import LandSheet from "@/components/forms/LandSheet";
import LandDetailSheet from "@/components/LandDetailSheet";
import PeriodFilter from "@/components/ui/PeriodFilter";
import {
  cropFinancials,
  farmTotals,
  labourSummary,
  pendingLabourTotal,
} from "@/lib/finance";
import { rangeForPreset } from "@/lib/dates";
import { formatINR, formatNumber } from "@/lib/money";
import type { Crop, DateRange, Land, PeriodPreset } from "@/lib/types";

const FARM_PRESETS: PeriodPreset[] = [
  "CURRENT_SEASON",
  "THIS_YEAR",
  "LAST_YEAR",
  "ALL_TIME",
  "CUSTOM",
];

export default function FarmPage() {
  const {
    crops,
    lands,
    transactions,
    labourPayments,
    cropSales,
    inventory,
    t,
  } = useApp();

  const [range, setRange] = useState<DateRange>(() => rangeForPreset("CURRENT_SEASON"));
  const [cropSheet, setCropSheet] = useState(false);
  const [labourSheet, setLabourSheet] = useState(false);
  const [landSheet, setLandSheet] = useState<{ open: boolean; land?: Land | null }>({
    open: false,
  });
  const [selectedLandDetail, setSelectedLandDetail] = useState<Land | null>(null);

  const totals = useMemo(
    () => farmTotals(crops, lands, transactions, labourPayments, cropSales, range),
    [crops, lands, transactions, labourPayments, cropSales, range]
  );

  const labour = useMemo(
    () => labourSummary(labourPayments, range),
    [labourPayments, range]
  );
  const pendingLabour = useMemo(
    () => pendingLabourTotal(labourPayments),
    [labourPayments]
  );

  // Crop categories
  const activeCrops = useMemo(
    () => crops.filter((crop) => crop.status === "ACTIVE" || crop.status === "HARVESTING"),
    [crops]
  );
  const plannedCrops = useMemo(
    () => crops.filter((crop) => crop.status === "PLANNED"),
    [crops]
  );
  const completedCrops = useMemo(
    () => crops.filter((crop) => crop.status === "COMPLETED"),
    [crops]
  );

  // Group historical crops by Season + Year
  const historicalSeasons = useMemo(() => {
    const map = new Map<string, Crop[]>();
    for (const crop of completedCrops) {
      const key = `${crop.season} ${crop.year}`;
      const group = map.get(key) ?? [];
      group.push(crop);
      map.set(key, group);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [completedCrops]);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={t("farm.title")}
        subtitle={t("farm.subtitle")}
        right={
          <button
            type="button"
            onClick={() => setCropSheet(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t("farm.addCrop")}
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Season & Time Period Filter */}
        <PeriodFilter
          value={range}
          onChange={setRange}
          presets={FARM_PRESETS}
          compact
        />

        {/* 1. FARM DASHBOARD SUMMARY */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {t("farm.netProfitLoss")} ({range.label})
              </p>
              <p
                className={`mt-1 text-[32px] font-semibold tracking-[-0.035em] ${
                  totals.profitPaise >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {totals.profitPaise >= 0 ? "+" : "−"}
                {formatINR(totals.profitPaise, { absolute: true })}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {t("farm.investmentNote")}
              </p>
            </div>
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                totals.profitPaise >= 0 ? "bg-positive-light text-positive" : "bg-brand-50 text-brand-700"
              }`}
            >
              <Sprout className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <StatCard
              label={t("farm.totalArea")}
              value={`${formatNumber(totals.landAreaAcres)} ${t("farm.acresUnitPlural")}`}
              hint={`${lands.length} ${t("farm.registeredFields")}`}
            />
            <StatCard
              label={t("farm.activeCrops")}
              value={String(totals.activeCrops)}
              hint={`${crops.length} ${t("farm.cropCountPlural", { count: crops.length })}`}
              tone="brand"
            />
            <StatCard
              label={t("farm.cropCost")}
              value={formatINR(totals.investmentPaise)}
              hint={t("farm.investment")}
              tone="negative"
            />
            <StatCard
              label={t("farm.cropRevenue")}
              value={formatINR(totals.incomePaise)}
              hint={
                totals.pendingIncomePaise > 0
                  ? `${formatINR(totals.pendingIncomePaise)} ${t("common.pending")}`
                  : t("common.received")
              }
              tone="positive"
            />
          </div>

          {totals.labourPendingPaise > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-light px-3 py-2.5">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
              <p className="text-[11.5px] leading-4 text-amber">
                {formatINR(totals.labourPendingPaise)} {t("labour.unpaid")}
              </p>
            </div>
          )}
        </section>

        {/* 2. ACTIVE & GROWING CROPS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="section-title">{t("farm.activeCrops")}</h2>
              <p className="text-[11.5px] text-ink-muted">
                {activeCrops.length} {t("farm.statusActive")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCropSheet(true)}
              className="flex items-center gap-1 text-[12px] font-semibold text-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("farm.addCrop")}
            </button>
          </div>

          {activeCrops.length === 0 ? (
            <EmptyState
              icon={<Sprout className="h-5 w-5" />}
              title={t("farm.noCrops")}
              message={t("farm.subtitle")}
              actionLabel={t("farm.addCrop")}
              onAction={() => setCropSheet(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {activeCrops.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  financials={cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Planned Crops */}
        {plannedCrops.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="section-title">{t("farm.statusPlanned")}</h2>
                <p className="text-[11.5px] text-ink-muted">
                  {plannedCrops.length} {t("farm.cropCountPlural", { count: plannedCrops.length })}
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {plannedCrops.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  financials={cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. LAND MANAGEMENT & PARCELS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="section-title">{t("farm.lands")}</h2>
              <p className="text-[11.5px] text-ink-muted">
                {formatNumber(totals.landAreaAcres)} {t("farm.acresUnitPlural")} · {lands.length} {t("farm.registeredFields")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLandSheet({ open: true, land: null })}
              className="flex items-center gap-1 text-[12px] font-semibold text-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("farm.addLand")}
            </button>
          </div>

          {lands.length === 0 ? (
            <EmptyState
              compact
              icon={<MapPin className="h-5 w-5" />}
              title={t("farm.noLands")}
              message={t("farm.noLandsHint")}
              actionLabel={t("farm.addLand")}
              onAction={() => setLandSheet({ open: true, land: null })}
            />
          ) : (
            <div className="overflow-hidden rounded-card border border-line bg-white divide-y divide-line/70">
              {lands.map((land) => (
                <div
                  key={land.id}
                  onClick={() => setSelectedLandDetail(land)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition active:bg-canvas"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{land.name}</p>
                      {land.surveyNumber && (
                        <span className="rounded bg-canvas px-1.5 py-0.5 text-[10.5px] font-medium text-ink-muted">
                          Gat {land.surveyNumber}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-ink-muted">
                      {land.totalArea || land.areaAcres} {land.areaUnit || t("farm.acresUnit")}
                      {land.soilType ? ` · ${land.soilType}` : ""}
                      {land.irrigation ? ` · ${land.irrigation}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. FARM HISTORY */}
        {completedCrops.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title flex items-center gap-1.5">
                  <History className="h-4 w-4 text-brand-700" />
                  {t("farm.history")}
                </h2>
                <p className="text-[11.5px] text-ink-muted">
                  {completedCrops.length === 1
                    ? t("farm.completedHarvests", { count: 1 })
                    : t("farm.completedHarvestsPlural", { count: completedCrops.length })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {historicalSeasons.map(([seasonName, seasonCrops]) => {
                let seasonInvestment = 0;
                let seasonRevenue = 0;
                for (const c of seasonCrops) {
                  const fin = cropFinancials(c, transactions, labourPayments, cropSales, undefined, inventory);
                  seasonInvestment += fin.totalInvestmentPaise;
                  seasonRevenue += fin.salesRevenuePaise;
                }
                const seasonProfit = seasonRevenue - seasonInvestment;

                return (
                  <div key={seasonName} className="rounded-card border border-line bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <div>
                        <p className="text-[13px] font-semibold text-ink">{seasonName}</p>
                        <p className="text-[10.5px] text-ink-muted">
                          {seasonCrops.length === 1
                            ? t("farm.cropCount", { count: 1 })
                            : t("farm.cropCountPlural", { count: seasonCrops.length })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-[12.5px] font-semibold ${
                            seasonProfit >= 0 ? "text-positive" : "text-negative"
                          }`}
                        >
                          {seasonProfit >= 0 ? "+" : "−"}
                          {formatINR(seasonProfit, { absolute: true })}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          {t("farm.investment")}: {formatINR(seasonInvestment)} · {t("farm.sales")}: {formatINR(seasonRevenue)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {seasonCrops.map((crop) => (
                        <CropCard
                          key={crop.id}
                          crop={crop}
                          financials={cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. LABOUR OVERVIEW */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="section-title">{t("labour.title")}</h2>
              <p className="text-[11.5px] text-ink-muted">
                {formatINR(labour.totalPaise)} {t("common.total")} · {formatINR(labour.pendingPaise)} {t("common.pending")}
              </p>
            </div>
            <Link
              href="/labour"
              className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
            >
              {t("farm.openLabour")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <LabourCostCard summary={labour} href="/labour" />
          <button
            type="button"
            onClick={() => setLabourSheet(true)}
            className="btn-secondary mt-2 w-full"
          >
            <Plus className="h-4 w-4" />
            {t("farm.addLabourPayment")}
          </button>
        </section>
      </main>

      {/* Sheets & Dialogs */}
      <CropSheet open={cropSheet} onClose={() => setCropSheet(false)} />
      <LabourSheet
        open={labourSheet}
        onClose={() => setLabourSheet(false)}
        defaultCropId={activeCrops[0]?.id ?? crops[0]?.id}
      />
      <LandSheet
        open={landSheet.open}
        land={landSheet.land}
        onClose={() => setLandSheet({ open: false })}
      />
      <LandDetailSheet
        open={!!selectedLandDetail}
        land={selectedLandDetail}
        onClose={() => setSelectedLandDetail(null)}
        onEdit={(landToEdit) => setLandSheet({ open: true, land: landToEdit })}
      />
    </div>
  );
}
