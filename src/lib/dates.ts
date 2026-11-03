import { MONTHS, MONTHS_SHORT, WEEKDAYS } from "./constants";
import type { DateRange, ISODate, PeriodPreset, RepeatOption } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  // Noon avoids daylight-saving edge cases when formatting or comparing.
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISODate(value);
  return toISODate(date) === value;
}

export function isValidTime(value: unknown): value is string {
  return (
    typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

export function formatDate(
  value: ISODate | undefined,
  style: "short" | "medium" | "long" | "dayMonth" = "medium"
): string {
  if (!value || !isValidISODate(value)) return "—";
  const date = parseISODate(value);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const shortMonth = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  if (style === "short") return `${day} ${shortMonth}`;
  if (style === "dayMonth") return `${day} ${month}`;
  if (style === "long") return `${WEEKDAYS[date.getDay()]}, ${day} ${month} ${year}`;
  return `${day} ${shortMonth} ${year}`;
}

export function formatHomeDate(value: ISODate = todayISO()): string {
  if (!isValidISODate(value)) return "";
  const date = parseISODate(value);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatMonthYear(value: ISODate | Date = new Date()): string {
  const date = typeof value === "string" ? parseISODate(value) : value;
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthShort(value: ISODate | Date = new Date()): string {
  const date = typeof value === "string" ? parseISODate(value) : value;
  return `${MONTHS_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
}

export function formatTime(value?: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return "";
  const [hourString, minute] = value.split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export function monthKey(value: ISODate | Date = new Date()): string {
  const date = typeof value === "string" ? parseISODate(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return key;
  return `${MONTHS[month - 1]} ${year}`;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

export function endOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0);
}

export function addDays(value: ISODate, days: number): ISODate {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(value: ISODate, months: number): ISODate {
  const date = parseISODate(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toISODate(date);
}

export function addYears(value: ISODate, years: number): ISODate {
  const date = parseISODate(value);
  date.setFullYear(date.getFullYear() + years);
  return toISODate(date);
}

export function advanceRepeat(value: ISODate, repeat: RepeatOption): ISODate {
  if (repeat === "WEEKLY") return addDays(value, 7);
  if (repeat === "MONTHLY") return addMonths(value, 1);
  if (repeat === "YEARLY") return addYears(value, 1);
  return value;
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const start = parseISODate(from).getTime();
  const end = parseISODate(to).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function relativeDayLabel(value: ISODate, base = todayISO()): string {
  const diff = daysBetween(base, value);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  return formatDate(value, "medium");
}

export function rangeForPreset(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();
  if (preset === "TODAY") {
    const today = todayISO();
    return {
      start: today,
      end: today,
      label: "Today",
      preset,
    };
  }
  if (preset === "THIS_WEEK") {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: toISODate(mon),
      end: toISODate(sun),
      label: "This week",
      preset,
    };
  }
  if (preset === "LAST_MONTH") {
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12);
    return {
      start: toISODate(startOfMonth(previous)),
      end: toISODate(endOfMonth(previous)),
      label: formatMonthYear(previous),
      preset,
    };
  }
  if (preset === "FINANCIAL_YEAR") {
    const month = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startYear = month >= 4 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    return {
      start: `${startYear}-04-01`,
      end: `${endYear}-03-31`,
      label: `FY ${startYear}–${String(endYear).slice(-2)}`,
      preset,
    };
  }
  if (preset === "THIS_YEAR") {
    return {
      start: `${now.getFullYear()}-01-01`,
      end: `${now.getFullYear()}-12-31`,
      label: String(now.getFullYear()),
      preset,
    };
  }
  if (preset === "LAST_YEAR") {
    const prevYear = now.getFullYear() - 1;
    return {
      start: `${prevYear}-01-01`,
      end: `${prevYear}-12-31`,
      label: String(prevYear),
      preset,
    };
  }
  if (preset === "CURRENT_SEASON") {
    const month = now.getMonth() + 1; // 1 to 12
    const currentYear = now.getFullYear();
    if (month >= 6 && month <= 10) {
      // Kharif: June - October
      return {
        start: `${currentYear}-06-01`,
        end: `${currentYear}-10-31`,
        label: `Kharif ${currentYear}`,
        preset,
      };
    }
    if (month >= 11 || month <= 3) {
      // Rabi: November - March
      const startYear = month >= 11 ? currentYear : currentYear - 1;
      const endYear = startYear + 1;
      return {
        start: `${startYear}-11-01`,
        end: `${endYear}-03-31`,
        label: `Rabi ${startYear}–${String(endYear).slice(-2)}`,
        preset,
      };
    }
    // Zaid / Summer: April - May
    return {
      start: `${currentYear}-04-01`,
      end: `${currentYear}-05-31`,
      label: `Zaid ${currentYear}`,
      preset,
    };
  }
  if (preset === "ALL_TIME") {
    return {
      start: "0001-01-01",
      end: "9999-12-31",
      label: "All time",
      preset,
    };
  }
  if (preset === "CUSTOM") {
    const start = isValidISODate(customStart) ? customStart : toISODate(startOfMonth(now));
    const end = isValidISODate(customEnd) ? customEnd : todayISO();
    const ordered = compareISO(start, end) > 0 ? { start: end, end: start } : { start, end };
    const label =
      ordered.start === ordered.end
        ? formatDate(ordered.start, "medium")
        : `${formatDate(ordered.start, "short")} – ${formatDate(ordered.end, "medium")}`;
    return { ...ordered, label, preset };
  }
  return {
    start: toISODate(startOfMonth(now)),
    end: toISODate(endOfMonth(now)),
    label: formatMonthYear(now),
    preset: "THIS_MONTH",
  };
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  TODAY: "Today",
  THIS_WEEK: "This week",
  THIS_MONTH: "This month",
  LAST_MONTH: "Last month",
  FINANCIAL_YEAR: "Financial year",
  THIS_YEAR: "Calendar year",
  LAST_YEAR: "Previous year",
  CURRENT_SEASON: "Current season",
  ALL_TIME: "All time",
  CUSTOM: "Custom",
};

export function inRange(value: ISODate, range: DateRange): boolean {
  return value >= range.start && value <= range.end;
}

export function lastNMonths(count: number, from = new Date()): {
  key: string;
  label: string;
  start: ISODate;
  end: ISODate;
}[] {
  const months: { key: string; label: string; start: ISODate; end: ISODate }[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(from.getFullYear(), from.getMonth() - index, 1, 12);
    months.push({
      key: monthKey(date),
      label: MONTHS_SHORT[date.getMonth()],
      start: toISODate(startOfMonth(date)),
      end: toISODate(endOfMonth(date)),
    });
  }
  return months;
}

export function monthRange(key: string): DateRange {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1, 12);
  return {
    start: toISODate(startOfMonth(date)),
    end: toISODate(endOfMonth(date)),
    label: formatMonthKey(key),
    preset: "CUSTOM",
  };
}

export function nextBirthday(dateOfBirth: ISODate, base = todayISO()): ISODate {
  const birth = parseISODate(dateOfBirth);
  const today = parseISODate(base);
  let year = today.getFullYear();
  let candidate = new Date(year, birth.getMonth(), birth.getDate(), 12);
  if (toISODate(candidate) < base) {
    year += 1;
    candidate = new Date(year, birth.getMonth(), birth.getDate(), 12);
  }
  return toISODate(candidate);
}

export function ageOn(dateOfBirth: ISODate, on = todayISO()): number {
  const birth = parseISODate(dateOfBirth);
  const date = parseISODate(on);
  let age = date.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    date.getMonth() < birth.getMonth() ||
    (date.getMonth() === birth.getMonth() && date.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

export function todayWithTime(time?: string): string {
  return `${todayISO()}T${time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00"}:00`;
}
