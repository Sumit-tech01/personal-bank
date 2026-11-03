"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileJson,
  Layers,
  Loader2,
  RefreshCw,
  Server,
  Upload,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/dates";
import { parseBackup } from "@/lib/backup";

interface BackupPreviewData {
  text: string;
  profile?: { name: string; mobile?: string; location?: string };
  recordsCount: number;
  skipped: number;
  byEntity: Record<string, number>;
}

export default function BackupPage() {
  const {
    account,
    records,
    exportBackup,
    importBackupText,
    preferences,
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

  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastExport, setLastExport] = useState<{ count: number; at: string } | null>(null);
  const [previewData, setPreviewData] = useState<BackupPreviewData | null>(null);

  useEffect(() => {
    void refreshCloudStats();
  }, [refreshCloudStats]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportBackup();
      setLastExport({ count: result.count, at: new Date().toISOString() });
      notify(`Backup downloaded with ${result.count} record${result.count === 1 ? "" : "s"}.`);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not create a backup.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        throw new Error("This file is not valid JSON.");
      }
      const parsed = parseBackup(parsedJson, account?.id || "temp-owner");
      const byEntity: Record<string, number> = {};
      for (const r of parsed.records) {
        byEntity[r.entity] = (byEntity[r.entity] || 0) + 1;
      }
      setPreviewData({
        text,
        profile: parsed.profile,
        recordsCount: parsed.records.length,
        skipped: parsed.skipped,
        byEntity,
      });
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not read backup file.", "error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmRestore = async () => {
    if (!previewData) return;
    setImporting(true);
    try {
      const result = await importBackupText(previewData.text);
      notify(
        `Restored ${result.imported} record${result.imported === 1 ? "" : "s"}${
          result.skipped ? `, skipped ${result.skipped} older or duplicate` : ""
        }.`
      );
      setPreviewData(null);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not restore this backup.", "error");
    } finally {
      setImporting(false);
    }
  };

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
      : "Local only";

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title="Backup and sync"
        subtitle="Keep your records safe"
        backHref="/more"
      />

      <main className="app-container space-y-4 py-4">
        {/* PHASE 7: DATABASE MONITORING & CLOUD SYNC UI */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              {cloudConfigured ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold text-ink">
                  {cloudConfigured ? "MongoDB Atlas Cloud Sync" : "Saved on this device"}
                </h2>
                <StatusPill label={syncLabel} tone={syncTone} dot />
              </div>
              <p className="mt-1 text-[11.5px] leading-4 text-ink-secondary">
                {cloudConfigured
                  ? "Real-time synchronization between browser IndexedDB and private MongoDB Atlas cluster."
                  : "This browser is currently storing records locally. Connect MongoDB to enable cloud sync."}
              </p>
            </div>
          </div>

          {/* Database Metrics Grid */}
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

          {/* Sync Activity & Error Status */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas/80 px-3 py-2 text-[11px] text-ink-secondary">
            <span>
              {lastSyncedAt
                ? `Last sync: ${formatDate(lastSyncedAt.slice(0, 10))} at ${new Date(
                    lastSyncedAt
                  ).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
                : "No cloud sync yet"}
            </span>
            <div className="flex items-center gap-2">
              {pendingUploadsCount > 0 && (
                <span className="font-medium text-amber">
                  {pendingUploadsCount} pending upload{pendingUploadsCount === 1 ? "" : "s"}
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

          {isOnline && (
            <button
              type="button"
              onClick={() => void syncNow(true)}
              disabled={syncStatus === "syncing"}
              className="btn-secondary mt-3 w-full"
            >
              <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              {syncStatus === "syncing" ? "Syncing with MongoDB…" : "Sync now"}
            </button>
          )}
          {!isOnline && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber">
              <AlertTriangle className="h-3.5 w-3.5" />
              You are offline. New records will sync when the connection returns.
            </p>
          )}
        </section>

        {/* Export Section */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Download className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Download a backup</h2>
              <p className="text-[11.5px] text-ink-muted">A JSON file with every family & farm record</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-ink-secondary">
            Keep a copy on your phone or computer. The file includes transactions, crops, labour,
            vehicles, reminders, loans, inventory, family members and categories.
          </p>
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            {exporting ? "Preparing backup…" : "Download backup file"}
          </button>
          {(lastExport || preferences.lastBackupAt) && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-positive">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {lastExport
                ? `${lastExport.count} records saved just now.`
                : `Last backup: ${formatDate(preferences.lastBackupAt?.slice(0, 10) ?? "")}`}
            </p>
          )}
          <p className="mt-2 text-[10.5px] leading-4 text-ink-muted">
            The backup contains your financial records but never your PIN. Anyone with the file can read
            the data, so keep it private.
          </p>
        </section>

        {/* Restore Section with Preview */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-light text-amber">
              <Upload className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink">Restore a backup</h2>
              <p className="text-[11.5px] text-ink-muted">Preview and restore records from backup</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-ink-secondary">
            Choose a Personal Bank backup file. You can preview the contents before confirming. Newer records
            already on this device are always preserved, and duplicates are prevented.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleFileSelect(event.target.files?.[0])}
          />
          <button
            type="button"
            className="btn-secondary mt-3 w-full"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Reading file…" : "Choose a backup file"}
          </button>
        </section>

        {/* Architecture & Security Notice */}
        <section className="rounded-2xl bg-canvas px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-ink-muted" />
            <p className="text-[12px] font-semibold text-ink">Database architecture & security</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-5 text-ink-secondary">
            <li>• Every record is saved in local IndexedDB first, ensuring instant offline response.</li>
            <li>• Synchronized documents are stored in the unified <code>syncrecords</code> collection on MongoDB Atlas.</li>
            <li>• Unique compound index <code>&#123; ownerId, recordId &#125;</code> strictly prevents duplicate records.</li>
            <li>• Last-Write-Wins (LWW) conflict resolution prevents older data from overwriting newer records.</li>
          </ul>
        </section>
      </main>

      {/* PHASE 6: BACKUP PREVIEW SHEET */}
      {previewData && (
        <Sheet
          open={!!previewData}
          onClose={() => setPreviewData(null)}
          title="Restore Backup Preview"
          subtitle={`Backup contains ${previewData.recordsCount} record${previewData.recordsCount === 1 ? "" : "s"}`}
          size="md"
          footer={
            <div className="flex gap-2 w-full">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setPreviewData(null)}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={confirmRestore}
                disabled={importing}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {importing ? "Restoring…" : `Restore ${previewData.recordsCount} records`}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {previewData.profile?.name && (
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-[11px] text-ink-muted">Account Profile in Backup</p>
                <p className="text-[13px] font-semibold text-ink">{previewData.profile.name}</p>
                {previewData.profile.location && (
                  <p className="text-[11.5px] text-ink-secondary">{previewData.profile.location}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-[12.5px] font-semibold text-ink mb-2">Record Breakdown:</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(previewData.byEntity).map(([entity, count]) => (
                  <div key={entity} className="rounded-xl border border-line/70 bg-white p-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-ink-muted">{entity}</p>
                    <p className="text-[15px] font-semibold text-ink mt-0.5">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-brand-50 p-3 text-[11.5px] leading-5 text-brand-900 border border-brand-200">
              <p className="font-semibold text-brand-800">Safe Restoration Guarantee</p>
              <p className="mt-0.5 text-brand-700">
                Any record currently on your device that is newer than the backup copy will be kept.
                No duplicate records will be created.
              </p>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
