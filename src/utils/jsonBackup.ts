import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import Papa from 'papaparse';
import {
  Exercise,
  WorkoutSession,
  ExerciseLog,
  MacroLog,
  HydrationLog,
  BodyStats,
  RunningLog,
  CustomFood,
} from '../types/database';
import { normalizeDateString } from './dateUtils';

export interface FitRackBackupPayload {
  version: string;
  schema_version: number;
  exported_at: string;
  workout_sessions: WorkoutSession[];
  exercise_logs: ExerciseLog[];
  exercises: Exercise[];
  macro_logs: MacroLog[];
  hydration_logs: HydrationLog[];
  body_stats: BodyStats[];
  running_logs: RunningLog[];
  custom_foods: CustomFood[];
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  message: string;
  format?: 'json' | 'csv';
  counts?: {
    sessions?: number;
    sets?: number;
    exercises?: number;
    macros?: number;
    running?: number;
    bodyStats?: number;
    foods?: number;
  };
}

/**
 * Exports entire FitRack database to a centralized, Supabase & WebApp compatible JSON file.
 */
export async function exportFullJsonBackup(db: SQLite.SQLiteDatabase): Promise<BackupResult> {
  try {
    const [
      sessions,
      logs,
      exercises,
      macros,
      hydration,
      bodyStats,
      running,
      foods,
    ] = await Promise.all([
      db.getAllAsync<WorkoutSession>('SELECT * FROM workout_sessions ORDER BY date ASC, id ASC'),
      db.getAllAsync<ExerciseLog>('SELECT * FROM exercise_logs ORDER BY session_id ASC, set_number ASC'),
      db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY id ASC'),
      db.getAllAsync<MacroLog>('SELECT * FROM macro_logs ORDER BY date ASC'),
      db.getAllAsync<HydrationLog>('SELECT * FROM hydration_logs ORDER BY date ASC'),
      db.getAllAsync<BodyStats>('SELECT * FROM body_stats ORDER BY date ASC'),
      db.getAllAsync<RunningLog>('SELECT * FROM running_logs ORDER BY date ASC'),
      db.getAllAsync<CustomFood>('SELECT * FROM custom_foods ORDER BY id ASC'),
    ]);

    const payload: FitRackBackupPayload = {
      version: '1.2.0',
      schema_version: 1,
      exported_at: new Date().toISOString(),
      workout_sessions: sessions,
      exercise_logs: logs,
      exercises: exercises,
      macro_logs: macros,
      hydration_logs: hydration,
      body_stats: bodyStats,
      running_logs: running,
      custom_foods: foods,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `FitRack_Full_Backup_${timestamp}.json`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export FitRack Backup (JSON)',
        UTI: 'public.json',
      });
    }

    return {
      success: true,
      filePath: fileUri,
      format: 'json',
      message: `Exported ${sessions.length} workouts, ${macros.length} diet logs & ${running.length} runs! 🚀`,
      counts: {
        sessions: sessions.length,
        sets: logs.length,
        exercises: exercises.length,
        macros: macros.length,
        running: running.length,
        bodyStats: bodyStats.length,
        foods: foods.length,
      },
    };
  } catch (err: any) {
    console.error('JSON Export Error:', err);
    return {
      success: false,
      message: `Failed to export JSON backup: ${err.message}`,
    };
  }
}

/**
 * Imports and merges a FitRack JSON backup file into SQLite.
 */
export async function importFullJsonBackup(
  db: SQLite.SQLiteDatabase,
  jsonContent: string
): Promise<BackupResult> {
  try {
    const data = JSON.parse(jsonContent);

    if (!data.workout_sessions && !data.macro_logs && !data.exercises && !data.body_stats) {
      throw new Error('Invalid FitRack JSON structure. Missing database tables.');
    }

    let sessionsCount = 0;
    let setsCount = 0;
    let exercisesCount = 0;
    let macrosCount = 0;
    let runningCount = 0;
    let bodyStatsCount = 0;
    let foodsCount = 0;

    await db.execAsync('PRAGMA foreign_keys = OFF;');

    // 1. Exercises
    if (Array.isArray(data.exercises)) {
      for (const ex of data.exercises) {
        await db.runAsync(
          `INSERT INTO exercises (id, name, category, tracking_type, is_custom)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET
             category = excluded.category,
             tracking_type = excluded.tracking_type`,
          [ex.id, ex.name, ex.category, ex.tracking_type || 'weight_reps', ex.is_custom || 0]
        );
        exercisesCount++;
      }
    }

    // 2. Workout Sessions
    if (Array.isArray(data.workout_sessions)) {
      for (const ws of data.workout_sessions) {
        await db.runAsync(
          `INSERT INTO workout_sessions (id, date, notes)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             date = excluded.date,
             notes = excluded.notes`,
          [ws.id, ws.date, ws.notes || null]
        );
        sessionsCount++;
      }
    }

    // 3. Exercise Logs
    if (Array.isArray(data.exercise_logs)) {
      for (const el of data.exercise_logs) {
        await db.runAsync(
          `INSERT INTO exercise_logs (id, session_id, exercise_id, set_number, weight_kg, reps, distance_val, distance_unit, time_seconds, is_warmup, is_drop_set, rpe, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             weight_kg = excluded.weight_kg,
             reps = excluded.reps,
             distance_val = excluded.distance_val,
             time_seconds = excluded.time_seconds`,
          [
            el.id,
            el.session_id,
            el.exercise_id,
            el.set_number,
            el.weight_kg || 0,
            el.reps || 0,
            el.distance_val || 0,
            el.distance_unit || 'km',
            el.time_seconds || 0,
            el.is_warmup || 0,
            el.is_drop_set || 0,
            el.rpe || null,
            el.notes || null,
          ]
        );
        setsCount++;
      }
    }

    // 4. Macro Logs
    if (Array.isArray(data.macro_logs)) {
      for (const m of data.macro_logs) {
        await db.runAsync(
          `INSERT INTO macro_logs (date, total_calories, total_protein, total_carbs, total_fat, actual_food)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
             total_calories = excluded.total_calories,
             total_protein = excluded.total_protein,
             total_carbs = excluded.total_carbs,
             total_fat = excluded.total_fat,
             actual_food = excluded.actual_food`,
          [
            m.date,
            m.total_calories || 0,
            m.total_protein || 0,
            m.total_carbs || 0,
            m.total_fat || 0,
            m.actual_food || null,
          ]
        );
        macrosCount++;
      }
    }

    // 5. Hydration Logs
    if (Array.isArray(data.hydration_logs)) {
      for (const h of data.hydration_logs) {
        await db.runAsync(
          `INSERT INTO hydration_logs (date, amount_ml, target_ml)
           VALUES (?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
             amount_ml = excluded.amount_ml,
             target_ml = excluded.target_ml`,
          [h.date, h.amount_ml || 0, h.target_ml || 3000]
        );
      }
    }

    // 6. Body Stats
    if (Array.isArray(data.body_stats)) {
      for (const b of data.body_stats) {
        await db.runAsync(
          `INSERT INTO body_stats (date, weight_kg, body_fat, chest, waist, arm, thigh)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
             weight_kg = excluded.weight_kg,
             body_fat = excluded.body_fat,
             chest = excluded.chest,
             waist = excluded.waist,
             arm = excluded.arm,
             thigh = excluded.thigh`,
          [
            b.date,
            b.weight_kg || null,
            b.body_fat || null,
            b.chest || null,
            b.waist || null,
            b.arm || null,
            b.thigh || null,
          ]
        );
        bodyStatsCount++;
      }
    }

    // 7. Running Logs
    if (Array.isArray(data.running_logs)) {
      for (const r of data.running_logs) {
        await db.runAsync(
          `INSERT INTO running_logs (id, date, distance_km, duration_seconds, pace_seconds_per_km, splits_json, calories_burned, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             distance_km = excluded.distance_km,
             duration_seconds = excluded.duration_seconds,
             pace_seconds_per_km = excluded.pace_seconds_per_km,
             splits_json = excluded.splits_json,
             notes = excluded.notes`,
          [
            r.id,
            r.date,
            r.distance_km || 0,
            r.duration_seconds || 0,
            r.pace_seconds_per_km || 0,
            r.splits_json || null,
            r.calories_burned || 0,
            r.notes || null,
          ]
        );
        runningCount++;
      }
    }

    // 8. Custom Foods
    if (Array.isArray(data.custom_foods)) {
      for (const f of data.custom_foods) {
        await db.runAsync(
          `INSERT INTO custom_foods (id, name, serving_size_g, calories, protein, carbs, fat)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET
             calories = excluded.calories,
             protein = excluded.protein,
             carbs = excluded.carbs,
             fat = excluded.fat`,
          [
            f.id,
            f.name,
            f.serving_size_g || 100,
            f.calories || 0,
            f.protein || 0,
            f.carbs || 0,
            f.fat || 0,
          ]
        );
        foodsCount++;
      }
    }

    await db.execAsync('PRAGMA foreign_keys = ON;');

    return {
      success: true,
      format: 'json',
      message: `Restored ${sessionsCount} workouts, ${setsCount} sets, ${macrosCount} meals & ${runningCount} runs! 🎉`,
      counts: {
        sessions: sessionsCount,
        sets: setsCount,
        exercises: exercisesCount,
        macros: macrosCount,
        running: runningCount,
        bodyStats: bodyStatsCount,
        foods: foodsCount,
      },
    };
  } catch (err: any) {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    console.error('JSON Import Error:', err);
    return {
      success: false,
      message: `Failed to restore JSON backup: ${err.message}`,
    };
  }
}

/**
 * Parses user's custom diet CSV and imports directly into macro_logs.
 */
export async function importCustomDietCsv(
  db: SQLite.SQLiteDatabase,
  csvContent: string
): Promise<BackupResult> {
  try {
    const parseResult = Papa.parse<any[]>(csvContent, {
      skipEmptyLines: true,
    });

    const rows = parseResult.data;
    if (!rows || rows.length < 2) {
      throw new Error('CSV is empty or missing data.');
    }

    let count = 0;
    // Row 0 is headers, Row 1 is sub-headers, Row 2+ is data
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 5) continue;

      const rawDate = (r[0] || '').trim();
      if (!rawDate) continue;

      const normalizedDate = normalizeDateString(rawDate);
      const calories = parseFloat(r[1]) || 0;
      const protein = parseFloat(r[2]) || 0;
      const carbs = parseFloat(r[3]) || 0;
      const fat = parseFloat(r[4]) || 0;
      const actualFood = (r[r.length - 1] || '').trim();

      await db.runAsync(
        `INSERT INTO macro_logs (date, total_calories, total_protein, total_carbs, total_fat, actual_food)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           total_calories = excluded.total_calories,
           total_protein = excluded.total_protein,
           total_carbs = excluded.total_carbs,
           total_fat = excluded.total_fat,
           actual_food = excluded.actual_food`,
        [normalizedDate, calories, protein, carbs, fat, actualFood || null]
      );
      count++;
    }

    return {
      success: true,
      format: 'csv',
      message: `Imported ${count} daily meal logs from CSV! 🥗`,
      counts: { macros: count },
    };
  } catch (err: any) {
    console.error('CSV Import Error:', err);
    return {
      success: false,
      message: `Failed to import diet CSV: ${err.message}`,
    };
  }
}

/**
 * Universal Smart File Importer: Auto-detects whether the file is JSON or CSV and imports seamlessly.
 */
export async function smartImportFile(
  db: SQLite.SQLiteDatabase,
  content: string,
  fileName: string = ''
): Promise<BackupResult> {
  const trimmed = content.trim();

  // 1. If starts with '{' or '[', attempt JSON parse
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return await importFullJsonBackup(db, trimmed);
    } catch (e: any) {
      // Fallback
    }
  }

  // 2. If it's CSV
  if (trimmed.includes('Calories') || trimmed.includes('Meal') || trimmed.includes('Actual') || fileName.endsWith('.csv')) {
    return await importCustomDietCsv(db, trimmed);
  }

  return {
    success: false,
    message: 'Unrecognized file format. Please upload a valid .json or .csv backup file.',
  };
}
