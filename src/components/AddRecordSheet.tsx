"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  Bell,
  Camera,
  Check,
  HandCoins,
  Home,
  Landmark,
  Loader2,
  Sprout,
  Tractor,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Sheet from "./ui/Sheet";
import AmountInput from "./ui/AmountInput";
import SimpleDatePicker from "./ui/SimpleDatePicker";
import Segmented from "./ui/Segmented";
import StatusPill from "./ui/StatusPill";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "./ui/ConfirmProvider";
import {
  ADD_RECORD_OPTIONS,
  HOME_CATEGORIES,
  INCOME_CATEGORIES,
  LABOUR_ACTIVITIES,
  OTHER_CATEGORIES,
  PAYMENT_METHODS,
  REMINDER_CATEGORIES,
  REPEAT_OPTIONS,
  VEHICLE_CATEGORIES,
  FARM_CATEGORIES,
} from "@/lib/constants";
import { isFarmIncomeCategory } from "@/lib/finance";
import { fileToReceiptDataUrl } from "@/lib/image";
import { formatINR, labourAmountPaise, parseAmountToPaise, paiseToInput } from "@/lib/money";
import { isValidISODate, todayISO } from "@/lib/dates";
import type {
  AddRecordType,
  IncomeStatus,
  LabourActivity,
  PaymentMethod,
  ReminderCategory,
  RepeatOption,
} from "@/lib/types";

const TYPE_TITLES: Record<AddRecordType, string> = {
  INCOME: "Money in",
  HOME_EXPENSE: "Home expense",
  FARM_EXPENSE: "Farm expense",
  LABOUR: "Labour payment",
  VEHICLE_EXPENSE: "Vehicle expense",
  LOAN: "Money borrowed",
  LENDING: "Money lent",
  REMINDER: "Reminder",
  OPENING_BALANCE: "Opening balance",
};

const TYPE_ICONS: Record<AddRecordType, React.ReactNode> = {
  INCOME: <ArrowDownLeft className="h-5 w-5" />,
  HOME_EXPENSE: <Home className="h-5 w-5" />,
  FARM_EXPENSE: <Sprout className="h-5 w-5" />,
  LABOUR: <Users className="h-5 w-5" />,
  VEHICLE_EXPENSE: <Tractor className="h-5 w-5" />,
  LOAN: <Landmark className="h-5 w-5" />,
  LENDING: <HandCoins className="h-5 w-5" />,
  REMINDER: <Bell className="h-5 w-5" />,
  OPENING_BALANCE: <Wallet className="h-5 w-5" />,
};

const TYPE_TONES: Record<AddRecordType, string> = {
  INCOME: "bg-positive-light text-positive",
  HOME_EXPENSE: "bg-negative-light text-negative",
  FARM_EXPENSE: "bg-brand-50 text-brand-700",
  LABOUR: "bg-amber-light text-amber",
  VEHICLE_EXPENSE: "bg-sky-light text-sky",
  LOAN: "bg-sky-light text-sky",
  LENDING: "bg-brand-50 text-brand-700",
  REMINDER: "bg-amber-light text-amber",
  OPENING_BALANCE: "bg-emerald-50 text-emerald-700",
};

const EXPENSE_TYPES: { type: AddRecordType; label: string; icon: React.ReactNode }[] = [
  { type: "HOME_EXPENSE", label: "Home", icon: <Home className="h-3.5 w-3.5" /> },
  { type: "FARM_EXPENSE", label: "Farm", icon: <Sprout className="h-3.5 w-3.5" /> },
  { type: "LABOUR", label: "Labour", icon: <Users className="h-3.5 w-3.5" /> },
  { type: "VEHICLE_EXPENSE", label: "Vehicle", icon: <Tractor className="h-3.5 w-3.5" /> },
];

function isExpenseType(type: AddRecordType | undefined): boolean {
  return (
    type === "HOME_EXPENSE" ||
    type === "FARM_EXPENSE" ||
    type === "LABOUR" ||
    type === "VEHICLE_EXPENSE"
  );
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function editingTypeFor(
  transaction: (AddRecordLike & { isOpeningBalance?: boolean; category?: string }) | undefined
): AddRecordType | undefined {
  if (!transaction) return undefined;
  if (transaction.isOpeningBalance || transaction.category === "Opening Balance") {
    return "OPENING_BALANCE";
  }
  if (transaction.kind === "INCOME") return "INCOME";
  if (transaction.group === "FARM") return "FARM_EXPENSE";
  if (transaction.group === "VEHICLE") return "VEHICLE_EXPENSE";
  return "HOME_EXPENSE";
}

type AddRecordLike = {
  kind: string;
  group: string;
};

export default function AddRecordSheet() {
  const {
    addSheet,
    closeAdd,
    transactions,
    crops,
    lands,
    vehicles,
    labourPayments,
    loans,
    reminders,
    customCategories,
    addCustomCategory,
    preferences,
    saveTransaction,
    saveOpeningBalance,
    saveLabourPayment,
    saveLoan,
    saveReminder,
    notify,
  } = useApp();
  const confirm = useConfirm();

  const [type, setType] = useState<AddRecordType | undefined>(undefined);
  const [otherExpense, setOtherExpense] = useState(false);
  const [amountPaise, setAmountPaise] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cropId, setCropId] = useState("");
  const [landId, setLandId] = useState("");
  const [farmActivity, setFarmActivity] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [incomeStatus, setIncomeStatus] = useState<IncomeStatus>("RECEIVED");
  const [receipt, setReceipt] = useState<string | undefined>(undefined);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Labour specific
  const [workerName, setWorkerName] = useState("");
  const [activity, setActivity] = useState<LabourActivity>("Sowing");
  const [workers, setWorkers] = useState("1");
  const [rateText, setRateText] = useState("");
  const [days, setDays] = useState("1");
  const [labourStatus, setLabourStatus] = useState<"PAID" | "PARTIAL" | "PENDING">("PAID");
  const [paidAmountText, setPaidAmountText] = useState("");
  const [paidDate, setPaidDate] = useState(todayISO());

  // Loans
  const [partyName, setPartyName] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [purpose, setPurpose] = useState("");

  // Reminders
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderCategory, setReminderCategory] = useState<ReminderCategory>("Custom");
  const [repeat, setRepeat] = useState<RepeatOption>("NONE");
  const [notifyOn, setNotifyOn] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const editing = addSheet.editing;
  const isEditing = !!editing;
  const blocked = !!editing?.labourPaymentId;

  const customFor = useCallback(
    (group: "HOME" | "FARM" | "VEHICLE" | "OTHER" | "INCOME") =>
      customCategories.filter((item) => item.group === group).map((item) => item.name),
    [customCategories]
  );

  const incomeCategories = useMemo(
    () => unique([...INCOME_CATEGORIES, ...customFor("INCOME"), category]),
    [customFor, category]
  );
  const homeCategories = useMemo(
    () => unique([...HOME_CATEGORIES, ...customFor("HOME"), category]),
    [customFor, category]
  );
  const farmCategories = useMemo(
    () => unique([...FARM_CATEGORIES, ...customFor("FARM"), category]),
    [customFor, category]
  );
  const vehicleCategories = useMemo(
    () => unique([...VEHICLE_CATEGORIES, ...customFor("VEHICLE"), category]),
    [customFor, category]
  );
  const otherCategories = useMemo(
    () => unique([...OTHER_CATEGORIES, ...customFor("OTHER"), category]),
    [customFor, category]
  );

  const categoryOptions =
    type === "INCOME"
      ? incomeCategories
      : type === "HOME_EXPENSE"
      ? otherExpense
        ? otherCategories
        : homeCategories
      : type === "FARM_EXPENSE"
      ? farmCategories
      : type === "VEHICLE_EXPENSE"
      ? vehicleCategories
      : [];

  const ratePaise = parseAmountToPaise(rateText) ?? 0;
  const labourTotal = labourAmountPaise(Number(workers), ratePaise, Number(days));
  const enteredPaidPaise =
    labourStatus === "PAID"
      ? labourTotal
      : labourStatus === "PARTIAL"
      ? parseAmountToPaise(paidAmountText) ?? 0
      : 0;
  const remainingPaise = Math.max(0, labourTotal - enteredPaidPaise);

  const defaultCategoryFor = (
    next: AddRecordType | undefined,
    isOther = false
  ): string => {
    const remembered = next ? preferences.lastUsedCategory[next] : undefined;
    const list =
      next === "INCOME"
        ? unique([...INCOME_CATEGORIES, ...customFor("INCOME")])
        : next === "HOME_EXPENSE"
        ? isOther
          ? unique([...OTHER_CATEGORIES, ...customFor("OTHER")])
          : unique([...HOME_CATEGORIES, ...customFor("HOME")])
        : next === "FARM_EXPENSE"
        ? unique([...FARM_CATEGORIES, ...customFor("FARM")])
        : next === "VEHICLE_EXPENSE"
        ? unique([...VEHICLE_CATEGORIES, ...customFor("VEHICLE")])
        : [];
    if (remembered && list.includes(remembered)) return remembered;
    if (next === "HOME_EXPENSE" && isOther && list.includes("Other")) return "Other";
    return list[0] ?? "";
  };

  const resetForType = (
    next: AddRecordType | undefined,
    isOther = otherExpense,
    preserveDate = false
  ) => {
    setAmountPaise(0);
    if (!preserveDate) {
      setDate(todayISO());
    }
    setCategory(defaultCategoryFor(next, isOther));
    setDescription("");
    setNotes("");
    setPaymentMethod("CASH");
    setCropId(crops[0]?.id ?? "");
    setLandId("");
    setFarmActivity("");
    setVehicleId(vehicles[0]?.id ?? "");
    setIncomeStatus("RECEIVED");
    setReceipt(undefined);
    setAddingCategory(false);
    setNewCategory("");
    setWorkerName("");
    setActivity("Sowing");
    setWorkers("1");
    setRateText("");
    setDays("1");
    setLabourStatus("PAID");
    setPaidAmountText("");
    setPaidDate(todayISO());
    setPartyName("");
    setInterestRate("");
    setDueDate("");
    setPurpose("");
    setReminderTitle("");
    setReminderTime("");
    setReminderCategory("Custom");
    setRepeat("NONE");
    setNotifyOn(preferences.notificationsEnabled);
  };

  useEffect(() => {
    if (!addSheet.open) return;
    setError("");
    setBusy(false);
    const next = addSheet.type ?? editingTypeFor(editing);
    const nextOtherExpense =
      addSheet.defaults?.expenseGroup === "OTHER" || editing?.group === "OTHER";
    setType(next);
    setOtherExpense(nextOtherExpense);
    resetForType(next, nextOtherExpense, false);

    if (editing) {
      setAmountPaise(editing.amountPaise);
      setDate(editing.date);
      setCategory(editing.category);
      setDescription(editing.description ?? "");
      setNotes(editing.notes ?? "");
      setPaymentMethod(editing.paymentMethod);
      setCropId(editing.cropId ?? "");
      setLandId(editing.landId ?? "");
      setFarmActivity(editing.activity ?? "");
      setVehicleId(editing.vehicleId ?? "");
      setIncomeStatus(editing.incomeStatus ?? "RECEIVED");
      setReceipt(editing.receiptDataUrl);
    } else {
      if (addSheet.defaults?.cropId) setCropId(addSheet.defaults.cropId);
      if (addSheet.defaults?.vehicleId) setVehicleId(addSheet.defaults.vehicleId);
      if (crops.length > 0 && !cropId) setCropId(crops[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSheet]);

  const selectType = (next: AddRecordType) => {
    setType(next);
    setOtherExpense(false);
    setError("");
    resetForType(next, false, false);
  };

  const switchExpenseType = (next: AddRecordType) => {
    if (next === type) return;
    setType(next);
    setOtherExpense(false);
    setError("");
    // Retain previously selected date for rapid multi-entry
    resetForType(next, false, true);
  };

  const chooseCategory = (next: string) => {
    setCategory(next);
  };

  const createCategory = async () => {
    if (!type || !["INCOME", "HOME_EXPENSE", "FARM_EXPENSE", "VEHICLE_EXPENSE"].includes(type)) {
      return;
    }
    const group =
      type === "INCOME"
        ? "INCOME"
        : type === "HOME_EXPENSE"
        ? otherExpense
          ? "OTHER"
          : "HOME"
        : type === "FARM_EXPENSE"
        ? "FARM"
        : "VEHICLE";
    const clean = newCategory.trim();
    if (!clean) return;
    try {
      await addCustomCategory(group, clean);
      setCategory(clean);
      setNewCategory("");
      setAddingCategory(false);
      notify(`“${clean}” added to your categories.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that category.");
    }
  };

  const handleReceipt = async (file: File | undefined) => {
    if (!file) return;
    setReceiptBusy(true);
    setError("");
    try {
      setReceipt(await fileToReceiptDataUrl(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that photo.");
    } finally {
      setReceiptBusy(false);
    }
  };

  const findDuplicate = (): boolean => {
    if (!type) return false;
    if (["INCOME", "HOME_EXPENSE", "FARM_EXPENSE", "VEHICLE_EXPENSE"].includes(type)) {
      const kind = type === "INCOME" ? "INCOME" : "EXPENSE";
      const cleanDescription = (description.trim() || category.trim()).toLowerCase();
      return transactions.some(
        (transaction) =>
          transaction.id !== editing?.id &&
          transaction.kind === kind &&
          transaction.amountPaise === amountPaise &&
          transaction.date === date &&
          transaction.category.toLowerCase() === category.trim().toLowerCase() &&
          (transaction.cropId ?? "") === cropId &&
          (transaction.vehicleId ?? "") === vehicleId &&
          transaction.description.trim().toLowerCase() === cleanDescription
      );
    }
    if (type === "LABOUR") {
      return labourPayments.some(
        (payment) =>
          payment.cropId === cropId &&
          payment.activity === activity &&
          payment.workers === Number(workers) &&
          payment.ratePaise === ratePaise &&
          payment.days === Number(days) &&
          payment.paymentDate === date
      );
    }
    if (type === "LOAN" || type === "LENDING") {
      const loanType = type === "LOAN" ? "BORROWED" : "LENT";
      return loans.some(
        (loan) =>
          loan.type === loanType &&
          loan.partyName.trim().toLowerCase() === partyName.trim().toLowerCase() &&
          loan.principalPaise === amountPaise &&
          loan.date === date
      );
    }
    if (type === "REMINDER") {
      return reminders.some(
        (reminder) =>
          !reminder.completed &&
          reminder.title.trim().toLowerCase() === reminderTitle.trim().toLowerCase() &&
          reminder.date === date
      );
    }
    return false;
  };

  const handleSave = async () => {
    if (!type || busy) return;
    setError("");

    if (blocked) {
      setError("This expense belongs to a labour payment. Please edit it from Labour.");
      return;
    }

    if (["INCOME", "HOME_EXPENSE", "FARM_EXPENSE", "VEHICLE_EXPENSE"].includes(type)) {
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        setError("Please enter an amount greater than zero.");
        return;
      }
      if (!isValidISODate(date)) {
        setError("Please choose a valid date.");
        return;
      }
      if (!category.trim()) {
        setError("Please choose a category.");
        return;
      }
    }

    if (type === "LABOUR") {
      if (!cropId) {
        setError("Please choose a crop for this labour payment.");
        return;
      }
      if (!workers || Number(workers) <= 0) {
        setError("Enter how many workers worked.");
        return;
      }
      if (ratePaise <= 0) {
        setError("Enter the rate per worker per day.");
        return;
      }
      if (!days || Number(days) <= 0) {
        setError("Enter the number of days worked.");
        return;
      }
      if (labourStatus === "PARTIAL" && enteredPaidPaise <= 0) {
        setError("Please enter the amount paid now for this partial payment.");
        return;
      }
    }

    if (type === "LOAN" || type === "LENDING") {
      if (partyName.trim().length < 2) {
        setError("Please enter the person or bank name.");
        return;
      }
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        setError("Please enter the amount.");
        return;
      }
      if (!isValidISODate(date)) {
        setError("Please choose a valid date.");
        return;
      }
    }

    if (type === "REMINDER") {
      if (reminderTitle.trim().length < 2) {
        setError("Please enter a reminder title.");
        return;
      }
      if (!isValidISODate(date)) {
        setError("Please choose a valid date.");
        return;
      }
    }

    if (type === "OPENING_BALANCE") {
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        setError("Please enter a starting balance greater than zero.");
        return;
      }
      if (!isValidISODate(date)) {
        setError("Please choose a valid date.");
        return;
      }
    }

    if (findDuplicate()) {
      const okay = await confirm({
        title: "This looks like a duplicate",
        message:
          "A very similar record already exists for the same date and amount. Do you want to save this one anyway?",
        confirmLabel: "Save anyway",
      });
      if (!okay) return;
    }

    setBusy(true);
    try {
      if (type === "INCOME") {
        const group = isFarmIncomeCategory(category) || cropId ? "FARM" : "HOME";
        await saveTransaction(
          {
            kind: "INCOME",
            amountPaise,
            date,
            category,
            group,
            cropId: cropId || undefined,
            vehicleId: vehicleId || undefined,
            paymentMethod,
            description,
            notes: notes || undefined,
            incomeStatus,
          },
          editing?.id
        );
        notify(isEditing ? "Income updated." : "Income added.");
      } else if (type === "HOME_EXPENSE") {
        await saveTransaction(
          {
            kind: "EXPENSE",
            amountPaise,
            date,
            category,
            group: otherExpense ? "OTHER" : "HOME",
            paymentMethod,
            description,
            notes: notes || undefined,
            receiptDataUrl: receipt,
          },
          editing?.id
        );
        notify(isEditing ? "Home expense updated." : "Home expense added.");
      } else if (type === "FARM_EXPENSE") {
        await saveTransaction(
          {
            kind: "EXPENSE",
            amountPaise,
            date,
            category,
            group: "FARM",
            cropId: cropId || undefined,
            landId: landId || undefined,
            activity: farmActivity || undefined,
            paymentMethod,
            description,
            notes: notes || undefined,
            receiptDataUrl: receipt,
          },
          editing?.id
        );
        notify(isEditing ? "Farm expense updated." : "Farm expense added.");
      } else if (type === "VEHICLE_EXPENSE") {
        await saveTransaction(
          {
            kind: "EXPENSE",
            amountPaise,
            date,
            category,
            group: "VEHICLE",
            vehicleId: vehicleId || undefined,
            paymentMethod,
            description,
            notes: notes || undefined,
            receiptDataUrl: receipt,
          },
          editing?.id
        );
        notify(isEditing ? "Vehicle expense updated." : "Vehicle expense added.");
      } else if (type === "LABOUR") {
        await saveLabourPayment({
          cropId,
          landId: landId || undefined,
          workerName: workerName.trim() || undefined,
          activity,
          workers: Number(workers),
          ratePaise,
          days: Number(days),
          status: labourStatus,
          paidPaise: enteredPaidPaise,
          paymentDate: date,
          paidDate: labourStatus !== "PENDING" ? paidDate : undefined,
          paymentMethod,
          description: description || undefined,
          notes: notes || undefined,
        });
        notify(
          labourStatus === "PAID"
            ? "Labour saved and full payment recorded."
            : labourStatus === "PARTIAL"
            ? `Labour saved. ₹${Math.round(remainingPaise / 100)} remaining to pay.`
            : "Labour saved as pending. It will count in cash when paid."
        );
      } else if (type === "LOAN" || type === "LENDING") {
        await saveLoan({
          type: type === "LOAN" ? "BORROWED" : "LENT",
          partyName,
          principalPaise: amountPaise,
          interestRate: Number(interestRate) || 0,
          date,
          dueDate: dueDate || undefined,
          purpose: purpose || undefined,
        });
        notify(type === "LOAN" ? "Loan saved separately from income." : "Lending saved.");
      } else if (type === "REMINDER") {
        if (
          notifyOn &&
          typeof Notification !== "undefined" &&
          Notification.permission === "default"
        ) {
          try {
            await Notification.requestPermission();
          } catch {
            // Notifications are optional.
          }
        }
        await saveReminder({
          title: reminderTitle,
          date,
          time: reminderTime || undefined,
          category: reminderCategory,
          notes: notes || undefined,
          repeat,
          notify: notifyOn,
        });
        notify("Reminder saved.");
      } else if (type === "OPENING_BALANCE") {
        await saveOpeningBalance(
          {
            amountPaise,
            date,
            paymentMethod,
            notes: notes || undefined,
          },
          editing?.id
        );
        notify(isEditing ? "Opening balance updated." : "Opening balance saved.");
      }
      closeAdd();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this record.");
    } finally {
      setBusy(false);
    }
  };

  const expenseMode = isExpenseType(type);

  const typeTitle = expenseMode
    ? isEditing
      ? "Edit expense"
      : "Add expense"
    : type
    ? TYPE_TITLES[type]
    : "Add a record";

  const footer = type ? (
    <button
      type="button"
      className="btn-primary w-full"
      onClick={handleSave}
      disabled={busy || receiptBusy}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {busy ? "Saving…" : isEditing ? "Save changes" : `Save ${typeTitle.toLowerCase()}`}
    </button>
  ) : undefined;

  return (
    <Sheet
      open={addSheet.open}
      onClose={closeAdd}
      title={typeTitle}
      subtitle={
        expenseMode
          ? "Choose expense category, enter details and tap Save."
          : type
          ? isEditing
            ? "Changes are saved on this device immediately."
            : "Only the fields you need. You can change this later."
          : "What would you like to add today?"
      }
      footer={footer}
      size="lg"
    >
      {!type && (
        <div className="grid grid-cols-2 gap-2.5">
          {ADD_RECORD_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => selectType(option.type)}
              className="flex min-h-[96px] flex-col items-start rounded-2xl border border-line bg-white p-3.5 text-left transition active:scale-[0.98]"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${TYPE_TONES[option.type]}`}
              >
                {TYPE_ICONS[option.type]}
              </span>
              <span className="mt-2 text-[13px] font-semibold text-ink">{option.label}</span>
              <span className="mt-0.5 text-[10.5px] leading-4 text-ink-muted">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {type && (
        <div className="space-y-4">
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setType(undefined);
                setError("");
              }}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Choose a different type
            </button>
          )}

          {/* Universal 4-Category Switcher for All Expenses */}
          {expenseMode && !isEditing && (
            <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-canvas p-1">
              {EXPENSE_TYPES.map((item) => {
                const active = type === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => switchExpenseType(item.type)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold transition ${
                      active
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {blocked && (
            <div className="rounded-2xl bg-amber-light px-4 py-3 text-[12.5px] leading-5 text-amber">
              This expense was created from a labour payment. Please edit it from the Labour
              screen so the labour record stays in sync.
            </div>
          )}

          {/* Standard Amount Input for Home, Farm, Vehicle, Income & Opening Balance */}
          {["INCOME", "HOME_EXPENSE", "FARM_EXPENSE", "VEHICLE_EXPENSE", "OPENING_BALANCE"].includes(type) && (
            <>
              <AmountInput
                valuePaise={amountPaise}
                onChange={setAmountPaise}
                label={
                  type === "OPENING_BALANCE"
                    ? "What is your starting balance?"
                    : type === "INCOME"
                    ? "How much did you receive?"
                    : "How much did you spend?"
                }
                tone={type === "OPENING_BALANCE" || type === "INCOME" ? "income" : "expense"}
                autoFocus={!isEditing}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SimpleDatePicker
                  label={type === "OPENING_BALANCE" ? "Starting date" : "Date"}
                  value={date}
                  onChange={setDate}
                  quick
                  required
                />
                <div>
                  <label className="label">
                    {type === "OPENING_BALANCE" ? "Account / Payment method" : "Payment method"}
                  </label>
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

              {type === "OPENING_BALANCE" && (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-3.5 text-[12px] leading-5 text-brand-900">
                  <p className="font-semibold text-brand-800">Starting Cash & Bank Baseline</p>
                  <p className="mt-0.5 text-brand-700">
                    Opening balance sets your baseline starting funds (e.g. cash in hand or bank balance) so your Available Balance reflects reality. It will not be counted as earned income for the period.
                  </p>
                </div>
              )}

              {type !== "OPENING_BALANCE" && (
                <div>
                  <label className="label">
                    Category <span className="text-negative">*</span>
                  </label>
                  <select
                    className="select"
                    value={category}
                    onChange={(event) => chooseCategory(event.target.value)}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {!addingCategory ? (
                    <button
                      type="button"
                      onClick={() => setAddingCategory(true)}
                      className="mt-1.5 text-[12px] font-semibold text-brand-700"
                    >
                      + Add a custom category
                    </button>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="input h-10 flex-1 text-[14px]"
                        value={newCategory}
                        onChange={(event) => setNewCategory(event.target.value)}
                        placeholder="Category name"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn-primary h-10 px-3.5 text-[12px]"
                        onClick={createCategory}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="btn-secondary h-10 px-3 text-[12px]"
                        onClick={() => {
                          setAddingCategory(false);
                          setNewCategory("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {type === "INCOME" && (
                <div>
                  <label className="label">Money status</label>
                  <Segmented
                    options={[
                      { value: "RECEIVED", label: "Received" },
                      { value: "PENDING", label: "Not received yet" },
                    ]}
                    value={incomeStatus}
                    onChange={(value) => setIncomeStatus(value as IncomeStatus)}
                    ariaLabel="Income status"
                  />
                  <p className="mt-1.5 text-[11.5px] text-ink-muted">
                    Pending income is shown separately and is not added to your available
                    balance until you mark it received.
                  </p>
                </div>
              )}

              {/* Farm Specific Contextual Fields */}
              {type === "FARM_EXPENSE" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">
                      Land parcel <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <select
                      className="select"
                      value={landId}
                      onChange={(event) => setLandId(event.target.value)}
                    >
                      <option value="">Whole farm / No parcel</option>
                      {lands.map((land) => (
                        <option key={land.id} value={land.id}>
                          {land.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      Link to crop <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <select
                      className="select"
                      value={cropId}
                      onChange={(event) => setCropId(event.target.value)}
                    >
                      <option value="">General farm / No crop</option>
                      {crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.season} {c.year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">
                      Farming activity <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <select
                      className="select"
                      value={farmActivity}
                      onChange={(event) => setFarmActivity(event.target.value)}
                    >
                      <option value="">No specific activity</option>
                      {LABOUR_ACTIVITIES.map((act) => (
                        <option key={act} value={act}>
                          {act}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Vehicle Specific Contextual Fields */}
              {type === "VEHICLE_EXPENSE" && (
                <div>
                  <label className="label">
                    Vehicle <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <select
                    className="select"
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                  >
                    <option value="">
                      {vehicles.length > 0
                        ? "General / No vehicle selected"
                        : "No vehicles saved yet"}
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.type}) · {v.registrationNumber}
                      </option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p className="mt-1.5 text-[11.5px] text-ink-muted">
                      You can register your Tractor, Car, or Bike in Vehicles anytime.
                    </p>
                  )}
                </div>
              )}

              {type === "INCOME" && (
                <>
                  <div>
                    <label className="label">
                      Link to a crop <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <select
                      className="select"
                      value={cropId}
                      onChange={(event) => setCropId(event.target.value)}
                    >
                      <option value="">No crop</option>
                      {crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.season} {c.year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      Link to a vehicle <span className="font-normal text-ink-muted">(optional)</span>
                    </label>
                    <select
                      className="select"
                      value={vehicleId}
                      onChange={(event) => setVehicleId(event.target.value)}
                    >
                      <option value="">No vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} · {v.registrationNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="label">
                  {type === "INCOME" ? "Where did the money come from?" : "Description"}
                </label>
                <input
                  className="input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    type === "INCOME"
                      ? "e.g. Sold 20 quintal soybean"
                      : type === "HOME_EXPENSE"
                      ? "e.g. Weekly vegetables or grocery store"
                      : type === "FARM_EXPENSE"
                      ? "e.g. 2 bags of urea or tractor rental"
                      : "e.g. 30L diesel or servicing"
                  }
                />
              </div>

              <div>
                <label className="label">
                  Notes <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <textarea
                  className="textarea"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything you want to remember"
                />
              </div>

              {type !== "INCOME" && (
                <div>
                  <label className="label">
                    Receipt or photo <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  {receipt ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receipt}
                        alt="Receipt"
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-ink">Photo attached</p>
                        <p className="text-[10.5px] text-ink-muted">
                          Stored on this device with the record.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceipt(undefined)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-secondary"
                        aria-label="Remove receipt photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="receipt-photo"
                      className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-canvas/60 px-4 py-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-700">
                        {receiptBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-semibold text-ink">
                          {receiptBusy ? "Preparing photo…" : "Take or choose a photo"}
                        </span>
                        <span className="block text-[10.5px] text-ink-muted">
                          Optional. Resized automatically.
                        </span>
                      </span>
                    </label>
                  )}
                  <input
                    id="receipt-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      void handleReceipt(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
              )}

              {type === "INCOME" && (
                <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
                  <strong className="text-ink">Borrowed money is not income.</strong> Record a
                  loan under Loans so it never inflates your earnings.
                </div>
              )}
            </>
          )}

          {/* Labour Costing Form with Dynamic Calculation and Partial Payments */}
          {type === "LABOUR" && (
            <>
              {/* Dynamic Auto-calculated Cost Display */}
              <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-center">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                  Total Labour Cost
                </span>
                <span className="mt-1 block font-mono text-[34px] font-semibold tracking-tight text-brand-900">
                  {formatINR(labourTotal)}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-brand-800/80">
                  {Number(workers) || 0} worker{Number(workers) === 1 ? "" : "s"} × ₹{rateText || "0"} × {Number(days) || 0} day{Number(days) === 1 ? "" : "s"}
                </span>
              </div>

              <div>
                <label className="label">
                  Worker name or gang / group <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  className="input"
                  value={workerName}
                  onChange={(event) => setWorkerName(event.target.value)}
                  placeholder="e.g. Ramesh crew / Shinde gang"
                  autoFocus={!isEditing}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">
                    Crop <span className="text-negative">*</span>
                  </label>
                  <select
                    className="select"
                    value={cropId}
                    onChange={(event) => setCropId(event.target.value)}
                  >
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
                  <select
                    className="select"
                    value={landId}
                    onChange={(event) => setLandId(event.target.value)}
                  >
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
                <SimpleDatePicker label="Work date" value={date} onChange={setDate} required />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="label">Workers</label>
                  <input
                    className="input px-3 text-center"
                    value={workers}
                    onChange={(event) =>
                      setWorkers(event.target.value.replace(/[^\d]/g, "").slice(0, 4))
                    }
                    inputMode="numeric"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="label">Daily rate</label>
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

              <div>
                <label className="label">Payment status</label>
                <Segmented
                  options={[
                    { value: "PAID", label: "Paid in full" },
                    { value: "PARTIAL", label: "Partial payment" },
                    { value: "PENDING", label: "Pending" },
                  ]}
                  value={labourStatus}
                  onChange={(value) => setLabourStatus(value as "PAID" | "PARTIAL" | "PENDING")}
                  ariaLabel="Labour payment status"
                />
              </div>

              {labourStatus === "PARTIAL" && (
                <div className="rounded-2xl border border-amber/30 bg-amber-light/40 p-3.5 space-y-3">
                  <div>
                    <label className="label text-amber">
                      Amount paid now <span className="text-negative">*</span>
                    </label>
                    <input
                      className="input"
                      value={paidAmountText}
                      onChange={(event) =>
                        setPaidAmountText(event.target.value.replace(/[^\d.]/g, ""))
                      }
                      inputMode="decimal"
                      placeholder="Enter amount paid"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-ink-secondary">Remaining balance:</span>
                    <span className="font-semibold text-amber">{formatINR(remainingPaise)}</span>
                  </div>
                </div>
              )}

              {labourStatus !== "PENDING" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SimpleDatePicker
                    label="Payment date"
                    value={paidDate}
                    onChange={setPaidDate}
                    required
                  />
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
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Weeding in south field, or gang leader phone"
                />
              </div>

              <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
                <strong className="text-ink">No double counting:</strong> only cash paid is deducted
                from your balance, while the full committed cost counts toward your crop investment.
              </div>
            </>
          )}

          {/* Loan / Lending */}
          {(type === "LOAN" || type === "LENDING") && (
            <>
              <AmountInput
                valuePaise={amountPaise}
                onChange={setAmountPaise}
                label={type === "LOAN" ? "How much did you borrow?" : "How much did you lend?"}
                autoFocus={!isEditing}
              />

              <div>
                <label className="label">
                  {type === "LOAN" ? "Borrowed from" : "Lent to"}{" "}
                  <span className="text-negative">*</span>
                </label>
                <input
                  className="input"
                  value={partyName}
                  onChange={(event) => setPartyName(event.target.value)}
                  placeholder={type === "LOAN" ? "e.g. SBI or a family member" : "Person's name"}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SimpleDatePicker
                  label={type === "LOAN" ? "Borrowed on" : "Lent on"}
                  value={date}
                  onChange={setDate}
                  required
                />
                <SimpleDatePicker label="Due date (optional)" value={dueDate} onChange={setDueDate} />
              </div>

              <div>
                <label className="label">
                  Interest rate % <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  className="input"
                  value={interestRate}
                  onChange={(event) => setInterestRate(event.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="e.g. 12"
                />
              </div>

              <div>
                <label className="label">
                  Purpose <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input
                  className="input"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="e.g. Tractor repair"
                />
              </div>

              <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
                {type === "LOAN"
                  ? "A loan is not income. It is tracked separately so your earnings stay honest."
                  : "Lending is not an expense. It is money you expect to get back."}
              </div>
            </>
          )}

          {/* Reminder */}
          {type === "REMINDER" && (
            <>
              <div>
                <label className="label">
                  Reminder title <span className="text-negative">*</span>
                </label>
                <input
                  className="input"
                  value={reminderTitle}
                  onChange={(event) => setReminderTitle(event.target.value)}
                  placeholder="e.g. Pay labour wages"
                  autoFocus={!isEditing}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SimpleDatePicker label="Date" value={date} onChange={setDate} required />
                <div>
                  <label className="label">
                    Time <span className="font-normal text-ink-muted">(optional)</span>
                  </label>
                  <input
                    type="time"
                    className="input"
                    value={reminderTime}
                    onChange={(event) => setReminderTime(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  className="select"
                  value={reminderCategory}
                  onChange={(event) => setReminderCategory(event.target.value as ReminderCategory)}
                >
                  {REMINDER_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Repeat</label>
                <select
                  className="select"
                  value={repeat}
                  onChange={(event) => setRepeat(event.target.value as RepeatOption)}
                >
                  {REPEAT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
                <span>
                  <span className="block text-[13px] font-semibold text-ink">Notify me</span>
                  <span className="block text-[11px] text-ink-muted">
                    Show a device notification when the app is open.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={notifyOn}
                  onChange={(event) => setNotifyOn(event.target.checked)}
                  className="h-5 w-5 accent-[#2F7D4F]"
                />
              </label>

              <div>
                <label className="label">
                  Notes <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <textarea
                  className="textarea"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything you want to remember"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
              {error}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
