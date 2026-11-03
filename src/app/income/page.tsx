"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ChevronRight,
  Clock,
  Filter,
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
      grossAmountPaise: number;
      netAmountPaise: number;
      receivedPaise: number;
      pendingPaise: number;
      status: "RECEIVED" | "PARTIAL" | "PENDING";
      paymentMethod: string;
      raw: Transaction;
    };

export default function IncomePage() {
  const { transactions, cropSales, deleteTransaction, deleteCropSale, notify } = useApp();
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
      // Received from transactions
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
        grossAmountPaise: sale.grossAmountPaise ?? (sale.quantitySold * sale.ratePerUnitPaise),
        netAmountPaise: netAmount,
        receivedPaise: sale.receivedPaise,
        pendingPaise: sale.pendingPaise,
        status,
        paymentMethod: sale.paymentMethod,
        raw: sale,
      });
    }

    // 2. Transactions of kind INCOME that are not linked to crop sales
    for (const tx of transactions) {
      if (tx.deletedAt || tx.kind !== "INCOME") continue;
      if (!inRange(tx.date, range)) continue;
      if (tx.notes?.includes("[cropsale:")) continue; // prevent duplicate counting

      const isFarm = tx.group === "FARM" || isFarmIncomeCategory(tx.category);
      const isPending = isPendingIncome(tx);
      const hasPartialPending = !!(tx.pendingAmountPaise && tx.pendingAmountPaise > 0);

      const status: "RECEIVED" | "PARTIAL" | "PENDING" = isPending
        ? "PENDING"
        : hasPartialPending
        ? "PARTIAL"
        : "RECEIVED";

      const receivedPaise = isPending ? 0 : tx.amountPaise;
      const pendingPaise = isPending
        ? tx.amountPaise
        : tx.pendingAmountPaise ?? 0;
      const netAmountPaise = receivedPaise + pendingPaise;

      let subtitle = tx.description;
      if (tx.quantity && tx.ratePaise) {
        subtitle = `${tx.quantity} ${tx.unit || ""} @ ₹${Math.round(tx.ratePaise / 100)}`;
      }

      list.push({
        type: "TRANSACTION",
        id: tx.id,
        date: tx.date,
        category: tx.category,
        source: isFarm ? "FARM" : "HOME",
        title: tx.description || tx.category,
        subtitle,
        buyerName: tx.buyerName,
        grossAmountPaise: tx.grossAmountPaise ?? netAmountPaise,
        netAmountPaise,
        receivedPaise,
        pendingPaise,
        status,
        paymentMethod: tx.paymentMethod,
        raw: tx,
      });
    }

    // Sort by date descending
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [cropSales, transactions, range]);

  // Filtered unified list
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchCategory = item.category.toLowerCase().includes(query);
        const matchBuyer = item.buyerName?.toLowerCase().includes(query);
        const matchMarket = item.type === "CROPSALE" && item.marketName?.toLowerCase().includes(query);
        const matchSub = item.subtitle?.toLowerCase().includes(query);
        if (!matchTitle && !matchCategory && !matchBuyer && !matchMarket && !matchSub) {
          return false;
        }
      }

      // Category Filter
      if (categoryFilter === "FARM" && item.source !== "FARM") return false;
      if (categoryFilter === "HOME" && item.source !== "HOME") return false;
      if (categoryFilter !== "ALL" && categoryFilter !== "FARM" && categoryFilter !== "HOME") {
        if (item.category !== categoryFilter) return false;
      }

      // Status Filter
      if (statusFilter === "RECEIVED" && item.status !== "RECEIVED") return false;
      if (statusFilter === "PENDING" && item.status === "RECEIVED") return false;

      return true;
    });
  }, [unifiedItems, searchQuery, categoryFilter, statusFilter]);

  // Actions
  const handleItemClick = (item: UnifiedIncomeItem) => {
    if (item.type === "CROPSALE") {
      setSelectedCropSale(item.raw);
      setCropSaleSheetOpen(true);
    } else {
      setSelectedTransaction(item.raw);
      setIncomeSheetOpen(true);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: UnifiedIncomeItem) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: `Delete ${item.category}?`,
      message: "Are you sure you want to delete this income record? This action cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    if (item.type === "CROPSALE") {
      await deleteCropSale(item.id);
      notify("Crop sale deleted.");
    } else {
      await deleteTransaction(item.id);
      notify("Income record deleted.");
    }
  };

  const openIncomeType = (type: IncomeFormType) => {
    setAddMenuOpen(false);
    setSelectedTransaction(null);
    setIncomeSheetType(type);
    setIncomeSheetOpen(true);
  };

  const openCropSale = () => {
    setAddMenuOpen(false);
    setSelectedCropSale(null);
    setCropSaleSheetOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-canvas pb-24">
      <PageHeader
        title="Income & Sales"
        subtitle="Manage crop sales, farm income, household earnings & receivables"
        backHref="/"
        right={
          <button
            type="button"
            onClick={() => setAddMenuOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Income
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
                Total Income ({range.label})
              </p>
              <p className="mt-1 font-mono text-[32px] font-semibold tracking-tight text-ink">
                {formatINR(overview.totalIncomePaise)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-secondary">
                {overview.categories.reduce((acc, c) => acc + c.count, 0)} total records recorded
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
                <span className="text-[11px] font-semibold uppercase tracking-wider">Received Cash</span>
              </div>
              <p className="mt-1 font-mono text-[18px] font-semibold text-positive">
                {formatINR(overview.receivedPaise)}
              </p>
              <p className="mt-0.5 text-[10.5px] text-ink-muted">
                {percentOf(overview.receivedPaise, overview.totalIncomePaise)}% collected into balance
              </p>
            </div>

            <div className="rounded-2xl border border-amber/30 bg-amber-light/40 p-3">
              <div className="flex items-center gap-1.5 text-amber">
                <Clock className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Receivables</span>
              </div>
              <p className="mt-1 font-mono text-[18px] font-semibold text-amber">
                {formatINR(overview.pendingPaise)}
              </p>
              <p className="mt-0.5 text-[10.5px] text-ink-muted">
                {percentOf(overview.pendingPaise, overview.totalIncomePaise)}% owed by buyers
              </p>
            </div>
          </div>

          {/* Farm vs Household Split Progress */}
          {overview.totalIncomePaise > 0 && (
            <div className="mt-3.5 space-y-1.5 border-t border-line/60 pt-3">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-medium text-ink-secondary">
                  Farm Income: <strong className="text-brand-700">{formatINR(overview.farmTotalPaise)}</strong>
                </span>
                <span className="font-medium text-ink-secondary">
                  Household: <strong className="text-sky-700">{formatINR(overview.householdTotalPaise)}</strong>
                </span>
              </div>
              <ProgressBar
                value={percentOf(overview.farmTotalPaise, overview.totalIncomePaise)}
                tone="positive"
              />
            </div>
          )}
        </section>

        {/* Category Breakdown (Farm Income & Household Income) */}
        <section className="rounded-card border border-line bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Income by Category</h2>
              <p className="text-[11.5px] text-ink-muted">Earned across your farm and household</p>
            </div>
            <span className="text-[12px] font-semibold text-brand-700">
              {overview.categories.length} Categories
            </span>
          </div>

          {overview.categories.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                compact
                icon={<ArrowDownLeft className="h-5 w-5" />}
                title="No income recorded yet"
                message="Record your crop harvests, dairy milk sales, tractor rental, or salary."
                actionLabel="Record Income"
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
                          ({formatINR(c.pendingPaise)} pend.)
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
              <h2 className="section-title">Monthly Income History</h2>
              <p className="text-[11.5px] text-ink-muted">Received cash month by month</p>
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
                <h2 className="section-title">Income History</h2>
                <p className="text-[11.5px] text-ink-muted">
                  Showing {filteredItems.length} of {unifiedItems.length} records
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
                placeholder="Search buyer, crop, product, category..."
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
                All Sources
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
                Farm Only
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
                Household Only
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
                All Status
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
                Received
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
                Pending
              </button>
            </div>
          </div>

          {/* List of Items */}
          {filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title="No income records match"
                message="Try clearing your search query or choosing another period preset."
              />
            </div>
          ) : (
            <div className="divide-y divide-line/60">
              {filteredItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className="flex items-center justify-between gap-3 p-3.5 hover:bg-canvas/50 transition cursor-pointer active:bg-canvas"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-ink-muted">{item.date}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-semibold uppercase ${
                          item.source === "FARM"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {item.category}
                      </span>
                      {item.status === "RECEIVED" && (
                        <span className="rounded-full bg-positive-light px-1.5 py-0.2 text-[9.5px] font-semibold text-positive">
                          Paid
                        </span>
                      )}
                      {item.status === "PARTIAL" && (
                        <span className="rounded-full bg-amber-light px-1.5 py-0.2 text-[9.5px] font-semibold text-amber">
                          Partial · {formatINR(item.pendingPaise)} pending
                        </span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="rounded-full bg-amber-light px-1.5 py-0.2 text-[9.5px] font-semibold text-amber">
                          Pending Receivable
                        </span>
                      )}
                    </div>

                    <p className="truncate text-[13px] font-semibold text-ink">{item.title}</p>

                    <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                      {item.buyerName && <span>To: {item.buyerName}</span>}
                      {item.subtitle && item.subtitle !== item.title && (
                        <span>· {item.subtitle}</span>
                      )}
                    </div>
                  </div>

                  {/* Amounts & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="block font-mono text-[14px] font-semibold text-ink">
                        {formatINR(item.receivedPaise > 0 ? item.receivedPaise : item.netAmountPaise)}
                      </span>
                      {item.status === "PARTIAL" && (
                        <span className="block text-[10px] text-amber font-medium">
                          + {formatINR(item.pendingPaise)} due
                        </span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="block text-[10px] text-amber font-medium">
                          Pending
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item)}
                      className="p-1.5 text-ink-muted hover:text-negative transition rounded-lg hover:bg-negative-light/50"
                      title="Delete record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Clear Financial Rules Banner */}
        <div className="rounded-2xl bg-canvas px-4 py-3.5 text-[11.5px] leading-5 text-ink-secondary border border-line">
          <strong className="text-ink">Financial Integrity Rules:</strong>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            <li>Only cash actually received increases your available cash in hand.</li>
            <li>Pending payments are tracked as receivables and do not inflate available balance.</li>
            <li>Borrowed money (loans) is never classified as income.</li>
            <li>Crop sales are automatically linked to crop revenue and never double-counted.</li>
          </ul>
        </div>
      </main>

      {/* Quick Add Income Selection Sheet */}
      <Sheet
        open={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        title="Record Income"
        subtitle="Choose what kind of income you want to add"
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
              <span className="block text-[13px] font-semibold text-ink">Crop Sale</span>
              <span className="block text-[11px] text-ink-muted">
                Quantity, mandi, selling price, transport deduction & buyer payment
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
              <span className="block text-[13px] font-semibold text-ink">Milk Sales</span>
              <span className="block text-[11px] text-ink-muted">
                Litres, fat rate, dairy center, and payout status
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
              <span className="block text-[13px] font-semibold text-ink">Tractor Rental Income</span>
              <span className="block text-[11px] text-ink-muted">
                Ploughing, rotavator, hours, rate, and client farmer name
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
              <span className="block text-[13px] font-semibold text-ink">Machinery Rental</span>
              <span className="block text-[11px] text-ink-muted">
                Thresher, sprayer, pumps, rate, and client farmer name
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
              <span className="block text-[13px] font-semibold text-ink">Agricultural Products</span>
              <span className="block text-[11px] text-ink-muted">
                Vegetables, fruits, fodder, straw bales, and compost
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
              <span className="block text-[13px] font-semibold text-ink">Household Income</span>
              <span className="block text-[11px] text-ink-muted">
                Salary, business income, shop earnings, and other income
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
