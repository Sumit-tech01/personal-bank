"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Wrench } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import AmountInput from "@/components/ui/AmountInput";
import { useApp } from "@/context/AppContext";
import { PAYMENT_METHODS, VEHICLE_SERVICE_TYPES } from "@/lib/constants";
import { isValidISODate, todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { PaymentMethod, Vehicle } from "@/lib/types";

interface VehicleServiceSheetProps {
  open: boolean;
  onClose: () => void;
  defaultVehicleId?: string;
  vehicle?: Vehicle | null;
}

export default function VehicleServiceSheet({
  open,
  onClose,
  defaultVehicleId,
  vehicle: propVehicle,
}: VehicleServiceSheetProps) {
  const { vehicles, saveVehicleServiceRecord, notify } = useApp();

  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [serviceType, setServiceType] = useState<string>("Routine Servicing");
  const [customServiceType, setCustomServiceType] = useState("");
  const [serviceCenter, setServiceCenter] = useState("");
  const [amountPaise, setAmountPaise] = useState(0);
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [reading, setReading] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const activeVehicle = propVehicle ?? vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setVehicleId(propVehicle?.id ?? defaultVehicleId ?? vehicles[0]?.id ?? "");
    setDate(todayISO());
    setServiceType("Routine Servicing");
    setCustomServiceType("");
    setServiceCenter("");
    setAmountPaise(0);
    setNextServiceDate("");
    setReading("");
    setPaymentMethod("CASH");
    setNotes("");
  }, [open, propVehicle, defaultVehicleId, vehicles]);

  const save = async () => {
    setError("");
    if (!vehicleId) {
      setError("Please select a vehicle.");
      return;
    }
    if (!isValidISODate(date)) {
      setError("Please choose a valid service date.");
      return;
    }
    const finalServiceType = serviceType === "Other" ? customServiceType.trim() : serviceType;
    if (!finalServiceType) {
      setError("Please select or enter the service type.");
      return;
    }

    const numReading = reading ? Number(reading) : undefined;
    const isTractor = activeVehicle?.type === "Tractor";

    setBusy(true);
    try {
      await saveVehicleServiceRecord(vehicleId, {
        date,
        serviceType: finalServiceType,
        serviceCenter: serviceCenter.trim() || undefined,
        amountPaise,
        nextServiceDate: nextServiceDate || undefined,
        odometerReading: !isTractor ? numReading : undefined,
        engineHours: isTractor ? numReading : undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
      });

      notify(
        amountPaise > 0
          ? `Service record saved and expense of ${formatINR(amountPaise)} recorded.`
          : "Service record logged."
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save service record.");
    } finally {
      setBusy(false);
    }
  };

  const isTractor = activeVehicle?.type === "Tractor";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record Service / Maintenance"
      subtitle="Track repairs, oil changes, tyres & garage history."
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : "Save service record"}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Vehicle Selection */}
        {!propVehicle && (
          <div>
            <label className="label">
              Vehicle <span className="text-negative">*</span>
            </label>
            <select
              className="select"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber}) · {v.type}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Service Type Selection */}
        <div className="space-y-2">
          <label className="label">
            Service type <span className="text-negative">*</span>
          </label>
          <select
            className="select"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
          >
            {VEHICLE_SERVICE_TYPES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          {serviceType === "Other" && (
            <input
              className="input mt-1.5"
              value={customServiceType}
              onChange={(e) => setCustomServiceType(e.target.value)}
              placeholder="Describe service / repair work"
              autoFocus
            />
          )}
        </div>

        {/* Cost & Payment */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AmountInput
            valuePaise={amountPaise}
            onChange={setAmountPaise}
            label="Service cost / Amount"
            tone="expense"
          />
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
        </div>

        {/* Service Date & Center */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleDatePicker label="Service date" value={date} onChange={setDate} required />
          <div>
            <label className="label">
              Service center / Garage <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={serviceCenter}
              onChange={(e) => setServiceCenter(e.target.value)}
              placeholder="e.g. Authorised Service / Om Motors"
            />
          </div>
        </div>

        {/* Meter reading & Next Service Due */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              {isTractor ? "Engine hours at service" : "Odometer reading (km)"}{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input font-mono"
              value={reading}
              onChange={(e) => setReading(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder={isTractor ? "e.g. 1450 hrs" : "e.g. 35200 km"}
            />
          </div>
          <SimpleDatePicker
            label="Next service due date"
            value={nextServiceDate}
            onChange={setNextServiceDate}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">
            Notes / Parts replaced <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Engine oil brand, filter replacement, brake pads, invoice number, etc."
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
