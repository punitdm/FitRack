import * as SQLite from 'expo-sqlite';
import { addDays, format, startOfWeek, subDays, subWeeks } from 'date-fns';
import { getNutritionGoals } from './nutrition';
import { getProfile } from './profile';

/**
 * Streaks for the Home screen.
 *  - Workout: consecutive weeks (Mon–Sun) with at least one logged set.
 *  - Food: consecutive days with calories logged.
 *  - Water: consecutive days that hit the water goal.
 * Day streaks count up to today, or up to yesterday if today isn't logged yet,
 * so a streak doesn't look "broken" first thing in the morning.
 */

export interface WeekDayStatus {
  date: string;
  trained: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface HomeStreaks {
  workoutWeeks: number;
  foodDays: number;
  waterDays: number;
  workoutsThisWeek: number;
  weeklyGoal: number;
  /** Mon–Sun of the week containing `forDate`. */
  week: WeekDayStatus[];
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function dayStreak(days: Set<string>, today: Date): number {
  let cursor = days.has(iso(today)) ? today : subDays(today, 1);
  let n = 0;
  while (days.has(iso(cursor))) {
    n++;
    cursor = subDays(cursor, 1);
  }
  return n;
}

export async function getHomeStreaks(db: SQLite.SQLiteDatabase, forDate: string, today = new Date()): Promise<HomeStreaks> {
  const [trainedRows, foodRows, goals, profile] = await Promise.all([
    db.getAllAsync<{ date: string }>(
      `SELECT DISTINCT ws.date AS date FROM workout_sessions ws
         JOIN exercise_logs el ON el.session_id = ws.id`
    ),
    db.getAllAsync<{ date: string }>('SELECT date FROM macro_logs WHERE total_calories > 0'),
    getNutritionGoals(db),
    getProfile(db),
  ]);
  const waterRows = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM hydration_logs WHERE amount_ml >= ?',
    [goals.waterMl]
  );

  const trained = new Set(trainedRows.map((r) => r.date));

  // Weekly workout streak
  const weekOf = (d: string) => iso(startOfWeek(new Date(`${d}T12:00:00`), { weekStartsOn: 1 }));
  const trainedWeeks = new Set([...trained].map(weekOf));
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  let cursor = trainedWeeks.has(iso(thisWeekStart)) ? thisWeekStart : subWeeks(thisWeekStart, 1);
  let workoutWeeks = 0;
  while (trainedWeeks.has(iso(cursor))) {
    workoutWeeks++;
    cursor = subWeeks(cursor, 1);
  }

  const shownWeekStart = startOfWeek(new Date(`${forDate}T12:00:00`), { weekStartsOn: 1 });
  const todayIso = iso(today);
  const week: WeekDayStatus[] = Array.from({ length: 7 }, (_, i) => {
    const date = iso(addDays(shownWeekStart, i));
    return { date, trained: trained.has(date), isToday: date === todayIso, isFuture: date > todayIso };
  });

  const thisWeekDates = Array.from({ length: 7 }, (_, i) => iso(addDays(thisWeekStart, i)));

  return {
    workoutWeeks,
    foodDays: dayStreak(new Set(foodRows.map((r) => r.date)), today),
    waterDays: dayStreak(new Set(waterRows.map((r) => r.date)), today),
    workoutsThisWeek: thisWeekDates.filter((d) => trained.has(d)).length,
    weeklyGoal: profile.weeklyGoal,
    week,
  };
}
