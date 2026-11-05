import * as SQLite from 'expo-sqlite';
import { format } from 'date-fns';

/**
 * Body measurements (neck → calf, plus body fat), stored per day in body_stats.
 * One reading per measurement per day; saving again on the same day replaces it.
 */

export type MeasureKey =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'arm'
  | 'forearm'
  | 'waist'
  | 'hips'
  | 'thigh'
  | 'calf'
  | 'bodyfat';

export interface MeasureDef {
  key: MeasureKey;
  label: string;
  column: string;
  unit: 'cm' | '%';
  /** Typical starting value when nothing has been logged yet. */
  start: number;
  min: number;
  max: number;
}

export const MEASURES: MeasureDef[] = [
  { key: 'neck', label: 'Neck', column: 'neck', unit: 'cm', start: 38, min: 15, max: 80 },
  { key: 'shoulders', label: 'Shoulders', column: 'shoulders', unit: 'cm', start: 115, min: 25, max: 200 },
  { key: 'chest', label: 'Chest', column: 'chest', unit: 'cm', start: 100, min: 40, max: 200 },
  { key: 'arm', label: 'Arm', column: 'arm', unit: 'cm', start: 34, min: 10, max: 80 },
  { key: 'forearm', label: 'Forearm', column: 'forearm', unit: 'cm', start: 28, min: 10, max: 60 },
  { key: 'waist', label: 'Waist', column: 'waist', unit: 'cm', start: 84, min: 30, max: 200 },
  { key: 'hips', label: 'Hips', column: 'hips', unit: 'cm', start: 98, min: 40, max: 200 },
  { key: 'thigh', label: 'Thigh', column: 'thigh', unit: 'cm', start: 56, min: 20, max: 120 },
  { key: 'calf', label: 'Calf', column: 'calf', unit: 'cm', start: 38, min: 15, max: 80 },
  { key: 'bodyfat', label: 'Body fat', column: 'body_fat', unit: '%', start: 20, min: 2, max: 70 },
];

export const MEASURE_BY_KEY: Record<MeasureKey, MeasureDef> = Object.fromEntries(MEASURES.map((m) => [m.key, m])) as Record<
  MeasureKey,
  MeasureDef
>;

export interface MeasureReading {
  date: string;
  value: number;
}

/** Adds the newer measurement columns to body_stats (safe to run every launch). */
export async function ensureMeasurementColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(body_stats)');
  const have = new Set(cols.map((c) => c.name));
  for (const c of ['neck', 'shoulders', 'forearm', 'calf']) {
    if (!have.has(c)) await db.execAsync(`ALTER TABLE body_stats ADD COLUMN ${c} REAL`);
  }
}

/** Every reading for every measurement, newest first. */
export async function getAllMeasurements(db: SQLite.SQLiteDatabase): Promise<Record<MeasureKey, MeasureReading[]>> {
  const rows = await db.getAllAsync<Record<string, any>>(
    `SELECT date, ${MEASURES.map((m) => m.column).join(', ')} FROM body_stats ORDER BY date DESC`
  );
  const out = Object.fromEntries(MEASURES.map((m) => [m.key, [] as MeasureReading[]])) as Record<MeasureKey, MeasureReading[]>;
  for (const r of rows) {
    for (const m of MEASURES) {
      const v = r[m.column];
      if (typeof v === 'number' && v > 0) out[m.key].push({ date: r.date, value: v });
    }
  }
  return out;
}

export async function saveMeasurement(db: SQLite.SQLiteDatabase, key: MeasureKey, value: number, date = format(new Date(), 'yyyy-MM-dd')) {
  const col = MEASURE_BY_KEY[key].column;
  await db.runAsync(
    `INSERT INTO body_stats (date, ${col}) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET ${col} = excluded.${col}`,
    [date, Math.round(value * 10) / 10]
  );
}

export async function deleteMeasurement(db: SQLite.SQLiteDatabase, key: MeasureKey, date: string) {
  const col = MEASURE_BY_KEY[key].column;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`UPDATE body_stats SET ${col} = NULL WHERE date = ?`, [date]);
    // Drop the day entirely if nothing is left on it.
    await tx.runAsync(
      `DELETE FROM body_stats WHERE date = ? AND weight_kg IS NULL AND ${MEASURES.map((m) => `${m.column} IS NULL`).join(' AND ')}`,
      [date]
    );
  });
}

export function formatMeasure(def: MeasureDef, v: number): string {
  const n = Math.round(v * 10) / 10;
  return def.unit === '%' ? `${n}%` : `${n} cm`;
}
