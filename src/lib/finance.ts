import {
  FARM_INCOME_CATEGORIES,
  FARM_CATEGORIES,
  HOME_CATEGORIES,
  VEHICLE_CATEGORIES,
} from "./constants";
import { addDays, inRange, monthKey, parseISODate, todayISO } from "./dates";
import { sumPaise } from "./money";
import type {
  BaseRecord,
  Crop,
  CropSale,
  DateRange,
  ExpenseGroup,
  ISODate,
  LabourPayment,
  Land,
  Loan,
  LoanStatus,
  PaymentMethod,
  Reminder,
  Transaction,
  Vehicle,
  FamilyMember,
  InventoryItem,
  InventoryPurchase,
  InventoryUsage,
  InventoryAdjustment,
  StockAdjustmentType,
  UnifiedFinancialMetrics,
  ReconciliationIssue,
  UnifiedActivityItem,
} from "./types";

const alive = <T extends BaseRecord>(records: T[]): T[] =>
  records.filter((record) => !record.deletedAt);

export const isOpeningBalance = (transaction: Transaction): boolean =>
  transaction.isOpeningBalance === true ||
  transaction.source === "opening_balance" ||
  transaction.category === "Opening Balance";

export const isReceivedIncome = (transaction: Transaction): boolean =>
  transaction.kind === "INCOME" &&
  (transaction.incomeStatus ?? "RECEIVED") === "RECEIVED" &&
  !isOpeningBalance(transaction);

export const isPendingIncome = (transaction: Transaction): boolean =>
  transaction.kind === "INCOME" &&
  transaction.incomeStatus === "PENDING" &&
  !isOpeningBalance(transaction);

export const isExpense = (transaction: Transaction): boolean =>
  transaction.kind === "EXPENSE";

/**
 * Paid labour belongs to the date it was actually paid, matching its linked
 * cash expense. Pending labour has no payment date yet, so it is reported on
 * the work date it belongs to.
 */
export const labourReportDate = (payment: LabourPayment): string =>
  payment.status === "PAID"
    ? payment.paidDate ?? payment.paymentDate
    : payment.paymentDate;

function scoped(transactions: Transaction[], range?: DateRange): Transaction[] {
  const rows = alive(transactions);
  return range ? rows.filter((row) => inRange(row.date, range)) : rows;
}

export interface Totals {
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  pendingIncomePaise: number;
  count: number;
}

export function calculateTotals(
  transactions: Transaction[],
  rangeOrSales?: DateRange | CropSale[],
  maybeRange?: DateRange
): Totals {
  const cropSales = Array.isArray(rangeOrSales) ? rangeOrSales : undefined;
  const range = Array.isArray(rangeOrSales)
    ? maybeRange
    : (rangeOrSales as DateRange | undefined) ?? maybeRange;

  const rows = scoped(transactions, range);
  const incomePaise = sumPaise(
    rows.filter(isReceivedIncome).map((row) => row.amountPaise)
  );
  const expensePaise = sumPaise(rows.filter(isExpense).map((row) => row.amountPaise));
  let pendingIncomePaise = sumPaise(
    rows.filter(isPendingIncome).map((row) => row.amountPaise)
  );

  if (cropSales) {
    const aliveSales = alive(cropSales).filter((s) => !range || inRange(s.saleDate, range));
    pendingIncomePaise += sumPaise(aliveSales.map((s) => s.pendingPaise));
  }

  return {
    incomePaise,
    expensePaise,
    netPaise: incomePaise - expensePaise,
    pendingIncomePaise,
    count: rows.length,
  };
}

/** Balance is cash-basis: received money in (including opening balance) minus paid money out. */
export function availableBalance(transactions: Transaction[]): number {
  const aliveTxs = alive(transactions);
  const incomePaise = sumPaise(
    aliveTxs.filter(isReceivedIncome).map((row) => row.amountPaise)
  );
  const openingPaise = sumPaise(
    aliveTxs.filter(isOpeningBalance).map((row) => row.amountPaise)
  );
  const expensePaise = sumPaise(
    aliveTxs.filter(isExpense).map((row) => row.amountPaise)
  );
  return incomePaise + openingPaise - expensePaise;
}

/** Historical closing cash balance strictly up to a specific date. */
export function closingBalanceAsOf(
  transactions: Transaction[],
  asOfDate: ISODate,
  cropSales?: CropSale[]
): number {
  const rows = alive(transactions).filter((row) => row.date <= asOfDate);
  const incomePaise = sumPaise(
    rows.filter(isReceivedIncome).map((row) => row.amountPaise)
  );
  const openingPaise = sumPaise(
    rows.filter(isOpeningBalance).map((row) => row.amountPaise)
  );
  const expensePaise = sumPaise(
    rows.filter(isExpense).map((row) => row.amountPaise)
  );

  let extraReceived = 0;
  if (cropSales) {
    const aliveSales = alive(cropSales).filter(
      (s) =>
        s.saleDate <= asOfDate &&
        !rows.some((t) => t.notes?.includes(`[cropsale:${s.id}]`))
    );
    extraReceived = sumPaise(aliveSales.map((s) => s.receivedPaise || 0));
  }

  return incomePaise + openingPaise + extraReceived - expensePaise;
}

export interface ExpenseBreakdown {
  homePaise: number;
  farmPaise: number;
  labourPaise: number;
  vehiclePaise: number;
  financingPaise: number;
  otherPaise: number;
  totalPaise: number;
}

export function expenseBreakdown(
  transactions: Transaction[],
  range?: DateRange
): ExpenseBreakdown {
  const rows = scoped(transactions, range).filter(isExpense);
  let homePaise = 0;
  let farmPaise = 0;
  let labourPaise = 0;
  let vehiclePaise = 0;
  let financingPaise = 0;
  let otherPaise = 0;

  for (const row of rows) {
    const catLower = (row.category || "").toLowerCase();
    const isFinancing =
      catLower.includes("interest") ||
      catLower === "emi" ||
      catLower.includes("loan payment") ||
      catLower.includes("financing");

    if (row.group === "HOME") {
      homePaise += row.amountPaise;
    } else if (row.group === "VEHICLE") {
      vehiclePaise += row.amountPaise;
    } else if (row.group === "FARM") {
      if (row.category === "Labour") labourPaise += row.amountPaise;
      else farmPaise += row.amountPaise;
    } else if (isFinancing) {
      financingPaise += row.amountPaise;
    } else {
      otherPaise += row.amountPaise;
    }
  }

  return {
    homePaise,
    farmPaise,
    labourPaise,
    vehiclePaise,
    financingPaise,
    otherPaise,
    totalPaise: homePaise + farmPaise + labourPaise + vehiclePaise + financingPaise + otherPaise,
  };
}

export interface CategoryTotal {
  category: string;
  amountPaise: number;
  count: number;
}

export function categoryTotals(
  transactions: Transaction[],
  filter: { kind: "INCOME" | "EXPENSE"; group?: ExpenseGroup; range?: DateRange }
): CategoryTotal[] {
  const rows = scoped(transactions, filter.range).filter((row) => row.kind === filter.kind);
  const map = new Map<string, CategoryTotal>();
  for (const row of rows) {
    if (filter.group && row.group !== filter.group) continue;
    const current = map.get(row.category) ?? {
      category: row.category,
      amountPaise: 0,
      count: 0,
    };
    current.amountPaise += row.amountPaise;
    current.count += 1;
    map.set(row.category, current);
  }
  return [...map.values()].sort((a, b) => b.amountPaise - a.amountPaise);
}

export function expenseCategoryTotals(
  transactions: Transaction[],
  group: ExpenseGroup,
  range?: DateRange
): CategoryTotal[] {
  return categoryTotals(transactions, { kind: "EXPENSE", group, range });
}

export function incomeCategoryTotals(
  transactions: Transaction[],
  range?: DateRange
): CategoryTotal[] {
  const rows = scoped(transactions, range).filter(isReceivedIncome);
  const map = new Map<string, CategoryTotal>();
  for (const row of rows) {
    const current = map.get(row.category) ?? {
      category: row.category,
      amountPaise: 0,
      count: 0,
    };
    current.amountPaise += row.amountPaise;
    current.count += 1;
    map.set(row.category, current);
  }
  return [...map.values()].sort((a, b) => b.amountPaise - a.amountPaise);
}

export function pendingIncomeTotal(transactions: Transaction[]): number {
  return sumPaise(alive(transactions).filter(isPendingIncome).map((row) => row.amountPaise));
}

export interface IncomeCategoryDetail {
  category: string;
  group: "FARM" | "HOME";
  receivedPaise: number;
  pendingPaise: number;
  totalPaise: number;
  count: number;
}

export interface IncomeOverview {
  totalIncomePaise: number;
  receivedPaise: number;
  pendingPaise: number;
  farmReceivedPaise: number;
  farmPendingPaise: number;
  farmTotalPaise: number;
  householdReceivedPaise: number;
  householdPendingPaise: number;
  householdTotalPaise: number;
  categories: IncomeCategoryDetail[];
}

export function incomeOverview(
  transactions: Transaction[],
  cropSales?: CropSale[],
  range?: DateRange
): IncomeOverview {
  const scopedTx = scoped(transactions, range).filter((t) => t.kind === "INCOME");
  const scopedSales = cropSales
    ? alive(cropSales).filter((s) => !range || inRange(s.saleDate, range))
    : [];

  const catMap = new Map<string, { receivedPaise: number; pendingPaise: number; count: number; group: "FARM" | "HOME" }>();

  // Helper to get or init category
  const getCat = (catName: string, defaultGroup?: "FARM" | "HOME") => {
    let entry = catMap.get(catName);
    if (!entry) {
      const group = defaultGroup ?? (isFarmIncomeCategory(catName) ? "FARM" : "HOME");
      entry = { receivedPaise: 0, pendingPaise: 0, count: 0, group };
      catMap.set(catName, entry);
    }
    return entry;
  };

  // If cropSales are present, handle "Crop Sales" specially to ensure pending sales from cropSales are tracked without duplicates
  if (cropSales && scopedSales.length > 0) {
    const cropCat = getCat("Crop Sales", "FARM");
    cropCat.receivedPaise += sumPaise(scopedSales.map((s) => s.receivedPaise));
    cropCat.pendingPaise += sumPaise(scopedSales.map((s) => s.pendingPaise));
    cropCat.count += scopedSales.length;
  }

  // Process transactions
  for (const t of scopedTx) {
    // If it's a linked cropsale transaction and we already processed cropSales, do not double-count in Crop Sales category
    const isLinkedSale = !!t.notes?.includes("[cropsale:");
    if (cropSales && isLinkedSale) {
      continue;
    }

    const cat = getCat(t.category, t.group === "FARM" ? "FARM" : undefined);
    cat.count += 1;
    if (isReceivedIncome(t)) {
      cat.receivedPaise += t.amountPaise;
      if (t.pendingAmountPaise && t.pendingAmountPaise > 0) {
        cat.pendingPaise += t.pendingAmountPaise;
      }
    } else if (isPendingIncome(t)) {
      cat.pendingPaise += t.amountPaise;
    }
  }

  const categoryList: IncomeCategoryDetail[] = [...catMap.entries()].map(([category, data]) => ({
    category,
    group: data.group,
    receivedPaise: data.receivedPaise,
    pendingPaise: data.pendingPaise,
    totalPaise: data.receivedPaise + data.pendingPaise,
    count: data.count,
  })).sort((a, b) => b.totalPaise - a.totalPaise);

  let farmReceivedPaise = 0;
  let farmPendingPaise = 0;
  let householdReceivedPaise = 0;
  let householdPendingPaise = 0;

  for (const c of categoryList) {
    if (c.group === "FARM") {
      farmReceivedPaise += c.receivedPaise;
      farmPendingPaise += c.pendingPaise;
    } else {
      householdReceivedPaise += c.receivedPaise;
      householdPendingPaise += c.pendingPaise;
    }
  }

  const receivedPaise = farmReceivedPaise + householdReceivedPaise;
  const pendingPaise = farmPendingPaise + householdPendingPaise;
  const totalIncomePaise = receivedPaise + pendingPaise;

  return {
    totalIncomePaise,
    receivedPaise,
    pendingPaise,
    farmReceivedPaise,
    farmPendingPaise,
    farmTotalPaise: farmReceivedPaise + farmPendingPaise,
    householdReceivedPaise,
    householdPendingPaise,
    householdTotalPaise: householdReceivedPaise + householdPendingPaise,
    categories: categoryList,
  };
}

export interface CropFinancials {
  cropId: string;
  areaAcres: number;
  categories: Record<string, number>;
  seedCostPaise: number;
  fertilizerCostPaise: number;
  pesticideCostPaise: number;
  materialCostPaise: number;
  labourCostPaise: number;
  machineryCostPaise: number;
  totalMachineryCostPaise: number;
  irrigationCostPaise: number;
  otherCostPaise: number;
  totalOtherCostPaise: number;
  totalInvestmentPaise: number;
  totalExpensesPaise: number;
  cashExpensesPaise: number;
  salesRevenuePaise: number;
  receivedRevenuePaise: number;
  pendingRevenuePaise: number;
  totalIncomePaise: number;
  pendingIncomePaise: number;
  profitPaise: number;
  cashProfitPaise: number;
  labourTotalPaise: number;
  labourPaidPaise: number;
  labourPendingPaise: number;
  costPerAcrePaise: number;
  revenuePerAcrePaise: number;
  profitPerAcrePaise: number;
  harvestedQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  quantityUnit: string;
}

export const CROP_CATEGORY_KEYS = [
  "Seeds",
  "Fertilizers",
  "Pesticides",
  "Irrigation",
  "Machinery",
  "Fuel",
  "Labour",
  "Transportation",
  "Other",
] as const;

export function cropCategoryKey(category: string): string {
  const lower = category.trim().toLowerCase();
  if (lower === "seeds" || lower === "seed" || lower === "seed cost") return "Seeds";
  if (lower === "fertilizers" || lower === "fertilizer" || lower === "fertilizer cost") return "Fertilizers";
  if (lower === "pesticides" || lower === "pesticide" || lower === "pesticide cost") return "Pesticides";
  if (
    lower === "irrigation" ||
    lower === "irrigation cost" ||
    lower === "water and irrigation" ||
    lower === "water & irrigation"
  ) {
    return "Irrigation";
  }
  if (
    lower === "machinery" ||
    lower === "machinery cost" ||
    lower === "machine" ||
    lower === "tractor" ||
    lower === "tractor rental" ||
    lower === "land preparation"
  ) {
    return "Machinery";
  }
  if (lower === "fuel" || lower === "diesel") return "Fuel";
  if (lower === "labour" || lower === "labor" || lower === "labour cost") return "Labour";
  if (lower === "transportation" || lower === "transport") return "Transportation";
  if (lower === "harvesting") return "Other";
  if (lower === "other farm expenses" || lower === "other") return "Other";
  return (CROP_CATEGORY_KEYS as readonly string[]).includes(category as (typeof CROP_CATEGORY_KEYS)[number])
    ? category
    : "Other";
}

/**
 * Crop profit uses all recorded labour cost (paid + pending) while the cash
 * dashboard only counts expenses that have actually been paid.
 */
export function cropFinancials(
  crop: Crop,
  transactions: Transaction[],
  labourPayments: LabourPayment[],
  cropSalesOrRange?: CropSale[] | DateRange,
  maybeRange?: DateRange,
  inventoryItems?: InventoryItem[]
): CropFinancials {
  const cropSales = Array.isArray(cropSalesOrRange) ? cropSalesOrRange : undefined;
  const range = Array.isArray(cropSalesOrRange)
    ? maybeRange
    : (cropSalesOrRange as DateRange | undefined) ?? maybeRange;

  const cropTransactions = alive(transactions).filter(
    (row) => row.cropId === crop.id && (!range || inRange(row.date, range))
  );
  const expenses = cropTransactions.filter(isExpense);
  const manualLabour = expenses.filter(
    (row) => !row.labourPaymentId && row.category === "Labour"
  );
  const otherExpenses = expenses.filter(
    (row) => !row.labourPaymentId && row.category !== "Labour"
  );

  const cropLabour = alive(labourPayments).filter(
    (row) => row.cropId === crop.id && (!range || inRange(labourReportDate(row), range))
  );
  const labourPaidPaise = sumPaise(
    cropLabour.map((row) =>
      row.status === "PAID"
        ? (row.paidPaise ?? row.amountPaise)
        : (row.paidPaise ?? 0)
    )
  );
  const labourPendingPaise = sumPaise(
    cropLabour.map((row) =>
      row.status === "PENDING"
        ? (row.remainingPaise ?? row.amountPaise)
        : row.status === "PARTIAL"
        ? (row.remainingPaise ?? Math.max(0, row.amountPaise - (row.paidPaise ?? 0)))
        : 0
    )
  );
  const manualLabourPaise = sumPaise(manualLabour.map((row) => row.amountPaise));
  const labourTotalPaise = labourPaidPaise + labourPendingPaise + manualLabourPaise;

  const categories: Record<string, number> = Object.fromEntries(
    CROP_CATEGORY_KEYS.map((key) => [key, 0])
  );
  for (const row of otherExpenses) {
    const key = cropCategoryKey(row.category);
    categories[key] = (categories[key] ?? 0) + row.amountPaise;
  }
  categories.Labour = (categories.Labour ?? 0) + labourTotalPaise;

  // Inventory usage material cost attributed to this crop
  let inventorySeedCostPaise = 0;
  let inventoryFertilizerCostPaise = 0;
  let inventoryPesticideCostPaise = 0;
  let inventoryOtherCostPaise = 0;

  if (inventoryItems && inventoryItems.length > 0) {
    for (const item of alive(inventoryItems)) {
      for (const usage of item.usageHistory ?? []) {
        if (usage.cropId === crop.id && (!range || inRange(usage.usageDate, range))) {
          const cat = (item.category || "").toLowerCase();
          if (cat.includes("seed")) {
            inventorySeedCostPaise += usage.costPaise;
          } else if (cat.includes("fertiliz")) {
            inventoryFertilizerCostPaise += usage.costPaise;
          } else if (cat.includes("pesticide") || cat.includes("protection")) {
            inventoryPesticideCostPaise += usage.costPaise;
          } else {
            inventoryOtherCostPaise += usage.costPaise;
          }
        }
      }
    }
  }

  const seedCostPaise = (categories.Seeds ?? 0) + inventorySeedCostPaise;
  const fertilizerCostPaise = (categories.Fertilizers ?? 0) + inventoryFertilizerCostPaise;
  const pesticideCostPaise = (categories.Pesticides ?? 0) + inventoryPesticideCostPaise;
  const materialCostPaise = seedCostPaise + fertilizerCostPaise + pesticideCostPaise;

  const labourCostPaise = labourTotalPaise;
  const machineryCostPaise = (categories.Machinery ?? 0) + (categories.Fuel ?? 0);
  const irrigationCostPaise = categories.Irrigation ?? 0;
  const otherCostPaise =
    (categories.Other ?? 0) + (categories.Transportation ?? 0) + inventoryOtherCostPaise;

  const totalInvestmentPaise =
    materialCostPaise + labourCostPaise + machineryCostPaise + irrigationCostPaise + otherCostPaise;
  const totalExpensesPaise = totalInvestmentPaise;
  const cashExpensesPaise = sumPaise(expenses.map((row) => row.amountPaise));

  // Sales & Income calculation
  const relevantSales = cropSales
    ? alive(cropSales).filter(
        (s) => s.cropId === crop.id && (!range || inRange(s.saleDate, range))
      )
    : [];

  const saleTotalPaise = sumPaise(
    relevantSales.map((s) => s.netAmountPaise ?? s.totalAmountPaise)
  );
  const saleReceivedPaise = sumPaise(relevantSales.map((s) => s.receivedPaise));
  const salePendingPaise = sumPaise(relevantSales.map((s) => s.pendingPaise));

  const manualIncome = cropTransactions.filter(
    (row) => !row.notes?.includes("[cropsale:") && row.kind === "INCOME"
  );
  const manualIncomeReceived = sumPaise(
    manualIncome.filter(isReceivedIncome).map((row) => row.amountPaise)
  );
  const manualIncomePending = sumPaise(
    manualIncome.filter(isPendingIncome).map((row) => row.amountPaise)
  );

  const salesRevenuePaise = saleTotalPaise + manualIncomeReceived + manualIncomePending;
  const receivedRevenuePaise = saleReceivedPaise + manualIncomeReceived;
  const pendingRevenuePaise = salePendingPaise + manualIncomePending;

  const profitPaise = salesRevenuePaise - totalInvestmentPaise;
  const cashProfitPaise = receivedRevenuePaise - cashExpensesPaise;

  const areaAcres = crop.areaAcres > 0 ? crop.areaAcres : 0;
  const costPerAcrePaise = areaAcres > 0 ? Math.round(totalInvestmentPaise / areaAcres) : 0;
  const revenuePerAcrePaise = areaAcres > 0 ? Math.round(salesRevenuePaise / areaAcres) : 0;
  const profitPerAcrePaise = areaAcres > 0 ? Math.round(profitPaise / areaAcres) : 0;

  const harvestedQuantity = relevantSales.reduce(
    (max, s) => Math.max(max, s.harvestedQuantity || 0),
    0
  );
  const soldQuantity = relevantSales.reduce((sum, s) => sum + (s.quantitySold || 0), 0);
  const remainingQuantity = Math.max(0, harvestedQuantity - soldQuantity);
  const quantityUnit = relevantSales[0]?.unit || "Quintal";

  return {
    cropId: crop.id,
    areaAcres,
    categories,
    seedCostPaise,
    fertilizerCostPaise,
    pesticideCostPaise,
    materialCostPaise,
    labourCostPaise,
    machineryCostPaise,
    totalMachineryCostPaise: machineryCostPaise,
    irrigationCostPaise,
    otherCostPaise,
    totalOtherCostPaise: irrigationCostPaise + otherCostPaise,
    totalInvestmentPaise,
    totalExpensesPaise,
    cashExpensesPaise,
    salesRevenuePaise,
    receivedRevenuePaise,
    pendingRevenuePaise,
    totalIncomePaise: receivedRevenuePaise,
    pendingIncomePaise: pendingRevenuePaise,
    profitPaise,
    cashProfitPaise,
    labourTotalPaise,
    labourPaidPaise,
    labourPendingPaise,
    costPerAcrePaise,
    revenuePerAcrePaise,
    profitPerAcrePaise,
    harvestedQuantity,
    soldQuantity,
    remainingQuantity,
    quantityUnit,
  };
}

export interface FarmTotals {
  landAreaAcres: number;
  activeCrops: number;
  totalCrops: number;
  investmentPaise: number;
  cashExpensePaise: number;
  incomePaise: number;
  pendingIncomePaise: number;
  profitPaise: number;
  labourTotalPaise: number;
  labourPaidPaise: number;
  labourPendingPaise: number;
}

export function farmTotals(
  crops: Crop[],
  lands: Land[],
  transactions: Transaction[],
  labourPayments: LabourPayment[],
  cropSalesOrRange?: CropSale[] | DateRange,
  maybeRange?: DateRange
): FarmTotals {
  const cropSales = Array.isArray(cropSalesOrRange) ? cropSalesOrRange : undefined;
  const range = Array.isArray(cropSalesOrRange)
    ? maybeRange
    : (cropSalesOrRange as DateRange | undefined) ?? maybeRange;

  const farmTransactions = scoped(transactions, range).filter(
    (row) => row.group === "FARM"
  );
  const farmExpenses = farmTransactions.filter(isExpense);
  const nonLabourExpenses = farmExpenses.filter(
    (row) => !row.labourPaymentId && row.category !== "Labour"
  );
  const manualLabour = farmExpenses.filter(
    (row) => !row.labourPaymentId && row.category === "Labour"
  );

  const labourRecords = alive(labourPayments).filter((row) =>
    range ? inRange(labourReportDate(row), range) : true
  );
  const labourPaidPaise = sumPaise(
    labourRecords.map((row) =>
      row.status === "PAID"
        ? (row.paidPaise ?? row.amountPaise)
        : (row.paidPaise ?? 0)
    )
  );
  const labourPendingPaise = sumPaise(
    labourRecords.map((row) =>
      row.status === "PENDING"
        ? (row.remainingPaise ?? row.amountPaise)
        : row.status === "PARTIAL"
        ? (row.remainingPaise ?? Math.max(0, row.amountPaise - (row.paidPaise ?? 0)))
        : 0
    )
  );
  const manualLabourPaise = sumPaise(manualLabour.map((row) => row.amountPaise));
  const labourTotalPaise = labourPaidPaise + labourPendingPaise + manualLabourPaise;

  const investmentPaise =
    sumPaise(nonLabourExpenses.map((row) => row.amountPaise)) + labourTotalPaise;

  const relevantSales = cropSales
    ? alive(cropSales).filter((s) => !range || inRange(s.saleDate, range))
    : [];
  const saleReceived = sumPaise(relevantSales.map((s) => s.receivedPaise));
  const salePending = sumPaise(relevantSales.map((s) => s.pendingPaise));

  const manualIncome = farmTransactions.filter(
    (row) => !row.notes?.includes("[cropsale:") && row.kind === "INCOME"
  );
  const manualIncomeReceived = sumPaise(
    manualIncome.filter(isReceivedIncome).map((row) => row.amountPaise)
  );
  const manualIncomePending = sumPaise(
    manualIncome.filter(isPendingIncome).map((row) => row.amountPaise)
  );

  const incomePaise = cropSales
    ? saleReceived + manualIncomeReceived
    : sumPaise(farmTransactions.filter(isReceivedIncome).map((row) => row.amountPaise));
  const pendingIncomePaise = cropSales
    ? salePending + manualIncomePending
    : sumPaise(farmTransactions.filter(isPendingIncome).map((row) => row.amountPaise));

  return {
    landAreaAcres: alive(lands).reduce((total, land) => total + (land.areaAcres || 0), 0),
    activeCrops: alive(crops).filter((crop) => crop.status === "ACTIVE" || crop.status === "HARVESTING").length,
    totalCrops: alive(crops).length,
    investmentPaise,
    cashExpensePaise: sumPaise(farmExpenses.map((row) => row.amountPaise)),
    incomePaise,
    pendingIncomePaise,
    profitPaise: incomePaise - investmentPaise,
    labourTotalPaise,
    labourPaidPaise,
    labourPendingPaise,
  };
}

export function isFarmIncomeCategory(category: string): boolean {
  return FARM_INCOME_CATEGORIES.has(category);
}

export interface VehicleFinancials {
  fuelPaise: number;
  maintenancePaise: number;
  insurancePaise: number;
  emiPaise: number;
  otherPaise: number;
  totalPaise: number;
  rentalIncomePaise: number;
  expenseCount: number;
  lastExpenseDate?: string;
}

const FUEL_CATEGORIES = new Set(["Fuel", "Petrol", "Diesel", "CNG"]);
const MAINTENANCE_CATEGORIES = new Set([
  "Engine Oil",
  "Servicing",
  "Repairs",
  "Tyres",
  "Battery",
]);
const PAPER_CATEGORIES = new Set(["Insurance", "PUC", "Registration"]);

export interface VehicleFinancials {
  fuelPaise: number;
  maintenancePaise: number;
  insurancePaise: number;
  emiPaise: number;
  otherPaise: number;
  totalPaise: number;
  totalOperatingCostPaise: number;
  rentalIncomePaise: number;
  netCashFlowPaise: number;
  expenseCount: number;
  lastExpenseDate?: string;
  monthlyBreakdown: { key: string; expensePaise: number; incomePaise: number }[];
  yearlyBreakdown: { year: string; expensePaise: number; incomePaise: number }[];
}

export function vehicleFinancials(
  vehicleId: string,
  transactions: Transaction[],
  range?: DateRange
): VehicleFinancials {
  const rows = alive(transactions).filter(
    (row) =>
      row.vehicleId === vehicleId &&
      (row.kind === "INCOME" || row.group === "VEHICLE") &&
      (!range || inRange(row.date, range))
  );
  const expenses = rows.filter(isExpense);
  const incomeRows = rows.filter(isReceivedIncome);

  let fuelPaise = 0;
  let maintenancePaise = 0;
  let insurancePaise = 0;
  let emiPaise = 0;
  let otherPaise = 0;

  for (const row of expenses) {
    if (FUEL_CATEGORIES.has(row.category)) fuelPaise += row.amountPaise;
    else if (MAINTENANCE_CATEGORIES.has(row.category)) maintenancePaise += row.amountPaise;
    else if (PAPER_CATEGORIES.has(row.category)) insurancePaise += row.amountPaise;
    else if (row.category === "EMI" || row.category === "Loan EMI") emiPaise += row.amountPaise;
    else otherPaise += row.amountPaise;
  }

  const rentalIncomePaise = sumPaise(incomeRows.map((row) => row.amountPaise));
  const dates = expenses.map((row) => row.date).sort();
  const totalPaise = fuelPaise + maintenancePaise + insurancePaise + emiPaise + otherPaise;
  const totalOperatingCostPaise = fuelPaise + maintenancePaise + insurancePaise + otherPaise;
  const netCashFlowPaise = rentalIncomePaise - totalPaise;

  // Monthly breakdown
  const monthlyMap = new Map<string, { expensePaise: number; incomePaise: number }>();
  for (const row of rows) {
    const key = row.date.slice(0, 7); // YYYY-MM
    const curr = monthlyMap.get(key) ?? { expensePaise: 0, incomePaise: 0 };
    if (isExpense(row)) curr.expensePaise += row.amountPaise;
    else if (isReceivedIncome(row)) curr.incomePaise += row.amountPaise;
    monthlyMap.set(key, curr);
  }
  const monthlyBreakdown = [...monthlyMap.entries()]
    .map(([key, vals]) => ({ key, ...vals }))
    .sort((a, b) => b.key.localeCompare(a.key));

  // Yearly breakdown
  const yearlyMap = new Map<string, { expensePaise: number; incomePaise: number }>();
  for (const row of rows) {
    const year = row.date.slice(0, 4); // YYYY
    const curr = yearlyMap.get(year) ?? { expensePaise: 0, incomePaise: 0 };
    if (isExpense(row)) curr.expensePaise += row.amountPaise;
    else if (isReceivedIncome(row)) curr.incomePaise += row.amountPaise;
    yearlyMap.set(year, curr);
  }
  const yearlyBreakdown = [...yearlyMap.entries()]
    .map(([year, vals]) => ({ year, ...vals }))
    .sort((a, b) => b.year.localeCompare(a.year));

  return {
    fuelPaise,
    maintenancePaise,
    insurancePaise,
    emiPaise,
    otherPaise,
    totalPaise,
    totalOperatingCostPaise,
    rentalIncomePaise,
    netCashFlowPaise,
    expenseCount: expenses.length,
    lastExpenseDate: dates[dates.length - 1],
    monthlyBreakdown,
    yearlyBreakdown,
  };
}

export interface TractorPerformance {
  totalHours: number;
  ownFarmHours: number;
  otherFarmHours: number;
  dieselLitres: number;
  fuelSpendingPaise: number;
  maintenanceSpendingPaise: number;
  totalOperatingCostPaise: number;
  rentalIncomePaise: number;
  netTractorEarningsPaise: number;
  jobsCount: number;
}

export function tractorPerformance(
  vehicle: Vehicle,
  transactions: Transaction[],
  range?: DateRange
): TractorPerformance {
  const fin = vehicleFinancials(vehicle.id, transactions, range);
  const tractorData = vehicle.tractor || {};
  const logs = tractorData.logs || [];
  const scopedLogs = range
    ? logs.filter((l) => inRange(l.date, range))
    : logs;

  const loggedOwnHours = sumPaise(scopedLogs.filter((l) => l.farmType === "OWN").map((l) => l.hours * 100)) / 100;
  const loggedRentalHours = sumPaise(scopedLogs.filter((l) => l.farmType === "RENTAL").map((l) => l.hours * 100)) / 100;
  const loggedDiesel = sumPaise(scopedLogs.map((l) => (l.dieselLitres || 0) * 100)) / 100;

  const totalHours = scopedLogs.length > 0 ? (loggedOwnHours + loggedRentalHours) : (tractorData.hoursUsed || 0);
  const ownFarmHours = scopedLogs.length > 0 ? loggedOwnHours : (tractorData.ownFarmHours || 0);
  const otherFarmHours = scopedLogs.length > 0 ? loggedRentalHours : (tractorData.otherFarmHours || 0);
  const dieselLitres = scopedLogs.length > 0 ? loggedDiesel : (tractorData.dieselLitres || 0);

  const fuelSpendingPaise = fin.fuelPaise;
  const maintenanceSpendingPaise = fin.maintenancePaise;
  const totalOperatingCostPaise = fin.totalOperatingCostPaise;
  const rentalIncomePaise = fin.rentalIncomePaise;
  const netTractorEarningsPaise = rentalIncomePaise - totalOperatingCostPaise;

  return {
    totalHours,
    ownFarmHours,
    otherFarmHours,
    dieselLitres,
    fuelSpendingPaise,
    maintenanceSpendingPaise,
    totalOperatingCostPaise,
    rentalIncomePaise,
    netTractorEarningsPaise,
    jobsCount: scopedLogs.length,
  };
}

export interface VehiclesDashboardStats {
  totalVehicles: number;
  totalPurchaseValuePaise: number;
  totalExpensesPaise: number;
  monthlyExpensesPaise: number;
  totalFuelPaise: number;
  totalMaintenancePaise: number;
  totalRentalIncomePaise: number;
  outstandingLoansPaise: number;
}

export function vehiclesDashboardStats(
  vehicles: Vehicle[],
  transactions: Transaction[],
  loans?: Loan[],
  range?: DateRange
): VehiclesDashboardStats {
  const aliveVehicles = alive(vehicles);
  const currentMonthPrefix = todayISO().slice(0, 7);

  let totalPurchaseValuePaise = 0;
  let totalExpensesPaise = 0;
  let monthlyExpensesPaise = 0;
  let totalFuelPaise = 0;
  let totalMaintenancePaise = 0;
  let totalRentalIncomePaise = 0;

  for (const v of aliveVehicles) {
    totalPurchaseValuePaise += v.purchasePricePaise || 0;
    const fin = vehicleFinancials(v.id, transactions, range);
    totalExpensesPaise += fin.totalPaise;
    totalFuelPaise += fin.fuelPaise;
    totalMaintenancePaise += fin.maintenancePaise;
    totalRentalIncomePaise += fin.rentalIncomePaise;

    // Monthly expenses for current month
    const thisMonthFin = vehicleFinancials(v.id, transactions);
    const thisMonthEntry = thisMonthFin.monthlyBreakdown.find((m) => m.key === currentMonthPrefix);
    if (thisMonthEntry) {
      monthlyExpensesPaise += thisMonthEntry.expensePaise;
    }
  }

  // Outstanding vehicle loans
  let outstandingLoansPaise = 0;
  if (loans) {
    const aliveLoans = alive(loans);
    for (const v of aliveVehicles) {
      // Find loan linked by loanId or vehicleId
      const linkedLoans = aliveLoans.filter(
        (l) => l.type === "BORROWED" && (l.id === v.loanId || l.vehicleId === v.id)
      );
      for (const loan of linkedLoans) {
        const repaid = sumPaise(loan.repayments.map((r) => r.amountPaise));
        outstandingLoansPaise += Math.max(0, loan.principalPaise - repaid);
      }
      // If loanAmountPaise specified on vehicle but no Loan record found:
      if (linkedLoans.length === 0 && v.loanAmountPaise && v.loanAmountPaise > 0) {
        outstandingLoansPaise += v.loanAmountPaise;
      }
    }
  }

  return {
    totalVehicles: aliveVehicles.length,
    totalPurchaseValuePaise,
    totalExpensesPaise,
    monthlyExpensesPaise,
    totalFuelPaise,
    totalMaintenancePaise,
    totalRentalIncomePaise,
    outstandingLoansPaise,
  };
}

export interface LabourSummary {
  totalPaise: number;
  paidPaise: number;
  pendingPaise: number;
  count: number;
  paidCount: number;
  pendingCount: number;
  totalWorkerDays: number;
  byCrop: { name: string; amountPaise: number; count: number }[];
  byActivity: { name: string; amountPaise: number; count: number }[];
}

export function labourSummary(
  labourPayments: LabourPayment[],
  range?: DateRange
): LabourSummary {
  const rows = alive(labourPayments).filter((row) =>
    range ? inRange(labourReportDate(row), range) : true
  );
  const byCropMap = new Map<string, { name: string; amountPaise: number; count: number }>();
  const byActivityMap = new Map<
    string,
    { name: string; amountPaise: number; count: number }
  >();

  for (const row of rows) {
    const crop = byCropMap.get(row.cropName) ?? {
      name: row.cropName,
      amountPaise: 0,
      count: 0,
    };
    crop.amountPaise += row.amountPaise;
    crop.count += 1;
    byCropMap.set(row.cropName, crop);

    const activity = byActivityMap.get(row.activity) ?? {
      name: row.activity,
      amountPaise: 0,
      count: 0,
    };
    activity.amountPaise += row.amountPaise;
    activity.count += 1;
    byActivityMap.set(row.activity, activity);
  }

  return {
    totalPaise: sumPaise(rows.map((row) => row.amountPaise)),
    paidPaise: sumPaise(
      rows.map((row) =>
        row.status === "PAID"
          ? (row.paidPaise ?? row.amountPaise)
          : (row.paidPaise ?? 0)
      )
    ),
    pendingPaise: sumPaise(
      rows.map((row) =>
        row.status === "PENDING"
          ? (row.remainingPaise ?? row.amountPaise)
          : row.status === "PARTIAL"
          ? (row.remainingPaise ?? Math.max(0, row.amountPaise - (row.paidPaise ?? 0)))
          : 0
      )
    ),
    count: rows.length,
    paidCount: rows.filter((row) => row.status === "PAID").length,
    pendingCount: rows.filter((row) => row.status === "PENDING" || row.status === "PARTIAL").length,
    totalWorkerDays: rows.reduce(
      (total, row) => total + row.workers * Math.max(0, row.days),
      0
    ),
    byCrop: [...byCropMap.values()].sort((a, b) => b.amountPaise - a.amountPaise),
    byActivity: [...byActivityMap.values()].sort((a, b) => b.amountPaise - a.amountPaise),
  };
}

export function labourByCrop(
  labourPayments: LabourPayment[],
  cropId: string
): LabourPayment[] {
  return alive(labourPayments)
    .filter((row) => row.cropId === cropId)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export function labourByActivity(
  labourPayments: LabourPayment[],
  cropId?: string
): { name: string; amountPaise: number; paidPaise: number; pendingPaise: number; count: number }[] {
  const rows = alive(labourPayments).filter((row) => (cropId ? row.cropId === cropId : true));
  const map = new Map<
    string,
    { name: string; amountPaise: number; paidPaise: number; pendingPaise: number; count: number }
  >();
  for (const row of rows) {
    const current = map.get(row.activity) ?? {
      name: row.activity,
      amountPaise: 0,
      paidPaise: 0,
      pendingPaise: 0,
      count: 0,
    };
    current.amountPaise += row.amountPaise;
    current.count += 1;
    if (row.status === "PAID") current.paidPaise += row.amountPaise;
    else current.pendingPaise += row.amountPaise;
    map.set(row.activity, current);
  }
  return [...map.values()].sort((a, b) => b.amountPaise - a.amountPaise);
}

export function pendingLabourTotal(labourPayments: LabourPayment[]): number {
  return sumPaise(
    alive(labourPayments)
      .filter((row) => row.status === "PENDING")
      .map((row) => row.amountPaise)
  );
}

export function loanRepaid(loan: Loan): number {
  return sumPaise((loan.repayments ?? []).map((repayment) => repayment.amountPaise));
}

export function loanPrincipalRepaid(loan: Loan): number {
  return sumPaise(
    (loan.repayments ?? []).map((r) => r.principalPaise ?? r.amountPaise)
  );
}

export function loanInterestPaid(loan: Loan): number {
  return sumPaise((loan.repayments ?? []).map((r) => r.interestPaise ?? 0));
}

export function loanOutstanding(loan: Loan): number {
  return Math.max(0, loan.principalPaise - loanPrincipalRepaid(loan));
}

export function loanAccruedInterest(loan: Loan, asOfDate: ISODate = todayISO()): number {
  if (!loan.interestRate || loan.interestRate <= 0 || loan.interestType === "NONE") {
    return 0;
  }
  const startDate = parseISODate(loan.date);
  const targetDate = parseISODate(asOfDate);
  const diffDays = Math.max(
    0,
    Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const years = diffDays / 365;
  const principal = loanOutstanding(loan);
  const totalInterest = Math.round((principal * loan.interestRate * years) / 100);
  return Math.max(0, totalInterest);
}

export function loanIsOverdue(loan: Loan, asOfDate: ISODate = todayISO()): boolean {
  if (
    loan.status === "CLOSED" ||
    loan.status === "COMPLETED" ||
    loan.status === "WRITTEN_OFF"
  ) {
    return false;
  }
  return loanOutstanding(loan) > 0 && !!loan.dueDate && loan.dueDate < asOfDate;
}

export function loanEffectiveStatus(loan: Loan, asOfDate: ISODate = todayISO()): LoanStatus {
  if (loan.status === "WRITTEN_OFF") return "WRITTEN_OFF";
  if (loanOutstanding(loan) <= 0) return "COMPLETED";
  if (loanIsOverdue(loan, asOfDate)) return "OVERDUE";
  return "ACTIVE";
}

export interface LoanSummary {
  principalPaise: number;
  repaidPaise: number;
  principalRepaidPaise: number;
  interestPaidPaise: number;
  outstandingPaise: number;
  activeCount: number;
  closedCount: number;
  overdueCount: number;
  overduePaise: number;
}

export function loanSummary(loans: Loan[], type: "BORROWED" | "LENT"): LoanSummary {
  const rows = alive(loans).filter((loan) => loan.type === type);
  const principalPaise = sumPaise(rows.map((loan) => loan.principalPaise));
  const repaidPaise = sumPaise(rows.map(loanRepaid));
  const principalRepaidPaise = sumPaise(rows.map(loanPrincipalRepaid));
  const interestPaidPaise = sumPaise(rows.map(loanInterestPaid));
  const outstandingPaise = sumPaise(rows.map(loanOutstanding));
  const today = todayISO();
  const overdueLoans = rows.filter((l) => loanIsOverdue(l, today));

  return {
    principalPaise,
    repaidPaise,
    principalRepaidPaise,
    interestPaidPaise,
    outstandingPaise,
    activeCount: rows.filter(
      (loan) => loanOutstanding(loan) > 0 && loan.status !== "WRITTEN_OFF"
    ).length,
    closedCount: rows.filter(
      (loan) =>
        loanOutstanding(loan) <= 0 ||
        loan.status === "CLOSED" ||
        loan.status === "COMPLETED"
    ).length,
    overdueCount: overdueLoans.length,
    overduePaise: sumPaise(overdueLoans.map(loanOutstanding)),
  };
}

export interface LoansDashboardStats {
  totalBorrowedPrincipalOutstandingPaise: number;
  totalLentPrincipalOutstandingPaise: number;
  totalRepaymentsMadePaise: number;
  totalPrincipalRepaidPaise: number;
  totalInterestPaidPaise: number;
  totalCollectionsReceivedPaise: number;
  totalPrincipalRecoveredPaise: number;
  totalInterestReceivedPaise: number;
  activeBorrowedCount: number;
  activeLentCount: number;
  overdueBorrowedCount: number;
  overdueBorrowedPaise: number;
  overdueLentCount: number;
  overdueLentPaise: number;
  totalBorrowedCount: number;
  totalLentCount: number;
}

export function loansDashboardStats(
  loans: Loan[],
  range?: DateRange
): LoansDashboardStats {
  const aliveLoans = alive(loans);

  const borrowed = aliveLoans.filter((l) => l.type === "BORROWED");
  const lent = aliveLoans.filter((l) => l.type === "LENT");

  const borrowedSummary = loanSummary(borrowed, "BORROWED");
  const lentSummary = loanSummary(lent, "LENT");

  return {
    totalBorrowedPrincipalOutstandingPaise: borrowedSummary.outstandingPaise,
    totalLentPrincipalOutstandingPaise: lentSummary.outstandingPaise,
    totalRepaymentsMadePaise: borrowedSummary.repaidPaise,
    totalPrincipalRepaidPaise: borrowedSummary.principalRepaidPaise,
    totalInterestPaidPaise: borrowedSummary.interestPaidPaise,
    totalCollectionsReceivedPaise: lentSummary.repaidPaise,
    totalPrincipalRecoveredPaise: lentSummary.principalRepaidPaise,
    totalInterestReceivedPaise: lentSummary.interestPaidPaise,
    activeBorrowedCount: borrowedSummary.activeCount,
    activeLentCount: lentSummary.activeCount,
    overdueBorrowedCount: borrowedSummary.overdueCount,
    overdueBorrowedPaise: borrowedSummary.overduePaise,
    overdueLentCount: lentSummary.overdueCount,
    overdueLentPaise: lentSummary.overduePaise,
    totalBorrowedCount: borrowed.length,
    totalLentCount: lent.length,
  };
}

export interface MonthlyLoanCashflow {
  month: string;
  principalRepaymentsPaise: number;
  interestPaidPaise: number;
  principalCollectionsPaise: number;
  interestReceivedPaise: number;
}

export function monthlyLoanCashflow(
  loans: Loan[],
  range?: DateRange
): MonthlyLoanCashflow[] {
  const aliveLoans = alive(loans);
  const map = new Map<string, MonthlyLoanCashflow>();

  for (const loan of aliveLoans) {
    for (const r of loan.repayments ?? []) {
      if (range && !inRange(r.date, range)) continue;
      const month = r.date.slice(0, 7);
      const curr = map.get(month) ?? {
        month,
        principalRepaymentsPaise: 0,
        interestPaidPaise: 0,
        principalCollectionsPaise: 0,
        interestReceivedPaise: 0,
      };

      const principal = r.principalPaise ?? r.amountPaise;
      const interest = r.interestPaise ?? 0;

      if (loan.type === "BORROWED") {
        curr.principalRepaymentsPaise += principal;
        curr.interestPaidPaise += interest;
      } else {
        curr.principalCollectionsPaise += principal;
        curr.interestReceivedPaise += interest;
      }
      map.set(month, curr);
    }
  }

  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month));
}

// ==========================================
// INVENTORY & STOCK MANAGEMENT (PHASE 8)
// ==========================================

export type UnitFamily = "MASS" | "VOLUME" | "COUNT" | "OTHER";

const MASS_FACTORS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  quintal: 100000,
  quintals: 100000,
  ton: 1000000,
  tons: 1000000,
  tonne: 1000000,
  tonnes: 1000000,
};

const VOLUME_FACTORS: Record<string, number> = {
  ml: 1,
  millilitre: 1,
  millilitres: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  litre: 1000,
  litres: 1000,
  liter: 1000,
  liters: 1000,
};

function normalizeUnitStr(unit: string): string {
  return (unit || "").trim().toLowerCase();
}

function stripPlural(u: string): string {
  return u.endsWith("s") && u.length > 2 ? u.slice(0, -1) : u;
}

export function getUnitFamily(unit: string): UnitFamily {
  const norm = normalizeUnitStr(unit);
  const stripped = stripPlural(norm);
  if (norm in MASS_FACTORS || stripped in MASS_FACTORS) return "MASS";
  if (norm in VOLUME_FACTORS || stripped in VOLUME_FACTORS) return "VOLUME";
  const countUnits = [
    "bag",
    "packet",
    "piece",
    "unit",
    "bottle",
    "box",
    "drum",
    "bundle",
    "can",
  ];
  if (countUnits.includes(stripped) || countUnits.includes(norm)) return "COUNT";
  return "OTHER";
}

export function areUnitsCompatible(unitA: string, unitB: string): boolean {
  const normA = normalizeUnitStr(unitA);
  const normB = normalizeUnitStr(unitB);
  if (!normA || !normB) return false;
  if (normA === normB || stripPlural(normA) === stripPlural(normB)) return true;

  const famA = getUnitFamily(normA);
  const famB = getUnitFamily(normB);

  if (famA === "MASS" && famB === "MASS") return true;
  if (famA === "VOLUME" && famB === "VOLUME") return true;

  return false;
}

export function convertUnitQuantity(qty: number, fromUnit: string, toUnit: string): number {
  const normA = normalizeUnitStr(fromUnit);
  const normB = normalizeUnitStr(toUnit);
  if (normA === normB || stripPlural(normA) === stripPlural(normB)) return qty;

  const famA = getUnitFamily(normA);
  const famB = getUnitFamily(normB);

  if (famA === "MASS" && famB === "MASS") {
    const factorFrom = MASS_FACTORS[normA] ?? MASS_FACTORS[stripPlural(normA)] ?? 1;
    const factorTo = MASS_FACTORS[normB] ?? MASS_FACTORS[stripPlural(normB)] ?? 1;
    const grams = qty * factorFrom;
    return grams / factorTo;
  }

  if (famA === "VOLUME" && famB === "VOLUME") {
    const factorFrom = VOLUME_FACTORS[normA] ?? VOLUME_FACTORS[stripPlural(normA)] ?? 1;
    const factorTo = VOLUME_FACTORS[normB] ?? VOLUME_FACTORS[stripPlural(normB)] ?? 1;
    const ml = qty * factorFrom;
    return ml / factorTo;
  }

  throw new Error(`Incompatible units: Cannot convert '${fromUnit}' to '${toUnit}'.`);
}

export function averagePurchasePricePaise(item: InventoryItem): number {
  const purchases = (item.purchases ?? []).filter((p) => p.received !== false && p.quantity > 0);
  if (purchases.length === 0) return Math.max(0, item.unitPricePaise);

  let totalQtyInBase = 0;
  let totalCost = 0;

  for (const p of purchases) {
    try {
      const convertedQty = convertUnitQuantity(p.quantity, p.unit, item.unit);
      totalQtyInBase += convertedQty;
      totalCost += p.totalCostPaise;
    } catch {
      totalQtyInBase += p.quantity;
      totalCost += p.totalCostPaise;
    }
  }

  if (totalQtyInBase > 0 && totalCost > 0) {
    return Math.round(totalCost / totalQtyInBase);
  }
  return Math.max(0, item.unitPricePaise);
}

export function inventoryItemValuation(item: InventoryItem): number {
  const avgPrice = averagePurchasePricePaise(item);
  return Math.round(Math.max(0, item.remainingQuantity) * avgPrice);
}

export function inventoryValue(items: InventoryItem[]): number {
  return sumPaise(
    alive(items)
      .filter((i) => !i.isArchived)
      .map((item) => inventoryItemValuation(item))
  );
}

export function lowStockItems(items: InventoryItem[]): InventoryItem[] {
  return alive(items).filter(
    (item) =>
      !item.isArchived &&
      item.remainingQuantity > 0 &&
      item.remainingQuantity <= item.minQuantity
  );
}

export function outOfStockItems(items: InventoryItem[]): InventoryItem[] {
  return alive(items).filter((item) => !item.isArchived && item.remainingQuantity <= 0);
}

export function expiringInventoryItems(
  items: InventoryItem[],
  daysThreshold = 30,
  asOfDate = todayISO()
): InventoryItem[] {
  const limitDate = addDays(asOfDate, daysThreshold);
  return alive(items).filter((item) => {
    if (item.isArchived || !item.expiryDate) return false;
    return item.expiryDate <= limitDate;
  });
}

export interface InventoryDashboardStats {
  totalActiveProducts: number;
  totalStockValuePaise: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  totalPurchasedValuePaise: number;
  totalPendingSupplierPaise: number;
  stockByCategory: Array<{
    category: string;
    productCount: number;
    totalValuePaise: number;
  }>;
  recentPurchases: Array<InventoryPurchase & { itemName: string; itemId: string }>;
  recentUsage: Array<InventoryUsage & { itemName: string; itemId: string }>;
}

export function inventoryDashboardStats(
  items: InventoryItem[],
  asOfDate = todayISO()
): InventoryDashboardStats {
  const activeItems = alive(items).filter((i) => !i.isArchived);
  const totalActiveProducts = activeItems.length;
  const totalStockValuePaise = inventoryValue(activeItems);
  const lowList = lowStockItems(activeItems);
  const outList = outOfStockItems(activeItems);
  const expList = expiringInventoryItems(activeItems, 30, asOfDate);

  let totalPurchasedValuePaise = 0;
  let totalPendingSupplierPaise = 0;
  const allPurchases: Array<InventoryPurchase & { itemName: string; itemId: string }> = [];
  const allUsages: Array<InventoryUsage & { itemName: string; itemId: string }> = [];

  const categoryMap = new Map<string, { count: number; value: number }>();

  for (const item of activeItems) {
    const val = inventoryItemValuation(item);
    const cat = item.category || "Other";
    const existing = categoryMap.get(cat) ?? { count: 0, value: 0 };
    categoryMap.set(cat, {
      count: existing.count + 1,
      value: existing.value + val,
    });

    for (const p of item.purchases ?? []) {
      totalPurchasedValuePaise += p.totalCostPaise;
      totalPendingSupplierPaise += p.pendingPaise;
      allPurchases.push({ ...p, itemName: item.itemName, itemId: item.id });
    }

    for (const u of item.usageHistory ?? []) {
      allUsages.push({ ...u, itemName: item.itemName, itemId: item.id });
    }
  }

  const stockByCategory = Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    productCount: stats.count,
    totalValuePaise: stats.value,
  }));

  allPurchases.sort(
    (a, b) =>
      b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt)
  );
  allUsages.sort(
    (a, b) =>
      b.usageDate.localeCompare(a.usageDate) || b.createdAt.localeCompare(a.createdAt)
  );

  return {
    totalActiveProducts,
    totalStockValuePaise,
    lowStockCount: lowList.length,
    outOfStockCount: outList.length,
    expiringCount: expList.length,
    totalPurchasedValuePaise,
    totalPendingSupplierPaise,
    stockByCategory,
    recentPurchases: allPurchases.slice(0, 10),
    recentUsage: allUsages.slice(0, 10),
  };
}

export function cropInventoryCost(
  cropId: string,
  items: InventoryItem[],
  range?: DateRange
): number {
  let total = 0;
  for (const item of alive(items)) {
    for (const usage of item.usageHistory ?? []) {
      if (usage.cropId === cropId && (!range || inRange(usage.usageDate, range))) {
        total += usage.costPaise;
      }
    }
  }
  return total;
}

export function reconcileItemStock(item: InventoryItem): {
  calculatedStock: number;
  difference: number;
  purchasesTotal: number;
  usageTotal: number;
  adjustmentsTotal: number;
} {
  let purchasesTotal = 0;
  for (const p of item.purchases ?? []) {
    if (p.received !== false) {
      try {
        purchasesTotal += convertUnitQuantity(p.quantity, p.unit, item.unit);
      } catch {
        purchasesTotal += p.quantity;
      }
    }
  }

  let usageTotal = 0;
  for (const u of item.usageHistory ?? []) {
    try {
      usageTotal += convertUnitQuantity(u.quantityUsed, u.unit, item.unit);
    } catch {
      usageTotal += u.quantityUsed;
    }
  }

  let adjustmentsTotal = 0;
  for (const a of item.adjustments ?? []) {
    try {
      adjustmentsTotal += convertUnitQuantity(a.quantityDelta, a.unit, item.unit);
    } catch {
      adjustmentsTotal += a.quantityDelta;
    }
  }

  const calculatedStock = Math.max(
    0,
    item.quantity + purchasesTotal - usageTotal + adjustmentsTotal
  );
  const difference = item.remainingQuantity - calculatedStock;

  return {
    calculatedStock,
    difference,
    purchasesTotal,
    usageTotal,
    adjustmentsTotal,
  };
}

export interface ReminderBuckets {
  today: Reminder[];
  upcoming: Reminder[];
  overdue: Reminder[];
  completed: Reminder[];
  next: Reminder[];
}

export function reminderBuckets(
  reminders: Reminder[],
  baseDate = todayISO()
): ReminderBuckets {
  const rows = alive(reminders);
  const sortFn = (a: Reminder, b: Reminder) =>
    a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "");
  const active = rows.filter((row) => !row.completed).sort(sortFn);
  const today = active.filter((row) => row.date === baseDate);
  const upcoming = active.filter((row) => row.date > baseDate);
  const overdue = active.filter((row) => row.date < baseDate);
  const completed = rows
    .filter((row) => row.completed)
    .sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date));
  return {
    today,
    upcoming,
    overdue,
    completed,
    next: [...overdue, ...today, ...upcoming].slice(0, 3),
  };
}

export interface MonthHistoryRow {
  key: string;
  label: string;
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  count: number;
}

export function monthlyHistory(transactions: Transaction[]): MonthHistoryRow[] {
  const map = new Map<string, MonthHistoryRow>();
  for (const row of alive(transactions)) {
    const key = monthKey(row.date);
    const current = map.get(key) ?? {
      key,
      label: key,
      incomePaise: 0,
      expensePaise: 0,
      netPaise: 0,
      count: 0,
    };
    if (isReceivedIncome(row)) current.incomePaise += row.amountPaise;
    if (isExpense(row)) current.expensePaise += row.amountPaise;
    current.count += 1;
    current.netPaise = current.incomePaise - current.expensePaise;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function yearlyHistory(transactions: Transaction[]): {
  year: string;
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
}[] {
  const map = new Map<string, { year: string; incomePaise: number; expensePaise: number; netPaise: number }>();
  for (const row of alive(transactions)) {
    const year = row.date.slice(0, 4);
    const current = map.get(year) ?? {
      year,
      incomePaise: 0,
      expensePaise: 0,
      netPaise: 0,
    };
    if (isReceivedIncome(row)) current.incomePaise += row.amountPaise;
    if (isExpense(row)) current.expensePaise += row.amountPaise;
    current.netPaise = current.incomePaise - current.expensePaise;
    map.set(year, current);
  }
  return [...map.values()].sort((a, b) => b.year.localeCompare(a.year));
}

export function availableHomeCategories(custom: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const category of [...HOME_CATEGORIES, ...custom]) {
    const key = category.trim().toLowerCase();
    if (!category.trim() || seen.has(key)) continue;
    seen.add(key);
    result.push(category.trim());
  }
  return result;
}

export function availableFarmCategories(custom: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const category of [...FARM_CATEGORIES, ...custom]) {
    const key = category.trim().toLowerCase();
    if (!category.trim() || seen.has(key)) continue;
    seen.add(key);
    result.push(category.trim());
  }
  return result;
}

export function availableVehicleCategories(custom: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const category of [...VEHICLE_CATEGORIES, ...custom]) {
    const key = category.trim().toLowerCase();
    if (!category.trim() || seen.has(key)) continue;
    seen.add(key);
    result.push(category.trim());
  }
  return result;
}

// =========================================================================
// PHASE 9: UNIFIED FINANCIAL INTELLIGENCE & RECONCILIATION
// =========================================================================

export interface IncomeBreakdown {
  cropSalesReceivedPaise: number;
  cropSalesPendingPaise: number;
  milkAndProducePaise: number;
  tractorAndRentalPaise: number;
  householdSalaryPaise: number;
  businessIncomePaise: number;
  interestReceivedPaise: number;
  otherIncomePaise: number;
  totalReceivedPaise: number;
  totalPendingPaise: number;
}

export function incomeBreakdown(
  transactions: Transaction[],
  cropSales?: CropSale[],
  range?: DateRange
): IncomeBreakdown {
  const rows = scoped(transactions, range).filter((t) => t.kind === "INCOME");
  const sales = cropSales
    ? alive(cropSales).filter((s) => !range || inRange(s.saleDate, range))
    : [];

  let cropSalesReceivedPaise = 0;
  let cropSalesPendingPaise = 0;
  let milkAndProducePaise = 0;
  let tractorAndRentalPaise = 0;
  let householdSalaryPaise = 0;
  let businessIncomePaise = 0;
  let interestReceivedPaise = 0;
  let otherIncomePaise = 0;

  for (const s of sales) {
    cropSalesReceivedPaise += s.receivedPaise || 0;
    cropSalesPendingPaise += s.pendingPaise || 0;
  }

  for (const t of rows) {
    if (t.notes?.includes("[cropsale:")) {
      continue;
    }

    const isReceived = (t.incomeStatus ?? "RECEIVED") === "RECEIVED";
    const amount = t.amountPaise;
    const cat = (t.category || "").toLowerCase();

    if (cat.includes("crop sale")) {
      if (isReceived) cropSalesReceivedPaise += amount;
      else cropSalesPendingPaise += amount;
    } else if (
      cat.includes("milk") ||
      cat.includes("dairy") ||
      cat.includes("agricultural product")
    ) {
      if (isReceived) milkAndProducePaise += amount;
    } else if (
      cat.includes("tractor") ||
      cat.includes("machinery") ||
      cat.includes("rental")
    ) {
      if (isReceived) tractorAndRentalPaise += amount;
    } else if (cat.includes("salary") || cat.includes("wages received")) {
      if (isReceived) householdSalaryPaise += amount;
    } else if (
      cat.includes("business") ||
      cat.includes("shop") ||
      cat.includes("trade")
    ) {
      if (isReceived) businessIncomePaise += amount;
    } else if (cat.includes("interest")) {
      if (isReceived) interestReceivedPaise += amount;
    } else {
      if (isReceived) otherIncomePaise += amount;
    }
  }

  return {
    cropSalesReceivedPaise,
    cropSalesPendingPaise,
    milkAndProducePaise,
    tractorAndRentalPaise,
    householdSalaryPaise,
    businessIncomePaise,
    interestReceivedPaise,
    otherIncomePaise,
    totalReceivedPaise:
      cropSalesReceivedPaise +
      milkAndProducePaise +
      tractorAndRentalPaise +
      householdSalaryPaise +
      businessIncomePaise +
      interestReceivedPaise +
      otherIncomePaise,
    totalPendingPaise: cropSalesPendingPaise,
  };
}

export function unifiedFinancialMetrics({
  transactions,
  cropSales = [],
  loans = [],
  labourPayments = [],
  inventory = [],
  vehicles = [],
  range,
  asOfDate = todayISO(),
}: {
  transactions: Transaction[];
  cropSales?: CropSale[];
  loans?: Loan[];
  labourPayments?: LabourPayment[];
  inventory?: InventoryItem[];
  vehicles?: Vehicle[];
  range?: DateRange;
  asOfDate?: ISODate;
}): UnifiedFinancialMetrics {
  const currentCashBalancePaise = availableBalance(transactions);
  const periodClosingDate = range ? range.end : asOfDate;
  const periodClosingBalancePaise = closingBalanceAsOf(
    transactions,
    periodClosingDate,
    cropSales
  );

  const aliveTxs = alive(transactions);
  const openingBalancePaise = sumPaise(
    aliveTxs.filter(isOpeningBalance).map((t) => t.amountPaise)
  );

  const isBankMethod = (m?: PaymentMethod) => m === "BANK" || m === "UPI" || m === "CARD";
  const isCashMethod = (m?: PaymentMethod) => m === "CASH" || !m || m === "OTHER";

  const cashInflow = sumPaise(
    aliveTxs
      .filter((t) => (isReceivedIncome(t) || isOpeningBalance(t)) && isCashMethod(t.paymentMethod))
      .map((t) => t.amountPaise)
  );
  const cashOutflow = sumPaise(
    aliveTxs
      .filter((t) => isExpense(t) && isCashMethod(t.paymentMethod))
      .map((t) => t.amountPaise)
  );
  const cashInHandPaise = cashInflow - cashOutflow;

  const bankInflow = sumPaise(
    aliveTxs
      .filter((t) => (isReceivedIncome(t) || isOpeningBalance(t)) && isBankMethod(t.paymentMethod))
      .map((t) => t.amountPaise)
  );
  const bankOutflow = sumPaise(
    aliveTxs
      .filter((t) => isExpense(t) && isBankMethod(t.paymentMethod))
      .map((t) => t.amountPaise)
  );
  const bankBalancePaise = bankInflow - bankOutflow;

  const totals = calculateTotals(transactions, cropSales, range);
  const incomeReceivedPaise = totals.incomePaise;
  const incomePendingPaise = totals.pendingIncomePaise;
  const totalIncomePaise = incomeReceivedPaise + incomePendingPaise;

  const expensesPaidPaise = totals.expensePaise;

  const aliveLabour = alive(labourPayments).filter(
    (l) => !range || inRange(l.paymentDate, range)
  );
  const labourPendingInRange = sumPaise(
    aliveLabour
      .filter((l) => l.status === "PENDING" || l.status === "PARTIAL")
      .map((l) => l.remainingPaise ?? 0)
  );

  const expensesPendingPaise = labourPendingInRange;
  const totalExpensesPaise = expensesPaidPaise + expensesPendingPaise;
  const netCashflowPaise = incomeReceivedPaise - expensesPaidPaise;

  // Receivables
  const aliveLoans = alive(loans);
  const lentLoans = aliveLoans.filter(
    (l) => l.type === "LENT" && l.status !== "COMPLETED"
  );
  const lentPrincipalOutstandingPaise = sumPaise(
    lentLoans.map((l) => loanOutstanding(l))
  );

  const aliveSales = alive(cropSales);
  const pendingCropSalesPaise = sumPaise(
    aliveSales.map((s) => s.pendingPaise || 0)
  );

  const pendingIncomeTxs = alive(transactions).filter(isPendingIncome);
  const pendingOtherIncomePaise = sumPaise(
    pendingIncomeTxs
      .filter((t) => !t.notes?.includes("[cropsale:"))
      .map((t) => t.amountPaise)
  );

  const totalReceivablesPaise =
    lentPrincipalOutstandingPaise +
    pendingCropSalesPaise +
    pendingOtherIncomePaise;

  // Payables
  const borrowedLoans = aliveLoans.filter(
    (l) => l.type === "BORROWED" && l.status !== "COMPLETED"
  );
  const borrowedPrincipalOutstandingPaise = sumPaise(
    borrowedLoans.map((l) => loanOutstanding(l))
  );

  const activeInventory = alive(inventory).filter((i) => !i.isArchived);
  let supplierPayablesPaise = 0;
  for (const item of activeInventory) {
    for (const p of item.purchases ?? []) {
      supplierPayablesPaise += p.pendingPaise || 0;
    }
  }

  const allPendingLabour = alive(labourPayments).filter(
    (l) => l.status === "PENDING" || l.status === "PARTIAL"
  );
  const labourPayablesPaise = sumPaise(
    allPendingLabour.map((l) => l.remainingPaise ?? 0)
  );

  const totalPayablesPaise =
    borrowedPrincipalOutstandingPaise +
    supplierPayablesPaise +
    labourPayablesPaise;

  // Assets & Net Worth
  const inventoryValuationPaise = inventoryValue(activeInventory);
  const activeVehicles = alive(vehicles).filter((v) => v.status === "ACTIVE");
  const vehicleAssetValuePaise = sumPaise(
    activeVehicles.map((v) => v.purchasePricePaise || 0)
  );

  const totalAssetsPaise =
    currentCashBalancePaise +
    totalReceivablesPaise +
    inventoryValuationPaise +
    vehicleAssetValuePaise;

  const totalLiabilitiesPaise = totalPayablesPaise;
  const netWorthPaise = totalAssetsPaise - totalLiabilitiesPaise;

  return {
    currentCashBalancePaise,
    periodClosingBalancePaise,
    openingBalancePaise,
    cashInHandPaise,
    bankBalancePaise,
    incomeReceivedPaise,
    incomePendingPaise,
    totalIncomePaise,
    expensesPaidPaise,
    expensesPendingPaise,
    totalExpensesPaise,
    netCashflowPaise,
    totalReceivablesPaise,
    totalPayablesPaise,
    borrowedPrincipalOutstandingPaise,
    lentPrincipalOutstandingPaise,
    supplierPayablesPaise,
    labourPayablesPaise,
    inventoryValuationPaise,
    vehicleAssetValuePaise,
    netWorthPaise,
    totalAssetsPaise,
    totalLiabilitiesPaise,
  };
}

export interface FamilyFinancialPosition {
  householdIncomePaise: number;
  householdExpensesPaise: number;
  householdNetCashflowPaise: number;
  familyReceivablesPaise: number;
  familyLiabilitiesPaise: number;
  memberBreakdown: Array<{
    memberId: string;
    memberName: string;
    relation: string;
    totalSpendPaise: number;
    transactionCount: number;
  }>;
}

export function familyFinancialPosition({
  transactions,
  familyMembers = [],
  loans = [],
  range,
}: {
  transactions: Transaction[];
  familyMembers?: FamilyMember[];
  loans?: Loan[];
  range?: DateRange;
}): FamilyFinancialPosition {
  const rows = scoped(transactions, range);
  const homeExpenses = rows.filter(
    (t) => t.kind === "EXPENSE" && t.group === "HOME"
  );
  const householdExpensesPaise = sumPaise(homeExpenses.map((t) => t.amountPaise));

  const homeIncome = rows.filter(
    (t) =>
      t.kind === "INCOME" &&
      (t.incomeStatus ?? "RECEIVED") === "RECEIVED" &&
      !isFarmIncomeCategory(t.category)
  );
  const householdIncomePaise = sumPaise(homeIncome.map((t) => t.amountPaise));

  const memberMap = new Map<string, { total: number; count: number }>();
  for (const m of alive(familyMembers)) {
    memberMap.set(m.id, { total: 0, count: 0 });
  }

  for (const t of homeExpenses) {
    for (const m of alive(familyMembers)) {
      if (
        t.notes?.toLowerCase().includes(m.name.toLowerCase()) ||
        t.description.toLowerCase().includes(m.name.toLowerCase())
      ) {
        const curr = memberMap.get(m.id) ?? { total: 0, count: 0 };
        curr.total += t.amountPaise;
        curr.count += 1;
        memberMap.set(m.id, curr);
        break;
      }
    }
  }

  const memberBreakdown = alive(familyMembers).map((m) => {
    const data = memberMap.get(m.id) ?? { total: 0, count: 0 };
    return {
      memberId: m.id,
      memberName: m.name,
      relation: m.relation,
      totalSpendPaise: data.total,
      transactionCount: data.count,
    };
  });

  const personalBorrowed = alive(loans).filter(
    (l) =>
      l.type === "BORROWED" &&
      (l.category === "Personal Loan" || l.category === "Gold Loan") &&
      l.status !== "COMPLETED"
  );
  const familyLiabilitiesPaise = sumPaise(
    personalBorrowed.map((l) => loanOutstanding(l))
  );

  const personalLent = alive(loans).filter(
    (l) => l.type === "LENT" && l.status !== "COMPLETED"
  );
  const familyReceivablesPaise = sumPaise(
    personalLent.map((l) => loanOutstanding(l))
  );

  return {
    householdIncomePaise,
    householdExpensesPaise,
    householdNetCashflowPaise: householdIncomePaise - householdExpensesPaise,
    familyReceivablesPaise,
    familyLiabilitiesPaise,
    memberBreakdown,
  };
}

export function generateUnifiedActivityFeed({
  transactions = [],
  cropSales = [],
  loans = [],
  inventory = [],
  limit = 20,
}: {
  transactions?: Transaction[];
  cropSales?: CropSale[];
  loans?: Loan[];
  inventory?: InventoryItem[];
  limit?: number;
}): UnifiedActivityItem[] {
  const items: UnifiedActivityItem[] = [];
  const handledTxIds = new Set<string>();

  for (const t of alive(transactions)) {
    handledTxIds.add(t.id);
    const isInc = t.kind === "INCOME";
    const isPending = t.incomeStatus === "PENDING";
    items.push({
      id: `tx-${t.id}`,
      date: t.date,
      timestamp: t.createdAt,
      title: t.description || t.category,
      subtitle: `${t.category}${t.vehicleName ? ` · ${t.vehicleName}` : ""}${t.cropName ? ` · ${t.cropName}` : ""}`,
      amountPaise: t.amountPaise,
      type: isInc ? "INCOME" : "EXPENSE",
      category: t.category,
      entity: "transaction",
      recordId: t.id,
      tone: isPending ? "amber" : isInc ? "positive" : "negative",
      isPending,
      notes: t.notes,
    });
  }

  // Standalone crop sales not linked to transactions
  for (const s of alive(cropSales)) {
    const isLinked = Array.from(handledTxIds).some((txId) => {
      const tx = transactions.find((t) => t.id === txId);
      return tx?.notes?.includes(`[cropsale:${s.id}]`);
    });
    if (!isLinked) {
      items.push({
        id: `sale-${s.id}`,
        date: s.saleDate,
        timestamp: s.createdAt,
        title: `Crop Sale: ${s.cropName} (${s.quantitySold} ${s.unit})`,
        subtitle: `Buyer: ${s.buyerName || "Direct Market"}`,
        amountPaise: s.totalAmountPaise,
        type: "INCOME",
        category: "Crop Sale",
        entity: "cropsale",
        recordId: s.id,
        tone: s.pendingPaise > 0 ? "amber" : "positive",
        isPending: s.pendingPaise > 0,
        notes: s.notes,
      });
    }
  }

  // Standalone loan repayments not linked to transactions
  for (const l of alive(loans)) {
    for (const r of l.repayments ?? []) {
      if (r.transactionId && handledTxIds.has(r.transactionId)) {
        continue;
      }
      const isLent = l.type === "LENT";
      items.push({
        id: `loan-rep-${r.id}`,
        date: r.date,
        timestamp: r.createdAt ?? `${r.date}T12:00:00.000Z`,
        title: isLent
          ? `Lending Collection: ${l.partyName}`
          : `Loan Repayment: ${l.partyName}`,
        subtitle: `${l.partyName} · ${l.category || (isLent ? "Money Lent" : "Loan")}`,
        amountPaise: r.amountPaise,
        type: isLent ? "LENDING_COLLECTION" : "LOAN_REPAYMENT",
        category: isLent ? "Lending Received" : "Loan Repayment",
        entity: "loan",
        recordId: l.id,
        tone: isLent ? "positive" : "negative",
        notes: r.notes,
      });
    }
  }

  // Standalone stock purchases not in cash transactions
  for (const it of alive(inventory)) {
    for (const p of it.purchases ?? []) {
      const isLinked = Array.from(handledTxIds).some((txId) => {
        const tx = transactions.find((t) => t.id === txId);
        return (
          tx?.notes?.includes(`[inventory:${it.id}]`) ||
          tx?.notes?.includes(`[purchase:${p.id}]`)
        );
      });
      if (!isLinked && p.paymentStatus !== "PAID") {
        items.push({
          id: `stock-p-${p.id}`,
          date: p.purchaseDate,
          timestamp: p.createdAt ?? `${p.purchaseDate}T12:00:00.000Z`,
          title: `Stock Purchase: ${it.itemName} (${p.quantity} ${p.unit})`,
          subtitle: `Supplier: ${p.supplierName}${p.pendingPaise > 0 ? ` · Pending ₹${(p.pendingPaise / 100).toFixed(0)}` : ""}`,
          amountPaise: p.totalCostPaise,
          type: "STOCK_PURCHASE",
          category: it.category,
          entity: "inventory",
          recordId: it.id,
          tone: p.paymentStatus === "PENDING" ? "amber" : "negative",
          isPending: p.paymentStatus === "PENDING",
          notes: p.notes,
        });
      }
    }
  }

  // Standalone stock usages (not in cash transactions)
  for (const it of alive(inventory)) {
    for (const u of it.usageHistory ?? []) {
      items.push({
        id: `usage-${u.id}`,
        date: u.usageDate,
        timestamp: u.createdAt,
        title: `Material Used: ${it.itemName} (${u.quantityUsed} ${u.unit})`,
        subtitle: `${u.cropName ? `Crop: ${u.cropName}` : "Farm"} · ${u.activity || "Application"}`,
        amountPaise: u.costPaise,
        type: "STOCK_USAGE",
        category: it.category,
        entity: "usage",
        recordId: u.id,
        tone: "sky" as any,
        notes: u.notes,
      });
    }
  }

  items.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp)
  );

  return items.slice(0, limit);
}

export function runFinancialReconciliation({
  transactions = [],
  cropSales = [],
  loans = [],
  labourPayments = [],
  inventory = [],
  vehicles = [],
}: {
  transactions?: Transaction[];
  cropSales?: CropSale[];
  loans?: Loan[];
  labourPayments?: LabourPayment[];
  inventory?: InventoryItem[];
  vehicles?: Vehicle[];
}): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];
  const aliveTxs = alive(transactions);
  const aliveLoans = alive(loans);
  const aliveSales = alive(cropSales);
  const aliveLabour = alive(labourPayments);
  const aliveInventory = alive(inventory);
  const aliveVehicles = alive(vehicles);

  // 1. DUPLICATE TRANSACTIONS
  const seenTxSignatures = new Map<string, string>();
  for (const t of aliveTxs) {
    const signature = `${t.date}_${t.amountPaise}_${t.category}_${t.kind}_${(t.description || "").trim().toLowerCase()}`;
    if (seenTxSignatures.has(signature)) {
      issues.push({
        id: `dup-tx-${t.id}`,
        category: "DUPLICATE_TRANSACTION",
        severity: "WARNING",
        title: "Potential Duplicate Transaction",
        description: `Duplicate found for ₹${(t.amountPaise / 100).toFixed(2)} on ${t.date} (${t.category}).`,
        affectedRecordId: t.id,
        affectedEntity: "transaction",
        suggestedAction: "Review and delete duplicate transaction if recorded twice.",
      });
    } else {
      seenTxSignatures.set(signature, t.id);
    }
  }

  // 2. MISSING LINKED RECORDS
  for (const t of aliveTxs) {
    if (t.vehicleId && !aliveVehicles.some((v) => v.id === t.vehicleId)) {
      issues.push({
        id: `miss-veh-${t.id}`,
        category: "MISSING_LINKED_RECORD",
        severity: "INFO",
        title: "Transaction Linked to Deleted Vehicle",
        description: `Expense ${t.description} is linked to a vehicle ID that no longer exists.`,
        affectedRecordId: t.id,
        affectedEntity: "transaction",
        suggestedAction: "Unlink vehicle reference or re-assign to active vehicle.",
      });
    }
    if (t.labourPaymentId && !aliveLabour.some((l) => l.id === t.labourPaymentId)) {
      issues.push({
        id: `miss-lab-${t.id}`,
        category: "MISSING_LINKED_RECORD",
        severity: "WARNING",
        title: "Missing Labour Payment Record",
        description: `Cash expense is linked to labour payment ${t.labourPaymentId} which is missing.`,
        affectedRecordId: t.id,
        affectedEntity: "transaction",
        suggestedAction: "Verify labour payment ledger.",
      });
    }
  }

  // 3. LOAN REPAYMENT MISMATCHES
  for (const loan of aliveLoans) {
    const recordedRepaid = loanPrincipalRepaid(loan);
    const sumRepayments = (loan.repayments ?? []).reduce(
      (sum, r) => sum + (r.principalPaise || 0),
      0
    );
    if (recordedRepaid !== sumRepayments) {
      issues.push({
        id: `loan-mismatch-${loan.id}`,
        category: "LOAN_MISMATCH",
        severity: "ERROR",
        title: `Repayment Mismatch: ${loan.partyName}`,
        description: `Sum of repayments (₹${(sumRepayments / 100).toFixed(2)}) does not match principal repaid (₹${(recordedRepaid / 100).toFixed(2)}).`,
        affectedRecordId: loan.id,
        affectedEntity: "loan",
        suggestedAction: "Reconcile loan repayment history entries.",
      });
    }
  }

  // 4. INVENTORY DISCREPANCIES
  for (const item of aliveInventory) {
    const audit = reconcileItemStock(item);
    if (audit.difference !== 0) {
      issues.push({
        id: `inv-disc-${item.id}`,
        category: "INVENTORY_DISCREPANCY",
        severity: "WARNING",
        title: `Stock Discrepancy: ${item.itemName}`,
        description: `Recorded remaining (${item.remainingQuantity} ${item.unit}) differs from calculated formula stock (${audit.calculatedStock} ${item.unit}) by ${audit.difference}.`,
        affectedRecordId: item.id,
        affectedEntity: "inventory",
        suggestedAction: "Log a count correction adjustment to reconcile inventory.",
      });
    }
  }

  // 5. NEGATIVE CASH BALANCE CHECK
  const currentCash = availableBalance(aliveTxs);
  if (currentCash < 0) {
    issues.push({
      id: "neg-cash-current",
      category: "NEGATIVE_CASH_BALANCE",
      severity: "ERROR",
      title: "Negative Cash in Hand",
      description: `Current available cash is negative (₹${(currentCash / 100).toFixed(2)}). Recorded expenses exceed received income.`,
      suggestedAction: "Record missing opening cash balance or unrecorded income.",
    });
  }

  // 6. INVALID AMOUNTS OR DATES
  for (const t of aliveTxs) {
    if (!Number.isSafeInteger(t.amountPaise) || t.amountPaise < 0) {
      issues.push({
        id: `inv-amt-${t.id}`,
        category: "INVALID_RECORD",
        severity: "ERROR",
        title: "Invalid Transaction Amount",
        description: `Transaction has an invalid or negative amount: ${t.amountPaise}.`,
        affectedRecordId: t.id,
        affectedEntity: "transaction",
        suggestedAction: "Correct or remove invalid transaction amount.",
      });
    }
  }

  return issues;
}
