import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { normalizeDateString } from './dateUtils';
import { buildBackupPayload, looksLikeFitRackBackup, restoreBackupPayload } from './backupCore';

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
 * Exports the entire FitRack database to one JSON file and opens the share sheet.
 */
export async function exportFullJsonBackup(db: SQLite.SQLiteDatabase): Promise<BackupResult> {
  try {
    const payload = await buildBackupPayload(db);
    const jsonString = JSON.stringify(payload);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const fileUri = `${FileSystem.cacheDirectory}FitRack_Full_Backup_${timestamp}.json`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export FitRack backup',
        UTI: 'public.json',
      });
    }

    const sessions = payload.workout_sessions.length;
    return {
      success: true,
      filePath: fileUri,
      format: 'json',
      message: `Backup ready: ${sessions} workouts, ${payload.exercise_logs.length} sets, ${payload.macro_logs.length} nutrition days`,
      counts: {
        sessions,
        sets: payload.exercise_logs.length,
        exercises: payload.exercises.length,
        macros: payload.macro_logs.length,
        running: payload.running_logs.length,
        bodyStats: payload.body_stats.length,
        foods: payload.custom_foods.length,
      },
    };
  } catch (err: any) {
    console.error('JSON Export Error:', err);
    return { success: false, message: `Couldn't export backup: ${err?.message || err}` };
  }
}

/**
 * Restores a FitRack JSON backup by merging it into this phone's data, in one
 * transaction: if anything fails, nothing changes.
 */
export async function importFullJsonBackup(db: SQLite.SQLiteDatabase, jsonContent: string): Promise<BackupResult> {
  let data: unknown;
  try {
    data = JSON.parse(jsonContent);
  } catch {
    return { success: false, message: 'This file is not valid JSON. Is it complete?' };
  }
  if (!looksLikeFitRackBackup(data)) {
    return { success: false, message: "This isn't a FitRack backup. For GymMane or FitNotes use Import from other apps." };
  }
  try {
    const c = await restoreBackupPayload(db, data);
    const parts = [
      `${c.sets} sets`,
      c.sessions ? `${c.sessions} new workout days` : '',
      c.nutritionDays ? `${c.nutritionDays} nutrition days` : '',
      c.bodyDays ? `${c.bodyDays} body-stat days` : '',
      c.runs ? `${c.runs} runs` : '',
    ].filter(Boolean);
    const skipped = c.setsSkipped ? ` (${c.setsSkipped} sets already here were skipped)` : '';
    return {
      success: true,
      format: 'json',
      message: `Restored ${parts.join(', ')}${skipped}`,
      counts: { sessions: c.sessions, sets: c.sets, exercises: c.exercises, macros: c.nutritionDays, running: c.runs, bodyStats: c.bodyDays, foods: c.customFoods },
    };
  } catch (err: any) {
    console.error('JSON Import Error:', err);
    return { success: false, message: `Restore failed and nothing was changed: ${err?.message || err}` };
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
      message: `Imported ${count} daily meal logs from CSV`,
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

  // 1. JSON: a FitRack backup
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return importFullJsonBackup(db, trimmed);
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
