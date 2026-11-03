"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import { useApp } from "@/context/AppContext";
import {
  areUnitsCompatible,
  averagePurchasePricePaise,
  convertUnitQuantity,
} from "@/lib/finance";
import { todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { StockUsageDraft } from "@/lib/types";

interface StockUsageSheetProps {
  open: boolean;
  onClose: () => void;
  defaultItemId?: string;
  defaultCropId?: string;
}

const COMMON_ACTIVITIES = [
  "Basal Dose",
  "Top Dressing",
  "Spraying",
  "Seed Treatment",
  "Sowing",
  "Drip Fertigation",
  "Foliar Spray",
  "Soil Application",
  "Other",
];

export default function StockUsageSheet({
  open,
  onClose,
  defaultItemId,
  defaultCropId,
}: StockUsageSheetProps) {
  const { inventory, crops, lands, recordStockUsage, notify } = useApp();
  const [selectedItemId, setSelectedItemId] = useState(defaultItemId || "");
  const [usageDate, setUsageDate] = useState(todayISO());
  const [quantityUsed, setQuantityUsed] = useState("");
  const [unit, setUnit] = useState("bag");
  const [cropId, setCropId] = useState(defaultCropId || "");
  const [landId, setLandId] = useState("");
  const [activity, setActivity] = useState("Basal Dose");
  const [customActivity, setCustomActivity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedItem = useMemo(
    () => inventory.find((i) => i.id === selectedItemId),
    [inventory, selectedItemId]
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    const initialId = defaultItemId || (inventory[0]?.id ?? "");
    setSelectedItemId(initialId);
    setUsageDate(todayISO());
    setQuantityUsed("");

    const item = inventory.find((i) => i.id === initialId);
    if (item) {
      setUnit(item.unit);
    } else {
      setUnit("bag");
    }

    setCropId(defaultCropId || "");
    const initialCrop = crops.find((c) => c.id === defaultCropId);
    setLandId(initialCrop?.landId || "");
    setActivity("Basal Dose");
    setCustomActivity("");
    setNotes("");
  }, [open, defaultItemId, defaultCropId, inventory, crops]);

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const it = inventory.find((i) => i.id === itemId);
    if (it) {
      setUnit(it.unit);
    }
  };

  const handleCropChange = (selectedCropId: string) => {
    setCropId(selectedCropId);
    if (selectedCropId) {
      const cr = crops.find((c) => c.id === selectedCropId);
      if (cr?.landId) setLandId(cr.landId);
    }
  };

  const unitCompatible = useMemo(() => {
    if (!selectedItem) return true;
    return areUnitsCompatible(unit, selectedItem.unit);
  }, [unit, selectedItem]);

  const convertedQty = useMemo(() => {
    const qty = Number(quantityUsed);
    if (!selectedItem || !Number.isFinite(qty) || qty <= 0 || !unitCompatible) return 0;
    try {
      return convertUnitQuantity(qty, unit, selectedItem.unit);
    } catch {
      return 0;
    }
  }, [quantityUsed, unit, selectedItem, unitCompatible]);

  const avgPricePaise = useMemo(() => {
    if (!selectedItem) return 0;
    return averagePurchasePricePaise(selectedItem);
  }, [selectedItem]);

  const estimatedCostPaise = useMemo(() => {
    return Math.round(convertedQty * avgPricePaise);
  }, [convertedQty, avgPricePaise]);

  const isStockSufficient = selectedItem
    ? convertedQty <= selectedItem.remainingQuantity
    : true;

  const save = async () => {
    setError("");
    if (!selectedItemId) {
      setError("Please select a product.");
      return;
    }
    const qty = Number(quantityUsed);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Please enter a quantity greater than zero.");
      return;
    }
    if (!unitCompatible) {
      setError(
        `Incompatible unit: Cannot consume '${unit}' from product measured in '${selectedItem?.unit}'.`
      );
      return;
    }
    if (!isStockSufficient) {
      setError(
        `Insufficient stock: Only ${selectedItem?.remainingQuantity} ${selectedItem?.unit} available.`
      );
      return;
    }

    const effectiveActivity =
      activity === "Other" ? customActivity.trim() : activity.trim();

    setBusy(true);
    try {
      const draft: StockUsageDraft = {
        usageDate,
        quantityUsed: qty,
        unit: unit.trim(),
        cropId: cropId || undefined,
        landId: landId || undefined,
        activity: effectiveActivity || undefined,
        notes: notes.trim() || undefined,
      };

      await recordStockUsage(selectedItemId, draft);
      notify("Stock usage recorded.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to record stock usage.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record Stock Usage"
      subtitle="Consume seeds, fertilizers or pesticides on your farm crops."
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          onClick={save}
          disabled={busy || !isStockSufficient || !unitCompatible}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Recording…" : `Confirm Usage · ${formatINR(estimatedCostPaise)}`}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            Product to Use <span className="text-negative">*</span>
          </label>
          <select
            className="select"
            value={selectedItemId}
            onChange={(e) => handleItemChange(e.target.value)}
          >
            <option value="">Select product…</option>
            {inventory
              .filter((i) => !i.isArchived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} ({item.remainingQuantity} {item.unit} available)
                </option>
              ))}
          </select>
        </div>

        {selectedItem && (
          <div className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5 text-[12px]">
            <span className="text-ink-secondary">Available Stock:</span>
            <span className="font-semibold text-ink">
              {selectedItem.remainingQuantity} {selectedItem.unit}
              {selectedItem.storageLocation ? ` (at ${selectedItem.storageLocation})` : ""}
            </span>
          </div>
        )}

        <SimpleDatePicker
          label="Usage Date"
          value={usageDate}
          onChange={setUsageDate}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Quantity Used <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 2"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <input
              className="input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. bag, kg, L"
            />
          </div>
        </div>

        {!unitCompatible && (
          <p className="text-[12px] font-medium text-negative">
            Unit &apos;{unit}&apos; is not compatible with product unit &apos;{selectedItem?.unit}&apos;.
          </p>
        )}

        {!isStockSufficient && unitCompatible && (
          <p className="text-[12px] font-medium text-negative">
            Insufficient stock! You are trying to use {convertedQty} {selectedItem?.unit}, but only{" "}
            {selectedItem?.remainingQuantity} {selectedItem?.unit} is available.
          </p>
        )}

        {/* Cost Attribution Preview Card */}
        {estimatedCostPaise > 0 && isStockSufficient && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-800">
              <Sparkles className="h-4 w-4" />
              <span>Crop Material Cost Integration</span>
            </div>
            <p className="text-[12px] text-ink-secondary">
              Valued at {formatINR(estimatedCostPaise)} based on average purchase price of{" "}
              {formatINR(avgPricePaise)} per {selectedItem?.unit}. This will be added to the crop&apos;s
              material cost without duplicating cash expenses.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Target Crop</label>
            <select
              className="select"
              value={cropId}
              onChange={(e) => handleCropChange(e.target.value)}
            >
              <option value="">No crop / General farm</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.season})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Land / Parcel</label>
            <select
              className="select"
              value={landId}
              onChange={(e) => setLandId(e.target.value)}
            >
              <option value="">Select parcel…</option>
              {lands.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Farming Activity</label>
          <select
            className="select"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          >
            {COMMON_ACTIVITIES.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
          {activity === "Other" && (
            <input
              className="input mt-2"
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              placeholder="Describe farming activity"
            />
          )}
        </div>

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Field section, worker instructions, weather conditions"
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
