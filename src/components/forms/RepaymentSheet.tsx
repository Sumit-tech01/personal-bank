"use client";

import React, { useEffect, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import AmountInput from "@/components/ui/AmountInput";
import { useApp } from "@/context/AppContext";
import { PAYMENT_METHODS } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { fileToReceiptDataUrl } from "@/lib/image";
import { loanOutstanding } from "@/lib/finance";
import { formatINR } from "@/lib/money";
import type { Loan, LoanRepayment, PaymentMethod } from "@/lib/types";

interface RepaymentSheetProps {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
  repayment?: LoanRepayment | null;
}

export default function RepaymentSheet({
  open,
  onClose,
  loan,
  repayment,
}: RepaymentSheetProps) {
  const { addLoanRepayment, updateLoanRepayment, notify } = useApp();

  const [totalAmountPaise, setTotalAmountPaise] = useState(0);
  const [interestPaise, setInterestPaise] = useState(0);
  const [principalPaise, setPrincipalPaise] = useState(0);
  const [customSplit, setCustomSplit] = useState(false);

  const [date, setDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [recordCashTransaction, setRecordCashTransaction] = useState(false);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const outstanding = loan ? loanOutstanding(loan) : 0;
  const isBorrowed = loan?.type === "BORROWED";

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);

    if (repayment) {
      setTotalAmountPaise(repayment.amountPaise);
      const p = repayment.principalPaise ?? Math.max(0, repayment.amountPaise - (repayment.interestPaise ?? 0));
      const i = repayment.interestPaise ?? 0;
      setPrincipalPaise(p);
      setInterestPaise(i);
      setCustomSplit(i > 0);
      setDate(repayment.date);
      setPaymentMethod(repayment.paymentMethod);
      setReference(repayment.reference ?? "");
      setReceiptDataUrl(repayment.receiptDataUrl);
      setNotes(repayment.notes ?? "");
      setRecordCashTransaction(!!repayment.transactionId);
    } else {
      setTotalAmountPaise(0);
      setPrincipalPaise(0);
      setInterestPaise(0);
      setCustomSplit(false);
      setDate(todayISO());
      setPaymentMethod("CASH");
      setReference("");
      setReceiptDataUrl(undefined);
      setNotes("");
      setRecordCashTransaction(false);
    }
  }, [open, repayment]);

  // When total amount changes and not custom splitting, set principal = totalAmount
  const handleTotalAmountChange = (newTotal: number) => {
    setTotalAmountPaise(newTotal);
    if (!customSplit) {
      setPrincipalPaise(newTotal);
      setInterestPaise(0);
    } else {
      setPrincipalPaise(Math.max(0, newTotal - interestPaise));
    }
  };

  const handleInterestChange = (newInterest: number) => {
    setInterestPaise(newInterest);
    setPrincipalPaise(Math.max(0, totalAmountPaise - newInterest));
  };

  const handlePrincipalChange = (newPrincipal: number) => {
    setPrincipalPaise(newPrincipal);
    if (newPrincipal <= totalAmountPaise) {
      setInterestPaise(totalAmountPaise - newPrincipal);
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
      setError(caught instanceof Error ? caught.message : "Could not upload receipt.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    if (!loan) return;
    setError("");

    if (!Number.isSafeInteger(totalAmountPaise) || totalAmountPaise <= 0) {
      setError("Please enter the payment amount.");
      return;
    }

    const maxAllowedPrincipal = repayment
      ? outstanding + (repayment.principalPaise ?? repayment.amountPaise)
      : outstanding;

    if (principalPaise > maxAllowedPrincipal) {
      setError(
        `Principal portion (${formatINR(principalPaise)}) cannot exceed the remaining balance of ${formatINR(
          maxAllowedPrincipal
        )}.`
      );
      return;
    }

    setBusy(true);
    try {
      if (repayment) {
        await updateLoanRepayment(loan.id, repayment.id, {
          amountPaise: totalAmountPaise,
          principalPaise,
          interestPaise: interestPaise > 0 ? interestPaise : undefined,
          date,
          paymentMethod,
          reference: reference.trim() || undefined,
          receiptDataUrl,
          notes: notes.trim() || undefined,
        });
        notify("Repayment updated.");
      } else {
        await addLoanRepayment(loan.id, {
          amountPaise: totalAmountPaise,
          principalPaise,
          interestPaise: interestPaise > 0 ? interestPaise : undefined,
          date,
          paymentMethod,
          reference: reference.trim() || undefined,
          receiptDataUrl,
          notes: notes.trim() || undefined,
          recordCashTransaction,
        });
        notify(
          isBorrowed
            ? "Loan repayment recorded successfully."
            : "Lending collection recorded successfully."
        );
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        repayment
          ? `Edit ${isBorrowed ? "Repayment" : "Collection"}`
          : isBorrowed
          ? "Record Loan Repayment"
          : "Record Lending Collection"
      }
      subtitle={
        loan
          ? `${loan.partyName} · ${isBorrowed ? "You repay lender" : "You receive from borrower"}`
          : ""
      }
      footer={
        <button
          type="button"
          className="btn-primary w-full"
          onClick={save}
          disabled={busy || photoBusy || !loan}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "Saving…" : repayment ? "Save changes" : "Save repayment"}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Outstanding Balance Banner */}
        <div className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5 text-[12px]">
          <span className="text-ink-secondary">Remaining Principal Balance:</span>
          <span className="font-semibold text-ink">{formatINR(outstanding)}</span>
        </div>

        {/* Total Amount Paid */}
        <AmountInput
          valuePaise={totalAmountPaise}
          onChange={handleTotalAmountChange}
          label={isBorrowed ? "Total Amount Paid" : "Total Amount Received"}
          autoFocus={!repayment}
        />

        {/* Principal vs Interest Split Toggle */}
        <div className="rounded-2xl border border-line bg-white p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ink">Separate Principal & Interest</span>
            <button
              type="button"
              onClick={() => {
                const next = !customSplit;
                setCustomSplit(next);
                if (!next) {
                  setPrincipalPaise(totalAmountPaise);
                  setInterestPaise(0);
                }
              }}
              className="text-[11.5px] font-semibold text-brand-700"
            >
              {customSplit ? "Combine as Principal" : "Split into Principal & Interest"}
            </button>
          </div>

          {customSplit && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/60">
              <AmountInput
                valuePaise={principalPaise}
                onChange={handlePrincipalChange}
                label="Principal Portion"
              />
              <AmountInput
                valuePaise={interestPaise}
                onChange={handleInterestChange}
                label="Interest Portion"
              />
            </div>
          )}
          {customSplit && (
            <p className="text-[10.5px] text-ink-muted">
              {isBorrowed
                ? "Principal portion reduces your loan debt; interest portion is accounted as a financing cost."
                : "Principal portion recovers capital; interest portion is accounted as interest income."}
            </p>
          )}
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SimpleDatePicker
            label="Payment Date"
            value={date}
            onChange={setDate}
            required
            quick
          />
          <div>
            <label className="label">Payment Method</label>
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reference / UTR Number */}
        <div>
          <label className="label">
            Reference / Receipt / UTR Number{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            className="input"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Bank Ref #, Cheque #, UPI Ref"
          />
        </div>

        {/* Receipt Document Photo */}
        <div>
          <label className="label">
            Payment Receipt / Voucher Photo{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          {receiptDataUrl ? (
            <div className="relative mt-1 inline-block">
              <img
                src={receiptDataUrl}
                alt="Payment receipt"
                className="h-24 w-24 rounded-2xl object-cover border border-line"
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
              <span>{photoBusy ? "Processing image…" : "Attach receipt photo"}</span>
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
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 5th installment paid via mobile banking"
          />
        </div>

        {/* Cash Transaction Checkbox */}
        {!repayment && (
          <label className="flex items-start gap-2.5 rounded-xl border border-line bg-canvas p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recordCashTransaction}
              onChange={(e) => setRecordCashTransaction(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
            />
            <div className="text-[11.5px] leading-5 text-ink">
              <strong className="font-medium text-ink">Update wallet & bank cashflow</strong>
              <p className="text-ink-muted">
                {isBorrowed
                  ? "Deducts this payment from your cash balance without treating it as an operating expense."
                  : "Adds this recovery to your cash balance without double-counting it as earnings."}
              </p>
            </div>
          </label>
        )}

        {error && (
          <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
