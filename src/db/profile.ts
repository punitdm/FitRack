import * as SQLite from 'expo-sqlite';
import { format, startOfWeek, subWeeks } from 'date-fns';

/**
 * Profile details (stored in app_settings) and the training stats shown on the
 * Profile tab. Stats come straight from logged sets, so they always match the
 * rest of the app.
 */

export type Sex = 'male' | 'female' | 'other' | '';

export interface Profile {
  name: string;
  age: number | null;
  heightCm: number | null;
  sex: Sex;
  /** Workouts per week you're aiming for. */
  weeklyGoal: number;
}

export const DEFAULT_PROFILE: Profile = { name: '', age: null, heightCm: null, sex: '', weeklyGoal: 4 };

const PROFILE_KEY = 'profile';

export async function getProfile(db: SQLite.SQLiteDatabase): Promise<Profile> {
  try {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [PROFILE_KEY]);
    if (!row?.value) return DEFAULT_PROFILE;
    const p = JSON.parse(row.value);
    const pos = (v: unknown) => (typeof v === 'number' && v > 0 ? v : null);
    return {
      name: typeof p.name === 'string' ? p.name : '',
      age: pos(p.age),
      heightCm: pos(p.heightCm),
      sex: ['male', 'female', 'other'].includes(p.sex) ? p.sex : '',
      weeklyGoal: typeof p.weeklyGoal === 'number' && p.weeklyGoal >= 1 && p.weeklyGoal <= 7 ? p.weeklyGoal : 4,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(db: SQLite.SQLiteDatabase, profile: Profile): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [PROFILE_KEY, JSON.stringify(profile)]
  );
}

export interface ProfileStats {
  totalWorkouts: number;
  totalSets: number;
  /** Sum of weight × reps over every set, in kg. */
  totalVolumeKg: number;
  /** Rough time trained, using the same ~3 minutes per set the Hub uses. */
  estimatedHours: number;
  firstWorkoutDate: string | null;
  workoutsThisYear: number;
  volumeThisYearKg: number;
  monthsTrainedThisYear: number;
  /** Workouts per month this year, Jan..Dec. */
  workoutsByMonth: number[];
  /** Lifted volume (kg) per month this year, Jan..Dec. */
  volumeByMonth: number[];
  /** Sets per month this year, Jan..Dec. */
  setsByMonth: number[];
  workoutsThisWeek: number;
  /** Consecutive weeks (ending this week or last) with at least one workout. */
  weekStreak: number;
  latestWeightKg: number | null;
  latestBodyFat: number | null;
  weightChange30dKg: number | null;
}

export async function getProfileStats(db: SQLite.SQLiteDatabase, today = new Date()): Promise<ProfileStats> {
  const year = format(today, 'yyyy');

  const days = await db.getAllAsync<{ date: string; sets: number; volume: number }>(
    `SELECT ws.date AS date, COUNT(el.id) AS sets, SUM(COALESCE(el.weight_kg, 0) * COALESCE(el.reps, 0)) AS volume
       FROM workout_sessions ws
       JOIN exercise_logs el ON el.session_id = ws.id
      GROUP BY ws.date
      ORDER BY ws.date ASC`
  );

  const workoutsByMonth = Array(12).fill(0) as number[];
  const volumeByMonth = Array(12).fill(0) as number[];
  const setsByMonth = Array(12).fill(0) as number[];
  let totalSets = 0;
  let totalVolumeKg = 0;
  let workoutsThisYear = 0;
  let volumeThisYearKg = 0;
  for (const d of days) {
    totalSets += d.sets || 0;
    totalVolumeKg += d.volume || 0;
    if (d.date.startsWith(year)) {
      workoutsThisYear++;
      volumeThisYearKg += d.volume || 0;
      const m = parseInt(d.date.slice(5, 7), 10) - 1;
      if (m >= 0 && m < 12) {
        workoutsByMonth[m]++;
        volumeByMonth[m] += d.volume || 0;
        setsByMonth[m] += d.sets || 0;
      }
    }
  }

  // Weekly streak (weeks start Monday, like the rest of the app).
  const weekKey = (iso: string) => format(startOfWeek(new Date(`${iso}T12:00:00`), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const trainedWeeks = new Set(days.map((d) => weekKey(d.date)));
  const thisWeek = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  let cursor = trainedWeeks.has(thisWeek) ? startOfWeek(today, { weekStartsOn: 1 }) : subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
  let weekStreak = 0;
  while (trainedWeeks.has(format(cursor, 'yyyy-MM-dd'))) {
    weekStreak++;
    cursor = subWeeks(cursor, 1);
  }
  const workoutsThisWeek = days.filter((d) => weekKey(d.date) === thisWeek).length;

  const latest = await db.getFirstAsync<{ date: string; weight_kg: number | null; body_fat: number | null }>(
    'SELECT date, weight_kg, body_fat FROM body_stats WHERE weight_kg IS NOT NULL ORDER BY date DESC LIMIT 1'
  );
  let weightChange30dKg: number | null = null;
  if (latest?.weight_kg) {
    const back = format(new Date(new Date(`${latest.date}T12:00:00`).getTime() - 30 * 86400000), 'yyyy-MM-dd');
    const before = await db.getFirstAsync<{ weight_kg: number }>(
      'SELECT weight_kg FROM body_stats WHERE weight_kg IS NOT NULL AND date <= ? ORDER BY date DESC LIMIT 1',
      [back]
    );
    if (before?.weight_kg) weightChange30dKg = Math.round((latest.weight_kg - before.weight_kg) * 10) / 10;
  }
  const latestFat = await db.getFirstAsync<{ body_fat: number }>(
    'SELECT body_fat FROM body_stats WHERE body_fat IS NOT NULL ORDER BY date DESC LIMIT 1'
  );

  return {
    totalWorkouts: days.length,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg),
    estimatedHours: Math.round((totalSets * 3) / 60),
    firstWorkoutDate: days[0]?.date ?? null,
    workoutsThisYear,
    volumeThisYearKg: Math.round(volumeThisYearKg),
    monthsTrainedThisYear: workoutsByMonth.filter((n) => n > 0).length,
    workoutsByMonth,
    volumeByMonth: volumeByMonth.map((v) => Math.round(v)),
    setsByMonth,
    workoutsThisWeek,
    weekStreak,
    latestWeightKg: latest?.weight_kg ?? null,
    latestBodyFat: latestFat?.body_fat ?? null,
    weightChange30dKg,
  };
}

/** 12.3 t / 950 kg style label for lifted volume. */
export function formatVolume(kg: number): { value: string; unit: string } {
  if (kg >= 1000) return { value: (Math.round(kg / 100) / 10).toLocaleString(), unit: 't' };
  return { value: Math.round(kg).toLocaleString(), unit: 'kg' };
}

export function bmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Goal weight (shown in the Bodyweight sheet)
// ---------------------------------------------------------------------------

const WEIGHT_GOAL_KEY = 'weight_goal_kg';

export async function getWeightGoal(db: SQLite.SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [WEIGHT_GOAL_KEY]);
  const v = row ? parseFloat(row.value) : NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
}

export async function saveWeightGoal(db: SQLite.SQLiteDatabase, kg: number | null): Promise<void> {
  if (kg == null) {
    await db.runAsync('DELETE FROM app_settings WHERE key = ?', [WEIGHT_GOAL_KEY]);
    return;
  }
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [WEIGHT_GOAL_KEY, String(kg)]
  );
}
