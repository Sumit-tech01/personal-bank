"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Tractor } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import Segmented from "@/components/ui/Segmented";
import { useApp } from "@/context/AppContext";
import { PAYMENT_METHODS, TRACTOR_OPERATIONS } from "@/lib/constants";
import { isValidISODate, todayISO } from "@/lib/dates";
import { formatINR, paiseToInput, parseAmountToPaise } from "@/lib/money";
import type { PaymentMethod, Vehicle } from "@/lib/types";

interface TractorWorkLogSheetProps {
  open: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  vehicle?: Vehicle | null;
}

export default function TractorWorkLogSheet({
  open,
  onClose,
  defaultVehicleId,
  vehicle: propVehicle,
}: TractorWorkLogSheetProps) {
  const { vehicles, recordTractorWorkLog, notify } = useApp();

  const tractors = vehicles.filter((v) => v.type === "Tractor");
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [farmType, setFarmType] = useState<"OWN" | "RENTAL">("OWN");
  const [operationType, setOperationType] = useState<string>("Ploughing");
  const [customOperation, setCustomOperation] = useState("");
  const [hours, setHours] = useState("");
  const [dieselLitres, setDieselLitres] = useState("");

  // Rental specific
  const [clientName, setClientName] = useState("");
  const [rateText, setRateText] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"RECEIVED" | "PARTIAL" | "PENDING">("RECEIVED");
  const [receivedText, setReceivedText] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setVehicleId(propVehicle?.id ?? defaultVehicleId ?? tractors[0]?.id ?? "");
    setDate(todayISO());
    setFarmType("OWN");
    setOperationType("Ploughing");
    setCustomOperation("");
    setHours("");
    setDieselLitres("");
    setClientName("");
    setRateText("");
    setPaymentStatus("RECEIVED");
    setReceivedText("");
    setPaymentMethod("CASH");
    setNotes("");
  }, [open, propVehicle, defaultVehicleId, tractors]);

  const numHours = Number(hours) || 0;
  const ratePaise = parseAmountToPaise(rateText) ?? 0;
  const totalAmountPaise = Math.round(numHours * ratePaise);

  const enteredReceivedPaise =
    paymentStatus === "RECEIVED"
      ? totalAmountPaise
      : paymentStatus === "PENDING"
      ? 0
      : parseAmountToPaise(receivedText) ?? 0;

  const pendingPaise = Math.max(0, totalAmountPaise - enteredReceivedPaise);

  const save = async () => {
    setError("");
    if (!vehicleId) {
      setError("Please select a tractor.");
      return;
    }
    if (!isValidISODate(date)) {
      setError("Please choose a valid date.");
      return;
    }
    if (numHours <= 0) {
      setError("Please enter valid working hours.");
      return;
    }

    const finalOperation = operationType === "Other" ? customOperation.trim() : operationType;
    if (!finalOperation) {
      setError("Please specify the farming operation.");
      return;
    }

    if (farmType === "RENTAL") {
      if (!clientName.trim()) {
        setError("Please enter the client / farmer name.");
        return;
      }
      if (ratePaise <= 0) {
        setError("Please enter the rental rate per hour.");
        return;
      }
      if (paymentStatus === "PARTIAL" && enteredReceivedPaise <= 0) {
        setError("Please enter the amount received now for partial payment.");
        return;
      }
    }

    setBusy(true);
    try {
      await recordTractorWorkLog(vehicleId, {
        date,
        hours: numHours,
        operationType: finalOperation,
        farmType,
        clientName: farmType === "RENTAL" ? clientName.trim() : undefined,
        dieselLitres: Number(dieselLitres) || undefined,
        ratePerHourPaise: farmType === "RENTAL" ? ratePaise : undefined,
        incomeAmountPaise: farmType === "RENTAL" ? totalAmountPaise : undefined,
        receivedPaise: farmType === "RENTAL" ? enteredReceivedPaise : undefined,
        paymentStatus: farmType === "RENTAL" ? paymentStatus : undefined,
        paymentMethod: farmType === "RENTAL" ? paymentMethod : undefined,
        notes: notes.trim() || undefined,
      });

      notify(
        farmType === "RENTAL"
          ? `Tractor rental log saved. Rental revenue of ${formatINR(enteredReceivedPaise)} recorded.`
          : `Tractor work log saved (${numHours} hours on own farm).`
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record work log.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log Tractor Work & Operations"
      subtitle="Track hours, diesel usage, own farm operations, and rental jobs."
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : "Save work log"}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Tractor selection */}
        {!propVehicle && (
          <div>
            <label className="label">
              Select Tractor <span className="text-negative">*</span>
            </label>
            <select
              className="select"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {tractors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.registrationNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Farm Type Switcher */}
        <div>
          <label className="label">Farm location / Service</label>
          <Segmented
            options={[
              { value: "OWN", label: "Own Farm" },
              { value: "RENTAL", label: "Rental / Other Farm" },
            ]}
            value={farmType}
            onChange={(val) => setFarmType(val as "OWN" | "RENTAL")}
            ariaLabel="Tractor work type"
          />
        </div>

        {/* Dynamic Rental Revenue Banner */}
        {farmType === "RENTAL" && totalAmountPaise > 0 && (
          <div className="rounded-2xl border border-positive/30 bg-positive-light/40 p-3 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-positive">
              Calculated Rental Revenue
            </span>
            <span className="mt-0.5 block font-mono text-[26px] font-semibold tracking-tight text-ink">
              {formatINR(totalAmountPaise)}
            </span>
            <span className="text-[11.5px] text-ink-secondary">
              {numHours} hrs @ ₹{rateText}/hr
            </span>
          </div>
        )}

        {/* Date & Operation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleDatePicker label="Work date" value={date} onChange={setDate} required />
          <div>
            <label className="label">
              Operation type <span className="text-negative">*</span>
            </label>
            <select
              className="select"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value)}
            >
              {TRACTOR_OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>

        {operationType === "Other" && (
          <input
            className="input"
            value={customOperation}
            onChange={(e) => setCustomOperation(e.target.value)}
            placeholder="Describe operation (e.g. Levelling, Straw Chipping)"
            autoFocus
          />
        )}

        {/* Hours & Diesel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Hours worked <span className="text-negative">*</span>
            </label>
            <input
              className="input font-mono"
              value={hours}
              onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 4.5"
              autoFocus={!propVehicle}
            />
          </div>
          <div>
            <label className="label">
              Diesel consumed (L) <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input font-mono"
              value={dieselLitres}
              onChange={(e) => setDieselLitres(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 15"
            />
          </div>
        </div>

        {/* Rental Specific Fields */}
        {farmType === "RENTAL" && (
          <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-brand-900">
                  Client / Farmer Name <span className="text-negative">*</span>
                </label>
                <input
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Suresh Shinde, Patil Farm"
                />
              </div>
              <div>
                <label className="label text-brand-900">
                  Rate / Hour (₹) <span className="text-negative">*</span>
                </label>
                <input
                  className="input font-mono"
                  value={rateText}
                  onChange={(e) => setRateText(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="e.g. 1200"
                />
              </div>
            </div>

            <div>
              <label className="label">Payment status</label>
              <Segmented
                options={[
                  { value: "RECEIVED", label: "Paid in full" },
                  { value: "PARTIAL", label: "Partial" },
                  { value: "PENDING", label: "Pending" },
                ]}
                value={paymentStatus}
                onChange={(val) => setPaymentStatus(val as "RECEIVED" | "PARTIAL" | "PENDING")}
                ariaLabel="Rental payment status"
              />
            </div>

            {paymentStatus === "PARTIAL" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="label text-amber">
                    Received now (₹) <span className="text-negative">*</span>
                  </label>
                  <input
                    className="input font-mono"
                    value={receivedText}
                    onChange={(e) => setReceivedText(e.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    placeholder="₹ Received"
                  />
                </div>
                <div className="flex flex-col justify-center text-[12px]">
                  <span className="text-ink-secondary">Pending from farmer:</span>
                  <span className="font-semibold text-amber">{formatINR(pendingPaise)}</span>
                </div>
              </div>
            )}

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
        )}

        {/* Notes */}
        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Plot location, soil condition, driver name, etc."
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
