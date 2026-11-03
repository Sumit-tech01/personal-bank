"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Bike,
  CalendarClock,
  Car,
  Clock,
  CreditCard,
  DollarSign,
  Fuel,
  Pencil,
  Plus,
  Shield,
  Tractor,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import StatCard from "@/components/ui/StatCard";
import TransactionItem from "@/components/TransactionItem";
import VehicleSheet from "@/components/forms/VehicleSheet";
import VehicleServiceSheet from "@/components/forms/VehicleServiceSheet";
import TractorWorkLogSheet from "@/components/forms/TractorWorkLogSheet";
import { tractorPerformance, vehicleFinancials } from "@/lib/finance";
import { formatDate, parseISODate, toISODate, todayISO } from "@/lib/dates";
import { formatINR, sumPaise } from "@/lib/money";
import type { Vehicle } from "@/lib/types";

type VehicleTab = "OVERVIEW" | "EXPENSES" | "SERVICE" | "TRACTOR";

const icons = { Tractor, Car, Bike, Other: Car };

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { vehicles, transactions, loans, deleteVehicle, openAdd, notify } = useApp();
  const confirm = useConfirm();

  const [tab, setTab] = useState<VehicleTab>("OVERVIEW");
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [tractorLogOpen, setTractorLogOpen] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("ALL");

  const vehicle = vehicles.find((item) => item.id === params.id) ?? null;

  const financials = useMemo(
    () => (vehicle ? vehicleFinancials(vehicle.id, transactions) : null),
    [vehicle, transactions]
  );

  const tractorStats = useMemo(
    () => (vehicle && vehicle.type === "Tractor" ? tractorPerformance(vehicle, transactions) : null),
    [vehicle, transactions]
  );

  // Transactions linked to this vehicle
  const vehicleTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.vehicleId === params.id
      ),
    [transactions, params.id]
  );

  // Filtered transactions for Expenses tab
  const filteredTransactions = useMemo(() => {
    if (expenseCategoryFilter === "ALL") return vehicleTransactions;
    return vehicleTransactions.filter((tx) => tx.category === expenseCategoryFilter);
  }, [vehicleTransactions, expenseCategoryFilter]);

  // Linked Loan details
  const linkedLoan = useMemo(() => {
    if (!vehicle) return null;
    return (
      loans.find((l) => l.id === vehicle.loanId || l.vehicleId === vehicle.id) ?? null
    );
  }, [loans, vehicle]);

  const outstandingLoanPaise = useMemo(() => {
    if (linkedLoan) {
      const repaid = sumPaise(linkedLoan.repayments.map((r) => r.amountPaise));
      return Math.max(0, linkedLoan.principalPaise - repaid);
    }
    return vehicle?.loanAmountPaise || 0;
  }, [linkedLoan, vehicle]);

  if (!vehicle || !financials) {
    return (
      <div className="min-h-[100dvh] bg-canvas">
        <PageHeader title="Vehicle" backHref="/vehicles" />
        <main className="app-container py-6">
          <EmptyState
            icon={<Car className="h-5 w-5" />}
            title="Vehicle not found"
            message="This vehicle may have been deleted. Return to your vehicles list."
            actionLabel="Back to vehicles"
            actionHref="/vehicles"
          />
        </main>
      </div>
    );
  }

  const Icon = icons[vehicle.type] || Car;
  const today = todayISO();
  const in30DaysDate = new Date();
  in30DaysDate.setDate(in30DaysDate.getDate() + 30);
  const in30Days = toISODate(in30DaysDate);

  const paperDates = [
    { label: "Insurance Expiry", value: vehicle.insuranceExpiry, icon: Shield },
    { label: "PUC Expiry", value: vehicle.pucExpiry, icon: Fuel },
    { label: "Next Servicing", value: vehicle.nextServiceDate, icon: Wrench },
    { label: "Registration Expiry", value: vehicle.registrationExpiry, icon: Car },
    { label: "Tyre Replacement", value: vehicle.tyreReplacementDate, icon: Wrench },
  ].filter((item) => item.value);

  const dueSoon = paperDates.filter(
    (item) => item.value && item.value <= in30Days
  );

  const removeVehicle = async () => {
    const okay = await confirm({
      title: `Delete ${vehicle.name}?`,
      message:
        "The vehicle record will be removed. All past transaction history will be preserved with the vehicle name intact.",
      confirmLabel: "Delete Vehicle",
      danger: true,
    });
    if (!okay) return;
    try {
      await deleteVehicle(vehicle.id);
      notify("Vehicle deleted successfully.");
      router.replace("/vehicles");
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : "Could not delete vehicle.", "error");
    }
  };

  const isTractor = vehicle.type === "Tractor";

  return (
    <div className="min-h-[100dvh] bg-canvas pb-20">
      <PageHeader
        title={vehicle.name}
        subtitle={`${vehicle.registrationNumber} · ${vehicle.type}`}
        backHref="/vehicles"
        right={
          <button
            type="button"
            onClick={() => setVehicleSheetOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-secondary shadow-xs hover:text-ink active:scale-95"
            aria-label="Edit vehicle"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Vehicle Header Card */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-start gap-3.5">
            {vehicle.photoDataUrl ? (
              <img
                src={vehicle.photoDataUrl}
                alt={vehicle.name}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover border border-line/60"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-light text-sky">
                <Icon className="h-7 w-7" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-semibold text-ink">{vehicle.name}</h2>
                <StatusPill
                  label={
                    vehicle.status === "ACTIVE"
                      ? "In Use"
                      : vehicle.status === "MAINTENANCE"
                      ? "In Maintenance"
                      : "Sold"
                  }
                  tone={
                    vehicle.status === "ACTIVE"
                      ? "positive"
                      : vehicle.status === "MAINTENANCE"
                      ? "amber"
                      : "neutral"
                  }
                />
              </div>
              <p className="mt-0.5 text-[12px] font-medium text-ink-secondary">
                {[
                  vehicle.brand
                    ? `${vehicle.brand}${vehicle.model ? ` ${vehicle.model}` : ""}`
                    : null,
                  vehicle.registrationNumber,
                  vehicle.fuelType,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {vehicle.purchaseDate && (
                <p className="mt-1 text-[11px] text-ink-muted">
                  Purchased on {formatDate(vehicle.purchaseDate)}
                  {vehicle.purchasePricePaise
                    ? ` for ${formatINR(vehicle.purchasePricePaise)}`
                    : ""}
                </p>
              )}
            </div>
          </div>

          {/* Quick Tabs Bar */}
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-canvas p-1 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setTab("OVERVIEW")}
              className={`rounded-xl py-2 text-[12px] font-semibold transition ${
                tab === "OVERVIEW"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setTab("EXPENSES")}
              className={`rounded-xl py-2 text-[12px] font-semibold transition ${
                tab === "EXPENSES"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Expenses ({vehicleTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("SERVICE")}
              className={`rounded-xl py-2 text-[12px] font-semibold transition ${
                tab === "SERVICE"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Service ({vehicle.serviceHistory?.length || 0})
            </button>
            {isTractor && (
              <button
                type="button"
                onClick={() => setTab("TRACTOR")}
                className={`rounded-xl py-2 text-[12px] font-semibold transition ${
                  tab === "TRACTOR"
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Tractor ({vehicle.tractor?.logs?.length || 0})
              </button>
            )}
          </div>
        </section>

        {/* -------------------- TAB 1: OVERVIEW -------------------- */}
        {tab === "OVERVIEW" && (
          <div className="space-y-4">
            {/* Expiry alerts */}
            {dueSoon.length > 0 && (
              <section className="rounded-card border border-amber/30 bg-amber-light/50 p-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber" />
                  <h3 className="text-[13px] font-semibold text-ink">Papers & Maintenance Attention</h3>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {dueSoon.map((item) => {
                    const isOverdue = !!item.value && item.value < today;
                    return (
                      <div key={item.label} className="flex items-center justify-between text-[12px]">
                        <span className="text-ink-secondary">{item.label}</span>
                        <span className={`font-semibold ${isOverdue ? "text-negative" : "text-amber-dark"}`}>
                          {isOverdue ? "Expired: " : "Due: "}
                          {formatDate(item.value ?? "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Financial Overview Cards */}
            <section className="rounded-card border border-line bg-white p-4">
              <h3 className="text-[14px] font-semibold text-ink">Financial Performance</h3>
              <p className="text-[11.5px] text-ink-muted">Lifetime costs and returns for this vehicle</p>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <StatCard
                  label="Total Spent"
                  value={formatINR(financials.totalPaise)}
                  tone="negative"
                  sub={`${financials.expenseCount} entries`}
                />
                <StatCard
                  label="Operating Cost"
                  value={formatINR(financials.totalOperatingCostPaise)}
                  sub="Excludes loan EMI"
                />
                <StatCard
                  label="Fuel Cost"
                  value={formatINR(financials.fuelPaise)}
                  sub="Diesel, petrol, CNG"
                />
                <StatCard
                  label="Maintenance"
                  value={formatINR(financials.maintenancePaise)}
                  sub="Repairs & servicing"
                />
                <StatCard
                  label="Rental Income"
                  value={formatINR(financials.rentalIncomePaise)}
                  tone="positive"
                  sub="Received to date"
                />
                <StatCard
                  label="Net Cash Flow"
                  value={formatINR(financials.netCashFlowPaise)}
                  tone={financials.netCashFlowPaise >= 0 ? "positive" : "neutral"}
                  sub="Income minus expenses"
                />
              </div>

              <div className="mt-3.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => openAdd("VEHICLE_EXPENSE", undefined, { vehicleId: vehicle.id })}
                  className="btn-primary flex-1 py-2 text-[12.5px]"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </button>
                <button
                  type="button"
                  onClick={() => setServiceSheetOpen(true)}
                  className="btn-secondary flex-1 py-2 text-[12.5px]"
                >
                  <Wrench className="h-4 w-4" />
                  Log Service
                </button>
              </div>
            </section>

            {/* Vehicle Loan Card (if exists) */}
            {(!!vehicle.loanAmountPaise || !!linkedLoan || !!vehicle.loanEmiPaise) && (
              <section className="rounded-card border border-line bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-ink">Vehicle Financing & Loan</h3>
                    <p className="text-[11px] text-ink-muted">
                      {linkedLoan?.partyName || vehicle.loanBank || "Financing details"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
                  <div className="rounded-xl bg-canvas p-2.5">
                    <p className="text-[10.5px] text-ink-muted">Original Loan</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {formatINR(linkedLoan?.principalPaise ?? vehicle.loanAmountPaise ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5">
                    <p className="text-[10.5px] text-ink-muted">Down Payment</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {formatINR(vehicle.downPaymentPaise ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5">
                    <p className="text-[10.5px] text-ink-muted">Monthly EMI</p>
                    <p className="mt-0.5 font-semibold text-ink">
                      {formatINR(vehicle.loanEmiPaise ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5">
                    <p className="text-[10.5px] text-ink-muted">Remaining Balance</p>
                    <p className="mt-0.5 font-semibold text-negative">
                      {formatINR(outstandingLoanPaise)}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-line/70 pt-2 text-[11.5px]">
                  <span className="text-ink-secondary">EMI Due Date:</span>
                  <span className="font-semibold text-ink">
                    {vehicle.loanPaymentDate
                      ? `Day ${parseISODate(vehicle.loanPaymentDate).getDate()} of each month`
                      : "Monthly"}
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] text-ink-muted">
                  Note: Loan repayments reduce liability and are reported separately from operating
                  costs.
                </p>
              </section>
            )}

            {/* Papers, Expiry and Service Dates */}
            {paperDates.length > 0 && (
              <section className="rounded-card border border-line bg-white p-4">
                <h3 className="text-[13.5px] font-semibold text-ink">Vehicle Documents & Renewal Dates</h3>
                <div className="mt-3 divide-y divide-line/60">
                  {paperDates.map((item) => {
                    const DateIcon = item.icon;
                    const isOverdue = !!item.value && item.value < today;
                    const isDueSoon = !!item.value && !isOverdue && item.value <= in30Days;
                    return (
                      <div key={item.label} className="flex items-center justify-between py-2.5">
                        <span className="flex items-center gap-2 text-[12px] text-ink">
                          <DateIcon className="h-4 w-4 text-ink-muted" />
                          {item.label}
                        </span>
                        <StatusPill
                          label={formatDate(item.value ?? "")}
                          tone={isOverdue ? "negative" : isDueSoon ? "amber" : "neutral"}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Notes */}
            {vehicle.notes && (
              <section className="rounded-card border border-line bg-white p-4">
                <h3 className="text-[13px] font-semibold text-ink">Notes</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-secondary">
                  {vehicle.notes}
                </p>
              </section>
            )}
          </div>
        )}

        {/* -------------------- TAB 2: EXPENSES -------------------- */}
        {tab === "EXPENSES" && (
          <div className="space-y-4">
            {/* Cost Breakdown */}
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">Vehicle Cost Breakdown</h3>
                  <p className="text-[11.5px] text-ink-muted">All expenses attributed to this vehicle</p>
                </div>
                <button
                  type="button"
                  onClick={() => openAdd("VEHICLE_EXPENSE", undefined, { vehicleId: vehicle.id })}
                  className="flex h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-[11.5px] font-semibold text-brand-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <CostLine label="Fuel (Petrol / Diesel / CNG)" amountPaise={financials.fuelPaise} />
                <CostLine label="Servicing & Repairs" amountPaise={financials.maintenancePaise} />
                <CostLine label="Insurance, PUC & Registration" amountPaise={financials.insurancePaise} />
                <CostLine label="Loan EMI Payments" amountPaise={financials.emiPaise} />
                <CostLine label="Other / Parking" amountPaise={financials.otherPaise} />
                <div className="flex items-center justify-between border-t border-line/80 pt-2 font-semibold">
                  <span className="text-[12.5px] text-ink">Total Vehicle Expenses</span>
                  <span className="text-[13px] text-negative">{formatINR(financials.totalPaise)}</span>
                </div>
              </div>
            </section>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {["ALL", "Diesel", "Petrol", "Servicing", "Repairs", "Insurance", "PUC", "EMI"].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExpenseCategoryFilter(cat)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                      expenseCategoryFilter === cat
                        ? "bg-brand-600 text-white"
                        : "border border-line bg-white text-ink-muted hover:bg-canvas"
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            {/* Transactions List */}
            <section className="overflow-hidden rounded-card border border-line bg-white">
              <div className="px-4 pb-2 pt-3">
                <p className="text-[12px] font-semibold text-ink">
                  Expense Records ({filteredTransactions.length})
                </p>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    compact
                    icon={<Fuel className="h-5 w-5" />}
                    title="No expenses found"
                    message="Add fuel receipts, garage servicing bills, or EMI payments for this vehicle."
                    actionLabel="Add Expense"
                    onAction={() =>
                      openAdd("VEHICLE_EXPENSE", undefined, { vehicleId: vehicle.id })
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-line/70">
                  {filteredTransactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onClick={() => openAdd(undefined, tx)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* -------------------- TAB 3: SERVICE HISTORY -------------------- */}
        {tab === "SERVICE" && (
          <div className="space-y-4">
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">Service & Maintenance Log</h3>
                  <p className="text-[11.5px] text-ink-muted">
                    Garage visits, routine servicing, oil changes, and parts replacement
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceSheetOpen(true)}
                  className="flex h-8 items-center gap-1 rounded-full bg-brand-600 px-3 text-[11.5px] font-semibold text-white shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Log Service
                </button>
              </div>

              {vehicle.nextServiceDate && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-[12px]">
                  <span className="text-ink-secondary">Next Scheduled Service:</span>
                  <span className="font-semibold text-brand-700">
                    {formatDate(vehicle.nextServiceDate)}
                  </span>
                </div>
              )}
            </section>

            {/* Service Records List */}
            {(!vehicle.serviceHistory || vehicle.serviceHistory.length === 0) ? (
              <EmptyState
                icon={<Wrench className="h-5 w-5" />}
                title="No service records yet"
                message="Log engine oil changes, general servicing, tire replacements, or garage repairs with bills."
                actionLabel="Log First Service"
                onAction={() => setServiceSheetOpen(true)}
              />
            ) : (
              <div className="space-y-2.5">
                {[...vehicle.serviceHistory]
                  .sort((a, b) => (b.serviceDate || b.date).localeCompare(a.serviceDate || a.date))
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-line bg-white p-3.5 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-ink">{rec.serviceType}</p>
                          <p className="mt-0.5 text-[11.5px] text-ink-muted">
                            {formatDate(rec.serviceDate || rec.date)}
                            {rec.serviceCenter ? ` · ${rec.serviceCenter}` : ""}
                          </p>
                        </div>
                        <span className="text-[13px] font-semibold text-negative">
                          {formatINR(rec.amountPaise)}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-ink-secondary">
                        {rec.odometerReading ? (
                          <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                            <span className="text-ink-muted">Reading:</span> {rec.odometerReading}
                          </div>
                        ) : null}
                        {rec.nextServiceDate ? (
                          <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                            <span className="text-ink-muted">Next Due:</span>{" "}
                            {formatDate(rec.nextServiceDate)}
                          </div>
                        ) : null}
                      </div>

                      {rec.notes && (
                        <p className="mt-2 border-t border-line/60 pt-1.5 text-[11.5px] text-ink-muted">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------- TAB 4: TRACTOR OPERATIONS -------------------- */}
        {tab === "TRACTOR" && isTractor && tractorStats && (
          <div className="space-y-4">
            {/* Tractor Performance KPIs */}
            <section className="rounded-card border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">Tractor Performance & Work</h3>
                  <p className="text-[11.5px] text-ink-muted">Hours, diesel consumption, and rental returns</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTractorLogOpen(true)}
                  className="flex h-8 items-center gap-1 rounded-full bg-brand-600 px-3 text-[11.5px] font-semibold text-white shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Log Work
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCard
                  label="Total Hours"
                  value={`${tractorStats.totalHours} hrs`}
                  sub="Engine run time"
                />
                <StatCard
                  label="Own Farm Hours"
                  value={`${tractorStats.ownFarmHours} hrs`}
                  sub="Personal usage"
                />
                <StatCard
                  label="Rental Hours"
                  value={`${tractorStats.otherFarmHours} hrs`}
                  sub="Hired out to others"
                />
                <StatCard
                  label="Diesel Used"
                  value={`${tractorStats.dieselLitres} L`}
                  sub="Total fuel consumed"
                />
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-canvas p-2.5">
                  <p className="text-[10px] text-ink-muted">Operating Cost</p>
                  <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink">
                    {formatINR(tractorStats.totalOperatingCostPaise)}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <p className="text-[10px] text-ink-muted">Rental Income</p>
                  <p className="mt-0.5 truncate text-[12.5px] font-semibold text-positive">
                    {formatINR(tractorStats.rentalIncomePaise)}
                  </p>
                </div>
                <div className="rounded-xl bg-canvas p-2.5">
                  <p className="text-[10px] text-ink-muted">Net Earnings</p>
                  <p
                    className={`mt-0.5 truncate text-[12.5px] font-semibold ${
                      tractorStats.netTractorEarningsPaise >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatINR(tractorStats.netTractorEarningsPaise)}
                  </p>
                </div>
              </div>
            </section>

            {/* Tractor Work Logs List */}
            {(!vehicle.tractor?.logs || vehicle.tractor.logs.length === 0) ? (
              <EmptyState
                icon={<Tractor className="h-5 w-5" />}
                title="No tractor work logged yet"
                message="Record ploughing, rotavator, or sowing work on your own farm or for rental clients."
                actionLabel="Log Tractor Work"
                onAction={() => setTractorLogOpen(true)}
              />
            ) : (
              <div className="space-y-2.5">
                {[...vehicle.tractor.logs]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-line bg-white p-3.5 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[13.5px] font-semibold text-ink">
                              {log.operationType}
                            </p>
                            <StatusPill
                              label={log.farmType === "OWN" ? "Own Farm" : "Rental"}
                              tone={log.farmType === "OWN" ? "neutral" : "positive"}
                            />
                          </div>
                          <p className="mt-0.5 text-[11.5px] text-ink-muted">
                            {formatDate(log.date)}
                            {log.clientName ? ` · Client: ${log.clientName}` : ""}
                          </p>
                        </div>
                        {log.grossAmountPaise ? (
                          <div className="text-right">
                            <span className="text-[13px] font-semibold text-positive">
                              {formatINR(log.receivedAmountPaise ?? log.grossAmountPaise)}
                            </span>
                            {log.paymentStatus && log.paymentStatus !== "RECEIVED" && (
                              <p className="text-[10px] font-medium text-amber">
                                {log.paymentStatus === "PARTIAL" ? "Partial" : "Pending"}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-ink-secondary sm:grid-cols-3">
                        <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                          <span className="text-ink-muted">Duration:</span> {log.hours} hrs
                        </div>
                        {log.dieselLitres ? (
                          <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                            <span className="text-ink-muted">Diesel:</span> {log.dieselLitres} L
                          </div>
                        ) : null}
                        {log.ratePerHourPaise ? (
                          <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                            <span className="text-ink-muted">Rate:</span>{" "}
                            {formatINR(log.ratePerHourPaise)}/hr
                          </div>
                        ) : null}
                      </div>

                      {log.notes && (
                        <p className="mt-2 border-t border-line/60 pt-1.5 text-[11.5px] text-ink-muted">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Vehicle Button */}
        <button type="button" className="btn-danger w-full mt-6" onClick={removeVehicle}>
          <Trash2 className="h-4 w-4" />
          Delete Vehicle
        </button>
      </main>

      {/* Sheets */}
      <VehicleSheet
        open={vehicleSheetOpen}
        onClose={() => setVehicleSheetOpen(false)}
        vehicle={vehicle}
      />
      <VehicleServiceSheet
        open={serviceSheetOpen}
        onClose={() => setServiceSheetOpen(false)}
        defaultVehicleId={vehicle.id}
        vehicle={vehicle}
      />
      <TractorWorkLogSheet
        open={tractorLogOpen}
        onClose={() => setTractorLogOpen(false)}
        defaultVehicleId={vehicle.id}
        vehicle={vehicle}
      />
    </div>
  );
}

function CostLine({ label, amountPaise }: { label: string; amountPaise: number }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-semibold text-ink">{formatINR(amountPaise)}</span>
    </div>
  );
}
