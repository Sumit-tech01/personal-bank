"use client";

import React from "react";
import { Check, RotateCcw } from "lucide-react";
import StatusPill from "./ui/StatusPill";
import { formatTime, relativeDayLabel, todayISO } from "@/lib/dates";
import { useApp } from "@/context/AppContext";
import type { Reminder } from "@/lib/types";

interface ReminderCardProps {
  reminder: Reminder;
  onComplete?: (id: string) => void;
  onReopen?: (id: string) => void;
  onClick?: (reminder: Reminder) => void;
  compact?: boolean;
}

export default function ReminderCard({
  reminder,
  onComplete,
  onReopen,
  onClick,
  compact = false,
}: ReminderCardProps) {
  const { t, formatDate, language } = useApp();
  const overdue =
    !reminder.completed && reminder.date < new Date().toISOString().slice(0, 10);
  const tone = reminder.completed
    ? "neutral"
    : overdue
    ? "negative"
    : reminder.date === new Date().toISOString().slice(0, 10)
    ? "amber"
    : "brand";

  const getDayLabel = () => {
    if (reminder.completed) return t("reminders.done");
    if (overdue) return t("reminders.overdue");
    const today = todayISO();
    if (reminder.date === today) return t("reminders.today");
    return relativeDayLabel(reminder.date);
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5">
      <button
        type="button"
        onClick={() => {
          if (reminder.completed) onReopen?.(reminder.id);
          else onComplete?.(reminder.id);
        }}
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
          reminder.completed
            ? "border-positive bg-positive text-white"
            : "border-line-strong bg-white text-ink-muted hover:border-brand-500 hover:text-brand-700"
        }`}
        aria-label={reminder.completed ? t("common.actions") : t("reminders.markComplete")}
      >
        {reminder.completed ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onClick?.(reminder)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={`truncate text-[13.5px] font-semibold ${
              reminder.completed ? "text-ink-muted line-through" : "text-ink"
            }`}
          >
            {reminder.title}
          </p>
          <StatusPill
            label={getDayLabel()}
            tone={tone}
          />
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-muted">
          {formatDate(reminder.date)}
          {reminder.time ? ` · ${formatTime(reminder.time)}` : ""} · {reminder.category}
        </p>
        {!compact && reminder.notes && (
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-4 text-ink-secondary">
            {reminder.notes}
          </p>
        )}
      </button>
    </div>
  );
}
