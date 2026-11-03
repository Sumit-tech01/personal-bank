import { randomId } from "./auth";
import { isValidISODate, nowISO } from "./dates";
import type {
  Account,
  AnyRecord,
  EntityName,
  LoanRepayment,
  PaymentMethod,
} from "./types";

export const BACKUP_APP = "Personal Bank";
export const BACKUP_VERSION = 1;

const ENTITIES: EntityName[] = [
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
];

const PAYMENT_METHODS = new Set<PaymentMethod>(["CASH", "UPI", "BANK", "CARD", "OTHER"]);

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  profile: {
    name: string;
    mobile?: string;
    location?: string;
  };
  records: Partial<AnyRecord>[];
}

export function buildBackup(account: Account, records: AnyRecord[]): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: nowISO(),
    profile: {
      name: account.name,
      mobile: account.mobile,
      location: account.location,
    },
    records: records
      .filter((record) => !record.deletedAt)
      .map((record) => {
        const copy = { ...record } as Record<string, unknown>;
        delete copy.ownerId;
        delete copy.dirty;
        return copy as Partial<AnyRecord>;
      }),
  };
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `personal-bank-backup-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.slice(0, 2_000) : fallback;

const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.slice(0, 2_000) : undefined;

const paise = (value: unknown): number => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
};

const numberValue = (value: unknown): number => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const dateValue = (value: unknown, fallback: string): string =>
  isValidISODate(value) ? value : fallback;

function paymentMethod(value: unknown): PaymentMethod {
  return PAYMENT_METHODS.has(value as PaymentMethod)
    ? (value as PaymentMethod)
    : "CASH";
}

function sanitizeRepayments(value: unknown): LoanRepayment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .slice(0, 500)
    .map((repayment) => ({
      id: text(repayment.id) || randomId("rep"),
      amountPaise: paise(repayment.amountPaise),
      date: dateValue(repayment.date, "2000-01-01"),
      paymentMethod: paymentMethod(repayment.paymentMethod),
      notes: optionalText(repayment.notes),
    }))
    .filter((repayment) => repayment.amountPaise > 0);
}

function sanitizeRecord(
  raw: unknown,
  ownerId: string
): { record: AnyRecord | null; reason?: string } {
  if (!isObject(raw)) return { record: null, reason: "Not a record." };
  const entity = raw.entity as EntityName;
  if (!ENTITIES.includes(entity)) return { record: null, reason: "Unknown record type." };
  const id = text(raw.id).slice(0, 120);
  if (!id) return { record: null, reason: "Missing record id." };
  const updatedAt =
    typeof raw.updatedAt === "string" && !Number.isNaN(Date.parse(raw.updatedAt))
      ? raw.updatedAt
      : nowISO();
  const createdAt =
    typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))
      ? raw.createdAt
      : updatedAt;

  const base = {
    id,
    entity,
    ownerId,
    createdAt,
    updatedAt,
    dirty: true,
  };

  const today = "2000-01-01";

  switch (entity) {
    case "transaction": {
      const kind = raw.kind === "INCOME" ? "INCOME" : raw.kind === "EXPENSE" ? "EXPENSE" : null;
      if (!kind) return { record: null, reason: "Invalid transaction kind." };
      const group = ["HOME", "FARM", "VEHICLE", "OTHER"].includes(String(raw.group))
        ? (raw.group as "HOME" | "FARM" | "VEHICLE" | "OTHER")
        : kind === "INCOME"
        ? "OTHER"
        : "HOME";
      return {
        record: {
          ...base,
          entity: "transaction",
          kind,
          amountPaise: paise(raw.amountPaise),
          date: dateValue(raw.date, today),
          category: text(raw.category, "Other"),
          group,
          cropId: optionalText(raw.cropId),
          cropName: optionalText(raw.cropName),
          landId: optionalText(raw.landId),
          vehicleId: optionalText(raw.vehicleId),
          vehicleName: optionalText(raw.vehicleName),
          labourPaymentId: optionalText(raw.labourPaymentId),
          paymentMethod: paymentMethod(raw.paymentMethod),
          description: text(raw.description),
          notes: optionalText(raw.notes),
          receiptDataUrl: optionalText(raw.receiptDataUrl),
          incomeStatus: raw.incomeStatus === "PENDING" ? "PENDING" : "RECEIVED",
          source:
            raw.source === "opening_balance"
              ? "opening_balance"
              : raw.source === "labour"
              ? "labour"
              : "manual",
          isOpeningBalance: Boolean(raw.isOpeningBalance),
        },
      };
    }
    case "crop": {
      const season = ["Kharif", "Rabi", "Zaid", "Perennial"].includes(String(raw.season))
        ? (raw.season as "Kharif" | "Rabi" | "Zaid" | "Perennial")
        : "Kharif";
      const status = raw.status === "COMPLETED" ? "COMPLETED" : "ACTIVE";
      const name = text(raw.name);
      if (!name) return { record: null, reason: "Crop has no name." };
      return {
        record: {
          ...base,
          entity: "crop",
          name,
          variety: optionalText(raw.variety),
          season,
          year: text(raw.year, String(new Date().getFullYear())),
          landId: optionalText(raw.landId),
          landName: text(raw.landName),
          areaAcres: numberValue(raw.areaAcres),
          sowingDate: dateValue(raw.sowingDate, today),
          expectedHarvestDate: isValidISODate(raw.expectedHarvestDate)
            ? raw.expectedHarvestDate
            : undefined,
          actualHarvestDate: isValidISODate(raw.actualHarvestDate)
            ? raw.actualHarvestDate
            : undefined,
          status,
          notes: optionalText(raw.notes),
        },
      };
    }
    case "land": {
      const name = text(raw.name);
      if (!name) return { record: null, reason: "Land has no name." };
      return {
        record: {
          ...base,
          entity: "land",
          name,
          areaAcres: numberValue(raw.areaAcres),
          soilType: optionalText(raw.soilType),
          irrigation: optionalText(raw.irrigation),
          notes: optionalText(raw.notes),
        },
      };
    }
    case "labour": {
      const cropName = text(raw.cropName);
      const amountPaise = paise(raw.amountPaise);
      if (!cropName || amountPaise <= 0) {
        return { record: null, reason: "Labour record is incomplete." };
      }
      return {
        record: {
          ...base,
          entity: "labour",
          cropId: text(raw.cropId),
          cropName,
          landId: optionalText(raw.landId),
          landName: optionalText(raw.landName),
          activity: text(raw.activity, "Other") as never,
          workers: Math.max(1, Math.round(numberValue(raw.workers))),
          ratePaise: paise(raw.ratePaise),
          days: numberValue(raw.days),
          amountPaise,
          status: raw.status === "PENDING" ? "PENDING" : "PAID",
          paymentDate: dateValue(raw.paymentDate, today),
          paidDate: isValidISODate(raw.paidDate) ? raw.paidDate : undefined,
          paymentMethod: paymentMethod(raw.paymentMethod),
          transactionId: optionalText(raw.transactionId),
          description: optionalText(raw.description),
        },
      };
    }
    case "vehicle": {
      const name = text(raw.name);
      if (!name) return { record: null, reason: "Vehicle has no name." };
      return {
        record: {
          ...base,
          entity: "vehicle",
          name,
          type: ["Tractor", "Car", "Bike", "Other"].includes(String(raw.type))
            ? (raw.type as "Tractor" | "Car" | "Bike" | "Other")
            : "Other",
          registrationNumber: text(raw.registrationNumber),
          purchaseDate: isValidISODate(raw.purchaseDate) ? raw.purchaseDate : undefined,
          purchasePricePaise: paise(raw.purchasePricePaise),
          status: raw.status === "SOLD" ? "SOLD" : "ACTIVE",
          fuelType: optionalText(raw.fuelType),
          serviceDate: isValidISODate(raw.serviceDate) ? raw.serviceDate : undefined,
          nextServiceDate: isValidISODate(raw.nextServiceDate)
            ? raw.nextServiceDate
            : undefined,
          insuranceExpiry: isValidISODate(raw.insuranceExpiry)
            ? raw.insuranceExpiry
            : undefined,
          pucExpiry: isValidISODate(raw.pucExpiry) ? raw.pucExpiry : undefined,
          loanEmiPaise: paise(raw.loanEmiPaise),
          loanPaymentDate: isValidISODate(raw.loanPaymentDate)
            ? raw.loanPaymentDate
            : undefined,
          notes: optionalText(raw.notes),
        },
      };
    }
    case "reminder": {
      const title = text(raw.title);
      if (!title) return { record: null, reason: "Reminder has no title." };
      return {
        record: {
          ...base,
          entity: "reminder",
          title,
          date: dateValue(raw.date, today),
          time: optionalText(raw.time),
          category: ["Crop", "Labour", "Loan", "Vehicle", "Bill", "Family", "Custom"].includes(
            String(raw.category)
          )
            ? (raw.category as never)
            : "Custom",
          notes: optionalText(raw.notes),
          repeat: ["NONE", "WEEKLY", "MONTHLY", "YEARLY"].includes(String(raw.repeat))
            ? (raw.repeat as never)
            : "NONE",
          notify: raw.notify !== false,
          completed: raw.completed === true,
          completedAt: optionalText(raw.completedAt),
          linkedType: optionalText(raw.linkedType) as never,
          linkedId: optionalText(raw.linkedId),
        },
      };
    }
    case "loan": {
      const partyName = text(raw.partyName);
      if (!partyName) return { record: null, reason: "Loan has no party name." };
      return {
        record: {
          ...base,
          entity: "loan",
          type: raw.type === "LENT" ? "LENT" : "BORROWED",
          partyName,
          principalPaise: paise(raw.principalPaise),
          interestRate: numberValue(raw.interestRate),
          date: dateValue(raw.date, today),
          dueDate: isValidISODate(raw.dueDate) ? raw.dueDate : undefined,
          purpose: optionalText(raw.purpose),
          repayments: sanitizeRepayments(raw.repayments),
          status: raw.status === "CLOSED" ? "CLOSED" : "ACTIVE",
        },
      };
    }
    case "inventory": {
      const itemName = text(raw.itemName);
      if (!itemName) return { record: null, reason: "Inventory item has no name." };
      return {
        record: {
          ...base,
          entity: "inventory",
          itemName,
          category: text(raw.category, "Other") as never,
          subcategory: optionalText(raw.subcategory),
          brand: optionalText(raw.brand),
          description: optionalText(raw.description),
          quantity: numberValue(raw.quantity),
          unit: text(raw.unit, "kg"),
          unitPricePaise: paise(raw.unitPricePaise),
          purchaseDate: dateValue(raw.purchaseDate, today),
          remainingQuantity: numberValue(raw.remainingQuantity),
          minQuantity: numberValue(raw.minQuantity),
          storageLocation: optionalText(raw.storageLocation),
          expiryDate: isValidISODate(raw.expiryDate) ? raw.expiryDate : undefined,
          batchNumber: optionalText(raw.batchNumber),
          supplierName: optionalText(raw.supplierName),
          supplierContact: optionalText(raw.supplierContact),
          notes: optionalText(raw.notes),
          isArchived: Boolean(raw.isArchived),
          purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
          usageHistory: Array.isArray(raw.usageHistory) ? raw.usageHistory : [],
          adjustments: Array.isArray(raw.adjustments) ? raw.adjustments : [],
        },
      };
    }
    case "family": {
      const name = text(raw.name);
      if (!name) return { record: null, reason: "Family member has no name." };
      return {
        record: {
          ...base,
          entity: "family",
          name,
          relation: text(raw.relation, "Family"),
          dateOfBirth: isValidISODate(raw.dateOfBirth) ? raw.dateOfBirth : undefined,
          phone: optionalText(raw.phone),
          notes: optionalText(raw.notes),
        },
      };
    }
    case "category": {
      const name = text(raw.name);
      if (!name) return { record: null, reason: "Category has no name." };
      return {
        record: {
          ...base,
          entity: "category",
          group: ["HOME", "FARM", "VEHICLE", "OTHER", "INCOME"].includes(String(raw.group))
            ? (raw.group as never)
            : "HOME",
          name,
        },
      };
    }
    case "cropsale": {
      const cropId = text(raw.cropId);
      const cropName = text(raw.cropName, "Crop");
      const unit = text(raw.unit, "quintal");
      const quantitySold = numberValue(raw.quantitySold);
      const ratePerUnitPaise = paise(raw.ratePerUnitPaise);
      const totalAmountPaise = paise(raw.totalAmountPaise) || (quantitySold * ratePerUnitPaise);
      const receivedPaise = paise(raw.receivedPaise);
      const pendingPaise = paise(raw.pendingPaise) || Math.max(0, totalAmountPaise - receivedPaise);
      return {
        record: {
          ...base,
          entity: "cropsale",
          cropId,
          cropName,
          landId: optionalText(raw.landId),
          landName: optionalText(raw.landName),
          harvestedQuantity: raw.harvestedQuantity !== undefined ? numberValue(raw.harvestedQuantity) : undefined,
          quantitySold,
          quantityRemaining: raw.quantityRemaining !== undefined ? numberValue(raw.quantityRemaining) : undefined,
          unit,
          ratePerUnitPaise,
          grossAmountPaise: raw.grossAmountPaise !== undefined ? paise(raw.grossAmountPaise) : undefined,
          totalAmountPaise,
          transportChargesPaise: raw.transportChargesPaise !== undefined ? paise(raw.transportChargesPaise) : undefined,
          otherChargesPaise: raw.otherChargesPaise !== undefined ? paise(raw.otherChargesPaise) : undefined,
          netAmountPaise: raw.netAmountPaise !== undefined ? paise(raw.netAmountPaise) : undefined,
          receivedPaise,
          pendingPaise,
          buyerName: optionalText(raw.buyerName),
          marketName: optionalText(raw.marketName),
          saleDate: dateValue(raw.saleDate, today),
          paymentMethod: paymentMethod(raw.paymentMethod),
          notes: optionalText(raw.notes),
          transactionId: optionalText(raw.transactionId),
          payments: Array.isArray(raw.payments) ? raw.payments : [],
        },
      };
    }
    default:
      return { record: null, reason: "Unknown record type." };
  }
}

export function parseBackup(
  value: unknown,
  ownerId: string
): { records: AnyRecord[]; skipped: number; profile?: BackupFile["profile"] } {
  if (!isObject(value) || (value.app !== BACKUP_APP && value.app !== "Sheti Khata")) {
    throw new Error("This file is not a valid Personal Bank backup.");
  }
  if (typeof value.version !== "number" || value.version > BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of the app.");
  }
  if (!Array.isArray(value.records)) {
    throw new Error("This backup does not contain any records.");
  }
  if (value.records.length > 50_000) {
    throw new Error("This backup is too large to restore safely.");
  }

  const records: AnyRecord[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const raw of value.records) {
    const { record } = sanitizeRecord(raw, ownerId);
    if (!record || seen.has(record.id)) {
      skipped += 1;
      continue;
    }
    seen.add(record.id);
    records.push(record);
  }

  const profile = isObject(value.profile)
    ? {
        name: text(value.profile.name, "My account"),
        mobile: optionalText(value.profile.mobile),
        location: optionalText(value.profile.location),
      }
    : undefined;

  return { records, skipped, profile };
}
