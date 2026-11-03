"use client";

import React, { useEffect, useState } from "react";
import { Camera, Check, Loader2, Upload } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import AmountInput from "@/components/ui/AmountInput";
import { useApp } from "@/context/AppContext";
import {
  INTEREST_CALCULATION_METHODS,
  LOAN_BORROWED_CATEGORIES,
  LOAN_LENT_CATEGORIES,
  LOAN_PAYMENT_FREQUENCIES,
} from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { fileToReceiptDataUrl } from "@/lib/image";
import { formatINR } from "@/lib/money";
import type {
  Loan,
  LoanInterestType,
  LoanPaymentFrequency,
  LoanType,
} from "@/lib/types";

interface LoanSheetProps {
  open: boolean;
  onClose: () => void;
  loan?: Loan | null;
  defaultType?: LoanType;
}

export default function LoanSheet({
  open,
  onClose,
  loan,
  defaultType = "BORROWED",
}: LoanSheetProps) {
  const { saveLoan, vehicles, notify } = useApp();

  const [type, setType] = useState<LoanType>(defaultType);
  const [partyName, setPartyName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [category, setCategory] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [principalPaise, setPrincipalPaise] = useState(0);

  // Interest
  const [interestRate, setInterestRate] = useState("");
  const [interestType, setInterestType] = useState<LoanInterestType>("SIMPLE");

  // Dates & Schedule
  const [date, setDate] = useState(todayISO());
  const [repaymentStartDate, setRepaymentStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [emiPaise, setEmiPaise] = useState(0);
  const [paymentFrequency, setPaymentFrequency] =
    useState<LoanPaymentFrequency>("MONTHLY");

  // Vehicle Link
  const [vehicleId, setVehicleId] = useState("");

  // Reminders & Media
  const [createReminder, setCreateReminder] = useState(true);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setType(loan?.type ?? defaultType);
    setPartyName(loan?.partyName ?? "");
    setContactNumber(loan?.contactNumber ?? "");
    setCategory(
      loan?.category ??
        (loan?.type ?? defaultType === "BORROWED"
          ? LOAN_BORROWED_CATEGORIES[0]
          : LOAN_LENT_CATEGORIES[0])
    );
    setPurpose(loan?.purpose ?? "");
    setPrincipalPaise(loan?.principalPaise ?? 0);
    setInterestRate(loan && loan.interestRate ? String(loan.interestRate) : "");
    setInterestType(loan?.interestType ?? (loan?.interestRate ? "SIMPLE" : "NONE"));
    setDate(loan?.date ?? todayISO());
    setRepaymentStartDate(loan?.repaymentStartDate ?? "");
    setDueDate(loan?.dueDate ?? "");
    setDurationMonths(loan?.durationMonths ? String(loan.durationMonths) : "");
    setEmiPaise(loan?.emiPaise ?? 0);
    setPaymentFrequency(loan?.paymentFrequency ?? "MONTHLY");
    setVehicleId(loan?.vehicleId ?? "");
    setCreateReminder(true);
    setReceiptDataUrl(loan?.receiptDataUrl ?? loan?.documentUrl);
    setNotes(loan?.notes ?? "");
  }, [open, loan, defaultType]);

  const handleTypeChange = (newType: LoanType) => {
    setType(newType);
    if (!loan) {
      setCategory(
        newType === "BORROWED"
          ? LOAN_BORROWED_CATEGORIES[0]
          : LOAN_LENT_CATEGORIES[0]
      );
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToReceiptDataUrl(file);
      setReceiptDataUrl(dataUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload document.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    setError("");
    if (partyName.trim().length < 2) {
      setError(
        type === "BORROWED"
          ? "Please enter who you borrowed from (bank or person)."
          : "Please enter who you lent money to."
      );
      return;
    }
    if (!Number.isSafeInteger(principalPaise) || principalPaise <= 0) {
      setError("Please enter a valid loan amount.");
      return;
    }

    const linkedVehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) : null;

    setBusy(true);
    try {
      await saveLoan(
        {
          type,
          partyName: partyName.trim(),
          contactNumber: contactNumber.trim() || undefined,
          category: category.trim() || undefined,
          purpose: purpose.trim() || undefined,
          principalPaise,
          interestRate: Number(interestRate) || 0,
          interestType: Number(interestRate) > 0 ? interestType : "NONE",
          date,
          repaymentStartDate: repaymentStartDate || undefined,
          dueDate: dueDate || undefined,
          durationMonths: durationMonths ? Number(durationMonths) : undefined,
          emiPaise: emiPaise > 0 ? emiPaise : undefined,
          paymentFrequency,
          vehicleId: linkedVehicle ? linkedVehicle.id : undefined,
          vehicleName: linkedVehicle ? linkedVehicle.name : undefined,
          receiptDataUrl,
          notes: notes.trim() || undefined,
          createReminder,
        },
        loan?.id
      );
      notify(
        loan
          ? "Loan record updated."
          : type === "BORROWED"
          ? "Borrowed loan saved."
          : "Lending record saved."
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this loan record.");
    } finally {
      setBusy(false);
    }
  };

  const isVehicleLoan =
    type === "BORROWED" &&
    (category === "Vehicle Loan" || !!vehicleId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        loan
          ? `Edit ${type === "BORROWED" ? "Loan" : "Lending"}`
          : type === "BORROWED"
          ? "Money Borrowed (Loan)"
          : "Money Lent (Given)"
      }
      subtitle={
        type === "BORROWED"
          ? "Track loans from banks, societies or people. Borrowed principal is never counted as income."
          : "Track money lent to friends, relatives or farmers. Lending is an asset, not an expense."
      }
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          onClick={save}
          disabled={busy || photoBusy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : loan ? "Save changes" : "Save loan record"}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Record Type Selector */}
        {!loan && (
          <div>
            <label className="label">Loan Type</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["BORROWED", "LENT"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleTypeChange(option)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    type === option
                      ? "border-brand-600 bg-brand-50"
                      : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <span className="block text-[13px] font-semibold text-ink">
                    {option === "BORROWED" ? "We Borrowed" : "We Lent"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    {option === "BORROWED" ? "Money we owe" : "Money given to others"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount Input */}
        <AmountInput
          valuePaise={principalPaise}
          onChange={setPrincipalPaise}
          label={type === "BORROWED" ? "Principal Loan Amount" : "Amount Lent"}
          autoFocus={!loan}
        />

        {/* Party Name & Contact */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              {type === "BORROWED" ? "Lender / Bank Name" : "Borrower's Name"}{" "}
              <span className="text-negative">*</span>
            </label>
            <input
              className="input"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder={
                type === "BORROWED"
                  ? "e.g. State Bank of India, District Co-op"
                  : "e.g. Ramesh Patil, cousin"
              }
            />
          </div>
          <div>
            <label className="label">
              Contact Phone / Details{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              inputMode="tel"
            />
          </div>
        </div>

        {/* Category & Purpose */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Category</label>
            <select
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {type === "BORROWED"
                ? LOAN_BORROWED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                : LOAN_LENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="label">
              Purpose / Reason{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              className="input"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Tractor downpayment, seeds & fertilizer"
            />
          </div>
        </div>

        {/* Vehicle Link (if Vehicle Loan) */}
        {isVehicleLoan && (
          <div className="rounded-2xl border border-line bg-canvas p-3.5">
            <label className="label">Link to Registered Vehicle</label>
            <select
              className="select bg-white"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">— Select Vehicle (Optional) —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber}) · {v.type}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-ink-muted">
              Links outstanding balance with your vehicle ledger without duplicate entries.
            </p>
          </div>
        )}

        {/* Interest Information */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">
              Interest Rate % per year{" "}
              <span className="font-normal text-ink-muted">(0 for zero interest)</span>
            </label>
            <input
              className="input"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="e.g. 7.5 or 0"
            />
          </div>
          <div>
            <label className="label">Interest Type</label>
            <select
              className="select"
              value={interestType}
              onChange={(e) => setInterestType(e.target.value as LoanInterestType)}
            >
              {INTEREST_CALCULATION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method === "NONE"
                    ? "Zero / No Interest"
                    : method === "SIMPLE"
                    ? "Simple Interest"
                    : method === "COMPOUND"
                    ? "Compound Interest"
                    : "Flat Rate"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleDatePicker
            label={type === "BORROWED" ? "Loan Start Date" : "Date Lent"}
            value={date}
            onChange={setDate}
            required
            quick
          />
          <SimpleDatePicker
            label="Due Date / Maturity Date"
            value={dueDate}
            onChange={setDueDate}
            quick
          />
        </div>

        {/* Repayment Schedule & Terms */}
        <div className="rounded-2xl border border-line bg-white p-3.5 space-y-3">
          <h4 className="text-[12.5px] font-semibold text-ink">Repayment Schedule & EMI</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Frequency</label>
              <select
                className="select"
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value as LoanPaymentFrequency)}
              >
                {LOAN_PAYMENT_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq === "MONTHLY"
                      ? "Monthly"
                      : freq === "QUARTERLY"
                      ? "Quarterly"
                      : freq === "HALF_YEARLY"
                      ? "Half-Yearly"
                      : freq === "YEARLY"
                      ? "Yearly"
                      : freq === "LUMP_SUM"
                      ? "Lump Sum"
                      : "Irregular"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Tenure (Months) <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                className="input"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 36"
              />
            </div>
            <div>
              <AmountInput
                valuePaise={emiPaise}
                onChange={setEmiPaise}
                label="Installment / EMI"
              />
            </div>
          </div>
        </div>

        {/* Reminder Checkbox */}
        {dueDate && (
          <label className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createReminder}
              onChange={(e) => setCreateReminder(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
            />
            <span className="text-[12px] text-ink">
              Create an automatic reminder in Important Dates for this due date
            </span>
          </label>
        )}

        {/* Document / Receipt Photo */}
        <div>
          <label className="label">
            Supporting Document / Agreement Photo{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          {receiptDataUrl ? (
            <div className="relative mt-1 inline-block">
              <img
                src={receiptDataUrl}
                alt="Loan agreement document"
                className="h-28 w-28 rounded-2xl object-cover border border-line"
              />
              <button
                type="button"
                onClick={() => setReceiptDataUrl(undefined)}
                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-negative text-white text-[12px]"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-3 cursor-pointer hover:bg-canvas/80 text-[12px] text-ink-secondary">
              <Camera className="h-4 w-4 text-ink-muted" />
              <span>{photoBusy ? "Processing image…" : "Take photo or upload document"}</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={photoBusy}
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="input min-h-[70px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Account number, branch details, guarantor, or other notes..."
          />
        </div>

        {/* Accounting Rule Clarification */}
        <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
          {type === "BORROWED"
            ? "Borrowed loan principal is a financial liability, never counted as income. Repayments reduce your debt without inflating operational expenses."
            : "Money lent is a receivable asset, never counted as an expense. Collections recover your capital without double-counting earnings."}
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
