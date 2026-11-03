import type { Language, I18nParams } from "./types";
import { en } from "./dictionaries/en";
import { mr } from "./dictionaries/mr";

export * from "./types";
export { en, mr };

export const DICTIONARIES: Record<Language, Record<string, string>> = {
  en,
  mr,
};

export const MARATHI_MONTHS = [
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "मे",
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "नोव्हेंबर",
  "डिसेंबर",
] as const;

export const MARATHI_MONTHS_SHORT = [
  "जाने",
  "फेब्रु",
  "मार्च",
  "एप्रि",
  "मे",
  "जून",
  "जुलै",
  "ऑग",
  "सप्टें",
  "ऑक्टो",
  "नोव्हें",
  "डिसें",
] as const;

export const MARATHI_WEEKDAYS = [
  "रविवार",
  "सोमवार",
  "मंगळवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार",
] as const;

/**
 * Returns translated string for given key in requested language.
 * Falls back to English dictionary if key is missing in target language,
 * and finally to the key string itself if absent from both.
 */
export function translate(
  language: Language,
  key: string,
  params?: I18nParams
): string {
  const dict = DICTIONARIES[language] || DICTIONARIES.en;
  let text = dict[key] || DICTIONARIES.en[key] || key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    }
  }

  return text;
}

/**
 * Locale-aware currency formatting in INR.
 * Financial values are stored as integer paise.
 */
export function formatLocalizedINR(
  paise: number | undefined | null,
  language: Language = "en",
  options: { showDecimals?: boolean; absolute?: boolean } = {}
): string {
  const safe = Number.isFinite(paise) ? Math.round(paise as number) : 0;
  const value = (options.absolute ? Math.abs(safe) : safe) / 100;
  const hasPaise = Math.abs(safe) % 100 !== 0;

  // We format using Indian numbering system standard (en-IN)
  // This guarantees standard Indian grouping (e.g., ₹1,25,000)
  // which is universal and instantly readable in both Marathi & English contexts.
  const formatter = new Intl.NumberFormat(language === "mr" ? "en-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options.showDecimals || hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
}

/**
 * Locale-aware number formatter with Indian digit grouping.
 */
export function formatLocalizedNumber(
  value: number,
  language: Language = "en",
  maxFractionDigits = 2
): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/**
 * Locale-aware date formatter with Marathi support.
 */
export function formatLocalizedDate(
  value: string | Date | undefined,
  language: Language = "en",
  style: "short" | "medium" | "long" = "medium"
): string {
  if (!value) return "—";

  const date =
    typeof value === "string"
      ? new Date(
          value.length === 10
            ? `${value}T12:00:00.000Z`
            : value
        )
      : value;

  if (isNaN(date.getTime())) return "—";

  if (language === "mr") {
    const day = date.getDate();
    const month = MARATHI_MONTHS[date.getMonth()];
    const shortMonth = MARATHI_MONTHS_SHORT[date.getMonth()];
    const weekday = MARATHI_WEEKDAYS[date.getDay()];
    const year = date.getFullYear();

    if (style === "short") return `${day} ${shortMonth}`;
    if (style === "long") return `${weekday}, ${day} ${month} ${year}`;
    return `${day} ${shortMonth} ${year}`;
  }

  // English formatting
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    weekday: style === "long" ? "long" : undefined,
  });
}
