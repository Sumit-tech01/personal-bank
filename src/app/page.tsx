"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BellPlus,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Home as HomeIcon,
  Package,
  PiggyBank,
  Receipt,
  Scale,
  ShieldCheck,
  Sprout,
  Tractor,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import BalanceCard from "@/components/BalanceCard";
import ExpenseCategoryCard from "@/components/ExpenseCategoryCard";
import QuickActionButton from "@/components/QuickActionButton";
import ReminderCard from "@/components/ReminderCard";
import EmptyState from "@/components/ui/EmptyState";
import PeriodFilter from "@/components/ui/PeriodFilter";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusPill from "@/components/ui/StatusPill";
import {
  expenseBreakdown,
  familyFinancialPosition,
  generateUnifiedActivityFeed,
  incomeBreakdown,
  reminderBuckets,
  unifiedFinancialMetrics,
} from "@/lib/finance";
import { formatHomeDate, rangeForPreset, relativeDayLabel } from "@/lib/dates";
import { formatINR, percentOf } from "@/lib/money";
import type { DateRange, PeriodPreset, UnifiedActivityItem } from "@/lib/types";

const HOME_PRESETS: PeriodPreset[] = [
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "FINANCIAL_YEAR",
  "THIS_YEAR",
];

export default function HomePage() {
  const {
    account,
    transactions,
    cropSales,
    loans,
    labourPayments,
    inventory,
    vehicles,
    familyMembers,
    reminders,
    openAdd,
    completeReminder,
    reopenReminder,
  } = useApp();
  const router = useRouter();

  const [range, setRange] = useState<DateRange>(() => rangeForPreset("THIS_MONTH"));
  const [selectedMemberId, setSelectedMemberId] = useState<string>("ALL");

  // Phase 9: Unified Metrics computation
  const metrics = useMemo(
    () =>
      unifiedFinancialMetrics({
        transactions,
        cropSales,
        loans,
        labourPayments,
        inventory,
        vehicles,
        range,
      }),
    [transactions, cropSales, loans, labourPayments, inventory, vehicles, range]
  );

  // Spending Breakdown
  const spending = useMemo(
    () => expenseBreakdown(transactions, range),
    [transactions, range]
  );

  // Income Breakdown
  const income = useMemo(
    () => incomeBreakdown(transactions, cropSales, range),
    [transactions, cropSales, range]
  );

  // Family Position
  const family = useMemo(
    () =>
      familyFinancialPosition({
        transactions,
        familyMembers,
        loans,
        range,
      }),
    [transactions, familyMembers, loans, range]
  );

  // Unified Chronological Activity Feed
  const activityFeed = useMemo(
    () =>
      generateUnifiedActivityFeed({
        transactions,
        cropSales,
        loans,
        inventory,
        limit: 10,
      }),
    [transactions, cropSales, loans, inventory]
  );

  // Reminders
  const buckets = useMemo(() => reminderBuckets(reminders), [reminders]);
  const attention = buckets.overdue.length + buckets.today.length;

  const hasAnyRecords =
    transactions.length > 0 ||
    cropSales.length > 0 ||
    loans.length > 0 ||
    inventory.length > 0 ||
    vehicles.length > 0 ||
    reminders.length > 0;

  const farmExpenseTotalPaise = spending.farmPaise + spending.labourPaise;

  const handleOpenActivity = (item: UnifiedActivityItem) => {
    if (item.entity === "transaction") {
      const tx = transactions.find((t) => t.id === item.recordId);
      if (!tx) return;
      if (tx.labourPaymentId) {
        router.push("/labour");
        return;
      }
      openAdd(undefined, tx);
    } else if (item.entity === "cropsale") {
      router.push("/farm");
    } else if (item.entity === "loan") {
      router.push("/loans");
    } else if (item.entity === "inventory" || item.entity === "usage" || item.entity === "purchase") {
      router.push("/inventory");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Application Header */}
      <header className="pt-safe">
        <div className="app-container flex items-center gap-3 pb-2 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              {formatHomeDate()}
            </p>
            <h1 className="mt-0.5 truncate text-[24px] font-semibold tracking-[-0.035em] text-ink">
              Personal Bank
            </h1>
            <p className="mt-0.5 truncate text-[12px] text-ink-secondary">
              Hello, {account?.name?.split(" ")[0] ?? "friend"} · Your Family. Your Farm. Your Finances.
            </p>
          </div>
          <Link
            href="/reconciliation"
            className="icon-button relative h-10 w-10 text-brand-700 hover:bg-brand-50"
            aria-label="Reconciliation Center"
            title="Reconciliation Center"
          >
            <ShieldCheck className="h-[20px] w-[20px]" />
          </Link>
          <Link
            href="/reminders"
            className="icon-button relative h-10 w-10"
            aria-label="Reminders and notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {attention > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-negative px-1 text-[9px] font-bold text-white ring-2 ring-canvas">
                {attention > 9 ? "9+" : attention}
              </span>
            )}
          </Link>
          <Link
            href="/more"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800"
            aria-label="Profile and more"
          >
            {account?.name?.trim().charAt(0).toUpperCase() ?? "S"}
          </Link>
        </div>
      </header>

      <main className="app-container space-y-4 pb-8 pt-1">
        {/* Available Cash Balance & Period Overview Card */}
        <BalanceCard
          balancePaise={metrics.currentCashBalancePaise}
          incomePaise={metrics.incomeReceivedPaise}
          expensePaise={metrics.expensesPaidPaise}
          periodLabel={`${range.label} cashflow`}
          pendingIncomePaise={metrics.incomePendingPaise}
          periodClosingBalancePaise={metrics.periodClosingBalancePaise}
        />

        {/* Period Selector */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h2 className="section-title text-[13px]">Financial Period</h2>
            <span className="text-[11px] text-ink-muted">
              Closing: {formatINR(metrics.periodClosingBalancePaise)}
            </span>
          </div>
          <PeriodFilter
            value={range}
            onChange={setRange}
            presets={HOME_PRESETS}
            compact
          />
        </section>

        {/* 8-Metric Primary Financial Intelligence Grid */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Financial Position</h2>
              <p className="text-[11.5px] text-ink-muted">
                Complete overview for {range.label.toLowerCase()}
              </p>
            </div>
            <Link
              href="/reports"
              className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
            >
              Reports
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* 1. Available Cash Balance */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-brand-700">
                <Wallet className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Cash on Hand
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-ink">
                {formatINR(metrics.currentCashBalancePaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Lifetime cash balance</p>
            </div>

            {/* 2. Total Income Received */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-positive">
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Money In
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-positive">
                +{formatINR(metrics.incomeReceivedPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                {metrics.incomePendingPaise > 0
                  ? `${formatINR(metrics.incomePendingPaise)} pending`
                  : "Received in period"}
              </p>
            </div>

            {/* 3. Total Expenses Paid */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-negative">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Money Out
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-negative">
                −{formatINR(metrics.expensesPaidPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                {metrics.expensesPendingPaise > 0
                  ? `${formatINR(metrics.expensesPendingPaise)} unpaid labour`
                  : "Paid in period"}
              </p>
            </div>

            {/* 4. Net Cashflow */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-brand-700">
                <PiggyBank className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Net Cashflow
                </span>
              </div>
              <p
                className={`mt-1 text-[17px] font-bold tracking-tight ${
                  metrics.netCashflowPaise >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {metrics.netCashflowPaise >= 0 ? "+" : "−"}
                {formatINR(metrics.netCashflowPaise, { absolute: true })}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Period cash surplus</p>
            </div>

            {/* 5. Outstanding Receivables */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-sky">
                <HandCoins className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Receivables
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-sky">
                {formatINR(metrics.totalReceivablesPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Lent & pending sales</p>
            </div>

            {/* 6. Outstanding Payables */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber">
                <CreditCard className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Payables
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-amber">
                {formatINR(metrics.totalPayablesPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Loans, suppliers, labour</p>
            </div>

            {/* 7. Borrowed Loan Balance */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-negative">
                <TrendingDown className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Borrowed Debt
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-negative">
                {formatINR(metrics.borrowedPrincipalOutstandingPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Principal remaining</p>
            </div>

            {/* 8. Money Lent Outstanding */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-positive">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  Money Lent
                </span>
              </div>
              <p className="mt-1 text-[17px] font-bold tracking-tight text-positive">
                {formatINR(metrics.lentPrincipalOutstandingPaise)}
              </p>
              <p className="mt-0.5 text-[10px] text-ink-muted">Owed to family</p>
            </div>
          </div>
        </section>

        {/* Net Worth & Asset Position Card */}
        <section className="rounded-card border border-brand-200 bg-gradient-to-br from-brand-50/60 to-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-800">
                Asset & Liability Position
              </span>
              <h3 className="mt-0.5 text-[22px] font-bold tracking-tight text-brand-950">
                Net Worth: {formatINR(metrics.netWorthPaise)}
              </h3>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
              <Scale className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-brand-200/70 bg-white/80 p-3">
              <p className="text-[11px] font-semibold text-positive uppercase tracking-wide">
                Total Assets · {formatINR(metrics.totalAssetsPaise)}
              </p>
              <div className="mt-2 space-y-1 text-[11px] text-ink-secondary">
                <div className="flex justify-between">
                  <span>Cash on Hand</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.currentCashBalancePaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Money Lent</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.lentPrincipalOutstandingPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vehicle Assets</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.vehicleAssetValuePaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inventory Stock</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.inventoryValuationPaise)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white/80 p-3">
              <p className="text-[11px] font-semibold text-negative uppercase tracking-wide">
                Total Liabilities · {formatINR(metrics.totalLiabilitiesPaise)}
              </p>
              <div className="mt-2 space-y-1 text-[11px] text-ink-secondary">
                <div className="flex justify-between">
                  <span>Borrowed Loans</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.borrowedPrincipalOutstandingPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Supplier Payables</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.supplierPayablesPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Labour</span>
                  <span className="font-semibold text-ink">{formatINR(metrics.labourPayablesPaise)}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[10px] text-ink-muted">
            Accurate, non-duplicative accounting: vehicles recorded at purchase value, stock at cost, and loans exclude double counts.
          </p>
        </section>

        {/* Where Money Went (Spending Breakdown) */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="section-title">Where Money Went</h2>
              <p className="text-[11.5px] text-ink-muted">
                {formatINR(spending.totalPaise)} total paid in {range.label.toLowerCase()}
              </p>
            </div>
            <Link
              href="/expenses"
              className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
            >
              All expenses
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <ExpenseCategoryCard
              label="Household"
              amountPaise={spending.homePaise}
              totalPaise={spending.totalPaise}
              icon={<HomeIcon className="h-[18px] w-[18px]" />}
              tone="brand"
              href="/expenses?group=HOME"
            />
            <ExpenseCategoryCard
              label="Farm"
              amountPaise={farmExpenseTotalPaise}
              totalPaise={spending.totalPaise}
              icon={<Sprout className="h-[18px] w-[18px]" />}
              tone="sky"
              href="/expenses?group=FARM"
            />
            <ExpenseCategoryCard
              label="Paid Labour"
              amountPaise={spending.labourPaise}
              totalPaise={spending.totalPaise}
              icon={<Users className="h-[18px] w-[18px]" />}
              tone="amber"
              href="/labour"
            />
            <ExpenseCategoryCard
              label="Vehicles"
              amountPaise={spending.vehiclePaise}
              totalPaise={spending.totalPaise}
              icon={<Tractor className="h-[18px] w-[18px]" />}
              tone="amber"
              href="/expenses?group=VEHICLE"
            />
            <ExpenseCategoryCard
              label="Financing / Interest"
              amountPaise={spending.financingPaise}
              totalPaise={spending.totalPaise}
              icon={<CreditCard className="h-[18px] w-[18px]" />}
              tone="negative"
              href="/loans"
            />
            <ExpenseCategoryCard
              label="Other Expenses"
              amountPaise={spending.otherPaise}
              totalPaise={spending.totalPaise}
              icon={<CircleDollarSign className="h-[18px] w-[18px]" />}
              tone="neutral"
              href="/expenses?group=OTHER"
            />
          </div>
        </section>

        {/* Where Money Came From (Income Breakdown) */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Where Money Came From</h2>
              <p className="text-[11.5px] text-ink-muted">
                {formatINR(income.totalReceivedPaise)} received in {range.label.toLowerCase()}
              </p>
            </div>
            <Link
              href="/transactions?kind=INCOME"
              className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
            >
              Income records
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 space-y-3">
            {/* Crop Sales */}
            <IncomeRow
              label="Crop Sales"
              receivedPaise={income.cropSalesReceivedPaise}
              pendingPaise={income.cropSalesPendingPaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />

            {/* Milk & Produce */}
            <IncomeRow
              label="Milk & Produce Sales"
              receivedPaise={income.milkAndProducePaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />

            {/* Tractor Rental */}
            <IncomeRow
              label="Tractor & Machinery Rental"
              receivedPaise={income.tractorAndRentalPaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />

            {/* Household Salary */}
            <IncomeRow
              label="Household Salary / Wages"
              receivedPaise={income.householdSalaryPaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />

            {/* Business Income */}
            <IncomeRow
              label="Business & Trade"
              receivedPaise={income.businessIncomePaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />

            {/* Interest Received */}
            <IncomeRow
              label="Interest Received"
              receivedPaise={income.interestReceivedPaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />

            {/* Other Income */}
            <IncomeRow
              label="Other Farming & Personal Income"
              receivedPaise={income.otherIncomePaise}
              totalReceivedPaise={income.totalReceivedPaise}
            />
          </div>

          {income.totalReceivedPaise === 0 && income.totalPendingPaise === 0 && (
            <p className="mt-2 rounded-xl bg-canvas p-3 text-[11.5px] text-ink-muted">
              No income recorded in this period.
            </p>
          )}
        </section>

        {/* Family Financial Position */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Family Financial Position</h2>
              <p className="text-[11.5px] text-ink-muted">
                Household income, spending & member tracking
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <HomeIcon className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-canvas p-2.5">
              <p className="text-[10.5px] uppercase font-semibold text-ink-muted">Household In</p>
              <p className="text-[14px] font-bold text-positive">
                +{formatINR(family.householdIncomePaise)}
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-2.5">
              <p className="text-[10.5px] uppercase font-semibold text-ink-muted">Household Out</p>
              <p className="text-[14px] font-bold text-negative">
                −{formatINR(family.householdExpensesPaise)}
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-2.5">
              <p className="text-[10.5px] uppercase font-semibold text-ink-muted">Personal Lent</p>
              <p className="text-[14px] font-bold text-sky">
                {formatINR(family.familyReceivablesPaise)}
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-2.5">
              <p className="text-[10.5px] uppercase font-semibold text-ink-muted">Personal Loans</p>
              <p className="text-[14px] font-bold text-amber">
                {formatINR(family.familyLiabilitiesPaise)}
              </p>
            </div>
          </div>

          {family.memberBreakdown.length > 0 && (
            <div className="mt-3 border-t border-line/60 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Family Member Spending
              </p>
              <div className="space-y-1.5">
                {family.memberBreakdown.map((m) => (
                  <div
                    key={m.memberId}
                    className="flex items-center justify-between rounded-lg bg-canvas/60 px-2.5 py-1.5 text-[11.5px]"
                  >
                    <div>
                      <span className="font-semibold text-ink">{m.memberName}</span>
                      <span className="ml-1 text-[10px] text-ink-muted">({m.relation})</span>
                    </div>
                    <span className="font-semibold text-ink">
                      {formatINR(m.totalSpendPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="section-title mb-2">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            <QuickActionButton
              label="Money In"
              hint="Income"
              icon={<ArrowDownLeft className="h-4 w-4" />}
              tone="positive"
              onClick={() => openAdd("INCOME")}
            />
            <QuickActionButton
              label="Home Expense"
              hint="Bills, grocery"
              icon={<Receipt className="h-4 w-4" />}
              tone="negative"
              onClick={() => openAdd("HOME_EXPENSE")}
            />
            <QuickActionButton
              label="Farm Expense"
              hint="Seeds, fertilizer"
              icon={<Sprout className="h-4 w-4" />}
              tone="brand"
              onClick={() => openAdd("FARM_EXPENSE")}
            />
            <QuickActionButton
              label="Vehicle"
              hint="Fuel, repair"
              icon={<Tractor className="h-4 w-4" />}
              tone="sky"
              onClick={() => openAdd("VEHICLE_EXPENSE")}
            />
            <QuickActionButton
              label="Labour"
              hint="Wages"
              icon={<Users className="h-4 w-4" />}
              tone="amber"
              onClick={() => openAdd("LABOUR")}
            />
            <QuickActionButton
              label="Loan / Lent"
              hint="Borrow or lend"
              icon={<HandCoins className="h-4 w-4" />}
              tone="brand"
              onClick={() => openAdd("LOAN")}
            />
          </div>
        </section>

        {/* First Record Empty State */}
        {!hasAnyRecords && (
          <section className="rounded-card border border-brand-200 bg-brand-50 p-4">
            <p className="text-[14px] font-semibold text-brand-900">Start with one real record</p>
            <p className="mt-1 text-[12px] leading-5 text-brand-800/80">
              Add money you received, an expense you paid, or stock you purchased. Your family
              dashboard, farm intelligence and net worth reports will build automatically from your real entries.
            </p>
            <button
              type="button"
              onClick={() => openAdd("INCOME")}
              className="btn-primary mt-3 h-10 px-4 text-[12.5px]"
            >
              Add first record
            </button>
          </section>
        )}

        {/* Unified Chronological Activity Feed */}
        <section className="overflow-hidden rounded-card border border-line bg-white">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <div>
              <h2 className="section-title">Latest Financial Activity</h2>
              <p className="text-[11.5px] text-ink-muted">
                Unified live feed across cash, sales, loans & inventory
              </p>
            </div>
            <Link
              href="/transactions"
              className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
            >
              View ledger
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activityFeed.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                compact
                title="No activity yet"
                message="Income, expenses, crop sales, loan repayments and stock usages will appear here."
                actionLabel="Add a record"
                onAction={() => openAdd()}
              />
            </div>
          ) : (
            <div className="divide-y divide-line/70">
              {activityFeed.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenActivity(item)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-canvas/50 active:bg-canvas"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-ink truncate">
                        {item.title}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-canvas px-1.5 py-0.5 text-[9.5px] font-medium uppercase text-ink-muted">
                        {item.category || item.type}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-muted">
                      <span>{relativeDayLabel(item.date)}</span>
                      {item.subtitle && (
                        <>
                          <span>·</span>
                          <span className="truncate">{item.subtitle}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-[13.5px] font-bold ${
                        item.isPending
                          ? "text-amber"
                          : item.type === "INCOME" || item.type === "LENDING_COLLECTION"
                          ? "text-positive"
                          : "text-ink"
                      }`}
                    >
                      {item.type === "INCOME" || item.type === "LENDING_COLLECTION" ? "+" : "−"}
                      {formatINR(item.amountPaise)}
                    </p>
                    {item.isPending && (
                      <span className="text-[9.5px] font-medium text-amber">Pending</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Reminders Card */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="section-title">Upcoming Reminders</h2>
              <p className="text-[11.5px] text-ink-muted">Bills, EMIs, and crop dates</p>
            </div>
            <Link
              href="/reminders"
              className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-700"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {buckets.next.length === 0 ? (
            <EmptyState
              compact
              title="Nothing coming up"
              message="Add a reminder for a bill, labour payment, crop task or loan EMI."
              actionLabel="Add reminder"
              onAction={() => openAdd("REMINDER")}
            />
          ) : (
            <div className="space-y-2">
              {buckets.next.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  compact
                  onComplete={completeReminder}
                  onReopen={reopenReminder}
                  onClick={() => router.push("/reminders")}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function IncomeRow({
  label,
  receivedPaise,
  pendingPaise = 0,
  totalReceivedPaise,
}: {
  label: string;
  receivedPaise: number;
  pendingPaise?: number;
  totalReceivedPaise: number;
}) {
  if (receivedPaise === 0 && pendingPaise === 0) return null;
  const percent = percentOf(receivedPaise, totalReceivedPaise);

  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink-secondary">{label}</span>
        <div className="text-right">
          <span className="font-semibold text-positive">+{formatINR(receivedPaise)}</span>
          {pendingPaise > 0 && (
            <span className="ml-1.5 text-[10px] text-amber font-medium">
              ({formatINR(pendingPaise)} pending)
            </span>
          )}
        </div>
      </div>
      <div className="mt-1">
        <ProgressBar value={percent} tone="positive" size="sm" />
      </div>
    </div>
  );
}
