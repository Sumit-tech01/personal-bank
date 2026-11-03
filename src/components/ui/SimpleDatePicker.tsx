"use client";

import React, { useId } from "react";
import { CalendarDays } from "lucide-react";
import { addDays, todayISO } from "@/lib/dates";

interface SimpleDatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  quick?: boolean;
  hint?: string;
}

export default function SimpleDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  required,
  quick = false,
  hint,
}: SimpleDatePickerProps) {
  const inputId = useId();
  const hintId = useId();
  const today = todayISO();
  const options = [
    { label: "Today", value: today },
    { label: "Yesterday", value: addDays(today, -1) },
    { label: "Tomorrow", value: addDays(today, 1) },
  ];

  return (
    <div>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-negative"> *</span>}
        </label>
      )}
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted" />
        <input
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          required={required}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="input pl-11"
        />
      </div>
      {quick && (
        <div className="mt-2 flex gap-2">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.value)}
              className={`h-8 rounded-full px-3 text-[12px] font-semibold transition ${
                value === option.value
                  ? "bg-brand-50 text-brand-700"
                  : "bg-canvas text-ink-secondary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-[12px] text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
