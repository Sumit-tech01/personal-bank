"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Code2,
  Database,
  Download,
  ExternalLink,
  Globe,
  HelpCircle,
  KeyRound,
  Layers,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import { formatRecoveryCode } from "@/lib/auth";
import type { CustomCategory, Language } from "@/lib/types";

const PORTFOLIO_URL =
  process.env.NEXT_PUBLIC_PORTFOLIO_URL || "https://sumitjagtap.vercel.app/";

export default function SettingsPage() {
  const {
    account,
    records,
    updateProfile,
    changePin,
    regenerateRecoveryCode,
    preferences,
    updatePreferences,
    language,
    setLanguage,
    t,
    formatDate,
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

  const groupLabels: Record<CustomCategory["group"], string> = {
    HOME: language === "mr" ? "घरगुती" : "Home",
    FARM: language === "mr" ? "शेती" : "Farm",
    VEHICLE: language === "mr" ? "वाहन" : "Vehicle",
    OTHER: language === "mr" ? "इतर" : "Other",
    INCOME: language === "mr" ? "उत्पन्न" : "Money in",
  };

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
      notify(t("settings.profileUpdated"));
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not update profile.", "error");
    } finally {
      setProfileBusy(false);
    }
  };

  const savePin = async () => {
    setPinError("");
    if (nextPin !== confirmPin) {
      setPinError(language === "mr" ? "नवीन पिन आणि कन्फर्म पिन जुळत नाहीत." : "The new PIN and confirmation do not match.");
      return;
    }
    setPinBusy(true);
    try {
      const result = await changePin(currentPin, nextPin);
      if (!result.ok) {
        setPinError(result.error ?? (language === "mr" ? "पिन बदलता आला नाही." : "Could not change PIN."));
        return;
      }
      setPinOpen(false);
      setCurrentPin("");
      setNextPin("");
      setConfirmPin("");
      notify(language === "mr" ? "पिन बदलला गेला." : "PIN changed.");
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
        setRecoveryError(result.error ?? (language === "mr" ? "रिकव्हरी कोड तयार करता आला नाही." : "Could not create a recovery code."));
        return;
      }
      setNewRecovery(formatRecoveryCode(result.code));
      setRecoveryPin("");
      notify(language === "mr" ? "नवीन रिकव्हरी कोड तयार झाला." : "New recovery code created.");
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
      notify(`“${clean}” ${language === "mr" ? "जोडले गेले." : "added."}`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not add category.", "error");
    } finally {
      setCategoryBusy(false);
    }
  };

  const removeCategory = async (category: CustomCategory) => {
    const okay = await confirm({
      title: language === "mr" ? "ही वर्गवारी हटवायची आहे का?" : "Remove this category?",
      message: language === "mr"
        ? "जुन्या नोंदींवर याचा परिणाम होणार नाही. ती फक्त नवीन यादीतून हटवली जाईल."
        : "Existing records keep their category. It will no longer appear in the category picker.",
      confirmLabel: language === "mr" ? "हटवा" : "Remove",
      danger: true,
    });
    if (!okay) return;
    await deleteCustomCategory(category.id);
    notify(language === "mr" ? "वर्गवारी हटवली." : "Category removed.");
  };

  const resetEverything = async () => {
    const okay = await confirm({
      title: language === "mr" ? "सर्व डेटा कायमचा हटवायचा आहे का?" : "Delete everything?",
      message: language === "mr"
        ? "या डिव्हाइसवरून तुमचे खाते, पिन, सर्व नोंदी आणि सेटिंग्ज हटवल्या जातील. आधी बॅकअप डाउनलोड करा."
        : "This removes your account, PIN, records and settings from this device. Cloud copies are not deleted. Export a backup first if you might need this data.",
      confirmLabel: language === "mr" ? "सर्व डेटा हटवा" : "Delete all data",
      danger: true,
    });
    if (!okay) return;
    await resetAllData();
    router.replace("/");
  };

  const handleLanguageChange = async (newLang: Language) => {
    if (newLang === language) return;
    await setLanguage(newLang);
    notify(newLang === "mr" ? "भाषा बदलून 'मराठी' करण्यात आली." : "Language changed to English.");
  };

  return (
    <div className="min-h-[100dvh] bg-canvas pb-28">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        backHref="/more"
      />

      <main className="app-container space-y-5 py-4">
        {/* ================================================================= */}
        {/* SECTION 1: APP PREFERENCES                                        */}
        {/* ================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              1. {t("settings.sectionPreferences")}
            </span>
          </div>

          {/* Language Selector */}
          <div className="rounded-card border border-line bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Globe className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-semibold text-ink">
                  {t("settings.language")}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  {t("settings.languageDesc")}
                </p>
              </div>
            </div>

            {/* Language Toggle Buttons */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`relative flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  language === "en"
                    ? "border-brand-600 bg-brand-50/70 text-brand-900 shadow-sm"
                    : "border-line bg-white text-ink hover:bg-canvas"
                }`}
              >
                <div>
                  <p className="text-[13.5px] font-semibold">English</p>
                  <p className="text-[10.5px] text-ink-muted">Standard English</p>
                </div>
                {language === "en" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleLanguageChange("mr")}
                className={`relative flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  language === "mr"
                    ? "border-brand-600 bg-brand-50/70 text-brand-900 shadow-sm"
                    : "border-line bg-white text-ink hover:bg-canvas"
                }`}
              >
                <div>
                  <p className="text-[13.5px] font-semibold font-serif">मराठी</p>
                  <p className="text-[10.5px] text-ink-muted">माझी मायबोली मराठी</p>
                </div>
                {language === "mr" && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notifications Setting */}
          <div className="rounded-card border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-light text-amber">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13.5px] font-semibold text-ink">
                  {t("settings.notifications")}
                </h2>
                <p className="text-[11px] text-ink-muted">
                  {t("settings.notificationsDesc")}
                </p>
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-2.5">
              <span className="text-[12px] font-medium text-ink-secondary">
                {t("settings.enableNotifications")}
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
                        language === "mr"
                          ? "सूचना ब्राऊझरद्वारे ब्लॉक केलेल्या आहेत. स्मरणपत्रे तरीही सुरक्षित राहतील."
                          : "Notifications are blocked by your browser. Your reminders are still saved.",
                        "error"
                      );
                    }
                  }
                  await updatePreferences({ notificationsEnabled: enabled });
                }}
                className="h-5 w-5 accent-[#2F7D4F]"
              />
            </label>
            <p className="mt-2 text-[10.5px] leading-4 text-ink-muted">
              {t("settings.notificationsNote")}
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 2: HELP & SUPPORT                                         */}
        {/* ================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              2. {t("settings.sectionHelp")}
            </span>
          </div>

          <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
            <div className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-ink">
                    {t("settings.guidebook")}
                  </h2>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-bold uppercase text-brand-700">
                    Offline Ready
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  {t("settings.guidebookDesc")}
                </p>
              </div>
            </div>

            <div className="border-t border-line/70 divide-y divide-line/70">
              <Link
                href="/guidebook"
                className="flex items-center justify-between p-3.5 text-left transition hover:bg-canvas"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-brand-700" />
                  <span className="text-[12.5px] font-medium text-ink">
                    {language === "mr" ? "सर्व १५ मार्गदर्शक वाचा" : "Browse all 15 guides & tutorials"}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </Link>

              <Link
                href="/guidebook"
                className="flex items-center justify-between p-3.5 text-left transition hover:bg-canvas"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4 text-sky" />
                  <span className="text-[12.5px] font-medium text-ink">
                    {t("settings.faqs")}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </Link>

              <Link
                href="/guidebook"
                className="flex items-center justify-between p-3.5 text-left transition hover:bg-canvas"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="h-4 w-4 text-amber" />
                  <span className="text-[12.5px] font-medium text-ink">
                    {t("settings.troubleshooting")}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 3: DEVELOPER & MY PORTFOLIO                                */}
        {/* ================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              3. {t("settings.sectionDeveloper")}
            </span>
          </div>

          <div className="overflow-hidden rounded-card border border-brand-200 bg-gradient-to-br from-white via-white to-brand-50/40 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
                <Code2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14.5px] font-bold text-ink">
                    {t("settings.portfolioTitle")}
                  </h2>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand-800">
                    Verified
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                  {t("settings.portfolioDesc")}
                </p>
              </div>
            </div>

            {/* Visit My Portfolio Link Button */}
            <div className="mt-4 pt-3 border-t border-brand-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <span className="block truncate text-[11px] font-mono text-ink-muted">
                  {PORTFOLIO_URL}
                </span>
              </div>
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center justify-center gap-2 py-2 px-4 text-[12.5px] font-semibold text-white shadow-sm transition active:scale-95"
                aria-label={`${t("settings.visitPortfolio")} (${t("settings.externalLink")})`}
              >
                <span>{t("settings.visitPortfolio")}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Connect with Developer info */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
              <Mail className="h-3 w-3" />
              <span>
                {language === "mr"
                  ? "अभिप्राय किंवा सहकार्यासाठी पोर्टफोलिओद्वारे संपर्क साधा."
                  : "Connect with developer for feedback, enhancements and collaboration."}
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 4: SECURITY, BACKUP & CLOUD SYNC                           */}
        {/* ================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              4. {t("settings.sectionSecurity")}
            </span>
          </div>

          {/* Profile Card */}
          <div className="rounded-card border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-semibold text-ink">
                  {t("settings.profile")}
                </h2>
                <p className="text-[11.5px] text-ink-muted">
                  {t("settings.profileDesc")}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">{t("settings.name")}</label>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t("settings.mobile")}</label>
                  <input
                    className="input"
                    value={mobile}
                    onChange={(event) => setMobile(event.target.value)}
                    placeholder={t("common.optional")}
                  />
                </div>
                <div>
                  <label className="label">{t("settings.location")}</label>
                  <input
                    className="input"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder={t("common.optional")}
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
                {profileBusy ? t("common.saving") : t("settings.saveProfile")}
              </button>
            </div>
          </div>

          {/* Security (PIN & Recovery Code) */}
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 pt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-ink">
                  {t("settings.security")}
                </h2>
                <p className="text-[11.5px] text-ink-muted">
                  {t("settings.securityDesc")}
                </p>
              </div>
            </div>
            <div className="mt-3 divide-y divide-line/70">
              <button
                type="button"
                onClick={() => setPinOpen(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas"
              >
                <KeyRound className="h-4 w-4 text-ink-muted" />
                <span className="flex-1 text-[13px] font-medium text-ink">
                  {t("settings.changePin")}
                </span>
                <StatusPill label={t("settings.pinDigits", { digits: account?.pinLength ?? 4 })} tone="neutral" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryOpen(true);
                  setNewRecovery("");
                  setRecoveryError("");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas"
              >
                <Lock className="h-4 w-4 text-ink-muted" />
                <span className="flex-1 text-[13px] font-medium text-ink">
                  {t("settings.createRecovery")}
                </span>
                <span className="text-[11px] text-ink-muted">
                  {t("settings.recoveryHint")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  lock();
                  router.replace("/");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas"
              >
                <LogOut className="h-4 w-4 text-ink-muted" />
                <span className="flex-1 text-[13px] font-medium text-ink">
                  {t("settings.lockApp")}
                </span>
              </button>
            </div>
          </div>

          {/* Cloud Backup & Database Status */}
          <div className="rounded-card border border-line bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                {cloudConfigured ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-ink">
                    {t("settings.cloudBackup")}
                  </h2>
                  <StatusPill
                    label={
                      syncStatus === "synced"
                        ? t("sync.synced")
                        : syncStatus === "syncing"
                        ? t("sync.syncing")
                        : syncStatus === "error"
                        ? t("sync.error")
                        : syncStatus === "offline"
                        ? t("sync.offline")
                        : t("sync.localOnly")
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
                    ? t("settings.cloudSyncDesc")
                    : t("settings.localOnlyDesc")}
                </p>
              </div>
            </div>

            {/* Database Details */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
                <p className="text-[10.5px] font-medium text-ink-muted flex items-center gap-1">
                  <Server className="h-3 w-3" /> {t("settings.database")}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-ink truncate">{cloudDatabase}</p>
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
                <p className="text-[10.5px] font-medium text-ink-muted flex items-center gap-1">
                  <Layers className="h-3 w-3" /> {t("settings.collection")}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-ink truncate">{cloudCollection}</p>
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
                <p className="text-[10.5px] font-medium text-ink-muted">{t("settings.localRecords")}</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{records.length}</p>
              </div>
              <div className="rounded-xl border border-line/70 bg-canvas/60 p-2.5">
                <p className="text-[10.5px] font-medium text-ink-muted">{t("settings.cloudRecords")}</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">
                  {cloudRecordsCount !== null ? cloudRecordsCount : "—"}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas/80 px-3 py-2 text-[11px] text-ink-secondary">
              <span>
                {lastSyncedAt
                  ? t("settings.lastSync", {
                      time: `${formatDate(lastSyncedAt.slice(0, 10))} ${new Date(lastSyncedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`,
                    })
                  : t("settings.notSynced")}
              </span>
              <div className="flex items-center gap-2">
                {pendingUploadsCount > 0 && (
                  <span className="font-medium text-amber">
                    {t("sync.pending", { count: pendingUploadsCount })}
                  </span>
                )}
                {failedUploadsCount > 0 && (
                  <span className="font-medium text-negative">
                    {t("sync.failed", { count: failedUploadsCount })}
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
                {syncStatus === "syncing" ? t("sync.syncing") : t("settings.syncNow")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/backup")}
                className="btn-secondary flex-1 py-2 text-[12.5px]"
              >
                <Download className="h-3.5 w-3.5" />
                {t("settings.backupAndRestore")}
              </button>
            </div>
          </div>

          {/* Custom Categories */}
          <div className="rounded-card border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-ink">
                  {t("settings.customCategories")}
                </h2>
                <p className="text-[11.5px] text-ink-muted">
                  {t("settings.customCategoriesDesc")}
                </p>
              </div>
              <StatusPill label={t("settings.added", { count: customCategories.length })} tone="neutral" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                className="select"
                value={categoryGroup}
                onChange={(event) =>
                  setCategoryGroup(event.target.value as CustomCategory["group"])
                }
              >
                {(Object.keys(groupLabels) as CustomCategory["group"][]).map((group) => (
                  <option key={group} value={group}>
                    {groupLabels[group]}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  className="input h-11 min-w-0 flex-1 text-[13px]"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder={t("settings.newCategory")}
                />
                <button
                  type="button"
                  onClick={createCategory}
                  disabled={categoryBusy}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"
                  aria-label={t("settings.addCategory")}
                >
                  {categoryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {customCategories.length === 0 ? (
              <p className="mt-3 rounded-xl bg-canvas px-3 py-3 text-[11.5px] text-ink-muted">
                {t("settings.noCustomCategories")}
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
                        {groupLabels[category.group]}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeCategory(category)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:text-negative"
                      aria-label={`Remove ${category.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete All Data */}
          <div className="rounded-card border border-negative/20 bg-white p-4 shadow-sm">
            <h2 className="text-[14px] font-semibold text-ink">
              {t("settings.deleteAllData")}
            </h2>
            <p className="mt-1 text-[11.5px] leading-4 text-ink-secondary">
              {t("settings.deleteAllDataDesc")}
            </p>
            <button type="button" className="btn-danger mt-3 w-full" onClick={resetEverything}>
              <Trash2 className="h-4 w-4" />
              {t("settings.deleteAccountAndData")}
            </button>
          </div>
        </section>

        {/* Footer info */}
        <p className="pb-2 text-center text-[10.5px] text-ink-muted">
          {t("app.recordsStayYours")} · {t("app.version")}
        </p>
      </main>

      {/* Sheets for PIN change and Recovery Code */}
      <Sheet
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={t("settings.changePin")}
        subtitle="Use 4 to 6 digits you can remember."
        footer={
          <button type="button" className="btn-primary w-full" onClick={savePin} disabled={pinBusy}>
            {pinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pinBusy ? t("common.saving") : t("settings.changePin")}
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
        title={t("settings.createRecovery")}
        subtitle="Write down this secret code in your diary."
        footer={
          newRecovery ? (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setRecoveryOpen(false)}
            >
              <Check className="h-4 w-4" />
              {t("common.done")}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={makeRecovery}
              disabled={recoveryBusy}
            >
              {recoveryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {recoveryBusy ? t("common.saving") : t("settings.createRecovery")}
            </button>
          )
        }
      >
        {newRecovery ? (
          <div className="space-y-3">
            <p className="text-[12.5px] text-ink-secondary">
              Keep this safe. If you ever forget your PIN, this code lets you reset it.
            </p>
            <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-center">
              <span className="font-mono text-[18px] font-bold tracking-widest text-brand-900">
                {newRecovery}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="label">Enter your current PIN to confirm</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={recoveryPin}
              onChange={(event) => setRecoveryPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              autoFocus
            />
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
