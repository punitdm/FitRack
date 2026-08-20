import { format, parse, isValid, addDays as addDaysFns, subDays as subDaysFns } from 'date-fns';

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Formats YYYY-MM-DD into a human-friendly string like "Thu, 20 Aug 2026".
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const cleanStr = normalizeDateString(dateStr);
    const date = parse(cleanStr, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) return dateStr;
    return format(date, 'EEE, dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Formats YYYY-MM-DD into short month + day like "20 Aug".
 */
export function formatShortDate(dateStr: string): string {
  try {
    if (!dateStr) return '';
    const cleanStr = normalizeDateString(dateStr);
    const date = parse(cleanStr, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) return dateStr;
    return format(date, 'dd MMM');
  } catch {
    return dateStr;
  }
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 */
export function shiftDate(dateStr: string, deltaDays: number): string {
  try {
    const cleanStr = normalizeDateString(dateStr);
    const date = parse(cleanStr, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) return dateStr;
    const shifted = deltaDays >= 0 ? addDaysFns(date, deltaDays) : subDaysFns(date, Math.abs(deltaDays));
    return format(shifted, 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

/**
 * Robustly normalizes any raw input date string (e.g., "23 Feb", "18 Jul", "2024-02-23", "23/02/2024")
 * into canonical ISO format 'YYYY-MM-DD'.
 */
export function normalizeDateString(rawInput: any, referenceYear?: number): string {
  if (!rawInput) return getTodayISO();

  const currentYear = referenceYear || new Date().getFullYear();
  let str = String(rawInput).trim();

  // If already standard ISO 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle 'YYYY-MM-DDTHH:mm:ss...' or date object toString
  if (str.includes('T')) {
    const isoPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) return isoPart;
  }

  // Clean trailing punctuation or double spaces
  str = str.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // Pattern 1: "23 Feb" or "23 February" or "23-Feb" or "23 Feb 2024" or "23-Feb-2024"
  const dayMonthMatch = str.match(/^(\d{1,2})[-\s/]([A-Za-z]+)(?:[-\s/](\d{2,4}))?$/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthKey = dayMonthMatch[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    let year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : currentYear;
    if (year < 100) year += 2000;

    if (month && day >= 1 && day <= 31) {
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      return `${year}-${monthStr}-${dayStr}`;
    }
  }

  // Pattern 2: "Feb 23" or "February 23, 2024"
  const monthDayMatch = str.match(/^([A-Za-z]+)[-\s/](\d{1,2})(?:[-\s/](\d{2,4}))?$/);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = MONTH_NAMES[monthKey];
    let year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : currentYear;
    if (year < 100) year += 2000;

    if (month && day >= 1 && day <= 31) {
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      return `${year}-${monthStr}-${dayStr}`;
    }
  }

  // Pattern 3: "DD/MM/YYYY" or "DD-MM-YYYY" or "MM/DD/YYYY"
  const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    let p1 = parseInt(slashMatch[1], 10);
    let p2 = parseInt(slashMatch[2], 10);
    let yr = parseInt(slashMatch[3], 10);
    if (yr < 100) yr += 2000;

    let day = p1;
    let month = p2;

    // If first part > 12, it must be DD/MM
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      // MM/DD
      day = p2;
      month = p1;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      return `${yr}-${monthStr}-${dayStr}`;
    }
  }

  // Try standard JS Date parsing fallback
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    try {
      return format(parsedDate, 'yyyy-MM-dd');
    } catch {
      // fallback
    }
  }

  return getTodayISO();
}
