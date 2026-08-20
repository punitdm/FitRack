import Papa from 'papaparse';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  message: string;
}

/**
 * Generates and shares ExerciseLogs CSV.
 */
export async function exportExerciseLogs(db: SQLite.SQLiteDatabase): Promise<ExportResult> {
  try {
    const rows = await db.getAllAsync<{
      date: string;
      exercise: string;
      category: string;
      set_number: number;
      weight_kg: number;
      reps: number;
      distance_val: number;
      distance_unit: string;
      time_duration: string;
      difficulty: string;
      comment: string;
    }>(`
      SELECT 
        ws.date as Date,
        e.name as Exercise,
        e.category as Category,
        el.set_number as Set,
        el.weight_kg as Weight,
        el.reps as Reps,
        el.distance_val as Distance,
        el.distance_unit as "Distance Unit",
        el.time_duration as Time,
        el.difficulty as Difficulty,
        el.comment as Comment
      FROM exercise_logs el
      JOIN workout_sessions ws ON el.session_id = ws.id
      JOIN exercises e ON el.exercise_id = e.id
      ORDER BY ws.date DESC, el.session_id DESC, el.exercise_id ASC, el.set_number ASC
    `);

    const csvString = Papa.unparse(rows);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `FitRack_ExerciseLogs_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export FitRack Exercise Logs',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true, filePath: fileUri, message: `Exported ${rows.length} exercise logs.` };
    } else {
      return { success: true, filePath: fileUri, message: `Saved CSV to ${fileUri}` };
    }
  } catch (err: any) {
    return { success: false, message: `Export failed: ${err.message || err}` };
  }
}

/**
 * Generates and shares MealLogs CSV.
 */
export async function exportMealLogs(db: SQLite.SQLiteDatabase): Promise<ExportResult> {
  try {
    const rows = await db.getAllAsync<{
      Date: string;
      'Total Calories (kcal)': number;
      'Protein (g)': number;
      'Carbs (g)': number;
      'Fat (g)': number;
      'Actual Food': string;
    }>(`
      SELECT 
        date as Date,
        total_calories as "Total Calories (kcal)",
        total_protein as "Protein (g)",
        total_carbs as "Carbs (g)",
        total_fat as "Fat (g)",
        actual_food as "Actual Food"
      FROM macro_logs
      ORDER BY date DESC
    `);

    const csvString = Papa.unparse(rows);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `FitRack_MealLogs_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export FitRack Meal Logs',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true, filePath: fileUri, message: `Exported ${rows.length} meal logs.` };
    } else {
      return { success: true, filePath: fileUri, message: `Saved CSV to ${fileUri}` };
    }
  } catch (err: any) {
    return { success: false, message: `Export failed: ${err.message || err}` };
  }
}

/**
 * Generates and shares BodyStats CSV.
 */
export async function exportBodyStats(db: SQLite.SQLiteDatabase): Promise<ExportResult> {
  try {
    const rows = await db.getAllAsync<{
      date: string;
      weight: number;
      bodyFat: number;
      Chest: number;
      Waist: number;
      Hips: number;
      Thigh: number;
      Arm: number;
    }>(`
      SELECT 
        date as date,
        weight_kg as weight,
        body_fat as bodyFat,
        chest as Chest,
        waist as Waist,
        hips as Hips,
        thigh as Thigh,
        arm as Arm
      FROM body_stats
      ORDER BY date DESC
    `);

    const csvString = Papa.unparse(rows);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `FitRack_BodyStats_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export FitRack Body Stats',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true, filePath: fileUri, message: `Exported ${rows.length} body measurement logs.` };
    } else {
      return { success: true, filePath: fileUri, message: `Saved CSV to ${fileUri}` };
    }
  } catch (err: any) {
    return { success: false, message: `Export failed: ${err.message || err}` };
  }
}

/**
 * Generates and shares Full Exercise Library Catalog CSV.
 */
export async function exportExerciseCatalog(db: SQLite.SQLiteDatabase): Promise<ExportResult> {
  try {
    const rows = await db.getAllAsync<{
      id: number;
      name: string;
      category: string;
      tracking_type: string;
      is_custom: number;
    }>('SELECT * FROM exercises ORDER BY category ASC, name ASC');

    const csvString = Papa.unparse(rows);
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `FitRack_ExercisesCatalog_${timestamp}.csv`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export FitRack Exercise Catalog',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true, filePath: fileUri, message: `Exported ${rows.length} exercises catalog.` };
    } else {
      return { success: true, filePath: fileUri, message: `Saved CSV to ${fileUri}` };
    }
  } catch (err: any) {
    return { success: false, message: `Export failed: ${err.message || err}` };
  }
}
