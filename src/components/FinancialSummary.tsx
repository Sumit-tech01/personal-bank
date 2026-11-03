import React from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import StatCard from "./ui/StatCard";
import { formatINR } from "@/lib/money";

interface FinancialSummaryProps {
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  pendingIncomePaise?: number;
}

export default function FinancialSummary({
  incomePaise,
  expensePaise,
  netPaise,
  pendingIncomePaise = 0,
}: FinancialSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <StatCard
        label="Total Income"
        value={formatINR(incomePaise)}
        tone="positive"
        icon={<ArrowDownLeft className="h-3.5 w-3.5" />}
      />
      <StatCard
        label="Total Spending"
        value={formatINR(expensePaise)}
        tone="negative"
        icon={<ArrowUpRight className="h-3.5 w-3.5" />}
      />
      <StatCard
        label="Net Savings"
        value={formatINR(netPaise)}
        tone={netPaise < 0 ? "negative" : "brand"}
        icon={<PiggyBank className="h-3.5 w-3.5" />}
        hint={pendingIncomePaise > 0 ? `${formatINR(pendingIncomePaise)} pending` : undefined}
      />
    </div>
  );
}
