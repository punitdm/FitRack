import Papa from 'papaparse';
import * as SQLite from 'expo-sqlite';
import { normalizeDateString } from './dateUtils';
import { getOrCreateSession, getOrCreateExercise, saveMacroLog, saveBodyStats } from '../db/database';
import { TrackingType } from '../types/database';

export interface ImportResult {
  success: boolean;
  type: 'exercises' | 'macros' | 'stats' | 'unknown';
  totalRows: number;
  importedCount: number;
  errorCount: number;
  message: string;
  errors: string[];
}

/**
 * Normalizes an object's keys to lowercase alphanumeric for robust header matching.
 */
function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    clean[cleanKey] = value;
  }
  return clean;
}

/**
 * Detects CSV dataset type based on column header matching.
 */
export function detectCsvType(headers: string[]): 'exercises' | 'macros' | 'stats' | 'unknown' {
  const normalized = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  if (normalized.some(h => h.includes('exercise') || h.includes('reps') || h.includes('set'))) {
    return 'exercises';
  }
  if (normalized.some(h => h.includes('calorie') || h.includes('protein') || h.includes('food') || h.includes('macro'))) {
    return 'macros';
  }
  if (normalized.some(h => h.includes('weight') && (h.includes('bodyfat') || h.includes('chest') || h.includes('waist')))) {
    return 'stats';
  }
  return 'unknown';
}

/**
 * Imports ExerciseLogs.csv into SQLite.
 * Supported headers: Date, Exercise, Category, Weight, Set, Reps, Distance, Distance Unit, Time, Difficulty, Comment
 */
export async function importExerciseLogsCsv(db: SQLite.SQLiteDatabase, csvContent: string): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, any>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let importedCount = 0;
        const errors: string[] = [];

        try {
          // Map to track session ids for dates within this transaction
          const sessionCache = new Map<string, number>();
          const exerciseCache = new Map<string, any>();

          for (let i = 0; i < results.data.length; i++) {
            const raw = results.data[i];
            const row = normalizeRowKeys(raw);

            const rawDate = row['date'] || raw['Date'];
            const exerciseName = (row['exercise'] || raw['exercisename'] || raw['name'] || '').trim();

            if (!exerciseName) {
              continue; // skip blank rows
            }

            const isoDate = normalizeDateString(rawDate);
            const category = (row['category'] || 'General').trim();
            const setNumber = parseInt(row['set'] || row['setnumber'] || row['setno'] || '1', 10) || 1;
            const weightKg = parseFloat(row['weight'] || row['weightkg'] || '0') || 0;
            const reps = parseInt(row['reps'] || '0', 10) || 0;
            const distanceVal = parseFloat(row['distance'] || row['distanceval'] || '0') || 0;
            const distanceUnit = (row['distanceunit'] || row['unit'] || 'km').trim();
            const timeDuration = (row['time'] || row['timeduration'] || row['duration'] || '00:00:00').trim();
            const difficulty = (row['difficulty'] || row['rpe'] || null);
            const comment = (row['comment'] || row['notes'] || null);

            let trackingType: TrackingType = 'weight_reps';
            if (distanceVal > 0 || (timeDuration !== '00:00:00' && (category.toLowerCase() === 'cardio' || exerciseName.toLowerCase().includes('run')))) {
              trackingType = 'distance_time';
            } else if (category.toLowerCase() === 'abs' && exerciseName.toLowerCase().includes('plank')) {
              trackingType = 'time_only';
            }

            // Get or create session
            let sessionId = sessionCache.get(isoDate);
            if (!sessionId) {
              const session = await getOrCreateSession(db, isoDate);
              sessionId = session.id;
              sessionCache.set(isoDate, sessionId);
            }

            // Get or create exercise
            const exKey = exerciseName.toLowerCase();
            let exercise = exerciseCache.get(exKey);
            if (!exercise) {
              exercise = await getOrCreateExercise(db, exerciseName, category, trackingType);
              exerciseCache.set(exKey, exercise);
            }

            // Insert log
            await db.runAsync(`
              INSERT INTO exercise_logs (
                session_id, exercise_id, set_number, weight_kg, reps,
                distance_val, distance_unit, time_duration, difficulty, comment
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              sessionId,
              exercise.id,
              setNumber,
              weightKg,
              reps,
              distanceVal,
              distanceUnit,
              timeDuration,
              difficulty,
              comment,
            ]);

            importedCount++;
          }

          resolve({
            success: true,
            type: 'exercises',
            totalRows: results.data.length,
            importedCount,
            errorCount: errors.length,
            message: `Successfully imported ${importedCount} exercise sets across ${sessionCache.size} workout sessions.`,
            errors,
          });
        } catch (err: any) {
          resolve({
            success: false,
            type: 'exercises',
            totalRows: results.data.length,
            importedCount,
            errorCount: errors.length + 1,
            message: `Error importing exercises: ${err.message || err}`,
            errors: [err.message || String(err)],
          });
        }
      },
      error: (error: Error) => {
        resolve({
          success: false,
          type: 'exercises',
          totalRows: 0,
          importedCount: 0,
          errorCount: 1,
          message: `CSV parsing failed: ${error.message}`,
          errors: [error.message],
        });
      },
    });
  });
}

/**
 * Imports MealLogs.csv into SQLite.
 * Supported headers: Date, Total Calories (kcal), Protein (g), Carbs (g), Fat (g), Actual Food
 */
export async function importMealLogsCsv(db: SQLite.SQLiteDatabase, csvContent: string): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, any>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let importedCount = 0;
        const errors: string[] = [];

        try {
          for (let i = 0; i < results.data.length; i++) {
            const raw = results.data[i];
            const row = normalizeRowKeys(raw);

            const rawDate = row['date'] || raw['Date'];
            if (!rawDate) continue;

            const isoDate = normalizeDateString(rawDate);
            const calories = Math.round(parseFloat(row['totalcalorieskcal'] || row['totalcalories'] || row['calories'] || row['cal'] || '0') || 0);
            const protein = Math.round((parseFloat(row['proteing'] || row['protein'] || '0') || 0) * 10) / 10;
            const carbs = Math.round((parseFloat(row['carbsg'] || row['carbs'] || row['carbohydrates'] || '0') || 0) * 10) / 10;
            const fat = Math.round((parseFloat(row['fatg'] || row['fat'] || row['fats'] || '0') || 0) * 10) / 10;
            const actualFood = (row['actualfood'] || row['food'] || row['meals'] || row['notes'] || '').trim();

            await saveMacroLog(db, {
              date: isoDate,
              total_calories: calories,
              total_protein: protein,
              total_carbs: carbs,
              total_fat: fat,
              actual_food: actualFood,
            });

            importedCount++;
          }

          resolve({
            success: true,
            type: 'macros',
            totalRows: results.data.length,
            importedCount,
            errorCount: errors.length,
            message: `Successfully imported ${importedCount} daily meal & macro records.`,
            errors,
          });
        } catch (err: any) {
          resolve({
            success: false,
            type: 'macros',
            totalRows: results.data.length,
            importedCount,
            errorCount: 1,
            message: `Error importing meal logs: ${err.message || err}`,
            errors: [err.message || String(err)],
          });
        }
      },
      error: (error: Error) => {
        resolve({
          success: false,
          type: 'macros',
          totalRows: 0,
          importedCount: 0,
          errorCount: 1,
          message: `CSV parsing failed: ${error.message}`,
          errors: [error.message],
        });
      },
    });
  });
}

/**
 * Imports BodyStats.csv into SQLite.
 * Supported headers: date, weight, bodyFat, Chest, Waist, Hips, Thigh, Arm
 */
export async function importBodyStatsCsv(db: SQLite.SQLiteDatabase, csvContent: string): Promise<ImportResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, any>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let importedCount = 0;
        const errors: string[] = [];

        try {
          for (let i = 0; i < results.data.length; i++) {
            const raw = results.data[i];
            const row = normalizeRowKeys(raw);

            const rawDate = row['date'] || raw['Date'];
            if (!rawDate) continue;

            const isoDate = normalizeDateString(rawDate);
            const weight = parseFloat(row['weight'] || row['weightkg'] || '0') || null;
            const bodyFat = parseFloat(row['bodyfat'] || row['bodyfatpercent'] || row['bf'] || '0') || null;
            const chest = parseFloat(row['chest'] || '0') || null;
            const waist = parseFloat(row['waist'] || '0') || null;
            const hips = parseFloat(row['hips'] || '0') || null;
            const thigh = parseFloat(row['thigh'] || '0') || null;
            const arm = parseFloat(row['arm'] || row['arms'] || '0') || null;

            await saveBodyStats(db, {
              date: isoDate,
              weight_kg: weight,
              body_fat: bodyFat,
              chest,
              waist,
              hips,
              thigh,
              arm,
            });

            importedCount++;
          }

          resolve({
            success: true,
            type: 'stats',
            totalRows: results.data.length,
            importedCount,
            errorCount: errors.length,
            message: `Successfully imported ${importedCount} body measurement logs.`,
            errors,
          });
        } catch (err: any) {
          resolve({
            success: false,
            type: 'stats',
            totalRows: results.data.length,
            importedCount,
            errorCount: 1,
            message: `Error importing body stats: ${err.message || err}`,
            errors: [err.message || String(err)],
          });
        }
      },
      error: (error: Error) => {
        resolve({
          success: false,
          type: 'stats',
          totalRows: 0,
          importedCount: 0,
          errorCount: 1,
          message: `CSV parsing failed: ${error.message}`,
          errors: [error.message],
        });
      },
    });
  });
}
