"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import PeriodFilter from "@/components/ui/PeriodFilter";
import Segmented from "@/components/ui/Segmented";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import TransactionItem from "@/components/TransactionItem";
import Sheet from "@/components/ui/Sheet";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { calculateTotals } from "@/lib/finance";
import { formatDate, inRange, rangeForPreset, relativeDayLabel } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { DateRange, Transaction } from "@/lib/types";

type KindFilter = "ALL" | "INCOME" | "EXPENSE";

export default function TransactionsPage() {
  const {
    transactions,
    openAdd,
    deleteTransaction,
    notify,
  } = useApp();
  const confirm = useConfirm();
  const router = useRouter();
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("THIS_MONTH"));
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (!inRange(transaction.date, range)) return false;
      if (kind !== "ALL" && transaction.kind !== kind) return false;
      if (!query) return true;
      return [
        transaction.description,
        transaction.category,
        transaction.cropName,
        transaction.vehicleName,
        transaction.notes,
        transaction.paymentMethod,
        PAYMENT_METHOD_LABELS[transaction.paymentMethod],
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [transactions, range, kind, search]);

  const totals = useMemo(() => calculateTotals(filtered), [filtered]);
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const transaction of filtered) {
      const rows = map.get(transaction.date) ?? [];
      rows.push(transaction);
      map.set(transaction.date, rows);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const handleDelete = async () => {
    if (!selected) return;
    const okay = await confirm({
      title: "Delete this record?",
      message: "It will be removed from your device and from cloud sync. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!okay) return;
    try {
      await deleteTransaction(selected.id);
      setSelected(null);
      notify("Record deleted.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete record.", "error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title="All transactions"
        subtitle="Every rupee in and out, in one list"
        backHref="/more"
        right={
          <button
            type="button"
            onClick={() => openAdd()}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        <PeriodFilter value={range} onChange={setRange} compact />

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-11"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search description, category, crop…"
            type="search"
            aria-label="Search transactions"
          />
        </div>

        <Segmented
          options={[
            { value: "ALL", label: "All", count: filtered.length },
            { value: "INCOME", label: "Money in" },
            { value: "EXPENSE", label: "Money out" },
          ]}
          value={kind}
          onChange={setKind}
          ariaLabel="Transaction type"
        />

        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Money in" value={formatINR(totals.incomePaise)} tone="positive" />
          <StatCard label="Money out" value={formatINR(totals.expensePaise)} tone="negative" />
          <StatCard
            label="Net"
            value={formatINR(totals.netPaise)}
            tone={totals.netPaise < 0 ? "negative" : "brand"}
          />
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No matching records"
            message="Try a different period, clear the search, or add a new record."
            actionLabel="Add a record"
            onAction={() => openAdd()}
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, rows]) => (
              <section key={date}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <h2 className="text-[12px] font-semibold text-ink-secondary">
                    {relativeDayLabel(date)}
                  </h2>
                  <span className="text-[10.5px] text-ink-muted">{formatDate(date)}</span>
                </div>
                <div className="overflow-hidden rounded-card border border-line bg-white">
                  <div className="divide-y divide-line/70">
                    {rows.map((transaction) => (
                      <TransactionItem
                        key={transaction.id}
                        transaction={transaction}
                        showDate={false}
                        onClick={() => setSelected(transaction)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Record details"
        subtitle="View, edit or delete this record."
        footer={
          selected ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (selected.labourPaymentId) {
                    setSelected(null);
                    router.push("/labour");
                    return;
                  }
                  const record = selected;
                  setSelected(null);
                  openAdd(undefined, record);
                }}
              >
                {selected.labourPaymentId ? (
                  <>
                    <Users className="h-4 w-4" />
                    Open Labour
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={!!selected.labourPaymentId}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <StatusPill
                  label={selected.kind === "INCOME" ? "Money in" : "Money out"}
                  tone={selected.kind === "INCOME" ? "positive" : "negative"}
                />
                <p
                  className={`text-[24px] font-semibold tracking-[-0.03em] ${
                    selected.kind === "INCOME" ? "text-positive" : "text-ink"
                  }`}
                >
                  {selected.kind === "INCOME" ? "+" : "−"}
                  {formatINR(selected.amountPaise, { absolute: true })}
                </p>
              </div>
              <p className="mt-2 text-[14px] font-semibold text-ink">
                {selected.description || selected.category}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {selected.category} · {formatDate(selected.date, "long")}
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-line bg-white p-4 text-[12.5px]">
              <DetailRow
                label="Payment method"
                value={PAYMENT_METHOD_LABELS[selected.paymentMethod]}
              />
              {selected.cropName && <DetailRow label="Crop" value={selected.cropName} />}
              {selected.vehicleName && <DetailRow label="Vehicle" value={selected.vehicleName} />}
              {selected.kind === "INCOME" && (
                <DetailRow
                  label="Status"
                  value={selected.incomeStatus === "PENDING" ? "Not received yet" : "Received"}
                />
              )}
              {selected.notes && <DetailRow label="Notes" value={selected.notes} />}
              {selected.labourPaymentId && (
                <DetailRow label="Linked to" value="Labour payment" />
              )}
            </div>

            {selected.receiptDataUrl && (
              <div>
                <p className="label">Receipt</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.receiptDataUrl}
                  alt="Receipt"
                  className="max-h-64 w-full rounded-2xl object-contain"
                />
              </div>
            )}

            {selected.labourPaymentId && (
              <p className="rounded-xl bg-amber-light px-3.5 py-2.5 text-[11.5px] leading-5 text-amber">
                This expense was created from a labour payment. Edit or delete it from Labour so
                the wage record stays correct.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-ink">{value}</span>
    </div>
  );
}
