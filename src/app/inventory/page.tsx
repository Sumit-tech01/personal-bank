"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  Filter,
  History,
  MinusCircle,
  Package,
  Plus,
  PlusCircle,
  Search,
  ShoppingCart,
  Sliders,
  Sprout,
  Store,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import InventorySheet from "@/components/forms/InventorySheet";
import StockPurchaseSheet from "@/components/forms/StockPurchaseSheet";
import StockUsageSheet from "@/components/forms/StockUsageSheet";
import StockAdjustmentSheet from "@/components/forms/StockAdjustmentSheet";
import InventoryDetailSheet from "@/components/InventoryDetailSheet";
import {
  averagePurchasePricePaise,
  cropInventoryCost,
  expiringInventoryItems,
  inventoryDashboardStats,
  inventoryItemValuation,
  lowStockItems,
  outOfStockItems,
} from "@/lib/finance";
import { formatDate } from "@/lib/dates";
import { formatINR, formatNumber } from "@/lib/money";
import type { InventoryItem } from "@/lib/types";

type InventoryTab = "PRODUCTS" | "PURCHASES" | "USAGE" | "AUDIT" | "REPORTS";

export default function InventoryPage() {
  const { inventory, crops, lands, t } = useApp();

  const [activeTab, setActiveTab] = useState<InventoryTab>("PRODUCTS");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet states
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [purchaseSheetOpen, setPurchaseSheetOpen] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState<string | undefined>(undefined);

  const [usageSheetOpen, setUsageSheetOpen] = useState(false);
  const [usageItemId, setUsageItemId] = useState<string | undefined>(undefined);

  const [adjustmentSheetOpen, setAdjustmentSheetOpen] = useState(false);
  const [adjustmentItemId, setAdjustmentItemId] = useState<string | undefined>(undefined);

  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Reports state
  const [reportType, setReportType] = useState<
    "VALUATION" | "CROP_CONSUMPTION" | "SUPPLIER" | "EXPIRING_DAMAGED"
  >("VALUATION");

  // Dashboard Stats
  const stats = useMemo(() => inventoryDashboardStats(inventory), [inventory]);
  const lowList = useMemo(() => lowStockItems(inventory), [inventory]);
  const outList = useMemo(() => outOfStockItems(inventory), [inventory]);
  const expiringList = useMemo(() => expiringInventoryItems(inventory, 30), [inventory]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of inventory) {
      if (item.category && !item.isArchived) set.add(item.category);
    }
    return ["ALL", ...Array.from(set)];
  }, [inventory]);

  // Filtered Products
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      if (item.isArchived) return false;
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(q);
        const matchesBrand = item.brand?.toLowerCase().includes(q) ?? false;
        const matchesLoc = item.storageLocation?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesBrand && !matchesLoc) return false;
      }
      return true;
    });
  }, [inventory, selectedCategory, searchQuery]);

  // All Purchases flat list
  const allPurchases = useMemo(() => {
    const list: Array<any> = [];
    for (const item of inventory) {
      for (const p of item.purchases ?? []) {
        list.push({ ...p, itemName: item.itemName, itemCategory: item.category, itemUnit: item.unit });
      }
    }
    return list.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }, [inventory]);

  // All Usages flat list
  const allUsages = useMemo(() => {
    const list: Array<any> = [];
    for (const item of inventory) {
      for (const u of item.usageHistory ?? []) {
        list.push({ ...u, itemName: item.itemName, itemCategory: item.category, itemUnit: item.unit });
      }
    }
    return list.sort((a, b) => b.usageDate.localeCompare(a.usageDate));
  }, [inventory]);

  // All Adjustments flat list
  const allAdjustments = useMemo(() => {
    const list: Array<any> = [];
    for (const item of inventory) {
      for (const a of item.adjustments ?? []) {
        list.push({ ...a, itemName: item.itemName, itemCategory: item.category, itemUnit: item.unit });
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [inventory]);

  // Reports data calculations
  const cropConsumptionSummary = useMemo(() => {
    return crops.map((crop) => {
      const materialCost = cropInventoryCost(crop.id, inventory);
      const usedItems: { itemName: string; qty: number; unit: string; costPaise: number }[] = [];
      for (const it of inventory) {
        for (const u of it.usageHistory ?? []) {
          if (u.cropId === crop.id) {
            usedItems.push({
              itemName: it.itemName,
              qty: u.quantityUsed,
              unit: u.unit,
              costPaise: u.costPaise,
            });
          }
        }
      }
      return {
        crop,
        materialCost,
        usedItems,
      };
    }).filter((r) => r.materialCost > 0);
  }, [crops, inventory]);

  const supplierPurchasesSummary = useMemo(() => {
    const map = new Map<string, { totalSpendPaise: number; paidPaise: number; pendingPaise: number; count: number }>();
    for (const p of allPurchases) {
      const sup = p.supplierName || "Direct / Unknown";
      const curr = map.get(sup) ?? { totalSpendPaise: 0, paidPaise: 0, pendingPaise: 0, count: 0 };
      curr.totalSpendPaise += p.totalCostPaise;
      curr.paidPaise += p.paidPaise;
      curr.pendingPaise += p.pendingPaise;
      curr.count += 1;
      map.set(sup, curr);
    }
    return Array.from(map.entries()).map(([supplier, data]) => ({ supplier, ...data }));
  }, [allPurchases]);

  const openNewProduct = () => {
    setEditingItem(null);
    setProductSheetOpen(true);
  };

  const openPurchase = (item?: InventoryItem) => {
    setPurchaseItemId(item?.id);
    setPurchaseSheetOpen(true);
  };

  const openUsage = (item?: InventoryItem) => {
    setUsageItemId(item?.id);
    setUsageSheetOpen(true);
  };

  const openAdjustment = (item?: InventoryItem) => {
    setAdjustmentItemId(item?.id);
    setAdjustmentSheetOpen(true);
  };

  return (
    <div className="min-h-[100dvh] bg-canvas pb-20">
      <PageHeader
        title={t("inventory.title")}
        subtitle={t("inventory.subtitle")}
        backHref="/more"
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPurchase()}
              disabled={inventory.length === 0}
              className="flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-[12px] font-semibold text-ink shadow-sm disabled:opacity-40"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-brand-600" />
              <span>{t("inventory.recordPurchase")}</span>
            </button>
            <button
              type="button"
              onClick={openNewProduct}
              className="flex h-9 items-center gap-1 rounded-full bg-brand-600 px-3 text-[12px] font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{t("common.add")}</span>
            </button>
          </div>
        }
      />

      <main className="app-container space-y-4 py-4">
        {/* Executive KPI Dashboard */}
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-line/60">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Package className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-ink">{t("inventory.stockOnHand")}</h2>
                <p className="text-[11px] text-ink-muted">{t("inventory.valuedAtCost")}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-black tracking-tight text-ink">
                {formatINR(stats.totalStockValuePaise)}
              </p>
              <p className="text-[10.5px] font-medium text-ink-muted">
                {stats.totalActiveProducts} {t("inventory.activeProducts")}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatCard
              label={t("inventory.lowStock")}
              value={String(stats.lowStockCount)}
              hint={stats.lowStockCount > 0 ? t("inventory.restockNeeded") : t("inventory.sufficient")}
              tone={stats.lowStockCount > 0 ? "amber" : "positive"}
            />
            <StatCard
              label={t("inventory.outOfStock")}
              value={String(stats.outOfStockCount)}
              hint={stats.outOfStockCount > 0 ? t("inventory.zeroBalance") : t("inventory.sufficient")}
              tone={stats.outOfStockCount > 0 ? "negative" : "positive"}
            />
            <StatCard
              label={t("reminders.upcoming")}
              value={String(stats.expiringCount)}
              hint={stats.expiringCount > 0 ? "Within 30 days" : t("inventory.fresh")}
              tone={stats.expiringCount > 0 ? "amber" : "neutral"}
            />
          </div>

          {stats.totalPendingSupplierPaise > 0 && (
            <div className="mt-2.5 flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-[11.5px]">
              <span className="text-ink-secondary flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-amber" />
                {t("inventory.unpaidDealerBalance")}:
              </span>
              <span className="font-bold text-amber">
                {formatINR(stats.totalPendingSupplierPaise)}
              </span>
            </div>
          )}
        </section>

        {/* Alerts Strip (Low stock & Expiry) */}
        {(lowList.length > 0 || expiringList.length > 0) && (
          <section className="space-y-2">
            {lowList.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-amber/30 bg-amber-light/50 px-3.5 py-2.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber shrink-0" />
                  <span className="font-medium text-ink">
                    {lowList.length} items low: {lowList.map((i) => i.itemName).slice(0, 2).join(", ")}
                    {lowList.length > 2 ? ` +${lowList.length - 2} more` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openPurchase()}
                  className="shrink-0 font-bold text-brand-700 hover:underline"
                >
                  {t("inventory.restock")}
                </button>
              </div>
            )}

            {expiringList.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-negative/30 bg-negative-light/40 px-3.5 py-2.5 text-[12px]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-negative shrink-0" />
                  <span className="font-medium text-ink">
                    {expiringList.length} products expiring soon (e.g. {expiringList[0]?.itemName})
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-white p-1 shadow-sm text-[12px] font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("PRODUCTS")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition shrink-0 ${
              activeTab === "PRODUCTS"
                ? "bg-brand-600 text-white font-semibold"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>{t("inventory.products")} ({filteredItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PURCHASES")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition shrink-0 ${
              activeTab === "PURCHASES"
                ? "bg-brand-600 text-white font-semibold"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{t("inventory.purchases")} ({allPurchases.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("USAGE")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition shrink-0 ${
              activeTab === "USAGE"
                ? "bg-brand-600 text-white font-semibold"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <Sprout className="h-4 w-4" />
            <span>{t("inventory.usage")} ({allUsages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("AUDIT")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition shrink-0 ${
              activeTab === "AUDIT"
                ? "bg-brand-600 text-white font-semibold"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <History className="h-4 w-4" />
            <span>{t("inventory.audit")} ({allAdjustments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("REPORTS")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition shrink-0 ${
              activeTab === "REPORTS"
                ? "bg-brand-600 text-white font-semibold"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Reports</span>
          </button>
        </div>

        {/* Tab 1: PRODUCTS LIST */}
        {activeTab === "PRODUCTS" && (
          <div className="space-y-3">
            {/* Search and Category Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands, godown…"
                  className="input pl-10"
                />
              </div>

              {categories.length > 2 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition shrink-0 ${
                          active
                            ? "bg-ink text-white"
                            : "border border-line bg-white text-ink-secondary hover:bg-canvas"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <EmptyState
                icon={<Package className="h-6 w-6" />}
                title={inventory.length === 0 ? "No Stock Registered" : "No Matching Products"}
                message={
                  inventory.length === 0
                    ? "Add seeds, fertilizers, pesticides, or fuel to track remaining quantities and crop costs."
                    : "Try adjusting your search query or category filter."
                }
                actionLabel={inventory.length === 0 ? "Register First Product" : undefined}
                onAction={inventory.length === 0 ? openNewProduct : undefined}
              />
            ) : (
              <div className="space-y-2.5">
                {filteredItems.map((item) => {
                  const val = inventoryItemValuation(item);
                  const avgPrice = averagePurchasePricePaise(item);
                  const isOut = item.remainingQuantity <= 0;
                  const isLow = !isOut && item.remainingQuantity <= item.minQuantity;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className="group cursor-pointer rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-brand-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-[14px] font-bold text-ink">
                              {item.itemName}
                            </h3>
                            <StatusPill label={item.category} tone="neutral" />
                            {isOut ? (
                              <StatusPill label="Out of stock" tone="negative" dot />
                            ) : isLow ? (
                              <StatusPill label="Low stock" tone="amber" dot />
                            ) : null}
                          </div>

                          <p className="mt-0.5 text-[11.5px] text-ink-muted">
                            {item.brand ? `${item.brand} · ` : ""}
                            {formatINR(avgPrice)} per {item.unit}
                            {item.storageLocation ? ` · ${item.storageLocation}` : ""}
                          </p>

                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-[17px] font-extrabold text-ink">
                              {formatNumber(item.remainingQuantity)} {item.unit}
                            </span>
                            <span className="text-[11.5px] text-ink-muted">
                              of {formatNumber(item.quantity)} {item.unit}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[14px] font-bold text-ink">{formatINR(val)}</p>
                          <p className="text-[10px] text-ink-muted">Stock value</p>
                        </div>
                      </div>

                      {/* Quick action buttons row */}
                      <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5 text-[11px]">
                        <span className="text-ink-muted group-hover:text-brand-700">
                          Tap to view full details →
                        </span>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openUsage(item)}
                            disabled={isOut}
                            className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 font-semibold text-ink-secondary hover:text-ink disabled:opacity-40"
                          >
                            <MinusCircle className="h-3 w-3 text-brand-600" />
                            <span>Use</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPurchase(item)}
                            className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 font-semibold text-ink-secondary hover:text-ink"
                          >
                            <PlusCircle className="h-3 w-3 text-positive" />
                            <span>Buy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAdjustment(item)}
                            className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 font-semibold text-ink-secondary hover:text-ink"
                          >
                            <Sliders className="h-3 w-3 text-amber" />
                            <span>Adjust</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: PURCHASES LOG */}
        {activeTab === "PURCHASES" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink">Stock Purchase Invoices</h3>
              <button
                type="button"
                onClick={() => openPurchase()}
                className="flex items-center gap-1 text-[12px] font-bold text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Purchase</span>
              </button>
            </div>

            {allPurchases.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="h-6 w-6" />}
                title="No Purchases Recorded"
                message="Stock purchases from dealers will appear here along with invoices and payment details."
                actionLabel={inventory.length > 0 ? "Record Stock Purchase" : undefined}
                onAction={inventory.length > 0 ? () => openPurchase() : undefined}
              />
            ) : (
              <div className="space-y-2.5">
                {allPurchases.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-line bg-white p-3.5 shadow-sm text-[12px] space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-ink text-[13px]">
                          {p.itemName} ({p.quantity} {p.unit})
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Supplier: <strong>{p.supplierName}</strong> · Bought {formatDate(p.purchaseDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-[13px] text-ink">
                          {formatINR(p.totalCostPaise)}
                        </p>
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

                    <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-ink-secondary">
                      <span>
                        Paid: <strong>{formatINR(p.paidPaise)}</strong> via {p.paymentMethod || "Cash"}
                        {p.pendingPaise > 0 ? ` · Unpaid Udhar: ${formatINR(p.pendingPaise)}` : ""}
                      </span>
                      {p.invoiceNumber && <span>Bill #{p.invoiceNumber}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: USAGE LOG */}
        {activeTab === "USAGE" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink">Field Material Consumption</h3>
              <button
                type="button"
                onClick={() => openUsage()}
                className="flex items-center gap-1 text-[12px] font-bold text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record Usage</span>
              </button>
            </div>

            {allUsages.length === 0 ? (
              <EmptyState
                icon={<Sprout className="h-6 w-6" />}
                title="No Stock Consumed Yet"
                message="Stock applied to crops (fertilizers, seeds, sprays) will appear here with cost attribution."
                actionLabel={inventory.length > 0 ? "Record Stock Usage" : undefined}
                onAction={inventory.length > 0 ? () => openUsage() : undefined}
              />
            ) : (
              <div className="space-y-2.5">
                {allUsages.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-line bg-white p-3.5 shadow-sm text-[12px] space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-ink text-[13px]">
                          {u.quantityUsed} {u.unit} of {u.itemName}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Applied on {formatDate(u.usageDate)} · {u.activity || "Application"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brand-700 text-[13px]">
                          {formatINR(u.costPaise)}
                        </p>
                        <p className="text-[10px] text-ink-muted">Material cost</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-line/60 pt-1.5 text-[11px] text-ink-secondary">
                      <span className="flex items-center gap-1 font-medium text-ink">
                        <Sprout className="h-3.5 w-3.5 text-brand-600" />
                        {u.cropName ? `Crop: ${u.cropName}` : "General Farm"}
                        {u.landName ? ` · ${u.landName}` : ""}
                      </span>
                      {u.notes && <span className="truncate max-w-[120px] text-ink-muted">{u.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: AUDIT LOG */}
        {activeTab === "AUDIT" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink">Stock Adjustments & Damage Audit</h3>
              <button
                type="button"
                onClick={() => openAdjustment()}
                className="flex items-center gap-1 text-[12px] font-bold text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Adjustment</span>
              </button>
            </div>

            {allAdjustments.length === 0 ? (
              <EmptyState
                icon={<History className="h-6 w-6" />}
                title="Audit Trail Clean"
                message="Damaged stock, physical count corrections, and godown transfers will be logged here."
              />
            ) : (
              <div className="space-y-2.5">
                {allAdjustments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-line bg-white p-3.5 shadow-sm text-[12px] space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-ink text-[13px]">
                          {a.type} · {a.itemName}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          {formatDate(a.date)} · Reason: {a.reason}
                        </p>
                      </div>
                      <span
                        className={`font-black text-[13px] ${
                          a.quantityDelta < 0 ? "text-negative" : "text-positive"
                        }`}
                      >
                        {a.quantityDelta > 0 ? `+${a.quantityDelta}` : a.quantityDelta} {a.unit}
                      </span>
                    </div>

                    {(a.locationFrom || a.locationTo || a.notes) && (
                      <div className="border-t border-line/60 pt-1.5 text-[11px] text-ink-secondary">
                        {a.locationFrom && `From: ${a.locationFrom} `}
                        {a.locationTo && `To: ${a.locationTo} `}
                        {a.notes && `· Notes: ${a.notes}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: REPORTS */}
        {activeTab === "REPORTS" && (
          <div className="space-y-3.5">
            {/* Sub-report selector buttons */}
            <div className="grid grid-cols-2 gap-2 text-[11.5px] font-semibold">
              <button
                type="button"
                onClick={() => setReportType("VALUATION")}
                className={`p-2.5 rounded-xl border text-left transition ${
                  reportType === "VALUATION"
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-line bg-white text-ink hover:bg-canvas"
                }`}
              >
                Stock Valuation
              </button>
              <button
                type="button"
                onClick={() => setReportType("CROP_CONSUMPTION")}
                className={`p-2.5 rounded-xl border text-left transition ${
                  reportType === "CROP_CONSUMPTION"
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-line bg-white text-ink hover:bg-canvas"
                }`}
              >
                Crop Material Cost
              </button>
              <button
                type="button"
                onClick={() => setReportType("SUPPLIER")}
                className={`p-2.5 rounded-xl border text-left transition ${
                  reportType === "SUPPLIER"
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-line bg-white text-ink hover:bg-canvas"
                }`}
              >
                Supplier Purchases
              </button>
              <button
                type="button"
                onClick={() => setReportType("EXPIRING_DAMAGED")}
                className={`p-2.5 rounded-xl border text-left transition ${
                  reportType === "EXPIRING_DAMAGED"
                    ? "border-brand-600 bg-brand-50 text-brand-900"
                    : "border-line bg-white text-ink hover:bg-canvas"
                }`}
              >
                Expiring & Damage
              </button>
            </div>

            {/* Report 1: Valuation */}
            {reportType === "VALUATION" && (
              <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-line/70">
                  <h4 className="font-bold text-ink text-[13px]">Category-wise Stock Valuation</h4>
                  <span className="font-extrabold text-brand-700">
                    {formatINR(stats.totalStockValuePaise)}
                  </span>
                </div>
                <div className="space-y-2">
                  {stats.stockByCategory.map((cat) => (
                    <div key={cat.category} className="flex justify-between items-center text-[12px]">
                      <span className="text-ink-secondary">
                        {cat.category} ({cat.productCount} products)
                      </span>
                      <span className="font-semibold text-ink">
                        {formatINR(cat.totalValuePaise)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report 2: Crop Consumption */}
            {reportType === "CROP_CONSUMPTION" && (
              <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
                <h4 className="font-bold text-ink text-[13px] pb-2 border-b border-line/70">
                  Crop Material Consumption
                </h4>
                {cropConsumptionSummary.length === 0 ? (
                  <p className="text-center text-ink-muted text-[12px] py-4">
                    No crops have consumed stock from inventory yet.
                  </p>
                ) : (
                  cropConsumptionSummary.map(({ crop, materialCost, usedItems }) => (
                    <div key={crop.id} className="rounded-xl border border-line bg-canvas/40 p-3 space-y-1.5 text-[12px]">
                      <div className="flex justify-between items-center font-bold text-ink">
                        <span>{crop.name} ({crop.season})</span>
                        <span className="text-brand-700">{formatINR(materialCost)}</span>
                      </div>
                      <div className="space-y-1 pt-1 text-[11px] text-ink-secondary border-t border-line/60">
                        {usedItems.map((u, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{u.qty} {u.unit} {u.itemName}</span>
                            <span>{formatINR(u.costPaise)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Report 3: Supplier */}
            {reportType === "SUPPLIER" && (
              <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
                <h4 className="font-bold text-ink text-[13px] pb-2 border-b border-line/70">
                  Supplier-wise Purchase Ledger
                </h4>
                {supplierPurchasesSummary.length === 0 ? (
                  <p className="text-center text-ink-muted text-[12px] py-4">
                    No supplier purchase records found.
                  </p>
                ) : (
                  supplierPurchasesSummary.map((s) => (
                    <div key={s.supplier} className="rounded-xl border border-line bg-canvas/40 p-3 space-y-1 text-[12px]">
                      <div className="flex justify-between font-bold text-ink">
                        <span>{s.supplier} ({s.count} purchases)</span>
                        <span>{formatINR(s.totalSpendPaise)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-ink-secondary">
                        <span>Paid: {formatINR(s.paidPaise)}</span>
                        {s.pendingPaise > 0 && (
                          <span className="text-amber font-semibold">
                            Pending: {formatINR(s.pendingPaise)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Report 4: Expiring & Damaged */}
            {reportType === "EXPIRING_DAMAGED" && (
              <div className="rounded-2xl border border-line bg-white p-4 space-y-3 text-[12px]">
                <h4 className="font-bold text-ink text-[13px] pb-2 border-b border-line/70">
                  Expiring & Damaged Stock Report
                </h4>
                <div className="space-y-2">
                  <h5 className="font-semibold text-ink text-[12px]">Expiring Products:</h5>
                  {expiringList.length === 0 ? (
                    <p className="text-ink-muted text-[11.5px]">No products expiring in next 30 days.</p>
                  ) : (
                    expiringList.map((item) => (
                      <div key={item.id} className="flex justify-between text-ink-secondary">
                        <span>{item.itemName} ({item.remainingQuantity} {item.unit})</span>
                        <span className="font-semibold text-negative">
                          Expires {formatDate(item.expiryDate!)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-line/60">
                  <h5 className="font-semibold text-ink text-[12px]">Damaged & Expired Discard History:</h5>
                  {allAdjustments.filter((a) => a.type === "DAMAGED" || a.type === "EXPIRED").length === 0 ? (
                    <p className="text-ink-muted text-[11.5px]">No damage or expired losses recorded.</p>
                  ) : (
                    allAdjustments
                      .filter((a) => a.type === "DAMAGED" || a.type === "EXPIRED")
                      .map((a) => (
                        <div key={a.id} className="flex justify-between text-ink-secondary">
                          <span>
                            {a.itemName} ({a.reason}) · {formatDate(a.date)}
                          </span>
                          <span className="font-semibold text-negative">
                            {a.quantityDelta} {a.unit}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sheets */}
      <InventorySheet
        open={productSheetOpen}
        onClose={() => {
          setProductSheetOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
      />

      <StockPurchaseSheet
        open={purchaseSheetOpen}
        onClose={() => setPurchaseSheetOpen(false)}
        defaultItemId={purchaseItemId}
      />

      <StockUsageSheet
        open={usageSheetOpen}
        onClose={() => setUsageSheetOpen(false)}
        defaultItemId={usageItemId}
      />

      <StockAdjustmentSheet
        open={adjustmentSheetOpen}
        onClose={() => setAdjustmentSheetOpen(false)}
        defaultItemId={adjustmentItemId}
      />

      <InventoryDetailSheet
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        item={detailItem}
        onEdit={(it) => {
          setEditingItem(it);
          setProductSheetOpen(true);
        }}
        onBuy={(it) => openPurchase(it)}
        onUse={(it) => openUsage(it)}
        onAdjust={(it) => openAdjustment(it)}
      />
    </div>
  );
}
