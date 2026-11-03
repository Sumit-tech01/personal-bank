"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import { useApp } from "@/context/AppContext";
import { REMINDER_CATEGORIES, REPEAT_OPTIONS } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import type { Reminder, ReminderCategory, RepeatOption } from "@/lib/types";

interface ReminderSheetProps {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
}

export default function ReminderSheet({ open, onClose, reminder }: ReminderSheetProps) {
  const { saveReminder, notify, preferences, t } = useApp();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [category, setCategory] = useState<ReminderCategory>("Custom");
  const [notes, setNotes] = useState("");
  const [repeat, setRepeat] = useState<RepeatOption>("NONE");
  const [notifyOn, setNotifyOn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setTitle(reminder?.title ?? "");
    setDate(reminder?.date ?? todayISO());
    setTime(reminder?.time ?? "");
    setCategory(reminder?.category ?? "Custom");
    setNotes(reminder?.notes ?? "");
    setRepeat(reminder?.repeat ?? "NONE");
    setNotifyOn(reminder?.notify ?? preferences.notificationsEnabled);
  }, [open, reminder, preferences.notificationsEnabled]);

  const save = async () => {
    setError("");
    if (title.trim().length < 2) {
      setError("Please enter a reminder title.");
      return;
    }
    setBusy(true);
    try {
      if (
        notifyOn &&
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        try {
          await Notification.requestPermission();
        } catch {
          // Notifications are optional.
        }
      }
      await saveReminder(
        {
          title,
          date,
          time: time || undefined,
          category,
          notes: notes || undefined,
          repeat,
          notify: notifyOn,
          linkedType: reminder?.linkedType,
          linkedId: reminder?.linkedId,
        },
        reminder?.id
      );
      notify(reminder ? "Reminder updated." : "Reminder saved.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save reminder.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reminder ? t("reminders.editReminder") : t("reminders.addReminder")}
      subtitle="A simple date you do not want to miss."
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "…" : reminder ? t("form.saveChanges") : t("common.save")}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            {t("common.title")} <span className="text-negative">*</span>
          </label>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Pay labour wages, Renew insurance"
            autoFocus={!reminder}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleDatePicker label={t("common.date")} value={date} onChange={setDate} required quick />
          <div>
            <label className="label">
              Time <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              type="time"
              className="input"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">{t("common.category")}</label>
          <select
            className="select"
            value={category}
            onChange={(event) => setCategory(event.target.value as ReminderCategory)}
          >
            {REMINDER_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Repeat</label>
          <select
            className="select"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value as RepeatOption)}
          >
            {REPEAT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
          <span>
            <span className="block text-[13px] font-semibold text-ink">Notify me</span>
            <span className="block text-[11px] text-ink-muted">
              Show a device notification when the app is open.
            </span>
          </span>
          <input
            type="checkbox"
            checked={notifyOn}
            onChange={(event) => setNotifyOn(event.target.checked)}
            className="h-5 w-5 accent-[#2F7D4F]"
          />
        </label>

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything you want to remember"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
