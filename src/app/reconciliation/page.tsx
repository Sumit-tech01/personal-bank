"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import { runFinancialReconciliation } from "@/lib/finance";
import type { IssueSeverity, ReconciliationIssue } from "@/lib/types";

export default function ReconciliationPage() {
  const {
    transactions,
    cropSales,
    loans,
    labourPayments,
    inventory,
    vehicles,
    deleteTransaction,
    notify,
    t,
  } = useApp();
  const router = useRouter();
  const confirm = useConfirm();

  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const issues = useMemo(
    () =>
      runFinancialReconciliation({
        transactions,
        cropSales,
        loans,
        labourPayments,
        inventory,
        vehicles,
      }),
    [transactions, cropSales, loans, labourPayments, inventory, vehicles]
  );

  const errorCount = issues.filter((i) => i.severity === "ERROR").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;

  const filteredIssues = useMemo(() => {
    if (severityFilter === "ALL") return issues;
    return issues.filter((i) => i.severity === severityFilter);
  }, [issues, severityFilter]);

  const handleResolveDuplicate = async (issue: ReconciliationIssue) => {
    if (!issue.affectedRecordId || issue.affectedEntity !== "transaction") return;

    const ok = await confirm({
      title: t("reconciliation.removeDuplicateTitle"),
      message: `Delete transaction ID ${issue.affectedRecordId}? This will remove the duplicate entry from cashflow.`,
      confirmLabel: t("reconciliation.deleteDuplicate"),
      danger: true,
    });
    if (!ok) return;

    setReconcilingId(issue.id);
    try {
      await deleteTransaction(issue.affectedRecordId);
      notify(t("common.saved"));
    } catch {
      notify(t("common.error"), "error");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleNavigate = (issue: ReconciliationIssue) => {
    if (issue.category === "INVENTORY_DISCREPANCY") {
      router.push("/inventory");
    } else if (issue.category === "LOAN_MISMATCH" || issue.category === "LENDING_MISMATCH") {
      router.push("/loans");
    } else if (issue.category === "MISSING_LINKED_RECORD") {
      router.push("/transactions");
    } else {
      router.push("/reports");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas pb-20">
      <PageHeader
        title={t("reconciliation.title")}
        subtitle={t("reconciliation.subtitle")}
        backHref="/more"
      />

      <main className="app-container space-y-4 py-4">
        {/* Diagnostic Status Card */}
        <section
          className={`rounded-2xl border p-4 shadow-sm transition ${
            issues.length === 0
              ? "border-positive/30 bg-positive-light/40"
              : errorCount > 0
              ? "border-negative/30 bg-negative-light/30"
              : "border-amber/30 bg-amber-light/30"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                issues.length === 0
                  ? "bg-positive text-white"
                  : errorCount > 0
                  ? "bg-negative text-white"
                  : "bg-amber text-white"
              }`}
            >
              {issues.length === 0 ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-ink">
                {issues.length === 0
                  ? t("reconciliation.allReconciled")
                  : t("reconciliation.itemsFound", { count: issues.length })}
              </h2>
              <p className="mt-0.5 text-[12px] text-ink-secondary leading-relaxed">
                {issues.length === 0
                  ? t("reconciliation.noIssuesDesc")
                  : t("reconciliation.issuesDesc", { errors: errorCount, warnings: warningCount })}
              </p>
            </div>
          </div>
        </section>

        {/* Severity filter tabs */}
        {issues.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11.5px] font-semibold">
            {["ALL", "ERROR", "WARNING", "INFO"].map((filter) => {
              const active = severityFilter === filter;
              const count =
                filter === "ALL"
                  ? issues.length
                  : issues.filter((i) => i.severity === filter).length;
              if (count === 0 && filter !== "ALL") return null;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSeverityFilter(filter)}
                  className={`px-3 py-1.5 rounded-full transition shrink-0 ${
                    active
                      ? "bg-ink text-white"
                      : "border border-line bg-white text-ink-secondary hover:bg-canvas"
                  }`}
                >
                  {filter === "ALL" ? t("reconciliation.allIssues", { count }) : `${filter} (${count})`}
                </button>
              );
            })}
          </div>
        )}

        {/* Issues List */}
        {filteredIssues.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6 text-positive" />}
            title={t("reconciliation.integrityVerified")}
            message={t("reconciliation.integrityVerifiedDesc")}
            actionLabel={t("common.backToHome")}
            onAction={() => router.push("/")}
          />
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const isError = issue.severity === "ERROR";
              const isWarning = issue.severity === "WARNING";

              return (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-2.5 text-[12px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <AlertCircle className="h-4 w-4 text-negative shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-4 w-4 text-amber shrink-0" />
                      ) : (
                        <Info className="h-4 w-4 text-sky shrink-0" />
                      )}
                      <h3 className="font-bold text-ink text-[13px]">{issue.title}</h3>
                    </div>
                    <StatusPill
                      label={issue.severity}
                      tone={isError ? "negative" : isWarning ? "amber" : "neutral"}
                    />
                  </div>

                  <p className="text-ink-secondary leading-relaxed">{issue.description}</p>

                  <div className="rounded-xl bg-canvas p-2.5 text-[11.5px] text-ink-secondary flex items-start gap-2">
                    <Wrench className="h-3.5 w-3.5 text-brand-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-ink">{t("reconciliation.suggestedAction")}:</strong> {issue.suggestedAction}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-2 text-[11.5px]">
                    {issue.category === "DUPLICATE_TRANSACTION" ? (
                      <button
                        type="button"
                        onClick={() => handleResolveDuplicate(issue)}
                        disabled={reconcilingId === issue.id}
                        className="rounded-lg bg-negative px-3 py-1 font-semibold text-white hover:bg-negative/90 disabled:opacity-50"
                      >
                        {reconcilingId === issue.id ? "…" : t("reconciliation.deleteDuplicate")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNavigate(issue)}
                        className="flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                      >
                        <span>{t("reconciliation.openModuleToFix")}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
