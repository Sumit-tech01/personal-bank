"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  BarChart3,
  Bell,
  BookOpen,
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
    language,
    t,
  } = useApp();

  const groups = useMemo(() => {
    return [
      {
        title: language === "mr" ? "आर्थिक व्यवहार" : "Money",
        items: [
          {
            href: "/income",
            label: language === "mr" ? "उत्पन्न (पैसे आले)" : "Money in",
            hint: language === "mr" ? "वर्गवारी व महिन्यानुसार उत्पन्न" : "Income by category and month",
            icon: ArrowDownLeft,
            tone: "bg-positive-light text-positive",
          },
          {
            href: "/transactions",
            label: language === "mr" ? "सर्व व्यवहार" : "All transactions",
            hint: language === "mr" ? "सर्व नोंदी एकाच यादीत" : "Every record in one list",
            icon: List,
            tone: "bg-brand-50 text-brand-700",
          },
          {
            href: "/loans",
            label: language === "mr" ? "घेतलेले कर्ज" : "Loans",
            hint: language === "mr" ? "द्यायचे बाकी कर्ज व हप्ते" : "Money you need to repay",
            icon: Landmark,
            tone: "bg-sky-light text-sky",
          },
          {
            href: "/lending",
            label: language === "mr" ? "दिलेले पैसे (उधारी)" : "Money lent",
            hint: language === "mr" ? "इतरांकडून परत येणारी उसनवारी" : "Money you expect back",
            icon: HandCoins,
            tone: "bg-brand-50 text-brand-700",
          },
        ],
      },
      {
        title: language === "mr" ? "शेती नियोजन" : "Farm",
        items: [
          {
            href: "/labour",
            label: language === "mr" ? "मजूर व मजुरी" : "Labour",
            hint: language === "mr" ? "रोजंदारी, हजेरी व मजुरी वाटप" : "Wages by crop and activity",
            icon: Users,
            tone: "bg-amber-light text-amber",
          },
          {
            href: "/inventory",
            label: language === "mr" ? "शेती साठा व साहित्य" : "Inventory",
            hint: language === "mr" ? "बियाणे, खते, औषधे व डिझेल साठा" : "Seeds, fertilizer and stock",
            icon: Package,
            tone: "bg-brand-50 text-brand-700",
          },
        ],
      },
      {
        title: language === "mr" ? "वाहने व यंत्रे" : "Vehicles",
        items: [
          {
            href: "/vehicles",
            label: language === "mr" ? "वाहने व ट्रॅक्टर" : "Vehicles",
            hint: language === "mr" ? "ट्रॅक्टर, गाडी, डिझेल व दुरुस्ती" : "Tractor, car, bike and costs",
            icon: Tractor,
            tone: "bg-sky-light text-sky",
          },
        ],
      },
      {
        title: language === "mr" ? "नियोजन व कुटुंब" : "Planning",
        items: [
          {
            href: "/reminders",
            label: language === "mr" ? "महत्त्वाच्या तारखा" : "Important Dates",
            hint: language === "mr" ? "लाईट बिल, फवारणी व घरगुती कामे" : "Bills, tasks and family dates",
            icon: Bell,
            tone: "bg-amber-light text-amber",
          },
          {
            href: "/family",
            label: language === "mr" ? "कुटुंब सदस्य" : "Family",
            hint: language === "mr" ? "कुटुंबातील सदस्य व वाढदिवस" : "Members and birthdays",
            icon: Users,
            tone: "bg-brand-50 text-brand-700",
          },
          {
            href: "/reports",
            label: language === "mr" ? "आर्थिक अहवाल" : "Reports",
            hint: language === "mr" ? "संपूर्ण आर्थिक ताळेबंद व नफा" : "Full financial history",
            icon: BarChart3,
            tone: "bg-brand-50 text-brand-700",
          },
        ],
      },
      {
        title: language === "mr" ? "ॲप व मदत" : "App & Help",
        items: [
          {
            href: "/guidebook",
            label: language === "mr" ? "मार्गदर्शक आणि मदत" : "Guidebook & Help",
            hint: language === "mr" ? "सविस्तर माहिती, FAQs व समस्या निवारण" : "Guides, FAQs and troubleshooting",
            icon: BookOpen,
            tone: "bg-brand-50 text-brand-700",
          },
          {
            href: "/settings",
            label: language === "mr" ? "सेटिंग्ज" : "Settings",
            hint: language === "mr" ? "भाषा, प्रोफाइल, पिन व वर्गवाऱ्या" : "Language, profile, PIN and developer",
            icon: Settings,
            tone: "bg-canvas text-ink-secondary",
          },
          {
            href: "/reconciliation",
            label: language === "mr" ? "हिशोब पडताळणी" : "Reconciliation",
            hint: language === "mr" ? "खात्यांची शुद्धता व ताळेबंद तपासणी" : "Ledger audit & integrity check",
            icon: ShieldCheck,
            tone: "bg-brand-50 text-brand-700",
          },
          {
            href: "/backup",
            label: language === "mr" ? "बॅकअप आणि सिंक" : "Backup and sync",
            hint: language === "mr" ? "हिशोब सुरक्षित ठेवा व डाऊनलोड करा" : "Protect your records",
            icon: Database,
            tone: "bg-canvas text-ink-secondary",
          },
        ],
      },
    ];
  }, [language]);

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
      ? t("sync.synced")
      : syncStatus === "syncing"
      ? t("sync.syncing")
      : syncStatus === "error"
      ? t("sync.error")
      : syncStatus === "offline"
      ? t("sync.offline")
      : t("sync.localOnly");

  return (
    <div className="min-h-[100dvh] bg-canvas pb-24">
      <PageHeader
        title={t("nav.more")}
        subtitle={language === "mr" ? "इतर सर्व पर्याय, एकाच ठिकाणी" : "Everything else, in one place"}
      />

      <main className="app-container space-y-4 py-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-card border border-line bg-white p-4 shadow-sm transition hover:bg-canvas/50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-[18px] font-semibold text-brand-800">
            {account?.name?.trim().charAt(0).toUpperCase() ?? "S"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{account?.name ?? (language === "mr" ? "तुमचे खाते" : "Your account")}</p>
            <p className="truncate text-[11.5px] text-ink-muted">
              {account?.location ? `${account.location} · ` : ""}
              {account?.mobile ?? (language === "mr" ? "स्थानिक खाते" : "Local account")}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
        </Link>

        {/* Cloud Sync Status Banner */}
        <section className="rounded-card border border-line bg-white p-4 shadow-sm">
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-ink">
                  {language === "mr" ? "क्लाउड डेटाबेस स्थिती" : "Cloud database"}
                </h2>
                <StatusPill label={syncLabel} tone={syncTone} dot />
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {lastSyncedAt
                  ? t("settings.lastSync", {
                      time: `${formatDate(lastSyncedAt.slice(0, 10))} ${new Date(lastSyncedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`,
                    })
                  : t("settings.notSynced")}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void syncNow(true)}
              disabled={syncStatus === "syncing" || !isOnline}
              className="btn-primary flex-1 py-2 text-[12px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              {syncStatus === "syncing" ? t("sync.syncing") : t("sync.syncNow")}
            </button>
            <Link
              href="/backup"
              className="btn-secondary flex-1 py-2 text-center text-[12px]"
            >
              <Database className="h-3.5 w-3.5" />
              {t("settings.backupAndRestore")}
            </Link>
          </div>
        </section>

        {/* Feature Groups */}
        {groups.map((group) => (
          <section key={group.title} className="space-y-1.5">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              {group.title}
            </h2>
            <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm divide-y divide-line/60">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3.5 transition hover:bg-canvas/50"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-ink leading-tight">{item.label}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-muted leading-tight">{item.hint}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* App Lock Button */}
        <button
          type="button"
          onClick={() => lock()}
          className="flex w-full items-center justify-center gap-2 rounded-card border border-line bg-white p-3.5 text-[12.5px] font-medium text-ink shadow-sm transition hover:bg-canvas"
        >
          <LogOut className="h-4 w-4 text-ink-muted" />
          <span>{t("settings.lockApp")}</span>
        </button>
      </main>
    </div>
  );
}
