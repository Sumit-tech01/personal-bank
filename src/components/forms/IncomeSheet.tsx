"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Milk, Sparkles, Tractor, Trash2, Wallet, Wrench } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import Segmented from "@/components/ui/Segmented";
import { useApp } from "@/context/AppContext";
import {
  AGRI_PRODUCT_UNITS,
  FARM_INCOME_CATEGORY_LIST,
  HOUSEHOLD_INCOME_CATEGORY_LIST,
  MILK_UNITS,
  PAYMENT_METHODS,
  RENTAL_UNITS,
} from "@/lib/constants";
import { isValidISODate, todayISO } from "@/lib/dates";
import { formatINR, paiseToInput, parseAmountToPaise } from "@/lib/money";
import type { PaymentMethod, Transaction } from "@/lib/types";

export type IncomeFormType =
  | "MILK"
  | "TRACTOR_RENTAL"
  | "MACHINERY_RENTAL"
  | "AGRI_PRODUCTS"
  | "HOUSEHOLD"
  | "OTHER_FARM";

interface IncomeSheetProps {
  open: boolean;
  onClose: () => void;
  initialType?: IncomeFormType;
  defaultCategory?: string;
  transaction?: Transaction | null;
}

export default function IncomeSheet({
  open,
  onClose,
  initialType = "MILK",
  defaultCategory,
  transaction,
}: IncomeSheetProps) {
  const { vehicles, customCategories, saveTransaction, deleteTransaction, notify } = useApp();

  const [formType, setFormType] = useState<IncomeFormType>(initialType);
  const [category, setCategory] = useState<string>("Milk Sales");
  const [date, setDate] = useState<string>(todayISO());

  // Quantity and Rate fields
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("Litre");
  const [rateText, setRateText] = useState<string>("");
  const [otherChargesText, setOtherChargesText] = useState<string>("");

  // Direct Amount (for household / general income)
  const [amountText, setAmountText] = useState<string>("");

  // Parties & Metadata
  const [buyerName, setBuyerName] = useState<string>("");
  const [productOrService, setProductOrService] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentStatus, setPaymentStatus] = useState<"RECEIVED" | "PARTIAL" | "PENDING">("RECEIVED");
  const [receivedText, setReceivedText] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // Sync state on open
  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);

    if (transaction) {
      setDate(transaction.date);
      setCategory(transaction.category);
      setPaymentMethod(transaction.paymentMethod);
      setBuyerName(transaction.buyerName ?? "");
      setNotes(transaction.notes ?? "");
      setDescription(transaction.description);

      if (transaction.quantity) setQuantity(String(transaction.quantity));
      if (transaction.unit) setUnit(transaction.unit);
      if (transaction.ratePaise) setRateText(paiseToInput(transaction.ratePaise));
      if (transaction.otherChargesPaise) setOtherChargesText(paiseToInput(transaction.otherChargesPaise));
      if (transaction.vehicleId) setVehicleId(transaction.vehicleId);

      // Determine form type from category
      if (transaction.category === "Milk Sales") {
        setFormType("MILK");
      } else if (transaction.category.toLowerCase().includes("tractor")) {
        setFormType("TRACTOR_RENTAL");
      } else if (transaction.category.toLowerCase().includes("machinery")) {
        setFormType("MACHINERY_RENTAL");
      } else if (transaction.category === "Agricultural Products") {
        setFormType("AGRI_PRODUCTS");
      } else if (HOUSEHOLD_INCOME_CATEGORY_LIST.some((c) => c === transaction.category)) {
        setFormType("HOUSEHOLD");
      } else {
        setFormType("OTHER_FARM");
      }

      if (transaction.incomeStatus === "PENDING") {
        setPaymentStatus("PENDING");
        setAmountText(paiseToInput(transaction.amountPaise));
      } else if (transaction.pendingAmountPaise && transaction.pendingAmountPaise > 0) {
        setPaymentStatus("PARTIAL");
        setReceivedText(paiseToInput(transaction.amountPaise));
        setAmountText(paiseToInput(transaction.amountPaise + transaction.pendingAmountPaise));
      } else {
        setPaymentStatus("RECEIVED");
        setAmountText(paiseToInput(transaction.amountPaise));
        setReceivedText(paiseToInput(transaction.amountPaise));
      }
    } else {
      setDate(todayISO());
      setFormType(initialType);
      if (initialType === "MILK") {
        setCategory("Milk Sales");
        setUnit("Litre");
        setProductOrService("Cow / Buffalo Milk");
      } else if (initialType === "TRACTOR_RENTAL") {
        setCategory("Tractor Rental");
        setUnit("Hours");
        setProductOrService("Ploughing / Sowing");
        const defaultTractor = vehicles.find((v) => v.type === "Tractor");
        if (defaultTractor) setVehicleId(defaultTractor.id);
      } else if (initialType === "MACHINERY_RENTAL") {
        setCategory("Machinery Rental");
        setUnit("Hours");
        setProductOrService("Thresher / Sprayer");
      } else if (initialType === "AGRI_PRODUCTS") {
        setCategory("Agricultural Products");
        setUnit("Quintal");
        setProductOrService("Vegetables / Fodder");
      } else if (initialType === "HOUSEHOLD") {
        setCategory(defaultCategory ?? "Salary");
        setUnit("");
        setProductOrService("");
      } else {
        setCategory("Other Farming Income");
        setUnit("");
        setProductOrService("");
      }

      setQuantity("");
      setRateText("");
      setOtherChargesText("");
      setAmountText("");
      setBuyerName("");
      setPaymentMethod("CASH");
      setPaymentStatus("RECEIVED");
      setReceivedText("");
      setDescription("");
      setNotes("");
    }
  }, [open, transaction, initialType, defaultCategory, vehicles]);

  // Handle Form Type Selection
  const selectType = (type: IncomeFormType) => {
    setFormType(type);
    setError("");
    if (type === "MILK") {
      setCategory("Milk Sales");
      setUnit("Litre");
      setProductOrService("Milk");
    } else if (type === "TRACTOR_RENTAL") {
      setCategory("Tractor Rental");
      setUnit("Hours");
      setProductOrService("Ploughing");
      const defaultTractor = vehicles.find((v) => v.type === "Tractor");
      if (defaultTractor) setVehicleId(defaultTractor.id);
    } else if (type === "MACHINERY_RENTAL") {
      setCategory("Machinery Rental");
      setUnit("Hours");
      setProductOrService("Thresher / Sprayer");
    } else if (type === "AGRI_PRODUCTS") {
      setCategory("Agricultural Products");
      setUnit("Quintal");
      setProductOrService("Produce");
    } else if (type === "HOUSEHOLD") {
      setCategory("Salary");
    } else {
      setCategory("Other Farming Income");
    }
  };

  // Calculations
  const isRateBased = formType !== "HOUSEHOLD" && formType !== "OTHER_FARM";
  const numQty = Number(quantity) || 0;
  const ratePaise = parseAmountToPaise(rateText) ?? 0;
  const grossAmountPaise = isRateBased ? Math.round(numQty * ratePaise) : parseAmountToPaise(amountText) ?? 0;
  const otherChargesPaise = parseAmountToPaise(otherChargesText) || 0;
  const netAmountPaise = Math.max(0, grossAmountPaise - otherChargesPaise);

  const enteredReceivedPaise =
    paymentStatus === "RECEIVED"
      ? netAmountPaise
      : paymentStatus === "PENDING"
      ? 0
      : parseAmountToPaise(receivedText) ?? 0;

  const pendingPaise = Math.max(0, netAmountPaise - enteredReceivedPaise);

  const save = async () => {
    setError("");

    if (!isValidISODate(date)) {
      setError("Please choose a valid date.");
      return;
    }

    if (isRateBased) {
      if (numQty <= 0) {
        setError("Please enter a valid quantity.");
        return;
      }
      if (ratePaise <= 0) {
        setError("Please enter a valid rate per unit.");
        return;
      }
    } else {
      if (grossAmountPaise <= 0) {
        setError("Please enter a valid amount.");
        return;
      }
    }

    if (paymentStatus === "PARTIAL" && enteredReceivedPaise <= 0) {
      setError("Please enter the amount received now for partial payment.");
      return;
    }

    const isFarm = formType !== "HOUSEHOLD";
    const group = isFarm ? "FARM" : "HOME";

    // Auto-compose readable description
    let cleanDesc = description.trim();
    if (!cleanDesc) {
      if (formType === "MILK") {
        cleanDesc = `${numQty} L Milk to ${buyerName || "Dairy"}`;
      } else if (formType === "TRACTOR_RENTAL") {
        cleanDesc = `Tractor ${productOrService || "service"} (${numQty} ${unit}) for ${buyerName || "Farmer"}`;
      } else if (formType === "MACHINERY_RENTAL") {
        cleanDesc = `${productOrService || "Machinery"} rental (${numQty} ${unit}) to ${buyerName || "Client"}`;
      } else if (formType === "AGRI_PRODUCTS") {
        cleanDesc = `Sold ${numQty} ${unit} ${productOrService || "Produce"}${buyerName ? ` to ${buyerName}` : ""}`;
      } else {
        cleanDesc = category + (buyerName ? ` from ${buyerName}` : "");
      }
    }

    // For transaction amount:
    // If RECEIVED: amount is receivedPaise
    // If PENDING: amount is netAmountPaise, marked as PENDING (not counted in cash balance)
    // If PARTIAL: amount is receivedPaise, with pendingAmountPaise tracked
    const txAmountPaise = paymentStatus === "PENDING" ? netAmountPaise : enteredReceivedPaise;
    const txIncomeStatus = paymentStatus === "PENDING" ? "PENDING" : "RECEIVED";

    setBusy(true);
    try {
      await saveTransaction(
        {
          kind: "INCOME",
          amountPaise: txAmountPaise,
          date,
          category,
          group,
          paymentMethod,
          incomeStatus: txIncomeStatus,
          description: cleanDesc,
          notes: notes.trim() || undefined,
          quantity: isRateBased ? numQty : undefined,
          unit: isRateBased ? unit : undefined,
          ratePaise: isRateBased ? ratePaise : undefined,
          buyerName: buyerName.trim() || undefined,
          vehicleId: formType === "TRACTOR_RENTAL" && vehicleId ? vehicleId : undefined,
          grossAmountPaise,
          otherChargesPaise: otherChargesPaise > 0 ? otherChargesPaise : undefined,
          netAmountPaise,
          pendingAmountPaise: pendingPaise > 0 ? pendingPaise : undefined,
        },
        transaction?.id
      );

      notify(
        paymentStatus === "RECEIVED"
          ? `${category} recorded and added to cash balance.`
          : paymentStatus === "PARTIAL"
          ? `${category} recorded. ${formatINR(pendingPaise)} pending receivable.`
          : `${category} recorded as pending receivable.`
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save income record.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!transaction) return;
    setBusy(true);
    try {
      await deleteTransaction(transaction.id);
      notify("Income record deleted.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete record.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={transaction ? "Edit Income Record" : "Record Income"}
      subtitle="Only actual cash received enters your available balance."
      footer={
        <div className="flex gap-2.5">
          {transaction && (
            <button
              type="button"
              className="btn-danger h-12 px-4"
              onClick={remove}
              disabled={busy}
              aria-label="Delete income"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {busy ? "Saving…" : transaction ? "Save changes" : "Save income record"}
          </button>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Type Switcher */}
        {!transaction && (
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-canvas p-1 sm:grid-cols-6">
            <button
              type="button"
              onClick={() => selectType("MILK")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                formType === "MILK" ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Milk className="h-4 w-4" />
              <span>Milk</span>
            </button>
            <button
              type="button"
              onClick={() => selectType("TRACTOR_RENTAL")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                formType === "TRACTOR_RENTAL" ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Tractor className="h-4 w-4" />
              <span>Tractor</span>
            </button>
            <button
              type="button"
              onClick={() => selectType("MACHINERY_RENTAL")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                formType === "MACHINERY_RENTAL" ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Wrench className="h-4 w-4" />
              <span>Machinery</span>
            </button>
            <button
              type="button"
              onClick={() => selectType("AGRI_PRODUCTS")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                formType === "AGRI_PRODUCTS" ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Agri Produce</span>
            </button>
            <button
              type="button"
              onClick={() => selectType("HOUSEHOLD")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                formType === "HOUSEHOLD" ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Household</span>
            </button>
            <button
              type="button"
              onClick={() => selectType("OTHER_FARM")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
                formType === "OTHER_FARM" ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Other Farm</span>
            </button>
          </div>
        )}

        {/* Dynamic Amount Banner */}
        <div className="rounded-2xl border border-positive/30 bg-positive-light/40 p-4 text-center">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-positive">
            {isRateBased ? "Calculated Net Income" : "Total Income Amount"}
          </span>
          <span className="mt-1 block font-mono text-[34px] font-semibold tracking-tight text-ink">
            {formatINR(netAmountPaise)}
          </span>
          {isRateBased && (
            <span className="mt-0.5 block text-[11.5px] text-ink-secondary">
              {numQty || 0} {unit} × ₹{rateText || "0"} / {unit}
              {otherChargesPaise > 0 && ` (Deductions: −${formatINR(otherChargesPaise)})`}
            </span>
          )}
        </div>

        {/* Form Fields: Rate-Based vs Fixed Amount */}
        {isRateBased ? (
          <div className="space-y-3">
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
                  placeholder={formType === "MILK" ? "e.g. 25 Litres" : "e.g. 5"}
                  autoFocus={!transaction}
                />
              </div>
              <div>
                <label className="label">Unit</label>
                <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {(formType === "MILK"
                    ? MILK_UNITS
                    : formType === "AGRI_PRODUCTS"
                    ? AGRI_PRODUCT_UNITS
                    : RENTAL_UNITS
                  ).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">
                  Rate / {unit} (₹) <span className="text-negative">*</span>
                </label>
                <input
                  className="input"
                  value={rateText}
                  onChange={(e) => setRateText(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="₹ Rate"
                />
              </div>
              <div>
                <label className="label">
                  Deductions <span className="font-normal text-ink-muted">(transport, cess)</span>
                </label>
                <input
                  className="input"
                  value={otherChargesText}
                  onChange={(e) => setOtherChargesText(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="₹ 0"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="label">
              Amount (₹) <span className="text-negative">*</span>
            </label>
            <input
              className="input font-mono text-[18px]"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="₹ Amount"
              autoFocus={!transaction}
            />
          </div>
        )}

        {/* Contextual Type Specific Fields */}
        {formType === "MILK" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dairy / Collection Centre / Buyer</label>
              <input
                className="input"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Govind Dairy, Local customers"
              />
            </div>
            <div>
              <label className="label">Milk Type / Fat details</label>
              <input
                className="input"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                placeholder="e.g. Buffalo (6.5 Fat) / Cow"
              />
            </div>
          </div>
        )}

        {formType === "TRACTOR_RENTAL" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Select Tractor</label>
                <select className="select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">Farm Tractor (General)</option>
                  {vehicles
                    .filter((v) => v.type === "Tractor")
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Client / Farmer Name</label>
                <input
                  className="input"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g. Suresh Shinde"
                />
              </div>
            </div>
            <div>
              <label className="label">Service / Operation</label>
              <input
                className="input"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                placeholder="e.g. Ploughing, Rotavator, Sowing, Trolley Transport"
              />
            </div>
          </div>
        )}

        {formType === "MACHINERY_RENTAL" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Machinery Name</label>
              <input
                className="input"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                placeholder="e.g. Thresher, Power Sprayer, Pump"
              />
            </div>
            <div>
              <label className="label">Client / Farmer Name</label>
              <input
                className="input"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Ramesh Patil"
              />
            </div>
          </div>
        )}

        {formType === "AGRI_PRODUCTS" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Produce / Item Name</label>
              <input
                className="input"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                placeholder="e.g. Vegetables, Fodder, Straw bales"
              />
            </div>
            <div>
              <label className="label">Buyer / Market</label>
              <input
                className="input"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Local Mandi, Dairy farm"
              />
            </div>
          </div>
        )}

        {formType === "HOUSEHOLD" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Household Category</label>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {HOUSEHOLD_INCOME_CATEGORY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {customCategories
                  .filter((c) => c.group === "HOME")
                  .map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Source / Employer</label>
              <input
                className="input"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. Employer, Shop, Client"
              />
            </div>
          </div>
        )}

        {/* Payment Status Segmented Control */}
        <div>
          <label className="label">Payment Status</label>
          <Segmented
            options={[
              { value: "RECEIVED", label: "Paid in full" },
              { value: "PARTIAL", label: "Partial payment" },
              { value: "PENDING", label: "Pending" },
            ]}
            value={paymentStatus}
            onChange={(val) => setPaymentStatus(val as "RECEIVED" | "PARTIAL" | "PENDING")}
            ariaLabel="Payment status"
          />
        </div>

        {/* Partial payment extra input */}
        {paymentStatus === "PARTIAL" && (
          <div className="rounded-2xl border border-amber/30 bg-amber-light/40 p-3.5 space-y-3">
            <div>
              <label className="label text-amber">
                Amount received now <span className="text-negative">*</span>
              </label>
              <input
                className="input"
                value={receivedText}
                onChange={(e) => setReceivedText(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="₹ Received amount"
              />
            </div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-ink-secondary">Pending receivable:</span>
              <span className="font-semibold text-amber">{formatINR(pendingPaise)}</span>
            </div>
          </div>
        )}

        {/* Date and Payment Method */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SimpleDatePicker label="Date" value={date} onChange={setDate} required />
          {paymentStatus !== "PENDING" && (
            <div>
              <label className="label">Payment method</label>
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
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vehicle number, receipt voucher no, terms, etc."
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
