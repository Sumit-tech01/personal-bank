"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  HandCoins,
  LandPlot,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  Scale,
  ShoppingBag,
  Sprout,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import StatCard from "@/components/ui/StatCard";
import TransactionItem from "@/components/TransactionItem";
import CropSheet from "@/components/forms/CropSheet";
import LabourSheet from "@/components/forms/LabourSheet";
import CropSaleSheet from "@/components/forms/CropSaleSheet";
import {
  cropFinancials,
  labourByActivity,
  labourByCrop,
} from "@/lib/finance";
import { formatDate } from "@/lib/dates";
import { formatINR, formatNumber } from "@/lib/money";
import type { Crop, CropSale, CropStatus, LabourPayment } from "@/lib/types";

type CropDetailTab = "OVERVIEW" | "EXPENSES" | "LABOUR" | "SALES";

const STATUS_ORDER: CropStatus[] = ["PLANNED", "ACTIVE", "HARVESTING", "COMPLETED"];
const STATUS_LABELS: Record<CropStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  HARVESTING: "Harvesting",
  COMPLETED: "Completed",
};

export default function CropDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    crops,
    lands,
    transactions,
    labourPayments,
    cropSales,
    inventory,
    saveCrop,
    deleteCrop,
    openAdd,
    markLabourPaid,
    notify,
  } = useApp();
  const confirm = useConfirm();

  const [tab, setTab] = useState<CropDetailTab>("OVERVIEW");
  const [cropSheet, setCropSheet] = useState(false);
  const [labourSheet, setLabourSheet] = useState<{ open: boolean; labour?: LabourPayment | null }>({
    open: false,
  });
  const [saleSheet, setSaleSheet] = useState<{ open: boolean; sale?: CropSale | null }>({
    open: false,
  });

  const crop = crops.find((item) => item.id === params.id) ?? null;
  const land = lands.find((l) => l.id === crop?.landId) ?? null;

  const financials = useMemo(
    () =>
      crop
        ? cropFinancials(
            crop,
            transactions,
            labourPayments,
            cropSales,
            undefined,
            inventory
          )
        : null,
    [crop, transactions, labourPayments, cropSales, inventory]
  );

  const cropExpenses = useMemo(
    () =>
      transactions.filter(
        (t) => t.cropId === params.id && t.kind === "EXPENSE"
      ),
    [transactions, params.id]
  );

  const thisCropLabour = useMemo(
    () => labourByCrop(labourPayments, params.id),
    [labourPayments, params.id]
  );

  const thisCropSales = useMemo(
    () => cropSales.filter((s) => s.cropId === params.id),
    [cropSales, params.id]
  );

  const activities = useMemo(
    () => labourByActivity(labourPayments, params.id),
    [labourPayments, params.id]
  );

  if (!crop || !financials) {
    return (
      <div className="min-h-[100dvh] bg-canvas">
        <PageHeader title="Crop" backHref="/farm" />
        <main className="app-container py-6">
          <EmptyState
            icon={<Sprout className="h-5 w-5" />}
            title="Crop not found"
            message="This crop may have been removed. Go back to your farm to view your other crops."
            actionLabel="Back to farm"
            actionHref="/farm"
          />
        </main>
      </div>
    );
  }

  const advanceStatus = async (nextStatus: CropStatus) => {
    try {
      await saveCrop(
        {
          name: crop.name,
          variety: crop.variety,
          season: crop.season,
          year: crop.year,
          landId: crop.landId,
          areaAcres: crop.areaAcres,
          sowingDate: crop.sowingDate,
          expectedHarvestDate: crop.expectedHarvestDate,
          actualHarvestDate:
            nextStatus === "COMPLETED" || nextStatus === "HARVESTING"
              ? crop.actualHarvestDate || new Date().toISOString().slice(0, 10)
              : crop.actualHarvestDate,
          status: nextStatus,
          notes: crop.notes,
        },
        crop.id
      );
      notify(`Crop marked as ${STATUS_LABELS[nextStatus]}.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not update status.", "error");
    }
  };

  const removeCrop = async () => {
    const okay = await confirm({
      title: `Delete ${crop.name}?`,
      message:
        "The crop record will be removed. All linked expenses, sales and labour records will be preserved in your historical logs.",
      confirmLabel: "Delete crop",
      danger: true,
    });
    if (!okay) return;
    try {
      await deleteCrop(crop.id);
      notify("Crop deleted.");
      router.replace("/farm");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete crop.", "error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={crop.name}
        subtitle={`${crop.season} ${crop.year}${crop.variety ? ` · ${crop.variety}` : ""}`}
        backHref="/farm"
        right={
          <button
            type="button"
            onClick={() => setCropSheet(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-secondary"
            aria-label="Edit crop details"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Quick Crop Status Stepper */}
        <section className="rounded-card border border-line bg-white p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Current Stage
            </span>
            <StatusPill
              label={STATUS_LABELS[crop.status]}
              tone={
                crop.status === "COMPLETED"
                  ? "positive"
                  : crop.status === "HARVESTING"
                  ? "amber"
                  : crop.status === "ACTIVE"
                  ? "positive"
                  : "neutral"
              }
              dot={crop.status === "ACTIVE" || crop.status === "HARVESTING"}
            />
          </div>

          <div className="mt-2.5 grid grid-cols-4 gap-1.5 rounded-2xl bg-canvas p-1">
            {STATUS_ORDER.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => advanceStatus(st)}
                className={`rounded-xl py-1.5 text-[11px] font-semibold transition ${
                  crop.status === st
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {STATUS_LABELS[st]}
              </button>
            ))}
          </div>
        </section>

        {/* 4 Main Tabs */}
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => setTab("OVERVIEW")}
            className={`rounded-xl py-2 text-[12px] font-semibold transition ${
              tab === "OVERVIEW"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab("EXPENSES")}
            className={`rounded-xl py-2 text-[12px] font-semibold transition ${
              tab === "EXPENSES"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setTab("LABOUR")}
            className={`rounded-xl py-2 text-[12px] font-semibold transition ${
              tab === "LABOUR"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Labour
          </button>
          <button
            type="button"
            onClick={() => setTab("SALES")}
            className={`rounded-xl py-2 text-[12px] font-semibold transition ${
              tab === "SALES"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Sales
          </button>
        </div>

        {/* =========================================================================
            TAB 1: OVERVIEW
           ========================================================================= */}
        {tab === "OVERVIEW" && (
          <div className="space-y-4">
            {/* Primary Profitability Card */}
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Crop Net Profit / Loss
                  </p>
                  <p
                    className={`mt-1 text-[32px] font-semibold tracking-[-0.035em] ${
                      financials.profitPaise >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {financials.profitPaise >= 0 ? "+" : "−"}
                    {formatINR(financials.profitPaise, { absolute: true })}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">
                    Total Sales Revenue minus Total Investment
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    financials.profitPaise >= 0
                      ? "bg-positive-light text-positive"
                      : "bg-negative-light text-negative"
                  }`}
                >
                  <TrendingUp className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <StatCard
                  label="Total Investment"
                  value={formatINR(financials.totalInvestmentPaise)}
                  hint="All materials + labour + machinery"
                  tone="negative"
                />
                <StatCard
                  label="Total Sales Revenue"
                  value={formatINR(financials.salesRevenuePaise)}
                  hint={
                    financials.pendingRevenuePaise > 0
                      ? `${formatINR(financials.receivedRevenuePaise)} cash received`
                      : "All received"
                  }
                  tone="positive"
                />
              </div>

              {financials.pendingRevenuePaise > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-light px-3.5 py-2.5 text-[11.5px]">
                  <span className="font-medium text-amber">Pending from buyers:</span>
                  <span className="font-bold text-amber">
                    {formatINR(financials.pendingRevenuePaise)}
                  </span>
                </div>
              )}

              {/* Per Acre Analysis */}
              {crop.areaAcres > 0 && (
                <div className="mt-3 border-t border-line/70 pt-3">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                    Per-Acre Returns ({formatNumber(crop.areaAcres)} acres)
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-canvas p-2">
                      <p className="text-[10px] text-ink-muted">Cost / acre</p>
                      <p className="text-[12.5px] font-semibold text-ink">
                        {formatINR(financials.costPerAcrePaise)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-canvas p-2">
                      <p className="text-[10px] text-ink-muted">Revenue / acre</p>
                      <p className="text-[12.5px] font-semibold text-positive">
                        {formatINR(financials.revenuePerAcrePaise)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-canvas p-2">
                      <p className="text-[10px] text-ink-muted">Profit / acre</p>
                      <p
                        className={`text-[12.5px] font-semibold ${
                          financials.profitPerAcrePaise >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {financials.profitPerAcrePaise >= 0 ? "+" : "−"}
                        {formatINR(financials.profitPerAcrePaise, { absolute: true })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Plot & Schedule Details */}
            <section className="rounded-card border border-line bg-white p-4 space-y-3">
              <h2 className="section-title">Plot & Important Dates</h2>
              <div className="space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-secondary">
                    <LandPlot className="h-4 w-4 text-brand-700" />
                    Plot / Land Parcel
                  </span>
                  <span className="font-semibold text-ink">
                    {crop.landName}
                    {land?.surveyNumber ? ` (Gat ${land.surveyNumber})` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-secondary">
                    <Sprout className="h-4 w-4 text-brand-700" />
                    Cultivated Area
                  </span>
                  <span className="font-semibold text-ink">
                    {formatNumber(crop.areaAcres)} acres
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-secondary">
                    <CalendarDays className="h-4 w-4 text-brand-700" />
                    Sowing Date
                  </span>
                  <span className="font-semibold text-ink">{formatDate(crop.sowingDate)}</span>
                </div>
                {crop.expectedHarvestDate && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      <CalendarDays className="h-4 w-4 text-amber" />
                      Expected Harvest
                    </span>
                    <span className="font-semibold text-ink">
                      {formatDate(crop.expectedHarvestDate)}
                    </span>
                  </div>
                )}
                {crop.actualHarvestDate && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      <CheckCircle2 className="h-4 w-4 text-positive" />
                      Actual Harvest Date
                    </span>
                    <span className="font-semibold text-positive">
                      {formatDate(crop.actualHarvestDate)}
                    </span>
                  </div>
                )}
              </div>

              {crop.notes && (
                <div className="rounded-xl bg-canvas p-3 text-[12px] text-ink-secondary">
                  <span className="block text-[10.5px] font-semibold uppercase text-ink-muted">
                    Notes
                  </span>
                  {crop.notes}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => openAdd("FARM_EXPENSE", undefined, { cropId: crop.id })}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-3 text-[11px] font-semibold text-ink shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Wallet className="h-4 w-4" />
                </span>
                Add Cost
              </button>
              <button
                type="button"
                onClick={() => setLabourSheet({ open: true })}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-3 text-[11px] font-semibold text-ink shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-light text-amber">
                  <Users className="h-4 w-4" />
                </span>
                Add Labour
              </button>
              <button
                type="button"
                onClick={() => setSaleSheet({ open: true })}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white p-3 text-[11px] font-semibold text-ink shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-positive-light text-positive">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                Record Sale
              </button>
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 2: EXPENSES
           ========================================================================= */}
        {tab === "EXPENSES" && (
          <div className="space-y-4">
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Cost Summary</h2>
                  <p className="text-[11.5px] text-ink-muted">
                    Total: {formatINR(financials.totalInvestmentPaise)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAdd("FARM_EXPENSE", undefined, { cropId: crop.id })}
                  className="flex items-center gap-1 text-[12px] font-semibold text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add expense
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-[10px] uppercase text-ink-muted">Materials</span>
                  <p className="font-semibold text-ink">{formatINR(financials.materialCostPaise)}</p>
                  <p className="text-[10px] text-ink-muted">Seeds, Fert, Pest</p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-[10px] uppercase text-ink-muted">Labour</span>
                  <p className="font-semibold text-ink">{formatINR(financials.labourCostPaise)}</p>
                  <p className="text-[10px] text-ink-muted">Wages & spraying</p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-[10px] uppercase text-ink-muted">Machinery</span>
                  <p className="font-semibold text-ink">{formatINR(financials.totalMachineryCostPaise)}</p>
                  <p className="text-[10px] text-ink-muted">Tractor & fuel</p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-[10px] uppercase text-ink-muted">Other Costs</span>
                  <p className="font-semibold text-ink">{formatINR(financials.totalOtherCostPaise)}</p>
                  <p className="text-[10px] text-ink-muted">Irrigation, transport</p>
                </div>
              </div>
            </section>

            {/* Linked Transaction Records */}
            <section className="overflow-hidden rounded-card border border-line bg-white">
              <div className="border-b border-line px-4 py-3">
                <h3 className="text-[13px] font-semibold text-ink">
                  Linked Expense Records ({cropExpenses.length})
                </h3>
              </div>
              {cropExpenses.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    compact
                    title="No expenses logged"
                    message="Add seeds, fertilizers or machinery costs for this crop."
                    actionLabel="Add crop cost"
                    onAction={() => openAdd("FARM_EXPENSE", undefined, { cropId: crop.id })}
                  />
                </div>
              ) : (
                <div className="divide-y divide-line/70">
                  {cropExpenses.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onClick={() =>
                        tx.labourPaymentId ? router.push("/labour") : openAdd(undefined, tx)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 3: LABOUR
           ========================================================================= */}
        {tab === "LABOUR" && (
          <div className="space-y-4">
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Labour Costing</h2>
                  <p className="text-[11.5px] text-ink-muted">
                    {thisCropLabour.length} wage payment{thisCropLabour.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLabourSheet({ open: true })}
                  className="flex items-center gap-1 text-[12px] font-semibold text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add labour
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-[10px] uppercase text-ink-muted">Total Wages</span>
                  <p className="font-semibold text-ink">{formatINR(financials.labourTotalPaise)}</p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-[10px] uppercase text-ink-muted">Paid Now</span>
                  <p className="font-semibold text-positive">{formatINR(financials.labourPaidPaise)}</p>
                </div>
              </div>

              {financials.labourPendingPaise > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-light px-3.5 py-2.5 text-[11.5px]">
                  <span className="font-medium text-amber">Pending Wages:</span>
                  <span className="font-bold text-amber">
                    {formatINR(financials.labourPendingPaise)}
                  </span>
                </div>
              )}
            </section>

            {/* Activity-wise Breakdown */}
            {activities.length > 0 && (
              <section className="rounded-card border border-line bg-white p-4">
                <h3 className="section-title mb-2">Activity Breakdown</h3>
                <div className="space-y-2">
                  {activities.map((act) => (
                    <div key={act.name} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-ink-secondary">{act.name}</span>
                      <span className="font-semibold text-ink">{formatINR(act.amountPaise)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Labour Records List */}
            <section className="space-y-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                Labour Entries ({thisCropLabour.length})
              </h3>
              {thisCropLabour.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Users className="h-5 w-5" />}
                  title="No labour recorded"
                  message="Log workers, days, and daily rates for this crop."
                  actionLabel="Add labour"
                  onAction={() => setLabourSheet({ open: true })}
                />
              ) : (
                thisCropLabour.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-line bg-white p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-ink">
                          {item.workerName ? `${item.workerName} · ` : ""}
                          {item.activity}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {item.workers} worker{item.workers === 1 ? "" : "s"} × {formatINR(item.ratePaise)} × {item.days} day{item.days === 1 ? "" : "s"}
                        </p>
                        <p className="text-[10.5px] text-ink-muted">{formatDate(item.paymentDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-ink">{formatINR(item.amountPaise)}</p>
                        <StatusPill
                          label={item.status === "PAID" ? "Paid" : item.status === "PARTIAL" ? "Partial" : "Pending"}
                          tone={item.status === "PAID" ? "positive" : "amber"}
                        />
                      </div>
                    </div>
                    {item.status !== "PAID" && (
                      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-[11.5px]">
                        <span className="text-amber">
                          Pending: {formatINR(item.remainingPaise ?? item.amountPaise)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void markLabourPaid(item.id)}
                          className="font-semibold text-brand-700"
                        >
                          Mark Paid →
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 4: SALES
           ========================================================================= */}
        {tab === "SALES" && (
          <div className="space-y-4">
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Harvest & Sales</h2>
                  <p className="text-[11.5px] text-ink-muted">
                    Total Revenue: {formatINR(financials.salesRevenuePaise)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSaleSheet({ open: true })}
                  className="flex items-center gap-1 text-[12px] font-semibold text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record sale
                </button>
              </div>

              {/* Harvest & Stock Stats */}
              {financials.harvestedQuantity > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-canvas p-2.5">
                    <span className="text-[10px] uppercase text-ink-muted">Harvested</span>
                    <p className="font-semibold text-ink">
                      {financials.harvestedQuantity} {financials.quantityUnit}
                    </p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5">
                    <span className="text-[10px] uppercase text-ink-muted">Sold</span>
                    <p className="font-semibold text-positive">
                      {financials.soldQuantity} {financials.quantityUnit}
                    </p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5">
                    <span className="text-[10px] uppercase text-ink-muted">Stock Left</span>
                    <p className="font-semibold text-amber">
                      {financials.remainingQuantity} {financials.quantityUnit}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl bg-positive-light/40 p-2.5">
                  <span className="text-[10px] uppercase text-positive">Cash Received</span>
                  <p className="font-semibold text-positive">
                    {formatINR(financials.receivedRevenuePaise)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-light/40 p-2.5">
                  <span className="text-[10px] uppercase text-amber">Pending From Buyers</span>
                  <p className="font-semibold text-amber">
                    {formatINR(financials.pendingRevenuePaise)}
                  </p>
                </div>
              </div>
            </section>

            {/* Sales Records List */}
            <section className="space-y-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
                Sales Records ({thisCropSales.length})
              </h3>
              {thisCropSales.length === 0 ? (
                <EmptyState
                  compact
                  icon={<ShoppingBag className="h-5 w-5" />}
                  title="No sales recorded yet"
                  message="Record market rate, quantity sold and buyer details."
                  actionLabel="Record first sale"
                  onAction={() => setSaleSheet({ open: true })}
                />
              ) : (
                thisCropSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => setSaleSheet({ open: true, sale })}
                    className="cursor-pointer rounded-2xl border border-line bg-white p-3.5 transition active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-ink">
                          {sale.quantitySold} {sale.unit} @ {formatINR(sale.ratePerUnitPaise)} / {sale.unit}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {sale.buyerName ? `${sale.buyerName} · ` : ""}
                          {sale.marketName ? `${sale.marketName} · ` : ""}
                          {formatDate(sale.saleDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-ink">
                          {formatINR(sale.totalAmountPaise)}
                        </p>
                        <StatusPill
                          label={sale.pendingPaise === 0 ? "Received" : sale.receivedPaise > 0 ? "Partial" : "Pending"}
                          tone={sale.pendingPaise === 0 ? "positive" : "amber"}
                        />
                      </div>
                    </div>
                    {sale.pendingPaise > 0 && (
                      <p className="mt-2 text-[11px] font-medium text-amber border-t border-line/60 pt-1.5">
                        Received: {formatINR(sale.receivedPaise)} · Pending: {formatINR(sale.pendingPaise)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {/* Delete Crop Action */}
        <div className="pt-2">
          <button type="button" className="btn-danger w-full" onClick={removeCrop}>
            <Trash2 className="h-4 w-4" />
            Delete crop
          </button>
        </div>
      </main>

      <CropSheet
        open={cropSheet}
        onClose={() => setCropSheet(false)}
        crop={crop}
      />
      <LabourSheet
        open={labourSheet.open}
        onClose={() => setLabourSheet({ open: false })}
        labour={labourSheet.labour}
        defaultCropId={crop.id}
      />
      <CropSaleSheet
        open={saleSheet.open}
        onClose={() => setSaleSheet({ open: false })}
        sale={saleSheet.sale}
        defaultCropId={crop.id}
      />
    </div>
  );
}
