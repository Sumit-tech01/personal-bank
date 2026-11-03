"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  CalendarClock,
  Car,
  Fuel,
  Plus,
  Tractor,
  Wrench,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import VehicleCard from "@/components/VehicleCard";
import VehicleSheet from "@/components/forms/VehicleSheet";
import VehicleServiceSheet from "@/components/forms/VehicleServiceSheet";
import TractorWorkLogSheet from "@/components/forms/TractorWorkLogSheet";
import { vehicleFinancials, vehiclesDashboardStats } from "@/lib/finance";
import { formatDate, toISODate, todayISO } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import type { VehicleType } from "@/lib/types";

type FilterType = "ALL" | VehicleType;

export default function VehiclesPage() {
  const { vehicles, transactions, loans, openAdd } = useApp();
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [tractorLogOpen, setTractorLogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  const stats = useMemo(
    () => vehiclesDashboardStats(vehicles, transactions, loans),
    [vehicles, transactions, loans]
  );

  const vehicleRows = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        vehicle,
        financials: vehicleFinancials(vehicle.id, transactions),
      })),
    [vehicles, transactions]
  );

  const filteredRows = useMemo(() => {
    if (activeFilter === "ALL") return vehicleRows;
    return vehicleRows.filter((r) => r.vehicle.type === activeFilter);
  }, [vehicleRows, activeFilter]);

  // Upcoming and overdue vehicle reminders
  const reminders = useMemo(() => {
    const today = todayISO();
    const in30DaysDate = new Date();
    in30DaysDate.setDate(in30DaysDate.getDate() + 30);
    const in30Days = toISODate(in30DaysDate);

    const list: {
      vehicleName: string;
      vehicleId: string;
      label: string;
      date: string;
      isOverdue: boolean;
    }[] = [];

    for (const v of vehicles) {
      if (v.status === "SOLD") continue;
      const dates = [
        { label: "Insurance", date: v.insuranceExpiry },
        { label: "PUC", date: v.pucExpiry },
        { label: "Servicing", date: v.nextServiceDate },
        { label: "Registration", date: v.registrationExpiry },
        { label: "Tyre Replacement", date: v.tyreReplacementDate },
      ];
      for (const d of dates) {
        if (!d.date) continue;
        if (d.date < today) {
          list.push({
            vehicleName: v.name,
            vehicleId: v.id,
            label: d.label,
            date: d.date,
            isOverdue: true,
          });
        } else if (d.date <= in30Days) {
          list.push({
            vehicleName: v.name,
            vehicleId: v.id,
            label: d.label,
            date: d.date,
            isOverdue: false,
          });
        }
      }
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [vehicles]);

  const hasTractor = vehicles.some((v) => v.type === "Tractor");

  const filterCounts = useMemo(() => {
    return {
      ALL: vehicles.length,
      Tractor: vehicles.filter((v) => v.type === "Tractor").length,
      Car: vehicles.filter((v) => v.type === "Car").length,
      Bike: vehicles.filter((v) => v.type === "Bike").length,
      Other: vehicles.filter((v) => v.type === "Other").length,
    };
  }, [vehicles]);

  return (
    <div className="min-h-[100dvh] bg-canvas pb-20">
      <PageHeader
        title="Vehicles & Assets"
        subtitle="Tractor, car, bike and asset management"
        backHref="/more"
        right={
          <button
            type="button"
            onClick={() => setVehicleSheetOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Executive Stats Dashboard */}
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-light text-sky">
                <Tractor className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-ink">Vehicle Dashboard</h2>
                <p className="text-[11.5px] text-ink-muted">
                  {stats.totalVehicles} registered vehicle{stats.totalVehicles === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard
              label="Purchase Value"
              value={formatINR(stats.totalPurchaseValuePaise)}
              sub="Asset inventory"
            />
            <StatCard
              label="Total Expenses"
              value={formatINR(stats.totalExpensesPaise)}
              tone="negative"
              sub="Lifetime vehicle costs"
            />
            <StatCard
              label="This Month"
              value={formatINR(stats.monthlyExpensesPaise)}
              tone="amber"
              sub="Current month spend"
            />
            <StatCard
              label="Fuel Expenses"
              value={formatINR(stats.totalFuelPaise)}
              sub="Petrol, diesel & CNG"
            />
            <StatCard
              label="Maintenance"
              value={formatINR(stats.totalMaintenancePaise)}
              sub="Repairs & servicing"
            />
            <StatCard
              label="Outstanding Loans"
              value={formatINR(stats.outstandingLoansPaise)}
              tone={stats.outstandingLoansPaise > 0 ? "negative" : "neutral"}
              sub="Remaining EMI balance"
            />
          </div>

          {stats.totalRentalIncomePaise > 0 && (
            <div className="mt-2.5 flex items-center justify-between rounded-xl bg-positive-light/40 px-3.5 py-2 text-[12px]">
              <span className="text-positive-dark font-medium">Tractor Rental Income</span>
              <span className="font-semibold text-positive-dark">
                {formatINR(stats.totalRentalIncomePaise)}
              </span>
            </div>
          )}
        </section>

        {/* Quick Actions Strip */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setVehicleSheetOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-brand-300 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Plus className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-ink">Add Vehicle</p>
              <p className="text-[10.5px] text-ink-muted">Register asset</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setServiceSheetOpen(true)}
            disabled={vehicles.length === 0}
            className="flex items-center gap-2 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-brand-300 active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-light text-amber">
              <Wrench className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-ink">Log Service</p>
              <p className="text-[10.5px] text-ink-muted">Maintenance</p>
            </div>
          </button>

          {hasTractor ? (
            <button
              type="button"
              onClick={() => setTractorLogOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-brand-300 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-positive-light text-positive">
                <Tractor className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink">Tractor Work</p>
                <p className="text-[10.5px] text-ink-muted">Hours & rental</p>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAdd("VEHICLE_EXPENSE")}
              disabled={vehicles.length === 0}
              className="flex items-center gap-2 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-brand-300 active:scale-[0.99] disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-light text-sky">
                <Fuel className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink">Add Expense</p>
                <p className="text-[10.5px] text-ink-muted">Fuel & repairs</p>
              </div>
            </button>
          )}

          {hasTractor && (
            <button
              type="button"
              onClick={() => openAdd("VEHICLE_EXPENSE")}
              disabled={vehicles.length === 0}
              className="flex items-center gap-2 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-brand-300 active:scale-[0.99] disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-light text-sky">
                <Fuel className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink">Add Expense</p>
                <p className="text-[10.5px] text-ink-muted">Fuel & repairs</p>
              </div>
            </button>
          )}
        </section>

        {/* Reminders / Expiry Alerts */}
        {reminders.length > 0 && (
          <section className="rounded-card border border-amber/30 bg-amber-light/40 p-3.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber" />
              <h3 className="text-[12.5px] font-semibold text-ink">
                Vehicle Reminders & Paper Expiries ({reminders.length})
              </h3>
            </div>
            <div className="mt-2 space-y-1.5">
              {reminders.slice(0, 4).map((rem, idx) => (
                <div
                  key={`${rem.vehicleId}-${rem.label}-${idx}`}
                  className="flex items-center justify-between text-[11.5px]"
                >
                  <span className="text-ink">
                    <strong className="font-medium text-ink-secondary">{rem.vehicleName}:</strong>{" "}
                    {rem.label}
                  </span>
                  <span
                    className={`font-semibold ${
                      rem.isOverdue ? "text-negative" : "text-amber-dark"
                    }`}
                  >
                    {rem.isOverdue ? "Expired " : "Due "} {formatDate(rem.date)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vehicle Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(["ALL", "Tractor", "Car", "Bike", "Other"] as FilterType[]).map((tab) => {
            const count = filterCounts[tab] || 0;
            const active = activeFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                  active
                    ? "bg-brand-600 text-white shadow-xs"
                    : "border border-line bg-white text-ink-secondary hover:bg-canvas"
                }`}
              >
                <span>{tab === "ALL" ? "All" : tab === "Bike" ? "Motorcycle/Bike" : tab}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-canvas text-ink-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Vehicles List */}
        {filteredRows.length === 0 ? (
          <EmptyState
            icon={<Car className="h-5 w-5" />}
            title={activeFilter === "ALL" ? "No vehicles yet" : `No ${activeFilter.toLowerCase()}s found`}
            message="Register your tractor, car, motorcycle, or other vehicle to track fuel, repairs, maintenance, and papers."
            actionLabel="Add Vehicle"
            onAction={() => setVehicleSheetOpen(true)}
          />
        ) : (
          <section className="space-y-2.5">
            {filteredRows.map(({ vehicle, financials }) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} financials={financials} />
            ))}
          </section>
        )}

        <div className="rounded-2xl bg-canvas px-4 py-3 text-[11.5px] leading-5 text-ink-secondary">
          Vehicle expenses and maintenance are isolated per vehicle so you can track the true cost
          of ownership and operation without mixing them into general farm or household expenses.
        </div>
      </main>

      <VehicleSheet open={vehicleSheetOpen} onClose={() => setVehicleSheetOpen(false)} />
      <VehicleServiceSheet
        open={serviceSheetOpen}
        onClose={() => setServiceSheetOpen(false)}
      />
      <TractorWorkLogSheet
        open={tractorLogOpen}
        onClose={() => setTractorLogOpen(false)}
      />
    </div>
  );
}
