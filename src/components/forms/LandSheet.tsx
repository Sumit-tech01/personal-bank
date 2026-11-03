"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import { useApp } from "@/context/AppContext";
import { AREA_UNITS, IRRIGATION_TYPES, SOIL_TYPES } from "@/lib/constants";
import type { AreaUnit, Land } from "@/lib/types";

interface LandSheetProps {
  open: boolean;
  onClose: () => void;
  land?: Land | null;
}

export default function LandSheet({ open, onClose, land }: LandSheetProps) {
  const { saveLand, deleteLand, notify } = useApp();
  const [name, setName] = useState("");
  const [surveyNumber, setSurveyNumber] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("Acre");
  const [location, setLocation] = useState("");
  const [soilType, setSoilType] = useState("");
  const [irrigation, setIrrigation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    if (land) {
      setName(land.name);
      setSurveyNumber(land.surveyNumber ?? "");
      setTotalArea(land.totalArea ? String(land.totalArea) : String(land.areaAcres));
      setAreaUnit(land.areaUnit ?? "Acre");
      setLocation(land.location ?? "");
      setSoilType(land.soilType ?? "");
      setIrrigation(land.irrigation ?? "");
      setNotes(land.notes ?? "");
    } else {
      setName("");
      setSurveyNumber("");
      setTotalArea("");
      setAreaUnit("Acre");
      setLocation("");
      setSoilType("Black cotton soil");
      setIrrigation("Drip irrigation");
      setNotes("");
    }
  }, [open, land]);

  const calculateAcres = (val: number, unit: AreaUnit): number => {
    if (unit === "Hectare") return Math.round(val * 2.47105 * 100) / 100;
    if (unit === "Guntha") return Math.round(val * 0.025 * 100) / 100;
    return val;
  };

  const save = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter a plot name.");
      return;
    }
    const rawArea = Number(totalArea);
    if (!Number.isFinite(rawArea) || rawArea <= 0) {
      setError("Please enter a valid plot area greater than zero.");
      return;
    }

    const areaAcres = calculateAcres(rawArea, areaUnit);

    setBusy(true);
    try {
      await saveLand(
        {
          name: name.trim(),
          surveyNumber: surveyNumber.trim() || undefined,
          totalArea: rawArea,
          areaUnit,
          areaAcres,
          location: location.trim() || undefined,
          soilType: soilType.trim() || undefined,
          irrigation: irrigation.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        land?.id
      );
      notify(land ? "Land parcel updated." : "Land parcel added.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save plot.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!land) return;
    setBusy(true);
    try {
      await deleteLand(land.id);
      notify("Plot deleted.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete plot.");
    } finally {
      setBusy(false);
    }
  };

  const rawNum = Number(totalArea);
  const calculatedAcres = Number.isFinite(rawNum) && rawNum > 0 ? calculateAcres(rawNum, areaUnit) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={land ? "Edit Land Parcel" : "Add Land Parcel"}
      subtitle="Register a farm plot to assign crops and track acreage."
      footer={
        <div className="flex gap-2.5">
          {land && (
            <button
              type="button"
              className="btn-danger h-12 px-4"
              onClick={remove}
              disabled={busy}
              aria-label="Delete plot"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {busy ? "Saving…" : land ? "Save changes" : "Save plot"}
          </button>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            Plot / Land name <span className="text-negative">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Canal field, Well plot, Home mala"
            autoFocus={!land}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Gat / Survey number <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={surveyNumber}
              onChange={(event) => setSurveyNumber(event.target.value)}
              placeholder="e.g. 42/1, 108"
            />
          </div>
          <div>
            <label className="label">
              Location / Village <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Pimpalgaon"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Total area <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={totalArea}
              onChange={(event) => setTotalArea(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 5.0"
            />
          </div>
          <div>
            <label className="label">Area unit</label>
            <select
              className="select"
              value={areaUnit}
              onChange={(event) => setAreaUnit(event.target.value as AreaUnit)}
            >
              {AREA_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {areaUnit !== "Acre" && calculatedAcres !== null && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-[11.5px] font-medium text-brand-800">
            Standard equivalent: <strong>{calculatedAcres} acres</strong> (used in uniform crop math).
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Soil type</label>
            <select
              className="select"
              value={soilType}
              onChange={(event) => setSoilType(event.target.value)}
            >
              <option value="">Choose soil type</option>
              {SOIL_TYPES.map((soil) => (
                <option key={soil} value={soil}>
                  {soil}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Irrigation type</label>
            <select
              className="select"
              value={irrigation}
              onChange={(event) => setIrrigation(event.target.value)}
            >
              <option value="">Choose irrigation type</option>
              {IRRIGATION_TYPES.map((irr) => (
                <option key={irr} value={irr}>
                  {irr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Water source, canal rotation schedule, boundaries, etc."
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
