export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export type EntityName =
  | "transaction"
  | "crop"
  | "land"
  | "labour"
  | "vehicle"
  | "reminder"
  | "loan"
  | "inventory"
  | "family"
  | "category"
  | "cropsale";

export interface BaseRecord {
  id: string;
  entity: EntityName;
  ownerId: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
  /** Local-only flag: record has changes that have not reached the cloud yet. */
  dirty?: boolean;
}

export type PaymentMethod = "CASH" | "UPI" | "BANK" | "CARD" | "OTHER";
export type TransactionKind = "INCOME" | "EXPENSE";
export type ExpenseGroup = "HOME" | "FARM" | "VEHICLE" | "OTHER";
export type IncomeGroup = "FARM" | "HOME";
export type IncomeStatus = "RECEIVED" | "PENDING" | "PARTIAL";

export interface Transaction extends BaseRecord {
  entity: "transaction";
  kind: TransactionKind;
  amountPaise: number;
  date: ISODate;
  category: string;
  group: ExpenseGroup;
  cropId?: string;
  cropName?: string;
  landId?: string;
  landName?: string;
  farmName?: string;
  activity?: string;
  vehicleId?: string;
  vehicleName?: string;
  labourPaymentId?: string;
  paymentMethod: PaymentMethod;
  description: string;
  notes?: string;
  receiptDataUrl?: string;
  incomeStatus?: IncomeStatus;
  source?: "manual" | "labour" | "opening_balance";
  isOpeningBalance?: boolean;

  // Detailed sales and rental records
  quantity?: number;
  unit?: string;
  ratePaise?: number;
  buyerName?: string;
  marketName?: string;
  grossAmountPaise?: number;
  otherChargesPaise?: number;
  netAmountPaise?: number;
  pendingAmountPaise?: number;
  inventoryItemId?: string;
  inventoryPurchaseId?: string;
}

export type CropStatus = "PLANNED" | "ACTIVE" | "HARVESTING" | "COMPLETED";

export interface Crop extends BaseRecord {
  entity: "crop";
  name: string;
  variety?: string;
  season: "Kharif" | "Rabi" | "Zaid" | "Perennial";
  year: string;
  landId?: string;
  landName: string;
  areaAcres: number;
  sowingDate: ISODate;
  expectedHarvestDate?: ISODate;
  actualHarvestDate?: ISODate;
  status: CropStatus;
  notes?: string;
}

export type AreaUnit = "Acre" | "Hectare" | "Guntha";

export interface Land extends BaseRecord {
  entity: "land";
  name: string;
  surveyNumber?: string;
  totalArea?: number;
  areaUnit?: AreaUnit;
  areaAcres: number;
  location?: string;
  soilType?: string;
  irrigation?: string;
  notes?: string;
}

export interface CropSalePayment {
  id: string;
  amountPaise: number;
  date: ISODate;
  paymentMethod: PaymentMethod;
  notes?: string;
  transactionId?: string;
  createdAt: ISODateTime;
}

export interface CropSale extends BaseRecord {
  entity: "cropsale";
  cropId: string;
  cropName: string;
  landId?: string;
  landName?: string;
  harvestedQuantity?: number;
  quantitySold: number;
  quantityRemaining?: number;
  unit: string;
  ratePerUnitPaise: number;
  grossAmountPaise?: number;
  totalAmountPaise: number;
  transportChargesPaise?: number;
  otherChargesPaise?: number;
  netAmountPaise?: number;
  receivedPaise: number;
  pendingPaise: number;
  buyerName?: string;
  marketName?: string;
  saleDate: ISODate;
  paymentMethod: PaymentMethod;
  notes?: string;
  transactionId?: string;
  payments?: CropSalePayment[];
}

export type LabourActivity =
  | "Land preparation"
  | "Sowing"
  | "Planting"
  | "Weeding"
  | "Irrigation"
  | "Fertilizer application"
  | "Pesticide spraying"
  | "Harvesting"
  | "Loading"
  | "Transportation"
  | "Other";

export interface LabourPayment extends BaseRecord {
  entity: "labour";
  cropId: string;
  cropName: string;
  landId?: string;
  landName?: string;
  workerName?: string;
  activity: LabourActivity;
  workers: number;
  ratePaise: number;
  days: number;
  amountPaise: number;
  paidPaise?: number;
  remainingPaise?: number;
  status: "PAID" | "PENDING" | "PARTIAL";
  paymentDate: ISODate;
  paidDate?: ISODate;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  description?: string;
  notes?: string;
}

export type VehicleType = "Tractor" | "Car" | "Bike" | "Other";

export interface TractorWorkLog {
  id: string;
  date: ISODate;
  hours: number;
  operationType: string;
  farmType: "OWN" | "RENTAL";
  clientName?: string;
  dieselLitres?: number;
  ratePerHourPaise?: number;
  grossAmountPaise?: number;
  receivedAmountPaise?: number;
  incomeAmountPaise?: number;
  receivedPaise?: number;
  pendingPaise?: number;
  paymentStatus?: "RECEIVED" | "PARTIAL" | "PENDING";
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  notes?: string;
  createdAt: ISODateTime;
}

export interface VehicleServiceRecord {
  id: string;
  date: ISODate;
  serviceDate?: ISODate;
  serviceType: string;
  serviceCenter?: string;
  amountPaise: number;
  nextServiceDate?: ISODate;
  odometerReading?: number | string;
  engineHours?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  transactionId?: string;
  createdAt: ISODateTime;
}

export interface TractorDetails {
  hoursUsed?: number;
  ownFarmHours?: number;
  otherFarmHours?: number;
  dieselLitres?: number;
  maintenancePaise?: number;
  logs?: TractorWorkLog[];
}

export interface Vehicle extends BaseRecord {
  entity: "vehicle";
  name: string;
  type: VehicleType;
  registrationNumber: string;
  brand?: string;
  model?: string;
  purchaseDate?: ISODate;
  purchasePricePaise?: number;
  status: "ACTIVE" | "SOLD" | "MAINTENANCE";
  fuelType?: string;
  serviceDate?: ISODate;
  nextServiceDate?: ISODate;
  insuranceExpiry?: ISODate;
  pucExpiry?: ISODate;
  registrationExpiry?: ISODate;
  tyreReplacementDate?: ISODate;
  loanEmiPaise?: number;
  loanPaymentDate?: ISODate;
  loanId?: string;
  loanAmountPaise?: number;
  downPaymentPaise?: number;
  loanBank?: string;
  tractor?: TractorDetails;
  photoDataUrl?: string;
  serviceHistory?: VehicleServiceRecord[];
  notes?: string;
}

export type ReminderCategory =
  | "Crop"
  | "Labour"
  | "Loan"
  | "Vehicle"
  | "Bill"
  | "Family"
  | "Inventory"
  | "Custom";

export type RepeatOption = "NONE" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Reminder extends BaseRecord {
  entity: "reminder";
  title: string;
  date: ISODate;
  time?: string;
  category: ReminderCategory;
  notes?: string;
  repeat: RepeatOption;
  notify: boolean;
  completed: boolean;
  completedAt?: ISODateTime;
  linkedType?:
    | "crop"
    | "vehicle"
    | "loan"
    | "family"
    | "labour"
    | "inventory"
    | "inventory_expiry"
    | "inventory_low_stock";
  linkedId?: string;
}

export type LoanType = "BORROWED" | "LENT";
export type LoanStatus = "ACTIVE" | "COMPLETED" | "OVERDUE" | "CLOSED" | "WRITTEN_OFF";
export type LoanInterestType = "SIMPLE" | "COMPOUND" | "FLAT" | "NONE";
export type LoanPaymentFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "LUMP_SUM"
  | "IRREGULAR";

export interface LoanRepayment {
  id: string;
  amountPaise: number;
  principalPaise?: number;
  interestPaise?: number;
  date: ISODate;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  receiptDataUrl?: string;
  transactionId?: string;
  createdAt?: ISODateTime;
}

export interface Loan extends BaseRecord {
  entity: "loan";
  type: LoanType;
  partyName: string;
  contactNumber?: string;
  category?: string;
  purpose?: string;
  principalPaise: number;
  interestRate: number;
  interestType?: LoanInterestType;
  date: ISODate;
  repaymentStartDate?: ISODate;
  durationMonths?: number;
  emiPaise?: number;
  paymentFrequency?: LoanPaymentFrequency;
  dueDate?: ISODate;
  repayments: LoanRepayment[];
  status: LoanStatus;
  notes?: string;
  documentUrl?: string;
  receiptDataUrl?: string;
  vehicleId?: string;
  vehicleName?: string;
  reminderId?: string;
}

export type InventoryCategory =
  | "Seeds"
  | "Fertilizers"
  | "Pesticides"
  | "Farm Supplies"
  | "Feed"
  | "Other"
  | (string & {});

export type PurchasePaymentStatus = "PAID" | "PARTIAL" | "PENDING";

export interface InventoryPurchase {
  id: string;
  itemId: string;
  purchaseDate: ISODate;
  supplierName: string;
  supplierContact?: string;
  quantity: number;
  unit: string;
  pricePerUnitPaise: number;
  discountPaise?: number;
  transportPaise?: number;
  totalCostPaise: number;
  paymentStatus: PurchasePaymentStatus;
  paidPaise: number;
  pendingPaise: number;
  paymentMethod?: PaymentMethod;
  invoiceNumber?: string;
  invoiceDataUrl?: string;
  notes?: string;
  transactionId?: string;
  received?: boolean;
  createdAt: ISODateTime;
}

export interface InventoryUsage {
  id: string;
  itemId: string;
  usageDate: ISODate;
  quantityUsed: number;
  unit: string;
  cropId?: string;
  cropName?: string;
  landId?: string;
  landName?: string;
  activity?: string;
  costPaise: number;
  notes?: string;
  createdAt: ISODateTime;
}

export type StockAdjustmentType =
  | "OPENING"
  | "CORRECTION"
  | "DAMAGED"
  | "EXPIRED"
  | "RETURNED"
  | "TRANSFER";

export interface InventoryAdjustment {
  id: string;
  itemId: string;
  date: ISODate;
  type: StockAdjustmentType;
  quantityDelta: number;
  unit: string;
  reason: string;
  locationFrom?: string;
  locationTo?: string;
  notes?: string;
  createdAt: ISODateTime;
}

export interface InventoryItem extends BaseRecord {
  entity: "inventory";
  itemName: string;
  category: InventoryCategory;
  subcategory?: string;
  brand?: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPricePaise: number;
  purchaseDate: ISODate;
  remainingQuantity: number;
  minQuantity: number;
  storageLocation?: string;
  expiryDate?: ISODate;
  batchNumber?: string;
  supplierName?: string;
  supplierContact?: string;
  notes?: string;
  isArchived?: boolean;
  purchases?: InventoryPurchase[];
  usageHistory?: InventoryUsage[];
  adjustments?: InventoryAdjustment[];
}

export interface InventoryDraft {
  itemName: string;
  category: InventoryCategory;
  subcategory?: string;
  brand?: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPricePaise: number;
  purchaseDate: ISODate;
  remainingQuantity: number;
  minQuantity: number;
  storageLocation?: string;
  expiryDate?: ISODate;
  batchNumber?: string;
  supplierName?: string;
  supplierContact?: string;
  notes?: string;
  isArchived?: boolean;
}

export interface StockPurchaseDraft {
  purchaseDate: ISODate;
  supplierName: string;
  supplierContact?: string;
  quantity: number;
  unit: string;
  pricePerUnitPaise: number;
  discountPaise?: number;
  transportPaise?: number;
  paymentStatus: PurchasePaymentStatus;
  paidPaise: number;
  paymentMethod?: PaymentMethod;
  invoiceNumber?: string;
  invoiceDataUrl?: string;
  notes?: string;
  received?: boolean;
}

export interface StockUsageDraft {
  usageDate: ISODate;
  quantityUsed: number;
  unit: string;
  cropId?: string;
  landId?: string;
  activity?: string;
  notes?: string;
}

export interface StockAdjustmentDraft {
  date: ISODate;
  type: StockAdjustmentType;
  quantityDelta: number;
  unit: string;
  reason: string;
  locationFrom?: string;
  locationTo?: string;
  notes?: string;
}

export interface FamilyMember extends BaseRecord {
  entity: "family";
  name: string;
  relation: string;
  dateOfBirth?: ISODate;
  phone?: string;
  notes?: string;
}

export interface CustomCategory extends BaseRecord {
  entity: "category";
  group: ExpenseGroup | "INCOME";
  name: string;
}

export type AnyRecord =
  | Transaction
  | Crop
  | Land
  | LabourPayment
  | Vehicle
  | Reminder
  | Loan
  | InventoryItem
  | FamilyMember
  | CustomCategory
  | CropSale;

export interface Account {
  id: string;
  name: string;
  mobile?: string;
  location?: string;
  pinSalt: string;
  pinHash: string;
  pinLength: number;
  recoverySalt: string;
  recoveryHash: string;
  syncToken: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type Language = "en" | "mr";

export interface Preferences {
  language?: Language;
  notificationsEnabled: boolean;
  lastUsedCategory: Record<string, string>;
  lastBackupAt?: string;
}

export interface SyncMeta {
  lastSyncAt: string | null;
  cloudConfigured: boolean;
  lastSyncError?: string;
}

export type SyncStatus =
  | "local"
  | "offline"
  | "syncing"
  | "synced"
  | "error";

export type AddRecordType =
  | "INCOME"
  | "HOME_EXPENSE"
  | "FARM_EXPENSE"
  | "LABOUR"
  | "VEHICLE_EXPENSE"
  | "LOAN"
  | "LENDING"
  | "REMINDER"
  | "OPENING_BALANCE";

export type PeriodPreset =
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "LAST_YEAR"
  | "FINANCIAL_YEAR"
  | "CURRENT_SEASON"
  | "ALL_TIME"
  | "CUSTOM";

export interface DateRange {
  start: ISODate;
  end: ISODate;
  label: string;
  preset: PeriodPreset;
}

export interface UnifiedFinancialMetrics {
  currentCashBalancePaise: number;
  periodClosingBalancePaise: number;
  openingBalancePaise?: number;
  cashInHandPaise?: number;
  bankBalancePaise?: number;
  incomeReceivedPaise: number;
  incomePendingPaise: number;
  totalIncomePaise: number;
  expensesPaidPaise: number;
  expensesPendingPaise: number;
  totalExpensesPaise: number;
  netCashflowPaise: number;
  totalReceivablesPaise: number;
  totalPayablesPaise: number;
  borrowedPrincipalOutstandingPaise: number;
  lentPrincipalOutstandingPaise: number;
  supplierPayablesPaise: number;
  labourPayablesPaise: number;
  inventoryValuationPaise: number;
  vehicleAssetValuePaise: number;
  netWorthPaise: number;
  totalAssetsPaise: number;
  totalLiabilitiesPaise: number;
}

export type IssueSeverity = "ERROR" | "WARNING" | "INFO";
export type IssueCategory =
  | "DUPLICATE_TRANSACTION"
  | "MISSING_LINKED_RECORD"
  | "LOAN_MISMATCH"
  | "LENDING_MISMATCH"
  | "CROPSALE_MISMATCH"
  | "INVENTORY_DISCREPANCY"
  | "CROP_COST_DISCREPANCY"
  | "VEHICLE_LOAN_INCONSISTENCY"
  | "NEGATIVE_CASH_BALANCE"
  | "INVALID_RECORD";

export interface ReconciliationIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  affectedRecordId?: string;
  affectedEntity?: EntityName;
  suggestedAction: string;
  canAutoFix?: boolean;
}

export interface UnifiedActivityItem {
  id: string;
  date: ISODate;
  timestamp: string;
  title: string;
  subtitle?: string;
  amountPaise: number;
  type:
    | "INCOME"
    | "EXPENSE"
    | "LOAN_REPAYMENT"
    | "LENDING_COLLECTION"
    | "STOCK_PURCHASE"
    | "STOCK_USAGE";
  category: string;
  entity: EntityName | "purchase" | "usage";
  recordId: string;
  tone: "positive" | "negative" | "neutral" | "amber" | "brand";
  isPending?: boolean;
  notes?: string;
}
