"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import PeriodFilter from "@/components/ui/PeriodFilter";
import Segmented from "@/components/ui/Segmented";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import LabourSheet from "@/components/forms/LabourSheet";
import { labourReportDate, labourSummary } from "@/lib/finance";
import { formatDate, formatMonthKey, inRange, monthKey, rangeForPreset } from "@/lib/dates";
import { formatINR, sumPaise } from "@/lib/money";
import type { DateRange, LabourPayment, PeriodPreset } from "@/lib/types";

const PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "THIS_YEAR"];

type StatusTab = "ALL" | "PAID" | "PARTIAL" | "PENDING";

export default function LabourPage() {
  const {
    labourPayments,
    crops,
    saveLabourPayment,
    markLabourPaid,
    deleteLabourPayment,
    notify,
  } = useApp();
  const confirm = useConfirm();
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("THIS_MONTH"));
  const [status, setStatus] = useState<StatusTab>("ALL");
  const [cropId, setCropId] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<LabourPayment | null>(null);

  const periodRows = useMemo(
    () => labourPayments.filter((payment) => inRange(labourReportDate(payment), range)),
    [labourPayments, range]
  );
  const summary = useMemo(() => labourSummary(periodRows), [periodRows]);
  const allSummary = useMemo(() => labourSummary(labourPayments), [labourPayments]);

  const rows = useMemo(
    () =>
      periodRows.filter((payment) => {
        if (status !== "ALL" && payment.status !== status) return false;
        if (cropId && payment.cropId !== cropId) return false;
        return true;
      }),
    [periodRows, status, cropId]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of periodRows) {
      const key = monthKey(labourReportDate(payment));
      map.set(key, (map.get(key) ?? 0) + payment.amountPaise);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [periodRows]);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (payment: LabourPayment) => {
    setEditing(payment);
    setSheetOpen(true);
  };

  const handleDelete = async (payment: LabourPayment) => {
    const okay = await confirm({
      title: "Delete this labour payment?",
      message:
        "The wage record and its linked farm expense will be removed. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!okay) return;
    try {
      await deleteLabourPayment(payment.id);
      notify("Labour payment deleted.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete payment.", "error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title="Labour"
        subtitle="Wages by crop, activity and month"
        backHref="/farm"
        right={
          <button
            type="button"
            onClick={openNew}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        <PeriodFilter value={range} onChange={setRange} presets={PRESETS} compact />

        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Labour cost in {range.label.toLowerCase()}
              </p>
              <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">
                {formatINR(summary.totalPaise)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {summary.count} payment{summary.count === 1 ? "" : "s"} ·{" "}
                {summary.totalWorkerDays} worker-day{summary.totalWorkerDays === 1 ? "" : "s"}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-light text-amber">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatCard label="Paid" value={formatINR(summary.paidPaise)} tone="positive" />
            <StatCard
              label="Pending"
              value={formatINR(summary.pendingPaise)}
              tone={summary.pendingPaise > 0 ? "amber" : "default"}
            />
          </div>
          {allSummary.pendingPaise > 0 && (
            <p className="mt-3 rounded-xl bg-amber-light px-3 py-2 text-[11.5px] leading-4 text-amber">
              {formatINR(allSummary.pendingPaise)} is pending across all time. Pending wages are
              included in crop cost and profit, but not in cash spent.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <Segmented
            options={[
              { value: "ALL", label: "All", count: periodRows.length },
              { value: "PAID", label: "Paid", count: periodRows.filter((p) => p.status === "PAID").length },
              { value: "PARTIAL", label: "Partial", count: periodRows.filter((p) => p.status === "PARTIAL").length },
              { value: "PENDING", label: "Pending", count: periodRows.filter((p) => p.status === "PENDING").length },
            ]}
            value={status}
            onChange={(next) => setStatus(next as StatusTab)}
            ariaLabel="Labour status"
          />
          <select className="select" value={cropId} onChange={(event) => setCropId(event.target.value)}>
            <option value="">All crops</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name} · {crop.season} {crop.year}
              </option>
            ))}
          </select>
        </div>

        <section className="rounded-card border border-line bg-white p-4">
          <h2 className="section-title">By crop</h2>
          {summary.byCrop.length === 0 ? (
            <p className="mt-2 rounded-xl bg-canvas px-3 py-3 text-[11.5px] text-ink-muted">
              No labour in this period.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {summary.byCrop.map((row) => (
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
        </section>

        <section className="rounded-card border border-line bg-white p-4">
          <h2 className="section-title">By activity</h2>
          {summary.byActivity.length === 0 ? (
            <p className="mt-2 rounded-xl bg-canvas px-3 py-3 text-[11.5px] text-ink-muted">
              Add a labour payment to see activity totals.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {summary.byActivity.map((row) => (
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
        </section>

        <section className="rounded-card border border-line bg-white p-4">
          <h2 className="section-title">By month</h2>
          {byMonth.length === 0 ? (
            <p className="mt-2 rounded-xl bg-canvas px-3 py-3 text-[11.5px] text-ink-muted">
              No monthly labour cost in this period.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {byMonth.map(([key, amount]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-ink-secondary">{formatMonthKey(key)}</span>
                  <span className="text-[12.5px] font-semibold text-ink">{formatINR(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="section-title">Labour payments</h2>
              <p className="text-[11.5px] text-ink-muted">
                {rows.length} shown · tap to edit
              </p>
            </div>
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1 text-[12px] font-semibold text-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No labour payments"
              message="Record workers, rate and days. Paid wages become a farm expense automatically."
              actionLabel="Add labour payment"
              onAction={openNew}
            />
          ) : (
            <div className="space-y-2.5">
              {rows.map((payment) => (
                <LabourRow
                  key={payment.id}
                  payment={payment}
                  onEdit={() => openEdit(payment)}
                  onMarkPaid={() => void markLabourPaid(payment.id)}
                  onDelete={() => void handleDelete(payment)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
          <strong className="text-ink">No double counting:</strong> a paid labour record creates
          exactly one farm expense. The expense is linked, so editing or deleting the wage keeps
          both sides in step. Paid wages are reported on their payment date; pending wages on
          their work date.
        </div>
      </main>

      <LabourSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        labour={editing}
      />
    </div>
  );
}

function LabourRow({
  payment,
  onEdit,
  onMarkPaid,
  onDelete,
}: {
  payment: LabourPayment;
  onEdit: () => void;
  onMarkPaid: () => void;
  onDelete: () => void;
}) {
  const isPaid = payment.status === "PAID";
  const isPartial = payment.status === "PARTIAL";

  return (
    <div className="rounded-2xl border border-line bg-white p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-light text-amber">
          <Users className="h-4 w-4" />
        </span>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">
                {payment.workerName ? `${payment.workerName} · ` : ""}
                {payment.activity}
              </p>
              <p className="truncate text-[11px] text-ink-muted">
                {payment.cropName}
                {payment.landName ? ` · ${payment.landName}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold text-ink">
                {formatINR(payment.amountPaise)}
              </p>
              <StatusPill
                label={isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                tone={isPaid ? "positive" : "amber"}
              />
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-muted">
            <CalendarDays className="h-3 w-3" />
            {formatDate(payment.paidDate ?? payment.paymentDate)} · {payment.workers} worker
            {payment.workers === 1 ? "" : "s"} × {formatINR(payment.ratePaise)} ×{" "}
            {payment.days} day{payment.days === 1 ? "" : "s"}
          </p>
          {isPartial && (
            <p className="mt-1 text-[11px] font-medium text-amber">
              Paid: {formatINR(payment.paidPaise ?? 0)} · Remaining: {formatINR(payment.remainingPaise ?? 0)}
            </p>
          )}
          {payment.description && (
            <p className="mt-0.5 truncate text-[10.5px] text-ink-muted">{payment.description}</p>
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 border-t border-line/70 pt-2">
        {!isPaid && (
          <button
            type="button"
            onClick={onMarkPaid}
            className="flex h-8 items-center gap-1 rounded-full bg-positive-light px-3 text-[11px] font-semibold text-positive"
          >
            <Check className="h-3.5 w-3.5" />
            {isPartial ? "Pay remaining" : "Mark paid"}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary"
          aria-label="Edit labour payment"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-full text-negative"
          aria-label="Delete labour payment"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
