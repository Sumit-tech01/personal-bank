"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  BarChart3,
  Bell,
  ChevronRight,
  Cloud,
  CloudOff,
  Database,
  HandCoins,
  Landmark,
  List,
  LogOut,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sprout,
  Tractor,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/dates";

const groups = [
  {
    title: "Money",
    items: [
      {
        href: "/income",
        label: "Money in",
        hint: "Income by category and month",
        icon: ArrowDownLeft,
        tone: "bg-positive-light text-positive",
      },
      {
        href: "/transactions",
        label: "All transactions",
        hint: "Every record in one list",
        icon: List,
        tone: "bg-brand-50 text-brand-700",
      },
      {
        href: "/loans",
        label: "Loans",
        hint: "Money you need to repay",
        icon: Landmark,
        tone: "bg-sky-light text-sky",
      },
      {
        href: "/lending",
        label: "Money lent",
        hint: "Money you expect back",
        icon: HandCoins,
        tone: "bg-brand-50 text-brand-700",
      },
    ],
  },
  {
    title: "Farm",
    items: [
      {
        href: "/labour",
        label: "Labour",
        hint: "Wages by crop and activity",
        icon: Users,
        tone: "bg-amber-light text-amber",
      },
      {
        href: "/inventory",
        label: "Inventory",
        hint: "Seeds, fertilizer and stock",
        icon: Package,
        tone: "bg-brand-50 text-brand-700",
      },
    ],
  },
  {
    title: "Vehicles",
    items: [
      {
        href: "/vehicles",
        label: "Vehicles",
        hint: "Tractor, car, bike and costs",
        icon: Tractor,
        tone: "bg-sky-light text-sky",
      },
    ],
  },
  {
    title: "Planning",
    items: [
      {
        href: "/reminders",
        label: "Important Dates",
        hint: "Bills, tasks and family dates",
        icon: Bell,
        tone: "bg-amber-light text-amber",
      },
      {
        href: "/family",
        label: "Family",
        hint: "Members and birthdays",
        icon: Users,
        tone: "bg-brand-50 text-brand-700",
      },
      {
        href: "/reports",
        label: "Reports",
        hint: "Full financial history",
        icon: BarChart3,
        tone: "bg-brand-50 text-brand-700",
      },
    ],
  },
  {
    title: "App",
    items: [
      {
        href: "/settings",
        label: "Settings",
        hint: "Profile, PIN and categories",
        icon: Settings,
        tone: "bg-canvas text-ink-secondary",
      },
      {
        href: "/reconciliation",
        label: "Reconciliation",
        hint: "Ledger audit & integrity check",
        icon: ShieldCheck,
        tone: "bg-brand-50 text-brand-700",
      },
      {
        href: "/backup",
        label: "Backup and sync",
        hint: "Protect your records",
        icon: Database,
        tone: "bg-canvas text-ink-secondary",
      },
    ],
  },
];

export default function MorePage() {
  const {
    account,
    transactions,
    crops,
    vehicles,
    reminders,
    syncStatus,
    lastSyncedAt,
    cloudConfigured,
    syncNow,
    isOnline,
    lock,
  } = useApp();

  const syncTone =
    syncStatus === "synced"
      ? "positive"
      : syncStatus === "error"
      ? "negative"
      : syncStatus === "offline"
      ? "amber"
      : "neutral";
  const syncLabel =
    syncStatus === "synced"
      ? "Synced"
      : syncStatus === "syncing"
      ? "Syncing…"
      : syncStatus === "error"
      ? "Sync error"
      : syncStatus === "offline"
      ? "Offline"
      : "On this device";

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader title="More" subtitle="Everything else, in one place" />

      <main className="app-container space-y-4 py-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-card border border-line bg-white p-4"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-[18px] font-semibold text-brand-800">
            {account?.name?.trim().charAt(0).toUpperCase() ?? "S"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{account?.name ?? "Your account"}</p>
            <p className="truncate text-[11.5px] text-ink-muted">
              {account?.location ? `${account.location} · ` : ""}
              {account?.mobile ?? "Local account"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
        </Link>

        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                cloudConfigured && isOnline
                  ? "bg-brand-50 text-brand-700"
                  : "bg-canvas text-ink-muted"
              }`}
            >
              {cloudConfigured && isOnline ? (
                <Cloud className="h-5 w-5" />
              ) : (
                <CloudOff className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-ink">
                  {cloudConfigured ? "Cloud backup" : "Saved on this device"}
                </p>
                <StatusPill label={syncLabel} tone={syncTone} dot />
              </div>
              <p className="mt-1 text-[11.5px] leading-4 text-ink-secondary">
                {cloudConfigured
                  ? lastSyncedAt
                    ? `Last synced ${formatDate(lastSyncedAt.slice(0, 10))} at ${new Date(
                        lastSyncedAt
                      ).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.`
                    : "Your records will sync when a connection is available."
                  : "Your records are safe in this browser. Add a MongoDB connection to enable cloud sync."}
              </p>
            </div>
            {isOnline && (
              <button
                type="button"
                onClick={() => void syncNow(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-secondary hover:bg-canvas/80 active:scale-95 transition"
                aria-label="Sync now"
                title="Sync now"
              >
                <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-canvas/80 px-3 py-2">
              <p className="text-[10px] text-ink-muted">Transactions</p>
              <p className="text-[13px] font-semibold text-ink">{transactions.length}</p>
            </div>
            <div className="rounded-xl bg-canvas/80 px-3 py-2">
              <p className="text-[10px] text-ink-muted">Crops</p>
              <p className="text-[13px] font-semibold text-ink">{crops.length}</p>
            </div>
            <div className="rounded-xl bg-canvas/80 px-3 py-2">
              <p className="text-[10px] text-ink-muted">Reminders</p>
              <p className="text-[13px] font-semibold text-ink">{reminders.length}</p>
            </div>
          </div>
          {vehicles.length > 0 && (
            <p className="mt-2 text-[11px] text-ink-muted">
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} tracked separately from home
              and farm spending.
            </p>
          )}
        </section>

        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {group.title}
            </h2>
            <div className="overflow-hidden rounded-card border border-line bg-white">
              <div className="divide-y divide-line/70">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 transition active:bg-canvas/60"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">
                          {item.label}
                        </span>
                        <span className="block truncate text-[11px] text-ink-muted">
                          {item.hint}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        <section className="pt-1">
          <button
            type="button"
            onClick={() => lock()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-[13px] font-semibold text-negative shadow-xs transition active:bg-canvas"
          >
            <LogOut className="h-4 w-4" />
            <span>Lock Personal Bank</span>
          </button>
        </section>

        <div className="flex items-center justify-center gap-1.5 pb-2 pt-1 text-[10.5px] text-ink-muted">
          <Sprout className="h-3.5 w-3.5" />
          Personal Bank · Your Family. Your Farm. Your Finances.
        </div>
      </main>
    </div>
  );
}
