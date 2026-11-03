"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Plus, Receipt, Sprout, MoreHorizontal } from "lucide-react";
import { useApp } from "@/context/AppContext";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/farm", label: "Farm", icon: Sprout },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

const moreRoutes = [
  "/more",
  "/settings",
  "/backup",
  "/income",
  "/transactions",
  "/labour",
  "/vehicles",
  "/reminders",
  "/loans",
  "/lending",
  "/inventory",
  "/family",
  "/guidebook",
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const { openAdd, t } = useApp();

  const navItems = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/expenses", label: t("nav.expenses"), icon: Receipt },
    { href: "/farm", label: t("nav.farm"), icon: Sprout },
    { href: "/reports", label: t("nav.reports"), icon: BarChart3 },
    { href: "/more", label: t("nav.more"), icon: MoreHorizontal },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/more") return moreRoutes.some((route) => pathname.startsWith(route));
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => openAdd()}
        className="no-print fixed bottom-[calc(74px+env(safe-area-inset-bottom))] left-1/2 z-50 flex h-[58px] w-[58px] -translate-x-1/2 items-center justify-center rounded-full bg-brand-600 text-white shadow-float ring-[6px] ring-canvas transition active:scale-95"
        aria-label={t("nav.addRecord")}
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/95 backdrop-blur-lg"
        aria-label="Main navigation"
      >
        <div className="safe-bottom mx-auto flex h-[68px] w-full max-w-[560px] items-stretch justify-between px-1.5 md:max-w-2xl md:px-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                  active ? "text-brand-700" : "text-ink-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? "bg-brand-50" : ""
                  }`}
                >
                  <Icon
                    className="h-[21px] w-[21px]"
                    strokeWidth={active ? 2.5 : 2}
                  />
                </span>
                <span
                  className={`truncate text-[10.5px] leading-none ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
