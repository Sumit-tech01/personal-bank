"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import Segmented from "@/components/ui/Segmented";
import { useApp } from "@/context/AppContext";
import { PAYMENT_METHODS, SALE_UNITS } from "@/lib/constants";
import { isValidISODate, todayISO } from "@/lib/dates";
import { formatINR, paiseToInput, parseAmountToPaise } from "@/lib/money";
import type { CropSale, PaymentMethod } from "@/lib/types";

interface CropSaleSheetProps {
  open: boolean;
  onClose: () => void;
  sale?: CropSale | null;
  defaultCropId?: string;
}

export default function CropSaleSheet({
  open,
  onClose,
  sale,
  defaultCropId,
}: CropSaleSheetProps) {
  const { crops, lands, saveCropSale, recordCropSalePayment, deleteCropSale, notify } = useApp();

  const [cropId, setCropId] = useState("");
  const [landId, setLandId] = useState("");
  const [harvestedQuantity, setHarvestedQuantity] = useState("");
  const [quantitySold, setQuantitySold] = useState("");
  const [quantityRemaining, setQuantityRemaining] = useState("");
  const [unit, setUnit] = useState("Quintal");
  const [rateText, setRateText] = useState("");
  const [transportText, setTransportText] = useState("");
  const [otherChargesText, setOtherChargesText] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"FULL" | "PARTIAL" | "PENDING">("FULL");
  const [receivedText, setReceivedText] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK");
  const [notes, setNotes] = useState("");

  // Quick Installment Payment Form
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentDate, setInstallmentDate] = useState(todayISO());
  const [installmentMethod, setInstallmentMethod] = useState<PaymentMethod>("BANK");
  const [installmentNotes, setInstallmentNotes] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setShowAddPayment(false);

    if (sale) {
      setCropId(sale.cropId);
      setLandId(sale.landId ?? "");
      setHarvestedQuantity(sale.harvestedQuantity ? String(sale.harvestedQuantity) : "");
      setQuantitySold(String(sale.quantitySold));
      setQuantityRemaining(sale.quantityRemaining !== undefined ? String(sale.quantityRemaining) : "");
      setUnit(sale.unit || "Quintal");
      setRateText(paiseToInput(sale.ratePerUnitPaise));
      setTransportText(sale.transportChargesPaise ? paiseToInput(sale.transportChargesPaise) : "");
      setOtherChargesText(sale.otherChargesPaise ? paiseToInput(sale.otherChargesPaise) : "");
      setReceivedText(sale.receivedPaise ? paiseToInput(sale.receivedPaise) : "");
      if (sale.receivedPaise >= (sale.netAmountPaise ?? sale.totalAmountPaise)) {
        setPaymentStatus("FULL");
      } else if (sale.receivedPaise > 0) {
        setPaymentStatus("PARTIAL");
      } else {
        setPaymentStatus("PENDING");
      }
      setBuyerName(sale.buyerName ?? "");
      setMarketName(sale.marketName ?? "");
      setSaleDate(sale.saleDate);
      setPaymentMethod(sale.paymentMethod || "BANK");
      setNotes(sale.notes ?? "");
    } else {
      const initialCrop = crops.find((c) => c.id === defaultCropId) ?? crops[0];
      setCropId(initialCrop?.id ?? "");
      setLandId(initialCrop?.landId ?? "");
      setHarvestedQuantity("");
      setQuantitySold("");
      setQuantityRemaining("");
      setUnit("Quintal");
      setRateText("");
      setTransportText("");
      setOtherChargesText("");
      setPaymentStatus("FULL");
      setReceivedText("");
      setBuyerName("");
      setMarketName("");
      setSaleDate(todayISO());
      setPaymentMethod("BANK");
      setNotes("");
    }
  }, [open, sale, defaultCropId, crops]);

  // Handle crop change to auto-fill parcel
  const handleCropChange = (id: string) => {
    setCropId(id);
    const selected = crops.find((c) => c.id === id);
    if (selected?.landId && !landId) {
      setLandId(selected.landId);
    }
  };

  // Dynamic calculations
  const qtySoldNum = Number(quantitySold) || 0;
  const ratePaise = parseAmountToPaise(rateText) ?? 0;
  const grossAmountPaise = Math.round(qtySoldNum * ratePaise);
  const transportPaise = parseAmountToPaise(transportText) || 0;
  const otherChargesPaise = parseAmountToPaise(otherChargesText) || 0;
  const netAmountPaise = Math.max(0, grossAmountPaise - transportPaise - otherChargesPaise);
  const totalAmountPaise = netAmountPaise;

  const harvestedNum = Number(harvestedQuantity) || 0;
  const autoRemaining = harvestedNum > 0 ? Math.max(0, harvestedNum - qtySoldNum) : null;

  const enteredReceivedPaise =
    paymentStatus === "FULL"
      ? netAmountPaise
      : paymentStatus === "PENDING"
      ? 0
      : parseAmountToPaise(receivedText) ?? 0;

  const pendingPaise = Math.max(0, netAmountPaise - enteredReceivedPaise);

  const handleRecordInstallment = async () => {
    if (!sale) return;
    const amount = parseAmountToPaise(installmentAmount) || 0;
    if (amount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (amount > sale.pendingPaise) {
      setError(`Amount cannot exceed pending balance of ${formatINR(sale.pendingPaise)}.`);
      return;
    }
    setPaymentBusy(true);
    try {
      await recordCropSalePayment(sale.id, {
        amountPaise: amount,
        date: installmentDate,
        paymentMethod: installmentMethod,
        notes: installmentNotes.trim() || undefined,
      });
      notify(`Payment of ${formatINR(amount)} recorded.`);
      setInstallmentAmount("");
      setInstallmentNotes("");
      setShowAddPayment(false);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record payment.");
    } finally {
      setPaymentBusy(false);
    }
  };

  const save = async () => {
    setError("");
    if (!cropId) {
      setError("Please choose a crop for this sale.");
      return;
    }
    if (qtySoldNum <= 0) {
      setError("Please enter the quantity sold.");
      return;
    }
    if (ratePaise <= 0) {
      setError("Please enter the selling price per unit.");
      return;
    }
    if (!isValidISODate(saleDate)) {
      setError("Please choose a valid sale date.");
      return;
    }
    if (paymentStatus === "PARTIAL" && enteredReceivedPaise <= 0) {
      setError("Please enter the amount received now for partial payment.");
      return;
    }

    const transportPaise = parseAmountToPaise(transportText) || 0;
    const otherChargesPaise = parseAmountToPaise(otherChargesText) || 0;
    const remainingQty = quantityRemaining ? Number(quantityRemaining) : autoRemaining ?? undefined;

    setBusy(true);
    try {
      await saveCropSale(
        {
          cropId,
          landId: landId || undefined,
          harvestedQuantity: harvestedNum > 0 ? harvestedNum : undefined,
          quantitySold: qtySoldNum,
          quantityRemaining: remainingQty,
          unit,
          ratePerUnitPaise: ratePaise,
          grossAmountPaise,
          transportChargesPaise: transportPaise > 0 ? transportPaise : undefined,
          otherChargesPaise: otherChargesPaise > 0 ? otherChargesPaise : undefined,
          netAmountPaise,
          receivedPaise: enteredReceivedPaise,
          pendingPaise,
          buyerName: buyerName.trim() || undefined,
          marketName: marketName.trim() || undefined,
          saleDate,
          paymentMethod,
          notes: notes.trim() || undefined,
        },
        sale?.id
      );

      notify(
        paymentStatus === "FULL"
          ? "Crop sale recorded and money received added to income."
          : paymentStatus === "PARTIAL"
          ? `Crop sale saved. ${formatINR(pendingPaise)} pending from buyer.`
          : "Crop sale recorded as pending receivable."
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save crop sale.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!sale) return;
    setBusy(true);
    try {
      await deleteCropSale(sale.id);
      notify("Crop sale record removed.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete sale.");
    } finally {
      setBusy(false);
    }
  };

  const totalDeductions = transportPaise + otherChargesPaise;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={sale ? "Edit Crop Sale" : "Record Crop Sale"}
      subtitle="Gross Sale = Quantity × Rate · Net Sale = Gross − Deductions"
      footer={
        <div className="flex gap-2.5">
          {sale && (
            <button
              type="button"
              className="btn-danger h-12 px-4"
              onClick={remove}
              disabled={busy}
              aria-label="Delete sale"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {busy ? "Saving…" : sale ? "Save changes" : "Save crop sale"}
          </button>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Dynamic Prominent Total Sale Banner */}
        <div className="rounded-2xl border border-positive/30 bg-positive-light/40 p-4 text-center">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-positive">
            Net Sale Amount
          </span>
          <span className="mt-1 block font-mono text-[34px] font-semibold tracking-tight text-ink">
            {formatINR(netAmountPaise)}
          </span>
          <div className="mt-1 flex items-center justify-center gap-2 text-[11.5px] text-ink-secondary">
            <span>Gross: {formatINR(grossAmountPaise)}</span>
            {totalDeductions > 0 && (
              <span className="text-negative font-medium">
                (Deductions: −{formatINR(totalDeductions)})
              </span>
            )}
          </div>
        </div>

        {/* Existing Multiple Payments History & Additional Installment Action */}
        {sale && (
          <div className="rounded-2xl border border-line bg-canvas p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] font-semibold text-ink">Payments & Installments</span>
                <p className="text-[11px] text-ink-muted">
                  Received: <strong className="text-positive">{formatINR(sale.receivedPaise)}</strong> · Pending: <strong className="text-amber">{formatINR(sale.pendingPaise)}</strong>
                </p>
              </div>
              {sale.pendingPaise > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddPayment((prev) => !prev)}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"
                >
                  {showAddPayment ? "Cancel" : "+ Record Payment"}
                </button>
              )}
            </div>

            {sale.payments && sale.payments.length > 0 && (
              <div className="divide-y divide-line/60 rounded-xl bg-white p-2">
                {sale.payments.map((pmt, idx) => (
                  <div key={pmt.id || idx} className="flex items-center justify-between py-1.5 text-[11.5px]">
                    <div>
                      <span className="font-medium text-ink">{pmt.date}</span>
                      <span className="ml-1.5 text-ink-muted">via {pmt.paymentMethod}</span>
                      {pmt.notes && <p className="text-[10px] text-ink-muted">{pmt.notes}</p>}
                    </div>
                    <span className="font-semibold text-positive">{formatINR(pmt.amountPaise)}</span>
                  </div>
                ))}
              </div>
            )}

            {showAddPayment && sale.pendingPaise > 0 && (
              <div className="mt-2 rounded-xl border border-brand-200 bg-white p-3 space-y-2.5">
                <p className="text-[11.5px] font-semibold text-brand-800">Record buyer installment</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-medium text-ink-secondary">Amount (₹)</label>
                    <input
                      className="input h-9 text-[13px]"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder={paiseToInput(sale.pendingPaise)}
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-medium text-ink-secondary">Payment Method</label>
                    <select
                      className="select h-9 text-[12px]"
                      value={installmentMethod}
                      onChange={(e) => setInstallmentMethod(e.target.value as PaymentMethod)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SimpleDatePicker label="Payment date" value={installmentDate} onChange={setInstallmentDate} required />
                  <div>
                    <label className="text-[10.5px] font-medium text-ink-secondary">Note</label>
                    <input
                      className="input h-9 text-[12px]"
                      value={installmentNotes}
                      onChange={(e) => setInstallmentNotes(e.target.value)}
                      placeholder="e.g. 2nd Installment UPI"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRecordInstallment}
                  disabled={paymentBusy}
                  className="btn-primary h-9 w-full text-[12px]"
                >
                  {paymentBusy ? "Saving payment…" : `Receive Payment (${formatINR(parseAmountToPaise(installmentAmount) || sale.pendingPaise)})`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              Crop <span className="text-negative">*</span>
            </label>
            <select
              className="select"
              value={cropId}
              onChange={(event) => handleCropChange(event.target.value)}
            >
              <option value="">Select crop</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name} · {crop.season} {crop.year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Land parcel <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <select
              className="select"
              value={landId}
              onChange={(event) => setLandId(event.target.value)}
            >
              <option value="">General farm / Whole plot</option>
              {lands.map((land) => (
                <option key={land.id} value={land.id}>
                  {land.name} {land.surveyNumber ? `(Gat ${land.surveyNumber})` : ""} · {land.areaAcres} Ac
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Total harvested qty <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={harvestedQuantity}
              onChange={(event) =>
                setHarvestedQuantity(event.target.value.replace(/[^\d.]/g, ""))
              }
              inputMode="decimal"
              placeholder="e.g. 50"
            />
          </div>
          <div>
            <label className="label">Quantity unit</label>
            <select
              className="select"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            >
              {SALE_UNITS.map((u) => (
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
              Quantity sold <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={quantitySold}
              onChange={(event) =>
                setQuantitySold(event.target.value.replace(/[^\d.]/g, ""))
              }
              inputMode="decimal"
              placeholder="e.g. 40"
              autoFocus={!sale}
            />
          </div>
          <div>
            <label className="label">
              Selling price / {unit} <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={rateText}
              onChange={(event) => setRateText(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="₹ per unit"
            />
          </div>
        </div>

        {/* Deductions: Transport & Other Charges */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Transport charges <span className="font-normal text-ink-muted">(deduction)</span>
            </label>
            <input
              className="input"
              value={transportText}
              onChange={(event) =>
                setTransportText(event.target.value.replace(/[^\d.]/g, ""))
              }
              inputMode="decimal"
              placeholder="₹ Freight"
            />
          </div>
          <div>
            <label className="label">
              Other charges <span className="font-normal text-ink-muted">(mandi cess, loading)</span>
            </label>
            <input
              className="input"
              value={otherChargesText}
              onChange={(event) =>
                setOtherChargesText(event.target.value.replace(/[^\d.]/g, ""))
              }
              inputMode="decimal"
              placeholder="₹ Mandi tax / cess"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label">
              Remaining stock qty <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={
                quantityRemaining || (autoRemaining !== null ? String(autoRemaining) : "")
              }
              onChange={(event) =>
                setQuantityRemaining(event.target.value.replace(/[^\d.]/g, ""))
              }
              inputMode="decimal"
              placeholder={autoRemaining !== null ? String(autoRemaining) : "Remaining in farm"}
            />
          </div>
        </div>

        <div>
          <label className="label">Payment status</label>
          <Segmented
            options={[
              { value: "FULL", label: "Paid in full" },
              { value: "PARTIAL", label: "Partial payment" },
              { value: "PENDING", label: "Pending" },
            ]}
            value={paymentStatus}
            onChange={(value) => setPaymentStatus(value as "FULL" | "PARTIAL" | "PENDING")}
            ariaLabel="Sale payment status"
          />
        </div>

        {paymentStatus === "PARTIAL" && (
          <div className="rounded-2xl border border-amber/30 bg-amber-light/40 p-3.5 space-y-3">
            <div>
              <label className="label text-amber">
                Amount received now <span className="text-negative">*</span>
              </label>
              <input
                className="input"
                value={receivedText}
                onChange={(event) =>
                  setReceivedText(event.target.value.replace(/[^\d.]/g, ""))
                }
                inputMode="decimal"
                placeholder="₹ Received amount"
              />
            </div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-ink-secondary">Pending from buyer:</span>
              <span className="font-semibold text-amber">{formatINR(pendingPaise)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SimpleDatePicker label="Sale date" value={saleDate} onChange={setSaleDate} required />
          {paymentStatus !== "PENDING" && (
            <div>
              <label className="label">Payment method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              Buyer / Trader name <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
              placeholder="e.g. Ramesh Trading Co. / Sunil Patil"
            />
          </div>
          <div>
            <label className="label">
              Market / Mandi name <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={marketName}
              onChange={(event) => setMarketName(event.target.value)}
              placeholder="e.g. APMC Mandi, Local Bazar"
            />
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
            placeholder="Vehicle number, receipt voucher no, quality grade, etc."
          />
        </div>

        <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
          <strong className="text-ink">Financial integrity:</strong> Only cash actually received is
          added to your available balance. Pending sale money is tracked in crop revenue and
          receivables without falsely inflating your cash in hand.
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
