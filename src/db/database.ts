import * as SQLite from 'expo-sqlite';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  subDays,
  subMonths,
  subYears,
  parse,
  isValid,
} from 'date-fns';
import {
  Exercise,
  ExerciseLog,
  ExerciseWithLogs,
  MacroLog,
  BodyStats,
  WorkoutSession,
  WorkoutHistoryItem,
  PersonalRecord,
  TrackingType,
  HydrationLog,
  WeeklyStreakInfo,
  HomeDashboardSummary,
} from '../types/database';
import { PRESEEDED_EXERCISES } from './seedData';
import { normalizeDateString, getTodayISO } from '../utils/dateUtils';

export const DB_NAME = 'fitrack.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Initializes database tables, creates performance indexes, and seeds standard exercises.
 */
export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // 1. exercises
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      tracking_type TEXT NOT NULL DEFAULT 'weight_reps',
      is_custom INTEGER DEFAULT 0
    );
  `);

  // 2. workout_sessions
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. exercise_logs
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      set_number INTEGER NOT NULL,
      weight_kg REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      distance_val REAL DEFAULT 0,
      distance_unit TEXT DEFAULT 'km',
      time_duration TEXT DEFAULT '00:00:00',
      difficulty TEXT,
      comment TEXT,
      superset_id TEXT
    );
  `);

  try {
    await db.execAsync('ALTER TABLE exercise_logs ADD COLUMN superset_id TEXT;');
  } catch {
    // Column already exists
  }

  // 4. macro_logs
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS macro_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_calories INTEGER DEFAULT 0,
      total_protein REAL DEFAULT 0,
      total_carbs REAL DEFAULT 0,
      total_fat REAL DEFAULT 0,
      actual_food TEXT
    );
  `);

  // 5. hydration_logs
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS hydration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      amount_ml INTEGER DEFAULT 0,
      target_ml INTEGER DEFAULT 2500
    );
  `);

  // 6. body_stats
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS body_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      weight_kg REAL,
      body_fat REAL,
      chest REAL,
      waist REAL,
      hips REAL,
      thigh REAL,
      arm REAL
    );
  `);

  // 7. app_settings (for theme mode, accent, etc.)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Indexes
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON workout_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_logs_session ON exercise_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_logs_exercise ON exercise_logs(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_macro_date ON macro_logs(date);
    CREATE INDEX IF NOT EXISTS idx_hydration_date ON hydration_logs(date);
    CREATE INDEX IF NOT EXISTS idx_stats_date ON body_stats(date);
  `);

  // Seed standard catalog if empty
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (!countRow || countRow.count === 0) {
    for (const ex of PRESEEDED_EXERCISES) {
      await db.runAsync(
        'INSERT OR IGNORE INTO exercises (name, category, tracking_type, is_custom) VALUES (?, ?, ?, 0)',
        [ex.name, ex.category, ex.tracking_type]
      );
    }
  }
}

// ---------------- EXERCISES ----------------

export async function getAllExercises(db: SQLite.SQLiteDatabase): Promise<Exercise[]> {
  return await db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY category ASC, name ASC');
}

export async function getExercisesByCategory(db: SQLite.SQLiteDatabase, category: string): Promise<Exercise[]> {
  if (category === 'All') {
    return getAllExercises(db);
  }
  if (category === 'Custom') {
    return await db.getAllAsync<Exercise>('SELECT * FROM exercises WHERE is_custom = 1 ORDER BY name ASC');
  }
  return await db.getAllAsync<Exercise>(
    'SELECT * FROM exercises WHERE category = ? ORDER BY name ASC',
    [category]
  );
}

export async function addCustomExercise(
  db: SQLite.SQLiteDatabase,
  name: string,
  category: string,
  trackingType: TrackingType = 'weight_reps'
): Promise<number> {
  const trimmedName = name.trim();
  const trimmedCat = category.trim() || 'Custom';
  const result = await db.runAsync(
    'INSERT OR REPLACE INTO exercises (name, category, tracking_type, is_custom) VALUES (?, ?, ?, 1)',
    [trimmedName, trimmedCat, trackingType]
  );
  return result.lastInsertRowId;
}

export async function deleteCustomExercise(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', [id]);
}

export async function getOrCreateExercise(
  db: SQLite.SQLiteDatabase,
  name: string,
  category: string = 'Custom',
  trackingType: TrackingType = 'weight_reps'
): Promise<Exercise> {
  const cleanName = name.trim();
  let existing = await db.getFirstAsync<Exercise>(
    'SELECT * FROM exercises WHERE LOWER(name) = LOWER(?)',
    [cleanName]
  );
  if (existing) return existing;

  const result = await db.runAsync(
    'INSERT INTO exercises (name, category, tracking_type, is_custom) VALUES (?, ?, ?, 1)',
    [cleanName, category.trim() || 'Custom', trackingType]
  );

  return {
    id: result.lastInsertRowId,
    name: cleanName,
    category: category.trim() || 'Custom',
    tracking_type: trackingType,
    is_custom: 1,
  };
}

// ---------------- SESSIONS & WORKOUT LOGS ----------------

export async function getOrCreateSession(db: SQLite.SQLiteDatabase, date: string): Promise<WorkoutSession> {
  let session = await db.getFirstAsync<WorkoutSession>(
    'SELECT * FROM workout_sessions WHERE date = ? ORDER BY id ASC LIMIT 1',
    [date]
  );
  if (!session) {
    const result = await db.runAsync('INSERT INTO workout_sessions (date, notes) VALUES (?, ?)', [date, '']);
    session = {
      id: result.lastInsertRowId,
      date,
      notes: '',
    };
  }
  return session;
}

export async function getSession(db: SQLite.SQLiteDatabase, date: string): Promise<WorkoutSession | null> {
  return await db.getFirstAsync<WorkoutSession>(
    'SELECT * FROM workout_sessions WHERE date = ? ORDER BY id ASC LIMIT 1',
    [date]
  );
}

export async function updateSessionNotes(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  notes: string
): Promise<void> {
  await db.runAsync('UPDATE workout_sessions SET notes = ? WHERE id = ?', [notes, sessionId]);
}

export async function getPreviousSetInfo(
  db: SQLite.SQLiteDatabase,
  exerciseId: number,
  currentDate: string
): Promise<{ weight_kg: number; reps: number; distance_val?: number; time_duration?: string } | null> {
  const query = `
    SELECT el.weight_kg, el.reps, el.distance_val, el.time_duration
    FROM exercise_logs el
    JOIN workout_sessions ws ON el.session_id = ws.id
    WHERE el.exercise_id = ? AND ws.date < ?
    ORDER BY ws.date DESC, el.set_number DESC
    LIMIT 1
  `;
  const result = await db.getFirstAsync<{
    weight_kg: number;
    reps: number;
    distance_val: number;
    time_duration: string;
  }>(query, [exerciseId, currentDate]);

  return result || null;
}

export async function getExerciseLogsForSession(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  sessionDate: string
): Promise<ExerciseWithLogs[]> {
  const logs = await db.getAllAsync<
    ExerciseLog & { name: string; category: string; tracking_type: TrackingType }
  >(
    `
    SELECT el.*, e.name as exercise_name, e.category as exercise_category, e.tracking_type as tracking_type
    FROM exercise_logs el
    JOIN exercises e ON el.exercise_id = e.id
    WHERE el.session_id = ?
    ORDER BY el.superset_id ASC, el.exercise_id ASC, el.set_number ASC
  `,
    [sessionId]
  );

  const map = new Map<number, { exercise: Exercise; logs: ExerciseLog[]; supersetId?: string | null }>();

  for (const log of logs) {
    if (!map.has(log.exercise_id)) {
      map.set(log.exercise_id, {
        exercise: {
          id: log.exercise_id,
          name: log.exercise_name || 'Exercise',
          category: log.exercise_category || 'General',
          tracking_type: log.tracking_type || 'weight_reps',
        },
        logs: [],
        supersetId: log.superset_id || null,
      });
    }
    map.get(log.exercise_id)!.logs.push(log);
  }

  const supersetMap = new Map<string, string[]>();
  for (const item of map.values()) {
    if (item.supersetId) {
      if (!supersetMap.has(item.supersetId)) {
        supersetMap.set(item.supersetId, []);
      }
      supersetMap.get(item.supersetId)!.push(item.exercise.name);
    }
  }

  const result: ExerciseWithLogs[] = [];
  for (const item of map.values()) {
    const prevInfo = await getPreviousSetInfo(db, item.exercise.id, sessionDate);
    let partnerName: string | null = null;
    if (item.supersetId && supersetMap.has(item.supersetId)) {
      const names = supersetMap.get(item.supersetId)!;
      partnerName = names.find((n) => n !== item.exercise.name) || null;
    }

    result.push({
      exercise: item.exercise,
      logs: item.logs,
      supersetId: item.supersetId,
      supersetPartnerName: partnerName,
      previousSetInfo: prevInfo,
    });
  }

  return result;
}

export async function addExerciseSet(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  exerciseId: number,
  setNumber: number,
  weightKg: number = 0,
  reps: number = 0,
  distanceVal: number = 0,
  distanceUnit: string = 'km',
  timeDuration: string = '00:00:00',
  difficulty: string | null = null,
  comment: string | null = null,
  supersetId: string | null = null
): Promise<number> {
  const result = await db.runAsync(
    `
    INSERT INTO exercise_logs (
      session_id, exercise_id, set_number, weight_kg, reps,
      distance_val, distance_unit, time_duration, difficulty, comment, superset_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      sessionId,
      exerciseId,
      setNumber,
      weightKg,
      reps,
      distanceVal,
      distanceUnit,
      timeDuration,
      difficulty,
      comment,
      supersetId,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateExerciseSet(
  db: SQLite.SQLiteDatabase,
  logId: number,
  updates: Partial<ExerciseLog>
): Promise<void> {
  const current = await db.getFirstAsync<ExerciseLog>('SELECT * FROM exercise_logs WHERE id = ?', [logId]);
  if (!current) return;

  const merged = { ...current, ...updates };

  await db.runAsync(
    `
    UPDATE exercise_logs SET
      weight_kg = ?,
      reps = ?,
      distance_val = ?,
      distance_unit = ?,
      time_duration = ?,
      difficulty = ?,
      comment = ?,
      superset_id = ?
    WHERE id = ?
  `,
    [
      merged.weight_kg ?? 0,
      merged.reps ?? 0,
      merged.distance_val ?? 0,
      merged.distance_unit ?? 'km',
      merged.time_duration ?? '00:00:00',
      merged.difficulty ?? null,
      merged.comment ?? null,
      merged.superset_id ?? null,
      logId,
    ]
  );
}

export async function deleteExerciseSet(db: SQLite.SQLiteDatabase, logId: number): Promise<void> {
  const logToDelete = await db.getFirstAsync<ExerciseLog>('SELECT * FROM exercise_logs WHERE id = ?', [logId]);
  if (!logToDelete) return;

  await db.runAsync('DELETE FROM exercise_logs WHERE id = ?', [logId]);

  await db.runAsync(
    `
    UPDATE exercise_logs 
    SET set_number = set_number - 1 
    WHERE session_id = ? AND exercise_id = ? AND set_number > ?
  `,
    [logToDelete.session_id, logToDelete.exercise_id, logToDelete.set_number]
  );
}

export async function removeExerciseFromSession(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  exerciseId: number
): Promise<void> {
  await db.runAsync('DELETE FROM exercise_logs WHERE session_id = ? AND exercise_id = ?', [
    sessionId,
    exerciseId,
  ]);
}

// ---------------- SUPERSET ACTIONS ----------------

export async function linkExercisesAsSuperset(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  exId1: number,
  exId2: number
): Promise<string> {
  const supersetKey = `ss_${sessionId}_${Math.min(exId1, exId2)}_${Math.max(exId1, exId2)}`;
  await db.runAsync(
    `
    UPDATE exercise_logs
    SET superset_id = ?
    WHERE session_id = ? AND (exercise_id = ? OR exercise_id = ?)
  `,
    [supersetKey, sessionId, exId1, exId2]
  );
  return supersetKey;
}

export async function unlinkExerciseFromSuperset(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  exerciseId: number
): Promise<void> {
  await db.runAsync(
    `
    UPDATE exercise_logs
    SET superset_id = NULL
    WHERE session_id = ? AND exercise_id = ?
  `,
    [sessionId, exerciseId]
  );
}

// ---------------- COPY PREVIOUS WORKOUT ----------------

export async function copyPreviousWorkout(
  db: SQLite.SQLiteDatabase,
  targetDate: string
): Promise<{ success: boolean; message: string }> {
  // Find most recent prior session with logs
  const prevSession = await db.getFirstAsync<{ id: number; date: string }>(
    `
    SELECT ws.id, ws.date
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
    WHERE ws.date < ?
    GROUP BY ws.id
    ORDER BY ws.date DESC
    LIMIT 1
  `,
    [targetDate]
  );

  if (!prevSession) {
    return { success: false, message: 'No prior workout found to copy.' };
  }

  const targetSession = await getOrCreateSession(db, targetDate);

  // Get prior logs
  const priorLogs = await db.getAllAsync<ExerciseLog>(
    'SELECT * FROM exercise_logs WHERE session_id = ? ORDER BY id ASC',
    [prevSession.id]
  );

  for (const log of priorLogs) {
    await db.runAsync(
      `
      INSERT INTO exercise_logs (
        session_id, exercise_id, set_number, weight_kg, reps,
        distance_val, distance_unit, time_duration, difficulty, comment, superset_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        targetSession.id,
        log.exercise_id,
        log.set_number,
        log.weight_kg ?? 0,
        log.reps ?? 0,
        log.distance_val ?? 0,
        log.distance_unit ?? 'km',
        log.time_duration ?? '00:00:00',
        log.difficulty ?? null,
        log.comment ?? null,
        log.superset_id ?? null,
      ]
    );
  }

  return {
    success: true,
    message: `Copied ${priorLogs.length} sets from ${prevSession.date}`,
  };
}

// ---------------- CALENDAR MULTI-COLOR CATEGORY DOTS ----------------

export interface CalendarDayWorkoutData {
  categories: string[];
  totalSets: number;
  totalVolume: number;
}

export async function getCalendarCategoryDots(
  db: SQLite.SQLiteDatabase
): Promise<Record<string, CalendarDayWorkoutData>> {
  const rows = await db.getAllAsync<{
    date: string;
    category: string;
    sets: number;
    volume: number;
  }>(`
    SELECT 
      ws.date as date,
      e.category as category,
      COUNT(el.id) as sets,
      SUM(el.weight_kg * el.reps) as volume
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
    JOIN exercises e ON el.exercise_id = e.id
    GROUP BY ws.date, e.category
    ORDER BY ws.date DESC
  `);

  const result: Record<string, CalendarDayWorkoutData> = {};

  for (const row of rows) {
    if (!result[row.date]) {
      result[row.date] = {
        categories: [],
        totalSets: 0,
        totalVolume: 0,
      };
    }
    if (!result[row.date].categories.includes(row.category)) {
      result[row.date].categories.push(row.category);
    }
    result[row.date].totalSets += row.sets;
    result[row.date].totalVolume += row.volume || 0;
  }

  return result;
}

// ---------------- 1RM TO 15RM RECORDS MATRIX TABLE ----------------

export interface ExerciseRepMaxRow {
  exerciseId: number;
  exerciseName: string;
  category: string;
  repMaxes: Record<number, { weightKg: number; date: string } | null>; // 1 -> { weight, date }
}

export async function getRepMaxMatrix(
  db: SQLite.SQLiteDatabase
): Promise<ExerciseRepMaxRow[]> {
  const rows = await db.getAllAsync<{
    exercise_id: number;
    exercise_name: string;
    category: string;
    reps: number;
    max_weight: number;
    date: string;
  }>(`
    SELECT 
      el.exercise_id,
      e.name as exercise_name,
      e.category,
      el.reps,
      MAX(el.weight_kg) as max_weight,
      ws.date
    FROM exercise_logs el
    JOIN exercises e ON el.exercise_id = e.id
    JOIN workout_sessions ws ON el.session_id = ws.id
    WHERE e.tracking_type = 'weight_reps' AND el.weight_kg > 0 AND el.reps BETWEEN 1 AND 15
    GROUP BY el.exercise_id, el.reps
    ORDER BY e.category ASC, e.name ASC
  `);

  const map = new Map<number, ExerciseRepMaxRow>();

  for (const row of rows) {
    if (!map.has(row.exercise_id)) {
      map.set(row.exercise_id, {
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        category: row.category,
        repMaxes: {},
      });
    }

    const item = map.get(row.exercise_id)!;
    item.repMaxes[row.reps] = {
      weightKg: row.max_weight,
      date: row.date,
    };
  }

  return Array.from(map.values());
}

// ---------------- BREAKDOWN DATA (DONUT & 2x2 GRID) ----------------

export interface CategoryBreakdownResult {
  dateRangeText: string;
  categories: {
    category: string;
    sets: number;
    volumeKg: number;
    percentage: number;
    color: string;
  }[];
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
}

export async function getCategoryBreakdown(
  db: SQLite.SQLiteDatabase,
  period: 'Week' | 'Month' | 'Year' | 'All Time' = 'Week',
  metric: 'sets' | 'volume' = 'sets',
  refDate: string = getTodayISO()
): Promise<CategoryBreakdownResult> {
  const refDateObj = parse(refDate, 'yyyy-MM-dd', new Date());

  let startDate = '1970-01-01';
  let endDate = '2099-12-31';
  let dateRangeText = 'All Time';

  if (period === 'Week') {
    const s = startOfWeek(refDateObj, { weekStartsOn: 1 });
    const e = endOfWeek(refDateObj, { weekStartsOn: 1 });
    startDate = format(s, 'yyyy-MM-dd');
    endDate = format(e, 'yyyy-MM-dd');
    dateRangeText = `${format(s, 'dd MMM yyyy')} - ${format(e, 'dd MMM yyyy')}`;
  } else if (period === 'Month') {
    const s = startOfMonth(refDateObj);
    const e = endOfMonth(refDateObj);
    startDate = format(s, 'yyyy-MM-dd');
    endDate = format(e, 'yyyy-MM-dd');
    dateRangeText = format(s, 'MMMM yyyy');
  } else if (period === 'Year') {
    const s = startOfYear(refDateObj);
    const e = endOfYear(refDateObj);
    startDate = format(s, 'yyyy-MM-dd');
    endDate = format(e, 'yyyy-MM-dd');
    dateRangeText = format(s, 'yyyy');
  }

  // Summary counts
  const summaryRow = await db.getFirstAsync<{
    workouts: number;
    sets: number;
    reps: number;
    volume: number;
  }>(
    `
    SELECT 
      COUNT(DISTINCT ws.id) as workouts,
      COUNT(el.id) as sets,
      SUM(el.reps) as reps,
      SUM(el.weight_kg * el.reps) as volume
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
    WHERE ws.date BETWEEN ? AND ?
  `,
    [startDate, endDate]
  );

  // Category breakdown
  const catRows = await db.getAllAsync<{
    category: string;
    sets: number;
    volume: number;
  }>(
    `
    SELECT 
      e.category,
      COUNT(el.id) as sets,
      SUM(el.weight_kg * el.reps) as volume
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
    JOIN exercises e ON el.exercise_id = e.id
    WHERE ws.date BETWEEN ? AND ?
    GROUP BY e.category
    ORDER BY sets DESC
  `,
    [startDate, endDate]
  );

  const totalPrimary = metric === 'sets' ? summaryRow?.sets || 0 : summaryRow?.volume || 0;

  const categoryColorPalette: Record<string, string> = {
    Legs: '#38BDF8',
    Chest: '#EF4444',
    Shoulders: '#A855F7',
    Abs: '#0EA5E9',
    Triceps: '#22C55E',
    Back: '#F59E0B',
    Biceps: '#EC4899',
    Cardio: '#06B6D4',
    Custom: '#6366F1',
  };

  const categories = catRows.map((c) => {
    const value = metric === 'sets' ? c.sets : c.volume;
    const percentage = totalPrimary > 0 ? Math.round((value / totalPrimary) * 10000) / 100 : 0;
    return {
      category: c.category,
      sets: c.sets,
      volumeKg: Math.round(c.volume || 0),
      percentage,
      color: categoryColorPalette[c.category] || '#94A3B8',
    };
  });

  return {
    dateRangeText,
    categories,
    totalWorkouts: summaryRow?.workouts || 0,
    totalSets: summaryRow?.sets || 0,
    totalReps: summaryRow?.reps || 0,
    totalVolumeKg: Math.round(summaryRow?.volume || 0),
  };
}

// ---------------- APP SETTINGS (THEME & PREFERENCES) ----------------

export async function getAppSetting(
  db: SQLite.SQLiteDatabase,
  key: string,
  defaultValue: string = ''
): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? defaultValue;
}

export async function setAppSetting(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: string
): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `,
    [key, value]
  );
}

// ---------------- EXERCISE DETAIL HISTORY & CHART DATA ----------------

export async function getExerciseHistoryLogs(
  db: SQLite.SQLiteDatabase,
  exerciseId: number
): Promise<{ date: string; logs: ExerciseLog[] }[]> {
  const rows = await db.getAllAsync<ExerciseLog & { date: string }>(
    `
    SELECT el.*, ws.date
    FROM exercise_logs el
    JOIN workout_sessions ws ON el.session_id = ws.id
    WHERE el.exercise_id = ?
    ORDER BY ws.date DESC, el.set_number ASC
  `,
    [exerciseId]
  );

  const map = new Map<string, ExerciseLog[]>();
  for (const row of rows) {
    if (!map.has(row.date)) {
      map.set(row.date, []);
    }
    map.get(row.date)!.push(row);
  }

  return Array.from(map.entries()).map(([date, logs]) => ({ date, logs }));
}

// ---------------- HYDRATION ----------------

export async function getHydrationLog(db: SQLite.SQLiteDatabase, date: string): Promise<HydrationLog> {
  const log = await db.getFirstAsync<HydrationLog>('SELECT * FROM hydration_logs WHERE date = ?', [date]);
  return log || { date, amount_ml: 0, target_ml: 2500 };
}

export async function addHydration(
  db: SQLite.SQLiteDatabase,
  date: string,
  deltaMl: number,
  targetMl: number = 2500
): Promise<HydrationLog> {
  const current = await getHydrationLog(db, date);
  const nextAmount = Math.max(0, current.amount_ml + deltaMl);

  await db.runAsync(
    `
    INSERT INTO hydration_logs (date, amount_ml, target_ml)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      amount_ml = excluded.amount_ml,
      target_ml = excluded.target_ml
  `,
    [date, nextAmount, targetMl]
  );

  return { date, amount_ml: nextAmount, target_ml: targetMl };
}

export async function resetHydration(
  db: SQLite.SQLiteDatabase,
  date: string,
  targetMl: number = 2500
): Promise<HydrationLog> {
  await db.runAsync('UPDATE hydration_logs SET amount_ml = 0 WHERE date = ?', [date]);
  return { date, amount_ml: 0, target_ml: targetMl };
}

// ---------------- WEEKLY STREAKS & HOME DASHBOARD ----------------

export async function getWeeklyStreakInfo(
  db: SQLite.SQLiteDatabase,
  referenceDate: string = getTodayISO()
): Promise<WeeklyStreakInfo> {
  const refDateObj = parse(referenceDate, 'yyyy-MM-dd', new Date());
  const weekStart = startOfWeek(refDateObj, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDateObj, { weekStartsOn: 1 });
  const daysInInterval = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const workoutRows = await db.getAllAsync<{ date: string }>(`
    SELECT DISTINCT ws.date
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
  `);
  const activeWorkoutDates = new Set(workoutRows.map((r) => r.date));

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekDays = daysInInterval.map((d, index) => {
    const iso = format(d, 'yyyy-MM-dd');
    return {
      label: dayLabels[index] || 'D',
      date: iso,
      completed: activeWorkoutDates.has(iso),
      isToday: iso === referenceDate,
    };
  });

  let currentStreak = 0;
  let checkDate = new Date();
  while (true) {
    const iso = format(checkDate, 'yyyy-MM-dd');
    if (activeWorkoutDates.has(iso)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      if (currentStreak === 0 && format(checkDate, 'yyyy-MM-dd') === getTodayISO()) {
        checkDate = subDays(checkDate, 1);
        if (activeWorkoutDates.has(format(checkDate, 'yyyy-MM-dd'))) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
          continue;
        }
      }
      break;
    }
  }

  const bestStreak = Math.max(currentStreak, activeWorkoutDates.size > 0 ? 1 : 0);

  return {
    currentStreak,
    bestStreak,
    weekDays,
  };
}

export async function getHomeDashboardData(
  db: SQLite.SQLiteDatabase,
  date: string = getTodayISO()
): Promise<HomeDashboardSummary> {
  const macroLog = await getMacroLog(db, date);
  const caloriesConsumed = macroLog?.total_calories || 0;
  const caloriesGoal = 2000;
  const proteinConsumed = macroLog?.total_protein || 0;
  const proteinGoal = 150;

  const foodRemainingKcal = Math.max(0, caloriesGoal - caloriesConsumed);
  const foodRemainingProtein = Math.max(0, proteinGoal - proteinConsumed);

  const hydration = await getHydrationLog(db, date);

  const todaySession = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM workout_sessions WHERE date = ?',
    [date]
  );
  let workoutsDoneToday = 0;
  if (todaySession) {
    const countRow = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM exercise_logs WHERE session_id = ?',
      [todaySession.id]
    );
    if ((countRow?.c || 0) > 0) workoutsDoneToday = 1;
  }

  let goalsMet = 0;
  if (proteinConsumed >= proteinGoal && proteinGoal > 0) goalsMet++;
  if (workoutsDoneToday >= 1) goalsMet++;
  if (caloriesConsumed >= caloriesGoal && caloriesGoal > 0) goalsMet++;

  const latestWeightRow = await db.getFirstAsync<{ weight_kg: number; date: string }>(
    'SELECT weight_kg, date FROM body_stats WHERE weight_kg IS NOT NULL ORDER BY date DESC LIMIT 1'
  );

  const streak = await getWeeklyStreakInfo(db, date);

  const refDateObj = parse(date, 'yyyy-MM-dd', new Date());
  const weekStartIso = format(startOfWeek(refDateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEndIso = format(endOfWeek(refDateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const weeklyActivitiesRow = await db.getFirstAsync<{ count: number }>(
    `
    SELECT COUNT(DISTINCT ws.id) as count
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
    WHERE ws.date BETWEEN ? AND ?
  `,
    [weekStartIso, weekEndIso]
  );

  const weeklyDistanceRow = await db.getFirstAsync<{ totalDist: number }>(
    `
    SELECT SUM(el.distance_val) as totalDist
    FROM exercise_logs el
    JOIN workout_sessions ws ON el.session_id = ws.id
    WHERE ws.date BETWEEN ? AND ?
  `,
    [weekStartIso, weekEndIso]
  );

  return {
    goalsMetCount: goalsMet,
    totalGoals: 3,
    proteinConsumed,
    proteinGoal,
    caloriesConsumed,
    caloriesGoal,
    workoutsDoneToday,
    workoutGoalToday: 1,
    foodRemainingKcal,
    foodRemainingProtein,
    hydrationMl: hydration.amount_ml,
    hydrationTargetMl: hydration.target_ml,
    latestWeightKg: latestWeightRow?.weight_kg || null,
    weightDateText: latestWeightRow ? `Weigh-in on ${latestWeightRow.date}` : 'First weigh-in',
    streak,
    weeklyActivitiesCount: weeklyActivitiesRow?.count || 0,
    weeklyDistanceKm: weeklyDistanceRow?.totalDist || 0,
    weeklyDurationMinutes: (weeklyActivitiesRow?.count || 0) * 45,
    weeklyCaloriesBurned: (weeklyActivitiesRow?.count || 0) * 320,
  };
}

// ---------------- WORKOUT HISTORY ----------------

export async function getWorkoutDatesWithLogs(db: SQLite.SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ date: string }>(`
    SELECT DISTINCT ws.date
    FROM workout_sessions ws
    JOIN exercise_logs el ON ws.id = el.session_id
    ORDER BY ws.date DESC
  `);
  return rows.map((r) => r.date);
}

export async function getWorkoutHistory(
  db: SQLite.SQLiteDatabase,
  limit: number = 30,
  offset: number = 0
): Promise<WorkoutHistoryItem[]> {
  const sessions = await db.getAllAsync<{ id: number; date: string; notes: string }>(
    `
    SELECT ws.id, ws.date, ws.notes
    FROM workout_sessions ws
    WHERE EXISTS (SELECT 1 FROM exercise_logs el WHERE el.session_id = ws.id)
    ORDER BY ws.date DESC
    LIMIT ? OFFSET ?
  `,
    [limit, offset]
  );

  const history: WorkoutHistoryItem[] = [];

  for (const sess of sessions) {
    const logs = await db.getAllAsync<{
      exercise_id: number;
      exercise_name: string;
      category: string;
      weight_kg: number;
      reps: number;
      tracking_type: TrackingType;
      distance_val: number;
      distance_unit: string;
      time_duration: string;
    }>(
      `
      SELECT el.exercise_id, e.name as exercise_name, e.category, el.weight_kg, el.reps, 
             e.tracking_type, el.distance_val, el.distance_unit, el.time_duration
      FROM exercise_logs el
      JOIN exercises e ON el.exercise_id = e.id
      WHERE el.session_id = ?
      ORDER BY el.set_number ASC
    `,
      [sess.id]
    );

    let totalVolumeKg = 0;
    const exMap = new Map<
      number,
      { name: string; category: string; count: number; bestWeight: number; bestReps: number; bestDesc: string }
    >();

    for (const log of logs) {
      if (log.tracking_type === 'weight_reps') {
        totalVolumeKg += log.weight_kg * log.reps;
      }

      if (!exMap.has(log.exercise_id)) {
        exMap.set(log.exercise_id, {
          name: log.exercise_name,
          category: log.category,
          count: 0,
          bestWeight: 0,
          bestReps: 0,
          bestDesc: '',
        });
      }

      const item = exMap.get(log.exercise_id)!;
      item.count += 1;

      if (log.tracking_type === 'weight_reps') {
        if (log.weight_kg > item.bestWeight || (log.weight_kg === item.bestWeight && log.reps > item.bestReps)) {
          item.bestWeight = log.weight_kg;
          item.bestReps = log.reps;
          item.bestDesc = `${log.weight_kg}kg × ${log.reps}`;
        }
      } else if (log.tracking_type === 'distance_time') {
        item.bestDesc = `${log.distance_val}${log.distance_unit} in ${log.time_duration}`;
      } else {
        item.bestDesc = log.time_duration;
      }
    }

    history.push({
      sessionId: sess.id,
      date: sess.date,
      notes: sess.notes,
      totalSets: logs.length,
      totalVolumeKg: Math.round(totalVolumeKg),
      exercises: Array.from(exMap.values()).map((e) => ({
        name: e.name,
        category: e.category,
        setsCount: e.count,
        bestSet: e.bestDesc || `${e.count} sets`,
      })),
    });
  }

  return history;
}

export async function getPersonalRecords(db: SQLite.SQLiteDatabase): Promise<PersonalRecord[]> {
  const query = `
    SELECT 
      e.id as exerciseId,
      e.name as exerciseName,
      e.category as category,
      MAX(el.weight_kg) as maxWeightKg,
      el.reps as maxRepsAtMaxWeight,
      ws.date as dateAchieved
    FROM exercise_logs el
    JOIN exercises e ON el.exercise_id = e.id
    JOIN workout_sessions ws ON el.session_id = ws.id
    WHERE e.tracking_type = 'weight_reps' AND el.weight_kg > 0
    GROUP BY e.id
    ORDER BY maxWeightKg DESC
    LIMIT 25
  `;

  const rows = await db.getAllAsync<{
    exerciseId: number;
    exerciseName: string;
    category: string;
    maxWeightKg: number;
    maxRepsAtMaxWeight: number;
    dateAchieved: string;
  }>(query);

  return rows.map((r) => {
    const epley1RM = r.maxWeightKg * (1 + (r.maxRepsAtMaxWeight || 1) / 30);
    return {
      exerciseId: r.exerciseId,
      exerciseName: r.exerciseName,
      category: r.category,
      maxWeightKg: r.maxWeightKg,
      maxRepsAtMaxWeight: r.maxRepsAtMaxWeight,
      estimated1RM: Math.round(epley1RM * 10) / 10,
      dateAchieved: r.dateAchieved,
    };
  });
}

export async function getMuscleGroupDistribution(
  db: SQLite.SQLiteDatabase
): Promise<{ category: string; setsCount: number; percentage: number }[]> {
  const rows = await db.getAllAsync<{ category: string; setsCount: number }>(`
    SELECT e.category, COUNT(el.id) as setsCount
    FROM exercise_logs el
    JOIN exercises e ON el.exercise_id = e.id
    GROUP BY e.category
    ORDER BY setsCount DESC
  `);

  const total = rows.reduce((acc, r) => acc + r.setsCount, 0);
  if (total === 0) return [];

  return rows.map((r) => ({
    category: r.category,
    setsCount: r.setsCount,
    percentage: Math.round((r.setsCount / total) * 100),
  }));
}

// ---------------- MACROS ----------------

export async function getMacroLog(db: SQLite.SQLiteDatabase, date: string): Promise<MacroLog | null> {
  return await db.getFirstAsync<MacroLog>('SELECT * FROM macro_logs WHERE date = ?', [date]);
}

export async function saveMacroLog(db: SQLite.SQLiteDatabase, log: MacroLog): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO macro_logs (date, total_calories, total_protein, total_carbs, total_fat, actual_food)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_calories = excluded.total_calories,
      total_protein = excluded.total_protein,
      total_carbs = excluded.total_carbs,
      total_fat = excluded.total_fat,
      actual_food = excluded.actual_food
  `,
    [
      log.date,
      log.total_calories || 0,
      log.total_protein || 0,
      log.total_carbs || 0,
      log.total_fat || 0,
      log.actual_food || '',
    ]
  );
}

export async function getRecentMacroLogs(db: SQLite.SQLiteDatabase, limit: number = 30): Promise<MacroLog[]> {
  return await db.getAllAsync<MacroLog>('SELECT * FROM macro_logs ORDER BY date DESC LIMIT ?', [limit]);
}

// ---------------- BODY STATS ----------------

export async function getBodyStats(db: SQLite.SQLiteDatabase, date: string): Promise<BodyStats | null> {
  return await db.getFirstAsync<BodyStats>('SELECT * FROM body_stats WHERE date = ?', [date]);
}

export async function saveBodyStats(db: SQLite.SQLiteDatabase, stats: BodyStats): Promise<void> {
  await db.runAsync(
    `
    INSERT INTO body_stats (date, weight_kg, body_fat, chest, waist, hips, thigh, arm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      weight_kg = excluded.weight_kg,
      body_fat = excluded.body_fat,
      chest = excluded.chest,
      waist = excluded.waist,
      hips = excluded.hips,
      thigh = excluded.thigh,
      arm = excluded.arm
  `,
    [
      stats.date,
      stats.weight_kg ?? null,
      stats.body_fat ?? null,
      stats.chest ?? null,
      stats.waist ?? null,
      stats.hips ?? null,
      stats.thigh ?? null,
      stats.arm ?? null,
    ]
  );
}

export async function getAllBodyStats(db: SQLite.SQLiteDatabase): Promise<BodyStats[]> {
  return await db.getAllAsync<BodyStats>('SELECT * FROM body_stats ORDER BY date DESC');
}

// ---------------- SUMMARY & DB HEALTH ----------------

export async function getDatabaseSummary(db: SQLite.SQLiteDatabase): Promise<{
  totalExercises: number;
  totalSessions: number;
  totalSets: number;
  totalMacroDays: number;
  totalBodyStatDays: number;
}> {
  const ex = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM exercises');
  const sess = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM workout_sessions');
  const sets = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM exercise_logs');
  const macros = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM macro_logs');
  const stats = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM body_stats');

  return {
    totalExercises: ex?.c || 0,
    totalSessions: sess?.c || 0,
    totalSets: sets?.c || 0,
    totalMacroDays: macros?.c || 0,
    totalBodyStatDays: stats?.c || 0,
  };
}

export async function clearAllUserData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM exercise_logs;
    DELETE FROM workout_sessions;
    DELETE FROM macro_logs;
    DELETE FROM hydration_logs;
    DELETE FROM body_stats;
    DELETE FROM exercises WHERE is_custom = 1;
  `);
}
