"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import AmountInput from "@/components/ui/AmountInput";
import { useApp } from "@/context/AppContext";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_SUBCATEGORIES,
  INVENTORY_UNITS,
} from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import type { InventoryDraft, InventoryItem } from "@/lib/types";

interface InventorySheetProps {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}

export default function InventorySheet({ open, onClose, item }: InventorySheetProps) {
  const { saveInventoryItem, notify } = useApp();
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<string>("Fertilizers");
  const [subcategory, setSubcategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("bag");
  const [quantity, setQuantity] = useState("");
  const [remainingQuantity, setRemainingQuantity] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [unitPricePaise, setUnitPricePaise] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [storageLocation, setStorageLocation] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    if (item) {
      setItemName(item.itemName ?? "");
      setCategory(item.category ?? "Fertilizers");
      setSubcategory(item.subcategory ?? "");
      setCustomSubcategory("");
      setBrand(item.brand ?? "");
      setDescription(item.description ?? "");
      setUnit(item.unit ?? "bag");
      setQuantity(String(item.quantity ?? 0));
      setRemainingQuantity(String(item.remainingQuantity ?? item.quantity ?? 0));
      setMinQuantity(String(item.minQuantity ?? 0));
      setUnitPricePaise(item.unitPricePaise ?? 0);
      setPurchaseDate(item.purchaseDate ?? todayISO());
      setStorageLocation(item.storageLocation ?? "");
      setExpiryDate(item.expiryDate ?? "");
      setHasExpiry(Boolean(item.expiryDate));
      setBatchNumber(item.batchNumber ?? "");
      setSupplierName(item.supplierName ?? "");
      setSupplierContact(item.supplierContact ?? "");
      setNotes(item.notes ?? "");
    } else {
      setItemName("");
      setCategory("Fertilizers");
      setSubcategory("");
      setCustomSubcategory("");
      setBrand("");
      setDescription("");
      setUnit("bag");
      setQuantity("");
      setRemainingQuantity("");
      setMinQuantity("2");
      setUnitPricePaise(0);
      setPurchaseDate(todayISO());
      setStorageLocation("");
      setExpiryDate("");
      setHasExpiry(false);
      setBatchNumber("");
      setSupplierName("");
      setSupplierContact("");
      setNotes("");
    }
  }, [open, item]);

  const subOptions = INVENTORY_SUBCATEGORIES[category] ?? [];

  const save = async () => {
    setError("");
    if (itemName.trim().length < 2) {
      setError("Please enter the product name.");
      return;
    }
    const qty = quantity === "" ? 0 : Number(quantity);
    const remaining = remainingQuantity === "" ? qty : Number(remainingQuantity);
    const minimum = minQuantity === "" ? 0 : Number(minQuantity);

    if (!Number.isFinite(qty) || qty < 0) {
      setError("Please enter a valid stock quantity.");
      return;
    }
    if (!Number.isFinite(remaining) || remaining < 0) {
      setError("Please enter a valid remaining stock quantity.");
      return;
    }
    if (!Number.isFinite(minimum) || minimum < 0) {
      setError("Please enter a valid low-stock alert level.");
      return;
    }

    const effectiveSubcategory =
      subcategory === "__custom__"
        ? customSubcategory.trim()
        : subcategory.trim();

    setBusy(true);
    try {
      const draft: InventoryDraft = {
        itemName: itemName.trim(),
        category,
        subcategory: effectiveSubcategory || undefined,
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        quantity: qty,
        unit: unit.trim(),
        unitPricePaise,
        purchaseDate,
        remainingQuantity: remaining,
        minQuantity: minimum,
        storageLocation: storageLocation.trim() || undefined,
        expiryDate: hasExpiry && expiryDate ? expiryDate : undefined,
        batchNumber: batchNumber.trim() || undefined,
        supplierName: supplierName.trim() || undefined,
        supplierContact: supplierContact.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await saveInventoryItem(draft, item?.id);
      notify(item ? "Product updated." : "Product added to inventory.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? "Edit Product" : "Register New Product"}
      subtitle="Track seeds, fertilizers, pesticides, and agricultural supplies."
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          onClick={save}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : item ? "Save Changes" : "Register Product"}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            Product Name <span className="text-negative">*</span>
          </label>
          <input
            className="input"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Urea 46%, Soybean JS 335, Coragen"
            autoFocus={!item}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select
              className="select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
            >
              {INVENTORY_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Measurement Unit</label>
            <select
              className="select"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {INVENTORY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {subOptions.length > 0 && (
          <div>
            <label className="label">
              Type / Subcategory <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <select
              className="select"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="">Select type…</option>
              {subOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="__custom__">Other custom type…</option>
            </select>
            {subcategory === "__custom__" && (
              <input
                className="input mt-2"
                value={customSubcategory}
                onChange={(e) => setCustomSubcategory(e.target.value)}
                placeholder="Enter custom type"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Brand / Manufacturer <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. IFFCO, Bayer, Mahyco"
            />
          </div>
          <div>
            <label className="label">
              Storage Location <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Main Godown, Shed B"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="label">Total Stock</label>
            <input
              className="input px-3"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Available Now</label>
            <input
              className="input px-3"
              value={remainingQuantity}
              onChange={(e) => setRemainingQuantity(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder={quantity || "0"}
            />
          </div>
          <div>
            <label className="label">Low Alert At</label>
            <input
              className="input px-3"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="2"
            />
          </div>
        </div>

        <AmountInput
          valuePaise={unitPricePaise}
          onChange={setUnitPricePaise}
          label={`Purchase Price per ${unit || "unit"}`}
        />

        <div className="rounded-xl border border-line bg-canvas/40 p-3.5 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasExpiry}
              onChange={(e) => setHasExpiry(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
            />
            <span className="text-[13px] font-medium text-ink">
              This product has an expiry date
            </span>
          </label>

          {hasExpiry && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <SimpleDatePicker
                  label="Expiry Date"
                  value={expiryDate || todayISO()}
                  onChange={setExpiryDate}
                />
              </div>
              <div>
                <label className="label">Batch Number</label>
                <input
                  className="input"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. B-94812"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Primary Supplier <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Shop or dealer name"
            />
          </div>
          <div>
            <label className="label">
              Supplier Phone <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={supplierContact}
              onChange={(e) => setSupplierContact(e.target.value)}
              type="tel"
              placeholder="Phone number"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Notes & Details <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dosage, packaging details, or notes"
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
