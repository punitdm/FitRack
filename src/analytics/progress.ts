import * as SQLite from 'expo-sqlite';
import { addDays, differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import {
  MUSCLES,
  MUSCLE_LABEL,
  MuscleId,
  MuscleWork,
  PULL_MUSCLES,
  PUSH_MUSCLES,
  RECOVERY_HOURS,
  STRENGTH_LEVELS,
  STRENGTH_STEPS,
  WEEKLY_SET_TARGET,
  liftKindFor,
  musclesFor,
} from './muscles';
import { CheckIn, getAllCheckIns } from '../db/checkins';
import { getProfile } from '../db/profile';

/**
 * Progress statistics, computed from logged sets. The rules follow GymMane's
 * Progress screen (volume trend, consistency heatmap, muscle map, radar,
 * weekly insights, strength standards, sleep/energy readiness).
 */

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface PSet {
  w: number;
  r: number;
}

export interface PExercise {
  id: number;
  name: string;
  category: string;
  sets: PSet[];
  work: MuscleWork | null;
  /** Best estimated 1RM in this session (Epley). */
  e1rm: number;
  topWeight: number;
  volume: number;
}

export interface PSession {
  date: string;
  exercises: PExercise[];
  setCount: number;
  volume: number;
}

export interface ProgressData {
  sessions: PSession[]; // oldest first
  byDate: Map<string, PSession>;
  weights: { date: string; kg: number }[]; // oldest first
  checkins: Map<string, CheckIn>;
  weeklyGoal: number;
  sex: string;
  now: Date;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const noon = (s: string) => new Date(`${s}T12:00:00`);
const daysAgo = (now: Date, s: string) => differenceInCalendarDays(now, noon(s));

export function oneRm(w: number, r: number): number {
  if (w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
}

export async function loadProgressData(db: SQLite.SQLiteDatabase, now = new Date()): Promise<ProgressData> {
  const [rows, weights, checkins, profile] = await Promise.all([
    db.getAllAsync<{ date: string; exercise_id: number; name: string; category: string; weight_kg: number | null; reps: number | null }>(
      `SELECT ws.date AS date, el.exercise_id, e.name, e.category, el.weight_kg, el.reps
         FROM exercise_logs el
         JOIN workout_sessions ws ON ws.id = el.session_id
         JOIN exercises e ON e.id = el.exercise_id
        ORDER BY ws.date ASC, el.id ASC`
    ),
    db.getAllAsync<{ date: string; weight_kg: number }>(
      'SELECT date, weight_kg FROM body_stats WHERE weight_kg IS NOT NULL AND weight_kg > 0 ORDER BY date ASC'
    ),
    getAllCheckIns(db),
    getProfile(db),
  ]);
  return buildProgressData(rows, weights, checkins, profile.weeklyGoal, profile.sex, now);
}

export function buildProgressData(
  rows: { date: string; exercise_id: number; name: string; category: string; weight_kg: number | null; reps: number | null }[],
  weights: { date: string; weight_kg: number }[],
  checkins: CheckIn[],
  weeklyGoal: number,
  sex: string,
  now: Date
): ProgressData {
  const byDate = new Map<string, PSession>();
  const exIndex = new Map<string, PExercise>();
  for (const r of rows) {
    let s = byDate.get(r.date);
    if (!s) {
      s = { date: r.date, exercises: [], setCount: 0, volume: 0 };
      byDate.set(r.date, s);
    }
    const key = `${r.date}|${r.exercise_id}`;
    let ex = exIndex.get(key);
    if (!ex) {
      ex = { id: r.exercise_id, name: r.name, category: r.category, sets: [], work: musclesFor(r.name, r.category), e1rm: 0, topWeight: 0, volume: 0 };
      exIndex.set(key, ex);
      s.exercises.push(ex);
    }
    const w = r.weight_kg || 0;
    const reps = r.reps || 0;
    ex.sets.push({ w, r: reps });
    ex.e1rm = Math.max(ex.e1rm, oneRm(w, reps));
    ex.topWeight = Math.max(ex.topWeight, w);
    ex.volume += w * reps;
    s.setCount++;
    s.volume += w * reps;
  }
  return {
    sessions: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    byDate,
    weights: weights.map((w) => ({ date: w.date, kg: w.weight_kg })),
    checkins: new Map(checkins.map((c) => [c.date, c])),
    weeklyGoal: weeklyGoal > 0 ? weeklyGoal : 4,
    sex,
    now,
  };
}

const weekStartOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

// ---------------------------------------------------------------------------
// Hero tiles
// ---------------------------------------------------------------------------

function volumeBetween(data: ProgressData, fromAgo: number, toAgo: number): number {
  let v = 0;
  for (const s of data.sessions) {
    const a = daysAgo(data.now, s.date);
    if (a >= toAgo && a <= fromAgo) v += s.volume;
  }
  return v;
}

export function heroVolume(data: ProgressData) {
  const current = volumeBetween(data, 29, 0);
  const previous = volumeBetween(data, 59, 30);
  const changePct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  const daily = Array.from({ length: 30 }, (_, i) => data.byDate.get(iso(addDays(data.now, i - 29)))?.volume ?? 0);
  const cumulative: number[] = [];
  daily.reduce((run, v) => {
    cumulative.push(run + v);
    return run + v;
  }, 0);
  const points = Array.from({ length: 12 }, (_, i) => cumulative[Math.round(((cumulative.length - 1) * i) / 11)]);
  return { volumeKg: Math.round(current), changePct, points };
}

export function heroBodyweight(data: ProgressData) {
  const latest = data.weights[data.weights.length - 1] ?? null;
  return { latestKg: latest?.kg ?? null, latestDate: latest?.date ?? null, series: data.weights.slice(-30).map((w) => w.kg) };
}

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

export const HEAT_LEVELS = 4;
export const HEATMAP_WEEKS = 12;

/** Weeks × 7 cells (Mon-first columns), oldest first. -1 = future, 0 = rest, 1..4 = intensity. */
export function heatmap(data: ProgressData, weeks: number) {
  const start = addDays(weekStartOf(data.now), -(weeks - 1) * 7);
  const today = iso(data.now);
  const dates = Array.from({ length: weeks * 7 }, (_, i) => iso(addDays(start, i)));
  const lifted = dates
    .filter((d) => d <= today)
    .map((d) => data.byDate.get(d)?.volume ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const levels = dates.map((d) => {
    if (d > today) return -1;
    const s = data.byDate.get(d);
    if (!s) return 0;
    if (s.volume <= 0) return 1;
    if (lifted.length < 2) return HEAT_LEVELS;
    return 1 + Math.round((lifted.indexOf(s.volume) / (lifted.length - 1)) * (HEAT_LEVELS - 1));
  });
  return { dates, levels, weeks };
}

/** Full history: at least a year, more if you've logged longer. */
export function yearWeeks(data: ProgressData): number {
  const first = data.sessions[0]?.date;
  const back = first ? differenceInCalendarDays(weekStartOf(data.now), noon(first)) : 0;
  return Math.max(53, Math.ceil(back / 7) + 1);
}

/** Allowed rest days in a row before a streak breaks (FitRack has no weekly plan). */
export const STREAK_REST_DAYS = 2;

export function dayStreak(data: ProgressData): number {
  if (data.sessions.length === 0) return 0;
  const first = data.sessions[0].date;
  let cursor = data.now;
  if (!data.byDate.has(iso(cursor))) cursor = addDays(cursor, -1);
  let n = 0;
  let gap = 0;
  while (iso(cursor) >= first) {
    if (data.byDate.has(iso(cursor))) {
      n++;
      gap = 0;
    } else if (++gap > STREAK_REST_DAYS) {
      break;
    }
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function daysDoneThisWeek(data: ProgressData): number {
  const start = weekStartOf(data.now);
  return Array.from({ length: 7 }, (_, i) => iso(addDays(start, i))).filter((d) => data.byDate.has(d)).length;
}

// ---------------------------------------------------------------------------
// Muscles
// ---------------------------------------------------------------------------

export function muscleSetsBetween(data: ProgressData, fromAgo: number, toAgo = 0): Record<MuscleId, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<MuscleId, number>;
  for (const s of data.sessions) {
    const a = daysAgo(data.now, s.date);
    if (a < toAgo || a > fromAgo) continue;
    for (const e of s.exercises) {
      if (!e.work || e.sets.length === 0) continue;
      out[e.work.primary] += e.sets.length;
      for (const m of e.work.secondary) out[m] += e.sets.length / 2;
    }
  }
  return out;
}

export const targetFor = (days: number) => (WEEKLY_SET_TARGET * days) / 7;

export function muscleWeek(data: ProgressData) {
  const dayIndex = (data.now.getDay() + 6) % 7; // Mon = 0
  const sets = muscleSetsBetween(data, dayIndex, 0);
  const target = targetFor(7);
  const heat = Object.fromEntries(MUSCLES.map((m) => [m.id, Math.min(1, sets[m.id] / target)])) as Record<MuscleId, number>;
  const anyWork = Object.values(sets).some((v) => v > 0);
  const threshold = targetFor(dayIndex + 1) / 3;
  const behind = anyWork
    ? MUSCLES.map((m) => m.id)
        .filter((id) => sets[id] < threshold)
        .sort((a, b) => sets[a] - sets[b])
        .slice(0, 3)
    : [];
  return { sets, heat, target, behind };
}

/** Rolling window view for the muscle map (7D / 30D): sets vs target, and who's falling behind. */
export function muscleRange(data: ProgressData, days: number) {
  const sets = muscleSetsBetween(data, days - 1, 0);
  const target = targetFor(days);
  const heat = Object.fromEntries(MUSCLES.map((m) => [m.id, Math.min(1, sets[m.id] / target)])) as Record<MuscleId, number>;
  const anyWork = Object.values(sets).some((v) => v > 0);
  const behind = anyWork
    ? MUSCLES.map((m) => m.id)
        .filter((id) => sets[id] < target / 3)
        .sort((a, b) => sets[a] - sets[b])
        .slice(0, 3)
    : [];
  return { sets, heat, target, behind };
}

const FULL_FATIGUE = 8;
const tau = (m: MuscleId) => RECOVERY_HOURS[m] / 3;

/** When a day's workout counts as having happened: 6 pm, or now if that's still ahead. */
function sessionTime(date: string, now: Date): Date {
  const t = new Date(`${date}T18:00:00`);
  return t > now ? now : t;
}

export function muscleFatigue(data: ProgressData): Record<MuscleId, number> {
  const out = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<MuscleId, number>;
  for (const s of data.sessions) {
    const hours = (data.now.getTime() - sessionTime(s.date, data.now).getTime()) / 3_600_000;
    if (hours < 0 || hours > 24 * 8) continue;
    for (const e of s.exercises) {
      if (!e.work) continue;
      const effort = e.sets.length; // no RPE in FitRack: each set counts 1
      if (effort <= 0) continue;
      out[e.work.primary] += effort * Math.exp(-hours / tau(e.work.primary));
      for (const m of e.work.secondary) out[m] += effort * 0.5 * Math.exp(-hours / tau(m));
    }
  }
  return out;
}

export function muscleRecovery(data: ProgressData) {
  const fatigue = muscleFatigue(data);
  const recovery = Object.fromEntries(
    MUSCLES.map((m) => [m.id, Math.max(0, Math.min(1, 1 - fatigue[m.id] / FULL_FATIGUE))])
  ) as Record<MuscleId, number>;
  const overall = Math.round((Object.values(recovery).reduce((a, b) => a + b, 0) / MUSCLES.length) * 100);
  const readyInHours = (m: MuscleId): number | null => {
    const limit = FULL_FATIGUE * (1 - 0.8);
    if (fatigue[m] <= limit) return null;
    return Math.ceil(tau(m) * Math.log(fatigue[m] / limit));
  };
  const stillRecovering = MUSCLES.map((m) => m.id)
    .filter((id) => recovery[id] < 0.8)
    .sort((a, b) => recovery[a] - recovery[b]);
  return { recovery, overall, readyInHours, stillRecovering };
}

export function daysSinceTrained(data: ProgressData): Record<MuscleId, number | null> {
  const last: Partial<Record<MuscleId, string>> = {};
  for (const s of data.sessions) {
    for (const e of s.exercises) {
      if (!e.work || e.sets.length === 0) continue;
      const seen = last[e.work.primary];
      if (!seen || s.date > seen) last[e.work.primary] = s.date;
    }
  }
  return Object.fromEntries(
    MUSCLES.map((m) => [m.id, last[m.id] ? Math.max(0, daysAgo(data.now, last[m.id]!)) : null])
  ) as Record<MuscleId, number | null>;
}

export function untrainedLongest(data: ProgressData, atLeast = 7): MuscleId[] {
  const days = daysSinceTrained(data);
  const age = (id: MuscleId) => days[id] ?? 1 << 20;
  return MUSCLES.map((m) => m.id)
    .filter((id) => age(id) >= atLeast)
    .sort((a, b) => age(b) - age(a))
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Radar (last 30 days)
// ---------------------------------------------------------------------------

export const RADAR_AXES: MuscleId[] = [
  'chest',
  'shoulders',
  'trapezius',
  'back',
  'triceps',
  'biceps',
  'forearm',
  'abdomen',
  'quads',
  'calves',
  'hamstrings',
  'glutes',
];

export function radar(data: ProgressData) {
  const raw = muscleSetsBetween(data, 29, 0);
  const sets = Object.fromEntries(
    RADAR_AXES.map((id) => [id, raw[id] + (id === 'back' ? raw.lowerback : 0)])
  ) as Record<MuscleId, number>;
  const top = Math.max(0, ...RADAR_AXES.map((id) => sets[id]));
  const behind =
    top > 0
      ? [...RADAR_AXES].sort((a, b) => sets[a] - sets[b]).filter((id) => sets[id] < top * 0.5).slice(0, 3)
      : [];
  return { sets, top, behind };
}

// ---------------------------------------------------------------------------
// This week + insights
// ---------------------------------------------------------------------------

export type InsightKind = 'load' | 'muscle' | 'balance' | 'up';

export function thisWeek(data: ProgressData) {
  const start = weekStartOf(data.now);
  const today = iso(data.now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = iso(addDays(start, i));
    return { date: d, sets: data.byDate.get(d)?.setCount ?? 0, future: d > today, isToday: d === today };
  });
  return { days, totalSets: days.reduce((a, d) => a + d.sets, 0), insights: weekInsights(data) };
}

export function weekInsights(data: ProgressData): { kind: InsightKind; text: string; exerciseId?: number }[] {
  const out: { kind: InsightKind; text: string; exerciseId?: number }[] = [];
  const lastHit: Partial<Record<MuscleId, string>> = {};
  const visits: Partial<Record<MuscleId, number>> = {};
  const recent = new Map<number, string>();
  let push = 0;
  let pull = 0;

  for (const s of data.sessions) {
    const age = daysAgo(data.now, s.date);
    if (age < 0 || age > 56) continue;
    const seen = new Set<MuscleId>();
    for (const e of s.exercises) {
      const n = e.sets.length;
      if (n === 0 || !e.work) continue;
      seen.add(e.work.primary);
      if (!lastHit[e.work.primary] || s.date > lastHit[e.work.primary]!) lastHit[e.work.primary] = s.date;
      if (age <= 28) {
        if (PUSH_MUSCLES.has(e.work.primary)) push += n;
        if (PULL_MUSCLES.has(e.work.primary)) pull += n;
        if (e.topWeight > 0) recent.set(e.id, e.name);
      }
    }
    for (const m of seen) visits[m] = (visits[m] ?? 0) + 1;
  }

  // Heavy week compared with your usual
  const start = weekStartOf(data.now);
  const weeks = [0, 0, 0, 0, 0];
  for (const s of data.sessions) {
    const day = noon(s.date);
    if (day > data.now) continue;
    const back = differenceInCalendarDays(start, day);
    const i = back <= 0 ? 0 : 1 + Math.floor((back - 1) / 7);
    if (i < weeks.length) weeks[i] += s.setCount;
  }
  const before = weeks.slice(1).filter((w) => w > 0);
  if (before.length >= 3 && weeks[0] >= 12) {
    const avg = before.reduce((a, b) => a + b, 0) / before.length;
    if (weeks[0] >= avg * 1.5) {
      out.push({ kind: 'load', text: `${Math.round((weeks[0] / avg - 1) * 100)}% more sets than your usual week. Watch your recovery.` });
    }
  }

  // A muscle you normally train, left alone for two weeks
  let forgotten: MuscleId | null = null;
  let gap = 13;
  for (const [m, date] of Object.entries(lastHit) as [MuscleId, string][]) {
    const d = daysAgo(data.now, date);
    if ((visits[m] ?? 0) >= 2 && d > gap) {
      gap = d;
      forgotten = m;
    }
  }
  if (forgotten) out.push({ kind: 'muscle', text: `${MUSCLE_LABEL[forgotten]}: ${gap} days untouched.` });

  // Push / pull balance over four weeks
  if (push + pull >= 20) {
    if (push >= pull * 1.6) {
      out.push({ kind: 'balance', text: `You push more than you pull: ${push} sets against ${pull} in four weeks.` });
    } else if (pull >= push * 1.6) {
      out.push({ kind: 'balance', text: `You pull more than you push: ${pull} sets against ${push} in four weeks.` });
    }
  }

  // Biggest strength gain vs last month
  let best: number | null = null;
  let gain = 0.03;
  for (const id of recent.keys()) {
    let nowBest = 0;
    let thenBest = 0;
    for (const s of data.sessions) {
      const age = daysAgo(data.now, s.date);
      if (age < 0 || age > 90) continue;
      const e = s.exercises.find((x) => x.id === id);
      if (!e || e.e1rm <= 0) continue;
      if (age <= 28) nowBest = Math.max(nowBest, e.e1rm);
      else thenBest = Math.max(thenBest, e.e1rm);
    }
    if (thenBest <= 0 || nowBest <= 0) continue;
    const g = nowBest / thenBest - 1;
    if (g > gain) {
      gain = g;
      best = id;
    }
  }
  if (best != null) {
    out.push({ kind: 'up', text: `${recent.get(best)}: ${Math.round(gain * 100)}% stronger than last month.`, exerciseId: best });
  }
  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Strength
// ---------------------------------------------------------------------------

export function trackedExercises(data: ProgressData): { id: number; name: string; sessions: number }[] {
  const count = new Map<number, { name: string; n: number }>();
  for (const s of data.sessions) {
    for (const e of s.exercises) {
      if (e.topWeight <= 0) continue;
      const c = count.get(e.id) ?? { name: e.name, n: 0 };
      c.n++;
      count.set(e.id, c);
    }
  }
  return [...count.entries()]
    .filter(([, c]) => c.n >= 2)
    .map(([id, c]) => ({ id, name: c.name, sessions: c.n }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function strengthFor(data: ProgressData, exerciseId: number) {
  const history = data.sessions
    .map((s) => ({ date: s.date, ex: s.exercises.find((e) => e.id === exerciseId) }))
    .filter((h): h is { date: string; ex: PExercise } => !!h.ex && h.ex.e1rm > 0);
  const recent = history.slice(-24);
  const series = recent.map((h) => Math.round(h.ex.e1rm * 10) / 10);
  const name = history[history.length - 1]?.ex.name ?? '';

  let relative: { ratio: number; level: number; levelName: string; toNext: number; nextName: string | null } | null = null;
  const kind = liftKindFor(name);
  const body = data.weights[data.weights.length - 1]?.kg ?? 0;
  if (kind && body > 0) {
    const best90 = history.filter((h) => daysAgo(data.now, h.date) <= 90).reduce((m, h) => Math.max(m, h.ex.e1rm), 0);
    if (best90 > 0) {
      const ratio = best90 / body;
      const cuts = data.sex === 'female' ? STRENGTH_STEPS[kind].female : STRENGTH_STEPS[kind].male;
      const level = cuts.filter((c) => ratio >= c).length;
      const lo = level === 0 ? 0 : cuts[level - 1];
      const toNext = level >= cuts.length ? 1 : Math.max(0, Math.min(1, (ratio - lo) / (cuts[level] - lo)));
      relative = {
        ratio,
        level,
        levelName: STRENGTH_LEVELS[level],
        toNext,
        nextName: level >= cuts.length ? null : STRENGTH_LEVELS[level + 1],
      };
    }
  }
  return {
    name,
    series,
    first: series[0] ?? 0,
    last: series[series.length - 1] ?? 0,
    firstDate: recent[0]?.date ?? null,
    lastDate: recent[recent.length - 1]?.date ?? null,
    sessions: history.length,
    relative,
  };
}

// ---------------------------------------------------------------------------
// Readiness (sleep & energy)
// ---------------------------------------------------------------------------

export function readiness(data: ProgressData) {
  // "Form" per rated session: each lift's e1RM vs its best of the previous 90 days.
  const form = new Map<string, number>();
  const best = new Map<number, { date: string; rm: number }[]>();
  for (const s of data.sessions) {
    const ratios: number[] = [];
    for (const e of s.exercises) {
      if (e.e1rm <= 0) continue;
      const past = (best.get(e.id) ?? []).filter((p) => differenceInCalendarDays(noon(s.date), noon(p.date)) <= 90);
      if (past.length > 0) ratios.push(e.e1rm / Math.max(...past.map((p) => p.rm)));
      past.push({ date: s.date, rm: e.e1rm });
      best.set(e.id, past);
    }
    const c = data.checkins.get(s.date);
    if (ratios.length > 0 && c && (c.sleep != null || c.energy != null)) {
      form.set(s.date, ratios.reduce((a, b) => a + b, 0) / ratios.length);
    }
  }

  const effectOf = (key: 'sleep' | 'energy') => {
    const low: number[] = [];
    const high: number[] = [];
    for (const [date, f] of form) {
      const v = data.checkins.get(date)?.[key];
      if (v == null) continue;
      if (v <= 2) low.push(f);
      if (v >= 4) high.push(f);
    }
    if (low.length < 3 || high.length < 3) return null;
    const mean = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
    return { sleep: key === 'sleep', pct: Math.round((mean(low) / mean(high) - 1) * 100) };
  };
  const a = effectOf('sleep');
  const b = effectOf('energy');
  const effect = a && b ? (Math.abs(a.pct) >= Math.abs(b.pct) ? a : b) : a ?? b;

  let rated = 0;
  const sl: number[] = [];
  const en: number[] = [];
  for (const s of data.sessions) {
    const c = data.checkins.get(s.date);
    if (!c || (c.sleep == null && c.energy == null)) continue;
    rated++;
    if (daysAgo(data.now, s.date) > 30) continue;
    if (c.sleep != null) sl.push(c.sleep);
    if (c.energy != null) en.push(c.energy);
  }
  const avg = (l: number[]) => (l.length ? l.reduce((x, y) => x + y, 0) / l.length : null);

  let headline: string;
  if (!effect) headline = 'Keep rating your workouts';
  else if (Math.abs(effect.pct) < 3) headline = effect.sleep ? 'Sleep barely changes your lifts' : 'Your energy barely changes your lifts';
  else if (effect.pct < 0)
    headline = effect.sleep ? `On short-sleep days you lift ${-effect.pct}% less` : `On low-energy days you lift ${-effect.pct}% less`;
  else
    headline = effect.sleep ? `Funny: on short-sleep days you lift ${effect.pct}% more` : `On low-energy days you still lift ${effect.pct}% more`;

  return {
    rated,
    sleep: avg(sl),
    energy: avg(en),
    effect,
    headline,
    hint: effect
      ? 'Compares each estimated 1RM with your best of the previous 90 days.'
      : "After a few good and bad days you'll see how they change your lifts.",
  };
}
