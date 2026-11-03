"use client";

import React, { useEffect, useId, useState } from "react";
import { IndianRupee } from "lucide-react";
import { parseAmountToPaise, paiseToInput } from "@/lib/money";

interface AmountInputProps {
  valuePaise: number;
  onChange: (paise: number) => void;
  label?: string;
  autoFocus?: boolean;
  helper?: string;
  tone?: "default" | "income" | "expense";
}

export default function AmountInput({
  valuePaise,
  onChange,
  label = "Amount",
  autoFocus,
  helper,
  tone = "default",
}: AmountInputProps) {
  const inputId = useId();
  const messageId = useId();
  const [text, setText] = useState(() => paiseToInput(valuePaise));
  const parsed = parseAmountToPaise(text);
  const invalid = text.trim().length > 0 && parsed === null;

  useEffect(() => {
    if ((parsed ?? 0) === valuePaise) return;
    setText(paiseToInput(valuePaise));
    // Only resync when the external value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuePaise]);

  const accent =
    tone === "income"
      ? "border-positive/30 bg-positive-light/50"
      : tone === "expense"
      ? "border-negative/20 bg-negative-light/40"
      : "border-line bg-canvas/70";

  return (
    <div>
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 ${accent}`}
      >
        <IndianRupee className="h-6 w-6 shrink-0 text-ink-secondary" />
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          value={text}
          aria-invalid={invalid}
          aria-describedby={invalid || helper ? messageId : undefined}
          onChange={(event) => {
            const next = event.target.value.replace(/[^\d.]/g, "");
            if (next.split(".").length > 2) return;
            if (/\.\d{3,}/.test(next)) return;
            setText(next);
            const amount = parseAmountToPaise(next);
            onChange(amount ?? 0);
          }}
          onBlur={() => {
            const amount = parseAmountToPaise(text);
            if (amount !== null) setText(paiseToInput(amount));
          }}
          className="min-w-0 flex-1 border-0 bg-transparent text-[30px] font-semibold tracking-[-0.03em] text-ink outline-none placeholder:text-ink-muted/60"
        />
        <span className="shrink-0 text-[13px] font-medium text-ink-muted">INR</span>
      </div>
      {invalid ? (
        <p id={messageId} className="mt-1.5 text-[12px] font-medium text-negative">
          Enter a valid amount with up to 2 decimal places.
        </p>
      ) : (
        helper && (
          <p id={messageId} className="mt-1.5 text-[12px] text-ink-muted">
            {helper}
          </p>
        )
      )}
    </div>
  );
}
