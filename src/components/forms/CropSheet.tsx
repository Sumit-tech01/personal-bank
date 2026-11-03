"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import Segmented from "@/components/ui/Segmented";
import { useApp } from "@/context/AppContext";
import { CROP_STATUS_OPTIONS, POPULAR_CROPS, SEASONS } from "@/lib/constants";
import { isValidISODate, todayISO } from "@/lib/dates";
import type { Crop, CropStatus } from "@/lib/types";

interface CropSheetProps {
  open: boolean;
  onClose: () => void;
  crop?: Crop | null;
  defaultLandId?: string;
}

export default function CropSheet({ open, onClose, crop, defaultLandId }: CropSheetProps) {
  const { lands, saveCrop, notify, t } = useApp();
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [season, setSeason] = useState<Crop["season"]>("Kharif");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [landId, setLandId] = useState("");
  const [areaAcres, setAreaAcres] = useState("");
  const [sowingDate, setSowingDate] = useState(todayISO());
  const [expectedHarvestDate, setExpectedHarvestDate] = useState("");
  const [actualHarvestDate, setActualHarvestDate] = useState("");
  const [status, setStatus] = useState<CropStatus>("ACTIVE");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    if (crop) {
      setName(crop.name);
      setVariety(crop.variety ?? "");
      setSeason(crop.season);
      setYear(crop.year);
      setLandId(crop.landId ?? "");
      setAreaAcres(String(crop.areaAcres || ""));
      setSowingDate(crop.sowingDate);
      setExpectedHarvestDate(crop.expectedHarvestDate ?? "");
      setActualHarvestDate(crop.actualHarvestDate ?? "");
      setStatus(crop.status);
      setNotes(crop.notes ?? "");
    } else {
      setName("");
      setVariety("");
      setSeason("Kharif");
      setYear(String(new Date().getFullYear()));
      const initialLandId = defaultLandId ?? lands[0]?.id ?? "";
      setLandId(initialLandId);
      const chosenLand = lands.find((l) => l.id === initialLandId);
      setAreaAcres(chosenLand ? String(chosenLand.areaAcres) : "");
      setSowingDate(todayISO());
      setExpectedHarvestDate("");
      setActualHarvestDate("");
      setStatus("ACTIVE");
      setNotes("");
    }
  }, [open, crop, defaultLandId, lands]);

  const handleLandChange = (chosenId: string) => {
    setLandId(chosenId);
    if (!areaAcres || Number(areaAcres) === 0) {
      const match = lands.find((l) => l.id === chosenId);
      if (match && match.areaAcres > 0) {
        setAreaAcres(String(match.areaAcres));
      }
    }
  };

  const save = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter a crop name.");
      return;
    }
    const area = Number(areaAcres);
    if (!Number.isFinite(area) || area < 0) {
      setError("Please enter a valid cultivated area in acres.");
      return;
    }
    const yearNumber = Number(year);
    if (!Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > 2100) {
      setError("Please enter a crop year between 1900 and 2100.");
      return;
    }
    if (!isValidISODate(sowingDate)) {
      setError("Please choose a valid sowing date.");
      return;
    }
    if (expectedHarvestDate && !isValidISODate(expectedHarvestDate)) {
      setError("Please choose a valid expected harvest date.");
      return;
    }
    if (actualHarvestDate && !isValidISODate(actualHarvestDate)) {
      setError("Please choose a valid actual harvest date.");
      return;
    }
    setBusy(true);
    try {
      await saveCrop(
        {
          name: name.trim(),
          variety: variety || undefined,
          season,
          year,
          landId: landId || undefined,
          areaAcres: area,
          sowingDate,
          expectedHarvestDate: expectedHarvestDate || undefined,
          actualHarvestDate:
            status === "COMPLETED" || status === "HARVESTING"
              ? actualHarvestDate || todayISO()
              : undefined,
          status,
          notes: notes || undefined,
        },
        crop?.id
      );
      notify(crop ? "Crop updated." : "Crop added.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save crop.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={crop ? "Edit crop" : t("farm.addCrop")}
      subtitle="Track the crop, its plot and the season."
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "…" : crop ? t("form.saveChanges") : t("common.save")}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            Crop name <span className="text-negative">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Soybean, Cotton, Wheat"
            autoFocus={!crop}
          />
          {/* Quick-pick crop chips */}
          {!crop && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POPULAR_CROPS.slice(0, 8).map((cropName) => (
                <button
                  key={cropName}
                  type="button"
                  onClick={() => setName(cropName)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    name === cropName
                      ? "bg-brand-600 text-white"
                      : "bg-canvas text-ink-secondary hover:bg-canvas-strong"
                  }`}
                >
                  {cropName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Variety</label>
            <input
              className="input"
              value={variety}
              onChange={(event) => setVariety(event.target.value)}
              placeholder="e.g. JS 335, Phule Vikram"
            />
          </div>
          <div>
            <label className="label">Season</label>
            <select
              className="select"
              value={season}
              onChange={(event) => setSeason(event.target.value as Crop["season"])}
            >
              {SEASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Land parcel / Plot</label>
          <select className="select" value={landId} onChange={(event) => handleLandChange(event.target.value)}>
            <option value="">Whole farm / Unassigned</option>
            {lands.map((land) => (
              <option key={land.id} value={land.id}>
                {land.name} {land.surveyNumber ? `(Gat ${land.surveyNumber})` : ""} · {land.areaAcres} acres
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Crop year</label>
            <input
              className="input"
              value={year}
              onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="2026"
            />
          </div>
          <div>
            <label className="label">Cultivated area (acres)</label>
            <input
              className="input"
              value={areaAcres}
              onChange={(event) => setAreaAcres(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 5.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SimpleDatePicker label="Sowing date" value={sowingDate} onChange={setSowingDate} required />
          <SimpleDatePicker
            label="Expected harvest date"
            value={expectedHarvestDate}
            onChange={setExpectedHarvestDate}
          />
        </div>

        <div>
          <label className="label">Crop status</label>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-canvas p-1">
            {CROP_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`rounded-xl py-2 text-[12px] font-semibold transition ${
                  status === opt.value
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(status === "COMPLETED" || status === "HARVESTING") && (
          <SimpleDatePicker
            label="Actual harvest date"
            value={actualHarvestDate || todayISO()}
            onChange={setActualHarvestDate}
            hint="Used to record when harvesting began or completed."
          />
        )}

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Seed rate, irrigation plan, or soil treatment"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
