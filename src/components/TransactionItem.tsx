"use client";

import React from "react";
import {
  ArrowDownLeft,
  CircleDollarSign,
  Receipt,
  Sprout,
  Tractor,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { Transaction } from "@/lib/types";

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  showDate?: boolean;
  compact?: boolean;
}

function iconFor(transaction: Transaction) {
  if (transaction.kind === "INCOME") {
    return <ArrowDownLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />;
  }
  if (transaction.group === "FARM") {
    return <Sprout className="h-[18px] w-[18px]" strokeWidth={2.2} />;
  }
  if (transaction.group === "VEHICLE") {
    return <Tractor className="h-[18px] w-[18px]" strokeWidth={2.2} />;
  }
  if (transaction.group === "OTHER") {
    return <CircleDollarSign className="h-[18px] w-[18px]" strokeWidth={2.2} />;
  }
  return <Receipt className="h-[18px] w-[18px]" strokeWidth={2.2} />;
}

export default function TransactionItem({
  transaction,
  onClick,
  showDate = true,
  compact = false,
}: TransactionItemProps) {
  const isIncome = transaction.kind === "INCOME";
  const pending = isIncome && transaction.incomeStatus === "PENDING";
  const title = transaction.description || transaction.category;
  const meta = [transaction.category, transaction.cropName, transaction.vehicleName]
    .filter(Boolean)
    .join(" · ");

  const content = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          isIncome
            ? "bg-positive-light text-positive"
            : transaction.group === "FARM"
            ? "bg-brand-50 text-brand-700"
            : transaction.group === "VEHICLE"
            ? "bg-sky-light text-sky"
            : "bg-canvas text-ink-secondary"
        }`}
      >
        {iconFor(transaction)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink">{title}</span>
          {pending && (
            <span className="shrink-0 rounded-full bg-amber-light px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber">
              Pending
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink-muted">
          {showDate ? `${formatDate(transaction.date, "short")} · ` : ""}
          {meta || "No category"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={`block text-[14px] font-semibold ${
            isIncome ? "text-positive" : "text-ink"
          }`}
        >
          {isIncome ? "+" : "−"}
          {formatINR(transaction.amountPaise, { absolute: true })}
        </span>
        {!compact && (
          <span className="mt-0.5 block text-[10.5px] text-ink-muted">
            {isIncome ? "Money in" : "Money out"}
          </span>
        )}
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex min-h-[62px] w-full items-center gap-3 px-4 py-2.5">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[62px] w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas/70 active:bg-canvas"
    >
      {content}
    </button>
  );
}
