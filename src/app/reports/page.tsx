"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Download,
  Home as HomeIcon,
  PiggyBank,
  Printer,
  Sprout,
  Tractor,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import PeriodFilter from "@/components/ui/PeriodFilter";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  exportAnnualSummaryCSV,
  exportCropProfitabilityCSV,
  exportHouseholdExpensesCSV,
  exportInventoryStockCSV,
  exportLoanLendingCSV,
  exportMonthlySummaryCSV,
  exportVehicleReportCSV,
} from "@/lib/export";
import {
  calculateTotals,
  cropFinancials,
  expenseBreakdown,
  expenseCategoryTotals,
  farmTotals,
  incomeCategoryTotals,
  isExpense,
  isReceivedIncome,
  labourSummary,
  loanInterestPaid,
  loanOutstanding,
  loanPrincipalRepaid,
  loanRepaid,
  loansDashboardStats,
  monthlyHistory,
  monthlyLoanCashflow,
  vehicleFinancials,
  yearlyHistory,
  type CategoryTotal,
} from "@/lib/finance";
import {
  formatDate,
  formatMonthKey,
  inRange,
  monthKey,
  monthRange,
  rangeForPreset,
} from "@/lib/dates";
import { formatINR, percentOf, sumPaise } from "@/lib/money";
import type { DateRange, Loan, PeriodPreset } from "@/lib/types";

type ReportTab =
  | "OVERVIEW"
  | "EXPENSES"
  | "FARM"
  | "VEHICLES"
  | "HOUSEHOLD"
  | "LOANS"
  | "HISTORY";

const PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "FINANCIAL_YEAR", "THIS_YEAR", "ALL_TIME"];

const TABS: { value: ReportTab; label: string }[] = [
  { value: "OVERVIEW", label: "Overview" },
  { value: "EXPENSES", label: "Spending" },
  { value: "FARM", label: "Farm" },
  { value: "VEHICLES", label: "Vehicles" },
  { value: "HOUSEHOLD", label: "Home" },
  { value: "LOANS", label: "Loans" },
  { value: "HISTORY", label: "History" },
];

export default function ReportsPage() {
  const {
    transactions,
    crops,
    lands,
    labourPayments,
    vehicles,
    cropSales,
    loans,
    inventory,
    t,
  } = useApp();
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("THIS_MONTH"));
  const [tab, setTab] = useState<ReportTab>("OVERVIEW");

  const tabLabels: Record<ReportTab, string> = {
    OVERVIEW: t("common.overview"),
    EXPENSES: t("reports.spending"),
    FARM: t("common.farm"),
    VEHICLES: t("common.vehicles"),
    HOUSEHOLD: t("common.home"),
    LOANS: t("common.loans"),
    HISTORY: t("reports.history"),
  };

  const totals = useMemo(
    () => calculateTotals(transactions, cropSales, range),
    [transactions, cropSales, range]
  );
  const breakdown = useMemo(
    () => expenseBreakdown(transactions, range),
    [transactions, range]
  );
  const incomeCats = useMemo(
    () => incomeCategoryTotals(transactions, range),
    [transactions, range]
  );
  const homeCats = useMemo(
    () => expenseCategoryTotals(transactions, "HOME", range),
    [transactions, range]
  );
  const farmCats = useMemo(
    () => expenseCategoryTotals(transactions, "FARM", range),
    [transactions, range]
  );
  const vehicleCats = useMemo(
    () => expenseCategoryTotals(transactions, "VEHICLE", range),
    [transactions, range]
  );
  const otherCats = useMemo(
    () => expenseCategoryTotals(transactions, "OTHER", range),
    [transactions, range]
  );
  const farm = useMemo(
    () => farmTotals(crops, lands, transactions, labourPayments, cropSales, range),
    [crops, lands, transactions, labourPayments, cropSales, range]
  );
  const labour = useMemo(
    () => labourSummary(labourPayments, range),
    [labourPayments, range]
  );
  const months = useMemo(() => monthlyHistory(transactions), [transactions]);
  const years = useMemo(() => yearlyHistory(transactions), [transactions]);

  const expenseCount = useMemo(
    () =>
      transactions.filter(
        (transaction) => isExpense(transaction) && inRange(transaction.date, range)
      ).length,
    [transactions, range]
  );

  const householdIncomePaise = useMemo(
    () =>
      sumPaise(
        transactions
          .filter(
            (transaction) =>
              isReceivedIncome(transaction) &&
              transaction.group === "HOME" &&
              inRange(transaction.date, range)
          )
          .map((transaction) => transaction.amountPaise)
      ),
    [transactions, range]
  );

  const homeMonths = useMemo(() => {
    const keys = new Set<string>();
    for (const transaction of transactions) {
      if (
        transaction.kind === "EXPENSE" &&
        transaction.group === "HOME" &&
        inRange(transaction.date, range)
      ) {
        keys.add(monthKey(transaction.date));
      }
    }
    return keys.size;
  }, [transactions, range]);
  const homeAveragePaise = homeMonths > 0 ? Math.round(breakdown.homePaise / homeMonths) : 0;

  const cropRows = useMemo(
    () =>
      crops
        .map((crop) => ({
          crop,
          financials: cropFinancials(crop, transactions, labourPayments, range, undefined, inventory),
        }))
        .sort(
          (a, b) =>
            b.financials.totalExpensesPaise +
            b.financials.totalIncomePaise -
            (a.financials.totalExpensesPaise + a.financials.totalIncomePaise)
        ),
    [crops, transactions, labourPayments, range, inventory]
  );

  const vehicleRows = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        vehicle,
        period: vehicleFinancials(vehicle.id, transactions, range),
        lifetime: vehicleFinancials(vehicle.id, transactions),
      })),
    [vehicles, transactions, range]
  );

  const linkedVehicleSpend = useMemo(
    () => sumPaise(vehicleRows.map((row) => row.period.totalPaise)),
    [vehicleRows]
  );
  const unlinkedVehicleSpend = Math.max(0, breakdown.vehiclePaise - linkedVehicleSpend);

  const hasAnyRecords =
    transactions.length > 0 ||
    crops.length > 0 ||
    vehicles.length > 0 ||
    labourPayments.length > 0;

  const selectMonth = (key: string) => {
    setRange(monthRange(key));
    setTab("OVERVIEW");
  };

  const selectYear = (year: string) => {
    setRange({
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: year,
      preset: "CUSTOM",
    });
    setTab("OVERVIEW");
  };

  const handleExport = () => {
    switch (tab) {
      case "OVERVIEW":
      case "EXPENSES":
        exportMonthlySummaryCSV(transactions, cropSales, range);
        break;
      case "FARM":
        exportCropProfitabilityCSV(crops, transactions, labourPayments, cropSales, inventory);
        break;
      case "VEHICLES":
        exportVehicleReportCSV(vehicles, transactions);
        break;
      case "HOUSEHOLD":
        exportHouseholdExpensesCSV(transactions, range);
        break;
      case "LOANS":
        exportLoanLendingCSV(loans);
        break;
      case "HISTORY":
        exportAnnualSummaryCSV(transactions, range.label);
        break;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        right={
          <div className="flex items-center gap-1.5 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="icon-button h-9 w-9 text-ink-secondary hover:text-ink"
              aria-label="Print report"
              title="Print report"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[12px] font-semibold text-brand-700 shadow-2xs hover:bg-brand-50"
              aria-label="Export CSV"
              title="Export CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        }
      />

      <main className="app-container space-y-4 py-4">
        <section className="space-y-2">
          <PeriodFilter value={range} onChange={setRange} presets={PRESETS} compact />
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-white p-1.5">
            {TABS.map((item) => {
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  aria-pressed={active}
                  className={`flex h-9 items-center justify-center rounded-xl text-[12px] font-semibold transition ${
                    active
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-ink-secondary active:bg-canvas"
                  }`}
                >
                  {tabLabels[item.value]}
                </button>
              );
            })}
          </div>
        </section>

        {!hasAnyRecords ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="No report yet"
            message="Add your first real record and this page will build a complete financial report from it."
            actionLabel="Add first record"
            actionHref="/"
          />
        ) : (
          <>
            {tab === "OVERVIEW" && (
              <OverviewTab
                range={range}
                totals={totals}
                breakdown={breakdown}
                incomeCats={incomeCats}
                farm={farm}
                labourPendingPaise={labour.pendingPaise}
                expenseCount={expenseCount}
                onOpenFarm={() => setTab("FARM")}
              />
            )}

            {tab === "EXPENSES" && (
              <ExpensesTab
                range={range}
                totalPaise={breakdown.totalPaise}
                expenseCount={expenseCount}
                breakdown={breakdown}
                homeCats={homeCats}
                farmCats={farmCats}
                vehicleCats={vehicleCats}
                otherCats={otherCats}
              />
            )}

            {tab === "FARM" && (
              <FarmTab
                range={range}
                farm={farm}
                labour={labour}
                cropRows={cropRows}
              />
            )}

            {tab === "VEHICLES" && (
              <VehiclesTab
                range={range}
                totalPaise={breakdown.vehiclePaise}
                vehicleCats={vehicleCats}
                vehicleRows={vehicleRows}
                unlinkedSpendPaise={unlinkedVehicleSpend}
              />
            )}

            {tab === "HOUSEHOLD" && (
              <HouseholdTab
                range={range}
                homeCats={homeCats}
                totalPaise={breakdown.homePaise}
                householdIncomePaise={householdIncomePaise}
                averagePaise={homeAveragePaise}
                activeMonths={homeMonths}
              />
            )}

            {tab === "LOANS" && (
              <LoansTab loans={loans} range={range} />
            )}

            {tab === "HISTORY" && (
              <HistoryTab
                months={months}
                years={years}
                onSelectMonth={selectMonth}
                onSelectYear={selectYear}
              />
            )}
          </>
        )}

        <p className="px-1 pb-2 text-[10.5px] leading-4 text-ink-muted">
          Reports use the dates saved with each record. Borrowed money and loan repayments are
          tracked separately from income and expenses. All amounts are in rupees.
        </p>
      </main>
    </div>
  );
}

function OverviewTab({
  range,
  totals,
  breakdown,
  incomeCats,
  farm,
  labourPendingPaise,
  expenseCount,
  onOpenFarm,
}: {
  range: DateRange;
  totals: ReturnType<typeof calculateTotals>;
  breakdown: ReturnType<typeof expenseBreakdown>;
  incomeCats: CategoryTotal[];
  farm: ReturnType<typeof farmTotals>;
  labourPendingPaise: number;
  expenseCount: number;
  onOpenFarm: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Net savings · {range.label}
            </p>
            <p
              className={`mt-1 text-[30px] font-semibold tracking-[-0.035em] ${
                totals.netPaise >= 0 ? "text-brand-800" : "text-negative"
              }`}
            >
              {totals.netPaise >= 0 ? "+" : "−"}
              {formatINR(totals.netPaise, { absolute: true })}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              {expenseCount} expense{expenseCount === 1 ? "" : "s"} · received money only
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <PiggyBank className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard
            label="Money in"
            value={formatINR(totals.incomePaise)}
            tone="positive"
            icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
            hint={
              totals.pendingIncomePaise > 0
                ? `${formatINR(totals.pendingIncomePaise)} pending`
                : "Received"
            }
          />
          <StatCard
            label="Money out"
            value={formatINR(totals.expensePaise)}
            tone="negative"
            icon={<ArrowUpRight className="h-3.5 w-3.5" />}
            hint="Paid expenses"
          />
        </div>

        {totals.pendingIncomePaise > 0 && (
          <p className="mt-3 rounded-xl bg-amber-light px-3 py-2 text-[11.5px] leading-4 text-amber">
            {formatINR(totals.pendingIncomePaise)} of income is still pending. It is not counted
            in money in or net savings until you mark it received.
          </p>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Where money went</h2>
            <p className="text-[11.5px] text-ink-muted">
              {formatINR(breakdown.totalPaise)} paid in {range.label.toLowerCase()}
            </p>
          </div>
          <Wallet className="h-4 w-4 text-ink-muted" />
        </div>
        <div className="mt-3 space-y-3">
          <BreakdownRow
            label="Home"
            amountPaise={breakdown.homePaise}
            totalPaise={breakdown.totalPaise}
            tone="brand"
          />
          <BreakdownRow
            label="Farm"
            amountPaise={breakdown.farmPaise}
            totalPaise={breakdown.totalPaise}
            tone="sky"
          />
          <BreakdownRow
            label="Labour"
            amountPaise={breakdown.labourPaise}
            totalPaise={breakdown.totalPaise}
            tone="amber"
          />
          <BreakdownRow
            label="Vehicles"
            amountPaise={breakdown.vehiclePaise}
            totalPaise={breakdown.totalPaise}
            tone="negative"
          />
          <BreakdownRow
            label="Other"
            amountPaise={breakdown.otherPaise}
            totalPaise={breakdown.totalPaise}
            tone="brand"
          />
        </div>
        {breakdown.totalPaise === 0 && (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-[11.5px] text-ink-muted">
            No expenses recorded in this period.
          </p>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Money in by category</h2>
            <p className="text-[11.5px] text-ink-muted">Received income only</p>
          </div>
          <TrendingUp className="h-4 w-4 text-positive" />
        </div>
        <div className="mt-3">
          <CategoryList
            rows={incomeCats}
            totalPaise={totals.incomePaise}
            tone="positive"
            emptyText="No received income in this period."
          />
        </div>
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="section-title">Farm snapshot</h2>
            <p className="text-[11.5px] text-ink-muted">
              Crop and labour profit for the selected period
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenFarm}
            className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-brand-700"
          >
            Open
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard
            label="Crop income"
            value={formatINR(farm.incomePaise)}
            tone="positive"
          />
          <StatCard
            label="Farm investment"
            value={formatINR(farm.investmentPaise)}
            tone="negative"
            hint="Crop costs + all labour"
          />
          <StatCard
            label={farm.profitPaise >= 0 ? "Farm profit" : "Farm loss"}
            value={formatINR(farm.profitPaise, { absolute: true })}
            tone={farm.profitPaise >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Pending labour"
            value={formatINR(labourPendingPaise)}
            tone={labourPendingPaise > 0 ? "amber" : "default"}
            hint="Cost, not cash yet"
          />
        </div>
      </section>
    </div>
  );
}

function ExpensesTab({
  range,
  totalPaise,
  expenseCount,
  breakdown,
  homeCats,
  farmCats,
  vehicleCats,
  otherCats,
}: {
  range: DateRange;
  totalPaise: number;
  expenseCount: number;
  breakdown: ReturnType<typeof expenseBreakdown>;
  homeCats: CategoryTotal[];
  farmCats: CategoryTotal[];
  vehicleCats: CategoryTotal[];
  otherCats: CategoryTotal[];
}) {
  const average = expenseCount > 0 ? Math.round(totalPaise / expenseCount) : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Total spending · {range.label}
            </p>
            <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-negative">
              {formatINR(totalPaise)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              {expenseCount} paid expense{expenseCount === 1 ? "" : "s"}
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-negative-light text-negative">
            <TrendingDown className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard label="Average expense" value={formatINR(average)} />
          <StatCard
            label="Largest group"
            value={largestGroup(breakdown)}
            hint={formatINR(
              Math.max(
                breakdown.homePaise,
                breakdown.farmPaise,
                breakdown.labourPaise,
                breakdown.vehiclePaise,
                breakdown.otherPaise
              )
            )}
          />
        </div>
      </section>

      <CategorySection
        title="Home expenses"
        hint="Groceries, bills and household costs"
        rows={homeCats}
        totalPaise={breakdown.homePaise}
        tone="brand"
        emptyText="No home expenses in this period."
      />
      <CategorySection
        title="Farm expenses"
        hint="Seeds, fertilizer, irrigation and paid labour"
        rows={farmCats}
        totalPaise={breakdown.farmPaise + breakdown.labourPaise}
        tone="sky"
        emptyText="No farm expenses in this period."
      />
      <CategorySection
        title="Vehicle expenses"
        hint="Fuel, service, insurance and EMI"
        rows={vehicleCats}
        totalPaise={breakdown.vehiclePaise}
        tone="amber"
        emptyText="No vehicle expenses in this period."
      />
      <CategorySection
        title="Other expenses"
        hint="Everything recorded outside home, farm and vehicles"
        rows={otherCats}
        totalPaise={breakdown.otherPaise}
        tone="negative"
        emptyText="No other expenses in this period."
      />
    </div>
  );
}

function FarmTab({
  range,
  farm,
  labour,
  cropRows,
}: {
  range: DateRange;
  farm: ReturnType<typeof farmTotals>;
  labour: ReturnType<typeof labourSummary>;
  cropRows: {
    crop: ReturnType<typeof useApp>["crops"][number];
    financials: ReturnType<typeof cropFinancials>;
  }[];
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Farm profit or loss · {range.label}
            </p>
            <p
              className={`mt-1 text-[30px] font-semibold tracking-[-0.035em] ${
                farm.profitPaise >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {farm.profitPaise >= 0 ? "+" : "−"}
              {formatINR(farm.profitPaise, { absolute: true })}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Crop income minus crop costs and all labour
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Sprout className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard
            label="Total land"
            value={`${farm.landAreaAcres.toLocaleString("en-IN")} acres`}
            hint={`${farm.totalCrops} crop${farm.totalCrops === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Active crops"
            value={String(farm.activeCrops)}
            tone="brand"
            hint="Growing now"
          />
          <StatCard
            label="Investment"
            value={formatINR(farm.investmentPaise)}
            tone="negative"
            hint="Crop costs + all labour"
          />
          <StatCard
            label="Crop income"
            value={formatINR(farm.incomePaise)}
            tone="positive"
            hint={
              farm.pendingIncomePaise > 0
                ? `${formatINR(farm.pendingIncomePaise)} pending`
                : "Received only"
            }
          />
        </div>
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Labour</h2>
            <p className="text-[11.5px] text-ink-muted">
              {labour.count} payment{labour.count === 1 ? "" : "s"} in this period
            </p>
          </div>
          <Users className="h-4 w-4 text-amber" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard label="Paid" value={formatINR(labour.paidPaise)} tone="positive" />
          <StatCard
            label="Pending"
            value={formatINR(labour.pendingPaise)}
            tone={labour.pendingPaise > 0 ? "amber" : "default"}
            hint="Cost, not cash yet"
          />
        </div>
        {labour.byActivity.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              By activity
            </p>
            {labour.byActivity.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[12.5px] text-ink-secondary">
                  {row.name}
                  <span className="ml-1.5 text-[10px] text-ink-muted">({row.count})</span>
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-ink">
                  {formatINR(row.amountPaise)}
                </span>
              </div>
            ))}
          </div>
        )}
        {labour.byActivity.length === 0 && (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-[11.5px] text-ink-muted">
            No labour payments in this period.
          </p>
        )}
        {labour.pendingPaise > 0 && (
          <p className="mt-3 rounded-xl bg-amber-light px-3 py-2 text-[11.5px] leading-4 text-amber">
            Pending wages are included in farm investment and profit, but not in cash paid.
          </p>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Crop profit and loss</h2>
            <p className="text-[11.5px] text-ink-muted">Costs include paid and pending labour</p>
          </div>
          <Link
            href="/farm"
            className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-brand-700"
          >
            Farm
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {cropRows.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              compact
              icon={<Sprout className="h-5 w-5" />}
              title="No crops yet"
              message="Add a crop to compare its income, cost and true profit."
              actionLabel="Open farm"
              actionHref="/farm"
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {cropRows.map(({ crop, financials }) => (
              <Link
                key={crop.id}
                href={`/farm/crop/${crop.id}`}
                className="block rounded-2xl border border-line bg-canvas/40 p-3 transition active:scale-[0.995]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{crop.name}</p>
                    <p className="truncate text-[10.5px] text-ink-muted">
                      {[crop.season, crop.year, `${crop.areaAcres} acre${crop.areaAcres === 1 ? "" : "s"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusPill
                    label={financials.profitPaise >= 0 ? "Profit" : "Loss"}
                    tone={financials.profitPaise >= 0 ? "positive" : "negative"}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-ink-muted">Income</p>
                    <p className="mt-0.5 truncate font-semibold text-positive">
                      {formatINR(financials.totalIncomePaise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Cost</p>
                    <p className="mt-0.5 truncate font-semibold text-ink">
                      {formatINR(financials.totalExpensesPaise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-muted">
                      {financials.profitPaise >= 0 ? "Profit" : "Loss"}
                    </p>
                    <p
                      className={`mt-0.5 truncate font-semibold ${
                        financials.profitPaise >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {formatINR(financials.profitPaise, { absolute: true })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-3 text-[10.5px] leading-4 text-ink-muted">
          Farm totals also include farm expenses that are not linked to a specific crop. Crop
          rows show only records linked to that crop.
        </p>
      </section>
    </div>
  );
}

function VehiclesTab({
  range,
  totalPaise,
  vehicleCats,
  vehicleRows,
  unlinkedSpendPaise,
}: {
  range: DateRange;
  totalPaise: number;
  vehicleCats: CategoryTotal[];
  vehicleRows: {
    vehicle: ReturnType<typeof useApp>["vehicles"][number];
    period: ReturnType<typeof vehicleFinancials>;
    lifetime: ReturnType<typeof vehicleFinancials>;
  }[];
  unlinkedSpendPaise: number;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Vehicle spending · {range.label}
            </p>
            <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-negative">
              {formatINR(totalPaise)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Kept separate from home and farm costs
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-light text-sky">
            <Tractor className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard label="Vehicles" value={String(vehicleRows.length)} hint="Tracked" />
          <StatCard
            label="Rental income"
            value={formatINR(
              sumPaise(vehicleRows.map((row) => row.period.rentalIncomePaise))
            )}
            tone="positive"
          />
        </div>
        {unlinkedSpendPaise > 0 && (
          <p className="mt-3 rounded-xl bg-amber-light px-3 py-2 text-[11.5px] leading-4 text-amber">
            {formatINR(unlinkedSpendPaise)} of vehicle spending is not linked to a vehicle. Open
            the expense and choose a vehicle to include it in a vehicle report.
          </p>
        )}
      </section>

      <CategorySection
        title="By category"
        hint="Vehicle costs in this period"
        rows={vehicleCats}
        totalPaise={totalPaise}
        tone="sky"
        emptyText="No vehicle expenses in this period."
      />

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">By vehicle</h2>
            <p className="text-[11.5px] text-ink-muted">Period cost and lifetime cost</p>
          </div>
          <Link
            href="/vehicles"
            className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-brand-700"
          >
            Vehicles
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {vehicleRows.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              compact
              icon={<Tractor className="h-5 w-5" />}
              title="No vehicles yet"
              message="Add a tractor, car or bike to track its running costs and dates."
              actionLabel="Open vehicles"
              actionHref="/vehicles"
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            {vehicleRows.map(({ vehicle, period, lifetime }) => (
              <Link
                key={vehicle.id}
                href={`/vehicles/${vehicle.id}`}
                className="block rounded-2xl border border-line bg-canvas/40 p-3 transition active:scale-[0.995]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{vehicle.name}</p>
                    <p className="truncate text-[10.5px] uppercase tracking-wide text-ink-muted">
                      {vehicle.registrationNumber} · {vehicle.type}
                    </p>
                  </div>
                  <StatusPill
                    label={vehicle.status === "ACTIVE" ? "Active" : "Sold"}
                    tone={vehicle.status === "ACTIVE" ? "positive" : "neutral"}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-ink-muted">In period</p>
                    <p className="mt-0.5 truncate font-semibold text-ink">
                      {formatINR(period.totalPaise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Lifetime</p>
                    <p className="mt-0.5 truncate font-semibold text-ink">
                      {formatINR(lifetime.totalPaise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Rental in</p>
                    <p className="mt-0.5 truncate font-semibold text-positive">
                      {formatINR(period.rentalIncomePaise)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HouseholdTab({
  range,
  homeCats,
  totalPaise,
  householdIncomePaise,
  averagePaise,
  activeMonths,
}: {
  range: DateRange;
  homeCats: CategoryTotal[];
  totalPaise: number;
  householdIncomePaise: number;
  averagePaise: number;
  activeMonths: number;
}) {
  const net = householdIncomePaise - totalPaise;
  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Household report · {range.label}
            </p>
            <p
              className={`mt-1 text-[28px] font-semibold tracking-[-0.03em] ${
                net >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {net >= 0 ? "+" : "−"}
              {formatINR(net, { absolute: true })}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              Household income minus home expenses
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <HomeIcon className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard
            label="Household income"
            value={formatINR(householdIncomePaise)}
            tone="positive"
          />
          <StatCard
            label="Home expenses"
            value={formatINR(totalPaise)}
            tone="negative"
          />
          <StatCard
            label="Average per month"
            value={formatINR(averagePaise)}
            hint={`${activeMonths} active month${activeMonths === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Categories used"
            value={String(homeCats.length)}
            hint="Home expense types"
          />
        </div>
      </section>

      <CategorySection
        title="Home spending by category"
        hint="Every rupee recorded under home"
        rows={homeCats}
        totalPaise={totalPaise}
        tone="brand"
        emptyText="No home expenses in this period."
      />

      <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
        The monthly average uses only months with at least one home expense in the selected
        period. Household income includes salary, business and other home income that you marked
        received.
      </div>
    </div>
  );
}

function HistoryTab({
  months,
  years,
  onSelectMonth,
  onSelectYear,
}: {
  months: ReturnType<typeof monthlyHistory>;
  years: ReturnType<typeof yearlyHistory>;
  onSelectMonth: (key: string) => void;
  onSelectYear: (year: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Browse by month</h2>
            <p className="text-[11.5px] text-ink-muted">
              Tap a month to open its full report
            </p>
          </div>
          <CalendarDays className="h-4 w-4 text-ink-muted" />
        </div>
        {months.length === 0 ? (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-[11.5px] text-ink-muted">
            No months with records yet.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-line/70">
            {months.map((month) => (
              <button
                key={month.key}
                type="button"
                onClick={() => onSelectMonth(month.key)}
                className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">
                    {formatMonthKey(month.key)}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-ink-muted">
                    {month.count} record{month.count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-[12px] font-semibold ${
                      month.netPaise >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {month.netPaise >= 0 ? "+" : "−"}
                    {formatINR(month.netPaise, { absolute: true })}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-ink-muted">
                    In {formatINR(month.incomePaise)} · Out {formatINR(month.expensePaise)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Browse by year</h2>
            <p className="text-[11.5px] text-ink-muted">Yearly totals from real records</p>
          </div>
          <BarChart3 className="h-4 w-4 text-ink-muted" />
        </div>
        {years.length === 0 ? (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-[11.5px] text-ink-muted">
            No years with records yet.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-line/70">
            {years.map((year) => (
              <button
                key={year.year}
                type="button"
                onClick={() => onSelectYear(year.year)}
                className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink">{year.year}</span>
                  <span className="mt-0.5 block text-[10.5px] text-ink-muted">
                    In {formatINR(year.incomePaise)} · Out {formatINR(year.expensePaise)}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[12px] font-semibold ${
                    year.netPaise >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {year.netPaise >= 0 ? "+" : "−"}
                  {formatINR(year.netPaise, { absolute: true })}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
        History uses all saved records, not just the current filter. Tapping a month or year
        applies that period to the rest of the report.
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  amountPaise,
  totalPaise,
  tone,
}: {
  label: string;
  amountPaise: number;
  totalPaise: number;
  tone: "brand" | "positive" | "negative" | "amber" | "sky";
}) {
  const percent = percentOf(amountPaise, totalPaise);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-secondary">{label}</span>
        <span className="text-[12.5px] font-semibold text-ink">
          {formatINR(amountPaise)}
          <span className="ml-1.5 text-[10px] font-normal text-ink-muted">{percent}%</span>
        </span>
      </div>
      <div className="mt-1.5">
        <ProgressBar value={percent} tone={tone} size="sm" />
      </div>
    </div>
  );
}

function CategorySection({
  title,
  hint,
  rows,
  totalPaise,
  tone,
  emptyText,
}: {
  title: string;
  hint: string;
  rows: CategoryTotal[];
  totalPaise: number;
  tone: "brand" | "positive" | "negative" | "amber" | "sky";
  emptyText: string;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="text-[11.5px] text-ink-muted">{hint}</p>
        </div>
        <span className="shrink-0 text-[12.5px] font-semibold text-ink">
          {formatINR(totalPaise)}
        </span>
      </div>
      <div className="mt-3">
        <CategoryList rows={rows} totalPaise={totalPaise} tone={tone} emptyText={emptyText} />
      </div>
    </section>
  );
}

function CategoryList({
  rows,
  totalPaise,
  tone,
  emptyText,
}: {
  rows: CategoryTotal[];
  totalPaise: number;
  tone: "brand" | "positive" | "negative" | "amber" | "sky";
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-canvas px-3 py-2.5 text-[11.5px] text-ink-muted">{emptyText}</p>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const percent = percentOf(row.amountPaise, totalPaise);
        return (
          <div key={row.category}>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[12.5px] text-ink-secondary">
                {row.category}
                <span className="ml-1.5 text-[10px] text-ink-muted">
                  {row.count} entr{row.count === 1 ? "y" : "ies"}
                </span>
              </span>
              <span className="shrink-0 text-[12.5px] font-semibold text-ink">
                {formatINR(row.amountPaise)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ProgressBar value={percent} tone={tone} size="sm" />
              </div>
              <span className="w-7 shrink-0 text-right text-[10px] text-ink-muted">
                {percent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function largestGroup(breakdown: ReturnType<typeof expenseBreakdown>): string {
  const groups = [
    { label: "Home", amount: breakdown.homePaise },
    { label: "Farm", amount: breakdown.farmPaise + breakdown.labourPaise },
    { label: "Vehicles", amount: breakdown.vehiclePaise },
    { label: "Other", amount: breakdown.otherPaise },
  ].sort((a, b) => b.amount - a.amount);
  if (!groups[0] || groups[0].amount <= 0) return "None";
  return groups[0].label;
}

function LoansTab({ loans, range }: { loans: Loan[]; range: DateRange }) {
  const stats = useMemo(() => loansDashboardStats(loans, range), [loans, range]);
  const monthly = useMemo(() => monthlyLoanCashflow(loans, range), [loans, range]);

  const borrowedLoans = useMemo(
    () => loans.filter((l) => l.type === "BORROWED"),
    [loans]
  );
  const lentRecords = useMemo(
    () => loans.filter((l) => l.type === "LENT"),
    [loans]
  );

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="section-title">Loans & Lending Summary</h2>
        <p className="text-[11.5px] text-ink-muted">
          Liabilities owed and capital to be recovered
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <StatCard
            label="Borrowed Debt"
            value={formatINR(stats.totalBorrowedPrincipalOutstandingPaise)}
            tone="negative"
            sub={`${stats.activeBorrowedCount} active loans`}
          />
          <StatCard
            label="Money Lent"
            value={formatINR(stats.totalLentPrincipalOutstandingPaise)}
            tone="positive"
            sub={`${stats.activeLentCount} active lending`}
          />
          <StatCard
            label="Principal Repaid"
            value={formatINR(stats.totalPrincipalRepaidPaise)}
            tone="positive"
            sub={`Total: ${formatINR(stats.totalRepaymentsMadePaise)}`}
          />
          <StatCard
            label="Interest Paid"
            value={formatINR(stats.totalInterestPaidPaise)}
            tone="negative"
            sub="Financing cost"
          />
        </div>
      </section>

      {/* Borrowed Loans List */}
      <section className="rounded-card border border-line bg-white p-4">
        <h3 className="section-title">Borrowed Loans ({borrowedLoans.length})</h3>
        {borrowedLoans.length === 0 ? (
          <p className="mt-2 text-[11.5px] text-ink-muted">No borrowed loans recorded.</p>
        ) : (
          <div className="mt-3 divide-y divide-line/60">
            {borrowedLoans.map((loan) => {
              const outstanding = loanOutstanding(loan);
              const repaid = loanRepaid(loan);
              return (
                <div key={loan.id} className="py-2.5 flex items-center justify-between text-[12px]">
                  <div>
                    <p className="font-semibold text-ink">{loan.partyName}</p>
                    <p className="text-[11px] text-ink-muted">
                      Original: {formatINR(loan.principalPaise)} · Repaid: {formatINR(repaid)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-negative">{formatINR(outstanding)}</p>
                    <StatusPill
                      label={outstanding <= 0 ? "Settled" : "Active"}
                      tone={outstanding <= 0 ? "positive" : "brand"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Money Lent List */}
      <section className="rounded-card border border-line bg-white p-4">
        <h3 className="section-title">Money Lent to Others ({lentRecords.length})</h3>
        {lentRecords.length === 0 ? (
          <p className="mt-2 text-[11.5px] text-ink-muted">No lending records found.</p>
        ) : (
          <div className="mt-3 divide-y divide-line/60">
            {lentRecords.map((loan) => {
              const outstanding = loanOutstanding(loan);
              const collected = loanRepaid(loan);
              return (
                <div key={loan.id} className="py-2.5 flex items-center justify-between text-[12px]">
                  <div>
                    <p className="font-semibold text-ink">{loan.partyName}</p>
                    <p className="text-[11px] text-ink-muted">
                      Original: {formatINR(loan.principalPaise)} · Collected: {formatINR(collected)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-positive">{formatINR(outstanding)}</p>
                    <StatusPill
                      label={outstanding <= 0 ? "Settled" : "Active"}
                      tone={outstanding <= 0 ? "positive" : "brand"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Monthly Cashflow */}
      {monthly.length > 0 && (
        <section className="rounded-card border border-line bg-white p-4">
          <h3 className="section-title">Monthly Loan & Lending Cashflow</h3>
          <div className="mt-3 space-y-2">
            {monthly.map((m) => (
              <div key={m.month} className="rounded-xl border border-line bg-canvas p-3 text-[11.5px] space-y-1">
                <p className="font-semibold text-ink">{m.month}</p>
                <div className="grid grid-cols-2 gap-2 text-ink-secondary">
                  <span>Repaid: {formatINR(m.principalRepaymentsPaise)}</span>
                  <span>Interest Paid: {formatINR(m.interestPaidPaise)}</span>
                  <span>Recovered: {formatINR(m.principalCollectionsPaise)}</span>
                  <span>Interest Earned: {formatINR(m.interestReceivedPaise)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
