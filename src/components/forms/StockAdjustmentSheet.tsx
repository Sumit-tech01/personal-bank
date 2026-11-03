"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import { useApp } from "@/context/AppContext";
import { STOCK_ADJUSTMENT_TYPES } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { areUnitsCompatible } from "@/lib/finance";
import type { StockAdjustmentDraft, StockAdjustmentType } from "@/lib/types";

interface StockAdjustmentSheetProps {
  open: boolean;
  onClose: () => void;
  defaultItemId?: string;
}

export default function StockAdjustmentSheet({
  open,
  onClose,
  defaultItemId,
}: StockAdjustmentSheetProps) {
  const { inventory, recordStockAdjustment, notify } = useApp();
  const [selectedItemId, setSelectedItemId] = useState(defaultItemId || "");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<StockAdjustmentType>("CORRECTION");
  const [quantityDeltaStr, setQuantityDeltaStr] = useState("");
  const [isReduction, setIsReduction] = useState(false);
  const [unit, setUnit] = useState("bag");
  const [reason, setReason] = useState("");
  const [locationFrom, setLocationFrom] = useState("");
  const [locationTo, setLocationTo] = useState("");
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
    setDate(todayISO());
    setType("CORRECTION");
    setQuantityDeltaStr("");
    setIsReduction(false);

    const item = inventory.find((i) => i.id === initialId);
    if (item) {
      setUnit(item.unit);
      setLocationFrom(item.storageLocation || "");
    } else {
      setUnit("bag");
      setLocationFrom("");
    }

    setLocationTo("");
    setReason("");
    setNotes("");
  }, [open, defaultItemId, inventory]);

  const handleTypeChange = (nextType: StockAdjustmentType) => {
    setType(nextType);
    if (nextType === "DAMAGED" || nextType === "EXPIRED") {
      setIsReduction(true);
    } else if (nextType === "OPENING") {
      setIsReduction(false);
    }
  };

  const deltaNumber = useMemo(() => {
    const raw = Number(quantityDeltaStr);
    if (!Number.isFinite(raw)) return 0;
    return isReduction ? -Math.abs(raw) : Math.abs(raw);
  }, [quantityDeltaStr, isReduction]);

  const projectedStock = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.remainingQuantity + deltaNumber;
  }, [selectedItem, deltaNumber]);

  const save = async () => {
    setError("");
    if (!selectedItemId) {
      setError("Please select a product.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for this adjustment.");
      return;
    }
    if (deltaNumber === 0 && type !== "TRANSFER") {
      setError("Please enter a non-zero quantity change.");
      return;
    }
    if (selectedItem && !areUnitsCompatible(unit, selectedItem.unit)) {
      setError(`Incompatible unit: '${unit}' does not match product unit '${selectedItem.unit}'.`);
      return;
    }
    if (projectedStock < 0) {
      setError(`Adjustment would result in negative stock (${projectedStock} ${unit}).`);
      return;
    }

    setBusy(true);
    try {
      const draft: StockAdjustmentDraft = {
        date,
        type,
        quantityDelta: deltaNumber,
        unit: unit.trim(),
        reason: reason.trim(),
        locationFrom: locationFrom.trim() || undefined,
        locationTo: locationTo.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await recordStockAdjustment(selectedItemId, draft);
      notify("Stock adjustment recorded.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to record adjustment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Stock Adjustment"
      subtitle="Record physical corrections, damaged or expired stock, and transfers."
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          onClick={save}
          disabled={busy || projectedStock < 0}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : "Confirm Stock Adjustment"}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            Product <span className="text-negative">*</span>
          </label>
          <select
            className="select"
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              const it = inventory.find((i) => i.id === e.target.value);
              if (it) {
                setUnit(it.unit);
                setLocationFrom(it.storageLocation || "");
              }
            }}
          >
            <option value="">Select product…</option>
            {inventory
              .filter((i) => !i.isArchived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} ({item.remainingQuantity} {item.unit} currently)
                </option>
              ))}
          </select>
        </div>

        <SimpleDatePicker label="Adjustment Date" value={date} onChange={setDate} />

        <div>
          <label className="label">Adjustment Reason / Type</label>
          <div className="grid grid-cols-2 gap-2">
            {STOCK_ADJUSTMENT_TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-900 shadow-sm"
                      : "border-line bg-white text-ink hover:bg-canvas"
                  }`}
                >
                  <p className="text-[12.5px] font-semibold">{t.label}</p>
                  <p className="text-[10.5px] text-ink-muted">{t.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {type !== "TRANSFER" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Quantity Change</label>
              <div className="flex items-center gap-1.5 text-[12px]">
                <button
                  type="button"
                  onClick={() => setIsReduction(false)}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    !isReduction ? "bg-positive text-white" : "bg-canvas text-ink-secondary"
                  }`}
                >
                  + Increase
                </button>
                <button
                  type="button"
                  onClick={() => setIsReduction(true)}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    isReduction ? "bg-negative text-white" : "bg-canvas text-ink-secondary"
                  }`}
                >
                  - Decrease
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="input"
                value={quantityDeltaStr}
                onChange={(e) => setQuantityDeltaStr(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="Quantity amount"
                autoFocus
              />
              <input className="input bg-canvas text-ink-secondary" value={unit} readOnly />
            </div>

            {selectedItem && (
              <div className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2 text-[12px]">
                <span className="text-ink-secondary">Projected Stock Level:</span>
                <span
                  className={`font-semibold ${
                    projectedStock < 0
                      ? "text-negative"
                      : projectedStock <= selectedItem.minQuantity
                      ? "text-amber"
                      : "text-ink"
                  }`}
                >
                  {selectedItem.remainingQuantity} → {projectedStock} {unit}
                </span>
              </div>
            )}
          </div>
        )}

        {type === "TRANSFER" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From Location</label>
              <input
                className="input"
                value={locationFrom}
                onChange={(e) => setLocationFrom(e.target.value)}
                placeholder="e.g. Main Godown"
              />
            </div>
            <div>
              <label className="label">To Location</label>
              <input
                className="input"
                value={locationTo}
                onChange={(e) => setLocationTo(e.target.value)}
                placeholder="e.g. Field Shed"
              />
            </div>
          </div>
        )}

        <div>
          <label className="label">
            Reason & Explanation <span className="text-negative">*</span>
          </label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Bag torn by rodents, Physical stock verification count"
          />
        </div>

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Authorized by, inspection notes"
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
