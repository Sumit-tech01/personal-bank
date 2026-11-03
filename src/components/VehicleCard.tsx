"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Bike, Car, ChevronRight, Tractor } from "lucide-react";
import StatusPill from "./ui/StatusPill";
import { formatINR } from "@/lib/money";
import { formatDate, parseISODate, toISODate, todayISO } from "@/lib/dates";
import type { Vehicle } from "@/lib/types";
import type { VehicleFinancials } from "@/lib/finance";

interface VehicleCardProps {
  vehicle: Vehicle;
  financials: VehicleFinancials;
}

const icons = {
  Tractor: Tractor,
  Car: Car,
  Bike: Bike,
  Other: Car,
};

export default function VehicleCard({ vehicle, financials }: VehicleCardProps) {
  const Icon = icons[vehicle.type] || Car;

  const today = todayISO();
  const in30DaysDate = new Date();
  in30DaysDate.setDate(in30DaysDate.getDate() + 30);
  const in30Days = toISODate(in30DaysDate);

  const expiries = [
    { label: "Insurance", date: vehicle.insuranceExpiry },
    { label: "PUC", date: vehicle.pucExpiry },
    { label: "Service", date: vehicle.nextServiceDate },
    { label: "Registration", date: vehicle.registrationExpiry },
    { label: "Tyres", date: vehicle.tyreReplacementDate },
  ].filter((e): e is { label: string; date: string } => Boolean(e.date));

  const overdue = expiries.find((e) => e.date < today);
  const dueSoon = expiries.find((e) => e.date >= today && e.date <= in30Days);
  const nextDate = [...expiries].sort((a, b) => a.date.localeCompare(b.date))[0];

  const statusTone =
    vehicle.status === "ACTIVE"
      ? "positive"
      : vehicle.status === "MAINTENANCE"
      ? "amber"
      : "neutral";

  const statusLabel =
    vehicle.status === "ACTIVE"
      ? "Active"
      : vehicle.status === "MAINTENANCE"
      ? "In Service"
      : "Sold";

  const brandModel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="block rounded-2xl border border-line bg-white p-4 transition active:scale-[0.995]"
    >
      <div className="flex items-start gap-3">
        {vehicle.photoDataUrl ? (
          <img
            src={vehicle.photoDataUrl}
            alt={vehicle.name}
            className="h-12 w-12 shrink-0 rounded-2xl object-cover border border-line/60"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-light text-sky">
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14.5px] font-semibold text-ink">{vehicle.name}</p>
            <StatusPill label={statusLabel} tone={statusTone} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
            {[brandModel || null, vehicle.registrationNumber, vehicle.type, vehicle.fuelType]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {overdue ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-negative">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{overdue.label} overdue ({formatDate(overdue.date)})</span>
            </p>
          ) : dueSoon ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{dueSoon.label} due {formatDate(dueSoon.date)}</span>
            </p>
          ) : nextDate ? (
            <p className="mt-1 text-[11px] text-ink-muted">
              Next {nextDate.label.toLowerCase()}: {formatDate(nextDate.date)}
            </p>
          ) : null}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-canvas/80 px-3 py-2.5">
        <div>
          <p className="text-[10px] text-ink-muted">Fuel</p>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-ink">
            {formatINR(financials.fuelPaise)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-ink-muted">Operating</p>
          <p className="mt-0.5 truncate text-[12px] font-semibold text-ink">
            {formatINR(financials.totalOperatingCostPaise)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-ink-muted">
            {financials.rentalIncomePaise > 0 ? "Rental In" : "Total Spent"}
          </p>
          <p
            className={`mt-0.5 truncate text-[12px] font-semibold ${
              financials.rentalIncomePaise > 0 ? "text-positive" : "text-ink"
            }`}
          >
            {formatINR(
              financials.rentalIncomePaise > 0
                ? financials.rentalIncomePaise
                : financials.totalPaise
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
