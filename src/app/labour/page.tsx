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
import { inRange, rangeForPreset } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { DateRange, LabourPayment, PeriodPreset } from "@/lib/types";

const PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "THIS_YEAR"];

type StatusTab = "ALL" | "PAID" | "PARTIAL" | "PENDING";

export default function LabourPage() {
  const {
    labourPayments,
    crops,
    markLabourPaid,
    deleteLabourPayment,
    notify,
    t,
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
      title: t("dialog.confirmDelete"),
      message: t("dialog.deleteWarning"),
      confirmLabel: t("dialog.confirm"),
      cancelLabel: t("dialog.cancel"),
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
        title={t("labour.title")}
        subtitle={t("labour.subtitle")}
        backHref="/farm"
        right={
          <button
            type="button"
            onClick={openNew}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("common.add")}
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        <PeriodFilter value={range} onChange={setRange} presets={PRESETS} compact />

        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {t("labour.title")} · {range.label}
              </p>
              <p className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">
                {formatINR(summary.totalPaise)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {summary.count === 1
                  ? t("labour.paymentCount", { count: 1 })
                  : t("labour.paymentCountPlural", { count: summary.count })}{" "}
                ·{" "}
                {summary.totalWorkerDays === 1
                  ? t("labour.workerDay", { count: 1 })
                  : t("labour.workerDayPlural", { count: summary.totalWorkerDays })}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-light text-amber">
              <Users className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <StatCard
              label={t("labour.paid")}
              value={formatINR(summary.paidPaise)}
              hint={
                summary.paidCount === 1
                  ? t("labour.paymentCount", { count: 1 })
                  : t("labour.paymentCountPlural", { count: summary.paidCount })
              }
              tone="positive"
            />
            <StatCard
              label={t("labour.unpaid")}
              value={formatINR(summary.pendingPaise)}
              hint={
                summary.pendingCount === 1
                  ? t("labour.paymentCount", { count: 1 })
                  : t("labour.paymentCountPlural", { count: summary.pendingCount })
              }
              tone={summary.pendingPaise > 0 ? "amber" : "neutral"}
            />
            <StatCard
              label={t("common.all")}
              value={formatINR(allSummary.totalPaise)}
              hint={`${allSummary.count} ${t("common.entries", { count: allSummary.count })}`}
            />
          </div>
        </section>

        <Segmented
          options={[
            { value: "ALL", label: t("common.all"), count: periodRows.length },
            {
              value: "PAID",
              label: t("labour.paidStatus"),
              count: periodRows.filter((p) => p.status === "PAID").length,
            },
            {
              value: "PARTIAL",
              label: t("income.partial"),
              count: periodRows.filter((p) => p.status === "PARTIAL").length,
            },
            {
              value: "PENDING",
              label: t("income.pending"),
              count: periodRows.filter((p) => p.status === "PENDING").length,
            },
          ]}
          value={status}
          onChange={setStatus}
          ariaLabel={t("labour.title")}
        />

        {crops.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-ink-secondary">{t("farm.crops")}:</label>
            <select
              className="select h-9 flex-1 text-[12.5px]"
              value={cropId}
              onChange={(event) => setCropId(event.target.value)}
            >
              <option value="">{t("common.all")} {t("farm.crops")}</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <section>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title={t("labour.noLabour")}
              message={t("labour.subtitle")}
              actionLabel={t("labour.addLabour")}
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
  const { t, formatDate } = useApp();
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
                label={isPaid ? t("labour.paidStatus") : isPartial ? t("income.partial") : t("income.pending")}
                tone={isPaid ? "positive" : "amber"}
              />
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10.5px] text-ink-muted">
            <CalendarDays className="h-3 w-3" />
            {formatDate(payment.paidDate ?? payment.paymentDate)} · {payment.workers} × {formatINR(payment.ratePaise)} × {payment.days}
          </p>
          {isPartial && (
            <p className="mt-1 text-[11px] font-medium text-amber">
              {t("labour.paid")}: {formatINR(payment.paidPaise ?? 0)} · {t("labour.unpaid")}: {formatINR(payment.remainingPaise ?? 0)}
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
            {t("labour.markPaid")}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary"
          aria-label={t("common.edit")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-full text-negative"
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
