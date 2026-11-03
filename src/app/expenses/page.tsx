"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CreditCard,
  Fuel,
  Home as HomeIcon,
  Plus,
  Receipt,
  Shield,
  Sprout,
  Tractor,
  Users,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import PeriodFilter from "@/components/ui/PeriodFilter";
import Segmented from "@/components/ui/Segmented";
import EmptyState from "@/components/ui/EmptyState";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusPill from "@/components/ui/StatusPill";
import TransactionItem from "@/components/TransactionItem";
import {
  categoryTotals,
  expenseBreakdown,
  labourReportDate,
  labourSummary,
  type CategoryTotal,
} from "@/lib/finance";
import {
  formatDate,
  formatMonthKey,
  inRange,
  monthKey,
  rangeForPreset,
  toISODate,
} from "@/lib/dates";
import { formatINR, percentOf } from "@/lib/money";
import type { DateRange, ExpenseGroup, PeriodPreset } from "@/lib/types";

type GroupTab = "HOME" | "FARM" | "LABOUR" | "VEHICLE";

const PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "THIS_YEAR", "ALL_TIME"];

function previousRange(range: DateRange): DateRange | null {
  if (range.preset === "ALL_TIME") return null;
  const start = new Date(Number(range.start.slice(0, 4)), Number(range.start.slice(5, 7)) - 1, 1, 12);
  if (range.preset === "THIS_MONTH") return rangeForPreset("LAST_MONTH");
  if (range.preset === "LAST_MONTH") {
    const previous = new Date(start.getFullYear(), start.getMonth() - 1, 1, 12);
    const key = monthKey(previous);
    return {
      start: `${key}-01`,
      end: toISODate(new Date(previous.getFullYear(), previous.getMonth() + 1, 0, 12)),
      label: formatMonthKey(key),
      preset: "CUSTOM",
    };
  }
  if (range.preset === "THIS_YEAR") {
    const year = start.getFullYear() - 1;
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: String(year),
      preset: "CUSTOM",
    };
  }
  return null;
}

export default function ExpensesPage() {
  const {
    transactions,
    labourPayments,
    crops,
    lands,
    openAdd,
    addCustomCategory,
    markLabourPaid,
    notify,
    t,
  } = useApp();
  const router = useRouter();
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("THIS_MONTH"));
  const [tab, setTab] = useState<GroupTab>("HOME");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [selectedLandId, setSelectedLandId] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const getTabLabel = (gt: GroupTab): string => {
    switch (gt) {
      case "HOME":
        return t("expenses.homeGroup");
      case "FARM":
        return t("expenses.farmGroup");
      case "LABOUR":
        return t("expenses.labourGroup");
      case "VEHICLE":
        return t("expenses.vehicleGroup");
    }
  };

  const getTabTitle = (gt: GroupTab): string => {
    switch (gt) {
      case "HOME":
        return t("expenses.homeTitle");
      case "FARM":
        return t("expenses.farmTitle");
      case "LABOUR":
        return t("expenses.labourTitle");
      case "VEHICLE":
        return t("expenses.vehicleTitle");
    }
  };

  const getTabDesc = (gt: GroupTab): string => {
    switch (gt) {
      case "HOME":
        return t("expenses.homeDesc");
      case "FARM":
        return t("expenses.farmDesc");
      case "LABOUR":
        return t("expenses.labourDesc");
      case "VEHICLE":
        return t("expenses.vehicleDesc");
    }
  };

  const GROUP_META: Record<
    GroupTab,
    {
      addType: "HOME_EXPENSE" | "FARM_EXPENSE" | "LABOUR" | "VEHICLE_EXPENSE";
      defaults?: { expenseGroup?: ExpenseGroup };
    }
  > = {
    HOME: { addType: "HOME_EXPENSE" },
    FARM: { addType: "FARM_EXPENSE" },
    LABOUR: { addType: "LABOUR" },
    VEHICLE: { addType: "VEHICLE_EXPENSE" },
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const group = params.get("group")?.toUpperCase() as GroupTab | null;
    if (group && group in GROUP_META) setTab(group);
  }, []);

  const breakdown = useMemo(
    () => expenseBreakdown(transactions, range),
    [transactions, range]
  );
  const previous = useMemo(() => previousRange(range), [range]);
  const previousBreakdown = useMemo(
    () => (previous ? expenseBreakdown(transactions, previous) : null),
    [transactions, previous]
  );

  // Group amount calculation
  const groupAmount = useMemo(() => {
    if (tab === "HOME") return breakdown.homePaise;
    if (tab === "FARM") return breakdown.farmPaise;
    if (tab === "LABOUR") return breakdown.labourPaise;
    return breakdown.vehiclePaise;
  }, [breakdown, tab]);

  const previousGroupAmount = useMemo(() => {
    if (!previousBreakdown) return 0;
    if (tab === "HOME") return previousBreakdown.homePaise;
    if (tab === "FARM") return previousBreakdown.farmPaise;
    if (tab === "LABOUR") return previousBreakdown.labourPaise;
    return previousBreakdown.vehiclePaise;
  }, [previousBreakdown, tab]);

  // Counts
  const counts = useMemo(() => {
    let home = 0;
    let farm = 0;
    let vehicle = 0;
    for (const transaction of transactions) {
      if (transaction.kind !== "EXPENSE" || !inRange(transaction.date, range)) continue;
      if (transaction.group === "HOME" || transaction.group === "OTHER") home += 1;
      else if (transaction.group === "FARM") {
        if (!transaction.labourPaymentId && transaction.category !== "Labour") farm += 1;
      } else if (transaction.group === "VEHICLE") vehicle += 1;
    }
    const labourCount = labourPayments.filter((p) => inRange(labourReportDate(p), range)).length;
    return { HOME: home, FARM: farm, LABOUR: labourCount, VEHICLE: vehicle };
  }, [transactions, labourPayments, range]);

  // Filtered transactions for current tab
  const filteredTransactions = useMemo(() => {
    if (tab === "LABOUR") return [];
    return transactions.filter((transaction) => {
      if (transaction.kind !== "EXPENSE" || !inRange(transaction.date, range)) return false;

      if (tab === "HOME") {
        if (transaction.group !== "HOME") return false;
      } else if (tab === "FARM") {
        if (transaction.group !== "FARM" || transaction.category === "Labour" || transaction.labourPaymentId) {
          return false;
        }
        if (selectedCropId && transaction.cropId !== selectedCropId) return false;
        if (selectedLandId && transaction.landId !== selectedLandId) return false;
      } else if (tab === "VEHICLE") {
        if (transaction.group !== "VEHICLE") return false;
      }

      if (selectedCategory && transaction.category !== selectedCategory) return false;
      return true;
    });
  }, [transactions, range, tab, selectedCategory, selectedCropId, selectedLandId]);

  // Category totals for current tab
  const categoryRows = useMemo(() => {
    if (tab === "LABOUR") return [];
    const group: ExpenseGroup = tab === "HOME" ? "HOME" : tab === "FARM" ? "FARM" : "VEHICLE";
    const rows = categoryTotals(transactions, { kind: "EXPENSE", group, range });
    if (tab === "FARM") {
      return rows.filter((r) => r.category !== "Labour");
    }
    return rows;
  }, [transactions, tab, range]);

  // Labour specific data
  const periodLabour = useMemo(() => {
    return labourPayments.filter((p) => inRange(labourReportDate(p), range));
  }, [labourPayments, range]);

  const labourStats = useMemo(() => {
    return labourSummary(periodLabour);
  }, [periodLabour]);

  const pendingLabour = useMemo(() => {
    return periodLabour.filter(
      (p) => p.status === "PENDING" || p.status === "PARTIAL" || (p.remainingPaise ?? 0) > 0
    );
  }, [periodLabour]);

  const filteredLabour = useMemo(() => {
    return periodLabour.filter((p) => {
      if (selectedCategory && p.activity !== selectedCategory) return false;
      if (selectedCropId && p.cropId !== selectedCropId) return false;
      return true;
    });
  }, [periodLabour, selectedCategory, selectedCropId]);

  // Vehicle stats
  const vehicleStats = useMemo(() => {
    let fuelPaise = 0;
    let maintenancePaise = 0;
    let insurancePaise = 0;
    let emiPaise = 0;
    let otherPaise = 0;

    const FUEL_SET = new Set(["Fuel", "Petrol", "Diesel", "CNG"]);
    const MAINT_SET = new Set(["Engine Oil", "Servicing", "Repairs", "Tyres"]);

    for (const tx of transactions) {
      if (tx.kind !== "EXPENSE" || tx.group !== "VEHICLE" || !inRange(tx.date, range)) continue;
      if (FUEL_SET.has(tx.category)) fuelPaise += tx.amountPaise;
      else if (MAINT_SET.has(tx.category)) maintenancePaise += tx.amountPaise;
      else if (tx.category === "Insurance") insurancePaise += tx.amountPaise;
      else if (tx.category === "EMI" || tx.category === "Loan EMI") emiPaise += tx.amountPaise;
      else otherPaise += tx.amountPaise;
    }

    const byVehicle = new Map<string, { id: string; name: string; amountPaise: number }>();
    for (const tx of transactions) {
      if (tx.kind !== "EXPENSE" || tx.group !== "VEHICLE" || !inRange(tx.date, range)) continue;
      const vId = tx.vehicleId || "unassigned";
      const vName = tx.vehicleName || "General Vehicle Spending";
      const curr = byVehicle.get(vId) ?? { id: vId, name: vName, amountPaise: 0 };
      curr.amountPaise += tx.amountPaise;
      byVehicle.set(vId, curr);
    }

    return {
      fuelPaise,
      maintenancePaise,
      insurancePaise,
      emiPaise,
      otherPaise,
      byVehicle: [...byVehicle.values()].sort((a, b) => b.amountPaise - a.amountPaise),
    };
  }, [transactions, range]);

  // Farm crop-wise costs
  const farmCropBreakdown = useMemo(() => {
    const map = new Map<string, { id: string; name: string; amountPaise: number }>();
    for (const tx of transactions) {
      if (tx.kind !== "EXPENSE" || tx.group !== "FARM" || !inRange(tx.date, range)) continue;
      if (tx.category === "Labour" || tx.labourPaymentId) continue;
      const cId = tx.cropId || "unassigned";
      const cName = tx.cropName || "General Farm Materials";
      const curr = map.get(cId) ?? { id: cId, name: cName, amountPaise: 0 };
      curr.amountPaise += tx.amountPaise;
      map.set(cId, curr);
    }
    return [...map.values()].sort((a, b) => b.amountPaise - a.amountPaise);
  }, [transactions, range]);

  // Home grocery tracker
  const thisMonthRange = useMemo(() => rangeForPreset("THIS_MONTH"), []);
  const lastMonthRange = useMemo(() => rangeForPreset("LAST_MONTH"), []);
  const groceriesThisMonth = useMemo(
    () =>
      categoryTotals(transactions, {
        kind: "EXPENSE",
        group: "HOME",
        range: thisMonthRange,
      }).find((row) => row.category === "Groceries"),
    [transactions, thisMonthRange]
  );
  const groceriesLastMonth = useMemo(
    () =>
      categoryTotals(transactions, {
        kind: "EXPENSE",
        group: "HOME",
        range: lastMonthRange,
      }).find((row) => row.category === "Groceries"),
    [transactions, lastMonthRange]
  );

  const change =
    previousGroupAmount > 0
      ? Math.round(((groupAmount - previousGroupAmount) / previousGroupAmount) * 100)
      : null;

  const groceryRatio =
    (groceriesThisMonth?.amountPaise ?? 0) > 0 &&
    (groceriesLastMonth?.amountPaise ?? 0) > 0
      ? Math.round(
          ((groceriesThisMonth?.amountPaise ?? 0) /
            (groceriesLastMonth?.amountPaise ?? 1)) *
            100
        )
      : null;

  const openForTab = () => {
    openAdd(GROUP_META[tab].addType, undefined, GROUP_META[tab].defaults);
  };

  const openTransaction = (id: string) => {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;
    if (transaction.labourPaymentId) {
      router.push("/labour");
      return;
    }
    openAdd(undefined, transaction);
  };

  const addCategory = async () => {
    const clean = newCategory.trim();
    if (!clean) return;
    const group: ExpenseGroup = tab === "HOME" ? "HOME" : tab === "FARM" ? "FARM" : "VEHICLE";
    try {
      await addCustomCategory(group, clean);
      setNewCategory("");
      setShowNewCategory(false);
      setSelectedCategory(clean);
      notify(`“${clean}” added.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not add category.", "error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle")}
        right={
          <button
            type="button"
            onClick={() => openForTab()}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t("common.add")} {getTabLabel(tab)}
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        <PeriodFilter value={range} onChange={setRange} presets={PRESETS} compact />

        <Segmented
          options={[
            { value: "HOME", label: t("expenses.homeGroup"), count: counts.HOME },
            { value: "FARM", label: t("expenses.farmGroup"), count: counts.FARM },
            { value: "LABOUR", label: t("expenses.labourGroup"), count: counts.LABOUR },
            { value: "VEHICLE", label: t("expenses.vehicleGroup"), count: counts.VEHICLE },
          ]}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setSelectedCategory(null);
            setSelectedCropId("");
            setSelectedLandId("");
          }}
          ariaLabel={t("expenses.title")}
        />

        {/* Tab 1: Home Expenses */}
        {tab === "HOME" && (
          <>
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <HomeIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-ink">{getTabTitle("HOME")}</h2>
                  <p className="mt-0.5 text-[11.5px] leading-4 text-ink-secondary">
                    {getTabDesc("HOME")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-ink-muted">{t("common.total")} · {range.label}</p>
                  <p className="mt-0.5 text-[26px] font-semibold tracking-[-0.03em] text-ink">
                    {formatINR(groupAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-muted">
                    {percentOf(groupAmount, breakdown.totalPaise)}%
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-ink-secondary">
                    {counts.HOME === 1
                      ? t("expenses.recordsCount", { count: 1 })
                      : t("expenses.recordsCountPlural", { count: counts.HOME })}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={percentOf(groupAmount, breakdown.totalPaise)}
                  tone="brand"
                  size="md"
                />
              </div>
            </section>

            {previous && (
              <section className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-ink">
                      {t("expenses.compareVs", { period: previous.label })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {formatINR(previousGroupAmount)}
                    </p>
                  </div>
                  {change === null ? (
                    <StatusPill label="—" tone="neutral" />
                  ) : (
                    <StatusPill
                      label={`${change > 0 ? "+" : ""}${change}%`}
                      tone={change > 0 ? "negative" : change < 0 ? "positive" : "neutral"}
                      dot
                    />
                  )}
                </div>
                {change !== null && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-secondary">
                    {change > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-negative" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-positive" />
                    )}
                    {change > 0
                      ? `+${Math.abs(change)}%`
                      : `−${Math.abs(change)}%`}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-ink">{t("expenses.homeTitle")}</p>
                  <p className="text-[11px] text-ink-muted">{thisMonthRange.label}</p>
                </div>
                <Receipt className="h-4 w-4 text-brand-700" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-canvas/80 px-3 py-2.5">
                  <p className="text-[10.5px] text-ink-muted">{t("period.thisMonth")}</p>
                  <p className="mt-0.5 text-[17px] font-semibold text-ink">
                    {formatINR(groceriesThisMonth?.amountPaise ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas/80 px-3 py-2.5">
                  <p className="text-[10.5px] text-ink-muted">{t("period.lastMonth")}</p>
                  <p className="mt-0.5 text-[17px] font-semibold text-ink">
                    {formatINR(groceriesLastMonth?.amountPaise ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10.5px] text-ink-muted">
                  <span>{t("reports.thisMonthVsLast")}</span>
                  <span>{groceryRatio === null ? "—" : `${groceryRatio}%`}</span>
                </div>
                <ProgressBar
                  value={groceryRatio === null ? 0 : Math.min(100, groceryRatio)}
                  tone="brand"
                  size="md"
                />
              </div>
            </section>
          </>
        )}

        {/* Tab 2: Farm Expenses */}
        {tab === "FARM" && (
          <>
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-light text-sky">
                  <Sprout className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-ink">{getTabTitle("FARM")}</h2>
                  <p className="mt-0.5 text-[11.5px] leading-4 text-ink-secondary">
                    {getTabDesc("FARM")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-ink-muted">{t("common.total")} · {range.label}</p>
                  <p className="mt-0.5 text-[26px] font-semibold tracking-[-0.03em] text-ink">
                    {formatINR(groupAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-muted">
                    {percentOf(groupAmount, breakdown.totalPaise)}%
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-ink-secondary">
                    {counts.FARM === 1
                      ? t("expenses.recordsCount", { count: 1 })
                      : t("expenses.recordsCountPlural", { count: counts.FARM })}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={percentOf(groupAmount, breakdown.totalPaise)}
                  tone="sky"
                  size="md"
                />
              </div>
            </section>

            {/* Farm filter bar for Crop and Land parcel */}
            {(crops.length > 0 || lands.length > 0) && (
              <section className="rounded-2xl border border-line bg-white p-3">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <label className="text-[10.5px] font-semibold text-ink-muted uppercase">{t("farm.crops")}</label>
                    <select
                      className="select mt-1 h-9 text-[12px]"
                      value={selectedCropId}
                      onChange={(e) => setSelectedCropId(e.target.value)}
                    >
                      <option value="">{t("common.all")} {t("farm.crops")}</option>
                      {crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.season})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-ink-muted uppercase">{t("farm.lands")}</label>
                    <select
                      className="select mt-1 h-9 text-[12px]"
                      value={selectedLandId}
                      onChange={(e) => setSelectedLandId(e.target.value)}
                    >
                      <option value="">{t("common.all")} {t("farm.lands")}</option>
                      {lands.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* Crop-wise farm investment summary */}
            {farmCropBreakdown.length > 0 && (
              <section className="rounded-card border border-line bg-white p-4">
                <h3 className="section-title mb-2">{t("crop.expenseBreakdown")}</h3>
                <div className="space-y-2">
                  {farmCropBreakdown.map((item) => (
                    <div
                      key={item.id}
                      onClick={() =>
                        setSelectedCropId((curr) => (curr === item.id ? "" : item.id === "unassigned" ? "" : item.id))
                      }
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition ${
                        selectedCropId === item.id ? "bg-brand-50 text-brand-900" : "bg-canvas hover:bg-canvas/80 text-ink"
                      }`}
                    >
                      <span className="truncate text-[12.5px] font-medium">{item.name}</span>
                      <span className="font-semibold text-[12.5px]">{formatINR(item.amountPaise)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Tab 3: Labour Expenses */}
        {tab === "LABOUR" && (
          <>
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-light text-amber">
                  <Users className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-ink">{getTabTitle("LABOUR")}</h2>
                  <p className="mt-0.5 text-[11.5px] leading-4 text-ink-secondary">
                    {getTabDesc("LABOUR")}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-canvas/80 p-2.5">
                  <p className="text-[10px] text-ink-muted">{t("common.total")}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-ink">
                    {formatINR(labourStats.totalPaise)}
                  </p>
                  <p className="text-[9.5px] text-ink-muted">
                    {labourStats.totalWorkerDays === 1
                      ? t("labour.workerDay", { count: 1 })
                      : t("labour.workerDayPlural", { count: labourStats.totalWorkerDays })}
                  </p>
                </div>
                <div className="rounded-xl bg-positive-light/60 p-2.5">
                  <p className="text-[10px] text-positive">{t("labour.paidStatus")}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-positive">
                    {formatINR(labourStats.paidPaise)}
                  </p>
                  <p className="text-[9.5px] text-positive/80">
                    {labourStats.paidCount === 1
                      ? t("labour.paymentCount", { count: 1 })
                      : t("labour.paymentCountPlural", { count: labourStats.paidCount })}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-light/60 p-2.5">
                  <p className="text-[10px] text-amber">{t("labour.pendingStatus")}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-amber">
                    {formatINR(labourStats.pendingPaise)}
                  </p>
                  <p className="text-[9.5px] text-amber/80">
                    {labourStats.pendingCount === 1
                      ? t("labour.paymentCount", { count: 1 })
                      : t("labour.paymentCountPlural", { count: labourStats.pendingCount })}
                  </p>
                </div>
              </div>
            </section>

            {/* Pending & Partial Labour Payments Section */}
            {pendingLabour.length > 0 && (
              <section className="rounded-card border border-amber/40 bg-amber-light/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-amber-900">
                    {t("labour.unpaid")} ({pendingLabour.length})
                  </h3>
                  <span className="text-[11.5px] font-bold text-amber">
                    {formatINR(labourStats.pendingPaise)}
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {pendingLabour.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-white p-3 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[12.5px] font-semibold text-ink">
                            {item.workerName ? `${item.workerName} · ${item.activity}` : `${item.cropName} · ${item.activity}`}
                          </p>
                          <StatusPill
                            label={item.status === "PARTIAL" ? t("income.partial") : t("income.pending")}
                            tone={item.status === "PARTIAL" ? "amber" : "negative"}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {item.workers} × {item.days} · {formatDate(item.paymentDate)}
                        </p>
                        {item.status === "PARTIAL" && (
                          <p className="text-[10px] text-positive">
                            {t("labour.paid")}: {formatINR(item.paidPaise ?? 0)} · {t("labour.unpaid")}: {formatINR(item.remainingPaise ?? 0)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void markLabourPaid(item.id)}
                        className="ml-2 flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("labour.markPaid")}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Labour Activity Breakdown */}
            {labourStats.byActivity.length > 0 && (
              <section className="rounded-card border border-line bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="section-title">{t("labour.title")}</h3>
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="text-[11.5px] font-semibold text-brand-700"
                    >
                      {t("common.all")}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {labourStats.byActivity.map((act) => (
                    <button
                      key={act.name}
                      type="button"
                      onClick={() => setSelectedCategory((c) => (c === act.name ? null : act.name))}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                        selectedCategory === act.name ? "bg-amber-light text-amber-900 font-semibold" : "bg-canvas text-ink"
                      }`}
                    >
                      <span className="text-[12.5px]">{act.name}</span>
                      <span className="text-[12px] font-semibold">{formatINR(act.amountPaise)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Labour History Records */}
            <section className="overflow-hidden rounded-card border border-line bg-white">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <div>
                  <h2 className="section-title">{t("labour.title")} {t("common.history")}</h2>
                  <p className="text-[11.5px] text-ink-muted">
                    {filteredLabour.length === 1
                      ? t("expenses.recordsCount", { count: 1 })
                      : t("expenses.recordsCountPlural", { count: filteredLabour.length })}{" "}
                    · {range.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openForTab()}
                  className="flex h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-[11.5px] font-semibold text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("common.add")}
                </button>
              </div>
              {filteredLabour.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    compact
                    title={t("labour.noLabour")}
                    message={t("labour.subtitle")}
                    actionLabel={t("labour.addLabour")}
                    onAction={() => openForTab()}
                  />
                </div>
              ) : (
                <div className="divide-y divide-line/70">
                  {filteredLabour.map((p) => (
                    <div key={p.id} className="flex items-start justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-semibold text-ink">
                            {p.workerName ? `${p.workerName} · ${p.activity}` : `${p.cropName} · ${p.activity}`}
                          </p>
                          <StatusPill
                            label={p.status === "PAID" ? t("labour.paidStatus") : p.status === "PARTIAL" ? t("income.partial") : t("income.pending")}
                            tone={p.status === "PAID" ? "positive" : p.status === "PARTIAL" ? "amber" : "neutral"}
                          />
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-secondary">
                          {p.cropName}{p.landName ? ` · ${p.landName}` : ""}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-ink-muted">
                          {p.workers} × {p.days} · {formatDate(p.paymentDate)}
                        </p>
                        {p.status === "PARTIAL" && (
                          <p className="mt-0.5 text-[11px] text-amber font-medium">
                            {t("labour.paid")}: {formatINR(p.paidPaise ?? 0)} · {t("labour.unpaid")}: {formatINR(p.remainingPaise ?? 0)}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="text-[13px] font-semibold text-ink">{formatINR(p.amountPaise)}</p>
                        {p.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => void markLabourPaid(p.id)}
                            className="mt-1 text-[11px] font-semibold text-brand-700 underline"
                          >
                            {t("labour.markPaid")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Tab 4: Vehicle Expenses */}
        {tab === "VEHICLE" && (
          <>
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-light text-sky">
                  <Tractor className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-ink">{getTabTitle("VEHICLE")}</h2>
                  <p className="mt-0.5 text-[11.5px] leading-4 text-ink-secondary">
                    {getTabDesc("VEHICLE")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-ink-muted">{t("common.total")} · {range.label}</p>
                  <p className="mt-0.5 text-[26px] font-semibold tracking-[-0.03em] text-ink">
                    {formatINR(groupAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-muted">
                    {percentOf(groupAmount, breakdown.totalPaise)}%
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-ink-secondary">
                    {counts.VEHICLE === 1
                      ? t("expenses.recordsCount", { count: 1 })
                      : t("expenses.recordsCountPlural", { count: counts.VEHICLE })}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={percentOf(groupAmount, breakdown.totalPaise)}
                  tone="amber"
                  size="md"
                />
              </div>
            </section>

            {/* 4 Category Summary Tiles */}
            <section className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-line bg-white p-3">
                <div className="flex items-center gap-1.5 text-brand-700">
                  <Fuel className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase">{t("inventory.fuel")}</span>
                </div>
                <p className="mt-1 text-[17px] font-semibold text-ink">{formatINR(vehicleStats.fuelPaise)}</p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-3">
                <div className="flex items-center gap-1.5 text-sky">
                  <Wrench className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase">{t("vehicles.services")}</span>
                </div>
                <p className="mt-1 text-[17px] font-semibold text-ink">{formatINR(vehicleStats.maintenancePaise)}</p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-3">
                <div className="flex items-center gap-1.5 text-amber">
                  <Shield className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase">Insurance</span>
                </div>
                <p className="mt-1 text-[17px] font-semibold text-ink">{formatINR(vehicleStats.insurancePaise)}</p>
              </div>

              <div className="rounded-2xl border border-line bg-white p-3">
                <div className="flex items-center gap-1.5 text-ink-secondary">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase">EMI</span>
                </div>
                <p className="mt-1 text-[17px] font-semibold text-ink">{formatINR(vehicleStats.emiPaise)}</p>
              </div>
            </section>

            {/* Vehicle Fleet Breakdown */}
            {vehicleStats.byVehicle.length > 0 && (
              <section className="rounded-card border border-line bg-white p-4">
                <h3 className="section-title mb-2">{t("vehicles.title")}</h3>
                <div className="space-y-2">
                  {vehicleStats.byVehicle.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2"
                    >
                      <span className="text-[12.5px] font-medium text-ink">{v.name}</span>
                      <span className="text-[12.5px] font-semibold text-ink">{formatINR(v.amountPaise)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Category breakdown for HOME, FARM, VEHICLE */}
        {tab !== "LABOUR" && (
          <section className="rounded-card border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">{t("reports.categoryWise")}</h2>
                <p className="text-[11.5px] text-ink-muted">{range.label}</p>
              </div>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-[11.5px] font-semibold text-brand-700"
                >
                  {t("common.all")}
                </button>
              )}
            </div>

            {categoryRows.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  compact
                  icon={<Receipt className="h-5 w-5" />}
                  title={t("expenses.nothingHere")}
                  message={t("expenses.noRecordsHint")}
                  actionLabel={t("expenses.addExpense")}
                  onAction={() => openForTab()}
                />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {categoryRows.map((row) => (
                  <CategoryRow
                    key={row.category}
                    row={row}
                    total={groupAmount}
                    active={selectedCategory === row.category}
                    onClick={() =>
                      setSelectedCategory((current) =>
                        current === row.category ? null : row.category
                      )
                    }
                  />
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-line pt-3">
              {showNewCategory ? (
                <div className="flex gap-2">
                  <input
                    className="input h-10 flex-1 text-[13px]"
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder={t("expenses.newCategoryPlaceholder")}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-primary h-10 px-3 text-[12px]"
                    onClick={addCategory}
                  >
                    {t("common.add")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary h-10 px-3 text-[12px]"
                    onClick={() => {
                      setNewCategory("");
                      setShowNewCategory(false);
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="text-[12px] font-semibold text-brand-700"
                >
                  {t("expenses.addCustomCategory", { group: getTabLabel(tab) })}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Transaction History List for HOME, FARM, VEHICLE */}
        {tab !== "LABOUR" && (
          <section className="overflow-hidden rounded-card border border-line bg-white">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <div>
                <h2 className="section-title">
                  {selectedCategory ? t("expenses.categoryRecords", { category: selectedCategory }) : t("expenses.expenseHistory", { group: getTabLabel(tab) })}
                </h2>
                <p className="text-[11.5px] text-ink-muted">
                  {filteredTransactions.length === 1
                    ? t("expenses.recordsCount", { count: 1 })
                    : t("expenses.recordsCountPlural", { count: filteredTransactions.length })}{" "}
                  · {range.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openForTab()}
                className="flex h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-[11.5px] font-semibold text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("common.add")}
              </button>
            </div>
            {filteredTransactions.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState
                  compact
                  title={t("expenses.nothingHere")}
                  message={t("expenses.noRecordsHint")}
                  actionLabel={t("expenses.addExpense")}
                  onAction={() => openForTab()}
                />
              </div>
            ) : (
              <div className="divide-y divide-line/70">
                {filteredTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onClick={() => openTransaction(transaction.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function CategoryRow({
  row,
  total,
  active,
  onClick,
}: {
  row: CategoryTotal;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useApp();
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className={`truncate text-[12.5px] ${active ? "font-semibold text-brand-700" : "text-ink"}`}>
          {row.category}
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-ink">
          {formatINR(row.amountPaise)}
          <span className="ml-1.5 text-[10px] font-normal text-ink-muted">
            {percentOf(row.amountPaise, total)}%
          </span>
        </span>
      </div>
      <ProgressBar value={percentOf(row.amountPaise, total)} tone={active ? "brand" : "sky"} />
      <p className="mt-0.5 text-[10px] text-ink-muted">
        {row.count === 1
          ? t("expenses.recordsCount", { count: 1 })
          : t("expenses.recordsCountPlural", { count: row.count })}
      </p>
    </button>
  );
}
