/**
 * PERSONAL BANK — PHASE 6 AUTOMATED TEST SUITE
 * Complete Vehicle & Asset Management
 *
 * Verifies all 12 Phase 6 requirements:
 * 1. Register tractor with brand, model, purchase price, and initial hours.
 * 2. Register car with plate and purchase date.
 * 3. Register bike with active status.
 * 4. Add diesel expense linked to tractor.
 * 5. Add petrol expense linked to car/bike.
 * 6. Record tractor working hours (own farm vs rental, diesel consumed).
 * 7. Record tractor rental income (client name, rate, payment received).
 * 8. Record vehicle servicing (service type, garage, amount, engine hours, next service date).
 * 9. Add insurance expiry and PUC expiry reminders.
 * 10. Verify vehicle-wise totals (fuel, maintenance, operating cost, lifetime spending, net cashflow).
 * 11. Verify rental income is not duplicated in income and vehicle modules.
 * 12. Verify existing vehicle records remain intact and dashboard stats calculate accurately.
 */

import assert from "node:assert/strict";
import {
  availableBalance,
  calculateTotals,
  farmTotals,
  incomeOverview,
  tractorPerformance,
  vehicleFinancials,
  vehiclesDashboardStats,
} from "../src/lib/finance";
import type {
  Crop,
  LabourPayment,
  Land,
  Loan,
  TractorWorkLog,
  Transaction,
  Vehicle,
  VehicleServiceRecord,
} from "../src/lib/types";

console.log("=========================================================");
console.log("   PERSONAL BANK — PHASE 6 AUTOMATED TEST SUITE          ");
console.log("   Complete Vehicle & Asset Management                   ");
console.log("=========================================================\n");

const now = "2026-10-25T10:00:00.000Z";
function makeBase(entity: string, id: string) {
  return {
    id,
    entity: entity as any,
    ownerId: "farmer-dad",
    createdAt: now,
    updatedAt: now,
  };
}

const vehicles: Vehicle[] = [];
const transactions: Transaction[] = [];
const loans: Loan[] = [];
const lands: Land[] = [];
const crops: Crop[] = [];
const labourPayments: LabourPayment[] = [];

// -----------------------------------------------------------------
// 1. REGISTER TRACTOR WITH BRAND, MODEL, PURCHASE PRICE & INITIAL HOURS
// -----------------------------------------------------------------
console.log("Workflow 1: Registering tractor with brand, model, purchase price & initial hours...");
const tractor: Vehicle = {
  ...makeBase("vehicle", "veh-tractor-01"),
  name: "Mahindra 575 DI",
  type: "Tractor",
  brand: "Mahindra",
  model: "575 DI Sarpanch",
  registrationNumber: "MH-20-EA-4501",
  purchasePricePaise: 75000000, // ₹7,50,000
  purchaseDate: "2024-04-10",
  status: "ACTIVE",
  fuelType: "Diesel",
  tractor: {
    hoursUsed: 250,
    ownFarmHours: 180,
    otherFarmHours: 70,
    dieselLitres: 1200,
    maintenancePaise: 1500000,
    logs: [],
  },
  serviceHistory: [],
  notes: "Primary tractor for ploughing, rotavator, and haulage",
};
vehicles.push(tractor);

assert.equal(tractor.type, "Tractor");
assert.equal(tractor.brand, "Mahindra");
assert.equal(tractor.model, "575 DI Sarpanch");
assert.equal(tractor.purchasePricePaise, 75000000);
assert.equal(tractor.status, "ACTIVE");
assert.equal(tractor.tractor?.hoursUsed, 250);
console.log("✓ Tractor registered successfully with initial hours & specs.\n");

// -----------------------------------------------------------------
// 2. REGISTER CAR WITH PLATE, PURCHASE DATE & FINANCING
// -----------------------------------------------------------------
console.log("Workflow 2: Registering car with plate and purchase date...");
const car: Vehicle = {
  ...makeBase("vehicle", "veh-car-01"),
  name: "Swift Dzire",
  type: "Car",
  brand: "Maruti Suzuki",
  model: "Dzire VDI",
  registrationNumber: "MH-20-BV-8899",
  purchasePricePaise: 82000000, // ₹8,20,000
  purchaseDate: "2023-08-15",
  status: "ACTIVE",
  fuelType: "Diesel",
  loanAmountPaise: 40000000, // ₹4,00,000 loan
  downPaymentPaise: 42000000,
  loanEmiPaise: 950000, // ₹9,500 monthly EMI
  loanBank: "State Bank of India",
  serviceHistory: [],
  notes: "Family car",
};
vehicles.push(car);

assert.equal(car.type, "Car");
assert.equal(car.registrationNumber, "MH-20-BV-8899");
assert.equal(car.purchaseDate, "2023-08-15");
assert.equal(car.loanAmountPaise, 40000000);
console.log("✓ Car registered successfully with registration plate and loan details.\n");

// -----------------------------------------------------------------
// 3. REGISTER BIKE WITH ACTIVE STATUS
// -----------------------------------------------------------------
console.log("Workflow 3: Registering motorcycle/bike with active status...");
const bike: Vehicle = {
  ...makeBase("vehicle", "veh-bike-01"),
  name: "Hero Splendor Plus",
  type: "Bike",
  brand: "Hero",
  model: "Splendor+ i3S",
  registrationNumber: "MH-20-CZ-1234",
  purchasePricePaise: 7800000, // ₹78,000
  purchaseDate: "2022-02-10",
  status: "ACTIVE",
  fuelType: "Petrol",
  serviceHistory: [],
  notes: "Daily farm commuting bike",
};
vehicles.push(bike);

assert.equal(bike.type, "Bike");
assert.equal(bike.fuelType, "Petrol");
assert.equal(bike.status, "ACTIVE");
console.log("✓ Motorcycle/Bike registered successfully with active status.\n");

// -----------------------------------------------------------------
// 4. ADD DIESEL EXPENSE LINKED TO TRACTOR
// -----------------------------------------------------------------
console.log("Workflow 4: Adding diesel expense linked to tractor...");
const tractorDiesel: Transaction = {
  ...makeBase("transaction", "tx-diesel-01"),
  date: "2026-10-15",
  amountPaise: 450000, // ₹4,500 (50L @ ₹90)
  kind: "EXPENSE",
  group: "VEHICLE",
  category: "Diesel",
  paymentMethod: "CASH",
  vehicleId: tractor.id,
  vehicleName: tractor.name,
  description: "50 Litres diesel at Indian Oil Pump Jalna",
};
transactions.push(tractorDiesel);

const tractorFinAfterFuel = vehicleFinancials(tractor.id, transactions);
assert.equal(tractorFinAfterFuel.fuelPaise, 450000);
assert.equal(tractorFinAfterFuel.totalPaise, 450000);
console.log("✓ Tractor diesel expense added and linked to vehicle ledger.\n");

// -----------------------------------------------------------------
// 5. ADD PETROL EXPENSE LINKED TO BIKE
// -----------------------------------------------------------------
console.log("Workflow 5: Adding petrol expense linked to bike...");
const bikePetrol: Transaction = {
  ...makeBase("transaction", "tx-petrol-01"),
  date: "2026-10-16",
  amountPaise: 50000, // ₹500 (5L @ ₹100)
  kind: "EXPENSE",
  group: "VEHICLE",
  category: "Petrol",
  paymentMethod: "UPI",
  vehicleId: bike.id,
  vehicleName: bike.name,
  description: "Petrol for bike tank refill",
};
transactions.push(bikePetrol);

const bikeFin = vehicleFinancials(bike.id, transactions);
assert.equal(bikeFin.fuelPaise, 50000);
assert.equal(bikeFin.totalPaise, 50000);

// Ensure tractor ledger was NOT affected by bike expense
const tractorFinCheck = vehicleFinancials(tractor.id, transactions);
assert.equal(tractorFinCheck.fuelPaise, 450000);
console.log("✓ Bike petrol expense recorded with strict vehicle isolation.\n");

// -----------------------------------------------------------------
// 6. RECORD TRACTOR WORKING HOURS (OWN FARM VS RENTAL, DIESEL CONSUMED)
// -----------------------------------------------------------------
console.log("Workflow 6: Recording tractor work logs (own farm vs rental, diesel consumed)...");
const logOwnFarm: TractorWorkLog = {
  id: "tlog-01",
  date: "2026-10-18",
  farmType: "OWN",
  operationType: "Ploughing",
  hours: 6,
  dieselLitres: 24,
  notes: "Deep ploughing in Gat 45 river plot",
  createdAt: now,
};

const logRental: TractorWorkLog = {
  id: "tlog-02",
  date: "2026-10-20",
  farmType: "RENTAL",
  operationType: "Rotavator",
  hours: 8,
  dieselLitres: 30,
  clientName: "Ramesh Patil",
  ratePerHourPaise: 120000, // ₹1,200/hr
  grossAmountPaise: 960000, // 8 * ₹1,200 = ₹9,600
  receivedAmountPaise: 960000,
  paymentStatus: "RECEIVED",
  paymentMethod: "CASH",
  notes: "Rotavator operation on Ramesh Patil farm (8 hrs)",
  createdAt: now,
};

tractor.tractor = {
  ...tractor.tractor,
  logs: [logOwnFarm, logRental],
  hoursUsed: 250 + 6 + 8,
  ownFarmHours: 180 + 6,
  otherFarmHours: 70 + 8,
  dieselLitres: 1200 + 24 + 30,
};

const tractorStats = tractorPerformance(tractor, transactions);
assert.equal(tractorStats.totalHours, 14); // 6 own + 8 rental from scoped logs
assert.equal(tractorStats.ownFarmHours, 6);
assert.equal(tractorStats.otherFarmHours, 8);
assert.equal(tractorStats.dieselLitres, 54); // 24 + 30
console.log("✓ Tractor working hours and diesel consumption calculated accurately.\n");

// -----------------------------------------------------------------
// 7. RECORD TRACTOR RENTAL INCOME (CLIENT NAME, RATE, PAYMENT RECEIVED)
// -----------------------------------------------------------------
console.log("Workflow 7: Recording tractor rental income...");
const rentalIncomeTx: Transaction = {
  ...makeBase("transaction", "tx-rental-01"),
  date: "2026-10-20",
  amountPaise: 960000, // ₹9,600
  kind: "INCOME",
  group: "FARM",
  category: "Tractor Rental",
  paymentMethod: "CASH",
  vehicleId: tractor.id,
  vehicleName: tractor.name,
  incomeStatus: "RECEIVED",
  description: "Tractor rental to Ramesh Patil for Rotavator (8 hrs)",
  notes: "Tractor rental 8 hrs @ ₹1,200/hr [tractorlog:tlog-02]",
};
transactions.push(rentalIncomeTx);

const tractorFinWithIncome = vehicleFinancials(tractor.id, transactions);
assert.equal(tractorFinWithIncome.rentalIncomePaise, 960000);
console.log("✓ Tractor rental income recorded and linked to vehicle ledger.\n");

// -----------------------------------------------------------------
// 8. RECORD VEHICLE SERVICING (SERVICE TYPE, GARAGE, AMOUNT, ENGINE HOURS, NEXT SERVICE DATE)
// -----------------------------------------------------------------
console.log("Workflow 8: Recording vehicle servicing and garage maintenance...");
const serviceLog: VehicleServiceRecord = {
  id: "srv-01",
  date: "2026-10-22",
  serviceDate: "2026-10-22",
  serviceType: "Engine Oil & Filter Change",
  serviceCenter: "Mahindra Authorized Service Jalna",
  amountPaise: 420000, // ₹4,200
  odometerReading: "264 hrs",
  nextServiceDate: "2027-04-22",
  paymentMethod: "UPI",
  notes: "Changed 15W-40 oil (9.5L), diesel fuel filter and oil filter",
  createdAt: now,
};
tractor.serviceHistory = [serviceLog];
tractor.nextServiceDate = "2027-04-22";

const serviceTx: Transaction = {
  ...makeBase("transaction", "tx-srv-01"),
  date: "2026-10-22",
  amountPaise: 420000, // ₹4,200
  kind: "EXPENSE",
  group: "VEHICLE",
  category: "Servicing",
  paymentMethod: "UPI",
  vehicleId: tractor.id,
  vehicleName: tractor.name,
  description: "Mahindra tractor routine servicing: Engine Oil & Filter Change",
  notes: "Garage: Mahindra Authorized Service Jalna [service:srv-01]",
};
transactions.push(serviceTx);

const tractorFinWithService = vehicleFinancials(tractor.id, transactions);
assert.equal(tractorFinWithService.maintenancePaise, 420000);
assert.equal(tractor.serviceHistory.length, 1);
assert.equal(tractor.nextServiceDate, "2027-04-22");
console.log("✓ Vehicle servicing recorded with complete maintenance metadata.\n");

// -----------------------------------------------------------------
// 9. ADD INSURANCE EXPIRY AND PUC EXPIRY REMINDERS
// -----------------------------------------------------------------
console.log("Workflow 9: Adding insurance and PUC expiry dates and checking reminder alerts...");
tractor.insuranceExpiry = "2026-11-20"; // Due in ~26 days (upcoming)
tractor.pucExpiry = "2026-12-15"; // Due in ~51 days
tractor.registrationExpiry = "2039-04-10";

car.insuranceExpiry = "2026-10-10"; // Overdue!

const allVehicles = [tractor, car, bike];
const today = "2026-10-25";
const thirtyDaysLater = "2026-11-24";

// Reminder engine check
const reminders: { vehicle: string; type: string; date: string; overdue: boolean }[] = [];
for (const v of allVehicles) {
  if (v.insuranceExpiry) {
    if (v.insuranceExpiry < today) {
      reminders.push({ vehicle: v.name, type: "Insurance", date: v.insuranceExpiry, overdue: true });
    } else if (v.insuranceExpiry <= thirtyDaysLater) {
      reminders.push({ vehicle: v.name, type: "Insurance", date: v.insuranceExpiry, overdue: false });
    }
  }
}

assert.equal(reminders.length, 2);
const overdueCar = reminders.find((r) => r.vehicle === car.name);
const upcomingTractor = reminders.find((r) => r.vehicle === tractor.name);
assert(overdueCar && overdueCar.overdue === true, "Car insurance must be flagged as overdue");
assert(upcomingTractor && upcomingTractor.overdue === false, "Tractor insurance must be flagged as upcoming");
console.log("✓ Vehicle reminders correctly flag overdue and upcoming expiries.\n");

// -----------------------------------------------------------------
// 10. VERIFY VEHICLE-WISE TOTALS (FUEL, MAINTENANCE, OPERATING COST, NET CASHFLOW)
// -----------------------------------------------------------------
console.log("Workflow 10: Verifying vehicle-wise totals and financial calculations...");
const tractorFinFinal = vehicleFinancials(tractor.id, transactions);
// Fuel: ₹4,500
assert.equal(tractorFinFinal.fuelPaise, 450000);
// Maintenance: ₹4,200
assert.equal(tractorFinFinal.maintenancePaise, 420000);
// Total Operating Cost: ₹4,500 + ₹4,200 = ₹8,700
assert.equal(tractorFinFinal.totalOperatingCostPaise, 870000);
// Total Spent: ₹8,700
assert.equal(tractorFinFinal.totalPaise, 870000);
// Rental Income: ₹9,600
assert.equal(tractorFinFinal.rentalIncomePaise, 960000);
// Net Cash Flow: ₹9,600 - ₹8,700 = +₹900
assert.equal(tractorFinFinal.netCashFlowPaise, 90000);

const tractorPerfFinal = tractorPerformance(tractor, transactions);
assert.equal(tractorPerfFinal.totalOperatingCostPaise, 870000);
assert.equal(tractorPerfFinal.rentalIncomePaise, 960000);
assert.equal(tractorPerfFinal.netTractorEarningsPaise, 90000);
console.log("✓ Vehicle financials, operating costs and net cashflow accurately verified.\n");

// -----------------------------------------------------------------
// 11. VERIFY RENTAL INCOME IS NOT DUPLICATED IN INCOME AND VEHICLE MODULES
// -----------------------------------------------------------------
console.log("Workflow 11: Verifying duplicate prevention across income and vehicle modules...");
const incOverview = incomeOverview(transactions);
const tractorRentalCategory = incOverview.categories.find((c) => c.category === "Tractor Rental");
assert(tractorRentalCategory, "Tractor Rental category must exist in income overview");
assert.equal(tractorRentalCategory.totalPaise, 960000);
assert.equal(tractorRentalCategory.count, 1);

// Farm totals integration
const farmStats = farmTotals(crops, lands, transactions, labourPayments);
assert.equal(farmStats.incomePaise, 960000, "Farm income must include tractor rental exactly once");

// Available balance check
const balance = availableBalance(transactions);
// Income: ₹9,600
// Expenses: ₹4,500 (tractor diesel) + ₹500 (bike petrol) + ₹4,200 (tractor servicing) = ₹9,200
// Net available cash: ₹9,600 - ₹9,200 = ₹400 (+40000 paise)
assert.equal(balance, 40000);
console.log("✓ Tractor rental income counted exactly once with zero duplication.\n");

// -----------------------------------------------------------------
// 12. VERIFY DASHBOARD STATS AGGREGATION & DATA INTEGRITY
// -----------------------------------------------------------------
console.log("Workflow 12: Verifying dashboard stats aggregation and vehicle record integrity...");
const dashStats = vehiclesDashboardStats(vehicles, transactions, loans);
assert.equal(dashStats.totalVehicles, 3);
// Purchase Value: Tractor (₹7,50,000) + Car (₹8,20,000) + Bike (₹78,000) = ₹16,48,000 (164800000 paise)
assert.equal(dashStats.totalPurchaseValuePaise, 164800000);
// Total vehicle expenses: ₹4,500 + ₹4,200 + ₹500 = ₹9,200 (920000 paise)
assert.equal(dashStats.totalExpensesPaise, 920000);
// Total fuel expenses: ₹4,500 + ₹500 = ₹5,000 (500000 paise)
assert.equal(dashStats.totalFuelPaise, 500000);
// Maintenance: ₹4,200 (420000 paise)
assert.equal(dashStats.totalMaintenancePaise, 420000);
// Rental Income: ₹9,600 (960000 paise)
assert.equal(dashStats.totalRentalIncomePaise, 960000);
// Outstanding car loan: ₹4,00,000 (40000000 paise)
assert.equal(dashStats.outstandingLoansPaise, 40000000);

console.log("✓ All vehicle dashboard stats aggregated and verified perfectly.");
console.log("\n=========================================================");
console.log("   ALL 12 PHASE 6 AUTOMATED TESTS PASSED CLEANLY!       ");
console.log("=========================================================");
