"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
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
  loanInterestPaid,
  loanIsOverdue,
  loanOutstanding,
  loanPrincipalRepaid,
  loanRepaid,
  loansDashboardStats,
  loanSummary,
  monthlyLoanCashflow,
} from "@/lib/finance";
import { todayISO } from "@/lib/dates";
import { formatINR, percentOf } from "@/lib/money";
import type { Loan, LoanRepayment, LoanType } from "@/lib/types";

interface LoanListPageProps {
  type: LoanType;
}

type FilterStatus = "ALL" | "ACTIVE" | "OVERDUE" | "COMPLETED";

export default function LoanListPage({ type: propType }: LoanListPageProps) {
  const {
    loans,
    deleteLoanRepayment,
    deleteLoan,
    notify,
    t,
    formatDate,
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
            label: t("reminders.overdue"),
            date: loan.dueDate,
            isOverdue: true,
            amountPaise: outstanding,
          });
        }
      }
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [typeLoans, today, t]);

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
    setSelectedLoan(loan);
    setEditingRepayment(null);
    setRepaySheetOpen(true);
  };

  const handleRemoveLoan = async (loan: Loan) => {
    const okay = await confirm({
      title: t("dialog.confirmDelete"),
      message: t("dialog.deleteWarning"),
      confirmLabel: t("dialog.confirm"),
      cancelLabel: t("dialog.cancel"),
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
      title: t("dialog.confirmDelete"),
      message: t("dialog.deleteWarning"),
      confirmLabel: t("dialog.confirm"),
      cancelLabel: t("dialog.cancel"),
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
        title={borrowed ? t("loans.borrowedTitle") : t("loans.lentTitle")}
        subtitle={borrowed ? t("loans.borrowedSubtitle") : t("loans.lentSubtitle")}
        backHref="/more"
        right={
          <button
            type="button"
            onClick={openNewLoan}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-xs transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t("common.add")}
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
            <span>{t("loans.borrowedTitle")}</span>
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
            <span>{t("loans.lentTitle")}</span>
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
                {t("loans.outstanding")}
              </p>
              <p className="mt-1 text-[26px] font-bold tracking-tight text-ink">
                {formatINR(currentSummary.outstandingPaise)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {t("common.total")}: {formatINR(currentSummary.principalPaise)} ·{" "}
                {currentSummary.activeCount} {t("loans.active")}
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
              label={borrowed ? t("loans.totalRepaid") : t("loans.totalCollected")}
              value={formatINR(currentSummary.principalRepaidPaise)}
              tone="positive"
            />
            <StatCard
              label={t("reports.cashFlow")}
              value={formatINR(currentSummary.interestPaidPaise)}
              tone={borrowed ? "negative" : "positive"}
            />
            <StatCard
              label={borrowed ? t("loans.totalRepaid") : t("loans.totalCollected")}
              value={formatINR(currentSummary.repaidPaise)}
            />
            <StatCard
              label={t("loans.overdue")}
              value={formatINR(currentSummary.overduePaise)}
              tone={currentSummary.overduePaise > 0 ? "negative" : "neutral"}
            />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5">
            <span className="text-[11.5px] text-ink-secondary">
              {borrowed
                ? t("loans.borrowedSubtitle")
                : t("loans.lentSubtitle")}
            </span>
            <button
              type="button"
              onClick={() => setReportsOpen(true)}
              className="text-[11.5px] font-semibold text-brand-700 hover:underline flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              {t("reports.title")}
            </button>
          </div>
        </section>

        {/* Attention Alerts / Overdue Warnings */}
        {alerts.length > 0 && (
          <section className="rounded-card border border-amber/30 bg-amber-light/40 p-3.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber" />
              <h3 className="text-[12.5px] font-semibold text-ink">
                {t("reminders.upcoming")} ({alerts.length})
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
                    {item.isOverdue ? `${t("reminders.overdue")} ` : `${t("reminders.upcoming")} `} {formatDate(item.date)}
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
              placeholder={t("common.search")}
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
                  ? t("common.all")
                  : st === "ACTIVE"
                  ? t("loans.active")
                  : st === "OVERDUE"
                  ? t("loans.overdue")
                  : t("loans.closed")}
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
                ? t("common.noRecords")
                : borrowed
                ? t("loans.noLoans")
                : t("lending.noLending")
            }
            message={borrowed ? t("loans.borrowedSubtitle") : t("lending.subtitle")}
            actionLabel={borrowed ? t("loans.addBorrowed") : t("loans.addLent")}
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
                ? t("loans.closed")
                : isOverdue
                ? t("loans.overdue")
                : loan.status === "WRITTEN_OFF"
                ? "Written Off"
                : t("loans.active");

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
                          loan.interestRate ? `${loan.interestRate}%` : null,
                          loan.purpose,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {loan.vehicleName && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-sky">
                          <Tractor className="h-3.5 w-3.5" />
                          {loan.vehicleName}
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
                        {outstanding > 0 ? `${formatINR(outstanding)}` : t("loans.closed")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10.5px] text-ink-muted">
                      <span>{formatINR(repaid)} {t("labour.paid")}</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar
                      value={progress}
                      tone={isCompleted ? "positive" : isOverdue ? "negative" : "brand"}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Loan Sheet */}
      <LoanSheet
        open={loanSheetOpen}
        onClose={() => {
          setLoanSheetOpen(false);
          setEditingLoan(null);
        }}
        defaultType={activeType}
        loan={editingLoan}
      />

      {/* Repayment Sheet */}
      {selectedLoan && (
        <RepaymentSheet
          open={repaySheetOpen}
          onClose={() => {
            setRepaySheetOpen(false);
            setEditingRepayment(null);
          }}
          loan={selectedLoan}
          repayment={editingRepayment}
        />
      )}

      {/* Selected Loan Detail Sheet */}
      <Sheet
        open={!!selectedLoan && !repaySheetOpen}
        onClose={() => setSelectedLoan(null)}
        title={selectedLoan?.partyName ?? t("loans.title")}
        subtitle={borrowed ? t("loans.borrowedTitle") : t("loans.lentTitle")}
        size="lg"
      >
        {selectedLoan && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-canvas p-4 space-y-2 text-[12.5px]">
              <DetailRow label={t("loans.outstanding")} value={<strong className="text-negative font-mono text-[15px]">{formatINR(loanOutstanding(selectedLoan))}</strong>} />
              <DetailRow label={t("common.total")} value={formatINR(selectedLoan.principalPaise)} />
              <DetailRow label={t("loans.totalRepaid")} value={<span className="text-positive font-semibold">{formatINR(loanRepaid(selectedLoan))}</span>} />
              <DetailRow label={t("common.date")} value={formatDate(selectedLoan.date, "long")} />
              {selectedLoan.dueDate && <DetailRow label={t("reminders.upcoming")} value={formatDate(selectedLoan.dueDate, "long")} />}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => openAddRepayment(selectedLoan)}
              >
                <Plus className="h-4 w-4" />
                {borrowed ? t("loans.recordRepayment") : t("loans.recordCollection")}
              </button>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => openEditLoan(selectedLoan)}
              >
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </button>
            </div>

            <button
              type="button"
              className="btn-danger w-full mt-4"
              onClick={() => void handleRemoveLoan(selectedLoan)}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </button>
          </div>
        )}
      </Sheet>

      {/* Reports Modal Sheet */}
      <Sheet
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
        title={t("reports.title")}
        subtitle={t("reports.cashFlow")}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl bg-canvas p-3">
              <span className="text-ink-muted">{t("loans.borrowedTitle")}:</span>
              <p className="mt-1 text-[16px] font-bold text-negative">
                {formatINR(dashStats.totalBorrowedPrincipalOutstandingPaise)}
              </p>
            </div>
            <div className="rounded-xl bg-canvas p-3">
              <span className="text-ink-muted">{t("loans.lentTitle")}:</span>
              <p className="mt-1 text-[16px] font-bold text-positive">
                {formatINR(dashStats.totalLentPrincipalOutstandingPaise)}
              </p>
            </div>
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
