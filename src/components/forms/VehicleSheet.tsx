"use client";

import React, { useEffect, useState } from "react";
import { Camera, Check, Loader2, Trash2, Upload } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import Segmented from "@/components/ui/Segmented";
import AmountInput from "@/components/ui/AmountInput";
import { useApp } from "@/context/AppContext";
import { VEHICLE_FUEL_TYPES, VEHICLE_TYPES } from "@/lib/constants";
import { fileToReceiptDataUrl } from "@/lib/image";
import { paiseToInput, parseAmountToPaise } from "@/lib/money";
import type { Vehicle, VehicleType } from "@/lib/types";

interface VehicleSheetProps {
  open: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
}

export default function VehicleSheet({ open, onClose, vehicle }: VehicleSheetProps) {
  const { saveVehicle, notify, t } = useApp();
  const [name, setName] = useState("");
  const [type, setType] = useState<VehicleType>("Tractor");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePricePaise, setPurchasePricePaise] = useState(0);
  const [status, setStatus] = useState<Vehicle["status"]>("ACTIVE");
  const [fuelType, setFuelType] = useState("Diesel");

  // Paper & maintenance dates
  const [serviceDate, setServiceDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [pucExpiry, setPucExpiry] = useState("");
  const [registrationExpiry, setRegistrationExpiry] = useState("");
  const [tyreReplacementDate, setTyreReplacementDate] = useState("");

  // Loan fields
  const [hasLoan, setHasLoan] = useState(false);
  const [loanAmountPaise, setLoanAmountPaise] = useState(0);
  const [downPaymentPaise, setDownPaymentPaise] = useState(0);
  const [loanEmiPaise, setLoanEmiPaise] = useState(0);
  const [loanPaymentDate, setLoanPaymentDate] = useState("");

  // Tractor specifics
  const [hoursUsed, setHoursUsed] = useState("");
  const [ownFarmHours, setOwnFarmHours] = useState("");
  const [otherFarmHours, setOtherFarmHours] = useState("");
  const [dieselLitres, setDieselLitres] = useState("");
  const [maintenancePaise, setMaintenancePaise] = useState(0);

  // Photo & notes
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setName(vehicle?.name ?? "");
    setType(vehicle?.type ?? "Tractor");
    setRegistrationNumber(vehicle?.registrationNumber ?? "");
    setBrand(vehicle?.brand ?? "");
    setModel(vehicle?.model ?? "");
    setPurchaseDate(vehicle?.purchaseDate ?? "");
    setPurchasePricePaise(vehicle?.purchasePricePaise ?? 0);
    setStatus(vehicle?.status ?? "ACTIVE");
    setFuelType(vehicle?.fuelType ?? (vehicle?.type === "Bike" ? "Petrol" : "Diesel"));
    setServiceDate(vehicle?.serviceDate ?? "");
    setNextServiceDate(vehicle?.nextServiceDate ?? "");
    setInsuranceExpiry(vehicle?.insuranceExpiry ?? "");
    setPucExpiry(vehicle?.pucExpiry ?? "");
    setRegistrationExpiry(vehicle?.registrationExpiry ?? "");
    setTyreReplacementDate(vehicle?.tyreReplacementDate ?? "");

    // Loan details
    const hadLoan = !!(vehicle?.loanEmiPaise || vehicle?.loanAmountPaise);
    setHasLoan(hadLoan);
    setLoanAmountPaise(vehicle?.loanAmountPaise ?? 0);
    setDownPaymentPaise(vehicle?.downPaymentPaise ?? 0);
    setLoanEmiPaise(vehicle?.loanEmiPaise ?? 0);
    setLoanPaymentDate(vehicle?.loanPaymentDate ?? "");

    // Tractor details
    setHoursUsed(vehicle?.tractor?.hoursUsed ? String(vehicle.tractor.hoursUsed) : "");
    setOwnFarmHours(vehicle?.tractor?.ownFarmHours ? String(vehicle.tractor.ownFarmHours) : "");
    setOtherFarmHours(
      vehicle?.tractor?.otherFarmHours ? String(vehicle.tractor.otherFarmHours) : ""
    );
    setDieselLitres(vehicle?.tractor?.dieselLitres ? String(vehicle.tractor.dieselLitres) : "");
    setMaintenancePaise(vehicle?.tractor?.maintenancePaise ?? 0);

    setPhotoDataUrl(vehicle?.photoDataUrl);
    setNotes(vehicle?.notes ?? "");
  }, [open, vehicle]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToReceiptDataUrl(file);
      setPhotoDataUrl(dataUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload image.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleTypeChange = (newType: VehicleType) => {
    setType(newType);
    if (!vehicle) {
      if (newType === "Tractor") setFuelType("Diesel");
      else if (newType === "Bike") setFuelType("Petrol");
      else if (newType === "Car") setFuelType("Diesel");
    }
  };

  const save = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter a name for this vehicle.");
      return;
    }
    if (!registrationNumber.trim()) {
      setError("Please enter the registration number.");
      return;
    }
    setBusy(true);
    try {
      await saveVehicle(
        {
          name: name.trim(),
          type,
          registrationNumber: registrationNumber.trim().toUpperCase(),
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          purchaseDate: purchaseDate || undefined,
          purchasePricePaise: purchasePricePaise || 0,
          status,
          fuelType: fuelType || undefined,
          serviceDate: serviceDate || undefined,
          nextServiceDate: nextServiceDate || undefined,
          insuranceExpiry: insuranceExpiry || undefined,
          pucExpiry: pucExpiry || undefined,
          registrationExpiry: registrationExpiry || undefined,
          tyreReplacementDate: tyreReplacementDate || undefined,
          loanAmountPaise: hasLoan ? loanAmountPaise : undefined,
          downPaymentPaise: hasLoan ? downPaymentPaise : undefined,
          loanEmiPaise: hasLoan ? loanEmiPaise : 0,
          loanPaymentDate: hasLoan ? loanPaymentDate || undefined : undefined,
          photoDataUrl,
          tractor:
            type === "Tractor"
              ? {
                  hoursUsed: Number(hoursUsed) || 0,
                  ownFarmHours: Number(ownFarmHours) || 0,
                  otherFarmHours: Number(otherFarmHours) || 0,
                  dieselLitres: Number(dieselLitres) || 0,
                  maintenancePaise: maintenancePaise || 0,
                  logs: vehicle?.tractor?.logs,
                }
              : undefined,
          notes: notes.trim() || undefined,
        },
        vehicle?.id
      );
      notify(vehicle ? "Vehicle updated." : "Vehicle registered.");
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save vehicle.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={vehicle ? t("vehicles.editVehicle") : t("vehicles.addVehicle")}
      subtitle="Keep fuel, maintenance, loans and paper dates organized in one place."
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy || photoBusy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "…" : vehicle ? t("form.saveChanges") : t("common.save")}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Basic Vehicle Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              Vehicle name <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mahindra 575 DI / Swift Dzire"
              autoFocus={!vehicle}
            />
          </div>
          <div>
            <label className="label">Vehicle type</label>
            <select
              className="select"
              value={type}
              onChange={(event) => handleTypeChange(event.target.value as VehicleType)}
            >
              {VEHICLE_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Brand & Model */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              Brand / Manufacturer <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="e.g. Mahindra, John Deere, Maruti, Honda"
            />
          </div>
          <div>
            <label className="label">
              Model name / Series <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="e.g. 575 DI, 5050 D, VXI, Shine"
            />
          </div>
        </div>

        {/* Registration Number & Fuel Type */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              Registration number <span className="text-negative">*</span>
            </label>
            <input
              className="input uppercase font-mono"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
              placeholder="e.g. MH 12 AB 1234"
              autoCapitalize="characters"
            />
          </div>
          <div>
            <label className="label">Fuel type</label>
            <select
              className="select"
              value={fuelType}
              onChange={(event) => setFuelType(event.target.value)}
            >
              {VEHICLE_FUEL_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {ft}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Purchase Date & Price */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleDatePicker label="Purchase date" value={purchaseDate} onChange={setPurchaseDate} />
          <AmountInput
            valuePaise={purchasePricePaise}
            onChange={setPurchasePricePaise}
            label="Purchase price"
          />
        </div>

        {/* Status */}
        <div>
          <label className="label">Current status</label>
          <Segmented
            options={[
              { value: "ACTIVE", label: "In use" },
              { value: "MAINTENANCE", label: "In service" },
              { value: "SOLD", label: "Sold" },
            ]}
            value={status}
            onChange={(value) => setStatus(value as Vehicle["status"])}
            ariaLabel="Vehicle status"
          />
        </div>

        {/* Vehicle Photo Upload */}
        <div className="rounded-2xl border border-line bg-canvas/60 p-3.5 space-y-2">
          <label className="label">Vehicle photo (optional)</label>
          {photoDataUrl ? (
            <div className="relative inline-block">
              <img
                src={photoDataUrl}
                alt="Vehicle preview"
                className="h-28 w-44 rounded-xl object-cover border border-line shadow-xs"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(undefined)}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-negative text-white shadow-sm"
                title="Remove photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ink-muted/40 bg-white hover:bg-canvas transition">
              <Camera className="h-5 w-5 text-ink-muted" />
              <span className="mt-1 text-[11.5px] font-medium text-ink-secondary">
                {photoBusy ? "Uploading…" : "Add vehicle photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={photoBusy}
              />
            </label>
          )}
        </div>

        {/* Service and Papers Expiries */}
        <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            Important dates & paper renewals
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SimpleDatePicker
              label="Insurance expiry"
              value={insuranceExpiry}
              onChange={setInsuranceExpiry}
            />
            <SimpleDatePicker label="PUC expiry" value={pucExpiry} onChange={setPucExpiry} />
            <SimpleDatePicker
              label="Registration / RC renewal"
              value={registrationExpiry}
              onChange={setRegistrationExpiry}
            />
            <SimpleDatePicker
              label="Next service due"
              value={nextServiceDate}
              onChange={setNextServiceDate}
            />
            <SimpleDatePicker
              label="Tyre replacement due"
              value={tyreReplacementDate}
              onChange={setTyreReplacementDate}
            />
            <SimpleDatePicker
              label="Last service date"
              value={serviceDate}
              onChange={setServiceDate}
            />
          </div>
        </div>

        {/* Loan Section */}
        <div className="rounded-2xl border border-line bg-canvas/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Vehicle loan tracking
              </p>
              <p className="text-[11px] text-ink-muted">Does this vehicle have an active loan/EMI?</p>
            </div>
            <input
              type="checkbox"
              id="hasLoanCheckbox"
              checked={hasLoan}
              onChange={(e) => setHasLoan(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
            />
          </div>

          {hasLoan && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-line/60">
              <AmountInput
                valuePaise={loanAmountPaise}
                onChange={setLoanAmountPaise}
                label="Loan amount"
              />
              <AmountInput
                valuePaise={downPaymentPaise}
                onChange={setDownPaymentPaise}
                label="Down payment"
              />
              <AmountInput
                valuePaise={loanEmiPaise}
                onChange={setLoanEmiPaise}
                label="Monthly EMI"
              />
              <SimpleDatePicker
                label="EMI due date each month"
                value={loanPaymentDate}
                onChange={setLoanPaymentDate}
              />
            </div>
          )}
        </div>

        {/* Tractor Specific Section */}
        {type === "Tractor" && (
          <div className="rounded-2xl border border-line bg-canvas/60 p-3.5">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              Tractor operational stats (hours & diesel)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="label">Total hours</label>
                <input
                  className="input px-3 font-mono"
                  value={hoursUsed}
                  onChange={(event) => setHoursUsed(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Own farm hrs</label>
                <input
                  className="input px-3 font-mono"
                  value={ownFarmHours}
                  onChange={(event) => setOwnFarmHours(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Rented hrs</label>
                <input
                  className="input px-3 font-mono"
                  value={otherFarmHours}
                  onChange={(event) =>
                    setOtherFarmHours(event.target.value.replace(/[^\d.]/g, ""))
                  }
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Diesel (L)</label>
                <input
                  className="input px-3 font-mono"
                  value={dieselLitres}
                  onChange={(event) => setDieselLitres(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Chassis no, engine no, tyre size, battery model, or dealer contact"
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
