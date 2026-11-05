import * as SQLite from 'expo-sqlite';

/**
 * FitRack's own full backup (JSON).
 *
 * Export: every user table, as plain rows.
 * Restore: merges into the current database inside ONE transaction, so a
 * failure leaves the phone exactly as it was. Rules:
 *  - Exercises match by name; IDs from the backup are remapped, never forced.
 *  - Workouts: a set is skipped if that exercise already has sets on that day
 *    (so restoring the same file twice changes nothing).
 *  - Day records (nutrition totals, water, body stats, check-ins) fill gaps;
 *    days already in FitRack are kept. Body stats merge field by field.
 *  - Settings (theme, goals, profile) are restored.
 */

export const BACKUP_SCHEMA_VERSION = 2;

type Row = Record<string, any>;

export interface BackupPayload {
  app: 'FitRack';
  version: string;
  schema_version: number;
  exported_at: string;
  exercises: Row[];
  workout_sessions: Row[];
  exercise_logs: Row[];
  session_supersets: Row[];
  workout_templates: Row[];
  template_exercises: Row[];
  macro_logs: Row[];
  food_entries: Row[];
  hydration_logs: Row[];
  body_stats: Row[];
  running_logs: Row[];
  custom_foods: Row[];
  session_checkins: Row[];
  app_settings: Row[];
}

const TABLES = [
  'exercises',
  'workout_sessions',
  'exercise_logs',
  'session_supersets',
  'workout_templates',
  'template_exercises',
  'macro_logs',
  'food_entries',
  'hydration_logs',
  'body_stats',
  'running_logs',
  'custom_foods',
  'session_checkins',
  'app_settings',
] as const;

export async function buildBackupPayload(db: SQLite.SQLiteDatabase, appVersion = '1.2.0'): Promise<BackupPayload> {
  const out: Partial<BackupPayload> = {
    app: 'FitRack',
    version: appVersion,
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
  };
  for (const t of TABLES) {
    try {
      (out as Row)[t] = await db.getAllAsync<Row>(`SELECT * FROM ${t}`);
    } catch {
      (out as Row)[t] = []; // table not present on very old installs
    }
  }
  return out as BackupPayload;
}

export interface RestoreCounts {
  exercises: number;
  sessions: number;
  sets: number;
  setsSkipped: number;
  routines: number;
  nutritionDays: number;
  foods: number;
  waterDays: number;
  bodyDays: number;
  runs: number;
  customFoods: number;
  checkins: number;
  settings: number;
}

const arr = (v: unknown): Row[] => (Array.isArray(v) ? v.filter((r) => r && typeof r === 'object') : []);
const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const s = (v: unknown) => (typeof v === 'string' ? v : null);

/** Legacy v1 backups stored "time_seconds"; convert to HH:MM:SS. */
function durationOf(log: Row): string {
  if (typeof log.time_duration === 'string' && log.time_duration) return log.time_duration;
  const secs = n(log.time_seconds);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(Math.floor(secs % 60))}`;
}

export function looksLikeFitRackBackup(data: unknown): data is Row {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Row;
  return Array.isArray(d.workout_sessions) || Array.isArray(d.exercise_logs) || Array.isArray(d.macro_logs) || Array.isArray(d.body_stats);
}

export async function restoreBackupPayload(db: SQLite.SQLiteDatabase, data: Row): Promise<RestoreCounts> {
  const c: RestoreCounts = {
    exercises: 0,
    sessions: 0,
    sets: 0,
    setsSkipped: 0,
    routines: 0,
    nutritionDays: 0,
    foods: 0,
    waterDays: 0,
    bodyDays: 0,
    runs: 0,
    customFoods: 0,
    checkins: 0,
    settings: 0,
  };

  await db.withExclusiveTransactionAsync(async (tx) => {
    // ---------------------------------------------------------- exercises
    const exId = new Map<number, number>();
    for (const e of arr(data.exercises)) {
      const name = s(e.name)?.trim();
      if (!name) continue;
      const found = await tx.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE LOWER(name) = LOWER(?)', [name]);
      if (found) {
        exId.set(n(e.id), found.id);
      } else {
        const r = await tx.runAsync('INSERT INTO exercises (name, category, tracking_type, is_custom) VALUES (?, ?, ?, ?)', [
          name,
          s(e.category) || 'Custom',
          s(e.tracking_type) || 'weight_reps',
          n(e.is_custom, 1),
        ]);
        exId.set(n(e.id), r.lastInsertRowId);
        c.exercises++;
      }
    }

    // ---------------------------------------------------------- sessions + sets
    const sessionDate = new Map<number, string>();
    for (const ws of arr(data.workout_sessions)) if (s(ws.date)) sessionDate.set(n(ws.id), ws.date);
    const sessionNotes = new Map<number, string | null>();
    for (const ws of arr(data.workout_sessions)) sessionNotes.set(n(ws.id), s(ws.notes));

    const localSession = new Map<string, number>(); // date -> local session id
    const supersetId = new Map<string, string>(); // backup superset id -> new id
    const touchedSessions = new Set<number>();

    const sessionFor = async (date: string, backupId: number): Promise<number> => {
      const cached = localSession.get(date);
      if (cached) return cached;
      const existing = await tx.getFirstAsync<{ id: number }>('SELECT id FROM workout_sessions WHERE date = ? ORDER BY id ASC LIMIT 1', [date]);
      let id: number;
      if (existing) id = existing.id;
      else {
        const r = await tx.runAsync('INSERT INTO workout_sessions (date, notes) VALUES (?, ?)', [date, sessionNotes.get(backupId) ?? '']);
        id = r.lastInsertRowId;
        c.sessions++;
      }
      localSession.set(date, id);
      return id;
    };

    // Which (date, exercise) pairs already have sets locally — those are skipped.
    const existingPairs = new Set<string>();
    const pairs = await tx.getAllAsync<{ date: string; exercise_id: number }>(
      'SELECT DISTINCT ws.date, el.exercise_id FROM exercise_logs el JOIN workout_sessions ws ON ws.id = el.session_id'
    );
    for (const p of pairs) existingPairs.add(`${p.date}|${p.exercise_id}`);

    // Supersets first (logs reference them).
    for (const ss of arr(data.session_supersets)) {
      const date = sessionDate.get(n(ss.session_id));
      if (!date || !s(ss.id)) continue;
      const sid = await sessionFor(date, n(ss.session_id));
      const newId = `r${sid}_${ss.id}`;
      await tx.runAsync(
        `INSERT INTO session_supersets (id, session_id, name, color, jump_between_exercises, disable_timer)
         VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
        [newId, sid, s(ss.name) || 'Superset', s(ss.color) || '#EF4444', n(ss.jump_between_exercises, 1), n(ss.disable_timer, 0)]
      );
      supersetId.set(String(ss.id), newId);
    }

    const insertedPairs = new Set<string>();
    for (const el of arr(data.exercise_logs).sort((a, b) => n(a.session_id) - n(b.session_id) || n(a.set_number) - n(b.set_number))) {
      const date = sessionDate.get(n(el.session_id));
      const ex = exId.get(n(el.exercise_id));
      if (!date || !ex) continue;
      const key = `${date}|${ex}`;
      if (existingPairs.has(key) && !insertedPairs.has(key)) {
        c.setsSkipped++;
        continue;
      }
      insertedPairs.add(key);
      const sid = await sessionFor(date, n(el.session_id));
      touchedSessions.add(sid);
      await tx.runAsync(
        `INSERT INTO exercise_logs
           (session_id, exercise_id, set_number, weight_kg, reps, distance_val, distance_unit, time_duration, difficulty, comment, superset_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sid,
          ex,
          n(el.set_number, 1),
          n(el.weight_kg),
          n(el.reps),
          n(el.distance_val),
          s(el.distance_unit) || 'km',
          durationOf(el),
          s(el.difficulty),
          s(el.comment) ?? s(el.notes),
          el.superset_id != null ? supersetId.get(String(el.superset_id)) ?? null : null,
        ]
      );
      c.sets++;
    }

    // ---------------------------------------------------------- routines
    const tplId = new Map<number, number>();
    for (const t of arr(data.workout_templates)) {
      const name = s(t.name)?.trim();
      if (!name) continue;
      const found = await tx.getFirstAsync<{ id: number }>('SELECT id FROM workout_templates WHERE LOWER(name) = LOWER(?)', [name]);
      if (found) continue; // keep your existing routine with that name
      const r = await tx.runAsync('INSERT INTO workout_templates (name, category, notes) VALUES (?, ?, ?)', [name, s(t.category) || 'General', s(t.notes)]);
      tplId.set(n(t.id), r.lastInsertRowId);
      c.routines++;
    }
    for (const te of arr(data.template_exercises)) {
      const tid = tplId.get(n(te.template_id));
      const ex = exId.get(n(te.exercise_id));
      if (!tid || !ex) continue;
      await tx.runAsync(
        `INSERT INTO template_exercises (template_id, exercise_id, order_index, target_sets, target_reps, target_weight)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tid, ex, n(te.order_index), n(te.target_sets, 3), n(te.target_reps, 10), n(te.target_weight)]
      );
    }

    // ---------------------------------------------------------- nutrition
    const foodDays = new Map<string, Row[]>();
    for (const f of arr(data.food_entries)) if (s(f.date)) foodDays.set(f.date, [...(foodDays.get(f.date) ?? []), f]);
    const restoredFoodDays = new Set<string>();
    for (const [date, list] of foodDays) {
      const have = await tx.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM food_entries WHERE date = ?', [date]);
      const total = await tx.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM macro_logs WHERE date = ?', [date]);
      if ((have?.c ?? 0) > 0 || (total?.c ?? 0) > 0) continue; // you already logged this day
      for (const f of list) {
        await tx.runAsync('INSERT INTO food_entries (date, meal, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          date,
          s(f.meal) || 'snacks',
          s(f.name) || 'Food',
          n(f.calories),
          n(f.protein),
          n(f.carbs),
          n(f.fat),
        ]);
        c.foods++;
      }
      restoredFoodDays.add(date);
    }
    for (const m of arr(data.macro_logs)) {
      if (!s(m.date)) continue;
      const r = await tx.runAsync(
        `INSERT INTO macro_logs (date, total_calories, total_protein, total_carbs, total_fat, actual_food)
         VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(date) DO NOTHING`,
        [m.date, n(m.total_calories), n(m.total_protein), n(m.total_carbs), n(m.total_fat), s(m.actual_food)]
      );
      if (r.changes > 0) c.nutritionDays++;
    }
    for (const h of arr(data.hydration_logs)) {
      if (!s(h.date)) continue;
      const r = await tx.runAsync(
        'INSERT INTO hydration_logs (date, amount_ml, target_ml) VALUES (?, ?, ?) ON CONFLICT(date) DO NOTHING',
        [h.date, n(h.amount_ml), n(h.target_ml, 2500)]
      );
      if (r.changes > 0) c.waterDays++;
    }
    for (const f of arr(data.custom_foods)) {
      const name = s(f.name)?.trim();
      if (!name) continue;
      const r = await tx.runAsync(
        `INSERT INTO custom_foods (name, serving_size_g, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(name) DO NOTHING`,
        [name, n(f.serving_size_g, 100), n(f.calories), n(f.protein), n(f.carbs), n(f.fat)]
      );
      if (r.changes > 0) c.customFoods++;
    }

    // ---------------------------------------------------------- body (field-by-field gap fill)
    const bodyCols = (await tx.getAllAsync<{ name: string }>('PRAGMA table_info(body_stats)'))
      .map((x) => x.name)
      .filter((x) => x !== 'id' && x !== 'date');
    for (const b of arr(data.body_stats)) {
      if (!s(b.date)) continue;
      const cols = bodyCols.filter((col) => typeof b[col] === 'number' && b[col] > 0);
      if (cols.length === 0) continue;
      const existed = await tx.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM body_stats WHERE date = ?', [b.date]);
      await tx.runAsync(
        `INSERT INTO body_stats (date, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})
         ON CONFLICT(date) DO UPDATE SET ${cols.map((col) => `${col} = COALESCE(body_stats.${col}, excluded.${col})`).join(', ')}`,
        [b.date, ...cols.map((col) => b[col])]
      );
      if ((existed?.c ?? 0) === 0) c.bodyDays++;
    }

    // ---------------------------------------------------------- runs (skip identical)
    for (const r of arr(data.running_logs)) {
      if (!s(r.date)) continue;
      const dup = await tx.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) AS c FROM running_logs WHERE date = ? AND ABS(distance_km - ?) < 0.001 AND duration_seconds = ?',
        [r.date, n(r.distance_km), n(r.duration_seconds)]
      );
      if ((dup?.c ?? 0) > 0) continue;
      await tx.runAsync(
        `INSERT INTO running_logs (date, distance_km, duration_seconds, pace_seconds_per_km, splits_json, calories_burned, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.date, n(r.distance_km), n(r.duration_seconds), n(r.pace_seconds_per_km), s(r.splits_json), n(r.calories_burned), s(r.notes)]
      );
      c.runs++;
    }

    // ---------------------------------------------------------- check-ins + settings
    for (const ci of arr(data.session_checkins)) {
      if (!s(ci.date)) continue;
      const r = await tx.runAsync('INSERT INTO session_checkins (date, sleep, energy) VALUES (?, ?, ?) ON CONFLICT(date) DO NOTHING', [
        ci.date,
        ci.sleep ?? null,
        ci.energy ?? null,
      ]);
      if (r.changes > 0) c.checkins++;
    }
    for (const st of arr(data.app_settings)) {
      if (!s(st.key) || st.value == null) continue;
      await tx.runAsync(
        'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [st.key, String(st.value)]
      );
      c.settings++;
    }
  });

  return c;
}
