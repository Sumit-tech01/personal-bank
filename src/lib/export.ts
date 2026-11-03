import {
  cropFinancials,
  expenseBreakdown,
  inventoryItemValuation,
  loanOutstanding,
  loanPrincipalRepaid,
  vehicleFinancials,
} from "./finance";
import { formatDate } from "./dates";
import { formatNumber } from "./money";
import type {
  Crop,
  CropSale,
  DateRange,
  InventoryItem,
  LabourPayment,
  Loan,
  Transaction,
  Vehicle,
} from "./types";

function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const content = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportMonthlySummaryCSV(
  transactions: Transaction[],
  cropSales: CropSale[],
  range: DateRange
): void {
  const breakdown = expenseBreakdown(transactions, range);
  const headers = ["Category Group", "Amount (INR)", "Share (%)"];
  const total = breakdown.totalPaise / 100 || 1;

  const rows: (string | number)[][] = [
    ["Home Expenses", (breakdown.homePaise / 100).toFixed(2), ((breakdown.homePaise / 100 / total) * 100).toFixed(1)],
    ["Farm Expenses", (breakdown.farmPaise / 100).toFixed(2), ((breakdown.farmPaise / 100 / total) * 100).toFixed(1)],
    ["Labour Expenses", (breakdown.labourPaise / 100).toFixed(2), ((breakdown.labourPaise / 100 / total) * 100).toFixed(1)],
    ["Vehicle Expenses", (breakdown.vehiclePaise / 100).toFixed(2), ((breakdown.vehiclePaise / 100 / total) * 100).toFixed(1)],
    ["Financing / Interest", (breakdown.financingPaise / 100).toFixed(2), ((breakdown.financingPaise / 100 / total) * 100).toFixed(1)],
    ["Other Expenses", (breakdown.otherPaise / 100).toFixed(2), ((breakdown.otherPaise / 100 / total) * 100).toFixed(1)],
    ["TOTAL EXPENSES", (breakdown.totalPaise / 100).toFixed(2), "100.0"],
  ];

  downloadCSV(`PersonalBank_Financial_Summary_${range.label.replace(/[^a-zA-Z0-9]/g, "_")}`, headers, rows);
}

export function exportAnnualSummaryCSV(
  transactions: Transaction[],
  year: string
): void {
  const range: DateRange = {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: year,
    preset: "CUSTOM",
  };
  const breakdown = expenseBreakdown(transactions, range);
  const headers = ["Category Group", "Amount (INR)", "Share (%)"];
  const total = breakdown.totalPaise / 100 || 1;

  const rows: (string | number)[][] = [
    ["Home Expenses", (breakdown.homePaise / 100).toFixed(2), ((breakdown.homePaise / 100 / total) * 100).toFixed(1)],
    ["Farm Expenses", (breakdown.farmPaise / 100).toFixed(2), ((breakdown.farmPaise / 100 / total) * 100).toFixed(1)],
    ["Labour Expenses", (breakdown.labourPaise / 100).toFixed(2), ((breakdown.labourPaise / 100 / total) * 100).toFixed(1)],
    ["Vehicle Expenses", (breakdown.vehiclePaise / 100).toFixed(2), ((breakdown.vehiclePaise / 100 / total) * 100).toFixed(1)],
    ["Financing / Interest", (breakdown.financingPaise / 100).toFixed(2), ((breakdown.financingPaise / 100 / total) * 100).toFixed(1)],
    ["Other Expenses", (breakdown.otherPaise / 100).toFixed(2), ((breakdown.otherPaise / 100 / total) * 100).toFixed(1)],
    ["TOTAL EXPENSES", (breakdown.totalPaise / 100).toFixed(2), "100.0"],
  ];

  downloadCSV(`PersonalBank_Annual_Summary_${year}`, headers, rows);
}

export function exportCropProfitabilityCSV(
  crops: Crop[],
  transactions: Transaction[],
  labourPayments: LabourPayment[],
  cropSales: CropSale[],
  inventory: InventoryItem[]
): void {
  const headers = [
    "Crop Name",
    "Season",
    "Land Parcel",
    "Area (Acres)",
    "Status",
    "Material Cost (INR)",
    "Labour Cost (INR)",
    "Machinery Cost (INR)",
    "Total Investment (INR)",
    "Sales Revenue (INR)",
    "Received Revenue (INR)",
    "Pending Collections (INR)",
    "Net Profit / Loss (INR)",
    "Cost per Acre (INR)",
    "Profit per Acre (INR)",
  ];

  const rows = crops.map((crop) => {
    const fin = cropFinancials(crop, transactions, labourPayments, cropSales, undefined, inventory);
    return [
      crop.name,
      crop.season,
      crop.landName || "N/A",
      crop.areaAcres,
      crop.status,
      (fin.materialCostPaise / 100).toFixed(2),
      (fin.labourCostPaise / 100).toFixed(2),
      (fin.machineryCostPaise / 100).toFixed(2),
      (fin.totalInvestmentPaise / 100).toFixed(2),
      (fin.salesRevenuePaise / 100).toFixed(2),
      (fin.receivedRevenuePaise / 100).toFixed(2),
      (fin.pendingRevenuePaise / 100).toFixed(2),
      (fin.profitPaise / 100).toFixed(2),
      (fin.costPerAcrePaise / 100).toFixed(2),
      (fin.profitPerAcrePaise / 100).toFixed(2),
    ];
  });

  downloadCSV("PersonalBank_Crop_Profitability_Report", headers, rows);
}

export function exportHouseholdExpensesCSV(
  transactions: Transaction[],
  range?: DateRange
): void {
  const headers = ["Date", "Category", "Amount (INR)", "Payment Method", "Description", "Notes"];
  const rows = transactions
    .filter((t) => t.kind === "EXPENSE" && t.group === "HOME")
    .map((t) => [
      t.date,
      t.category,
      (t.amountPaise / 100).toFixed(2),
      t.paymentMethod || "CASH",
      t.description,
      t.notes || "",
    ]);

  downloadCSV("PersonalBank_Household_Expenses", headers, rows);
}

export function exportLoanLendingCSV(loans: Loan[]): void {
  const headers = [
    "Type",
    "Party / Lender Name",
    "Category",
    "Start Date",
    "Due Date",
    "Interest Rate (%)",
    "Principal Amount (INR)",
    "Principal Repaid (INR)",
    "Outstanding Balance (INR)",
    "Status",
  ];

  const rows = loans.map((loan) => [
    loan.type === "BORROWED" ? "Loan Borrowed" : "Money Lent",
    loan.partyName,
    loan.category || "General",
    loan.date,
    loan.dueDate || "N/A",
    loan.interestRate || 0,
    (loan.principalPaise / 100).toFixed(2),
    (loanPrincipalRepaid(loan) / 100).toFixed(2),
    (loanOutstanding(loan) / 100).toFixed(2),
    loan.status,
  ]);

  downloadCSV("PersonalBank_Loans_and_Lending_Report", headers, rows);
}

export function exportVehicleReportCSV(
  vehicles: Vehicle[],
  transactions: Transaction[]
): void {
  const headers = [
    "Vehicle Name",
    "Type",
    "Registration Plate",
    "Status",
    "Purchase Price (INR)",
    "Total Expenses (INR)",
    "Fuel Spend (INR)",
    "Service Spend (INR)",
    "Insurance Spend (INR)",
    "Rental Income (INR)",
    "Net Operating Cost (INR)",
  ];

  const rows = vehicles.map((v) => {
    const fin = vehicleFinancials(v.id, transactions);
    return [
      v.name,
      v.type,
      v.registrationNumber || "N/A",
      v.status,
      ((v.purchasePricePaise || 0) / 100).toFixed(2),
      (fin.totalPaise / 100).toFixed(2),
      (fin.fuelPaise / 100).toFixed(2),
      (fin.maintenancePaise / 100).toFixed(2),
      (fin.insurancePaise / 100).toFixed(2),
      (fin.rentalIncomePaise / 100).toFixed(2),
      (fin.netCashFlowPaise / 100).toFixed(2),
    ];
  });

  downloadCSV("PersonalBank_Vehicles_Report", headers, rows);
}

export function exportInventoryStockCSV(inventory: InventoryItem[]): void {
  const headers = [
    "Product Name",
    "Category",
    "Subcategory",
    "Brand",
    "Unit",
    "Remaining Stock",
    "Total Stock Handled",
    "Alert Level",
    "Purchase Price (INR)",
    "Stock Valuation (INR)",
    "Storage Location",
    "Expiry Date",
  ];

  const rows = inventory.map((item) => [
    item.itemName,
    item.category,
    item.subcategory || "",
    item.brand || "",
    item.unit,
    formatNumber(item.remainingQuantity),
    formatNumber(item.quantity),
    item.minQuantity,
    (item.unitPricePaise / 100).toFixed(2),
    (inventoryItemValuation(item) / 100).toFixed(2),
    item.storageLocation || "",
    item.expiryDate ? formatDate(item.expiryDate) : "N/A",
  ]);

  downloadCSV("PersonalBank_Inventory_Stock_Report", headers, rows);
}
