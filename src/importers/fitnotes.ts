import * as SQLite from 'expo-sqlite';
import Papa from 'papaparse';
import { normalizeDateString } from '../utils/dateUtils';
import { ImportBundle, ImportedBodyStat, emptyBundle } from './types';
import {
  CM_PER_INCH,
  KM_PER_MILE,
  LB_PER_KG,
  SessionBuilder,
  dayFromIsoish,
  num,
  parseClock,
  plural,
  round,
} from './helpers';

/**
 * FitNotes (Android) has two ways out:
 *  1. Settings → Backup → "Create backup" → a `.fitnotes` file, which is a raw SQLite DB.
 *  2. Settings → Spreadsheet export → a CSV with
 *     Date, Exercise, Category, Weight (kgs|lbs), Reps, Distance, Distance Unit, Time, Comment
 */

const CATEGORY_MAP: Record<string, string> = {
  abs: 'Core',
  core: 'Core',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  forearms: 'Biceps',
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  quads: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  cardio: 'Cardio',
};

export function mapFitNotesCategory(raw: string | undefined | null): string {
  const c = (raw || '').trim();
  if (!c) return 'Custom';
  return CATEGORY_MAP[c.toLowerCase()] || c;
}

function toKm(value: number, unit: string): number {
  const u = unit.trim().toLowerCase();
  if (value <= 0) return 0;
  if (u.startsWith('mi')) return value * KM_PER_MILE;
  if (u === 'm' || u.startsWith('met')) return value / 1000;
  if (u === 'ft' || u.startsWith('feet')) return (value * 0.3048) / 1000;
  if (u === 'yd' || u.startsWith('yard')) return (value * 0.9144) / 1000;
  return value; // km (FitNotes default)
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

export function looksLikeFitNotesCsv(text: string): boolean {
  const header = text.split(/\r?\n/, 1)[0] || '';
  const cols = header.split(',').map(normKey);
  return cols.includes('exercise') && cols.includes('category') && cols.some((c) => c.startsWith('weight'));
}

export function parseFitNotesCsv(text: string): ImportBundle {
  const bundle = emptyBundle('fitnotes');
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

  const builder = new SessionBuilder();
  let skipped = 0;

  for (const raw of parsed.data) {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) row[normKey(k)] = typeof v === 'string' ? v.trim() : '';

    const name = row['exercise'];
    const rawDate = row['date'];
    if (!name || !rawDate) {
      skipped++;
      continue;
    }
    const date = dayFromIsoish(rawDate) ?? normalizeDateString(rawDate);

    // Weight: "Weight (kgs)" / "Weight (lbs)" or "Weight" + "Weight Unit"
    let weightKg = 0;
    if (row['weightkgs'] !== undefined || row['weightkg'] !== undefined) {
      weightKg = num(row['weightkgs'] ?? row['weightkg']);
    } else if (row['weightlbs'] !== undefined || row['weightlb'] !== undefined) {
      weightKg = num(row['weightlbs'] ?? row['weightlb']) / LB_PER_KG;
    } else {
      const w = num(row['weight']);
      const unit = (row['weightunit'] || 'kg').toLowerCase();
      weightKg = unit.startsWith('lb') ? w / LB_PER_KG : w;
    }

    const reps = Math.max(0, Math.round(num(row['reps'])));
    const km = toKm(num(row['distance']), row['distanceunit'] || 'km');
    const seconds = parseClock(row['time'] || row['duration']);

    if (reps <= 0 && km <= 0 && seconds <= 0) {
      skipped++;
      continue;
    }

    builder.add(date, name, mapFitNotesCategory(row['category']), {
      weightKg: round(weightKg, 3),
      reps,
      km: km > 0 ? round(km, 3) : undefined,
      seconds: seconds > 0 ? seconds : undefined,
      comment: row['comment'] || undefined,
    });
  }

  bundle.sessions = builder.build();
  if (skipped > 0) bundle.warnings.push(`${plural(skipped, 'empty or incomplete row')} skipped.`);
  if (parsed.errors.length > 0) bundle.warnings.push(`${plural(parsed.errors.length, 'CSV row')} could not be parsed.`);
  return bundle;
}

// ---------------------------------------------------------------------------
// .fitnotes SQLite backup
// ---------------------------------------------------------------------------

/**
 * training_log.unit records which unit a cardio set's `distance` was entered in.
 * Verified against real FitNotes backups (paces check out for walks and runs):
 *   2 = metres   (e.g. Walking 1700 in 30 min)
 *   3 = kilometres (e.g. Outdoor Run 5.02 in 36.5 min)
 * Other codes haven't been observed, so they return null and the caller warns
 * instead of guessing (a wrong guess would silently corrupt distances).
 */
const FITNOTES_DISTANCE_UNIT_TO_KM: Record<number, number> = {
  2: 1 / 1000,
  3: 1,
};

export function fitNotesDistanceToKm(distance: number, unitCode: number): number | null {
  const factor = FITNOTES_DISTANCE_UNIT_TO_KM[unitCode];
  return factor === undefined ? null : distance * factor;
}

async function tableColumns(src: SQLite.SQLiteDatabase, table: string): Promise<Set<string>> {
  const rows = await src.getAllAsync<{ name: string }>(`PRAGMA table_info("${table}")`);
  return new Set(rows.map((r) => r.name.toLowerCase()));
}

async function hasTable(src: SQLite.SQLiteDatabase, table: string): Promise<boolean> {
  const row = await src.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM sqlite_master WHERE type = 'table' AND LOWER(name) = LOWER(?)",
    [table]
  );
  return (row?.c ?? 0) > 0;
}

export async function parseFitNotesBackup(bytes: Uint8Array): Promise<ImportBundle> {
  const src = await SQLite.deserializeDatabaseAsync(bytes);
  try {
    if (!(await hasTable(src, 'training_log')) || !(await hasTable(src, 'exercise'))) {
      throw new Error('This SQLite file is not a FitNotes backup (no training_log table).');
    }
    const bundle = emptyBundle('fitnotes');

    // --- Workouts ---
    const logCols = await tableColumns(src, 'training_log');
    const hasDuration = logCols.has('duration_seconds');
    const hasDistance = logCols.has('distance');
    const hasUnit = logCols.has('unit');
    const hasCategory = await hasTable(src, 'Category');

    const rows = await src.getAllAsync<{
      date: string;
      name: string;
      category: string | null;
      metric_weight: number | null;
      reps: number | null;
      duration_seconds: number | null;
      distance: number | null;
      unit: number | null;
    }>(
      `SELECT tl.date AS date,
              e.name AS name,
              ${hasCategory ? 'c.name' : 'NULL'} AS category,
              tl.metric_weight AS metric_weight,
              tl.reps AS reps,
              ${hasDuration ? 'tl.duration_seconds' : 'NULL'} AS duration_seconds,
              ${hasDistance ? 'tl.distance' : 'NULL'} AS distance,
              ${hasUnit ? 'tl.unit' : 'NULL'} AS unit
         FROM training_log tl
         JOIN exercise e ON e._id = tl.exercise_id
         ${hasCategory ? 'LEFT JOIN Category c ON c._id = e.category_id' : ''}
        ORDER BY tl.date ASC, tl._id ASC`
    );

    const builder = new SessionBuilder();
    const unknownUnits = new Map<number, number>(); // unit code -> sets skipped
    for (const r of rows) {
      const date = dayFromIsoish(r.date);
      if (!date || !r.name) continue;
      const reps = Math.max(0, r.reps ?? 0);
      const seconds = Math.max(0, r.duration_seconds ?? 0);

      let km = 0;
      const rawDistance = r.distance ?? 0;
      if (rawDistance > 0) {
        const converted = fitNotesDistanceToKm(rawDistance, r.unit ?? 0);
        if (converted === null) {
          const code = r.unit ?? 0;
          unknownUnits.set(code, (unknownUnits.get(code) ?? 0) + 1);
        } else {
          km = converted;
        }
      }

      if (reps <= 0 && seconds <= 0 && km <= 0) continue;
      builder.add(date, r.name, mapFitNotesCategory(r.category), {
        weightKg: round(r.metric_weight ?? 0, 3),
        reps,
        seconds: seconds > 0 ? seconds : undefined,
        km: km > 0 ? round(km, 3) : undefined,
      });
    }
    bundle.sessions = builder.build();
    for (const [code, count] of unknownUnits) {
      bundle.warnings.push(
        `${plural(count, 'cardio set')} used FitNotes distance unit code ${code}, which FitRack doesn't recognise yet, so that distance was skipped (time was imported).`
      );
    }

    // --- Body measurements ---
    bundle.bodyStats = await readFitNotesMeasurements(src);
    return bundle;
  } finally {
    await src.closeAsync();
  }
}

type StatKey = Exclude<keyof ImportedBodyStat, 'date'>;

function statKeyForMeasurement(name: string): StatKey | null {
  const n = name.toLowerCase();
  if (/body\s*weight|^weight$/.test(n)) return 'weight_kg';
  if (/fat/.test(n)) return 'body_fat';
  if (/chest/.test(n)) return 'chest';
  if (/waist/.test(n)) return 'waist';
  if (/hip/.test(n)) return 'hips';
  if (/thigh/.test(n)) return 'thigh';
  if (/bicep|arm/.test(n)) return 'arm';
  return null;
}

async function readFitNotesMeasurements(src: SQLite.SQLiteDatabase): Promise<ImportedBodyStat[]> {
  if (!(await hasTable(src, 'Measurement')) || !(await hasTable(src, 'MeasurementRecord'))) return [];
  const hasUnits = await hasTable(src, 'MeasurementUnit');

  const measurements = await src.getAllAsync<{ id: number; name: string; unit: string | null }>(
    `SELECT m._id AS id, m.name AS name, ${hasUnits ? 'u.short_name' : 'NULL'} AS unit
       FROM Measurement m
       ${hasUnits ? 'LEFT JOIN MeasurementUnit u ON u._id = m.unit_id' : ''}`
  );

  const byId = new Map<number, { key: StatKey; factor: number }>();
  for (const m of measurements) {
    const key = statKeyForMeasurement(m.name || '');
    if (!key) continue;
    const unit = (m.unit || '').toLowerCase();
    let factor = 1;
    if (key === 'weight_kg' && unit.startsWith('lb')) factor = 1 / LB_PER_KG;
    if (key !== 'weight_kg' && key !== 'body_fat' && (unit === 'in' || unit.startsWith('inch'))) factor = CM_PER_INCH;
    // Keep the first matching measurement per key (e.g. "Biceps (Left)" over "Biceps (Right)").
    if ([...byId.values()].some((v) => v.key === key)) continue;
    byId.set(m.id, { key, factor });
  }
  if (byId.size === 0) return [];

  const records = await src.getAllAsync<{ measurement_id: number; date: string; value: number }>(
    'SELECT measurement_id, date, value FROM MeasurementRecord ORDER BY date ASC'
  );

  const byDate = new Map<string, ImportedBodyStat>();
  for (const r of records) {
    const target = byId.get(r.measurement_id);
    const date = dayFromIsoish(r.date);
    if (!target || !date || !(r.value > 0)) continue;
    const stat = byDate.get(date) ?? { date };
    stat[target.key] = round(r.value * target.factor, 2); // last reading of the day wins
    byDate.set(date, stat);
  }
  return [...byDate.values()];
}
