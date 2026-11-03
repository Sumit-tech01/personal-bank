"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import Segmented from "@/components/ui/Segmented";
import { useApp } from "@/context/AppContext";
import { LABOUR_ACTIVITIES, PAYMENT_METHODS } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import {
  formatINR,
  labourAmountPaise,
  paiseToInput,
  parseAmountToPaise,
} from "@/lib/money";
import type { LabourActivity, LabourPayment, PaymentMethod } from "@/lib/types";

interface LabourSheetProps {
  open: boolean;
  onClose: () => void;
  labour?: LabourPayment | null;
  defaultCropId?: string;
}

export default function LabourSheet({
  open,
  onClose,
  labour,
  defaultCropId,
}: LabourSheetProps) {
  const { crops, lands, saveLabourPayment, notify } = useApp();
  const [cropId, setCropId] = useState("");
  const [landId, setLandId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [activity, setActivity] = useState<LabourActivity>("Sowing");
  const [workers, setWorkers] = useState("1");
  const [rateText, setRateText] = useState("");
  const [days, setDays] = useState("1");
  const [status, setStatus] = useState<"PAID" | "PENDING" | "PARTIAL">("PAID");
  const [paidAmountText, setPaidAmountText] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paidDate, setPaidDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    if (labour) {
      setCropId(labour.cropId);
      setLandId(labour.landId ?? "");
      setWorkerName(labour.workerName ?? "");
      setActivity(labour.activity);
      setWorkers(String(labour.workers));
      setRateText(paiseToInput(labour.ratePaise));
      setDays(String(labour.days));
      setStatus(labour.status);
      setPaidAmountText(
        labour.status === "PARTIAL" && labour.paidPaise ? paiseToInput(labour.paidPaise) : ""
      );
      setPaymentDate(labour.paymentDate);
      setPaidDate(labour.paidDate ?? todayISO());
      setPaymentMethod(labour.paymentMethod);
      setDescription(labour.description ?? "");
      setNotes(labour.notes ?? "");
    } else {
      setCropId(defaultCropId ?? crops[0]?.id ?? "");
      setLandId("");
      setWorkerName("");
      setActivity("Sowing");
      setWorkers("1");
      setRateText("");
      setDays("1");
      setStatus("PAID");
      setPaidAmountText("");
      setPaymentDate(todayISO());
      setPaidDate(todayISO());
      setPaymentMethod("CASH");
      setDescription("");
      setNotes("");
    }
  }, [open, labour, defaultCropId, crops]);

  const ratePaise = parseAmountToPaise(rateText) ?? 0;
  const total = labourAmountPaise(Number(workers), ratePaise, Number(days));
  const enteredPaidPaise =
    status === "PAID"
      ? total
      : status === "PARTIAL"
      ? parseAmountToPaise(paidAmountText) ?? 0
      : 0;
  const remainingPaise = Math.max(0, total - enteredPaidPaise);

  const save = async () => {
    setError("");
    if (!cropId) {
      setError("Please choose a crop.");
      return;
    }
    if (!Number.isFinite(Number(workers)) || Number(workers) <= 0) {
      setError("Enter the number of workers.");
      return;
    }
    if (ratePaise <= 0) {
      setError("Enter the rate per worker per day.");
      return;
    }
    if (!Number.isFinite(Number(days)) || Number(days) <= 0) {
      setError("Enter the number of days.");
      return;
    }
    if (status === "PARTIAL" && enteredPaidPaise <= 0) {
      setError("Please enter the amount paid now for this partial payment.");
      return;
    }
    setBusy(true);
    try {
      await saveLabourPayment(
        {
          cropId,
          landId: landId || undefined,
          workerName: workerName.trim() || undefined,
          activity,
          workers: Number(workers),
          ratePaise,
          days: Number(days),
          status,
          paidPaise: enteredPaidPaise,
          paymentDate,
          paidDate: status !== "PENDING" ? paidDate : undefined,
          paymentMethod,
          description: description || undefined,
          notes: notes || undefined,
        },
        labour?.id
      );
      notify(
        status === "PAID"
          ? "Labour saved and paid cash recorded."
          : status === "PARTIAL"
          ? `Labour saved. ₹${Math.round(remainingPaise / 100)} remaining to pay.`
          : "Labour saved as pending. It will count in cash when paid."
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save labour payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={labour ? "Edit Labour Payment" : "Add Labour Payment"}
      subtitle="Total Cost = Workers × Daily Rate × Number of Days"
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : labour ? "Save changes" : "Save Labour Payment"}
        </button>
      }
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            Worker name or crew group <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            className="input"
            value={workerName}
            onChange={(event) => setWorkerName(event.target.value)}
            placeholder="e.g. Ramesh crew / Shinde gang"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Crop <span className="text-negative">*</span>
            </label>
            <select className="select" value={cropId} onChange={(event) => setCropId(event.target.value)}>
              <option value="">Choose a crop</option>
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
            <select className="select" value={landId} onChange={(event) => setLandId(event.target.value)}>
              <option value="">Same as crop plot</option>
              {lands.map((land) => (
                <option key={land.id} value={land.id}>
                  {land.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Work activity</label>
            <select
              className="select"
              value={activity}
              onChange={(event) => setActivity(event.target.value as LabourActivity)}
            >
              {LABOUR_ACTIVITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <SimpleDatePicker label="Work date" value={paymentDate} onChange={setPaymentDate} required />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="label">Workers</label>
            <input
              className="input px-3 text-center"
              value={workers}
              onChange={(event) => setWorkers(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1"
            />
          </div>
          <div>
            <label className="label">Rate / day</label>
            <input
              className="input px-3 text-center"
              value={rateText}
              onChange={(event) => setRateText(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="₹"
            />
          </div>
          <div>
            <label className="label">Days</label>
            <input
              className="input px-3 text-center"
              value={days}
              onChange={(event) => setDays(event.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <Users className="h-3.5 w-3.5" />
              Calculated Total Cost
            </p>
            <p className="text-[10.5px] text-brand-800/70">{workers || 0} workers × ₹{rateText || 0} × {days || 0} days</p>
          </div>
          <p className="text-[20px] font-semibold text-brand-900">{formatINR(total)}</p>
        </div>

        <div>
          <label className="label">Payment status</label>
          <Segmented
            options={[
              { value: "PAID", label: "Paid in Full" },
              { value: "PARTIAL", label: "Partial Paid" },
              { value: "PENDING", label: "Unpaid / Pending" },
            ]}
            value={status}
            onChange={(value) => setStatus(value as "PAID" | "PENDING" | "PARTIAL")}
            ariaLabel="Labour status"
          />
        </div>

        {status === "PARTIAL" && (
          <div className="rounded-2xl border border-amber/30 bg-amber-light/30 p-3 space-y-2">
            <div>
              <label className="label text-amber-900">
                Amount paid now <span className="text-negative">*</span>
              </label>
              <input
                className="input"
                value={paidAmountText}
                onChange={(event) => setPaidAmountText(event.target.value.replace(/[^\d.]/g, ""))}
                placeholder="₹ Amount paid now"
                inputMode="decimal"
              />
            </div>
            <div className="flex justify-between text-[11.5px] font-medium text-amber-900 pt-1">
              <span>Remaining outstanding balance:</span>
              <span className="font-semibold">{formatINR(remainingPaise)}</span>
            </div>
          </div>
        )}

        {status !== "PENDING" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SimpleDatePicker label="Payment date" value={paidDate} onChange={setPaidDate} required />
            <div>
              <label className="label">Payment method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. Sowing in north section with tractor"
          />
        </div>

        <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
          Only the cash actually paid out is deducted from your balance. Total committed wages are tracked in crop cost and outstanding balances.
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
