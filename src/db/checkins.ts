import * as SQLite from 'expo-sqlite';

/**
 * "How did you show up?" ratings for a workout day: sleep and energy, 1–5.
 * Both are optional. Used by Progress → Sleep and energy.
 */

export interface CheckIn {
  date: string;
  sleep: number | null;
  energy: number | null;
}

export const CHECK_IN_WORDS = ['Awful', 'Poor', 'Okay', 'Good', 'Great'];

export function checkInWord(v: number): string {
  return CHECK_IN_WORDS[Math.max(1, Math.min(5, Math.round(v))) - 1];
}

export async function ensureCheckInTable(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session_checkins (
      date TEXT PRIMARY KEY,
      sleep INTEGER,
      energy INTEGER
    );
  `);
}

export async function getCheckIn(db: SQLite.SQLiteDatabase, date: string): Promise<CheckIn | null> {
  return db.getFirstAsync<CheckIn>('SELECT date, sleep, energy FROM session_checkins WHERE date = ?', [date]);
}

export async function getAllCheckIns(db: SQLite.SQLiteDatabase): Promise<CheckIn[]> {
  return db.getAllAsync<CheckIn>('SELECT date, sleep, energy FROM session_checkins ORDER BY date ASC');
}

export async function saveCheckIn(
  db: SQLite.SQLiteDatabase,
  date: string,
  values: { sleep?: number | null; energy?: number | null }
): Promise<CheckIn> {
  const current = (await getCheckIn(db, date)) ?? { date, sleep: null, energy: null };
  const next: CheckIn = {
    date,
    sleep: values.sleep === undefined ? current.sleep : values.sleep,
    energy: values.energy === undefined ? current.energy : values.energy,
  };
  if (next.sleep == null && next.energy == null) {
    await db.runAsync('DELETE FROM session_checkins WHERE date = ?', [date]);
  } else {
    await db.runAsync(
      `INSERT INTO session_checkins (date, sleep, energy) VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET sleep = excluded.sleep, energy = excluded.energy`,
      [date, next.sleep, next.energy]
    );
  }
  return next;
}
