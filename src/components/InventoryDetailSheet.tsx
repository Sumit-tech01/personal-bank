"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  MinusCircle,
  Package,
  PlusCircle,
  Sliders,
  Sprout,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import StatusPill from "@/components/ui/StatusPill";
import StatCard from "@/components/ui/StatCard";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { formatDate } from "@/lib/dates";
import {
  averagePurchasePricePaise,
  inventoryItemValuation,
  reconcileItemStock,
} from "@/lib/finance";
import { formatINR, formatNumber } from "@/lib/money";
import type { InventoryItem } from "@/lib/types";

interface InventoryDetailSheetProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onEdit: (item: InventoryItem) => void;
  onBuy: (item: InventoryItem) => void;
  onUse: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
}

type DetailTab = "OVERVIEW" | "PURCHASES" | "USAGE" | "ADJUSTMENTS";

export default function InventoryDetailSheet({
  open,
  onClose,
  item,
  onEdit,
  onBuy,
  onUse,
  onAdjust,
}: InventoryDetailSheetProps) {
  const { archiveInventoryItem, deleteInventoryItem, deleteStockPurchase, deleteStockUsage, deleteStockAdjustment, notify } = useApp();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<DetailTab>("OVERVIEW");

  const avgPricePaise = useMemo(
    () => (item ? averagePurchasePricePaise(item) : 0),
    [item]
  );

  const valuationPaise = useMemo(
    () => (item ? inventoryItemValuation(item) : 0),
    [item]
  );

  const reconciliation = useMemo(
    () => (item ? reconcileItemStock(item) : null),
    [item]
  );

  if (!item) return null;

  const isOutOfStock = item.remainingQuantity <= 0;
  const isLowStock = !isOutOfStock && item.remainingQuantity <= item.minQuantity;

  const purchases = (item.purchases ?? []).slice().sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const usageHistory = (item.usageHistory ?? []).slice().sort((a, b) => b.usageDate.localeCompare(a.usageDate));
  const adjustments = (item.adjustments ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));

  const totalPurchasedQty = purchases.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const totalConsumedQty = usageHistory.reduce((acc, u) => acc + (u.quantityUsed || 0), 0);

  const handleArchive = async () => {
    const ok = await confirm({
      title: `Archive ${item.itemName}?`,
      message: "This product will be archived from active stock. Its historical purchases and usages will be preserved.",
      confirmLabel: "Archive Product",
    });
    if (!ok) return;
    await archiveInventoryItem(item.id);
    notify("Product archived.");
    onClose();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete ${item.itemName}?`,
      message: "Are you sure you want to delete this product and its stock history?",
      confirmLabel: "Delete Forever",
      danger: true,
    });
    if (!ok) return;
    await deleteInventoryItem(item.id);
    notify("Product deleted.");
    onClose();
  };

  const removePurchase = async (purchaseId: string) => {
    const ok = await confirm({
      title: "Delete Purchase Record?",
      message: "Stock will be deducted and any linked cash expense will be reversed.",
      confirmLabel: "Delete Record",
      danger: true,
    });
    if (!ok) return;
    await deleteStockPurchase(item.id, purchaseId);
    notify("Purchase record deleted.");
  };

  const removeUsage = async (usageId: string) => {
    const ok = await confirm({
      title: "Delete Stock Usage Record?",
      message: "Stock quantity will be restored.",
      confirmLabel: "Restore Stock",
    });
    if (!ok) return;
    await deleteStockUsage(item.id, usageId);
    notify("Stock usage removed and stock restored.");
  };

  const removeAdjustment = async (adjId: string) => {
    const ok = await confirm({
      title: "Delete Adjustment?",
      message: "This stock adjustment will be reversed.",
      confirmLabel: "Reverse Adjustment",
    });
    if (!ok) return;
    await deleteStockAdjustment(item.id, adjId);
    notify("Adjustment reversed.");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item.itemName}
      subtitle={`${item.category}${item.subcategory ? ` · ${item.subcategory}` : ""}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Status header banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-canvas/60 p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-bold text-ink">
                {formatNumber(item.remainingQuantity)} {item.unit}
              </p>
              <p className="text-[11px] text-ink-muted">Available Stock on Hand</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOutOfStock ? (
              <StatusPill label="Out of Stock" tone="negative" dot />
            ) : isLowStock ? (
              <StatusPill label="Low Stock" tone="amber" dot />
            ) : (
              <StatusPill label="In Stock" tone="positive" dot />
            )}
            {item.isArchived && <StatusPill label="Archived" tone="neutral" />}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onUse(item)}
            disabled={isOutOfStock}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white p-2.5 text-center transition hover:bg-canvas disabled:opacity-40"
          >
            <MinusCircle className="h-4 w-4 text-brand-600" />
            <span className="text-[11px] font-semibold text-ink">Use Stock</span>
          </button>
          <button
            type="button"
            onClick={() => onBuy(item)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white p-2.5 text-center transition hover:bg-canvas"
          >
            <PlusCircle className="h-4 w-4 text-positive" />
            <span className="text-[11px] font-semibold text-ink">Buy Stock</span>
          </button>
          <button
            type="button"
            onClick={() => onAdjust(item)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white p-2.5 text-center transition hover:bg-canvas"
          >
            <Sliders className="h-4 w-4 text-amber" />
            <span className="text-[11px] font-semibold text-ink">Adjust</span>
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white p-2.5 text-center transition hover:bg-canvas"
          >
            <Edit2 className="h-4 w-4 text-ink-secondary" />
            <span className="text-[11px] font-semibold text-ink">Edit Info</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-canvas p-1 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`py-1.5 rounded-lg text-center transition ${
              activeTab === "OVERVIEW" ? "bg-white text-ink shadow-sm font-semibold" : "text-ink-secondary"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PURCHASES")}
            className={`py-1.5 rounded-lg text-center transition ${
              activeTab === "PURCHASES" ? "bg-white text-ink shadow-sm font-semibold" : "text-ink-secondary"
            }`}
          >
            Purchases ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("USAGE")}
            className={`py-1.5 rounded-lg text-center transition ${
              activeTab === "USAGE" ? "bg-white text-ink shadow-sm font-semibold" : "text-ink-secondary"
            }`}
          >
            Usage ({usageHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ADJUSTMENTS")}
            className={`py-1.5 rounded-lg text-center transition ${
              activeTab === "ADJUSTMENTS" ? "bg-white text-ink shadow-sm font-semibold" : "text-ink-secondary"
            }`}
          >
            Audit ({adjustments.length})
          </button>
        </div>

        {/* Tab 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard label="Stock Valuation" value={formatINR(valuationPaise)} />
              <StatCard label="Avg Price / Unit" value={formatINR(avgPricePaise)} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <StatCard
                label="Total Purchased"
                value={`${formatNumber(totalPurchasedQty)} ${item.unit}`}
              />
              <StatCard
                label="Total Consumed"
                value={`${formatNumber(totalConsumedQty)} ${item.unit}`}
              />
            </div>

            {/* Specifications Card */}
            <div className="rounded-2xl border border-line bg-white p-4 space-y-2.5 text-[12.5px]">
              <h3 className="text-[13px] font-bold text-ink mb-1">Product Details</h3>
              {item.brand && (
                <div className="flex justify-between">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Brand
                  </span>
                  <span className="font-semibold text-ink">{item.brand}</span>
                </div>
              )}
              {item.storageLocation && (
                <div className="flex justify-between">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Storage Location
                  </span>
                  <span className="font-semibold text-ink">{item.storageLocation}</span>
                </div>
              )}
              {item.expiryDate && (
                <div className="flex justify-between">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Expiry Date
                  </span>
                  <span className="font-semibold text-ink">{formatDate(item.expiryDate)}</span>
                </div>
              )}
              {item.batchNumber && (
                <div className="flex justify-between">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Batch #
                  </span>
                  <span className="font-semibold text-ink">{item.batchNumber}</span>
                </div>
              )}
              {item.supplierName && (
                <div className="flex justify-between">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5" /> Supplier
                  </span>
                  <span className="font-semibold text-ink">
                    {item.supplierName} {item.supplierContact ? `(${item.supplierContact})` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink-muted flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Level
                </span>
                <span className="font-semibold text-ink">
                  {item.minQuantity} {item.unit}
                </span>
              </div>
              {item.notes && (
                <div className="border-t border-line/70 pt-2 text-ink-secondary text-[11.5px]">
                  <strong>Notes:</strong> {item.notes}
                </div>
              )}
            </div>

            {/* Reconciliation Audit Card */}
            {reconciliation && (
              <div className="rounded-2xl border border-line bg-canvas/40 p-3.5 text-[11.5px] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  <span>Stock Reconciliation Audit</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>Initial + Purchases - Usage + Adjustments:</span>
                  <span className="font-semibold text-ink">
                    {formatNumber(reconciliation.calculatedStock)} {item.unit}
                  </span>
                </div>
              </div>
            )}

            {/* Archive / Delete actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleArchive}
                className="flex items-center gap-1 text-[12px] font-medium text-ink-muted hover:text-ink"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-[12px] font-medium text-negative hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Product</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: PURCHASES */}
        {activeTab === "PURCHASES" && (
          <div className="space-y-2.5">
            {purchases.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-6 text-center text-ink-muted text-[12.5px]">
                No purchase transactions recorded yet.
              </div>
            ) : (
              purchases.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-line bg-white p-3.5 text-[12px] space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-ink">
                        {p.quantity} {p.unit} from {p.supplierName}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        Bought on {formatDate(p.purchaseDate)} · @ {formatINR(p.pricePerUnitPaise)}/{p.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink">{formatINR(p.totalCostPaise)}</p>
                      <StatusPill
                        label={p.paymentStatus}
                        tone={
                          p.paymentStatus === "PAID"
                            ? "positive"
                            : p.paymentStatus === "PARTIAL"
                            ? "amber"
                            : "negative"
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-secondary border-t border-line/60 pt-1.5">
                    <span>
                      Paid: <strong>{formatINR(p.paidPaise)}</strong>
                      {p.pendingPaise > 0 ? ` · Unpaid: ${formatINR(p.pendingPaise)}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePurchase(p.id)}
                      className="text-negative hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: USAGE */}
        {activeTab === "USAGE" && (
          <div className="space-y-2.5">
            {usageHistory.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-6 text-center text-ink-muted text-[12.5px]">
                No field or crop usage recorded yet.
              </div>
            ) : (
              usageHistory.map((u) => (
                <div
                  key={u.id}
                  className="rounded-2xl border border-line bg-white p-3.5 text-[12px] space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-ink flex items-center gap-1.5">
                        <Sprout className="h-3.5 w-3.5 text-brand-600" />
                        {u.cropName ? `Crop: ${u.cropName}` : "General Farm"}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {formatDate(u.usageDate)} · {u.activity || "Application"}
                        {u.landName ? ` · ${u.landName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-ink">
                        {u.quantityUsed} {u.unit}
                      </p>
                      <p className="text-[10.5px] text-brand-700 font-medium">
                        {formatINR(u.costPaise)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-line/60 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => removeUsage(u.id)}
                      className="text-negative hover:underline"
                    >
                      Restore Stock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: ADJUSTMENTS */}
        {activeTab === "ADJUSTMENTS" && (
          <div className="space-y-2.5">
            {adjustments.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-6 text-center text-ink-muted text-[12.5px]">
                No stock adjustments or damage corrections logged.
              </div>
            ) : (
              adjustments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-line bg-white p-3.5 text-[12px] space-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-ink">
                        {a.type} · {a.reason}
                      </span>
                      <p className="text-[11px] text-ink-muted">{formatDate(a.date)}</p>
                    </div>
                    <span
                      className={`font-bold ${
                        a.quantityDelta < 0 ? "text-negative" : "text-positive"
                      }`}
                    >
                      {a.quantityDelta > 0 ? `+${a.quantityDelta}` : a.quantityDelta} {a.unit}
                    </span>
                  </div>
                  {a.notes && <p className="text-[11px] text-ink-secondary">{a.notes}</p>}
                  <div className="flex justify-end border-t border-line/60 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => removeAdjustment(a.id)}
                      className="text-negative hover:underline"
                    >
                      Reverse
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
