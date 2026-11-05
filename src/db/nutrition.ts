import * as SQLite from 'expo-sqlite';

/**
 * Meal-based food log.
 *
 * Every food is stored as its own entry in a meal (breakfast/lunch/dinner/snacks).
 * The existing per-day `macro_logs` row is kept in sync as the day's total, so
 * the Hub, Analytics, CSV/JSON export and importers keep working unchanged.
 *
 * Days logged before this existed only have a `macro_logs` total. That total is
 * shown as an "Earlier log" entry and becomes a real entry the first time you
 * edit that day, so no calories are ever lost.
 */

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'other';

export const MEALS: { key: Exclude<MealKey, 'other'>; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'dinner', label: 'Dinner' },
];

export const MEAL_LABEL: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  other: 'Earlier log',
};

export interface FoodEntry {
  id: number;
  date: string;
  meal: MealKey;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type NewFoodEntry = Omit<FoodEntry, 'id'>;

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

/** Same numbers the app used before goals were editable. */
export const DEFAULT_GOALS: NutritionGoals = {
  calories: 2400,
  protein: 180,
  carbs: 250,
  fat: 75,
  waterMl: 3500,
};

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const GOALS_KEY = 'nutrition_goals';

export async function ensureNutritionTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal TEXT NOT NULL,
      name TEXT NOT NULL,
      calories REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(date);
  `);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function getNutritionGoals(db: SQLite.SQLiteDatabase): Promise<NutritionGoals> {
  try {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [GOALS_KEY]);
    if (!row?.value) return DEFAULT_GOALS;
    const parsed = JSON.parse(row.value);
    const pick = (k: keyof NutritionGoals) =>
      typeof parsed[k] === 'number' && parsed[k] > 0 ? parsed[k] : DEFAULT_GOALS[k];
    return {
      calories: pick('calories'),
      protein: pick('protein'),
      carbs: pick('carbs'),
      fat: pick('fat'),
      waterMl: pick('waterMl'),
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveNutritionGoals(db: SQLite.SQLiteDatabase, goals: NutritionGoals): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [GOALS_KEY, JSON.stringify(goals)]
  );
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

interface LegacyDay {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  actual_food: string | null;
}

function legacyName(actualFood: string | null): string {
  const lines = (actualFood || '')
    .split('\n')
    .map((l) => l.replace(/^[•\-\s]+/, '').trim())
    .filter(Boolean);
  if (lines.length === 0) return 'Logged total';
  const joined = lines.join(', ');
  return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined;
}

/**
 * Entries for a day. If the day only has a pre-existing total, it's returned as
 * a single virtual entry (id < 0) in the "Earlier log" meal.
 */
export async function getFoodEntries(db: SQLite.SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<FoodEntry>(
    'SELECT id, date, meal, name, calories, protein, carbs, fat FROM food_entries WHERE date = ? ORDER BY id ASC',
    [date]
  );
  if (rows.length > 0) return rows;

  const legacy = await db.getFirstAsync<LegacyDay>(
    'SELECT total_calories, total_protein, total_carbs, total_fat, actual_food FROM macro_logs WHERE date = ?',
    [date]
  );
  if (!legacy || (legacy.total_calories || 0) + (legacy.total_protein || 0) + (legacy.total_carbs || 0) + (legacy.total_fat || 0) <= 0) {
    return [];
  }
  return [
    {
      id: -1,
      date,
      meal: 'other',
      name: legacyName(legacy.actual_food),
      calories: legacy.total_calories || 0,
      protein: legacy.total_protein || 0,
      carbs: legacy.total_carbs || 0,
      fat: legacy.total_fat || 0,
    },
  ];
}

/** Turns a pre-existing day total into a real entry before the day is first edited. */
async function materializeLegacy(tx: SQLite.SQLiteDatabase, date: string): Promise<void> {
  const count = await tx.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM food_entries WHERE date = ?', [date]);
  if ((count?.c ?? 0) > 0) return;
  const virtual = await getFoodEntries(tx, date);
  const legacy = virtual.find((e) => e.id < 0);
  if (!legacy) return;
  await tx.runAsync(
    'INSERT INTO food_entries (date, meal, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [date, 'other', legacy.name, legacy.calories, legacy.protein, legacy.carbs, legacy.fat]
  );
}

/** Rewrites the day's macro_logs total from its entries (or removes it when empty). */
async function syncDayTotal(tx: SQLite.SQLiteDatabase, date: string): Promise<void> {
  const entries = await tx.getAllAsync<FoodEntry>(
    'SELECT id, date, meal, name, calories, protein, carbs, fat FROM food_entries WHERE date = ? ORDER BY id ASC',
    [date]
  );
  if (entries.length === 0) {
    await tx.runAsync('DELETE FROM macro_logs WHERE date = ?', [date]);
    return;
  }
  const t = totalsOf(entries);
  const actualFood = entries.map((e) => `• ${e.name}`).join('\n');
  await tx.runAsync(
    `INSERT INTO macro_logs (date, total_calories, total_protein, total_carbs, total_fat, actual_food)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       total_calories = excluded.total_calories,
       total_protein = excluded.total_protein,
       total_carbs = excluded.total_carbs,
       total_fat = excluded.total_fat,
       actual_food = excluded.actual_food`,
    [date, Math.round(t.calories), round1(t.protein), round1(t.carbs), round1(t.fat), actualFood]
  );
}

/**
 * Used by importers inside their own transaction: writes a day's meal entries
 * and re-syncs the day total. If the day already has an old-style total only,
 * it's replaced, so callers must decide beforehand that this is safe.
 */
export async function replaceDayWithEntries(
  tx: SQLite.SQLiteDatabase,
  date: string,
  entries: Omit<NewFoodEntry, 'date'>[]
): Promise<void> {
  for (const e of entries) {
    await tx.runAsync(
      'INSERT INTO food_entries (date, meal, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, e.meal, e.name.trim() || 'Food', Math.max(0, e.calories), Math.max(0, e.protein), Math.max(0, e.carbs), Math.max(0, e.fat)]
    );
  }
  await syncDayTotal(tx, date);
}

export async function addFoodEntry(db: SQLite.SQLiteDatabase, entry: NewFoodEntry): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await materializeLegacy(tx, entry.date);
    await tx.runAsync(
      'INSERT INTO food_entries (date, meal, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        entry.date,
        entry.meal,
        entry.name.trim() || 'Food',
        Math.max(0, entry.calories),
        Math.max(0, entry.protein),
        Math.max(0, entry.carbs),
        Math.max(0, entry.fat),
      ]
    );
    await syncDayTotal(tx, entry.date);
  });
}

export async function deleteFoodEntry(db: SQLite.SQLiteDatabase, entry: FoodEntry): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (entry.id < 0) {
      // Deleting the virtual "Earlier log" entry clears that day's old total.
      await tx.runAsync('DELETE FROM macro_logs WHERE date = ?', [entry.date]);
      return;
    }
    await tx.runAsync('DELETE FROM food_entries WHERE id = ?', [entry.id]);
    await syncDayTotal(tx, entry.date);
  });
}

/** Most-logged foods (latest macros for each), for the quick-add shelf. */
export async function getFrequentFoods(db: SQLite.SQLiteDatabase, limit = 12): Promise<NewFoodEntry[]> {
  return db.getAllAsync<NewFoodEntry>(
    `SELECT fe.name, fe.calories, fe.protein, fe.carbs, fe.fat, fe.meal, fe.date
       FROM food_entries fe
       JOIN (
         SELECT LOWER(name) AS k, COUNT(*) AS n, MAX(id) AS last_id
           FROM food_entries
          WHERE meal != 'other'
          GROUP BY LOWER(name)
       ) g ON g.last_id = fe.id
      ORDER BY g.n DESC, g.last_id DESC
      LIMIT ?`,
    [limit]
  );
}

/** Calories per day for a date range (inclusive), from the synced day totals. */
export async function getCaloriesByDay(
  db: SQLite.SQLiteDatabase,
  from: string,
  to: string
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ date: string; total_calories: number }>(
    'SELECT date, total_calories FROM macro_logs WHERE date BETWEEN ? AND ?',
    [from, to]
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.date] = r.total_calories || 0;
  return out;
}

/** Calories burned from logged runs that day (shown as "Burned" on the hero card). */
export async function getBurnedCalories(db: SQLite.SQLiteDatabase, date: string): Promise<number> {
  const row = await db.getFirstAsync<{ kcal: number | null }>(
    'SELECT SUM(calories_burned) AS kcal FROM running_logs WHERE date = ?',
    [date]
  );
  return Math.round(row?.kcal || 0);
}

export function totalsOf(entries: Pick<FoodEntry, 'calories' | 'protein' | 'carbs' | 'fat'>[]): DayTotals {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The meal that fits the current time, used as the default tab. */
export function mealForNow(d = new Date()): Exclude<MealKey, 'other'> {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 18) return 'snacks';
  return 'dinner';
}
