"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  Cloud,
  CloudOff,
  Database,
  Download,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import { formatRecoveryCode } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import type { CustomCategory } from "@/lib/types";

const GROUP_LABELS: Record<CustomCategory["group"], string> = {
  HOME: "Home",
  FARM: "Farm",
  VEHICLE: "Vehicle",
  OTHER: "Other",
  INCOME: "Money in",
};

export default function SettingsPage() {
  const {
    account,
    records,
    updateProfile,
    changePin,
    regenerateRecoveryCode,
    preferences,
    updatePreferences,
    customCategories,
    addCustomCategory,
    deleteCustomCategory,
    resetAllData,
    lock,
    syncNow,
    syncStatus,
    lastSyncedAt,
    cloudConfigured,
    cloudDatabase,
    cloudCollection,
    cloudRecordsCount,
    pendingUploadsCount,
    failedUploadsCount,
    lastSyncError,
    refreshCloudStats,
    isOnline,
    notify,
  } = useApp();
  const confirm = useConfirm();
  const router = useRouter();

  const [name, setName] = useState(account?.name ?? "");
  const [mobile, setMobile] = useState(account?.mobile ?? "");
  const [location, setLocation] = useState(account?.location ?? "");
  const [profileBusy, setProfileBusy] = useState(false);

  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryPin, setRecoveryPin] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [newRecovery, setNewRecovery] = useState("");

  const [categoryGroup, setCategoryGroup] = useState<CustomCategory["group"]>("HOME");
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  useEffect(() => {
    setName(account?.name ?? "");
    setMobile(account?.mobile ?? "");
    setLocation(account?.location ?? "");
  }, [account]);

  const saveProfile = async () => {
    setProfileBusy(true);
    try {
      await updateProfile({ name, mobile: mobile || undefined, location: location || undefined });
      notify("Profile updated.");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not update profile.", "error");
    } finally {
      setProfileBusy(false);
    }
  };

  const savePin = async () => {
    setPinError("");
    if (nextPin !== confirmPin) {
      setPinError("The new PIN and confirmation do not match.");
      return;
    }
    setPinBusy(true);
    try {
      const result = await changePin(currentPin, nextPin);
      if (!result.ok) {
        setPinError(result.error ?? "Could not change PIN.");
        return;
      }
      setPinOpen(false);
      setCurrentPin("");
      setNextPin("");
      setConfirmPin("");
      notify("PIN changed.");
    } finally {
      setPinBusy(false);
    }
  };

  const makeRecovery = async () => {
    setRecoveryError("");
    setRecoveryBusy(true);
    try {
      const result = await regenerateRecoveryCode(recoveryPin);
      if (!result.ok || !result.code) {
        setRecoveryError(result.error ?? "Could not create a recovery code.");
        return;
      }
      setNewRecovery(formatRecoveryCode(result.code));
      setRecoveryPin("");
      notify("New recovery code created.");
    } finally {
      setRecoveryBusy(false);
    }
  };

  const createCategory = async () => {
    const clean = newCategory.trim();
    if (!clean) return;
    setCategoryBusy(true);
    try {
      await addCustomCategory(categoryGroup, clean);
      setNewCategory("");
      notify(`“${clean}” added.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not add category.", "error");
    } finally {
      setCategoryBusy(false);
    }
  };

  const removeCategory = async (category: CustomCategory) => {
    const okay = await confirm({
      title: "Remove this category?",
      message: "Existing records keep their category. It will no longer appear in the category picker.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!okay) return;
    await deleteCustomCategory(category.id);
    notify("Category removed.");
  };

  const resetEverything = async () => {
    const okay = await confirm({
      title: "Delete everything?",
      message:
        "This removes your account, PIN, records and settings from this device. Cloud copies are not deleted. Export a backup first if you might need this data.",
      confirmLabel: "Delete all data",
      danger: true,
    });
    if (!okay) return;
    await resetAllData();
    router.replace("/");
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader title="Settings" subtitle="Your account, security and preferences" backHref="/more" />

      <main className="app-container space-y-4 py-4">
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-ink">Your profile</h2>
              <p className="text-[11.5px] text-ink-muted">Shown on the home screen</p>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Mobile</label>
                <input
                  className="input"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="label">Village or town</label>
                <input
                  className="input"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-primary h-10 w-full text-[12.5px]"
              onClick={saveProfile}
              disabled={profileBusy}
            >
              {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {profileBusy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-card border border-line bg-white">
          <div className="flex items-center gap-3 px-4 pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Security</h2>
              <p className="text-[11.5px] text-ink-muted">PIN and recovery code</p>
            </div>
          </div>
          <div className="mt-3 divide-y divide-line/70">
            <button
              type="button"
              onClick={() => setPinOpen(true)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <KeyRound className="h-4 w-4 text-ink-muted" />
              <span className="flex-1 text-[13px] font-medium text-ink">Change PIN</span>
              <StatusPill label={`${account?.pinLength ?? 4} digits`} tone="neutral" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRecoveryOpen(true);
                setNewRecovery("");
                setRecoveryError("");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <Lock className="h-4 w-4 text-ink-muted" />
              <span className="flex-1 text-[13px] font-medium text-ink">Create a new recovery code</span>
              <span className="text-[11px] text-ink-muted">If you forget your PIN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                lock();
                router.replace("/");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <LogOut className="h-4 w-4 text-ink-muted" />
              <span className="flex-1 text-[13px] font-medium text-ink">Lock the app</span>
            </button>
          </div>
        </section>

        {/* PHASE 7: DATABASE MONITORING & CLOUD BACKUP SECTION */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              {cloudConfigured ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold text-ink">Cloud Backup & Database Status</h2>
                <StatusPill
                  label={
                    syncStatus === "synced"
                      ? "Synced"
                      : syncStatus === "syncing"
                      ? "Syncing…"
                      : syncStatus === "error"
                      ? "Sync error"
                      : syncStatus === "offline"
                      ? "Offline"
                      : "Local only"
                  }
                  tone={
                    syncStatus === "synced"
                      ? "positive"
                      : syncStatus === "error"
                      ? "negative"
                      : syncStatus === "offline"
                      ? "amber"
                      : "neutral"
                  }
                  dot
                />
              </div>
              <p className="mt-1 text-[11.5px] leading-4 text-ink-secondary">
                {cloudConfigured
                  ? "Connected to MongoDB Atlas private cluster. Records sync automatically."
                  : "Records stored locally on this device. Connect MongoDB to enable cloud sync."}
              </p>
            </div>
          </div>

          {/* Database Details */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
              <p className="text-[10.5px] font-medium text-ink-muted flex items-center gap-1">
                <Server className="h-3 w-3" /> Database
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink truncate">{cloudDatabase}</p>
            </div>
            <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
              <p className="text-[10.5px] font-medium text-ink-muted flex items-center gap-1">
                <Layers className="h-3 w-3" /> Collection
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink truncate">{cloudCollection}</p>
            </div>
            <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
              <p className="text-[10.5px] font-medium text-ink-muted">Local Records</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">{records.length}</p>
            </div>
            <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
              <p className="text-[10.5px] font-medium text-ink-muted">Cloud Records</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">
                {cloudRecordsCount !== null ? cloudRecordsCount : "—"}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas/80 px-3 py-2 text-[11px] text-ink-secondary">
            <span>
              {lastSyncedAt
                ? `Last sync: ${formatDate(lastSyncedAt.slice(0, 10))} at ${new Date(
                    lastSyncedAt
                  ).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
                : "Not synced yet"}
            </span>
            <div className="flex items-center gap-2">
              {pendingUploadsCount > 0 && (
                <span className="font-medium text-amber">
                  {pendingUploadsCount} pending
                </span>
              )}
              {failedUploadsCount > 0 && (
                <span className="font-medium text-negative">
                  {failedUploadsCount} failed
                </span>
              )}
            </div>
          </div>

          {lastSyncError && (
            <p className="mt-2 rounded-xl bg-negative-light px-3 py-2 text-[11.5px] text-negative flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {lastSyncError}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void syncNow(true)}
              disabled={syncStatus === "syncing" || !isOnline}
              className="btn-primary flex-1 py-2 text-[12.5px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              {syncStatus === "syncing" ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/backup")}
              className="btn-secondary flex-1 py-2 text-[12.5px]"
            >
              <Download className="h-3.5 w-3.5" />
              Backup & Restore
            </button>
          </div>
        </section>

        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-light text-amber">
              <Bell className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold text-ink">Notifications</h2>
              <p className="text-[11.5px] text-ink-muted">Reminder alerts while the app is open</p>
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
            <span className="text-[12.5px] text-ink-secondary">
              Enable notifications for reminders
            </span>
            <input
              type="checkbox"
              checked={preferences.notificationsEnabled}
              onChange={async (event) => {
                let enabled = event.target.checked;
                if (enabled && typeof Notification !== "undefined") {
                  let permission = Notification.permission;
                  if (permission === "default") {
                    try {
                      permission = await Notification.requestPermission();
                    } catch {
                      permission = "denied";
                    }
                  }
                  if (permission !== "granted") {
                    enabled = false;
                    notify(
                      "Notifications are blocked by your browser. Your reminders are still saved.",
                      "error"
                    );
                  }
                }
                await updatePreferences({ notificationsEnabled: enabled });
              }}
              className="h-5 w-5 accent-[#2F7D4F]"
            />
          </label>
          <p className="mt-2 text-[11px] leading-4 text-ink-muted">
            Notifications are a convenience. Your reminders are always saved even when
            notifications are off.
          </p>
        </section>

        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Custom categories</h2>
              <p className="text-[11.5px] text-ink-muted">Add your own names to the pickers</p>
            </div>
            <StatusPill label={`${customCategories.length} added`} tone="neutral" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <select
              className="select"
              value={categoryGroup}
              onChange={(event) =>
                setCategoryGroup(event.target.value as CustomCategory["group"])
              }
            >
              {(Object.keys(GROUP_LABELS) as CustomCategory["group"][]).map((group) => (
                <option key={group} value={group}>
                  {GROUP_LABELS[group]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                className="input h-11 min-w-0 flex-1 text-[13px]"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="New category"
              />
              <button
                type="button"
                onClick={createCategory}
                disabled={categoryBusy}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"
                aria-label="Add category"
              >
                {categoryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {customCategories.length === 0 ? (
            <p className="mt-3 rounded-xl bg-canvas px-3 py-3 text-[11.5px] text-ink-muted">
              No custom categories yet. The built-in categories are always available.
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {customCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 rounded-xl bg-canvas/70 px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {category.name}
                    </span>
                    <span className="block text-[10px] text-ink-muted">
                      {GROUP_LABELS[category.group]}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeCategory(category)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted"
                    aria-label={`Remove ${category.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-card border border-negative/20 bg-white p-4">
          <h2 className="text-[14px] font-semibold text-ink">Delete all data</h2>
          <p className="mt-1 text-[11.5px] leading-4 text-ink-secondary">
            Remove your account and every record from this device. Export a backup first.
          </p>
          <button type="button" className="btn-danger mt-3 w-full" onClick={resetEverything}>
            <Trash2 className="h-4 w-4" />
            Delete account and all data
          </button>
        </section>

        <p className="pb-2 text-center text-[10.5px] text-ink-muted">
          Personal Bank · records stay yours · version 1.0
        </p>
      </main>

      <Sheet
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Change PIN"
        subtitle="Use 4 to 6 digits you can remember."
        footer={
          <button type="button" className="btn-primary w-full" onClick={savePin} disabled={pinBusy}>
            {pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pinBusy ? "Saving…" : "Change PIN"}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Current PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              autoFocus
            />
          </div>
          <div>
            <label className="label">New PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={nextPin}
              onChange={(event) => setNextPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4 to 6 digits"
            />
          </div>
          <div>
            <label className="label">Confirm new PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Repeat new PIN"
            />
          </div>
          {pinError && (
            <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
              {pinError}
            </p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        title="New recovery code"
        subtitle="This replaces the old code. Keep it somewhere safe."
        footer={
          newRecovery ? (
            <button type="button" className="btn-primary w-full" onClick={() => setRecoveryOpen(false)}>
              <Check className="h-4 w-4" />
              I have saved it
            </button>
          ) : (
            <button type="button" className="btn-primary w-full" onClick={makeRecovery} disabled={recoveryBusy}>
              {recoveryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {recoveryBusy ? "Creating…" : "Create recovery code"}
            </button>
          )
        }
      >
        {newRecovery ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-5 text-ink-secondary">
              Write this code down. It is the only way back in if you forget your PIN.
            </p>
            <p className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-5 text-center text-[22px] font-semibold tracking-[0.08em] text-brand-900">
              {newRecovery}
            </p>
            <p className="text-[11.5px] leading-4 text-ink-muted">
              Anyone with this code can reset the PIN. Keep it private.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] leading-5 text-ink-secondary">
              Confirm your current PIN to create a fresh recovery code.
            </p>
            <div>
              <label className="label">Current PIN</label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                value={recoveryPin}
                onChange={(event) =>
                  setRecoveryPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••"
                autoFocus
              />
            </div>
            {recoveryError && (
              <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
                {recoveryError}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
