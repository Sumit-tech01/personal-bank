import type { Language } from "@/lib/types";

export type { Language };

export interface I18nParams {
  [key: string]: string | number;
}

export type TranslationKey = string;

export interface MonthTranslation {
  name: string;
  short: string;
}

export interface WeekdayTranslation {
  name: string;
  short: string;
}
