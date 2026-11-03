"use client";

import React, { useState } from "react";
import { CalendarRange } from "lucide-react";
import Sheet from "./Sheet";
import SimpleDatePicker from "./SimpleDatePicker";
import { PERIOD_LABELS, rangeForPreset, todayISO } from "@/lib/dates";
import { useApp } from "@/context/AppContext";
import type { DateRange, PeriodPreset } from "@/lib/types";

interface PeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: PeriodPreset[];
  compact?: boolean;
}

const DEFAULT_PRESETS: PeriodPreset[] = ["THIS_MONTH", "LAST_MONTH", "THIS_YEAR"];

export default function PeriodFilter({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  compact = false,
}: PeriodFilterProps) {
  const { t } = useApp();
  const [customOpen, setCustomOpen] = useState(false);
  const [start, setStart] = useState(value.start);
  const [end, setEnd] = useState(value.end);

  const getPresetLabel = (preset: PeriodPreset): string => {
    switch (preset) {
      case "TODAY":
        return t("period.today");
      case "THIS_WEEK":
        return t("period.thisWeek");
      case "THIS_MONTH":
        return t("period.thisMonth");
      case "LAST_MONTH":
        return t("period.lastMonth");
      case "FINANCIAL_YEAR":
        return t("period.financialYear");
      case "THIS_YEAR":
        return t("period.thisYear");
      case "LAST_YEAR":
        return t("period.lastYear");
      case "CURRENT_SEASON":
        return t("period.currentSeason");
      case "ALL_TIME":
        return t("period.allTime");
      case "CUSTOM":
        return t("period.custom");
      default:
        return PERIOD_LABELS[preset] || preset;
    }
  };

  const openCustom = () => {
    setStart(value.preset === "CUSTOM" ? value.start : value.start);
    setEnd(value.preset === "CUSTOM" ? value.end : todayISO());
    setCustomOpen(true);
  };

  const options = [...presets, "CUSTOM" as PeriodPreset];

  return (
    <>
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        {options.map((preset) => {
          const active = value.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => {
                if (preset === "CUSTOM") openCustom();
                else onChange(rangeForPreset(preset));
              }}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line bg-white text-ink-secondary"
              }`}
            >
              {preset === "CUSTOM" && <CalendarRange className="h-3.5 w-3.5" />}
              {preset === "CUSTOM" && active ? value.label : getPresetLabel(preset)}
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-1.5 text-[11.5px] text-ink-muted">
          {t("period.showing", { label: value.label })}
        </p>
      )}

      <Sheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title={t("period.chooseDateRange")}
        subtitle={t("period.bothDaysIncluded")}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCustomOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onChange(rangeForPreset("CUSTOM", start, end));
                setCustomOpen(false);
              }}
            >
              {t("period.applyRange")}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <SimpleDatePicker label={t("period.startDate")} value={start} onChange={setStart} />
          <SimpleDatePicker label={t("period.endDate")} value={end} onChange={setEnd} />
          <div className="rounded-2xl bg-canvas p-3 text-[12.5px] leading-5 text-ink-secondary">
            {t("period.customRangeHint")}
          </div>
        </div>
      </Sheet>
    </>
  );
}
