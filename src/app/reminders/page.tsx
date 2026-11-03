"use client";

import React, { useMemo, useState } from "react";
import { Bell, CalendarDays, Check, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import Segmented from "@/components/ui/Segmented";
import EmptyState from "@/components/ui/EmptyState";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import ReminderCard from "@/components/ReminderCard";
import ReminderSheet from "@/components/forms/ReminderSheet";
import { reminderBuckets } from "@/lib/finance";
import { formatTime } from "@/lib/dates";
import type { Reminder } from "@/lib/types";

type Tab = "TODAY" | "UPCOMING" | "OVERDUE" | "COMPLETED";

export default function RemindersPage() {
  const { reminders, completeReminder, reopenReminder, deleteReminder, notify, t, formatDate } = useApp();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("TODAY");
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [selected, setSelected] = useState<Reminder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const buckets = useMemo(() => reminderBuckets(reminders), [reminders]);
  const rows =
    tab === "TODAY"
      ? buckets.today
      : tab === "UPCOMING"
      ? buckets.upcoming
      : tab === "OVERDUE"
      ? buckets.overdue
      : buckets.completed;

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setSelected(null);
    setEditing(reminder);
    setSheetOpen(true);
  };

  const handleComplete = async (id: string) => {
    try {
      await completeReminder(id);
      notify("Reminder completed.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not complete reminder.", "error");
    }
  };

  const handleDelete = async (reminder: Reminder) => {
    const okay = await confirm({
      title: t("dialog.confirmDelete"),
      message: t("dialog.deleteWarning"),
      confirmLabel: t("dialog.confirm"),
      cancelLabel: t("dialog.cancel"),
      danger: true,
    });
    if (!okay) return;
    await deleteReminder(reminder.id);
    setSelected(null);
    notify("Reminder deleted.");
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={t("reminders.title")}
        subtitle={t("reminders.subtitle")}
        backHref="/more"
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
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-amber/25 bg-amber-light/60 px-3 py-3">
            <p className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-amber">
              <Clock className="h-3.5 w-3.5" />
              {t("reminders.today")}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-ink">{buckets.today.length}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
              {t("reminders.upcoming")}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-ink">{buckets.upcoming.length}</p>
          </div>
          <div className="rounded-2xl border border-negative/20 bg-negative-light/50 px-3 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-negative">
              {t("reminders.overdue")}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-ink">{buckets.overdue.length}</p>
          </div>
        </div>

        <Segmented
          options={[
            { value: "TODAY", label: t("reminders.today"), count: buckets.today.length },
            { value: "UPCOMING", label: t("reminders.upcoming"), count: buckets.upcoming.length },
            { value: "OVERDUE", label: t("reminders.overdue"), count: buckets.overdue.length },
            { value: "COMPLETED", label: t("reminders.done"), count: buckets.completed.length },
          ]}
          value={tab}
          onChange={(next) => setTab(next as Tab)}
          ariaLabel={t("reminders.title")}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title={
              tab === "TODAY"
                ? t("reminders.noDueToday")
                : tab === "UPCOMING"
                ? t("reminders.noUpcoming")
                : tab === "OVERDUE"
                ? t("reminders.allCaughtUp")
                : t("reminders.noCompleted")
            }
            message={
              tab === "COMPLETED"
                ? t("reminders.noCompleted")
                : t("dashboard.addReminderHint")
            }
            actionLabel={tab === "COMPLETED" ? undefined : t("reminders.addReminder")}
            onAction={tab === "COMPLETED" ? undefined : openNew}
          />
        ) : (
          <div className="space-y-2.5">
            {rows.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onComplete={(id) => void handleComplete(id)}
                onReopen={(id) => void reopenReminder(id)}
                onClick={setSelected}
              />
            ))}
          </div>
        )}
      </main>

      <ReminderSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        reminder={editing}
      />

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? t("reminders.title")}
        subtitle={selected ? `${formatDate(selected.date, "long")}${selected.time ? ` · ${formatTime(selected.time)}` : ""}` : ""}
        footer={
          selected ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn-secondary" onClick={() => openEdit(selected)}>
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => void handleDelete(selected)}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={selected.category} tone="brand" />
              <StatusPill
                label={selected.completed ? t("reminders.done") : t("loans.active")}
                tone={selected.completed ? "positive" : "neutral"}
              />
            </div>
            <div className="rounded-2xl bg-canvas p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <CalendarDays className="h-4 w-4 text-brand-700" />
                {formatDate(selected.date, "long")}
              </p>
              {selected.time && (
                <p className="mt-1 text-[12px] text-ink-secondary">{formatTime(selected.time)}</p>
              )}
              {selected.notes && (
                <p className="mt-2 text-[12.5px] leading-5 text-ink-secondary">{selected.notes}</p>
              )}
            </div>
            <button
              type="button"
              className={selected.completed ? "btn-secondary w-full" : "btn-primary w-full"}
              onClick={async () => {
                if (selected.completed) await reopenReminder(selected.id);
                else await completeReminder(selected.id);
                setSelected(null);
              }}
            >
              <Check className="h-4 w-4" />
              {selected.completed ? t("common.actions") : t("reminders.markComplete")}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
