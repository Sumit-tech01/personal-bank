"use client";

import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, WifiOff } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ConfirmProvider } from "./ui/ConfirmProvider";
import BottomNavigation from "./BottomNavigation";
import AddRecordSheet from "./AddRecordSheet";
import { LockScreen, SetupScreen, SplashScreen } from "./auth/AuthScreens";
import { todayISO } from "@/lib/dates";
import { requestStoragePersistence } from "@/lib/db";

function DataLoadingScreen() {
  const { t } = useApp();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-6">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      <p className="mt-3 text-[13px] text-ink-secondary">{t("auth.openingRecords")}</p>
    </div>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const tone =
    toast.tone === "error"
      ? "bg-negative text-white"
      : toast.tone === "info"
      ? "bg-ink text-white"
      : "bg-brand-800 text-white";
  const Icon =
    toast.tone === "error" ? AlertTriangle : toast.tone === "info" ? Info : CheckCircle2;
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(142px+env(safe-area-inset-bottom))] z-[90] flex justify-center px-4">
      <div
        key={toast.id}
        className={`flex max-w-[420px] items-center gap-2.5 rounded-2xl px-4 py-3 text-[12.5px] font-medium shadow-float animate-toast-in ${tone}`}
        role="status"
        aria-live="polite"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0">{toast.message}</span>
      </div>
    </div>
  );
}

export default function AppRoot({ children }: { children: React.ReactNode }) {
  const {
    isReady,
    isDataReady,
    account,
    isUnlocked,
    isOnline,
    reminders,
    preferences,
    t,
  } = useApp();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("Service worker registration failed:", err));
    }
    // Safe, non-blocking persistent storage request (protects against Android OS eviction)
    void requestStoragePersistence();
  }, []);

  useEffect(() => {
    if (!isUnlocked || !preferences.notificationsEnabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = todayISO();
    const storageKey = `sheti_notified_${today}`;
    try {
      if (localStorage.getItem(storageKey)) return;
      const due = reminders.filter(
        (reminder) => !reminder.completed && reminder.date === today && reminder.notify
      );
      if (due.length > 0) {
        new Notification("Personal Bank — today", {
          body:
            due.length === 1
              ? due[0].title
              : `${due[0].title} and ${due.length - 1} more reminder${
                  due.length > 2 ? "s" : ""
                }`,
          icon: "/icon.svg",
        });
        localStorage.setItem(storageKey, "1");
      }
    } catch {
      // Notifications are a convenience, never a requirement.
    }
  }, [isUnlocked, preferences.notificationsEnabled, reminders]);

  if (!isReady) {
    return (
      <ConfirmProvider>
        <SplashScreen />
      </ConfirmProvider>
    );
  }

  if (!account) {
    return (
      <ConfirmProvider>
        <SetupScreen />
      </ConfirmProvider>
    );
  }

  if (!isUnlocked) {
    return (
      <ConfirmProvider>
        <LockScreen />
      </ConfirmProvider>
    );
  }

  if (!isDataReady) {
    return (
      <ConfirmProvider>
        <DataLoadingScreen />
      </ConfirmProvider>
    );
  }

  return (
    <ConfirmProvider>
      <div className="min-h-[100dvh] bg-canvas">
        {!isOnline && (
          <div className="no-print flex items-center justify-center gap-1.5 bg-amber-light px-4 py-2 text-center text-[11.5px] font-medium text-amber">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            {t("auth.offlineBanner")}
          </div>
        )}
        <div className="pb-nav">{children}</div>
        <BottomNavigation />
        <AddRecordSheet />
        <Toast />
      </div>
    </ConfirmProvider>
  );
}
