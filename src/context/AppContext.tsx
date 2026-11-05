"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createPinRecord,
  createRecoveryRecord,
  formatRecoveryCode,
  generateRecoveryCode,
  generateSyncToken,
  isRecoveryCodeFormat,
  isValidPin,
  normalizeRecoveryCode,
  randomId,
  verifyPin,
  verifyRecoveryCode,
} from "@/lib/auth";
import {
  buildBackup,
  downloadBackup,
  parseBackup,
  type BackupFile,
} from "@/lib/backup";
import {
  clearAccount,
  deleteOwnerData,
  getAllRecords,
  getDirtyRecords,
  getPreferences,
  getRecord,
  getRecordsByEntity,
  getStoredAccount,
  getSyncMeta,
  markRecordsSynced,
  putRecord,
  putRecords,
  storeAccount,
  storePreferences,
  storeSyncMeta,
  requestStoragePersistence,
  type StoragePersistenceDiagnostic,
} from "@/lib/db";
import {
  translate,
  formatLocalizedINR,
  formatLocalizedNumber,
  formatLocalizedDate,
} from "@/lib/i18n";
import {
  INVENTORY_CATEGORIES,
  LABOUR_ACTIVITIES,
  MAX_AMOUNT_PAISE,
  REMINDER_CATEGORIES,
  SEASONS,
  VEHICLE_TYPES,
} from "@/lib/constants";
import { advanceRepeat, isValidISODate, isValidTime, nowISO, todayISO } from "@/lib/dates";
import {
  areUnitsCompatible,
  averagePurchasePricePaise,
  convertUnitQuantity,
  isFarmIncomeCategory,
} from "@/lib/finance";
import { formatINR, labourAmountPaise, sumPaise } from "@/lib/money";
import { fetchCloudStats, syncWithCloud } from "@/lib/sync";
import type {
  Account,
  AddRecordType,
  AnyRecord,
  AreaUnit,
  Crop,
  CropSale,
  CropSalePayment,
  CropStatus,
  CustomCategory,
  EntityName,
  ExpenseGroup,
  FamilyMember,
  IncomeStatus,
  InventoryAdjustment,
  InventoryCategory,
  InventoryDraft,
  InventoryItem,
  InventoryPurchase,
  InventoryUsage,
  ISODate,
  Land,
  LabourActivity,
  LabourPayment,
  Language,
  Loan,
  LoanInterestType,
  LoanPaymentFrequency,
  LoanRepayment,
  LoanStatus,
  LoanType,
  PaymentMethod,
  Preferences,
  Reminder,
  ReminderCategory,
  RepeatOption,
  StockAdjustmentDraft,
  StockAdjustmentType,
  StockPurchaseDraft,
  StockUsageDraft,
  SyncMeta,
  SyncStatus,
  Transaction,
  TransactionKind,
  Vehicle,
  VehicleType,
  VehicleServiceRecord,
  TractorDetails,
  TractorWorkLog,
} from "@/lib/types";

const SESSION_KEY = "sheti_khata_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ATTEMPTS_PREFIX = "sheti_khata_attempts_";

interface StoredSession {
  ownerId: string;
  expiresAt: number;
}

function readSession(ownerId: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed.ownerId === ownerId && parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function writeSession(ownerId: string): void {
  try {
    const session: StoredSession = { ownerId, expiresAt: Date.now() + SESSION_TTL_MS };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Private browsing can block session storage. The PIN gate still works.
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore.
  }
}

interface AttemptState {
  count: number;
  lockUntil: number;
}

function readAttempts(ownerId: string): AttemptState {
  try {
    const raw = localStorage.getItem(`${ATTEMPTS_PREFIX}${ownerId}`);
    if (!raw) return { count: 0, lockUntil: 0 };
    const parsed = JSON.parse(raw) as AttemptState;
    return {
      count: Number.isFinite(parsed.count) ? parsed.count : 0,
      lockUntil: Number.isFinite(parsed.lockUntil) ? parsed.lockUntil : 0,
    };
  } catch {
    return { count: 0, lockUntil: 0 };
  }
}

function writeAttempts(ownerId: string, state: AttemptState): void {
  try {
    localStorage.setItem(`${ATTEMPTS_PREFIX}${ownerId}`, JSON.stringify(state));
  } catch {
    // Ignore.
  }
}

function clearAttempts(ownerId: string): void {
  try {
    localStorage.removeItem(`${ATTEMPTS_PREFIX}${ownerId}`);
  } catch {
    // Ignore.
  }
}

const KNOWN_ENTITIES = new Set<EntityName>([
  "transaction",
  "crop",
  "land",
  "labour",
  "vehicle",
  "reminder",
  "loan",
  "inventory",
  "family",
  "category",
  "cropsale",
]);

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export interface TransactionDraft {
  kind: TransactionKind;
  amountPaise: number;
  date: string;
  category: string;
  group?: ExpenseGroup;
  cropId?: string;
  landId?: string;
  farmName?: string;
  activity?: string;
  vehicleId?: string;
  paymentMethod: PaymentMethod;
  description: string;
  notes?: string;
  receiptDataUrl?: string;
  incomeStatus?: IncomeStatus;
  quantity?: number;
  unit?: string;
  ratePaise?: number;
  buyerName?: string;
  marketName?: string;
  grossAmountPaise?: number;
  otherChargesPaise?: number;
  netAmountPaise?: number;
  pendingAmountPaise?: number;
  isOpeningBalance?: boolean;
  source?: "manual" | "labour" | "opening_balance";
}

export interface CropDraft {
  name: string;
  variety?: string;
  season: Crop["season"];
  year: string;
  landId?: string;
  areaAcres: number;
  sowingDate: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  status: CropStatus;
  notes?: string;
}

export interface LandDraft {
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

export interface CropSaleDraft {
  cropId: string;
  landId?: string;
  harvestedQuantity?: number;
  quantitySold: number;
  quantityRemaining?: number;
  unit: string;
  ratePerUnitPaise: number;
  grossAmountPaise?: number;
  transportChargesPaise?: number;
  otherChargesPaise?: number;
  netAmountPaise?: number;
  receivedPaise: number;
  pendingPaise: number;
  buyerName?: string;
  marketName?: string;
  saleDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  payments?: CropSalePayment[];
}

export interface LabourDraft {
  cropId: string;
  landId?: string;
  workerName?: string;
  activity: LabourActivity;
  workers: number;
  ratePaise: number;
  days: number;
  status: "PAID" | "PENDING" | "PARTIAL";
  paidPaise?: number;
  paymentDate: string;
  paidDate?: string;
  paymentMethod: PaymentMethod;
  description?: string;
  notes?: string;
}

export interface VehicleDraft {
  name: string;
  type: VehicleType;
  registrationNumber: string;
  brand?: string;
  model?: string;
  purchaseDate?: string;
  purchasePricePaise?: number;
  status: Vehicle["status"];
  fuelType?: string;
  serviceDate?: string;
  nextServiceDate?: string;
  insuranceExpiry?: string;
  pucExpiry?: string;
  registrationExpiry?: string;
  tyreReplacementDate?: string;
  loanEmiPaise?: number;
  loanPaymentDate?: string;
  loanId?: string;
  loanAmountPaise?: number;
  downPaymentPaise?: number;
  tractor?: TractorDetails;
  photoDataUrl?: string;
  serviceHistory?: VehicleServiceRecord[];
  notes?: string;
}

export interface ReminderDraft {
  title: string;
  date: string;
  time?: string;
  category: ReminderCategory;
  notes?: string;
  repeat: RepeatOption;
  notify: boolean;
  linkedType?: Reminder["linkedType"];
  linkedId?: string;
}

export interface LoanDraft {
  type: LoanType;
  partyName: string;
  contactNumber?: string;
  category?: string;
  purpose?: string;
  principalPaise: number;
  interestRate: number;
  interestType?: LoanInterestType;
  date: string;
  repaymentStartDate?: string;
  durationMonths?: number;
  emiPaise?: number;
  paymentFrequency?: LoanPaymentFrequency;
  dueDate?: string;
  status?: LoanStatus;
  notes?: string;
  documentUrl?: string;
  receiptDataUrl?: string;
  vehicleId?: string;
  vehicleName?: string;
  createReminder?: boolean;
}

export interface LoanRepaymentDraft {
  amountPaise: number;
  principalPaise?: number;
  interestPaise?: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  receiptDataUrl?: string;
  notes?: string;
  recordCashTransaction?: boolean;
}

export type { InventoryDraft };

export interface FamilyDraft {
  name: string;
  relation: string;
  dateOfBirth?: string;
  phone?: string;
  notes?: string;
}

interface AddSheetDefaults {
  cropId?: string;
  vehicleId?: string;
  expenseGroup?: ExpenseGroup;
}

interface AddSheetState {
  open: boolean;
  type?: AddRecordType;
  editing?: Transaction;
  defaults?: AddSheetDefaults;
}

interface ToastState {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface UnlockResult {
  ok: boolean;
  error?: string;
  lockUntil?: number;
}

interface AppContextType {
  isReady: boolean;
  isDataReady: boolean;
  account: Account | null;
  isUnlocked: boolean;
  authLockUntil: number | null;
  setupAccount: (input: {
    name: string;
    pin: string;
    mobile?: string;
    location?: string;
    recoveryCode?: string;
  }) => Promise<{ recoveryCode: string }>;
  unlock: (pin: string) => Promise<UnlockResult>;
  lock: () => void;
  changePin: (currentPin: string, nextPin: string) => Promise<UnlockResult>;
  resetPinWithRecovery: (
    code: string,
    nextPin: string
  ) => Promise<{ ok: boolean; error?: string }>;
  regenerateRecoveryCode: (pin: string) => Promise<{ ok: boolean; code?: string; error?: string }>;
  updateProfile: (input: {
    name: string;
    mobile?: string;
    location?: string;
  }) => Promise<void>;

  transactions: Transaction[];
  crops: Crop[];
  lands: Land[];
  labourPayments: LabourPayment[];
  vehicles: Vehicle[];
  reminders: Reminder[];
  loans: Loan[];
  inventory: InventoryItem[];
  familyMembers: FamilyMember[];
  customCategories: CustomCategory[];
  cropSales: CropSale[];
  records: AnyRecord[];

  saveTransaction: (draft: TransactionDraft, existingId?: string) => Promise<Transaction>;
  saveOpeningBalance: (
    draft: {
      amountPaise: number;
      date: string;
      paymentMethod: PaymentMethod;
      notes?: string;
    },
    existingId?: string
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCrop: (draft: CropDraft, existingId?: string) => Promise<Crop>;
  deleteCrop: (id: string) => Promise<void>;
  saveLand: (draft: LandDraft, existingId?: string) => Promise<Land>;
  deleteLand: (id: string) => Promise<void>;
  saveCropSale: (draft: CropSaleDraft, existingId?: string) => Promise<CropSale>;
  recordCropSalePayment: (
    saleId: string,
    payment: {
      amountPaise: number;
      date: ISODate;
      paymentMethod: PaymentMethod;
      notes?: string;
    }
  ) => Promise<CropSale>;
  deleteCropSale: (id: string) => Promise<void>;
  saveLabourPayment: (draft: LabourDraft, existingId?: string) => Promise<LabourPayment>;
  markLabourPaid: (id: string, paidDate?: string, additionalPaidPaise?: number) => Promise<void>;
  deleteLabourPayment: (id: string) => Promise<void>;
  saveVehicle: (draft: VehicleDraft, existingId?: string) => Promise<Vehicle>;
  saveVehicleServiceRecord: (
    vehicleId: string,
    serviceDraft: {
      date: ISODate;
      serviceType: string;
      serviceCenter?: string;
      amountPaise: number;
      nextServiceDate?: ISODate;
      odometerReading?: number;
      engineHours?: number;
      notes?: string;
      paymentMethod?: PaymentMethod;
    }
  ) => Promise<Vehicle>;
  recordTractorWorkLog: (
    vehicleId: string,
    workDraft: {
      date: ISODate;
      hours: number;
      operationType: string;
      farmType: "OWN" | "RENTAL";
      clientName?: string;
      dieselLitres?: number;
      ratePerHourPaise?: number;
      incomeAmountPaise?: number;
      receivedPaise?: number;
      paymentStatus?: "RECEIVED" | "PARTIAL" | "PENDING";
      paymentMethod?: PaymentMethod;
      notes?: string;
    }
  ) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  saveReminder: (draft: ReminderDraft, existingId?: string) => Promise<Reminder>;
  completeReminder: (id: string) => Promise<void>;
  reopenReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  saveLoan: (draft: LoanDraft, existingId?: string) => Promise<Loan>;
  addLoanRepayment: (
    loanId: string,
    repayment: LoanRepaymentDraft | Omit<LoanRepayment, "id">
  ) => Promise<void>;
  updateLoanRepayment: (
    loanId: string,
    repaymentId: string,
    updates: Partial<LoanRepaymentDraft>
  ) => Promise<void>;
  deleteLoanRepayment: (loanId: string, repaymentId: string) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  saveInventoryItem: (draft: InventoryDraft, existingId?: string) => Promise<InventoryItem>;
  recordStockPurchase: (
    itemId: string,
    draft: StockPurchaseDraft
  ) => Promise<{ item: InventoryItem; purchase: InventoryPurchase; transaction?: Transaction }>;
  recordStockUsage: (
    itemId: string,
    draft: StockUsageDraft
  ) => Promise<{ item: InventoryItem; usage: InventoryUsage }>;
  recordStockAdjustment: (
    itemId: string,
    draft: StockAdjustmentDraft
  ) => Promise<{ item: InventoryItem; adjustment: InventoryAdjustment }>;
  deleteStockPurchase: (itemId: string, purchaseId: string) => Promise<void>;
  deleteStockUsage: (itemId: string, usageId: string) => Promise<void>;
  deleteStockAdjustment: (itemId: string, adjustmentId: string) => Promise<void>;
  archiveInventoryItem: (id: string) => Promise<void>;
  adjustInventoryStock: (id: string, delta: number) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  saveFamilyMember: (draft: FamilyDraft, existingId?: string) => Promise<FamilyMember>;
  deleteFamilyMember: (id: string) => Promise<void>;
  addCustomCategory: (group: CustomCategory["group"], name: string) => Promise<void>;
  deleteCustomCategory: (id: string) => Promise<void>;

  preferences: Preferences;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (
    paise: number | undefined | null,
    options?: { showDecimals?: boolean; absolute?: boolean }
  ) => string;
  formatNumber: (value: number, maxFractionDigits?: number) => string;
  formatDate: (
    date: string | Date | undefined,
    style?: "short" | "medium" | "long"
  ) => string;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  rememberCategory: (key: string, category: string) => void;

  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  cloudConfigured: boolean;
  cloudDatabase: string;
  cloudCollection: string;
  cloudRecordsCount: number | null;
  pendingUploadsCount: number;
  failedUploadsCount: number;
  lastSyncError: string | null;
  storagePersistence: StoragePersistenceDiagnostic | null;
  refreshCloudStats: () => Promise<void>;
  syncNow: (force?: boolean) => Promise<void>;

  addSheet: AddSheetState;
  openAdd: (type?: AddRecordType, editing?: Transaction, defaults?: AddSheetDefaults) => void;
  closeAdd: () => void;

  toast: ToastState | null;
  notify: (message: string, tone?: ToastState["tone"]) => void;

  exportBackup: () => Promise<{ count: number; backup: BackupFile }>;
  importBackupText: (text: string) => Promise<{ imported: number; skipped: number }>;
  resetAllData: () => Promise<void>;
}

const PAYMENT_METHOD_VALUES = new Set<PaymentMethod>(["CASH", "UPI", "BANK", "CARD", "OTHER"]);
const EXPENSE_GROUP_VALUES = new Set<ExpenseGroup>(["HOME", "FARM", "VEHICLE", "OTHER"]);
const LABOUR_ACTIVITY_VALUES = new Set<string>(LABOUR_ACTIVITIES);
const REMINDER_CATEGORY_VALUES = new Set<string>(REMINDER_CATEGORIES);
const REPEAT_VALUES = new Set<RepeatOption>(["NONE", "WEEKLY", "MONTHLY", "YEARLY"]);
const VEHICLE_TYPE_VALUES = new Set<string>(VEHICLE_TYPES);
const INVENTORY_CATEGORY_VALUES = new Set<string>(INVENTORY_CATEGORIES);
const SEASON_VALUES = new Set<string>(SEASONS);
const CUSTOM_CATEGORY_GROUPS = new Set<CustomCategory["group"]>([
  "HOME",
  "FARM",
  "VEHICLE",
  "OTHER",
  "INCOME",
]);
const REMINDER_LINK_TYPES = new Set<NonNullable<Reminder["linkedType"]>>([
  "crop",
  "vehicle",
  "loan",
  "family",
  "labour",
]);
const INVENTORY_UNIT_MAX = 20;

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authLockUntil, setAuthLockUntil] = useState<number | null>(null);
  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({
    language: "en",
    notificationsEnabled: false,
    lastUsedCategory: {},
  });
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("personal_bank_lang") as Language;
        if (saved === "mr" || saved === "en") return saved;
      } catch {}
    }
    return "en";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudConfigured, setCloudConfigured] = useState(true);
  const [cloudDatabase, setCloudDatabase] = useState("personal_bank");
  const [cloudCollection, setCloudCollection] = useState("syncrecords");
  const [cloudRecordsCount, setCloudRecordsCount] = useState<number | null>(null);
  const [pendingUploadsCount, setPendingUploadsCount] = useState(0);
  const [failedUploadsCount, setFailedUploadsCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [storagePersistence, setStoragePersistence] = useState<StoragePersistenceDiagnostic | null>(null);

  useEffect(() => {
    void requestStoragePersistence().then(setStoragePersistence);
  }, []);
  const retryBackoffMs = useRef(2000);
  const [addSheet, setAddSheet] = useState<AddSheetState>({ open: false });
  const [toast, setToast] = useState<ToastState | null>(null);

  const recordsRef = useRef<AnyRecord[]>([]);
  const accountRef = useRef<Account | null>(null);
  const cloudConfiguredRef = useRef(true);
  const syncingRef = useRef(false);
  const syncNowRef = useRef<((force?: boolean) => Promise<void>) | null>(null);
  const scheduleSyncRef = useRef<(() => void) | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  useEffect(() => {
    cloudConfiguredRef.current = cloudConfigured;
  }, [cloudConfigured]);

  useEffect(() => {
    const dirtyCount = records.filter(
      (r) => r.dirty === true || r.dirty === undefined
    ).length;
    setPendingUploadsCount(dirtyCount);
  }, [records]);

  const refreshCloudStats = useCallback(async () => {
    const currentAccount = accountRef.current;
    if (!currentAccount || typeof navigator === "undefined" || !navigator.onLine) return;
    try {
      const stats = await fetchCloudStats(currentAccount.syncToken);
      if (stats.success) {
        setCloudDatabase(stats.database);
        setCloudCollection(stats.collection);
        setCloudRecordsCount(stats.cloudRecordsCount);
        setCloudConfigured(true);
        setLastSyncError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.message) {
        setLastSyncError(err.message);
      }
    }
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastState["tone"] = "success") => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ id: Date.now(), message, tone });
      toastTimerRef.current = setTimeout(() => setToast(null), 3200);
    },
    []
  );

  const loadRecords = useCallback(async (ownerId: string, silent = false) => {
    if (!silent) setIsDataReady(false);
    try {
      const all = await getAllRecords(ownerId);
      recordsRef.current = all;
      setRecords(all);
    } catch (error) {
      console.error("Could not load local records", error);
      notify("Could not open your saved records. Please reload the app.", "error");
    } finally {
      if (!silent) setIsDataReady(true);
    }
  }, [notify]);

  // Boot: load account, preferences and the current session.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [storedAccount, storedPreferences] = await Promise.all([
          getStoredAccount(),
          getPreferences(),
        ]);
        if (cancelled) return;
        setPreferences(storedPreferences);
        if (storedPreferences.language) {
          setLanguageState(storedPreferences.language);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("personal_bank_lang", storedPreferences.language);
              document.documentElement.lang = storedPreferences.language;
            } catch {}
          }
        }

        if (storedAccount) {
          if (!storedAccount.syncToken || !/^[a-f0-9]{64}$/i.test(storedAccount.syncToken)) {
            storedAccount.syncToken = generateSyncToken();
            storedAccount.updatedAt = nowISO();
            await storeAccount(storedAccount);
          }
          setAccount(storedAccount);
          accountRef.current = storedAccount;
          const attempts = readAttempts(storedAccount.id);
          setAuthLockUntil(attempts.lockUntil > Date.now() ? attempts.lockUntil : null);

          const meta = await getSyncMeta(storedAccount.id);
          // Allow cloud sync whenever online and let the server response govern configuration
          setCloudConfigured(true);
          cloudConfiguredRef.current = true;
          setLastSyncedAt(meta.lastSyncAt);

          if (readSession(storedAccount.id)) {
            setIsUnlocked(true);
          } else {
            setIsDataReady(true);
          }
        } else {
          setIsDataReady(true);
        }
      } catch (error) {
        console.error("Boot error", error);
        setIsDataReady(true);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (account && isUnlocked) {
      loadRecords(account.id);
    }
  }, [account, isUnlocked, loadRecords]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) setSyncStatus("offline");
    else if (!cloudConfigured) setSyncStatus("local");
    else if (lastSyncedAt) setSyncStatus("synced");
  }, [isOnline, cloudConfigured, lastSyncedAt]);

  const syncNow = useCallback(
    async (force = false) => {
      const currentAccount = accountRef.current;
      if (!currentAccount || !isUnlocked) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
        return;
      }
      if (syncingRef.current) return;
      syncingRef.current = true;
      setSyncStatus("syncing");

      let dirtyCount = 0;
      try {
        // Ensure account has a valid 64-hex private sync token
        if (!currentAccount.syncToken || !/^[a-f0-9]{64}$/i.test(currentAccount.syncToken)) {
          currentAccount.syncToken = generateSyncToken();
          currentAccount.updatedAt = nowISO();
          await storeAccount(currentAccount);
          setAccount(currentAccount);
          accountRef.current = currentAccount;
        }

        const meta = await getSyncMeta(currentAccount.id);
        let dirty = await getDirtyRecords(currentAccount.id);

        // Initial upload guarantee: If no dirty records but force is requested or account never synced to cloud,
        // send all existing local records to cloud so existing records never get stranded locally.
        if (dirty.length === 0 && (force || !meta.lastSyncAt)) {
          const allLocal = await getAllRecords(currentAccount.id);
          const aliveLocal = allLocal.filter((r) => !r.deletedAt);
          if (aliveLocal.length > 0) {
            dirty = aliveLocal;
          }
        }
        dirtyCount = dirty.length;

        for (const batch of chunk(dirty, 20)) {
          const response = await syncWithCloud({
            token: currentAccount.syncToken,
            since: "9999-12-31T23:59:59.999Z",
            changes: batch,
          });
          if (!response.configured) {
            setCloudConfigured(false);
            cloudConfiguredRef.current = false;
            await storeSyncMeta(currentAccount.id, {
              ...meta,
              cloudConfigured: false,
            });
            setSyncStatus("local");
            return;
          }
          await markRecordsSynced(
            batch.map((record) => ({ id: record.id, updatedAt: record.updatedAt }))
          );
        }

        const pull = await syncWithCloud({
          token: currentAccount.syncToken,
          since: meta.lastSyncAt,
          changes: [],
        });
        if (!pull.configured) {
          setCloudConfigured(false);
          cloudConfiguredRef.current = false;
          await storeSyncMeta(currentAccount.id, {
            ...meta,
            cloudConfigured: false,
          });
          setSyncStatus("local");
          return;
        }

        const remote = Array.isArray(pull.records) ? pull.records : [];
        const toApply: AnyRecord[] = [];
        for (const incoming of remote) {
          if (
            !incoming ||
            typeof incoming.id !== "string" ||
            typeof incoming.entity !== "string" ||
            !KNOWN_ENTITIES.has(incoming.entity as EntityName) ||
            typeof incoming.updatedAt !== "string"
          ) {
            continue;
          }
          const local = await getRecord<AnyRecord>(incoming.id);
          if (!local || incoming.updatedAt > local.updatedAt) {
            toApply.push({
              ...(incoming as AnyRecord),
              ownerId: currentAccount.id,
              entity: incoming.entity as EntityName,
              dirty: false,
            } as AnyRecord);
          }
        }
        if (toApply.length) {
          await putRecords(toApply);
          await loadRecords(currentAccount.id, true);
        }

        const serverTime = pull.serverTime ?? nowISO();
        const nextMeta: SyncMeta = {
          lastSyncAt: serverTime,
          cloudConfigured: true,
        };
        await storeSyncMeta(currentAccount.id, nextMeta);
        setLastSyncedAt(serverTime);
        setCloudConfigured(true);
        cloudConfiguredRef.current = true;
        setSyncStatus("synced");
        retryBackoffMs.current = 2000;
        setLastSyncError(null);
        setFailedUploadsCount(0);
        setPendingUploadsCount(0);
        void refreshCloudStats();
      } catch (error) {
        console.error("Sync error", error);
        setSyncStatus("error");
        const message = error instanceof Error ? error.message : "Cloud sync failed.";
        setLastSyncError(message);
        setFailedUploadsCount(dirtyCount || 1);
        const currentMeta = await getSyncMeta(currentAccount.id).catch(() => null);
        if (currentMeta) {
          await storeSyncMeta(currentAccount.id, {
            ...currentMeta,
            lastSyncError: message,
          }).catch(() => undefined);
        }
        const delay = retryBackoffMs.current;
        retryBackoffMs.current = Math.min(60_000, delay * 2);
        setTimeout(() => {
          if (typeof navigator !== "undefined" && navigator.onLine) {
            syncNowRef.current?.();
          }
        }, delay);
      } finally {
        syncingRef.current = false;
      }
    },
    [isUnlocked, loadRecords, refreshCloudStats]
  );

  useEffect(() => {
    syncNowRef.current = syncNow;
    scheduleSyncRef.current = () => {
      if (!navigator.onLine) return;
      if (!cloudConfiguredRef.current) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncNowRef.current?.();
      }, 1_500);
    };
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [syncNow]);

  useEffect(() => {
    if (!isUnlocked || !account || !isOnline) return;
    const timer = setTimeout(() => syncNowRef.current?.(), 1_200);
    const interval = setInterval(() => syncNowRef.current?.(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncNowRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isUnlocked, account, isOnline]);

  const commitRecords = useCallback(
    async (items: AnyRecord[]) => {
      if (!items.length) return;
      await putRecords(items);
      setRecords((previous) => {
        const map = new Map(previous.map((record) => [record.id, record]));
        for (const item of items) map.set(item.id, item);
        const next = [...map.values()];
        recordsRef.current = next;
        return next;
      });
      scheduleSyncRef.current?.();
    },
    []
  );

  const makeBase = useCallback(
    (entity: EntityName, existing?: AnyRecord) => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      const timestamp = nowISO();
      return {
        id: existing?.id ?? randomId(entity),
        entity,
        ownerId: accountRef.current.id,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        dirty: true,
      };
    },
    []
  );

  const softDeleted = useCallback(
    (record: AnyRecord): AnyRecord => {
      const timestamp = nowISO();
      return { ...record, deletedAt: timestamp, updatedAt: timestamp, dirty: true };
    },
    []
  );

  // --- Account & authentication ---

  const setupAccount = useCallback(
    async (input: {
      name: string;
      pin: string;
      mobile?: string;
      location?: string;
      recoveryCode?: string;
    }) => {
      const name = input.name.trim();
      if (name.length < 2) throw new Error("Please enter your name.");
      if (name.length > 80) throw new Error("That name is too long.");
      if (input.mobile && input.mobile.trim().length > 20) {
        throw new Error("That mobile number is too long.");
      }
      if (input.location && input.location.trim().length > 80) {
        throw new Error("That village or town name is too long.");
      }
      if (!isValidPin(input.pin)) throw new Error("Your PIN must be 4 to 6 digits.");

      const pinRecord = await createPinRecord(input.pin);
      const recoveryCode = input.recoveryCode || generateRecoveryCode();
      const recoveryRecord = await createRecoveryRecord(recoveryCode);
      const timestamp = nowISO();
      const newAccount: Account = {
        id: randomId("owner"),
        name,
        mobile: input.mobile?.trim() || undefined,
        location: input.location?.trim() || undefined,
        ...pinRecord,
        ...recoveryRecord,
        syncToken: generateSyncToken(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await storeAccount(newAccount);
      writeSession(newAccount.id);
      clearAttempts(newAccount.id);
      setAuthLockUntil(null);
      setAccount(newAccount);
      accountRef.current = newAccount;
      setIsUnlocked(true);
      setSyncStatus("local");
      return { recoveryCode };
    },
    []
  );

  const unlock = useCallback(async (pin: string): Promise<UnlockResult> => {
    const currentAccount = accountRef.current;
    if (!currentAccount) return { ok: false, error: "No account found." };
    const attempts = readAttempts(currentAccount.id);
    if (attempts.lockUntil > Date.now()) {
      setAuthLockUntil(attempts.lockUntil);
      return {
        ok: false,
        error: "Too many attempts. Please wait a moment.",
        lockUntil: attempts.lockUntil,
      };
    }

    const valid = await verifyPin(pin, currentAccount.pinSalt, currentAccount.pinHash);
    if (!valid) {
      const count = attempts.count + 1;
      const shouldLock = count >= 5;
      const lockMs = shouldLock ? Math.min(30_000 * 2 ** (count - 5), 300_000) : 0;
      const next: AttemptState = {
        count: shouldLock ? 0 : count,
        lockUntil: shouldLock ? Date.now() + lockMs : 0,
      };
      writeAttempts(currentAccount.id, next);
      if (shouldLock) setAuthLockUntil(next.lockUntil);
      return {
        ok: false,
        error: shouldLock
          ? "Too many attempts. Please wait a moment and try again."
          : `Incorrect PIN. ${Math.max(0, 5 - count)} attempts left.`,
        lockUntil: next.lockUntil || undefined,
      };
    }

    clearAttempts(currentAccount.id);
    setAuthLockUntil(null);
    writeSession(currentAccount.id);
    setIsUnlocked(true);
    setSyncStatus(navigator.onLine ? "local" : "offline");
    return { ok: true };
  }, []);

  const lock = useCallback(() => {
    clearSession();
    setIsUnlocked(false);
    setIsDataReady(false);
    setRecords([]);
    recordsRef.current = [];
    setAddSheet({ open: false });
  }, []);

  const changePin = useCallback(
    async (currentPin: string, nextPin: string): Promise<UnlockResult> => {
      const currentAccount = accountRef.current;
      if (!currentAccount) return { ok: false, error: "No account found." };
      if (!isValidPin(nextPin)) {
        return { ok: false, error: "Your new PIN must be 4 to 6 digits." };
      }
      const valid = await verifyPin(
        currentPin,
        currentAccount.pinSalt,
        currentAccount.pinHash
      );
      if (!valid) return { ok: false, error: "Current PIN is incorrect." };
      const pinRecord = await createPinRecord(nextPin);
      const updated: Account = {
        ...currentAccount,
        ...pinRecord,
        updatedAt: nowISO(),
      };
      await storeAccount(updated);
      setAccount(updated);
      accountRef.current = updated;
      clearAttempts(updated.id);
      return { ok: true };
    },
    []
  );

  const resetPinWithRecovery = useCallback(
    async (code: string, nextPin: string) => {
      const currentAccount = accountRef.current;
      if (!currentAccount) return { ok: false, error: "No account found." };
      if (!isRecoveryCodeFormat(code)) {
        return { ok: false, error: "Please enter the full 12-character recovery code." };
      }
      if (!isValidPin(nextPin)) {
        return { ok: false, error: "Your new PIN must be 4 to 6 digits." };
      }
      const valid = await verifyRecoveryCode(
        code,
        currentAccount.recoverySalt,
        currentAccount.recoveryHash
      );
      if (!valid) return { ok: false, error: "That recovery code is not correct." };

      const pinRecord = await createPinRecord(nextPin);
      const updated: Account = {
        ...currentAccount,
        ...pinRecord,
        updatedAt: nowISO(),
      };
      await storeAccount(updated);
      setAccount(updated);
      accountRef.current = updated;
      clearAttempts(updated.id);
      setAuthLockUntil(null);
      writeSession(updated.id);
      setIsUnlocked(true);
      return { ok: true };
    },
    []
  );

  const regenerateRecoveryCode = useCallback(async (pin: string) => {
    const currentAccount = accountRef.current;
    if (!currentAccount) return { ok: false, error: "No account found." };
    const valid = await verifyPin(pin, currentAccount.pinSalt, currentAccount.pinHash);
    if (!valid) return { ok: false, error: "PIN is incorrect." };
    const code = generateRecoveryCode();
    const recoveryRecord = await createRecoveryRecord(code);
    const updated: Account = {
      ...currentAccount,
      ...recoveryRecord,
      updatedAt: nowISO(),
    };
    await storeAccount(updated);
    setAccount(updated);
    accountRef.current = updated;
    return { ok: true, code };
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; mobile?: string; location?: string }) => {
      const currentAccount = accountRef.current;
      if (!currentAccount) throw new Error("No account found.");
      const name = input.name.trim();
      if (name.length < 2) throw new Error("Please enter a valid name.");
      if (name.length > 80) throw new Error("That name is too long.");
      if (input.mobile && input.mobile.trim().length > 20) {
        throw new Error("That mobile number is too long.");
      }
      if (input.location && input.location.trim().length > 80) {
        throw new Error("That village or town name is too long.");
      }
      const updated: Account = {
        ...currentAccount,
        name,
        mobile: input.mobile?.trim() || undefined,
        location: input.location?.trim() || undefined,
        updatedAt: nowISO(),
      };
      await storeAccount(updated);
      setAccount(updated);
      accountRef.current = updated;
    },
    []
  );

  // --- Record helpers ---

  const saveTransaction = useCallback(
    async (draft: TransactionDraft, existingId?: string): Promise<Transaction> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      if (!Number.isSafeInteger(draft.amountPaise) || draft.amountPaise <= 0) {
        throw new Error("Please enter a valid amount.");
      }
      if (draft.kind !== "INCOME" && draft.kind !== "EXPENSE") {
        throw new Error("Please choose a valid record type.");
      }
      if (!isValidISODate(draft.date)) {
        throw new Error("Please choose a valid date.");
      }
      const category = draft.category.trim();
      if (!category) throw new Error("Please choose a category.");
      if (category.length > 60) throw new Error("That category name is too long.");
      if (!PAYMENT_METHOD_VALUES.has(draft.paymentMethod)) {
        throw new Error("Please choose a valid payment method.");
      }
      if (draft.group && !EXPENSE_GROUP_VALUES.has(draft.group)) {
        throw new Error("Please choose a valid expense group.");
      }
      if (
        draft.kind === "INCOME" &&
        draft.incomeStatus &&
        draft.incomeStatus !== "RECEIVED" &&
        draft.incomeStatus !== "PENDING"
      ) {
        throw new Error("Please choose a valid income status.");
      }
      if (draft.receiptDataUrl && !draft.receiptDataUrl.startsWith("data:image/")) {
        throw new Error("That receipt photo is not valid.");
      }
      if (draft.receiptDataUrl && draft.receiptDataUrl.length > 2_500_000) {
        throw new Error("That receipt photo is too large.");
      }
      if (draft.description.trim().length > 500) {
        throw new Error("The description is too long.");
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }
      const existing = existingId
        ? await getRecord<Transaction>(existingId)
        : null;
      if (existing?.labourPaymentId) {
        throw new Error("This expense belongs to a labour payment. Edit it from Labour.");
      }
      const land = draft.landId ? await getRecord<Land>(draft.landId) : null;
      if (draft.landId && !land) throw new Error("That land parcel could not be found.");
      const crop = draft.cropId ? await getRecord<Crop>(draft.cropId) : null;
      if (draft.cropId && !crop) throw new Error("That crop could not be found.");
      const vehicle = draft.vehicleId
        ? await getRecord<Vehicle>(draft.vehicleId)
        : null;
      if (draft.vehicleId && !vehicle) throw new Error("That vehicle could not be found.");
      const base = makeBase("transaction", existing ?? undefined);
      const group: ExpenseGroup =
        draft.kind === "INCOME"
          ? draft.group ?? (isFarmIncomeCategory(category) ? "FARM" : "HOME")
          : draft.group ?? "HOME";
      const record: Transaction = {
        ...base,
        entity: "transaction",
        kind: draft.kind,
        amountPaise: draft.amountPaise,
        date: draft.date,
        category,
        group,
        cropId: draft.cropId || undefined,
        cropName: crop?.name,
        landId: draft.landId || crop?.landId,
        landName: land?.name || crop?.landName,
        farmName: draft.farmName?.trim() || undefined,
        activity: draft.activity?.trim() || undefined,
        vehicleId: draft.vehicleId || undefined,
        vehicleName: vehicle?.name,
        paymentMethod: draft.paymentMethod,
        description: draft.description.trim() || category,
        notes: draft.notes?.trim() || undefined,
        receiptDataUrl: draft.receiptDataUrl || undefined,
        incomeStatus:
          draft.kind === "INCOME" ? draft.incomeStatus ?? "RECEIVED" : undefined,
        source: draft.source ?? "manual",
        isOpeningBalance: Boolean(draft.isOpeningBalance),
        quantity: draft.quantity,
        unit: draft.unit,
        ratePaise: draft.ratePaise,
        buyerName: draft.buyerName?.trim() || undefined,
        marketName: draft.marketName?.trim() || undefined,
        grossAmountPaise: draft.grossAmountPaise,
        otherChargesPaise: draft.otherChargesPaise,
        netAmountPaise: draft.netAmountPaise,
        pendingAmountPaise: draft.pendingAmountPaise,
      };
      await commitRecords([record]);
      return record;
    },
    [commitRecords, makeBase]
  );

  const saveOpeningBalance = useCallback(
    async (
      draft: {
        amountPaise: number;
        date: string;
        paymentMethod: PaymentMethod;
        notes?: string;
      },
      existingId?: string
    ): Promise<Transaction> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      if (!Number.isSafeInteger(draft.amountPaise) || draft.amountPaise <= 0) {
        throw new Error("Please enter a starting balance greater than zero.");
      }
      if (!isValidISODate(draft.date)) {
        throw new Error("Please choose a valid starting date.");
      }
      return saveTransaction(
        {
          kind: "INCOME",
          amountPaise: draft.amountPaise,
          date: draft.date,
          category: "Opening Balance",
          group: "HOME",
          paymentMethod: draft.paymentMethod,
          description: `Opening Balance (${draft.paymentMethod})`,
          notes: draft.notes,
          incomeStatus: "RECEIVED",
          source: "opening_balance",
          isOpeningBalance: true,
        },
        existingId
      );
    },
    [saveTransaction]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const existing = await getRecord<Transaction>(id);
      if (!existing) return;
      if (existing.labourPaymentId) {
        throw new Error("This expense belongs to a labour payment. Delete it from Labour.");
      }
      await commitRecords([softDeleted(existing)]);
    },
    [commitRecords, softDeleted]
  );

  const saveCrop = useCallback(
    async (draft: CropDraft, existingId?: string): Promise<Crop> => {
      const existing = existingId ? await getRecord<Crop>(existingId) : null;
      const land = draft.landId ? await getRecord<Land>(draft.landId) : null;
      if (draft.landId && !land) throw new Error("That plot could not be found.");
      const year = Number(draft.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new Error("Please enter a crop year between 1900 and 2100.");
      }
      if (!SEASON_VALUES.has(draft.season)) {
        throw new Error("Please choose a valid season.");
      }
      if (draft.name.trim().length < 1 || draft.name.trim().length > 80) {
        throw new Error("Please enter a crop name (up to 80 characters).");
      }
      if (draft.variety && draft.variety.trim().length > 60) {
        throw new Error("The variety name is too long.");
      }
      if (!isValidISODate(draft.sowingDate)) {
        throw new Error("Please choose a valid sowing date.");
      }
      if (draft.expectedHarvestDate && !isValidISODate(draft.expectedHarvestDate)) {
        throw new Error("Please choose a valid expected harvest date.");
      }
      if (draft.actualHarvestDate && !isValidISODate(draft.actualHarvestDate)) {
        throw new Error("Please choose a valid harvest date.");
      }
      if (
        draft.expectedHarvestDate &&
        draft.expectedHarvestDate < draft.sowingDate
      ) {
        throw new Error("The expected harvest cannot be before the sowing date.");
      }
      if (draft.actualHarvestDate && draft.actualHarvestDate < draft.sowingDate) {
        throw new Error("The harvest date cannot be before the sowing date.");
      }
      if (!Number.isFinite(draft.areaAcres) || draft.areaAcres < 0) {
        throw new Error("Please enter a valid area in acres.");
      }
      if (draft.areaAcres > 10_000_000) {
        throw new Error("That area is too large.");
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }
      if (
        draft.status !== "PLANNED" &&
        draft.status !== "ACTIVE" &&
        draft.status !== "HARVESTING" &&
        draft.status !== "COMPLETED"
      ) {
        throw new Error("Please choose a valid crop status.");
      }
      if (draft.status === "COMPLETED" && !draft.actualHarvestDate) {
        const fallback = todayISO();
        if (fallback < draft.sowingDate) {
          throw new Error("The harvest date cannot be before the sowing date.");
        }
      }
      const base = makeBase("crop", existing ?? undefined);
      const record: Crop = {
        ...base,
        entity: "crop",
        name: draft.name.trim(),
        variety: draft.variety?.trim() || undefined,
        season: draft.season,
        year: String(year),
        landId: draft.landId || undefined,
        landName: land?.name ?? existing?.landName ?? "Unassigned plot",
        areaAcres: Math.max(0, draft.areaAcres),
        sowingDate: draft.sowingDate,
        expectedHarvestDate: draft.expectedHarvestDate || undefined,
        actualHarvestDate:
          draft.status === "COMPLETED"
            ? draft.actualHarvestDate || todayISO()
            : undefined,
        status: draft.status,
        notes: draft.notes?.trim() || undefined,
      };
      if (!record.name) throw new Error("Please enter a crop name.");

      const updates: AnyRecord[] = [record];
      if (existing && existing.name !== record.name) {
        const transactions = (await getRecordsByEntity(
          record.ownerId,
          "transaction"
        )) as Transaction[];
        const labour = (await getRecordsByEntity(
          record.ownerId,
          "labour"
        )) as LabourPayment[];
        for (const transaction of transactions) {
          if (transaction.cropId === record.id && !transaction.deletedAt) {
            updates.push({
              ...transaction,
              cropName: record.name,
              updatedAt: nowISO(),
              dirty: true,
            });
          }
        }
        for (const payment of labour) {
          if (payment.cropId === record.id && !payment.deletedAt) {
            updates.push({
              ...payment,
              cropName: record.name,
              updatedAt: nowISO(),
              dirty: true,
            });
          }
        }
      }
      await commitRecords(updates);
      return record;
    },
    [commitRecords, makeBase]
  );

  const deleteCrop = useCallback(
    async (id: string) => {
      const existing = await getRecord<Crop>(id);
      if (existing) await commitRecords([softDeleted(existing)]);
    },
    [commitRecords, softDeleted]
  );

  const saveLand = useCallback(
    async (draft: LandDraft, existingId?: string): Promise<Land> => {
      const existing = existingId ? await getRecord<Land>(existingId) : null;
      const name = draft.name.trim();
      if (!name) throw new Error("Please enter a plot name.");
      if (name.length > 80) throw new Error("That plot name is too long.");
      if (!Number.isFinite(draft.areaAcres) || draft.areaAcres < 0) {
        throw new Error("Please enter a valid area in acres.");
      }
      if (draft.areaAcres > 10_000_000) {
        throw new Error("That area is too large.");
      }
      if (draft.soilType && draft.soilType.trim().length > 80) {
        throw new Error("The soil type is too long.");
      }
      if (draft.irrigation && draft.irrigation.trim().length > 80) {
        throw new Error("The irrigation note is too long.");
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }
      const base = makeBase("land", existing ?? undefined);
      const record: Land = {
        ...base,
        entity: "land",
        name,
        surveyNumber: draft.surveyNumber?.trim() || undefined,
        totalArea: draft.totalArea,
        areaUnit: draft.areaUnit,
        areaAcres: draft.areaAcres,
        location: draft.location?.trim() || undefined,
        soilType: draft.soilType?.trim() || undefined,
        irrigation: draft.irrigation?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
      };
      await commitRecords([record]);
      return record;
    },
    [commitRecords, makeBase]
  );

  const deleteLand = useCallback(
    async (id: string) => {
      const existing = await getRecord<Land>(id);
      if (existing) await commitRecords([softDeleted(existing)]);
    },
    [commitRecords, softDeleted]
  );

  const saveCropSale = useCallback(
    async (draft: CropSaleDraft, existingId?: string): Promise<CropSale> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      const crop = await getRecord<Crop>(draft.cropId);
      if (!crop) throw new Error("Please select a crop.");
      if (!Number.isFinite(draft.quantitySold) || draft.quantitySold <= 0) {
        throw new Error("Please enter a valid quantity sold.");
      }
      if (!Number.isSafeInteger(draft.ratePerUnitPaise) || draft.ratePerUnitPaise <= 0) {
        throw new Error("Please enter a valid selling price.");
      }
      if (!isValidISODate(draft.saleDate)) {
        throw new Error("Please choose a valid sale date.");
      }

      const grossAmountPaise =
        draft.grossAmountPaise ?? Math.round(draft.quantitySold * draft.ratePerUnitPaise);
      const transportChargesPaise = Math.max(0, draft.transportChargesPaise || 0);
      const otherChargesPaise = Math.max(0, draft.otherChargesPaise || 0);
      const netAmountPaise = Math.max(
        0,
        grossAmountPaise - transportChargesPaise - otherChargesPaise
      );
      const totalAmountPaise = netAmountPaise;

      const landId = draft.landId || crop.landId;
      let landName = crop.landName;
      if (landId) {
        const land = await getRecord<Land>(landId);
        if (land) landName = land.name;
      }

      const existing = existingId ? await getRecord<CropSale>(existingId) : null;
      const base = makeBase("cropsale", existing ?? undefined);

      let payments: CropSalePayment[] | undefined = draft.payments
        ? [...draft.payments]
        : existing?.payments
        ? [...existing.payments]
        : undefined;

      const receivedPaise = payments && payments.length > 0
        ? sumPaise(payments.map((p) => p.amountPaise))
        : Math.min(totalAmountPaise, Math.max(0, draft.receivedPaise || 0));

      const pendingPaise = Math.max(0, totalAmountPaise - receivedPaise);

      if (receivedPaise > 0 && (!payments || payments.length === 0)) {
        payments = [
          {
            id: `pmt-init-${base.id.slice(-6)}`,
            amountPaise: receivedPaise,
            date: draft.saleDate,
            paymentMethod: draft.paymentMethod,
            notes: "Initial payment",
            createdAt: base.createdAt,
          },
        ];
      }

      const updates: AnyRecord[] = [];
      let transactionId = existing?.transactionId;

      const existingTransactions = (await getRecordsByEntity(
        base.ownerId,
        "transaction"
      )) as Transaction[];
      const activeLinked = existingTransactions.filter(
        (t) =>
          !t.deletedAt &&
          ((transactionId && t.id === transactionId) ||
            (existingId && t.notes?.includes(`[cropsale:${existingId}]`)))
      );

      if (receivedPaise > 0) {
        const primary = activeLinked[0];
        const txBase = makeBase("transaction", primary ?? undefined);
        transactionId = txBase.id;
        const transaction: Transaction = {
          ...txBase,
          entity: "transaction",
          kind: "INCOME",
          amountPaise: receivedPaise,
          date: draft.saleDate,
          category: "Crop Sales",
          group: "FARM",
          cropId: crop.id,
          cropName: crop.name,
          landId: landId || undefined,
          landName: landName || undefined,
          paymentMethod: draft.paymentMethod,
          incomeStatus: "RECEIVED",
          description: `Sold ${draft.quantitySold} ${draft.unit} ${crop.name}${draft.buyerName ? ` to ${draft.buyerName}` : ""}${draft.marketName ? ` at ${draft.marketName}` : ""}`,
          notes: `[cropsale:${base.id}]${draft.notes ? ` · ${draft.notes}` : ""}`,
          quantity: draft.quantitySold,
          unit: draft.unit,
          ratePaise: draft.ratePerUnitPaise,
          buyerName: draft.buyerName?.trim() || undefined,
          marketName: draft.marketName?.trim() || undefined,
          grossAmountPaise,
          otherChargesPaise: otherChargesPaise > 0 ? otherChargesPaise : undefined,
          netAmountPaise,
          pendingAmountPaise: pendingPaise > 0 ? pendingPaise : undefined,
        };
        updates.push(transaction);
        for (const extra of activeLinked.slice(1)) {
          updates.push(softDeleted(extra));
        }
      } else {
        for (const t of activeLinked) {
          updates.push(softDeleted(t));
        }
        transactionId = undefined;
      }

      const record: CropSale = {
        ...base,
        entity: "cropsale",
        cropId: crop.id,
        cropName: crop.name,
        landId: landId || undefined,
        landName: landName || undefined,
        harvestedQuantity: draft.harvestedQuantity,
        quantitySold: draft.quantitySold,
        quantityRemaining: draft.quantityRemaining,
        unit: draft.unit,
        ratePerUnitPaise: draft.ratePerUnitPaise,
        grossAmountPaise,
        totalAmountPaise,
        transportChargesPaise: transportChargesPaise > 0 ? transportChargesPaise : undefined,
        otherChargesPaise: otherChargesPaise > 0 ? otherChargesPaise : undefined,
        netAmountPaise,
        receivedPaise,
        pendingPaise,
        buyerName: draft.buyerName?.trim() || undefined,
        marketName: draft.marketName?.trim() || undefined,
        saleDate: draft.saleDate,
        paymentMethod: draft.paymentMethod,
        notes: draft.notes?.trim() || undefined,
        transactionId,
        payments,
      };

      updates.unshift(record);
      await commitRecords(updates);
      return record;
    },
    [commitRecords, makeBase, softDeleted]
  );

  const recordCropSalePayment = useCallback(
    async (
      saleId: string,
      payment: {
        amountPaise: number;
        date: ISODate;
        paymentMethod: PaymentMethod;
        notes?: string;
      }
    ): Promise<CropSale> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      const sale = await getRecord<CropSale>(saleId);
      if (!sale) throw new Error("Crop sale record not found.");
      if (!Number.isSafeInteger(payment.amountPaise) || payment.amountPaise <= 0) {
        throw new Error("Please enter a valid payment amount.");
      }
      if (payment.amountPaise > sale.pendingPaise) {
        throw new Error(`Payment cannot exceed pending amount of ${formatINR(sale.pendingPaise)}.`);
      }
      if (!isValidISODate(payment.date)) {
        throw new Error("Please choose a valid payment date.");
      }

      const txBase = makeBase("transaction");
      const pmtId = `pmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const pmtRecord: CropSalePayment = {
        id: pmtId,
        amountPaise: payment.amountPaise,
        date: payment.date,
        paymentMethod: payment.paymentMethod,
        notes: payment.notes?.trim() || undefined,
        transactionId: txBase.id,
        createdAt: nowISO(),
      };

      const updatedPayments: CropSalePayment[] = sale.payments ? [...sale.payments] : [];
      if (updatedPayments.length === 0 && sale.receivedPaise > 0) {
        updatedPayments.push({
          id: `pmt-init-${sale.id.slice(-6)}`,
          amountPaise: sale.receivedPaise,
          date: sale.saleDate,
          paymentMethod: sale.paymentMethod,
          notes: "Initial payment",
          transactionId: sale.transactionId,
          createdAt: sale.createdAt,
        });
      }
      updatedPayments.push(pmtRecord);

      const newReceived = sale.receivedPaise + payment.amountPaise;
      const netTotal = sale.netAmountPaise ?? sale.totalAmountPaise;
      const newPending = Math.max(0, netTotal - newReceived);

      const newTx: Transaction = {
        ...txBase,
        entity: "transaction",
        kind: "INCOME",
        amountPaise: payment.amountPaise,
        date: payment.date,
        category: "Crop Sales",
        group: "FARM",
        cropId: sale.cropId,
        cropName: sale.cropName,
        landId: sale.landId,
        landName: sale.landName,
        paymentMethod: payment.paymentMethod,
        incomeStatus: "RECEIVED",
        description: `Payment for ${sale.cropName} sale (${sale.buyerName || "Buyer"})`,
        notes: `[cropsale:${sale.id}]${payment.notes ? ` · ${payment.notes}` : ""}`,
      };

      const updatedSale: CropSale = {
        ...sale,
        receivedPaise: newReceived,
        pendingPaise: newPending,
        payments: updatedPayments,
        updatedAt: nowISO(),
        dirty: true,
      };

      await commitRecords([updatedSale, newTx]);
      return updatedSale;
    },
    [commitRecords, makeBase]
  );

  const deleteCropSale = useCallback(
    async (id: string) => {
      const sale = await getRecord<CropSale>(id);
      if (!sale) return;
      const transactions = (await getRecordsByEntity(
        sale.ownerId,
        "transaction"
      )) as Transaction[];
      const updates: AnyRecord[] = [softDeleted(sale)];
      for (const tx of transactions) {
        if (
          !tx.deletedAt &&
          (tx.id === sale.transactionId || tx.notes?.includes(`[cropsale:${id}]`))
        ) {
          updates.push(softDeleted(tx));
        }
      }
      await commitRecords(updates);
    },
    [commitRecords, softDeleted]
  );

  const saveLabourPayment = useCallback(
    async (draft: LabourDraft, existingId?: string): Promise<LabourPayment> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      const crop = await getRecord<Crop>(draft.cropId);
      if (!crop) throw new Error("Please select a crop.");
      const land = draft.landId ? await getRecord<Land>(draft.landId) : null;
      if (!LABOUR_ACTIVITY_VALUES.has(draft.activity)) {
        throw new Error("Please choose a valid work activity.");
      }
      if (
        draft.status !== "PAID" &&
        draft.status !== "PENDING" &&
        draft.status !== "PARTIAL"
      ) {
        throw new Error("Please choose a valid payment status.");
      }
      if (!Number.isInteger(draft.workers) || draft.workers <= 0 || draft.workers > 10_000) {
        throw new Error("Enter a valid number of workers.");
      }
      if (
        !Number.isSafeInteger(draft.ratePaise) ||
        draft.ratePaise <= 0 ||
        draft.ratePaise > MAX_AMOUNT_PAISE
      ) {
        throw new Error("Enter a valid rate per worker per day.");
      }
      if (!Number.isFinite(draft.days) || draft.days <= 0 || draft.days > 3_650) {
        throw new Error("Enter a valid number of days.");
      }
      if (!isValidISODate(draft.paymentDate)) {
        throw new Error("Please choose a valid work date.");
      }
      if (!PAYMENT_METHOD_VALUES.has(draft.paymentMethod)) {
        throw new Error("Please choose a valid payment method.");
      }

      const amountPaise = labourAmountPaise(draft.workers, draft.ratePaise, draft.days);
      if (amountPaise <= 0) throw new Error("The labour amount is too large.");

      let paidPaise = 0;
      let remainingPaise = amountPaise;
      let finalStatus: "PAID" | "PENDING" | "PARTIAL" = draft.status;

      if (draft.status === "PAID") {
        paidPaise = amountPaise;
        remainingPaise = 0;
        finalStatus = "PAID";
      } else if (draft.status === "PENDING") {
        paidPaise = 0;
        remainingPaise = amountPaise;
        finalStatus = "PENDING";
      } else if (draft.status === "PARTIAL") {
        const rawPaid = draft.paidPaise ?? 0;
        paidPaise = Math.max(0, Math.min(amountPaise, rawPaid));
        remainingPaise = Math.max(0, amountPaise - paidPaise);
        finalStatus = paidPaise >= amountPaise ? "PAID" : paidPaise > 0 ? "PARTIAL" : "PENDING";
      }

      if (paidPaise > 0) {
        const paidDate = draft.paidDate ?? draft.paymentDate;
        if (!isValidISODate(paidDate)) {
          throw new Error("Please choose a valid payment date.");
        }
      }
      if (draft.description && draft.description.trim().length > 500) {
        throw new Error("The work note is too long.");
      }

      const existing = existingId
        ? await getRecord<LabourPayment>(existingId)
        : null;
      const base = makeBase("labour", existing ?? undefined);
      const labourId = base.id;
      const timestamp = nowISO();

      const allTransactions = (await getRecordsByEntity(
        accountRef.current.id,
        "transaction"
      )) as Transaction[];
      const linked = allTransactions.filter(
        (transaction) => transaction.labourPaymentId === labourId
      );
      const activeLinked = linked.filter((transaction) => !transaction.deletedAt);
      const updates: AnyRecord[] = [];

      let transactionId: string | undefined;
      if (paidPaise > 0) {
        const existingTransaction = activeLinked[0];
        transactionId = existingTransaction?.id ?? randomId("transaction");
        const transaction: Transaction = {
          id: transactionId,
          entity: "transaction",
          ownerId: accountRef.current.id,
          createdAt: existingTransaction?.createdAt ?? timestamp,
          updatedAt: timestamp,
          dirty: true,
          kind: "EXPENSE",
          amountPaise: paidPaise,
          date: draft.paidDate ?? draft.paymentDate,
          category: "Labour",
          group: "FARM",
          cropId: crop.id,
          cropName: crop.name,
          landId: draft.landId || crop.landId,
          landName: land?.name || crop.landName,
          labourPaymentId: labourId,
          paymentMethod: draft.paymentMethod,
          description:
            draft.workerName?.trim()
              ? `${draft.workerName.trim()} · ${draft.activity}`
              : draft.description?.trim() || `${crop.name} — ${draft.activity} labour`,
          notes:
            draft.notes?.trim() ||
            `${draft.workers} worker${draft.workers > 1 ? "s" : ""} × ${draft.days} day${
              draft.days === 1 ? "" : "s"
            }${remainingPaise > 0 ? ` · Remaining balance: ₹${Math.round(remainingPaise / 100)}` : ""}`,
          source: "labour",
        };
        updates.push(transaction);
        for (const extra of activeLinked.slice(1)) {
          updates.push(softDeleted(extra));
        }
      } else {
        for (const transaction of activeLinked) {
          updates.push(softDeleted(transaction));
        }
        transactionId = undefined;
      }

      const labour: LabourPayment = {
        ...base,
        entity: "labour",
        cropId: crop.id,
        cropName: crop.name,
        landId: draft.landId || crop.landId,
        landName: land?.name || crop.landName,
        workerName: draft.workerName?.trim() || undefined,
        activity: draft.activity,
        workers: Math.round(draft.workers),
        ratePaise: Math.round(draft.ratePaise),
        days: draft.days,
        amountPaise,
        paidPaise,
        remainingPaise,
        status: finalStatus,
        paymentDate: draft.paymentDate,
        paidDate: paidPaise > 0 ? (draft.paidDate ?? draft.paymentDate) : undefined,
        paymentMethod: draft.paymentMethod,
        transactionId,
        description: draft.description?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
      };
      updates.unshift(labour);
      await commitRecords(updates);
      return labour;
    },
    [commitRecords, makeBase, softDeleted]
  );

  const markLabourPaid = useCallback(
    async (id: string, paidDate?: string, additionalPaidPaise?: number) => {
      const labour = await getRecord<LabourPayment>(id);
      if (!labour) throw new Error("Labour payment not found.");
      if (labour.status === "PAID") return;
      const prevPaid = labour.paidPaise ?? 0;
      const prevRemaining = labour.remainingPaise ?? (labour.amountPaise - prevPaid);
      let newPaid = labour.amountPaise;
      let newStatus: "PAID" | "PARTIAL" = "PAID";
      if (
        additionalPaidPaise !== undefined &&
        additionalPaidPaise > 0 &&
        additionalPaidPaise < prevRemaining
      ) {
        newPaid = prevPaid + additionalPaidPaise;
        newStatus = "PARTIAL";
      }
      await saveLabourPayment(
        {
          cropId: labour.cropId,
          landId: labour.landId,
          workerName: labour.workerName,
          activity: labour.activity,
          workers: labour.workers,
          ratePaise: labour.ratePaise,
          days: labour.days,
          status: newStatus,
          paidPaise: newPaid,
          paymentDate: labour.paymentDate,
          paidDate: paidDate ?? todayISO(),
          paymentMethod: labour.paymentMethod,
          description: labour.description,
          notes: labour.notes,
        },
        labour.id
      );
    },
    [saveLabourPayment]
  );

  const deleteLabourPayment = useCallback(
    async (id: string) => {
      const labour = await getRecord<LabourPayment>(id);
      if (!labour) return;
      const transactions = (await getRecordsByEntity(
        labour.ownerId,
        "transaction"
      )) as Transaction[];
      const updates: AnyRecord[] = [softDeleted(labour)];
      for (const transaction of transactions) {
        if (transaction.labourPaymentId === id && !transaction.deletedAt) {
          updates.push(softDeleted(transaction));
        }
      }
      await commitRecords(updates);
    },
    [commitRecords, softDeleted]
  );

  const saveVehicle = useCallback(
    async (draft: VehicleDraft, existingId?: string): Promise<Vehicle> => {
      const existing = existingId ? await getRecord<Vehicle>(existingId) : null;
      const name = draft.name.trim();
      if (!name) throw new Error("Please enter a vehicle name.");
      if (name.length > 80) throw new Error("That vehicle name is too long.");
      if (!VEHICLE_TYPE_VALUES.has(draft.type)) {
        throw new Error("Please choose a valid vehicle type.");
      }
      const registrationNumber = draft.registrationNumber.trim().toUpperCase();
      if (!registrationNumber) {
        throw new Error("Please enter the registration number.");
      }
      if (registrationNumber.length > 20) {
        throw new Error("That registration number is too long.");
      }
      if (draft.status !== "ACTIVE" && draft.status !== "SOLD" && draft.status !== "MAINTENANCE") {
        throw new Error("Please choose a valid vehicle status.");
      }
      const dateFields: [string | undefined, string][] = [
        [draft.purchaseDate, "purchase"],
        [draft.serviceDate, "last service"],
        [draft.nextServiceDate, "next service"],
        [draft.insuranceExpiry, "insurance expiry"],
        [draft.pucExpiry, "PUC expiry"],
        [draft.registrationExpiry, "registration expiry"],
        [draft.tyreReplacementDate, "tyre replacement"],
        [draft.loanPaymentDate, "EMI"],
      ];
      for (const [value, label] of dateFields) {
        if (value && !isValidISODate(value)) {
          throw new Error(`Please choose a valid ${label} date.`);
        }
      }
      if (
        draft.serviceDate &&
        draft.nextServiceDate &&
        draft.nextServiceDate < draft.serviceDate
      ) {
        throw new Error("The next service date cannot be before the last service date.");
      }
      if (draft.fuelType && draft.fuelType.trim().length > 40) {
        throw new Error("The fuel type is too long.");
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }
      const purchasePricePaise = draft.purchasePricePaise ?? 0;
      const loanEmiPaise = draft.loanEmiPaise ?? 0;
      if (
        !Number.isSafeInteger(purchasePricePaise) ||
        purchasePricePaise < 0 ||
        purchasePricePaise > MAX_AMOUNT_PAISE
      ) {
        throw new Error("Please enter a valid purchase price.");
      }
      if (
        !Number.isSafeInteger(loanEmiPaise) ||
        loanEmiPaise < 0 ||
        loanEmiPaise > MAX_AMOUNT_PAISE
      ) {
        throw new Error("Please enter a valid EMI amount.");
      }
      if (draft.type === "Tractor" && draft.tractor) {
        const tractorValues: [number | undefined, string][] = [
          [draft.tractor.hoursUsed, "total hours"],
          [draft.tractor.ownFarmHours, "own farm hours"],
          [draft.tractor.otherFarmHours, "rented hours"],
          [draft.tractor.dieselLitres, "diesel litres"],
        ];
        for (const [value, label] of tractorValues) {
          if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
            throw new Error(`Please enter valid ${label}.`);
          }
        }
        const maintenancePaise = draft.tractor.maintenancePaise ?? 0;
        if (
          !Number.isSafeInteger(maintenancePaise) ||
          maintenancePaise < 0 ||
          maintenancePaise > MAX_AMOUNT_PAISE
        ) {
          throw new Error("Please enter a valid maintenance cost.");
        }
      }
      const base = makeBase("vehicle", existing ?? undefined);
      const record: Vehicle = {
        ...base,
        entity: "vehicle",
        name,
        type: draft.type,
        registrationNumber,
        brand: draft.brand?.trim() || undefined,
        model: draft.model?.trim() || undefined,
        purchaseDate: draft.purchaseDate || undefined,
        purchasePricePaise,
        status: draft.status,
        fuelType: draft.fuelType?.trim() || undefined,
        serviceDate: draft.serviceDate || undefined,
        nextServiceDate: draft.nextServiceDate || undefined,
        insuranceExpiry: draft.insuranceExpiry || undefined,
        pucExpiry: draft.pucExpiry || undefined,
        registrationExpiry: draft.registrationExpiry || undefined,
        tyreReplacementDate: draft.tyreReplacementDate || undefined,
        loanEmiPaise,
        loanPaymentDate: draft.loanPaymentDate || undefined,
        loanId: draft.loanId || undefined,
        loanAmountPaise: draft.loanAmountPaise || undefined,
        downPaymentPaise: draft.downPaymentPaise || undefined,
        photoDataUrl: draft.photoDataUrl || existing?.photoDataUrl,
        serviceHistory: draft.serviceHistory || existing?.serviceHistory,
        tractor:
          draft.type === "Tractor"
            ? {
                hoursUsed: draft.tractor?.hoursUsed ?? existing?.tractor?.hoursUsed ?? 0,
                ownFarmHours: draft.tractor?.ownFarmHours ?? existing?.tractor?.ownFarmHours ?? 0,
                otherFarmHours: draft.tractor?.otherFarmHours ?? existing?.tractor?.otherFarmHours ?? 0,
                dieselLitres: draft.tractor?.dieselLitres ?? existing?.tractor?.dieselLitres ?? 0,
                maintenancePaise: draft.tractor?.maintenancePaise ?? existing?.tractor?.maintenancePaise ?? 0,
                logs: draft.tractor?.logs ?? existing?.tractor?.logs,
              }
            : undefined,
        notes: draft.notes?.trim() || undefined,
      };
      const updates: AnyRecord[] = [record];
      if (existing && existing.name !== record.name) {
        const transactions = (await getRecordsByEntity(
          record.ownerId,
          "transaction"
        )) as Transaction[];
        for (const transaction of transactions) {
          if (transaction.vehicleId === record.id && !transaction.deletedAt) {
            updates.push({
              ...transaction,
              vehicleName: record.name,
              updatedAt: nowISO(),
              dirty: true,
            });
          }
        }
      }
      await commitRecords(updates);
      return record;
    },
    [commitRecords, makeBase]
  );

  const deleteVehicle = useCallback(
    async (id: string) => {
      const existing = await getRecord<Vehicle>(id);
      if (existing) await commitRecords([softDeleted(existing)]);
    },
    [commitRecords, softDeleted]
  );

  const saveVehicleServiceRecord = useCallback(
    async (
      vehicleId: string,
      serviceDraft: {
        date: ISODate;
        serviceType: string;
        serviceCenter?: string;
        amountPaise: number;
        nextServiceDate?: ISODate;
        odometerReading?: number;
        engineHours?: number;
        notes?: string;
        paymentMethod?: PaymentMethod;
      }
    ): Promise<Vehicle> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      const vehicle = await getRecord<Vehicle>(vehicleId);
      if (!vehicle) throw new Error("Vehicle not found.");
      if (!isValidISODate(serviceDraft.date)) throw new Error("Please choose a valid service date.");
      if (!serviceDraft.serviceType.trim()) throw new Error("Please select or enter service type.");
      if (!Number.isSafeInteger(serviceDraft.amountPaise) || serviceDraft.amountPaise < 0) {
        throw new Error("Please enter a valid amount.");
      }

      const srvId = `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const updates: AnyRecord[] = [];
      let transactionId: string | undefined;

      if (serviceDraft.amountPaise > 0) {
        const txBase = makeBase("transaction");
        transactionId = txBase.id;
        const tx: Transaction = {
          ...txBase,
          entity: "transaction",
          kind: "EXPENSE",
          amountPaise: serviceDraft.amountPaise,
          date: serviceDraft.date,
          category: "Servicing",
          group: "VEHICLE",
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          paymentMethod: serviceDraft.paymentMethod || "CASH",
          description: `${serviceDraft.serviceType}${serviceDraft.serviceCenter ? ` at ${serviceDraft.serviceCenter}` : ""}`,
          notes: `[vehicleservice:${srvId}]${serviceDraft.notes ? ` · ${serviceDraft.notes}` : ""}`,
        };
        updates.push(tx);
      }

      const srvRecord: VehicleServiceRecord = {
        id: srvId,
        date: serviceDraft.date,
        serviceType: serviceDraft.serviceType.trim(),
        serviceCenter: serviceDraft.serviceCenter?.trim() || undefined,
        amountPaise: serviceDraft.amountPaise,
        nextServiceDate: serviceDraft.nextServiceDate || undefined,
        odometerReading: serviceDraft.odometerReading,
        engineHours: serviceDraft.engineHours,
        notes: serviceDraft.notes?.trim() || undefined,
        transactionId,
        createdAt: nowISO(),
      };

      const serviceHistory = vehicle.serviceHistory ? [srvRecord, ...vehicle.serviceHistory] : [srvRecord];
      const updatedVehicle: Vehicle = {
        ...vehicle,
        serviceDate: serviceDraft.date,
        nextServiceDate: serviceDraft.nextServiceDate || vehicle.nextServiceDate,
        serviceHistory,
        updatedAt: nowISO(),
        dirty: true,
      };
      updates.unshift(updatedVehicle);

      await commitRecords(updates);
      return updatedVehicle;
    },
    [commitRecords, makeBase]
  );

  const recordTractorWorkLog = useCallback(
    async (
      vehicleId: string,
      workDraft: {
        date: ISODate;
        hours: number;
        operationType: string;
        farmType: "OWN" | "RENTAL";
        clientName?: string;
        dieselLitres?: number;
        ratePerHourPaise?: number;
        incomeAmountPaise?: number;
        receivedPaise?: number;
        paymentStatus?: "RECEIVED" | "PARTIAL" | "PENDING";
        paymentMethod?: PaymentMethod;
        notes?: string;
      }
    ): Promise<Vehicle> => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      const vehicle = await getRecord<Vehicle>(vehicleId);
      if (!vehicle) throw new Error("Vehicle not found.");
      if (vehicle.type !== "Tractor") throw new Error("Work logs can only be recorded for tractors.");
      if (!isValidISODate(workDraft.date)) throw new Error("Please choose a valid date.");
      if (!Number.isFinite(workDraft.hours) || workDraft.hours <= 0) {
        throw new Error("Please enter valid hours worked.");
      }

      const logId = `twl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const updates: AnyRecord[] = [];
      let transactionId: string | undefined;

      const ratePaise = workDraft.ratePerHourPaise || 0;
      const grossIncomePaise = workDraft.incomeAmountPaise ?? Math.round(workDraft.hours * ratePaise);
      const receivedPaise = workDraft.paymentStatus === "RECEIVED"
        ? grossIncomePaise
        : workDraft.paymentStatus === "PENDING"
        ? 0
        : Math.min(grossIncomePaise, workDraft.receivedPaise || 0);
      const pendingPaise = Math.max(0, grossIncomePaise - receivedPaise);

      if (workDraft.farmType === "RENTAL" && grossIncomePaise > 0) {
        const txBase = makeBase("transaction");
        transactionId = txBase.id;
        const txAmount = workDraft.paymentStatus === "PENDING" ? grossIncomePaise : receivedPaise;
        const tx: Transaction = {
          ...txBase,
          entity: "transaction",
          kind: "INCOME",
          amountPaise: txAmount,
          date: workDraft.date,
          category: "Tractor Rental",
          group: "FARM",
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          paymentMethod: workDraft.paymentMethod || "CASH",
          incomeStatus: workDraft.paymentStatus === "PENDING" ? "PENDING" : "RECEIVED",
          description: `Tractor ${workDraft.operationType} (${workDraft.hours} hrs) for ${workDraft.clientName || "Farmer"}`,
          notes: `[tractorlog:${logId}]${workDraft.notes ? ` · ${workDraft.notes}` : ""}`,
          quantity: workDraft.hours,
          unit: "Hours",
          ratePaise: ratePaise > 0 ? ratePaise : undefined,
          buyerName: workDraft.clientName?.trim() || undefined,
          grossAmountPaise: grossIncomePaise,
          netAmountPaise: grossIncomePaise,
          pendingAmountPaise: pendingPaise > 0 ? pendingPaise : undefined,
        };
        updates.push(tx);
      }

      const logRecord: TractorWorkLog = {
        id: logId,
        date: workDraft.date,
        hours: workDraft.hours,
        operationType: workDraft.operationType.trim(),
        farmType: workDraft.farmType,
        clientName: workDraft.clientName?.trim() || undefined,
        dieselLitres: workDraft.dieselLitres || undefined,
        ratePerHourPaise: ratePaise > 0 ? ratePaise : undefined,
        incomeAmountPaise: grossIncomePaise > 0 ? grossIncomePaise : undefined,
        receivedPaise: receivedPaise > 0 ? receivedPaise : undefined,
        pendingPaise: pendingPaise > 0 ? pendingPaise : undefined,
        paymentStatus: workDraft.farmType === "RENTAL" ? workDraft.paymentStatus || "RECEIVED" : undefined,
        transactionId,
        notes: workDraft.notes?.trim() || undefined,
        createdAt: nowISO(),
      };

      const currentTractor = vehicle.tractor || {};
      const logs = currentTractor.logs ? [logRecord, ...currentTractor.logs] : [logRecord];
      const ownAdd = workDraft.farmType === "OWN" ? workDraft.hours : 0;
      const rentalAdd = workDraft.farmType === "RENTAL" ? workDraft.hours : 0;
      const dieselAdd = workDraft.dieselLitres || 0;

      const updatedVehicle: Vehicle = {
        ...vehicle,
        tractor: {
          ...currentTractor,
          hoursUsed: (currentTractor.hoursUsed || 0) + workDraft.hours,
          ownFarmHours: (currentTractor.ownFarmHours || 0) + ownAdd,
          otherFarmHours: (currentTractor.otherFarmHours || 0) + rentalAdd,
          dieselLitres: (currentTractor.dieselLitres || 0) + dieselAdd,
          logs,
        },
        updatedAt: nowISO(),
        dirty: true,
      };
      updates.unshift(updatedVehicle);

      await commitRecords(updates);
      return updatedVehicle;
    },
    [commitRecords, makeBase]
  );

  const saveReminder = useCallback(
    async (draft: ReminderDraft, existingId?: string): Promise<Reminder> => {
      const existing = existingId ? await getRecord<Reminder>(existingId) : null;
      const title = draft.title.trim();
      if (title.length < 2) throw new Error("Please enter a reminder title.");
      if (title.length > 120) throw new Error("That reminder title is too long.");
      if (!isValidISODate(draft.date)) {
        throw new Error("Please choose a valid reminder date.");
      }
      if (draft.time && !isValidTime(draft.time)) {
        throw new Error("Please choose a valid reminder time.");
      }
      if (!REMINDER_CATEGORY_VALUES.has(draft.category)) {
        throw new Error("Please choose a valid reminder category.");
      }
      if (!REPEAT_VALUES.has(draft.repeat)) {
        throw new Error("Please choose a valid repeat option.");
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }
      if (
        draft.linkedType &&
        !REMINDER_LINK_TYPES.has(draft.linkedType)
      ) {
        throw new Error("That linked reminder type is not valid.");
      }
      const base = makeBase("reminder", existing ?? undefined);
      const record: Reminder = {
        ...base,
        entity: "reminder",
        title,
        date: draft.date,
        time: draft.time || undefined,
        category: draft.category,
        notes: draft.notes?.trim() || undefined,
        repeat: draft.repeat,
        notify: Boolean(draft.notify),
        completed: existing?.completed ?? false,
        completedAt: existing?.completedAt,
        linkedType: draft.linkedType,
        linkedId: draft.linkedId,
      };
      await commitRecords([record]);
      return record;
    },
    [commitRecords, makeBase]
  );

  const completeReminder = useCallback(
    async (id: string) => {
      const reminder = await getRecord<Reminder>(id);
      if (!reminder || reminder.completed) return;
      const timestamp = nowISO();
      const completed: Reminder = {
        ...reminder,
        completed: true,
        completedAt: timestamp,
        updatedAt: timestamp,
        dirty: true,
      };
      const updates: AnyRecord[] = [completed];

      if (reminder.repeat !== "NONE") {
        let nextDate = advanceRepeat(reminder.date, reminder.repeat);
        let guard = 0;
        while (nextDate <= todayISO() && guard < 60) {
          nextDate = advanceRepeat(nextDate, reminder.repeat);
          guard += 1;
        }
        const next: Reminder = {
          ...reminder,
          id: randomId("reminder"),
          date: nextDate,
          completed: false,
          completedAt: undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
          dirty: true,
        };
        updates.push(next);
      }
      await commitRecords(updates);
    },
    [commitRecords]
  );

  const reopenReminder = useCallback(
    async (id: string) => {
      const reminder = await getRecord<Reminder>(id);
      if (!reminder) return;
      await commitRecords([
        {
          ...reminder,
          completed: false,
          completedAt: undefined,
          updatedAt: nowISO(),
          dirty: true,
        },
      ]);
    },
    [commitRecords]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const reminder = await getRecord<Reminder>(id);
      if (reminder) await commitRecords([softDeleted(reminder)]);
    },
    [commitRecords, softDeleted]
  );

  const saveLoan = useCallback(
    async (draft: LoanDraft, existingId?: string): Promise<Loan> => {
      const existing = existingId ? await getRecord<Loan>(existingId) : null;
      const base = makeBase("loan", existing ?? undefined);
      const repayments = existing?.repayments ?? [];
      const principalRepaid = repayments.reduce(
        (sum, repayment) => sum + (repayment.principalPaise ?? repayment.amountPaise),
        0
      );
      const isSettled = draft.principalPaise - principalRepaid <= 0;
      const calculatedStatus: LoanStatus = isSettled
        ? "COMPLETED"
        : draft.status ?? (existing?.status === "WRITTEN_OFF" ? "WRITTEN_OFF" : "ACTIVE");

      const record: Loan = {
        ...base,
        entity: "loan",
        type: draft.type,
        partyName: draft.partyName.trim(),
        contactNumber: draft.contactNumber?.trim() || undefined,
        category: draft.category?.trim() || undefined,
        purpose: draft.purpose?.trim() || undefined,
        principalPaise: draft.principalPaise,
        interestRate: Math.max(0, draft.interestRate),
        interestType: draft.interestType ?? (draft.interestRate > 0 ? "SIMPLE" : "NONE"),
        date: draft.date,
        repaymentStartDate: draft.repaymentStartDate || undefined,
        durationMonths: draft.durationMonths,
        emiPaise: draft.emiPaise,
        paymentFrequency: draft.paymentFrequency,
        dueDate: draft.dueDate || undefined,
        repayments,
        status: calculatedStatus,
        notes: draft.notes?.trim() || undefined,
        documentUrl: draft.documentUrl,
        receiptDataUrl: draft.receiptDataUrl,
        vehicleId: draft.vehicleId || undefined,
        vehicleName: draft.vehicleName?.trim() || undefined,
      };
      if (draft.type !== "BORROWED" && draft.type !== "LENT") {
        throw new Error("Please choose a valid loan type.");
      }
      if (record.partyName.length < 2) throw new Error("Please enter a name.");
      if (record.partyName.length > 80) throw new Error("That name is too long.");
      if (!Number.isSafeInteger(record.principalPaise) || record.principalPaise <= 0) {
        throw new Error("Please enter a valid amount.");
      }
      if (record.principalPaise > MAX_AMOUNT_PAISE) {
        throw new Error("That amount is too large.");
      }
      if (!isValidISODate(record.date)) {
        throw new Error("Please choose a valid date.");
      }
      if (record.dueDate && !isValidISODate(record.dueDate)) {
        throw new Error("Please choose a valid due date.");
      }
      if (record.dueDate && record.dueDate < record.date) {
        throw new Error("The due date cannot be before the loan date.");
      }
      if (!Number.isFinite(record.interestRate) || record.interestRate > 10_000) {
        throw new Error("Please enter a valid interest rate.");
      }
      if (record.purpose && record.purpose.length > 200) {
        throw new Error("The purpose is too long.");
      }
      if (record.principalPaise < principalRepaid) {
        throw new Error("The principal cannot be less than the amount already repaid.");
      }

      const recordsToCommit: AnyRecord[] = [record];

      const allReminders = recordsRef.current.filter(
        (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
      );
      const existingReminder = allReminders.find(
        (r) => r.linkedType === "loan" && r.linkedId === record.id
      );

      if (draft.dueDate && (draft.createReminder || existingReminder)) {
        const reminderDate = draft.dueDate;
        const reminderTitle = `${draft.type === "BORROWED" ? "Loan Due" : "Collection Due"}: ${record.partyName}`;
        if (existingReminder) {
          recordsToCommit.push({
            ...existingReminder,
            title: reminderTitle,
            date: reminderDate,
            completed: isSettled,
            updatedAt: nowISO(),
            dirty: true,
          });
        } else if (draft.createReminder && !isSettled) {
          const remBase = makeBase("reminder");
          const newReminder: Reminder = {
            ...remBase,
            entity: "reminder",
            title: reminderTitle,
            date: reminderDate,
            category: "Loan",
            repeat: "NONE",
            notify: true,
            completed: false,
            linkedType: "loan",
            linkedId: record.id,
            notes: `Loan ${draft.type === "BORROWED" ? "repayment" : "collection"} for ${record.partyName}`,
          };
          recordsToCommit.push(newReminder);
        }
      } else if (isSettled && existingReminder && !existingReminder.completed) {
        recordsToCommit.push({
          ...existingReminder,
          completed: true,
          completedAt: nowISO(),
          updatedAt: nowISO(),
          dirty: true,
        });
      }

      await commitRecords(recordsToCommit);
      return record;
    },
    [commitRecords, makeBase]
  );

  const addLoanRepayment = useCallback(
    async (
      loanId: string,
      repayment: LoanRepaymentDraft | Omit<LoanRepayment, "id">
    ) => {
      const loan = await getRecord<Loan>(loanId);
      if (!loan) throw new Error("Loan not found.");
      if (!Number.isSafeInteger(repayment.amountPaise) || repayment.amountPaise <= 0) {
        throw new Error("Please enter a valid repayment amount.");
      }
      if (!isValidISODate(repayment.date)) {
        throw new Error("Please choose a valid repayment date.");
      }

      const totalAmount = repayment.amountPaise;
      let interest = ("interestPaise" in repayment ? repayment.interestPaise : undefined) ?? 0;
      let principal = "principalPaise" in repayment ? repayment.principalPaise : undefined;

      if (principal === undefined) {
        principal = Math.max(0, totalAmount - interest);
      } else if (interest === 0 && totalAmount > principal) {
        interest = totalAmount - principal;
      }

      const alreadyRepaidPrincipal = loan.repayments.reduce(
        (sum, item) => sum + (item.principalPaise ?? item.amountPaise),
        0
      );
      const outstandingPrincipal = Math.max(0, loan.principalPaise - alreadyRepaidPrincipal);

      if (principal > outstandingPrincipal) {
        throw new Error(
          `Principal portion cannot exceed remaining outstanding balance of ${formatINR(outstandingPrincipal)}.`
        );
      }

      const repaymentId = randomId("repayment");
      const recordsToCommit: AnyRecord[] = [];

      let transactionId: string | undefined = undefined;
      const shouldRecordCash = "recordCashTransaction" in repayment ? repayment.recordCashTransaction : false;
      if (shouldRecordCash) {
        transactionId = randomId("tx");
        const isBorrowed = loan.type === "BORROWED";
        const txBase = makeBase("transaction");
        const tx: Transaction = {
          ...txBase,
          id: transactionId,
          entity: "transaction",
          date: repayment.date,
          amountPaise: totalAmount,
          kind: isBorrowed ? "EXPENSE" : "INCOME",
          group: isBorrowed ? "OTHER" : "HOME",
          category: isBorrowed
            ? (interest > 0 && principal === 0 ? "Loan Interest" : "Loan Repayment")
            : (interest > 0 && principal === 0 ? "Interest Income" : "Loan Recovery"),
          paymentMethod: repayment.paymentMethod,
          description: isBorrowed
            ? `Loan repayment to ${loan.partyName}${interest > 0 ? ` (Interest: ${formatINR(interest)})` : ""}`
            : `Loan collection from ${loan.partyName}${interest > 0 ? ` (Interest: ${formatINR(interest)})` : ""}`,
          vehicleId: loan.vehicleId,
          vehicleName: loan.vehicleName,
          notes: `[loan:${loan.id}] [repayment:${repaymentId}]${repayment.notes ? ` ${repayment.notes}` : ""}`,
        };
        recordsToCommit.push(tx);
      }

      const newRepayment: LoanRepayment = {
        id: repaymentId,
        date: repayment.date,
        amountPaise: totalAmount,
        principalPaise: principal,
        interestPaise: interest > 0 ? interest : undefined,
        paymentMethod: repayment.paymentMethod,
        reference: ("reference" in repayment ? repayment.reference : undefined)?.trim() || undefined,
        receiptDataUrl: "receiptDataUrl" in repayment ? repayment.receiptDataUrl : undefined,
        notes: repayment.notes?.trim() || undefined,
        transactionId,
        createdAt: nowISO(),
      };

      const nextRepayments = [...loan.repayments, newRepayment];
      const nextRepaidPrincipal = nextRepayments.reduce(
        (sum, item) => sum + (item.principalPaise ?? item.amountPaise),
        0
      );
      const isSettled = loan.principalPaise - nextRepaidPrincipal <= 0;

      const updatedLoan: Loan = {
        ...loan,
        repayments: nextRepayments,
        status: isSettled ? "COMPLETED" : loan.status === "WRITTEN_OFF" ? "WRITTEN_OFF" : "ACTIVE",
        updatedAt: nowISO(),
        dirty: true,
      };
      recordsToCommit.push(updatedLoan);

      if (isSettled) {
        const allReminders = recordsRef.current.filter(
          (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
        );
        const linkedReminder = allReminders.find(
          (r) => r.linkedType === "loan" && r.linkedId === loan.id && !r.completed
        );
        if (linkedReminder) {
          recordsToCommit.push({
            ...linkedReminder,
            completed: true,
            completedAt: nowISO(),
            updatedAt: nowISO(),
            dirty: true,
          });
        }
      }

      await commitRecords(recordsToCommit);
    },
    [commitRecords, makeBase]
  );

  const updateLoanRepayment = useCallback(
    async (
      loanId: string,
      repaymentId: string,
      updates: Partial<LoanRepaymentDraft>
    ) => {
      const loan = await getRecord<Loan>(loanId);
      if (!loan) throw new Error("Loan not found.");
      const existingRepayment = loan.repayments.find((r) => r.id === repaymentId);
      if (!existingRepayment) throw new Error("Repayment not found.");

      const amountPaise = updates.amountPaise ?? existingRepayment.amountPaise;
      const date = updates.date ?? existingRepayment.date;
      const paymentMethod = updates.paymentMethod ?? existingRepayment.paymentMethod;
      const principalPaise = updates.principalPaise ?? existingRepayment.principalPaise;
      const interestPaise = updates.interestPaise ?? existingRepayment.interestPaise;
      const reference = updates.reference ?? existingRepayment.reference;
      const notes = updates.notes ?? existingRepayment.notes;
      const receiptDataUrl = updates.receiptDataUrl ?? existingRepayment.receiptDataUrl;

      const updatedRepayments = loan.repayments.map((r) =>
        r.id === repaymentId
          ? {
              ...r,
              amountPaise,
              date,
              paymentMethod,
              principalPaise,
              interestPaise,
              reference: reference || undefined,
              notes: notes || undefined,
              receiptDataUrl: receiptDataUrl || undefined,
            }
          : r
      );

      const nextRepaidPrincipal = updatedRepayments.reduce(
        (sum, item) => sum + (item.principalPaise ?? item.amountPaise),
        0
      );
      const isSettled = loan.principalPaise - nextRepaidPrincipal <= 0;

      const recordsToCommit: AnyRecord[] = [];

      if (existingRepayment.transactionId) {
        const tx = await getRecord<Transaction>(existingRepayment.transactionId);
        if (tx) {
          recordsToCommit.push({
            ...tx,
            amountPaise,
            date,
            paymentMethod,
            updatedAt: nowISO(),
            dirty: true,
          });
        }
      }

      recordsToCommit.push({
        ...loan,
        repayments: updatedRepayments,
        status: isSettled ? "COMPLETED" : loan.status === "WRITTEN_OFF" ? "WRITTEN_OFF" : "ACTIVE",
        updatedAt: nowISO(),
        dirty: true,
      });

      await commitRecords(recordsToCommit);
    },
    [commitRecords]
  );

  const deleteLoanRepayment = useCallback(
    async (loanId: string, repaymentId: string) => {
      const loan = await getRecord<Loan>(loanId);
      if (!loan) return;
      const targetRepayment = loan.repayments.find((item) => item.id === repaymentId);
      const nextRepayments = loan.repayments.filter((item) => item.id !== repaymentId);
      const repaidPrincipal = nextRepayments.reduce(
        (sum, item) => sum + (item.principalPaise ?? item.amountPaise),
        0
      );
      const recordsToCommit: AnyRecord[] = [];

      if (targetRepayment?.transactionId) {
        const tx = await getRecord<Transaction>(targetRepayment.transactionId);
        if (tx) recordsToCommit.push(softDeleted(tx));
      }

      recordsToCommit.push({
        ...loan,
        repayments: nextRepayments,
        status: loan.principalPaise - repaidPrincipal <= 0 ? "COMPLETED" : "ACTIVE",
        updatedAt: nowISO(),
        dirty: true,
      });

      await commitRecords(recordsToCommit);
    },
    [commitRecords, softDeleted]
  );

  const deleteLoan = useCallback(
    async (id: string) => {
      const loan = await getRecord<Loan>(id);
      if (!loan) return;
      const recordsToCommit: AnyRecord[] = [softDeleted(loan)];

      for (const r of loan.repayments ?? []) {
        if (r.transactionId) {
          const tx = await getRecord<Transaction>(r.transactionId);
          if (tx) recordsToCommit.push(softDeleted(tx));
        }
      }

      const allReminders = recordsRef.current.filter(
        (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
      );
      const linkedReminders = allReminders.filter(
        (rem) => rem.linkedType === "loan" && rem.linkedId === id
      );
      for (const rem of linkedReminders) {
        recordsToCommit.push(softDeleted(rem));
      }

      await commitRecords(recordsToCommit);
    },
    [commitRecords, softDeleted]
  );

  const saveInventoryItem = useCallback(
    async (draft: InventoryDraft, existingId?: string): Promise<InventoryItem> => {
      const existing = existingId ? await getRecord<InventoryItem>(existingId) : null;
      const itemName = draft.itemName.trim();
      if (itemName.length < 2) throw new Error("Please enter an item name.");
      if (itemName.length > 100) throw new Error("That item name is too long.");
      const category = (draft.category || "").trim();
      if (!category) {
        throw new Error("Please choose a valid inventory category.");
      }
      const quantity = Number(draft.quantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error("Please enter a valid quantity.");
      }
      if (quantity > 1_000_000_000) {
        throw new Error("That quantity is too large.");
      }
      if (!isValidISODate(draft.purchaseDate)) {
        throw new Error("Please choose a valid purchase date.");
      }
      const unit = draft.unit.trim();
      if (!unit) throw new Error("Please enter a unit such as kg or litre.");
      if (unit.length > INVENTORY_UNIT_MAX) throw new Error("That unit name is too long.");
      if (
        !Number.isSafeInteger(draft.unitPricePaise) ||
        draft.unitPricePaise < 0 ||
        draft.unitPricePaise > MAX_AMOUNT_PAISE
      ) {
        throw new Error("Please enter a valid unit price.");
      }
      const remainingQuantity = Number(draft.remainingQuantity);
      if (!Number.isFinite(remainingQuantity) || remainingQuantity < 0) {
        throw new Error("Please enter a valid remaining quantity.");
      }
      const minQuantity = Number(draft.minQuantity);
      if (!Number.isFinite(minQuantity) || minQuantity < 0) {
        throw new Error("Please enter a valid low-stock level.");
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }

      const base = makeBase("inventory", existing ?? undefined);
      const record: InventoryItem = {
        ...base,
        entity: "inventory",
        itemName,
        category: category as InventoryCategory,
        subcategory: draft.subcategory?.trim() || existing?.subcategory,
        brand: draft.brand?.trim() || existing?.brand,
        description: draft.description?.trim() || existing?.description,
        quantity,
        unit,
        unitPricePaise: draft.unitPricePaise,
        purchaseDate: draft.purchaseDate,
        remainingQuantity,
        minQuantity,
        storageLocation: draft.storageLocation?.trim() || existing?.storageLocation,
        expiryDate: draft.expiryDate ? draft.expiryDate : existing?.expiryDate,
        batchNumber: draft.batchNumber?.trim() || existing?.batchNumber,
        supplierName: draft.supplierName?.trim() || existing?.supplierName,
        supplierContact: draft.supplierContact?.trim() || existing?.supplierContact,
        notes: draft.notes?.trim() || undefined,
        isArchived: draft.isArchived ?? existing?.isArchived ?? false,
        purchases: existing?.purchases ?? [],
        usageHistory: existing?.usageHistory ?? [],
        adjustments: existing?.adjustments ?? [],
      };

      const recordsToCommit: AnyRecord[] = [record];

      // Reminder sync
      const allReminders = recordsRef.current.filter(
        (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
      );

      // Expiry reminder
      const existingExpiryRem = allReminders.find(
        (r) => r.linkedType === "inventory_expiry" && r.linkedId === record.id
      );
      if (record.expiryDate) {
        if (existingExpiryRem) {
          recordsToCommit.push({
            ...existingExpiryRem,
            date: record.expiryDate,
            title: `Expiry: ${record.itemName}`,
            updatedAt: nowISO(),
            dirty: true,
          });
        } else {
          const remBase = makeBase("reminder");
          const newRem: Reminder = {
            ...remBase,
            entity: "reminder",
            title: `Expiry: ${record.itemName}`,
            date: record.expiryDate,
            category: "Inventory",
            repeat: "NONE",
            notify: true,
            completed: false,
            linkedType: "inventory_expiry",
            linkedId: record.id,
            notes: `Batch: ${record.batchNumber || "N/A"} · ${record.remainingQuantity} ${record.unit} remaining`,
          };
          recordsToCommit.push(newRem);
        }
      } else if (existingExpiryRem) {
        recordsToCommit.push(softDeleted(existingExpiryRem));
      }

      // Low-stock reminder
      const existingLowRem = allReminders.find(
        (r) => r.linkedType === "inventory_low_stock" && r.linkedId === record.id
      );
      if (record.minQuantity > 0 && record.remainingQuantity <= record.minQuantity) {
        if (existingLowRem) {
          recordsToCommit.push({
            ...existingLowRem,
            title: `Low Stock: ${record.itemName} (${record.remainingQuantity} ${record.unit} left)`,
            completed: false,
            updatedAt: nowISO(),
            dirty: true,
          });
        } else {
          const remBase = makeBase("reminder");
          const newRem: Reminder = {
            ...remBase,
            entity: "reminder",
            title: `Low Stock: ${record.itemName} (${record.remainingQuantity} ${record.unit} left)`,
            date: todayISO(),
            category: "Inventory",
            repeat: "NONE",
            notify: true,
            completed: false,
            linkedType: "inventory_low_stock",
            linkedId: record.id,
          };
          recordsToCommit.push(newRem);
        }
      } else if (
        existingLowRem &&
        record.remainingQuantity > record.minQuantity &&
        !existingLowRem.completed
      ) {
        recordsToCommit.push({
          ...existingLowRem,
          completed: true,
          completedAt: nowISO(),
          updatedAt: nowISO(),
          dirty: true,
        });
      }

      await commitRecords(recordsToCommit);
      return record;
    },
    [commitRecords, makeBase, softDeleted]
  );

  const recordStockPurchase = useCallback(
    async (
      itemId: string,
      draft: StockPurchaseDraft
    ): Promise<{ item: InventoryItem; purchase: InventoryPurchase; transaction?: Transaction }> => {
      const item = await getRecord<InventoryItem>(itemId);
      if (!item) throw new Error("Inventory product not found.");
      if (!isValidISODate(draft.purchaseDate)) {
        throw new Error("Please choose a valid purchase date.");
      }
      if (!draft.supplierName.trim()) {
        throw new Error("Please enter a supplier or shop name.");
      }
      if (!Number.isFinite(draft.quantity) || draft.quantity <= 0) {
        throw new Error("Please enter a quantity greater than zero.");
      }
      if (!areUnitsCompatible(draft.unit, item.unit)) {
        throw new Error(
          `Incompatible unit: Purchase unit '${draft.unit}' cannot be converted to '${item.unit}'.`
        );
      }
      const convertedQty = convertUnitQuantity(draft.quantity, draft.unit, item.unit);
      const lineCost = Math.round(draft.quantity * Math.max(0, draft.pricePerUnitPaise));
      const totalCost = Math.max(
        0,
        lineCost - (draft.discountPaise || 0) + (draft.transportPaise || 0)
      );

      let paidPaise = 0;
      let pendingPaise = 0;
      if (draft.paymentStatus === "PAID") {
        paidPaise = totalCost;
        pendingPaise = 0;
      } else if (draft.paymentStatus === "PENDING") {
        paidPaise = 0;
        pendingPaise = totalCost;
      } else {
        paidPaise = Math.min(totalCost, Math.max(0, draft.paidPaise || 0));
        pendingPaise = Math.max(0, totalCost - paidPaise);
      }

      const purchaseId = randomId();
      const purchase: InventoryPurchase = {
        id: purchaseId,
        itemId: item.id,
        purchaseDate: draft.purchaseDate,
        supplierName: draft.supplierName.trim(),
        supplierContact: draft.supplierContact?.trim() || undefined,
        quantity: draft.quantity,
        unit: draft.unit.trim(),
        pricePerUnitPaise: draft.pricePerUnitPaise,
        discountPaise: draft.discountPaise || 0,
        transportPaise: draft.transportPaise || 0,
        totalCostPaise: totalCost,
        paymentStatus: draft.paymentStatus,
        paidPaise,
        pendingPaise,
        paymentMethod: draft.paymentMethod || "CASH",
        invoiceNumber: draft.invoiceNumber?.trim() || undefined,
        invoiceDataUrl: draft.invoiceDataUrl || undefined,
        notes: draft.notes?.trim() || undefined,
        received: draft.received !== false,
        createdAt: nowISO(),
      };

      const recordsToCommit: AnyRecord[] = [];
      let tx: Transaction | undefined;

      if (paidPaise > 0) {
        const txBase = makeBase("transaction");
        tx = {
          ...txBase,
          entity: "transaction",
          date: purchase.purchaseDate,
          kind: "EXPENSE",
          category: "Farm Supplies",
          group: "FARM",
          amountPaise: paidPaise,
          paymentMethod: purchase.paymentMethod || "CASH",
          description: `Stock: ${item.itemName} (${purchase.quantity} ${purchase.unit})`,
          notes: `[inventory_purchase:${purchase.id}] ${purchase.supplierName}`,
          receiptDataUrl: purchase.invoiceDataUrl,
          inventoryItemId: item.id,
          inventoryPurchaseId: purchase.id,
        };
        purchase.transactionId = tx.id;
        recordsToCommit.push(tx);
      }

      const isReceived = purchase.received !== false;
      const nextRemaining = isReceived
        ? item.remainingQuantity + convertedQty
        : item.remainingQuantity;
      const nextTotalQty = isReceived ? item.quantity + convertedQty : item.quantity;

      const updatedItem: InventoryItem = {
        ...item,
        quantity: nextTotalQty,
        remainingQuantity: nextRemaining,
        purchases: [...(item.purchases ?? []), purchase],
        supplierName: purchase.supplierName,
        supplierContact: purchase.supplierContact || item.supplierContact,
        unitPricePaise:
          purchase.pricePerUnitPaise > 0
            ? Math.round(purchase.totalCostPaise / Math.max(1, purchase.quantity))
            : item.unitPricePaise,
        updatedAt: nowISO(),
        dirty: true,
      };
      recordsToCommit.push(updatedItem);

      // Complete low stock reminder if stock recovered
      if (nextRemaining > item.minQuantity) {
        const allReminders = recordsRef.current.filter(
          (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
        );
        const lowRem = allReminders.find(
          (r) => r.linkedType === "inventory_low_stock" && r.linkedId === item.id && !r.completed
        );
        if (lowRem) {
          recordsToCommit.push({
            ...lowRem,
            completed: true,
            completedAt: nowISO(),
            updatedAt: nowISO(),
            dirty: true,
          });
        }
      }

      await commitRecords(recordsToCommit);
      return { item: updatedItem, purchase, transaction: tx };
    },
    [commitRecords, makeBase]
  );

  const recordStockUsage = useCallback(
    async (
      itemId: string,
      draft: StockUsageDraft
    ): Promise<{ item: InventoryItem; usage: InventoryUsage }> => {
      const item = await getRecord<InventoryItem>(itemId);
      if (!item) throw new Error("Inventory product not found.");
      if (!isValidISODate(draft.usageDate)) {
        throw new Error("Please choose a valid usage date.");
      }
      if (!Number.isFinite(draft.quantityUsed) || draft.quantityUsed <= 0) {
        throw new Error("Please enter a quantity used greater than zero.");
      }
      if (!areUnitsCompatible(draft.unit, item.unit)) {
        throw new Error(
          `Incompatible unit: Cannot consume '${draft.unit}' from an item measured in '${item.unit}'.`
        );
      }
      const convertedQty = convertUnitQuantity(draft.quantityUsed, draft.unit, item.unit);
      if (convertedQty > item.remainingQuantity) {
        throw new Error(
          `Insufficient stock: Only ${item.remainingQuantity} ${item.unit} available in stock.`
        );
      }

      const avgPrice = averagePurchasePricePaise(item);
      const costPaise = Math.round(convertedQty * avgPrice);

      const crop = draft.cropId
        ? recordsRef.current.find(
            (r): r is Crop => r.entity === "crop" && r.id === draft.cropId && !r.deletedAt
          )
        : undefined;
      const landId = draft.landId || crop?.landId;
      const land = landId
        ? recordsRef.current.find(
            (r): r is Land => r.entity === "land" && r.id === landId && !r.deletedAt
          )
        : undefined;

      const usageId = randomId();
      const usage: InventoryUsage = {
        id: usageId,
        itemId: item.id,
        usageDate: draft.usageDate,
        quantityUsed: draft.quantityUsed,
        unit: draft.unit.trim(),
        cropId: draft.cropId || undefined,
        cropName: crop?.name || undefined,
        landId: land?.id || undefined,
        landName: land?.name || undefined,
        activity: draft.activity?.trim() || undefined,
        costPaise,
        notes: draft.notes?.trim() || undefined,
        createdAt: nowISO(),
      };

      const nextRemaining = Math.max(0, item.remainingQuantity - convertedQty);
      const updatedItem: InventoryItem = {
        ...item,
        remainingQuantity: nextRemaining,
        usageHistory: [...(item.usageHistory ?? []), usage],
        updatedAt: nowISO(),
        dirty: true,
      };

      const recordsToCommit: AnyRecord[] = [updatedItem];

      // Check if item dropped to low stock
      if (item.minQuantity > 0 && nextRemaining <= item.minQuantity) {
        const allReminders = recordsRef.current.filter(
          (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
        );
        const existingLow = allReminders.find(
          (r) => r.linkedType === "inventory_low_stock" && r.linkedId === item.id
        );
        if (existingLow) {
          recordsToCommit.push({
            ...existingLow,
            title: `Low Stock: ${item.itemName} (${nextRemaining} ${item.unit} left)`,
            completed: false,
            updatedAt: nowISO(),
            dirty: true,
          });
        } else {
          const remBase = makeBase("reminder");
          recordsToCommit.push({
            ...remBase,
            entity: "reminder",
            title: `Low Stock: ${item.itemName} (${nextRemaining} ${item.unit} left)`,
            date: todayISO(),
            category: "Inventory",
            repeat: "NONE",
            notify: true,
            completed: false,
            linkedType: "inventory_low_stock",
            linkedId: item.id,
          });
        }
      }

      await commitRecords(recordsToCommit);
      return { item: updatedItem, usage };
    },
    [commitRecords, makeBase]
  );

  const recordStockAdjustment = useCallback(
    async (
      itemId: string,
      draft: StockAdjustmentDraft
    ): Promise<{ item: InventoryItem; adjustment: InventoryAdjustment }> => {
      const item = await getRecord<InventoryItem>(itemId);
      if (!item) throw new Error("Inventory product not found.");
      if (!isValidISODate(draft.date)) {
        throw new Error("Please choose a valid adjustment date.");
      }
      if (!draft.reason.trim()) {
        throw new Error("Please enter a reason for this adjustment.");
      }
      if (!areUnitsCompatible(draft.unit, item.unit)) {
        throw new Error(
          `Incompatible unit: Adjustment unit '${draft.unit}' is not compatible with '${item.unit}'.`
        );
      }
      const convertedDelta = convertUnitQuantity(draft.quantityDelta, draft.unit, item.unit);
      const nextRemaining = item.remainingQuantity + convertedDelta;
      if (nextRemaining < 0) {
        throw new Error(
          `Adjustment cannot result in negative stock (would be ${nextRemaining} ${item.unit}).`
        );
      }

      const adjustmentId = randomId();
      const adjustment: InventoryAdjustment = {
        id: adjustmentId,
        itemId: item.id,
        date: draft.date,
        type: draft.type,
        quantityDelta: draft.quantityDelta,
        unit: draft.unit.trim(),
        reason: draft.reason.trim(),
        locationFrom: draft.locationFrom?.trim() || undefined,
        locationTo: draft.locationTo?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
        createdAt: nowISO(),
      };

      const updatedItem: InventoryItem = {
        ...item,
        remainingQuantity: nextRemaining,
        storageLocation:
          draft.type === "TRANSFER" && draft.locationTo?.trim()
            ? draft.locationTo.trim()
            : item.storageLocation,
        adjustments: [...(item.adjustments ?? []), adjustment],
        updatedAt: nowISO(),
        dirty: true,
      };

      const recordsToCommit: AnyRecord[] = [updatedItem];

      if (item.minQuantity > 0 && nextRemaining <= item.minQuantity) {
        const allReminders = recordsRef.current.filter(
          (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
        );
        const existingLow = allReminders.find(
          (r) => r.linkedType === "inventory_low_stock" && r.linkedId === item.id
        );
        if (!existingLow || existingLow.completed) {
          const remBase = makeBase("reminder");
          recordsToCommit.push({
            ...remBase,
            entity: "reminder",
            title: `Low Stock: ${item.itemName} (${nextRemaining} ${item.unit} left)`,
            date: todayISO(),
            category: "Inventory",
            repeat: "NONE",
            notify: true,
            completed: false,
            linkedType: "inventory_low_stock",
            linkedId: item.id,
          });
        }
      }

      await commitRecords(recordsToCommit);
      return { item: updatedItem, adjustment };
    },
    [commitRecords, makeBase]
  );

  const deleteStockPurchase = useCallback(
    async (itemId: string, purchaseId: string) => {
      const item = await getRecord<InventoryItem>(itemId);
      if (!item) return;
      const purchase = (item.purchases ?? []).find((p) => p.id === purchaseId);
      if (!purchase) return;

      const recordsToCommit: AnyRecord[] = [];
      let convertedQty = 0;
      try {
        convertedQty = convertUnitQuantity(purchase.quantity, purchase.unit, item.unit);
      } catch {
        convertedQty = purchase.quantity;
      }

      const nextRemaining =
        purchase.received !== false
          ? Math.max(0, item.remainingQuantity - convertedQty)
          : item.remainingQuantity;
      const nextTotalQty =
        purchase.received !== false
          ? Math.max(0, item.quantity - convertedQty)
          : item.quantity;

      const updatedItem: InventoryItem = {
        ...item,
        quantity: nextTotalQty,
        remainingQuantity: nextRemaining,
        purchases: (item.purchases ?? []).filter((p) => p.id !== purchaseId),
        updatedAt: nowISO(),
        dirty: true,
      };
      recordsToCommit.push(updatedItem);

      if (purchase.transactionId) {
        const tx = await getRecord<Transaction>(purchase.transactionId);
        if (tx) recordsToCommit.push(softDeleted(tx));
      }

      await commitRecords(recordsToCommit);
    },
    [commitRecords, softDeleted]
  );

  const deleteStockUsage = useCallback(
    async (itemId: string, usageId: string) => {
      const item = await getRecord<InventoryItem>(itemId);
      if (!item) return;
      const usage = (item.usageHistory ?? []).find((u) => u.id === usageId);
      if (!usage) return;

      let convertedQty = 0;
      try {
        convertedQty = convertUnitQuantity(usage.quantityUsed, usage.unit, item.unit);
      } catch {
        convertedQty = usage.quantityUsed;
      }

      const updatedItem: InventoryItem = {
        ...item,
        remainingQuantity: item.remainingQuantity + convertedQty,
        usageHistory: (item.usageHistory ?? []).filter((u) => u.id !== usageId),
        updatedAt: nowISO(),
        dirty: true,
      };

      await commitRecords([updatedItem]);
    },
    [commitRecords]
  );

  const deleteStockAdjustment = useCallback(
    async (itemId: string, adjustmentId: string) => {
      const item = await getRecord<InventoryItem>(itemId);
      if (!item) return;
      const adjustment = (item.adjustments ?? []).find((a) => a.id === adjustmentId);
      if (!adjustment) return;

      let convertedDelta = 0;
      try {
        convertedDelta = convertUnitQuantity(adjustment.quantityDelta, adjustment.unit, item.unit);
      } catch {
        convertedDelta = adjustment.quantityDelta;
      }

      const updatedItem: InventoryItem = {
        ...item,
        remainingQuantity: Math.max(0, item.remainingQuantity - convertedDelta),
        adjustments: (item.adjustments ?? []).filter((a) => a.id !== adjustmentId),
        updatedAt: nowISO(),
        dirty: true,
      };

      await commitRecords([updatedItem]);
    },
    [commitRecords]
  );

  const archiveInventoryItem = useCallback(
    async (id: string) => {
      const item = await getRecord<InventoryItem>(id);
      if (!item) return;
      await commitRecords([
        {
          ...item,
          isArchived: true,
          updatedAt: nowISO(),
          dirty: true,
        },
      ]);
    },
    [commitRecords]
  );

  const adjustInventoryStock = useCallback(
    async (id: string, delta: number) => {
      const item = await getRecord<InventoryItem>(id);
      if (!item) return;
      await commitRecords([
        {
          ...item,
          remainingQuantity: Math.max(0, item.remainingQuantity + delta),
          updatedAt: nowISO(),
          dirty: true,
        },
      ]);
    },
    [commitRecords]
  );

  const deleteInventoryItem = useCallback(
    async (id: string) => {
      const item = await getRecord<InventoryItem>(id);
      if (!item) return;
      const recordsToCommit: AnyRecord[] = [softDeleted(item)];

      for (const p of item.purchases ?? []) {
        if (p.transactionId) {
          const tx = await getRecord<Transaction>(p.transactionId);
          if (tx) recordsToCommit.push(softDeleted(tx));
        }
      }

      const allReminders = recordsRef.current.filter(
        (r): r is Reminder => r.entity === "reminder" && !r.deletedAt
      );
      const linkedReminders = allReminders.filter(
        (rem) =>
          (rem.linkedType === "inventory_expiry" || rem.linkedType === "inventory_low_stock") &&
          rem.linkedId === id
      );
      for (const rem of linkedReminders) {
        recordsToCommit.push(softDeleted(rem));
      }

      await commitRecords(recordsToCommit);
    },
    [commitRecords, softDeleted]
  );

  const saveFamilyMember = useCallback(
    async (draft: FamilyDraft, existingId?: string): Promise<FamilyMember> => {
      const existing = existingId
        ? await getRecord<FamilyMember>(existingId)
        : null;
      const name = draft.name.trim();
      if (name.length < 2) throw new Error("Please enter a name.");
      if (name.length > 80) throw new Error("That name is too long.");
      const relation = draft.relation.trim() || "Family";
      if (relation.length > 40) throw new Error("That relation is too long.");
      if (draft.dateOfBirth) {
        if (!isValidISODate(draft.dateOfBirth)) {
          throw new Error("Please choose a valid date of birth.");
        }
        if (draft.dateOfBirth < "1900-01-01") {
          throw new Error("Please choose a date of birth after 1900.");
        }
        if (draft.dateOfBirth > todayISO()) {
          throw new Error("The date of birth cannot be in the future.");
        }
      }
      const phone = draft.phone?.trim() || undefined;
      if (phone) {
        if (phone.length > 20) throw new Error("That phone number is too long.");
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 6 || digits.length > 15) {
          throw new Error("Please enter a valid phone number.");
        }
      }
      if (draft.notes && draft.notes.trim().length > 1_000) {
        throw new Error("The notes are too long.");
      }
      const base = makeBase("family", existing ?? undefined);
      const record: FamilyMember = {
        ...base,
        entity: "family",
        name,
        relation,
        dateOfBirth: draft.dateOfBirth || undefined,
        phone,
        notes: draft.notes?.trim() || undefined,
      };
      await commitRecords([record]);
      return record;
    },
    [commitRecords, makeBase]
  );

  const deleteFamilyMember = useCallback(
    async (id: string) => {
      const member = await getRecord<FamilyMember>(id);
      if (member) await commitRecords([softDeleted(member)]);
    },
    [commitRecords, softDeleted]
  );

  const addCustomCategory = useCallback(
    async (group: CustomCategory["group"], name: string) => {
      if (!accountRef.current) throw new Error("Your account is locked.");
      if (!CUSTOM_CATEGORY_GROUPS.has(group)) {
        throw new Error("Please choose a valid category group.");
      }
      const clean = name.trim().replace(/\s+/g, " ");
      if (clean.length < 2) throw new Error("Please enter a category name.");
      if (clean.length > 60) throw new Error("That category name is too long.");
      const all = (await getRecordsByEntity(
        accountRef.current.id,
        "category"
      )) as CustomCategory[];
      const duplicate = all.some(
        (category) =>
          !category.deletedAt &&
          category.group === group &&
          category.name.toLowerCase() === clean.toLowerCase()
      );
      if (duplicate) throw new Error("That category already exists.");
      const base = makeBase("category");
      const record: CustomCategory = {
        ...base,
        entity: "category",
        group,
        name: clean,
      };
      await commitRecords([record]);
    },
    [commitRecords, makeBase]
  );

  const deleteCustomCategory = useCallback(
    async (id: string) => {
      const category = await getRecord<CustomCategory>(id);
      if (category) await commitRecords([softDeleted(category)]);
    },
    [commitRecords, softDeleted]
  );

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLanguageState(lang);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("personal_bank_lang", lang);
          document.documentElement.lang = lang;
        } catch {}
      }
      const next: Preferences = { ...preferences, language: lang };
      setPreferences(next);
      await storePreferences(next);
    },
    [preferences]
  );

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      if (patch.language) {
        setLanguageState(patch.language);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("personal_bank_lang", patch.language);
            document.documentElement.lang = patch.language;
          } catch {}
        }
      }
      const next = { ...preferences, ...patch };
      setPreferences(next);
      await storePreferences(next);
    },
    [preferences]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params);
    },
    [language]
  );

  const formatCurrency = useCallback(
    (
      paise: number | undefined | null,
      options?: { showDecimals?: boolean; absolute?: boolean }
    ) => {
      return formatLocalizedINR(paise, language, options);
    },
    [language]
  );

  const formatNumber = useCallback(
    (value: number, maxFractionDigits = 2) => {
      return formatLocalizedNumber(value, language, maxFractionDigits);
    },
    [language]
  );

  const formatDate = useCallback(
    (
      date: string | Date | undefined,
      style: "short" | "medium" | "long" = "medium"
    ) => {
      return formatLocalizedDate(date, language, style);
    },
    [language]
  );

  const rememberCategory = useCallback(
    (key: string, category: string) => {
      setPreferences((previous) => {
        const next: Preferences = {
          ...previous,
          lastUsedCategory: { ...previous.lastUsedCategory, [key]: category },
        };
        void storePreferences(next);
        return next;
      });
    },
    []
  );

  const exportBackup = useCallback(async () => {
    const currentAccount = accountRef.current;
    if (!currentAccount) throw new Error("Your account is locked.");
    const all = await getAllRecords(currentAccount.id);
    const backup = buildBackup(currentAccount, all);
    downloadBackup(backup);
    const next = { ...preferences, lastBackupAt: nowISO() };
    setPreferences(next);
    await storePreferences(next);
    return { count: backup.records.length, backup };
  }, [preferences]);

  const importBackupText = useCallback(
    async (text: string) => {
      const currentAccount = accountRef.current;
      if (!currentAccount) throw new Error("Your account is locked.");
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        throw new Error("This file is not valid JSON.");
      }
      const parsed = parseBackup(parsedJson, currentAccount.id);
      const existing = await getAllRecords(currentAccount.id);
      const byId = new Map(existing.map((record) => [record.id, record]));
      const toPut: AnyRecord[] = [];
      let skipped = parsed.skipped;

      for (const incoming of parsed.records) {
        const local = byId.get(incoming.id);
        if (local && local.updatedAt >= incoming.updatedAt) {
          skipped += 1;
          continue;
        }
        toPut.push({ ...incoming, ownerId: currentAccount.id, dirty: true });
      }
      if (toPut.length) {
        await putRecords(toPut);
        await loadRecords(currentAccount.id, true);
        scheduleSyncRef.current?.();
      }
      return { imported: toPut.length, skipped };
    },
    [loadRecords]
  );

  const resetAllData = useCallback(async () => {
    const currentAccount = accountRef.current;
    if (currentAccount) await deleteOwnerData(currentAccount.id);
    const cleanPreferences: Preferences = {
      notificationsEnabled: false,
      lastUsedCategory: {},
    };
    await storePreferences(cleanPreferences);
    await clearAccount();
    clearSession();
    if (currentAccount) clearAttempts(currentAccount.id);
    setAccount(null);
    accountRef.current = null;
    setIsUnlocked(false);
    setIsDataReady(true);
    setRecords([]);
    recordsRef.current = [];
    setPreferences(cleanPreferences);
    setAddSheet({ open: false });
    setCloudConfigured(true);
    setLastSyncedAt(null);
    setSyncStatus("local");
  }, []);

  const openAdd = useCallback(
    (type?: AddRecordType, editing?: Transaction, defaults?: AddSheetDefaults) => {
      setAddSheet({ open: true, type, editing, defaults });
    },
    []
  );

  const closeAdd = useCallback(() => setAddSheet({ open: false }), []);

  const transactions = useMemo(
    () =>
      records
        .filter(
          (record): record is Transaction =>
            record.entity === "transaction" && !record.deletedAt
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [records]
  );
  const crops = useMemo(
    () =>
      records
        .filter((record): record is Crop => record.entity === "crop" && !record.deletedAt)
        .sort((a, b) => {
          const rank = (status: Crop["status"]) => {
            if (status === "ACTIVE" || status === "HARVESTING") return 0;
            if (status === "PLANNED") return 1;
            return 2;
          };
          if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
          return b.sowingDate.localeCompare(a.sowingDate);
        }),
    [records]
  );
  const cropSales = useMemo(
    () =>
      records
        .filter(
          (record): record is CropSale =>
            record.entity === "cropsale" && !record.deletedAt
        )
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate) || b.updatedAt.localeCompare(a.updatedAt)),
    [records]
  );
  const lands = useMemo(
    () =>
      records
        .filter((record): record is Land => record.entity === "land" && !record.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records]
  );
  const labourPayments = useMemo(
    () =>
      records
        .filter(
          (record): record is LabourPayment =>
            record.entity === "labour" && !record.deletedAt
        )
        .sort(
          (a, b) =>
            (b.paidDate ?? b.paymentDate).localeCompare(a.paidDate ?? a.paymentDate) ||
            b.updatedAt.localeCompare(a.updatedAt)
        ),
    [records]
  );
  const vehicles = useMemo(
    () =>
      records
        .filter(
          (record): record is Vehicle =>
            record.entity === "vehicle" && !record.deletedAt
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records]
  );
  const reminders = useMemo(
    () =>
      records
        .filter(
          (record): record is Reminder =>
            record.entity === "reminder" && !record.deletedAt
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [records]
  );
  const loans = useMemo(
    () =>
      records
        .filter((record): record is Loan => record.entity === "loan" && !record.deletedAt)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records]
  );
  const inventory = useMemo(
    () =>
      records
        .filter(
          (record): record is InventoryItem =>
            record.entity === "inventory" && !record.deletedAt
        )
        .sort((a, b) => a.itemName.localeCompare(b.itemName)),
    [records]
  );
  const familyMembers = useMemo(
    () =>
      records
        .filter(
          (record): record is FamilyMember =>
            record.entity === "family" && !record.deletedAt
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records]
  );
  const customCategories = useMemo(
    () =>
      records
        .filter(
          (record): record is CustomCategory =>
            record.entity === "category" && !record.deletedAt
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [records]
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const value: AppContextType = {
    isReady,
    isDataReady,
    account,
    isUnlocked,
    authLockUntil,
    setupAccount,
    unlock,
    lock,
    changePin,
    resetPinWithRecovery,
    regenerateRecoveryCode,
    updateProfile,
    transactions,
    crops,
    lands,
    labourPayments,
    vehicles,
    reminders,
    loans,
    inventory,
    familyMembers,
    customCategories,
    cropSales,
    records,
    saveTransaction,
    saveOpeningBalance,
    deleteTransaction,
    saveCrop,
    deleteCrop,
    saveLand,
    deleteLand,
    saveCropSale,
    recordCropSalePayment,
    deleteCropSale,
    saveLabourPayment,
    markLabourPaid,
    deleteLabourPayment,
    saveVehicle,
    saveVehicleServiceRecord,
    recordTractorWorkLog,
    deleteVehicle,
    saveReminder,
    completeReminder,
    reopenReminder,
    deleteReminder,
    saveLoan,
    addLoanRepayment,
    updateLoanRepayment,
    deleteLoanRepayment,
    deleteLoan,
    saveInventoryItem,
    recordStockPurchase,
    recordStockUsage,
    recordStockAdjustment,
    deleteStockPurchase,
    deleteStockUsage,
    deleteStockAdjustment,
    archiveInventoryItem,
    adjustInventoryStock,
    deleteInventoryItem,
    saveFamilyMember,
    deleteFamilyMember,
    addCustomCategory,
    deleteCustomCategory,
    preferences,
    language,
    setLanguage,
    t,
    formatCurrency,
    formatNumber,
    formatDate,
    updatePreferences,
    rememberCategory,
    isOnline,
    syncStatus,
    lastSyncedAt,
    cloudConfigured,
    cloudDatabase,
    cloudCollection,
    cloudRecordsCount,
    pendingUploadsCount,
    failedUploadsCount,
    lastSyncError,
    storagePersistence,
    refreshCloudStats,
    syncNow,
    addSheet,
    openAdd,
    closeAdd,
    toast,
    notify,
    exportBackup,
    importBackupText,
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

export { formatRecoveryCode, normalizeRecoveryCode, putRecord };
