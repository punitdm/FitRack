import * as SQLite from 'expo-sqlite';
import { ImportBundle, ImportCommitResult, ImportedFoodEntry } from './types';
import { replaceDayWithEntries } from '../db/nutrition';
import { secondsToClock } from './helpers';

/**
 * Writes a parsed bundle into FitRack inside one exclusive transaction, so a
 * failure part-way leaves the database untouched.
 *
 * Merge rules (safe to re-run the same file):
 *  - Workouts: if an exercise already has sets on that date, the imported sets
 *    for that exercise/date are skipped as duplicates. Otherwise they're appended.
 *  - Body stats: fills in empty fields only; values already in FitRack win.
 *  - Nutrition: new days are added (split into meals when the source has them);
 *    a day holding the exact total an earlier import wrote is upgraded to meals;
 *    anything else you logged is kept as-is.
 *  - Water: only days with no existing FitRack entry are added.
 */
export async function commitImport(db: SQLite.SQLiteDatabase, bundle: ImportBundle): Promise<ImportCommitResult> {
  const result: ImportCommitResult = {
    sessionsTouched: 0,
    setsAdded: 0,
    setsSkippedAsDuplicate: 0,
    exercisesCreated: 0,
    bodyStatsMerged: 0,
    macroDaysAdded: 0,
    macroDaysKept: 0,
    macroDaysSplitIntoMeals: 0,
    hydrationDaysAdded: 0,
  };

  await db.withExclusiveTransactionAsync(async (tx) => {
    const exerciseIds = new Map<string, number>();

    const exerciseId = async (name: string, category: string, trackingType: string): Promise<number> => {
      const key = name.toLowerCase();
      const cached = exerciseIds.get(key);
      if (cached !== undefined) return cached;
      const existing = await tx.getFirstAsync<{ id: number }>(
        'SELECT id FROM exercises WHERE LOWER(name) = LOWER(?)',
        [name]
      );
      let id: number;
      if (existing) {
        id = existing.id;
      } else {
        const res = await tx.runAsync(
          'INSERT INTO exercises (name, category, tracking_type, is_custom) VALUES (?, ?, ?, 1)',
          [name, category, trackingType]
        );
        id = res.lastInsertRowId;
        result.exercisesCreated++;
      }
      exerciseIds.set(key, id);
      return id;
    };

    // --- Workouts ---
    for (const session of bundle.sessions) {
      let sessionRow = await tx.getFirstAsync<{ id: number }>(
        'SELECT id FROM workout_sessions WHERE date = ? ORDER BY id ASC LIMIT 1',
        [session.date]
      );
      let touched = false;

      for (const ex of session.exercises) {
        const exId = await exerciseId(ex.name, ex.category, ex.trackingType);

        if (sessionRow) {
          const already = await tx.getFirstAsync<{ c: number }>(
            `SELECT COUNT(*) AS c FROM exercise_logs el
               JOIN workout_sessions ws ON ws.id = el.session_id
              WHERE ws.date = ? AND el.exercise_id = ?`,
            [session.date, exId]
          );
          if ((already?.c ?? 0) > 0) {
            result.setsSkippedAsDuplicate += ex.sets.length;
            continue;
          }
        } else {
          const res = await tx.runAsync('INSERT INTO workout_sessions (date, notes) VALUES (?, ?)', [session.date, '']);
          sessionRow = { id: res.lastInsertRowId };
        }

        let setNumber = 0;
        for (const set of ex.sets) {
          setNumber++;
          await tx.runAsync(
            `INSERT INTO exercise_logs
               (session_id, exercise_id, set_number, weight_kg, reps, distance_val, distance_unit, time_duration, difficulty, comment)
             VALUES (?, ?, ?, ?, ?, ?, 'km', ?, NULL, ?)`,
            [
              sessionRow.id,
              exId,
              setNumber,
              set.weightKg,
              set.reps,
              set.km ?? 0,
              secondsToClock(set.seconds ?? 0),
              set.comment ?? null,
            ]
          );
          result.setsAdded++;
        }
        touched = true;
      }
      if (touched) result.sessionsTouched++;
    }

    // --- Body stats (fill gaps, never overwrite) ---
    const BODY_FIELDS = ['weight_kg', 'body_fat', 'chest', 'waist', 'hips', 'thigh', 'arm', 'neck', 'shoulders', 'forearm', 'calf'] as const;
    for (const st of bundle.bodyStats) {
      const cols = BODY_FIELDS.filter((f) => typeof st[f] === 'number' && (st[f] as number) > 0);
      if (cols.length === 0) continue;
      await tx.runAsync(
        `INSERT INTO body_stats (date, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})
         ON CONFLICT(date) DO UPDATE SET ${cols.map((c) => `${c} = COALESCE(body_stats.${c}, excluded.${c})`).join(', ')}`,
        [st.date, ...cols.map((c) => st[c] as number)]
      );
      result.bodyStatsMerged++;
    }

    // --- Nutrition ---
    // Per day: never touch days you've already split into meals or logged yourself.
    // A day that only holds the same total an earlier import wrote is upgraded to meals.
    const foodsByDate = new Map<string, ImportedFoodEntry[]>();
    for (const f of bundle.foods) {
      const list = foodsByDate.get(f.date) ?? [];
      list.push(f);
      foodsByDate.set(f.date, list);
    }
    for (const m of bundle.macros) {
      const foods = foodsByDate.get(m.date) ?? [];
      const hasEntries =
        ((await tx.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM food_entries WHERE date = ?', [m.date]))?.c ?? 0) > 0;
      if (hasEntries) {
        result.macroDaysKept++;
        continue;
      }
      const existing = await tx.getFirstAsync<{ total_calories: number }>(
        'SELECT total_calories FROM macro_logs WHERE date = ?',
        [m.date]
      );
      if (!existing) {
        if (foods.length > 0) await replaceDayWithEntries(tx, m.date, foods);
        else
          await tx.runAsync(
            `INSERT INTO macro_logs (date, total_calories, total_protein, total_carbs, total_fat, actual_food)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [m.date, m.calories, m.protein, m.carbs, m.fat, m.foods || null]
          );
        result.macroDaysAdded++;
      } else if (foods.length > 0 && Math.abs((existing.total_calories || 0) - m.calories) <= 1) {
        await tx.runAsync('DELETE FROM macro_logs WHERE date = ?', [m.date]);
        await replaceDayWithEntries(tx, m.date, foods);
        result.macroDaysSplitIntoMeals++;
      } else {
        result.macroDaysKept++;
      }
    }

    // --- Water (only new days) ---
    for (const h of bundle.hydration) {
      const res = await tx.runAsync(
        `INSERT INTO hydration_logs (date, amount_ml) VALUES (?, ?)
         ON CONFLICT(date) DO NOTHING`,
        [h.date, h.ml]
      );
      if (res.changes > 0) result.hydrationDaysAdded++;
    }
  });

  return result;
}
