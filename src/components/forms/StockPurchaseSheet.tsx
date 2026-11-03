"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Camera, Check, Loader2, Trash2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import AmountInput from "@/components/ui/AmountInput";
import { useApp } from "@/context/AppContext";
import { PAYMENT_METHODS } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type {
  InventoryItem,
  PaymentMethod,
  PurchasePaymentStatus,
  StockPurchaseDraft,
} from "@/lib/types";

interface StockPurchaseSheetProps {
  open: boolean;
  onClose: () => void;
  defaultItemId?: string;
}

export default function StockPurchaseSheet({
  open,
  onClose,
  defaultItemId,
}: StockPurchaseSheetProps) {
  const { inventory, recordStockPurchase, notify } = useApp();
  const [selectedItemId, setSelectedItemId] = useState(defaultItemId || "");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("bag");
  const [pricePerUnitPaise, setPricePerUnitPaise] = useState(0);
  const [discountPaise, setDiscountPaise] = useState(0);
  const [transportPaise, setTransportPaise] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>("PAID");
  const [paidPaise, setPaidPaise] = useState(0);
  const [customPaid, setCustomPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDataUrl, setInvoiceDataUrl] = useState<string | undefined>(undefined);
  const [received, setReceived] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

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
    setPurchaseDate(todayISO());

    const item = inventory.find((i) => i.id === initialId);
    if (item) {
      setUnit(item.unit);
      setPricePerUnitPaise(item.unitPricePaise || 0);
      setSupplierName(item.supplierName || "");
      setSupplierContact(item.supplierContact || "");
    } else {
      setUnit("bag");
      setPricePerUnitPaise(0);
      setSupplierName("");
      setSupplierContact("");
    }

    setQuantity("");
    setDiscountPaise(0);
    setTransportPaise(0);
    setPaymentStatus("PAID");
    setPaidPaise(0);
    setCustomPaid(false);
    setPaymentMethod("CASH");
    setInvoiceNumber("");
    setInvoiceDataUrl(undefined);
    setReceived(true);
    setNotes("");
  }, [open, defaultItemId, inventory]);

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const it = inventory.find((i) => i.id === itemId);
    if (it) {
      setUnit(it.unit);
      setPricePerUnitPaise(it.unitPricePaise || 0);
      if (it.supplierName && !supplierName) setSupplierName(it.supplierName);
      if (it.supplierContact && !supplierContact) setSupplierContact(it.supplierContact);
    }
  };

  const lineTotalPaise = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    return Math.round(qty * pricePerUnitPaise);
  }, [quantity, pricePerUnitPaise]);

  const totalCostPaise = useMemo(() => {
    return Math.max(0, lineTotalPaise - discountPaise + transportPaise);
  }, [lineTotalPaise, discountPaise, transportPaise]);

  // Keep paidPaise aligned unless manually customized
  useEffect(() => {
    if (paymentStatus === "PAID") {
      setPaidPaise(totalCostPaise);
    } else if (paymentStatus === "PENDING") {
      setPaidPaise(0);
    } else if (!customPaid) {
      setPaidPaise(Math.round(totalCostPaise / 2));
    }
  }, [paymentStatus, totalCostPaise, customPaid]);

  const pendingPaise = Math.max(0, totalCostPaise - paidPaise);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceDataUrl(reader.result as string);
      setPhotoBusy(false);
    };
    reader.onerror = () => {
      setPhotoBusy(false);
      setError("Failed to read receipt file.");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setError("");
    if (!selectedItemId) {
      setError("Please select a product.");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Please enter a purchase quantity greater than zero.");
      return;
    }
    if (!supplierName.trim()) {
      setError("Please enter a supplier or dealer name.");
      return;
    }

    setBusy(true);
    try {
      const draft: StockPurchaseDraft = {
        purchaseDate,
        supplierName: supplierName.trim(),
        supplierContact: supplierContact.trim() || undefined,
        quantity: qty,
        unit,
        pricePerUnitPaise,
        discountPaise: discountPaise || undefined,
        transportPaise: transportPaise || undefined,
        paymentStatus,
        paidPaise,
        paymentMethod,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDataUrl,
        received,
        notes: notes.trim() || undefined,
      };

      await recordStockPurchase(selectedItemId, draft);
      notify("Stock purchase recorded.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to record purchase.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record Stock Purchase"
      subtitle="Purchase fertilizers, seeds, or supplies from dealers."
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          onClick={save}
          disabled={busy || photoBusy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Recording…" : `Confirm Purchase · ${formatINR(totalCostPaise)}`}
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
            onChange={(e) => handleItemChange(e.target.value)}
          >
            <option value="">Select product…</option>
            {inventory
              .filter((i) => !i.isArchived)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} ({item.category} · {item.remainingQuantity} {item.unit} in stock)
                </option>
              ))}
          </select>
        </div>

        <SimpleDatePicker
          label="Purchase Date"
          value={purchaseDate}
          onChange={setPurchaseDate}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Supplier / Shop <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Kisan Krishi Kendra"
            />
          </div>
          <div>
            <label className="label">
              Phone <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={supplierContact}
              onChange={(e) => setSupplierContact(e.target.value)}
              type="tel"
              placeholder="Supplier phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Quantity <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 10"
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <input
              className="input bg-canvas text-ink-secondary"
              value={unit}
              readOnly
              title="Unit is tied to registered product"
            />
          </div>
        </div>

        <AmountInput
          valuePaise={pricePerUnitPaise}
          onChange={setPricePerUnitPaise}
          label={`Price per ${unit || "unit"}`}
        />

        <div className="grid grid-cols-2 gap-3">
          <AmountInput
            valuePaise={discountPaise}
            onChange={setDiscountPaise}
            label="Discount (if any)"
          />
          <AmountInput
            valuePaise={transportPaise}
            onChange={setTransportPaise}
            label="Transport Charges"
          />
        </div>

        {/* Calculation Summary Card */}
        <div className="rounded-2xl border border-line bg-canvas/60 p-3.5 space-y-1.5">
          <div className="flex justify-between text-[12px] text-ink-secondary">
            <span>
              Base Cost ({quantity || "0"} {unit} × {formatINR(pricePerUnitPaise)})
            </span>
            <span>{formatINR(lineTotalPaise)}</span>
          </div>
          {discountPaise > 0 && (
            <div className="flex justify-between text-[12px] text-positive">
              <span>Discount</span>
              <span>- {formatINR(discountPaise)}</span>
            </div>
          )}
          {transportPaise > 0 && (
            <div className="flex justify-between text-[12px] text-ink-secondary">
              <span>Transport</span>
              <span>+ {formatINR(transportPaise)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line/70 pt-1.5 text-[14px] font-bold text-ink">
            <span>Total Purchase Cost</span>
            <span>{formatINR(totalCostPaise)}</span>
          </div>
        </div>

        {/* Payment Status Segmented Control */}
        <div>
          <label className="label">Payment Status</label>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-canvas p-1">
            {(["PAID", "PARTIAL", "PENDING"] as PurchasePaymentStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setPaymentStatus(status);
                  setCustomPaid(false);
                }}
                className={`rounded-lg py-2 text-[12px] font-medium transition ${
                  paymentStatus === status
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {status === "PAID" ? "Full Paid" : status === "PARTIAL" ? "Partial Paid" : "Unpaid / Udhar"}
              </button>
            ))}
          </div>
        </div>

        {paymentStatus === "PARTIAL" && (
          <div className="space-y-2">
            <AmountInput
              valuePaise={paidPaise}
              onChange={(val) => {
                setCustomPaid(true);
                setPaidPaise(Math.min(totalCostPaise, val));
              }}
              label="Amount Paid Now (Cash Outflow)"
            />
            <div className="flex justify-between text-[12px] font-medium text-amber px-1">
              <span>Remaining Supplier Balance (Payable):</span>
              <span>{formatINR(pendingPaise)}</span>
            </div>
          </div>
        )}

        {paymentStatus !== "PENDING" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Payment Method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Invoice / Bill #</label>
              <input
                className="input"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Bill number"
              />
            </div>
          </div>
        )}

        {/* Stock Received Checkbox */}
        <label className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/30 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={received}
            onChange={(e) => setReceived(e.target.checked)}
            className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
          />
          <div className="text-[12.5px]">
            <span className="font-semibold text-ink">Stock actually received</span>
            <p className="text-[11px] text-ink-muted">
              Stock quantity will increase immediately in godown inventory
            </p>
          </div>
        </label>

        {/* Invoice Photo Attachment */}
        <div>
          <label className="label">
            Invoice / Bill Photo <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          {invoiceDataUrl ? (
            <div className="relative mt-1 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoiceDataUrl}
                alt="Invoice bill"
                className="h-24 w-24 rounded-2xl object-cover border border-line"
              />
              <button
                type="button"
                onClick={() => setInvoiceDataUrl(undefined)}
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-negative text-white shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas hover:bg-canvas/80 text-[12px] font-medium text-ink-secondary">
              <Camera className="h-4 w-4" />
              <span>{photoBusy ? "Uploading…" : "Attach Bill / Receipt Photo"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
                disabled={photoBusy}
              />
            </label>
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
            placeholder="Vehicle number, driver name, batch notes"
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
