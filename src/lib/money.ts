import { MAX_AMOUNT_PAISE } from "./constants";

/**
 * Money is stored everywhere as integer paise. Never use floating point for
 * storage or arithmetic. Formatting to rupees only happens at display time.
 */
export function parseAmountToPaise(input: string): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/[₹,\s]/g, "");
  if (!cleaned) return null;
  if (!/^\d{1,12}(\.\d{0,2})?$/.test(cleaned)) return null;

  const [rupeesPart, paisePart = ""] = cleaned.split(".");
  const rupees = Number(rupeesPart);
  if (!Number.isSafeInteger(rupees)) return null;

  const paise = Number((paisePart + "00").slice(0, 2));
  const total = rupees * 100 + paise;
  if (!Number.isSafeInteger(total) || total < 0 || total > MAX_AMOUNT_PAISE) {
    return null;
  }
  return total;
}

export function paiseToInput(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || !Number.isFinite(paise)) return "";
  const safe = Math.max(0, Math.round(paise));
  const rupees = Math.floor(safe / 100);
  const rest = safe % 100;
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, "0")}`;
}

export function formatINR(
  paise: number | undefined | null,
  options: { showDecimals?: boolean; absolute?: boolean } = {}
): string {
  const safe = Number.isFinite(paise) ? Math.round(paise as number) : 0;
  const value = (options.absolute ? Math.abs(safe) : safe) / 100;
  const hasPaise = Math.abs(safe) % 100 !== 0;
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options.showDecimals || hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

export function formatINRPlain(paise: number | undefined | null): string {
  const safe = Number.isFinite(paise) ? Math.round(paise as number) : 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: Math.abs(safe) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe / 100);
}

export function formatNumber(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function percentOf(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function sumPaise(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? Math.round(value) : 0), 0);
}

/** workers × rate per worker per day × days, rounded to the nearest paisa. */
export function labourAmountPaise(workers: number, ratePaise: number, days: number): number {
  const safeWorkers = Number.isFinite(workers) ? Math.max(0, Math.round(workers)) : 0;
  const safeRate = Number.isFinite(ratePaise) ? Math.max(0, Math.round(ratePaise)) : 0;
  const dayHundredths = Number.isFinite(days) ? Math.max(0, Math.round(days * 100)) : 0;
  const amount = Math.round((safeWorkers * safeRate * dayHundredths) / 100);
  return Number.isSafeInteger(amount) ? Math.min(amount, MAX_AMOUNT_PAISE) : 0;
}

export function parsePositiveInt(value: string): number | null {
  const cleaned = value.trim();
  if (!/^\d{1,9}$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseNonNegativeNumber(value: string, decimals = 2): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const pattern = new RegExp(`^\\d{1,9}(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function safePercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
