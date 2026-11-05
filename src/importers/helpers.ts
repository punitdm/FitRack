import { format } from 'date-fns';
import { unzipSync, strFromU8 } from 'fflate';
import { TrackingType } from '../types/database';
import { ImportedExercise, ImportedSession, ImportedSet } from './types';

export const LB_PER_KG = 2.2046226218;
export const KM_PER_MILE = 1.609344;
export const CM_PER_INCH = 2.54;

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);
}

export function isSqlite(bytes: Uint8Array): boolean {
  // "SQLite format 3\0"
  const magic = 'SQLite format 3';
  if (bytes.length < 16) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic.charCodeAt(i)) return false;
  }
  return true;
}

/** Unzips and returns entries whose name passes the filter, largest first. */
export function unzipEntries(bytes: Uint8Array, filter: (name: string) => boolean): { name: string; data: Uint8Array }[] {
  const files = unzipSync(bytes, { filter: (f) => filter(f.name) });
  return Object.entries(files)
    .map(([name, data]) => ({ name, data }))
    .sort((a, b) => b.data.length - a.data.length);
}

export function bytesToText(bytes: Uint8Array): string {
  let text = strFromU8(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  return text;
}

/** Parses "1.5", "1,5", "" → number (0 when blank/invalid). */
export function num(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v !== 'string') return 0;
  const n = parseFloat(v.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** "1:02:03", "02:03", "75" (seconds) → seconds. */
export function parseClock(v: string | undefined | null): number {
  if (!v) return 0;
  const s = v.trim();
  if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
  const parts = s.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function secondsToClock(total: number): string {
  const t = Math.max(0, Math.round(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Local YYYY-MM-DD for a Date. */
export function isoDay(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/**
 * Accepts "2024-02-23", "2024-02-23 18:30:00", "2024-02-23T18:30:00.000".
 * Returns local YYYY-MM-DD or null.
 */
export function dayFromIsoish(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Picks a FitRack tracking type from what the sets actually contain. */
export function inferTrackingType(sets: ImportedSet[], category: string): TrackingType {
  const hasKm = sets.some((s) => (s.km ?? 0) > 0);
  const hasReps = sets.some((s) => s.reps > 0);
  const hasTime = sets.some((s) => (s.seconds ?? 0) > 0);
  if (hasKm || (category === 'Cardio' && hasTime && !hasReps)) return 'distance_time';
  if (hasTime && !hasReps) return 'time_only';
  return 'weight_reps';
}

/**
 * Groups flat (date, exercise, set) rows into sessions, keeping the order the
 * source app had them in.
 */
export class SessionBuilder {
  private byDate = new Map<string, Map<string, ImportedExercise>>();

  add(date: string, name: string, category: string, set: ImportedSet): void {
    let day = this.byDate.get(date);
    if (!day) {
      day = new Map();
      this.byDate.set(date, day);
    }
    const key = name.trim().toLowerCase();
    let ex = day.get(key);
    if (!ex) {
      ex = { name: name.trim(), category, trackingType: 'weight_reps', sets: [] };
      day.set(key, ex);
    }
    ex.sets.push(set);
  }

  build(): ImportedSession[] {
    const out: ImportedSession[] = [];
    for (const [date, exercises] of this.byDate) {
      const list = [...exercises.values()];
      for (const ex of list) ex.trackingType = inferTrackingType(ex.sets, ex.category);
      out.push({ date, exercises: list });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }
}
