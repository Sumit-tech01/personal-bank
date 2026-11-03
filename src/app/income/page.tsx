"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ChevronRight,
  Clock,
  Milk,
  Plus,
  Search,
  Sparkles,
  Tractor,
  Trash2,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import PeriodFilter from "@/components/ui/PeriodFilter";
import EmptyState from "@/components/ui/EmptyState";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusPill from "@/components/ui/StatusPill";
import Sheet from "@/components/ui/Sheet";
import CropSaleSheet from "@/components/forms/CropSaleSheet";
import IncomeSheet, { type IncomeFormType } from "@/components/forms/IncomeSheet";
import {
  incomeOverview,
  isFarmIncomeCategory,
  isPendingIncome,
  isReceivedIncome,
} from "@/lib/finance";
import { formatMonthShort, inRange, lastNMonths, monthKey, rangeForPreset } from "@/lib/dates";
import { formatINR, percentOf, sumPaise } from "@/lib/money";
import type { CropSale, DateRange, PeriodPreset, Transaction } from "@/lib/types";

const PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "THIS_YEAR", "CURRENT_SEASON", "ALL_TIME"];

type UnifiedIncomeItem =
  | {
      type: "CROPSALE";
      id: string;
      date: string;
      category: string;
      source: "FARM";
      title: string;
      subtitle?: string;
      buyerName?: string;
      marketName?: string;
      grossAmountPaise: number;
      netAmountPaise: number;
      receivedPaise: number;
      pendingPaise: number;
      status: "RECEIVED" | "PARTIAL" | "PENDING";
      paymentMethod: string;
      raw: CropSale;
    }
  | {
      type: "TRANSACTION";
      id: string;
      date: string;
      category: string;
      source: "FARM" | "HOME";
      title: string;
      subtitle?: string;
      buyerName?: string;
      marketName?: string;
      grossAmountPaise: number;
      netAmountPaise: number;
      receivedPaise: number;
      pendingPaise: number;
      status: "RECEIVED" | "PARTIAL" | "PENDING";
      paymentMethod: string;
      raw: Transaction;
    };

export default function IncomePage() {
  const { transactions, cropSales, deleteTransaction, deleteCropSale, notify, t, formatDate } = useApp();
  const confirm = useConfirm();

  const [range, setRange] = useState<DateRange>(() => rangeForPreset("THIS_MONTH"));
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RECEIVED" | "PENDING">("ALL");

  // Modals
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [cropSaleSheetOpen, setCropSaleSheetOpen] = useState(false);
  const [selectedCropSale, setSelectedCropSale] = useState<CropSale | null>(null);

  const [incomeSheetOpen, setIncomeSheetOpen] = useState(false);
  const [incomeSheetType, setIncomeSheetType] = useState<IncomeFormType>("MILK");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Overview calculations
  const overview = useMemo(
    () => incomeOverview(transactions, cropSales, range),
    [transactions, cropSales, range]
  );

  // Monthly trends for the last 6 months
  const months = useMemo(() => lastNMonths(6), []);
  const monthlyTrends = useMemo(() => {
    return months.map((m) => {
      const txSum = sumPaise(
        transactions
          .filter(
            (t) =>
              t.kind === "INCOME" &&
              t.incomeStatus !== "PENDING" &&
              monthKey(t.date) === m.key
          )
          .map((t) => t.amountPaise)
      );
      return {
        ...m,
        amountPaise: txSum,
      };
    });
  }, [months, transactions]);

  const maxMonth = Math.max(1, ...monthlyTrends.map((m) => m.amountPaise));

  // Build unified income list
  const unifiedItems: UnifiedIncomeItem[] = useMemo(() => {
    const list: UnifiedIncomeItem[] = [];

    // 1. Crop Sales in period
    for (const sale of cropSales) {
      if (sale.deletedAt) continue;
      if (!inRange(sale.saleDate, range)) continue;

      const netAmount = sale.netAmountPaise ?? sale.totalAmountPaise;
      const status: "RECEIVED" | "PARTIAL" | "PENDING" =
        sale.receivedPaise >= netAmount
          ? "RECEIVED"
          : sale.receivedPaise > 0
          ? "PARTIAL"
          : "PENDING";

      list.push({
        type: "CROPSALE",
        id: sale.id,
        date: sale.saleDate,
        category: "Crop Sales",
        source: "FARM",
        title: `${sale.cropName} Sale`,
        subtitle: `${sale.quantitySold} ${sale.unit} @ ₹${Math.round(sale.ratePerUnitPaise / 100)}/${sale.unit}`,
        buyerName: sale.buyerName,
        marketName: sale.marketName,
        grossAmountPaise: sale.totalAmountPaise,
        netAmountPaise: netAmount,
        receivedPaise: sale.receivedPaise,
        pendingPaise: Math.max(0, netAmount - sale.receivedPaise),
        status,
        paymentMethod: sale.paymentMethod,
        raw: sale,
      });
    }

    // 2. Transaction Incomes in period
    for (const tx of transactions) {
      if (tx.deletedAt || tx.kind !== "INCOME") continue;
      if (!inRange(tx.date, range)) continue;

      const isFarm = isFarmIncomeCategory(tx.category) || tx.group === "FARM" || !!tx.cropId;
      const status: "RECEIVED" | "PARTIAL" | "PENDING" =
        tx.incomeStatus === "PENDING" ? "PENDING" : "RECEIVED";

      list.push({
        type: "TRANSACTION",
        id: tx.id,
        date: tx.date,
        category: tx.category,
        source: isFarm ? "FARM" : "HOME",
        title: tx.description || tx.category,
        subtitle: tx.cropName ? `Crop: ${tx.cropName}` : tx.vehicleName ? `Vehicle: ${tx.vehicleName}` : undefined,
        buyerName: tx.notes,
        grossAmountPaise: tx.amountPaise,
        netAmountPaise: tx.amountPaise,
        receivedPaise: status === "RECEIVED" ? tx.amountPaise : 0,
        pendingPaise: status === "PENDING" ? tx.amountPaise : 0,
        status,
        paymentMethod: tx.paymentMethod,
        raw: tx,
      });
    }

    // Sort newest first
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [cropSales, transactions, range]);

  // Filtered unified list
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Source filter
      if (categoryFilter !== "ALL" && item.source !== categoryFilter) return false;

      // Status filter
      if (statusFilter === "RECEIVED" && item.status !== "RECEIVED") return false;
      if (statusFilter === "PENDING" && item.status === "RECEIVED") return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inCategory = item.category.toLowerCase().includes(q);
        const inBuyer = (item.buyerName || "").toLowerCase().includes(q);
        const inMarket = (item.marketName || "").toLowerCase().includes(q);
        if (!inTitle && !inCategory && !inBuyer && !inMarket) return false;
      }

      return true;
    });
  }, [unifiedItems, categoryFilter, statusFilter, searchQuery]);

  const openCropSale = () => {
    setAddMenuOpen(false);
    setSelectedCropSale(null);
    setCropSaleSheetOpen(true);
  };

  const openIncomeType = (type: IncomeFormType) => {
    setAddMenuOpen(false);
    setSelectedTransaction(null);
    setIncomeSheetType(type);
    setIncomeSheetOpen(true);
  };

  const handleEditItem = (item: UnifiedIncomeItem) => {
    if (item.type === "CROPSALE") {
      setSelectedCropSale(item.raw);
      setCropSaleSheetOpen(true);
    } else {
      setSelectedTransaction(item.raw);
      const cat = item.raw.category;
      if (cat.includes("Milk")) setIncomeSheetType("MILK");
      else if (cat.includes("Tractor")) setIncomeSheetType("TRACTOR_RENTAL");
      else if (cat.includes("Machinery")) setIncomeSheetType("MACHINERY_RENTAL");
      else if (cat.includes("Salary") || cat.includes("Business")) setIncomeSheetType("HOUSEHOLD");
      else setIncomeSheetType("AGRI_PRODUCTS");
      setIncomeSheetOpen(true);
    }
  };

  const handleDeleteItem = async (item: UnifiedIncomeItem) => {
    const okay = await confirm({
      title: t("dialog.confirmDelete"),
      message: t("dialog.deleteWarning"),
      danger: true,
      confirmLabel: t("dialog.confirm"),
      cancelLabel: t("dialog.cancel"),
    });
    if (!okay) return;

    if (item.type === "CROPSALE") {
      await deleteCropSale(item.id);
      notify("Crop sale deleted.");
    } else {
      await deleteTransaction(item.id);
      notify("Income record deleted.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={t("income.title")}
        subtitle={t("income.subtitle")}
        right={
          <button
            type="button"
            onClick={() => setAddMenuOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t("income.addIncome")}
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Period Selector */}
        <PeriodFilter value={range} onChange={setRange} presets={PRESETS} compact />

        {/* Executive Summary Banner */}
        <section className="rounded-card border border-line bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {t("income.title")} ({range.label})
              </p>
              <p className="mt-1 font-mono text-[32px] font-semibold tracking-tight text-ink">
                {formatINR(overview.totalIncomePaise)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-secondary">
                {overview.categories.reduce((acc, c) => acc + c.count, 0)} {t("common.entries", { count: overview.categories.reduce((acc, c) => acc + c.count, 0) })}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-positive-light text-positive">
              <Wallet className="h-6 w-6" />
            </span>
          </div>

          {/* Cash Received vs Pending Split Cards */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-positive/30 bg-positive-light/40 p-3">
              <div className="flex items-center gap-1.5 text-positive">
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{t("income.totalReceived")}</span>
              </div>
              <p className="mt-1 font-mono text-[18px] font-semibold text-positive">
                {formatINR(overview.receivedPaise)}
              </p>
              <p className="mt-0.5 text-[10.5px] text-ink-muted">
                {percentOf(overview.receivedPaise, overview.totalIncomePaise)}%
              </p>
            </div>

            <div className="rounded-2xl border border-amber/30 bg-amber-light/40 p-3">
              <div className="flex items-center gap-1.5 text-amber">
                <Clock className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{t("income.totalPending")}</span>
              </div>
              <p className="mt-1 font-mono text-[18px] font-semibold text-amber">
                {formatINR(overview.pendingPaise)}
              </p>
              <p className="mt-0.5 text-[10.5px] text-ink-muted">
                {percentOf(overview.pendingPaise, overview.totalIncomePaise)}%
              </p>
            </div>
          </div>

          {/* Farm vs Household Split Progress */}
          {overview.totalIncomePaise > 0 && (
            <div className="mt-3.5 space-y-1.5 border-t border-line/60 pt-3">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-medium text-ink-secondary">
                  {t("income.farming")}: <strong className="text-brand-700">{formatINR(overview.farmTotalPaise)}</strong>
                </span>
                <span className="font-medium text-ink-secondary">
                  {t("income.household")}: <strong className="text-sky-700">{formatINR(overview.householdTotalPaise)}</strong>
                </span>
              </div>
              <ProgressBar
                value={percentOf(overview.farmTotalPaise, overview.totalIncomePaise)}
                tone="positive"
              />
            </div>
          )}
        </section>

        {/* Category Breakdown */}
        <section className="rounded-card border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">{t("income.incomeSources")}</h2>
              <p className="text-[11.5px] text-ink-muted">{range.label}</p>
            </div>
          </div>

          {overview.categories.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                compact
                icon={<ArrowDownLeft className="h-5 w-5" />}
                title={t("income.noIncome")}
                message={t("income.subtitle")}
                actionLabel={t("income.addIncome")}
                onAction={() => setAddMenuOpen(true)}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {overview.categories.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          c.group === "FARM" ? "bg-brand-600" : "bg-sky-500"
                        }`}
                      />
                      {c.category}
                      <span className="text-[10.5px] font-normal text-ink-muted">
                        ({c.count})
                      </span>
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold text-ink">
                      {formatINR(c.totalPaise)}
                      {c.pendingPaise > 0 && (
                        <span className="ml-1.5 text-[10px] font-normal text-amber">
                          ({formatINR(c.pendingPaise)} {t("common.pending")})
                        </span>
                      )}
                    </span>
                  </div>
                  <ProgressBar
                    value={percentOf(c.totalPaise, overview.totalIncomePaise)}
                    tone={c.group === "FARM" ? "positive" : "sky"}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Last 6 Months Income Trend */}
        <section className="rounded-card border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">{t("income.monthlyTrend")}</h2>
            </div>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {monthlyTrends.map((month) => (
              <div key={month.key} className="space-y-1">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-medium text-ink-secondary">
                    {formatMonthShort(`${month.key}-01`)}
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {formatINR(month.amountPaise)}
                  </span>
                </div>
                <ProgressBar
                  value={Math.round((month.amountPaise / maxMonth) * 100)}
                  tone="positive"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Income History with Search and Filters */}
        <section className="overflow-hidden rounded-card border border-line bg-white shadow-xs">
          <div className="p-4 border-b border-line/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">{t("income.title")} {t("common.history")}</h2>
                <p className="text-[11.5px] text-ink-muted">
                  {filteredItems.length} {t("common.entries", { count: filteredItems.length })}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                className="input h-10 pl-9 text-[13px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("common.search")}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  categoryFilter === "ALL"
                    ? "bg-brand-600 text-white"
                    : "bg-canvas text-ink-secondary hover:text-ink"
                }`}
              >
                {t("income.allSources")}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("FARM")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  categoryFilter === "FARM"
                    ? "bg-brand-600 text-white"
                    : "bg-canvas text-ink-secondary hover:text-ink"
                }`}
              >
                {t("expenses.farmGroup")}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("HOME")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  categoryFilter === "HOME"
                    ? "bg-brand-600 text-white"
                    : "bg-canvas text-ink-secondary hover:text-ink"
                }`}
              >
                {t("expenses.homeGroup")}
              </button>

              <span className="mx-1 h-3 w-px bg-line" />

              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  statusFilter === "ALL"
                    ? "bg-ink text-white"
                    : "bg-canvas text-ink-secondary hover:text-ink"
                }`}
              >
                {t("income.allStatus")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("RECEIVED")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  statusFilter === "RECEIVED"
                    ? "bg-positive text-white"
                    : "bg-canvas text-ink-secondary hover:text-ink"
                }`}
              >
                {t("income.received")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  statusFilter === "PENDING"
                    ? "bg-amber text-white"
                    : "bg-canvas text-ink-secondary hover:text-ink"
                }`}
              >
                {t("income.pending")}
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title={t("income.noIncome")}
                message={t("income.subtitle")}
                actionLabel={t("income.addIncome")}
                onAction={() => setAddMenuOpen(true)}
              />
            </div>
          ) : (
            <div className="divide-y divide-line/70">
              {filteredItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-start justify-between p-3.5 transition hover:bg-canvas/50"
                >
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => handleEditItem(item)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold text-ink">
                        {item.title}
                      </span>
                      <StatusPill
                        label={
                          item.status === "RECEIVED"
                            ? t("income.received")
                            : item.status === "PARTIAL"
                            ? t("income.partial")
                            : t("income.pending")
                        }
                        tone={
                          item.status === "RECEIVED"
                            ? "positive"
                            : item.status === "PARTIAL"
                            ? "amber"
                            : "neutral"
                        }
                      />
                    </div>

                    <p className="mt-0.5 truncate text-[11.5px] text-ink-secondary">
                      {item.category}
                      {item.subtitle ? ` · ${item.subtitle}` : ""}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-ink-muted">
                      <span>{formatDate(item.date)}</span>
                      {item.buyerName && <span>· Buyer: {item.buyerName}</span>}
                      {item.marketName && <span>· Mandi: {item.marketName}</span>}
                      <span>· {item.paymentMethod}</span>
                    </div>

                    {item.pendingPaise > 0 && (
                      <p className="mt-1 text-[11px] font-medium text-amber">
                        {t("income.received")}: {formatINR(item.receivedPaise)} · {t("income.pending")}: {formatINR(item.pendingPaise)}
                      </p>
                    )}
                  </div>

                  <div className="ml-3 flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-mono text-[14.5px] font-bold text-positive">
                      +{formatINR(item.netAmountPaise)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(item)}
                      className="rounded-lg p-1 text-ink-muted hover:bg-canvas hover:text-negative"
                      title={t("common.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Quick Add Income Selection Sheet */}
      <Sheet
        open={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        title={t("income.addIncome")}
        subtitle={t("income.selectIncomeType")}
      >
        <div className="space-y-2 py-1">
          <button
            type="button"
            onClick={openCropSale}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:bg-canvas active:scale-98"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{t("income.cropSales")}</span>
              <span className="block text-[11px] text-ink-muted">
                {t("income.cropSalesDesc")}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => openIncomeType("MILK")}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:bg-canvas active:scale-98"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Milk className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{t("income.milkSales")}</span>
              <span className="block text-[11px] text-ink-muted">
                {t("income.milkSalesDesc")}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => openIncomeType("TRACTOR_RENTAL")}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:bg-canvas active:scale-98"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Tractor className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{t("income.tractorRental")}</span>
              <span className="block text-[11px] text-ink-muted">
                {t("income.tractorRentalDesc")}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => openIncomeType("MACHINERY_RENTAL")}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:bg-canvas active:scale-98"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Wrench className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{t("income.machineryRental")}</span>
              <span className="block text-[11px] text-ink-muted">
                {t("income.machineryRentalDesc")}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => openIncomeType("AGRI_PRODUCTS")}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:bg-canvas active:scale-98"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{t("income.agriProducts")}</span>
              <span className="block text-[11px] text-ink-muted">
                {t("income.agriProductsDesc")}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => openIncomeType("HOUSEHOLD")}
            className="flex w-full items-center gap-3.5 rounded-2xl border border-line p-3.5 text-left transition hover:bg-canvas active:scale-98"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <Wallet className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{t("income.householdIncome")}</span>
              <span className="block text-[11px] text-ink-muted">
                {t("income.householdIncomeDesc")}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" />
          </button>
        </div>
      </Sheet>

      {/* Sheets */}
      <CropSaleSheet
        open={cropSaleSheetOpen}
        onClose={() => setCropSaleSheetOpen(false)}
        sale={selectedCropSale}
      />

      <IncomeSheet
        open={incomeSheetOpen}
        onClose={() => setIncomeSheetOpen(false)}
        initialType={incomeSheetType}
        transaction={selectedTransaction}
      />
    </div>
  );
}
