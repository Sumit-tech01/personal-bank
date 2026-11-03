"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatINR } from "@/lib/money";
import { useApp } from "@/context/AppContext";

interface BalanceCardProps {
  balancePaise: number;
  incomePaise: number;
  expensePaise: number;
  periodLabel: string;
  pendingIncomePaise?: number;
  periodClosingBalancePaise?: number;
}

export default function BalanceCard({
  balancePaise,
  incomePaise,
  expensePaise,
  periodLabel,
  pendingIncomePaise = 0,
  periodClosingBalancePaise,
}: BalanceCardProps) {
  const { t, language } = useApp();
  const negative = balancePaise < 0;

  return (
    <section
      className="relative overflow-hidden rounded-card bg-brand-800 p-5 text-white shadow-[0_18px_40px_-24px_rgba(23,63,40,0.8)]"
      aria-label={t("dashboard.availableBalance")}
    >
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border-[26px] border-white/[0.055]" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full border-[20px] border-white/[0.04]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/65">
              {t("dashboard.availableBalance")}
            </p>
            <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.035em] sm:text-[38px]">
              {formatINR(balancePaise)}
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white/90">
            <Wallet className="h-5 w-5" />
          </span>
        </div>

        <p className="mt-2 text-[11.5px] leading-5 text-white/60">
          {negative
            ? (language === "mr" ? "आत्तापर्यंत मिळालेल्या रकमेपेक्षा झालेला खर्च जास्त आहे." : "You have spent more than you have received so far.")
            : (language === "mr" ? "प्रत्यक्षात मिळालेले एकूण पैसे वजा प्रत्यक्षात झालेला एकूण खर्च." : "Money actually received minus money actually paid.")}
          {pendingIncomePaise > 0
            ? (language === "mr"
                ? ` ${formatINR(pendingIncomePaise)} येणे बाकी अजून शिलकीत समाविष्ट नाही.`
                : ` ${formatINR(pendingIncomePaise)} is still pending and not included.`)
            : ""}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white/[0.08] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-white/60">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span className="text-[10.5px] font-semibold uppercase tracking-wide">
                {t("dashboard.totalIncome")}
              </span>
            </div>
            <p className="mt-1 truncate text-[15px] font-semibold text-white">
              {formatINR(incomePaise)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.08] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-white/60">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span className="text-[10.5px] font-semibold uppercase tracking-wide">
                {t("dashboard.totalExpenses")}
              </span>
            </div>
            <p className="mt-1 truncate text-[15px] font-semibold text-white">
              {formatINR(expensePaise)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10.5px] text-white/60">
          <span>{periodLabel}</span>
          {periodClosingBalancePaise !== undefined ? (
            <span>{language === "mr" ? "कालावधी अखेर शिल्लक: " : "Period Closing: "}{formatINR(periodClosingBalancePaise)}</span>
          ) : (
            <span>{language === "mr" ? "रोख आधारावर" : "Cash basis"}</span>
          )}
        </div>
      </div>
    </section>
  );
}
