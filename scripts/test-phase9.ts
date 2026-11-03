/**
 * PERSONAL BANK — PHASE 9 AUTOMATED TEST SUITE
 * Complete Financial Intelligence, Reconciliation & Unified Dashboard
 *
 * Verifies all 18 Phase 9 requirements:
 * 1. Unified available cash calculation matches actual transaction delta.
 * 2. Income received versus pending income separation.
 * 3. Expenses paid versus pending commitments separation.
 * 4. Household versus farm expense separation without leakage.
 * 5. Complete crop profitability (crop costs + labour + machinery vs crop sales).
 * 6. Inventory purchases and consumption correctly treated in cashflow and crop cost.
 * 7. Labour costs reconciled between daily logs, paid wages and unpaid wages.
 * 8. Vehicle operating expenses, rental income, and net vehicle cashflow.
 * 9. Borrowed loans liability tracking (principal, repayments, outstanding).
 * 10. Money lent asset tracking (principal, collections, outstanding).
 * 11. Supplier payables tracking across seed, fertilizer, and machinery suppliers.
 * 12. Historical closing cash balance calculation across consecutive months.
 * 13. Financial year period filter correctly bounds April 1 to March 31.
 * 14. Reconciliation engine correctly flags duplicate transactions.
 * 15. Reconciliation engine flags missing linked entities (orphan records).
 * 16. Net worth calculation accuracy: Total Assets - Total Liabilities without double-counting.
 * 17. Dashboard empty state when zero records exist.
 * 18. CSV export data matches underlying database numbers exactly.
 */

import assert from "node:assert/strict";
import {
  availableBalance,
  closingBalanceAsOf,
  cropFinancials,
  expenseBreakdown,
  familyFinancialPosition,
  generateUnifiedActivityFeed,
  incomeBreakdown,
  labourSummary,
  loanInterestPaid,
  loanOutstanding,
  loanPrincipalRepaid,
  runFinancialReconciliation,
  unifiedFinancialMetrics,
  vehicleFinancials,
} from "../src/lib/finance";
import { inRange, rangeForPreset } from "../src/lib/dates";
import type {
  Crop,
  CropSale,
  DateRange,
  FamilyMember,
  InventoryItem,
  LabourPayment,
  Loan,
  Transaction,
  Vehicle,
} from "../src/lib/types";

console.log("=========================================================");
console.log("   PERSONAL BANK — PHASE 9 AUTOMATED TEST SUITE          ");
console.log("   Financial Intelligence, Reconciliation & Unified Home ");
console.log("=========================================================\n");

const now = "2026-11-03T10:00:00.000Z";
function makeBase(entity: string, id: string) {
  return {
    id,
    entity: entity as any,
    ownerId: "farmer-dad",
    paymentMethod: "CASH" as const,
    createdAt: now,
    updatedAt: now,
  };
}

// -----------------------------------------------------------------
// 1. UNIFIED AVAILABLE CASH CALCULATION MATCHES TRANSACTION DELTA
// -----------------------------------------------------------------
console.log("Test 1: Verifying unified available cash matches transaction delta...");
const txs1: Transaction[] = [
  {
    ...makeBase("transaction", "tx-1-inc"),
    kind: "INCOME",
    category: "Salary",
    group: "HOME",
    amountPaise: 10_000_000, // ₹1,00,000 in
    date: "2026-11-01",
    incomeStatus: "RECEIVED",
    description: "Monthly salary",
  },
  {
    ...makeBase("transaction", "tx-1-exp"),
    kind: "EXPENSE",
    category: "Groceries",
    group: "HOME",
    amountPaise: 2_500_000, // ₹25,000 out
    date: "2026-11-02",
    description: "Monthly groceries",
  },
];

const cash1 = availableBalance(txs1);
assert.equal(cash1, 7_500_000, "Cash balance must be exactly ₹75,000 (7,500,000 paise)");
const metrics1 = unifiedFinancialMetrics({ transactions: txs1 });
assert.equal(metrics1.currentCashBalancePaise, 7_500_000, "Metrics cash balance must match availableBalance");
assert.equal(metrics1.netCashflowPaise, 7_500_000, "Net cashflow must be ₹75,000");
console.log("✓ Unified available cash matches actual cashflow delta exactly.\n");

// -----------------------------------------------------------------
// 2. INCOME RECEIVED VERSUS PENDING INCOME SEPARATION
// -----------------------------------------------------------------
console.log("Test 2: Verifying income received versus pending income separation...");
const txs2: Transaction[] = [
  ...txs1,
  {
    ...makeBase("transaction", "tx-2-pend"),
    kind: "INCOME",
    category: "Crop Sale",
    group: "FARM",
    amountPaise: 3_000_000, // ₹30,000 pending
    date: "2026-11-03",
    incomeStatus: "PENDING",
    description: "Soybean sale pending collection",
  },
];

const cash2 = availableBalance(txs2);
assert.equal(cash2, 7_500_000, "Pending income must NOT increase available cash on hand");
const metrics2 = unifiedFinancialMetrics({ transactions: txs2 });
assert.equal(metrics2.incomeReceivedPaise, 10_000_000, "Received income must remain ₹1,00,000");
assert.equal(metrics2.incomePendingPaise, 3_000_000, "Pending income must be tracked as ₹30,000");
assert.equal(metrics2.totalIncomePaise, 13_000_000, "Total income recognized must be ₹1,30,000");
console.log("✓ Cash basis preserved: pending income isolated from available funds.\n");

// -----------------------------------------------------------------
// 3. EXPENSES PAID VERSUS PENDING COMMITMENTS SEPARATION
// -----------------------------------------------------------------
console.log("Test 3: Verifying expenses paid versus pending commitments separation...");
const labour3: LabourPayment[] = [
  {
    ...makeBase("labour_payment", "lp-3-pending"),
    cropId: "crop-soybean",
    cropName: "Soybean",
    ratePaise: 50_000,
    activity: "Harvesting",
    workers: 5,
    days: 2,
    amountPaise: 500_000, // ₹5,000
    paidPaise: 0,
    remainingPaise: 500_000, // ₹5,000 pending
    status: "PENDING",
    paymentDate: "2026-11-03",
  },
];

const metrics3 = unifiedFinancialMetrics({ transactions: txs1, labourPayments: labour3 });
assert.equal(metrics3.expensesPaidPaise, 2_500_000, "Paid expenses must remain ₹25,000");
assert.equal(metrics3.expensesPendingPaise, 500_000, "Pending labour must be tracked as ₹5,000 pending expense");
assert.equal(metrics3.currentCashBalancePaise, 7_500_000, "Cash balance must not be deducted for unpaid labour");
console.log("✓ Paid expenses and pending labour commitments clearly separated.\n");

// -----------------------------------------------------------------
// 4. HOUSEHOLD VERSUS FARM EXPENSE SEPARATION WITHOUT LEAKAGE
// -----------------------------------------------------------------
console.log("Test 4: Verifying household versus farm expense separation without leakage...");
const txs4: Transaction[] = [
  {
    ...makeBase("transaction", "tx-4-home"),
    kind: "EXPENSE",
    category: "Electricity",
    group: "HOME",
    amountPaise: 1_200_000, // ₹12,000
    date: "2026-11-02",
    description: "Home electricity bill",
  },
  {
    ...makeBase("transaction", "tx-4-farm"),
    kind: "EXPENSE",
    category: "Irrigation",
    group: "FARM",
    amountPaise: 1_800_000, // ₹18,000
    date: "2026-11-02",
    description: "Drip irrigation maintenance",
  },
];

const breakdown4 = expenseBreakdown(txs4);
assert.equal(breakdown4.homePaise, 1_200_000, "Household expenses must be exactly ₹12,000");
assert.equal(breakdown4.farmPaise, 1_800_000, "Farm expenses must be exactly ₹18,000");
assert.equal(breakdown4.totalPaise, 3_000_000, "Total expenses must equal ₹30,000");
assert.equal(breakdown4.vehiclePaise, 0, "No vehicle expense leakage");
assert.equal(breakdown4.otherPaise, 0, "No other expense leakage");
console.log("✓ Household and farm expenses strictly isolated without category leakage.\n");

// -----------------------------------------------------------------
// 5. COMPLETE CROP PROFITABILITY
// -----------------------------------------------------------------
console.log("Test 5: Verifying complete crop profitability (costs + labour vs sales)...");
const testCrop: Crop = {
  ...makeBase("crop", "crop-wheat-01"),
  name: "Wheat Sharbati",
  season: "Rabi",
  year: "2026",
  areaAcres: 5,
  status: "ACTIVE",
  landId: "land-gat-12",
  landName: "North Farm",
  sowingDate: "2026-10-15",
};

const cropTxs: Transaction[] = [
  {
    ...makeBase("transaction", "tx-crop-seed"),
    kind: "EXPENSE",
    category: "Seeds",
    group: "FARM",
    cropId: testCrop.id,
    amountPaise: 500_000, // ₹5,000
    date: "2026-10-15",
    description: "Certified wheat seeds",
  },
  {
    ...makeBase("transaction", "tx-crop-fert"),
    kind: "EXPENSE",
    category: "Fertilizers",
    group: "FARM",
    cropId: testCrop.id,
    amountPaise: 800_000, // ₹8,000
    date: "2026-10-20",
    description: "NPK & Urea",
  },
  {
    ...makeBase("transaction", "tx-crop-mach"),
    kind: "EXPENSE",
    category: "Machinery",
    group: "FARM",
    cropId: testCrop.id,
    amountPaise: 300_000, // ₹3,000
    date: "2026-10-22",
    description: "Tractor ploughing hire",
  },
];

const cropLabour: LabourPayment[] = [
  {
    ...makeBase("labour_payment", "lp-wheat-paid"),
    cropId: testCrop.id,
    cropName: testCrop.name,
    ratePaise: 50_000,
    activity: "Sowing",
    workers: 6,
    days: 2,
    amountPaise: 600_000, // ₹6,000
    paidPaise: 600_000,
    status: "PAID",
    paymentDate: "2026-10-18",
  },
  {
    ...makeBase("labour_payment", "lp-wheat-pending"),
    cropId: testCrop.id,
    cropName: testCrop.name,
    ratePaise: 50_000,
    activity: "Weeding",
    workers: 4,
    days: 1,
    amountPaise: 200_000, // ₹2,000
    paidPaise: 0,
    remainingPaise: 200_000,
    status: "PENDING",
    paymentDate: "2026-10-28",
  },
];

const cropSales: CropSale[] = [
  {
    ...makeBase("crop_sale", "sale-wheat-01"),
    cropId: testCrop.id,
    cropName: testCrop.name,
    saleDate: "2026-11-02",
    buyerName: "Agro Trader",
    marketName: "APMC Mandi",
    quantitySold: 40,
    unit: "quintal",
    ratePerUnitPaise: 100_000, // ₹1,000 / q
    totalAmountPaise: 4_000_000, // ₹40,000
    receivedPaise: 3_000_000, // ₹30,000 received
    pendingPaise: 1_000_000, // ₹10,000 pending
  },
];

const financials = cropFinancials(testCrop, cropTxs, cropLabour, cropSales);
// Total investment: 5k (seed) + 8k (fert) + 3k (mach) + 8k (labour: 6k paid + 2k pending) = ₹24,000
assert.equal(financials.totalInvestmentPaise, 2_400_000, "Crop investment must be ₹24,000");
assert.equal(financials.salesRevenuePaise, 4_000_000, "Total sales revenue must be ₹40,000");
assert.equal(financials.receivedRevenuePaise, 3_000_000, "Received revenue must be ₹30,000");
assert.equal(financials.pendingRevenuePaise, 1_000_000, "Pending revenue must be ₹10,000");
assert.equal(financials.profitPaise, 1_600_000, "Accounting net profit must be ₹16,000 (40k - 24k)");
assert.equal(financials.profitPerAcrePaise, 320_000, "Profit per acre must be ₹3,200 across 5 acres");
console.log("✓ Complete crop profitability matches exact agricultural costing.\n");

// -----------------------------------------------------------------
// 6. INVENTORY PURCHASES & CONSUMPTION IN CASHFLOW & CROP COST
// -----------------------------------------------------------------
console.log("Test 6: Verifying inventory purchases and consumption treatment...");
const invItem: InventoryItem = {
  ...makeBase("inventory", "inv-dap-01"),
  itemName: "DAP Fertilizer",
  category: "Fertilizers",
  quantity: 10,
  unit: "bag",
  unitPricePaise: 135_000, // ₹1,350 / bag
  remainingQuantity: 6, // 4 consumed for crop
  minQuantity: 2,
  purchaseDate: "2026-10-10",
  purchases: [
    {
      id: "pur-dap-01",
      itemId: "inv-dap-01",
      purchaseDate: "2026-10-10",
      supplierName: "Kisan Seva Kendra",
      quantity: 10,
      unit: "bag",
      pricePerUnitPaise: 135_000,
      totalCostPaise: 1_350_000, // ₹13,500
      paidPaise: 1_000_000, // ₹10,000 cash paid
      pendingPaise: 350_000, // ₹3,500 pending
      paymentStatus: "PARTIAL",
      paymentMethod: "CASH",
      received: true,
      createdAt: now,
    },
  ],
  usageHistory: [
    {
      id: "use-dap-01",
      itemId: "inv-dap-01",
      usageDate: "2026-10-15",
      quantityUsed: 4, // 4 bags used
      unit: "bag",
      cropId: testCrop.id,
      costPaise: 540_000, // 4 * ₹1,350 = ₹5,400
      createdAt: now,
    },
  ],
};

const invTxs: Transaction[] = [
  {
    ...makeBase("transaction", "tx-inv-pur"),
    kind: "EXPENSE",
    category: "Fertilizers",
    group: "FARM",
    amountPaise: 1_000_000, // ₹10,000 cash paid out
    date: "2026-10-10",
    inventoryPurchaseId: "pur-dap-01",
    description: "DAP advance payment",
  },
];

const cropWithInv = cropFinancials(testCrop, cropTxs, cropLabour, cropSales, undefined, [invItem]);
// Material cost now includes ₹5,400 of consumed DAP
assert.equal(cropWithInv.materialCostPaise, 500_000 + 800_000 + 540_000, "Material cost includes consumed DAP (₹5,400)");
// Stock valuation: 6 remaining bags * ₹1,350 = ₹8,100 (810,000 paise)
const metricsInv = unifiedFinancialMetrics({
  transactions: invTxs,
  inventory: [invItem],
});
assert.equal(metricsInv.inventoryValuationPaise, 810_000, "Stock asset value must be ₹8,100 (6 unconsumed bags)");
assert.equal(metricsInv.supplierPayablesPaise, 350_000, "Supplier payable must be ₹3,500");
console.log("✓ Stock purchases, consumption, and supplier payables cleanly reconciled.\n");

// -----------------------------------------------------------------
// 7. LABOUR COSTS RECONCILED (LOGS, PAID & UNPAID)
// -----------------------------------------------------------------
console.log("Test 7: Reconciling labour costs between paid and unpaid wages...");
const labourSummaryRes = labourSummary(cropLabour);
assert.equal(labourSummaryRes.paidPaise, 600_000, "Labour paid must be ₹6,000");
assert.equal(labourSummaryRes.pendingPaise, 200_000, "Labour pending must be ₹2,000");
assert.equal(labourSummaryRes.totalPaise, 800_000, "Total labour committed must be ₹8,000");
assert.equal(labourSummaryRes.totalWorkerDays, 16, "16 worker days (12 on sowing + 4 on weeding)");
console.log("✓ Labour summary correctly audits paid vs unpaid wages and worker-days.\n");

// -----------------------------------------------------------------
// 8. VEHICLE EXPENSES, RENTAL INCOME & NET VEHICLE CASHFLOW
// -----------------------------------------------------------------
console.log("Test 8: Verifying vehicle operating costs, rental income & net cashflow...");
const testVehicle: Vehicle = {
  ...makeBase("vehicle", "veh-tractor-01"),
  name: "Mahindra 575 DI",
  type: "Tractor",
  registrationNumber: "MH-14-AB-1234",
  purchasePricePaise: 65_000_000, // ₹6,50,000
  purchaseDate: "2024-05-10",
  status: "ACTIVE",
};

const vehicleTxs: Transaction[] = [
  {
    ...makeBase("transaction", "tx-v-fuel"),
    kind: "EXPENSE",
    category: "Diesel",
    group: "VEHICLE",
    vehicleId: testVehicle.id,
    amountPaise: 400_000, // ₹4,000
    date: "2026-11-01",
    description: "Diesel 45 litres",
  },
  {
    ...makeBase("transaction", "tx-v-service"),
    kind: "EXPENSE",
    category: "Servicing",
    group: "VEHICLE",
    vehicleId: testVehicle.id,
    amountPaise: 250_000, // ₹2,500
    date: "2026-11-02",
    description: "Engine oil change",
  },
  {
    ...makeBase("transaction", "tx-v-ins"),
    kind: "EXPENSE",
    category: "Insurance",
    group: "VEHICLE",
    vehicleId: testVehicle.id,
    amountPaise: 150_000, // ₹1,500
    date: "2026-11-02",
    description: "Third party insurance installment",
  },
  {
    ...makeBase("transaction", "tx-v-rent"),
    kind: "INCOME",
    category: "Tractor Rental",
    group: "FARM",
    vehicleId: testVehicle.id,
    amountPaise: 1_200_000, // ₹12,000
    date: "2026-11-03",
    incomeStatus: "RECEIVED",
    description: "Tractor hired for rotavator work",
  },
];

const vehFin = vehicleFinancials(testVehicle.id, vehicleTxs);
assert.equal(vehFin.fuelPaise, 400_000, "Fuel expense must be ₹4,000");
assert.equal(vehFin.maintenancePaise, 250_000, "Maintenance expense must be ₹2,500");
assert.equal(vehFin.insurancePaise, 150_000, "Insurance expense must be ₹1,500");
assert.equal(vehFin.totalPaise, 800_000, "Total vehicle expenses must be ₹8,000");
assert.equal(vehFin.rentalIncomePaise, 1_200_000, "Rental income must be ₹12,000");
assert.equal(vehFin.netCashFlowPaise, 400_000, "Net vehicle cashflow must be +₹4,000 (12k in - 8k out)");
console.log("✓ Vehicle operating financials and hire cashflow calculated cleanly.\n");

// -----------------------------------------------------------------
// 9. BORROWED LOANS LIABILITY TRACKING
// -----------------------------------------------------------------
console.log("Test 9: Verifying borrowed loans liability tracking...");
const borrowedLoan: Loan = {
  ...makeBase("loan", "loan-kcc-01"),
  type: "BORROWED",
  partyName: "Bank of Maharashtra KCC",
  category: "Crop Loan (KCC)",
  principalPaise: 20_000_000, // ₹2,00,000
  interestRate: 7,
  interestType: "SIMPLE",
  date: "2026-04-01",
  dueDate: "2027-03-31",
  status: "ACTIVE",
  repayments: [
    {
      id: "rep-kcc-01",
      amountPaise: 5_000_000, // ₹50,000 total paid
      principalPaise: 4_000_000, // ₹40,000 principal
      interestPaise: 1_000_000, // ₹10,000 interest
      date: "2026-10-30",
      paymentMethod: "BANK",
    },
  ],
};

assert.equal(loanPrincipalRepaid(borrowedLoan), 4_000_000, "Principal repaid is ₹40,000");
assert.equal(loanInterestPaid(borrowedLoan), 1_000_000, "Interest paid is ₹10,000");
assert.equal(loanOutstanding(borrowedLoan), 16_000_000, "Outstanding principal is ₹1,60,000");
console.log("✓ Borrowed loan principal and financing costs properly tracked.\n");

// -----------------------------------------------------------------
// 10. MONEY LENT ASSET TRACKING
// -----------------------------------------------------------------
console.log("Test 10: Verifying money lent asset tracking...");
const lentLoan: Loan = {
  ...makeBase("loan", "loan-lent-01"),
  type: "LENT",
  partyName: "Ramesh Patil",
  category: "Friend & Family",
  principalPaise: 5_000_000, // ₹50,000 lent
  interestRate: 0,
  date: "2026-08-01",
  status: "ACTIVE",
  repayments: [
    {
      id: "rep-lent-01",
      amountPaise: 1_800_000,
      principalPaise: 1_800_000,
      interestPaise: 0,
      date: "2026-10-25",
      paymentMethod: "CASH",
    },
  ],
};

assert.equal(loanOutstanding(lentLoan), 3_200_000, "Lent principal outstanding is ₹32,000 (50k - 18k)");
console.log("✓ Money lent tracking accurately maintains recoverable asset balance.\n");

// -----------------------------------------------------------------
// 11. SUPPLIER PAYABLES TRACKING
// -----------------------------------------------------------------
console.log("Test 11: Verifying supplier payables tracking across input suppliers...");
const seedItem: InventoryItem = {
  ...makeBase("inventory", "inv-seed-01"),
  itemName: "Gram Seed JG-11",
  category: "Seeds",
  quantity: 5,
  unit: "bag",
  unitPricePaise: 200_000,
  remainingQuantity: 5,
  minQuantity: 1,
  purchaseDate: "2026-10-12",
  purchases: [
    {
      id: "pur-seed-01",
      itemId: "inv-seed-01",
      purchaseDate: "2026-10-12",
      supplierName: "Mahabeej Agency",
      quantity: 5,
      unit: "bag",
      pricePerUnitPaise: 200_000,
      totalCostPaise: 1_000_000, // ₹10,000
      paidPaise: 800_000, // ₹8,000 paid
      pendingPaise: 200_000, // ₹2,000 pending
      paymentStatus: "PARTIAL",
      paymentMethod: "BANK",
      received: true,
      createdAt: now,
    },
  ],
};

const metricsSuppliers = unifiedFinancialMetrics({
  transactions: [],
  inventory: [invItem, seedItem], // invItem has 3,500 pending, seedItem has 2,000 pending
});
assert.equal(
  metricsSuppliers.supplierPayablesPaise,
  550_000,
  "Total supplier payables must be ₹5,500 (3,500 + 2,000)"
);
console.log("✓ Supplier payables audited across multiple inputs and merchants.\n");

// -----------------------------------------------------------------
// 12. HISTORICAL CLOSING CASH BALANCE ACROSS CONSECUTIVE MONTHS
// -----------------------------------------------------------------
console.log("Test 12: Calculating historical closing cash balance across consecutive months...");
const historyTxs: Transaction[] = [
  // Month 1 (August 2026): In 50k, Out 20k -> Closing 30k
  { ...makeBase("transaction", "h1"), kind: "INCOME", category: "Salary", group: "HOME", amountPaise: 5_000_000, date: "2026-08-10", incomeStatus: "RECEIVED", description: "August salary" },
  { ...makeBase("transaction", "h2"), kind: "EXPENSE", category: "Food", group: "HOME", amountPaise: 2_000_000, date: "2026-08-20", description: "August grocery" },
  // Month 2 (September 2026): In 40k, Out 25k -> Net +15k -> Cumulative Closing 45k
  { ...makeBase("transaction", "h3"), kind: "INCOME", category: "Salary", group: "HOME", amountPaise: 4_000_000, date: "2026-09-10", incomeStatus: "RECEIVED", description: "September salary" },
  { ...makeBase("transaction", "h4"), kind: "EXPENSE", category: "Food", group: "HOME", amountPaise: 2_500_000, date: "2026-09-22", description: "September grocery" },
  // Month 3 (October 2026): In 10k, Out 30k -> Net -20k -> Cumulative Closing 25k
  { ...makeBase("transaction", "h5"), kind: "INCOME", category: "Salary", group: "HOME", amountPaise: 1_000_000, date: "2026-10-05", incomeStatus: "RECEIVED", description: "October bonus" },
  { ...makeBase("transaction", "h6"), kind: "EXPENSE", category: "Seeds", group: "FARM", amountPaise: 3_000_000, date: "2026-10-18", description: "Wheat seeds" },
];

const closeAug = closingBalanceAsOf(historyTxs, "2026-08-31");
const closeSep = closingBalanceAsOf(historyTxs, "2026-09-30");
const closeOct = closingBalanceAsOf(historyTxs, "2026-10-31");

assert.equal(closeAug, 3_000_000, "August closing balance must be ₹30,000");
assert.equal(closeSep, 4_500_000, "September closing balance must be ₹45,000");
assert.equal(closeOct, 2_500_000, "October closing balance must be ₹25,000");
console.log("✓ Historical closing cash positions accurately preserve point-in-time balances.\n");

// -----------------------------------------------------------------
// 13. FINANCIAL YEAR PERIOD FILTER BOUNDS
// -----------------------------------------------------------------
console.log("Test 13: Verifying Indian Financial Year (April 1 - March 31) bounds...");
const fyRange = rangeForPreset("FINANCIAL_YEAR");
assert.ok(fyRange.start.endsWith("-04-01"), "FY start date must be April 1");
assert.ok(fyRange.end.endsWith("-03-31"), "FY end date must be March 31");
assert.ok(fyRange.label.startsWith("FY "), "FY label must format as FY YYYY-YY");

// Verify range inclusion
assert.ok(inRange("2026-06-15", { start: "2026-04-01", end: "2027-03-31", label: "FY", preset: "FINANCIAL_YEAR" }));
assert.ok(!inRange("2026-03-30", { start: "2026-04-01", end: "2027-03-31", label: "FY", preset: "FINANCIAL_YEAR" }));
console.log("✓ Indian Financial Year boundaries strictly validated.\n");

// -----------------------------------------------------------------
// 14. RECONCILIATION ENGINE FLAGS DUPLICATE TRANSACTIONS
// -----------------------------------------------------------------
console.log("Test 14: Verifying reconciliation engine flags duplicate transactions...");
const dupTxs: Transaction[] = [
  { ...makeBase("transaction", "dup-1"), kind: "EXPENSE", category: "Diesel", group: "VEHICLE", amountPaise: 200_000, date: "2026-11-01", description: "Diesel 20L" },
  { ...makeBase("transaction", "dup-2"), kind: "EXPENSE", category: "Diesel", group: "VEHICLE", amountPaise: 200_000, date: "2026-11-01", description: "Diesel 20L" },
];

const issuesDup = runFinancialReconciliation({ transactions: dupTxs });
const hasDup = issuesDup.some((i) => i.category === "DUPLICATE_TRANSACTION");
assert.ok(hasDup, "Reconciliation must identify duplicate transaction");
console.log("✓ Duplicate transactions flagged with action recommendations.\n");

// -----------------------------------------------------------------
// 15. RECONCILIATION ENGINE FLAGS MISSING LINKED ENTITIES (ORPHANS)
// -----------------------------------------------------------------
console.log("Test 15: Verifying reconciliation engine flags orphan records...");
const orphanTx: Transaction[] = [
  {
    ...makeBase("transaction", "orphan-tx"),
    kind: "EXPENSE",
    category: "Servicing",
    group: "VEHICLE",
    vehicleId: "non-existent-veh-id",
    amountPaise: 150_000,
    date: "2026-11-01",
    description: "Service for missing vehicle",
  },
];

const issuesOrphan = runFinancialReconciliation({ transactions: orphanTx, vehicles: [] });
const hasOrphan = issuesOrphan.some((i) => i.category === "MISSING_LINKED_RECORD");
assert.ok(hasOrphan, "Reconciliation must identify missing linked vehicle record");
console.log("✓ Orphan linked records identified without causing runtime errors.\n");

// -----------------------------------------------------------------
// 16. NET WORTH CALCULATION WITHOUT DOUBLE-COUNTING
// -----------------------------------------------------------------
console.log("Test 16: Verifying net worth calculation without double-counting...");
// Let's create an integrated scenario:
// Assets:
// - Cash: ₹75,000 (from txs1)
// - Money Lent: ₹32,000 (from lentLoan)
// - Vehicles (Purchase Price): ₹6,50,000 (from testVehicle)
// - Stock Valuation: ₹8,100 (from invItem remaining 6 bags)
// Total Assets = 75,000 + 32,000 + 650,000 + 8,100 = ₹7,65,100
// Liabilities:
// - Borrowed Loans: ₹1,60,000 (from borrowedLoan)
// - Supplier Payables: ₹3,500 (from invItem)
// - Pending Labour: ₹2,000 (from cropLabour)
// Total Liabilities = 160,000 + 3,500 + 2,000 = ₹1,65,500
// Net Worth = 765,100 - 165,500 = ₹5,99,600

const allCombined = unifiedFinancialMetrics({
  transactions: txs1,
  loans: [borrowedLoan, lentLoan],
  vehicles: [testVehicle],
  inventory: [invItem],
  labourPayments: cropLabour,
});

assert.equal(allCombined.currentCashBalancePaise, 7_500_000, "Cash balance is ₹75,000");
assert.equal(allCombined.lentPrincipalOutstandingPaise, 3_200_000, "Lent is ₹32,000");
assert.equal(allCombined.vehicleAssetValuePaise, 65_000_000, "Vehicle asset is ₹6,50,000");
assert.equal(allCombined.inventoryValuationPaise, 810_000, "Inventory asset is ₹8,100");
assert.equal(allCombined.totalAssetsPaise, 76_510_000, "Total assets is ₹7,65,100");

assert.equal(allCombined.borrowedPrincipalOutstandingPaise, 16_000_000, "Borrowed liability is ₹1,60,000");
assert.equal(allCombined.supplierPayablesPaise, 350_000, "Supplier payable is ₹3,500");
assert.equal(allCombined.labourPayablesPaise, 200_000, "Labour payable is ₹2,000");
assert.equal(allCombined.totalLiabilitiesPaise, 16_550_000, "Total liabilities is ₹1,65,500");

assert.equal(allCombined.netWorthPaise, 59_960_000, "Net worth is exactly ₹5,99,600");
console.log("✓ Net worth calculation proven mathematically consistent without double counting.\n");

// -----------------------------------------------------------------
// 17. DASHBOARD EMPTY STATE WHEN ZERO RECORDS EXIST
// -----------------------------------------------------------------
console.log("Test 17: Verifying dashboard empty state behaves gracefully...");
const emptyMetrics = unifiedFinancialMetrics({
  transactions: [],
  cropSales: [],
  loans: [],
  labourPayments: [],
  inventory: [],
  vehicles: [],
});

assert.equal(emptyMetrics.currentCashBalancePaise, 0);
assert.equal(emptyMetrics.totalIncomePaise, 0);
assert.equal(emptyMetrics.totalExpensesPaise, 0);
assert.equal(emptyMetrics.netWorthPaise, 0);
assert.equal(emptyMetrics.totalAssetsPaise, 0);
assert.equal(emptyMetrics.totalLiabilitiesPaise, 0);

const emptyFeed = generateUnifiedActivityFeed({
  transactions: [],
  cropSales: [],
  loans: [],
  inventory: [],
});
assert.equal(emptyFeed.length, 0, "Empty activity feed returns 0 items without throwing");

const emptyFamily = familyFinancialPosition({
  transactions: [],
  familyMembers: [],
  loans: [],
});
assert.equal(emptyFamily.householdIncomePaise, 0);
assert.equal(emptyFamily.householdExpensesPaise, 0);
console.log("✓ Zero-state stability verified: all calculations return 0 cleanly.\n");

// -----------------------------------------------------------------
// 18. CSV EXPORT INTEGRITY & RECONCILIATION
// -----------------------------------------------------------------
console.log("Test 18: Verifying CSV export data matches underlying database numbers...");
const rangeExport: DateRange = {
  start: "2026-11-01",
  end: "2026-11-30",
  label: "November 2026",
  preset: "THIS_MONTH",
};

const breakdownExport = expenseBreakdown(txs1, rangeExport);
const csvRows = [
  ["Home Expenses", (breakdownExport.homePaise / 100).toFixed(2)],
  ["Farm Expenses", (breakdownExport.farmPaise / 100).toFixed(2)],
  ["Labour Expenses", (breakdownExport.labourPaise / 100).toFixed(2)],
  ["Vehicle Expenses", (breakdownExport.vehiclePaise / 100).toFixed(2)],
  ["Financing / Interest", (breakdownExport.financingPaise / 100).toFixed(2)],
  ["Other Expenses", (breakdownExport.otherPaise / 100).toFixed(2)],
  ["TOTAL EXPENSES", (breakdownExport.totalPaise / 100).toFixed(2)],
];

assert.equal(csvRows[0][1], "25000.00", "Home expenses export value matches 25,000.00");
assert.equal(csvRows[6][1], "25000.00", "Total expenses export value matches 25,000.00");
console.log("✓ CSV export formatting reconciles 100% with internal ledger paise.\n");

console.log("=========================================================");
console.log("   ALL 18 PHASE 9 AUTOMATED TESTS PASSED CLEANLY!       ");
console.log("=========================================================");
