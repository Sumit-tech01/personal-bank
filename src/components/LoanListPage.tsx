"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HandCoins,
  Landmark,
  Pencil,
  Plus,
  Search,
  Tractor,
  Trash2,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import ProgressBar from "@/components/ui/ProgressBar";
import Sheet from "@/components/ui/Sheet";
import LoanSheet from "@/components/forms/LoanSheet";
import RepaymentSheet from "@/components/forms/RepaymentSheet";
import {
  loanAccruedInterest,
  loanEffectiveStatus,
  loanInterestPaid,
  loanIsOverdue,
  loanOutstanding,
  loanPrincipalRepaid,
  loanRepaid,
  loansDashboardStats,
  loanSummary,
  monthlyLoanCashflow,
} from "@/lib/finance";
import { formatDate, parseISODate, toISODate, todayISO } from "@/lib/dates";
import { formatINR, percentOf } from "@/lib/money";
import type { Loan, LoanRepayment, LoanStatus, LoanType } from "@/lib/types";

interface LoanListPageProps {
  type: LoanType;
}

type FilterStatus = "ALL" | "ACTIVE" | "OVERDUE" | "COMPLETED";

export default function LoanListPage({ type: propType }: LoanListPageProps) {
  const {
    loans,
    transactions,
    vehicles,
    deleteLoanRepayment,
    deleteLoan,
    notify,
  } = useApp();
  const confirm = useConfirm();

  const [activeType, setActiveType] = useState<LoanType>(propType);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loanSheetOpen, setLoanSheetOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [repaySheetOpen, setRepaySheetOpen] = useState(false);
  const [editingRepayment, setEditingRepayment] = useState<LoanRepayment | null>(null);
  const [reportsOpen, setReportsOpen] = useState(false);

  const borrowed = activeType === "BORROWED";

  // Keep selected loan in sync with state updates
  useEffect(() => {
    if (!selectedLoan) return;
    const latest = loans.find((l) => l.id === selectedLoan.id) ?? null;
    if (latest !== selectedLoan) setSelectedLoan(latest);
  }, [loans, selectedLoan]);

  const dashStats = useMemo(
    () => loansDashboardStats(loans),
    [loans]
  );

  const currentSummary = useMemo(
    () => loanSummary(loans, activeType),
    [loans, activeType]
  );

  const today = todayISO();
  const in30DaysDate = new Date();
  in30DaysDate.setDate(in30DaysDate.getDate() + 30);
  const in30Days = toISODate(in30DaysDate);

  // Filtered rows for current type
  const typeLoans = useMemo(
    () => loans.filter((loan) => loan.type === activeType),
    [loans, activeType]
  );

  const filteredLoans = useMemo(() => {
    return typeLoans.filter((loan) => {
      const outstanding = loanOutstanding(loan);
      const isOverdue = loanIsOverdue(loan, today);
      const isCompleted = outstanding <= 0 || loan.status === "COMPLETED" || loan.status === "CLOSED";

      if (statusFilter === "ACTIVE" && (isCompleted || isOverdue)) return false;
      if (statusFilter === "OVERDUE" && !isOverdue) return false;
      if (statusFilter === "COMPLETED" && !isCompleted) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = loan.partyName.toLowerCase().includes(query);
        const matchCat = loan.category?.toLowerCase().includes(query);
        const matchPurpose = loan.purpose?.toLowerCase().includes(query);
        const matchVehicle = loan.vehicleName?.toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchPurpose && !matchVehicle) return false;
      }

      return true;
    });
  }, [typeLoans, statusFilter, searchQuery, today]);

  // Overdue and upcoming alerts for current type
  const alerts = useMemo(() => {
    const list: {
      loan: Loan;
      label: string;
      date: string;
      isOverdue: boolean;
      amountPaise: number;
    }[] = [];

    for (const loan of typeLoans) {
      const outstanding = loanOutstanding(loan);
      if (outstanding <= 0 || loan.status === "CLOSED" || loan.status === "COMPLETED") continue;

      if (loan.dueDate) {
        if (loan.dueDate < today) {
          list.push({
            loan,
            label: "Due date passed",
            date: loan.dueDate,
            isOverdue: true,
            amountPaise: loan.emiPaise ?? outstanding,
          });
        } else if (loan.dueDate <= in30Days) {
          list.push({
            loan,
            label: "Upcoming due date",
            date: loan.dueDate,
            isOverdue: false,
            amountPaise: loan.emiPaise ?? outstanding,
          });
        }
      }
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [typeLoans, today, in30Days]);

  const openNewLoan = () => {
    setEditingLoan(null);
    setLoanSheetOpen(true);
  };

  const openEditLoan = (loan: Loan) => {
    setSelectedLoan(null);
    setEditingLoan(loan);
    setLoanSheetOpen(true);
  };

  const openAddRepayment = (loan: Loan) => {
    setEditingRepayment(null);
    setRepaySheetOpen(true);
  };

  const openEditRepayment = (repayment: LoanRepayment) => {
    setEditingRepayment(repayment);
    setRepaySheetOpen(true);
  };

  const handleRemoveLoan = async (loan: Loan) => {
    const okay = await confirm({
      title: `Delete this ${borrowed ? "loan" : "lending"} record?`,
      message:
        "The record and its repayment history will be permanently removed. Any separate cash records remain intact.",
      confirmLabel: "Delete Record",
      danger: true,
    });
    if (!okay) return;
    try {
      await deleteLoan(loan.id);
      setSelectedLoan(null);
      notify("Record deleted successfully.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete record.", "error");
    }
  };

  const handleRemoveRepayment = async (loan: Loan, repaymentId: string) => {
    const okay = await confirm({
      title: "Delete this payment record?",
      message: "The outstanding loan balance will increase accordingly.",
      confirmLabel: "Delete Payment",
      danger: true,
    });
    if (!okay) return;
    try {
      await deleteLoanRepayment(loan.id, repaymentId);
      notify("Payment record deleted.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete payment.", "error");
    }
  };

  const monthlyCashflow = useMemo(() => monthlyLoanCashflow(loans), [loans]);

  return (
    <div className="min-h-[100dvh] bg-canvas pb-20">
      <PageHeader
        title={borrowed ? "Loans We Owe" : "Money We Lent"}
        subtitle={
          borrowed
            ? "Track bank, society & private loans separate from daily spending"
            : "Track money lent to relatives, neighbours & farmers"
        }
        backHref="/more"
        right={
          <button
            type="button"
            onClick={openNewLoan}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-xs transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Navigation Switcher: Borrowed Loans vs Money Lent */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-canvas p-1">
          <button
            type="button"
            onClick={() => {
              setActiveType("BORROWED");
              setStatusFilter("ALL");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-semibold transition ${
              borrowed
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Landmark className="h-4 w-4 text-sky" />
            <span>Borrowed Loans</span>
            <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] text-ink-muted">
              {dashStats.totalBorrowedCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveType("LENT");
              setStatusFilter("ALL");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-semibold transition ${
              !borrowed
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <HandCoins className="h-4 w-4 text-brand-700" />
            <span>Money Lent</span>
            <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] text-ink-muted">
              {dashStats.totalLentCount}
            </span>
          </button>
        </div>

        {/* Executive Stats Card */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {borrowed ? "Total Outstanding Debt" : "Total Outstanding to Recover"}
              </p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">
                {formatINR(currentSummary.outstandingPaise)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                Original amount: {formatINR(currentSummary.principalPaise)} ·{" "}
                {currentSummary.activeCount} active
                {currentSummary.closedCount > 0 ? ` · ${currentSummary.closedCount} settled` : ""}
              </p>
            </div>
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                borrowed ? "bg-sky-light text-sky" : "bg-brand-50 text-brand-700"
              }`}
            >
              {borrowed ? <Landmark className="h-6 w-6" /> : <HandCoins className="h-6 w-6" />}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard
              label={borrowed ? "Principal Repaid" : "Principal Recovered"}
              value={formatINR(currentSummary.principalRepaidPaise)}
              tone="positive"
            />
            <StatCard
              label={borrowed ? "Interest Paid" : "Interest Received"}
              value={formatINR(currentSummary.interestPaidPaise)}
              tone={borrowed ? "negative" : "positive"}
              sub={borrowed ? "Financing cost" : "Interest earnings"}
            />
            <StatCard
              label={borrowed ? "Total Repaid" : "Total Collected"}
              value={formatINR(currentSummary.repaidPaise)}
              sub="Principal + interest"
            />
            <StatCard
              label="Overdue Balance"
              value={formatINR(currentSummary.overduePaise)}
              tone={currentSummary.overduePaise > 0 ? "negative" : "neutral"}
              sub={`${currentSummary.overdueCount} overdue`}
            />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5">
            <span className="text-[11.5px] text-ink-secondary">
              {borrowed
                ? "Loans are debt liabilities, not income."
                : "Money lent is a receivable asset, not an expense."}
            </span>
            <button
              type="button"
              onClick={() => setReportsOpen(true)}
              className="text-[11.5px] font-semibold text-brand-700 hover:underline flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              View Cashflow Report
            </button>
          </div>
        </section>

        {/* Attention Alerts / Overdue Warnings */}
        {alerts.length > 0 && (
          <section className="rounded-card border border-amber/30 bg-amber-light/40 p-3.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber" />
              <h3 className="text-[12.5px] font-semibold text-ink">
                Payment Reminders ({alerts.length})
              </h3>
            </div>
            <div className="mt-2 space-y-1.5">
              {alerts.slice(0, 3).map((item, idx) => (
                <div
                  key={`${item.loan.id}-${idx}`}
                  className="flex items-center justify-between text-[11.5px]"
                >
                  <span className="text-ink truncate">
                    <strong className="font-medium text-ink-secondary">
                      {item.loan.partyName}:
                    </strong>{" "}
                    {formatINR(item.amountPaise)}
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      item.isOverdue ? "text-negative" : "text-amber-dark"
                    }`}
                  >
                    {item.isOverdue ? "Overdue since " : "Due "} {formatDate(item.date)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter Pills & Search */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
              placeholder={`Search ${borrowed ? "lender, bank, vehicle or purpose" : "borrower or purpose"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[11px] font-medium text-ink-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(["ALL", "ACTIVE", "OVERDUE", "COMPLETED"] as FilterStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                  statusFilter === st
                    ? "bg-brand-600 text-white shadow-xs"
                    : "border border-line bg-white text-ink-secondary hover:bg-canvas"
                }`}
              >
                {st === "ALL"
                  ? "All"
                  : st === "ACTIVE"
                  ? "Active"
                  : st === "OVERDUE"
                  ? "Overdue"
                  : "Settled"}
              </button>
            ))}
          </div>
        </div>

        {/* Loan Cards List */}
        {filteredLoans.length === 0 ? (
          <EmptyState
            icon={borrowed ? <Landmark className="h-5 w-5" /> : <HandCoins className="h-5 w-5" />}
            title={
              searchQuery
                ? "No matching records found"
                : borrowed
                ? "No borrowed loans recorded"
                : "No lending records found"
            }
            message={
              borrowed
                ? "Add bank loans, cooperative loans, tractor financing, or personal borrowings to track installments and balances."
                : "Add money given to relatives, neighbours or friends. Tracking keeps capital safe without confounding your expenses."
            }
            actionLabel={borrowed ? "Add Borrowed Loan" : "Add Lending Record"}
            onAction={openNewLoan}
          />
        ) : (
          <div className="space-y-2.5">
            {filteredLoans.map((loan) => {
              const outstanding = loanOutstanding(loan);
              const repaid = loanRepaid(loan);
              const principalRepaid = loanPrincipalRepaid(loan);
              const progress = percentOf(principalRepaid, loan.principalPaise);
              const isOverdue = loanIsOverdue(loan, today);
              const isCompleted = outstanding <= 0 || loan.status === "COMPLETED";

              const statusTone = isCompleted
                ? "positive"
                : isOverdue
                ? "negative"
                : loan.status === "WRITTEN_OFF"
                ? "neutral"
                : "brand";

              const statusLabel = isCompleted
                ? "Settled"
                : isOverdue
                ? "Overdue"
                : loan.status === "WRITTEN_OFF"
                ? "Written Off"
                : "Active";

              return (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => setSelectedLoan(loan)}
                  className="block w-full rounded-2xl border border-line bg-white p-4 text-left transition active:scale-[0.995]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14.5px] font-semibold text-ink">
                          {loan.partyName}
                        </p>
                        <StatusPill label={statusLabel} tone={statusTone} />
                        {loan.category && (
                          <span className="rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-medium text-ink-muted">
                            {loan.category}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11.5px] text-ink-muted">
                        {[
                          formatDate(loan.date),
                          loan.interestRate ? `${loan.interestRate}% int.` : null,
                          loan.purpose,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {loan.vehicleName && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-sky">
                          <Tractor className="h-3.5 w-3.5" />
                          Linked Vehicle: {loan.vehicleName}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[15.5px] font-bold text-ink">
                        {formatINR(loan.principalPaise)}
                      </p>
                      <p
                        className={`text-[11px] font-medium ${
                          outstanding > 0 ? "text-negative" : "text-positive"
                        }`}
                      >
                        {outstanding > 0 ? `${formatINR(outstanding)} left` : "Settled"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10.5px] text-ink-muted">
                      <span>{formatINR(repaid)} paid</span>
                      <span>{progress}% principal cleared</span>
                    </div>
                    <ProgressBar
                      value={progress}
                      tone={isCompleted ? "positive" : isOverdue ? "negative" : "brand"}
                    />
                  </div>

                  {loan.dueDate && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span
                        className={`flex items-center gap-1 ${
                          isOverdue ? "font-semibold text-negative" : "text-ink-muted"
                        }`}
                      >
                        <CalendarClock className="h-3 w-3" />
                        {isOverdue ? "Was due on" : "Due"}: {formatDate(loan.dueDate)}
                      </span>
                      {loan.emiPaise ? (
                        <span className="font-medium text-ink">
                          EMI: {formatINR(loan.emiPaise)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Loan Sheet (New / Edit) */}
      <LoanSheet
        open={loanSheetOpen}
        onClose={() => {
          setLoanSheetOpen(false);
          setEditingLoan(null);
        }}
        loan={editingLoan}
        defaultType={activeType}
      />

      {/* Repayment Sheet */}
      <RepaymentSheet
        open={repaySheetOpen}
        onClose={() => {
          setRepaySheetOpen(false);
          setEditingRepayment(null);
        }}
        loan={selectedLoan}
        repayment={editingRepayment}
      />

      {/* Loan Detail Sheet */}
      <Sheet
        open={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
        title={selectedLoan?.partyName ?? "Loan Details"}
        subtitle={
          selectedLoan
            ? `${selectedLoan.type === "BORROWED" ? "Money Borrowed" : "Money Lent"} · ${
                selectedLoan.category || "General"
              }`
            : ""
        }
        footer={
          selectedLoan ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="btn-secondary py-2.5 text-[12.5px]"
                onClick={() => openEditLoan(selectedLoan)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                className="btn-primary py-2.5 text-[12.5px]"
                onClick={() => openAddRepayment(selectedLoan)}
                disabled={loanOutstanding(selectedLoan) <= 0}
              >
                <Plus className="h-4 w-4" />
                {selectedLoan.type === "BORROWED" ? "Record Repayment" : "Record Collection"}
              </button>
            </div>
          ) : undefined
        }
        size="lg"
      >
        {selectedLoan && (
          <div className="space-y-4">
            {/* Quick Balances Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-canvas p-2.5">
                <p className="text-[10px] text-ink-muted">Original</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">
                  {formatINR(selectedLoan.principalPaise)}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-2.5">
                <p className="text-[10px] text-ink-muted">Principal Repaid</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-positive">
                  {formatINR(loanPrincipalRepaid(selectedLoan))}
                </p>
              </div>
              <div className="rounded-xl bg-canvas p-2.5">
                <p className="text-[10px] text-ink-muted">Outstanding</p>
                <p
                  className={`mt-0.5 truncate text-[13px] font-semibold ${
                    loanOutstanding(selectedLoan) > 0 ? "text-negative" : "text-positive"
                  }`}
                >
                  {formatINR(loanOutstanding(selectedLoan))}
                </p>
              </div>
            </div>

            {/* Interest Stats (if applicable) */}
            {selectedLoan.interestRate > 0 && (
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-ink-muted">Interest Paid to Date:</span>
                  <p className="mt-0.5 font-semibold text-ink">
                    {formatINR(loanInterestPaid(selectedLoan))}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <span className="text-ink-muted">Accrued / Est. Interest:</span>
                  <p className="mt-0.5 font-semibold text-amber-dark">
                    {formatINR(loanAccruedInterest(selectedLoan))}
                  </p>
                </div>
              </div>
            )}

            {/* Details Table */}
            <div className="space-y-2 rounded-2xl bg-canvas p-3.5 text-[12px]">
              <DetailRow label="Party / Lender" value={selectedLoan.partyName} />
              {selectedLoan.contactNumber && (
                <DetailRow label="Contact Phone" value={selectedLoan.contactNumber} />
              )}
              {selectedLoan.category && (
                <DetailRow label="Category" value={selectedLoan.category} />
              )}
              <DetailRow label="Started Date" value={formatDate(selectedLoan.date)} />
              {selectedLoan.dueDate && (
                <DetailRow label="Maturity / Due Date" value={formatDate(selectedLoan.dueDate)} />
              )}
              {selectedLoan.paymentFrequency && (
                <DetailRow
                  label="Payment Frequency"
                  value={selectedLoan.paymentFrequency.replace("_", " ")}
                />
              )}
              {selectedLoan.durationMonths && (
                <DetailRow label="Loan Duration" value={`${selectedLoan.durationMonths} months`} />
              )}
              {selectedLoan.emiPaise && (
                <DetailRow label="Expected EMI" value={formatINR(selectedLoan.emiPaise)} />
              )}
              <DetailRow
                label="Interest Calculation"
                value={
                  selectedLoan.interestRate
                    ? `${selectedLoan.interestRate}% per year (${selectedLoan.interestType || "Simple"})`
                    : "Zero Interest"
                }
              />
              {selectedLoan.purpose && (
                <DetailRow label="Loan Purpose" value={selectedLoan.purpose} />
              )}
              {selectedLoan.vehicleName && (
                <DetailRow
                  label="Linked Vehicle"
                  value={
                    selectedLoan.vehicleId ? (
                      <Link
                        href={`/vehicles/${selectedLoan.vehicleId}`}
                        className="font-semibold text-sky hover:underline"
                      >
                        {selectedLoan.vehicleName} →
                      </Link>
                    ) : (
                      selectedLoan.vehicleName
                    )
                  }
                />
              )}
            </div>

            {/* Supporting Document Preview */}
            {(selectedLoan.receiptDataUrl || selectedLoan.documentUrl) && (
              <div className="rounded-2xl border border-line bg-white p-3.5">
                <p className="text-[12px] font-semibold text-ink mb-2">Supporting Agreement Document</p>
                <img
                  src={selectedLoan.receiptDataUrl || selectedLoan.documentUrl}
                  alt="Loan agreement"
                  className="max-h-48 rounded-xl object-contain border border-line"
                />
              </div>
            )}

            {/* Repayment History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-ink">
                  {selectedLoan.type === "BORROWED" ? "Repayment History" : "Collection History"}
                </h4>
                <span className="text-[11px] text-ink-muted">
                  {selectedLoan.repayments.length} record
                  {selectedLoan.repayments.length === 1 ? "" : "s"}
                </span>
              </div>

              {selectedLoan.repayments.length === 0 ? (
                <p className="rounded-xl bg-canvas p-3 text-[11.5px] text-ink-muted">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...selectedLoan.repayments]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((rep) => (
                      <div
                        key={rep.id}
                        className="rounded-xl border border-line bg-white p-3 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-semibold text-ink">
                              {formatINR(rep.amountPaise)}
                            </p>
                            <p className="text-[11px] text-ink-muted">
                              {formatDate(rep.date)} · {rep.paymentMethod}
                              {rep.reference ? ` · Ref: ${rep.reference}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditRepayment(rep)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-canvas"
                              aria-label="Edit payment"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRemoveRepayment(selectedLoan, rep.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:text-negative hover:bg-negative-light"
                              aria-label="Delete payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {(rep.principalPaise !== undefined || rep.interestPaise !== undefined) && (
                          <div className="flex items-center gap-3 border-t border-line/60 pt-1.5 text-[11px] text-ink-secondary">
                            <span>
                              Principal: <strong>{formatINR(rep.principalPaise ?? rep.amountPaise)}</strong>
                            </span>
                            {rep.interestPaise ? (
                              <span>
                                Interest: <strong>{formatINR(rep.interestPaise)}</strong>
                              </span>
                            ) : null}
                          </div>
                        )}

                        {rep.notes && (
                          <p className="text-[11px] text-ink-muted">{rep.notes}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Delete Record */}
            <button
              type="button"
              className="btn-danger w-full mt-4"
              onClick={() => void handleRemoveLoan(selectedLoan)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Loan Record
            </button>
          </div>
        )}
      </Sheet>

      {/* Reports Modal Sheet */}
      <Sheet
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
        title="Loans & Lending Cashflow Report"
        subtitle="Monthly principal repayments, interest paid, and collections"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl bg-canvas p-3">
              <span className="text-ink-muted">Total Borrowed Outstanding:</span>
              <p className="mt-1 text-[16px] font-bold text-negative">
                {formatINR(dashStats.totalBorrowedPrincipalOutstandingPaise)}
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <span className="text-ink-muted">Total Lent Outstanding:</span>
              <p className="mt-1 text-[16px] font-bold text-positive">
                {formatINR(dashStats.totalLentPrincipalOutstandingPaise)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-ink mb-2">Monthly Cashflow Breakdown</h4>
            {monthlyCashflow.length === 0 ? (
              <p className="rounded-xl bg-canvas p-3 text-[11.5px] text-ink-muted">
                No repayment cashflow history recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {monthlyCashflow.map((m) => (
                  <div
                    key={m.month}
                    className="rounded-xl border border-line bg-white p-3 text-[12px] space-y-1.5"
                  >
                    <p className="font-semibold text-ink">{m.month}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-ink-muted">Principal Repaid:</span>{" "}
                        <strong className="text-ink">{formatINR(m.principalRepaymentsPaise)}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Interest Paid:</span>{" "}
                        <strong className="text-negative">{formatINR(m.interestPaidPaise)}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Principal Recovered:</span>{" "}
                        <strong className="text-ink">{formatINR(m.principalCollectionsPaise)}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Interest Received:</span>{" "}
                        <strong className="text-positive">{formatINR(m.interestReceivedPaise)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
