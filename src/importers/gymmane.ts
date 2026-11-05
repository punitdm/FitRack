import { ImportBundle, ImportedBodyStat, ImportedFoodEntry, ImportedMacroDay, emptyBundle } from './types';
import { SessionBuilder, dayFromIsoish, isoDay, num, plural, round } from './helpers';

/**
 * GymMane (github.com/InlitX/GymMane) backups are `gymmane-backup-*.zip` files
 * containing `gymmane.json`. The JSON uses short keys (see lib/models/workout.dart):
 *
 *   sessions:   [{ d: endIsoLocal, dur: seconds, n?: name, ex: [{ n, p: muscle, s: [set] }] }]
 *   set:        { r: reps, w: kg, k?: kind (1 = warm-up), e?: rpe, t?: seconds, km?: km, n?: note }
 *   bodyweight: [{ d, kg }]
 *   measures:   [{ d, k: 'chest'|'arm'|'waist'|'hips'|'thigh'|'bodyfat'|…, v }]
 *   nutrition:  { log: [{ at, n, x?: servings, m: { k, p, c, f } }], water: [{ at, ml }] }
 *
 * Weights are always stored in kg, lengths in cm.
 */

const SET_KIND_WARMUP = 1;

const MUSCLE_TO_CATEGORY: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  lowerback: 'Back',
  trapezius: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  forearm: 'Biceps',
  triceps: 'Triceps',
  quads: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  adductors: 'Legs',
  abductors: 'Legs',
  abdomen: 'Core',
  obliques: 'Core',
  cardio: 'Cardio',
};

const MEASURE_TO_STAT: Record<string, Exclude<keyof ImportedBodyStat, 'date'>> = {
  chest: 'chest',
  arm: 'arm',
  waist: 'waist',
  hips: 'hips',
  thigh: 'thigh',
  bodyfat: 'body_fat',
  neck: 'neck',
  shoulders: 'shoulders',
  forearm: 'forearm',
  calf: 'calf',
};

type Json = Record<string, any>;

export function looksLikeGymManeBackup(data: unknown): data is Json {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Json;
  return 'sessions' in d && ('bodyweight' in d || 'routines' in d || 'nutrition' in d);
}

/** GymMane may store big lists pre-encoded as a JSON string; accept either. */
function list(v: unknown): Json[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === 'object');
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Dart's toIso8601String() on a local DateTime has no offset, which JS also parses as local. */
function localDay(iso: unknown, minusSeconds = 0): string | null {
  if (typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dayFromIsoish(iso);
  return isoDay(new Date(d.getTime() - minusSeconds * 1000));
}

/** GymMane's built-in meal ids; custom slots fall back to snacks. */
function gymManeMeal(id: unknown): ImportedFoodEntry['meal'] {
  const v = String(id || '').toLowerCase();
  return v === 'breakfast' || v === 'lunch' || v === 'dinner' || v === 'snacks' ? v : 'snacks';
}

export function parseGymManeBackup(data: Json): ImportBundle {
  const bundle = emptyBundle('gymmane');
  const builder = new SessionBuilder();
  let warmups = 0;

  // --- Workouts ---
  for (const s of list(data.sessions)) {
    // `d` is when the workout finished; subtract duration so late-night sessions land on the right day.
    const date = localDay(s.d, num(s.dur));
    if (!date) continue;
    for (const ex of list(s.ex)) {
      const name = typeof ex.n === 'string' ? ex.n.trim() : '';
      if (!name) continue;
      const category = MUSCLE_TO_CATEGORY[String(ex.p || '').toLowerCase()] || 'Custom';
      for (const set of list(ex.s)) {
        if (num(set.k) === SET_KIND_WARMUP) {
          warmups++;
          continue;
        }
        const reps = Math.max(0, Math.round(num(set.r)));
        const seconds = Math.max(0, Math.round(num(set.t)));
        const km = Math.max(0, num(set.km));
        if (reps <= 0 && seconds <= 0 && km <= 0) continue;

        const notes: string[] = [];
        if (typeof set.n === 'string' && set.n.trim()) notes.push(set.n.trim());
        if (num(set.e) > 0) notes.push(`RPE ${num(set.e)}`);
        if (num(set.k) === 2) notes.push('Drop set');
        if (num(set.k) === 3) notes.push('To failure');

        builder.add(date, name, category, {
          weightKg: round(num(set.w), 3),
          reps,
          seconds: seconds > 0 ? seconds : undefined,
          km: km > 0 ? round(km, 3) : undefined,
          comment: notes.length ? notes.join(' · ') : undefined,
        });
      }
    }
  }
  bundle.sessions = builder.build();
  if (warmups > 0) {
    bundle.warnings.push(`${plural(warmups, 'warm-up set')} skipped so they don't inflate your volume and PRs.`);
  }

  // --- Body weight + measurements ---
  const stats = new Map<string, ImportedBodyStat>();
  const statFor = (date: string) => {
    let s = stats.get(date);
    if (!s) {
      s = { date };
      stats.set(date, s);
    }
    return s;
  };
  for (const b of list(data.bodyweight)) {
    const date = localDay(b.d);
    if (date && num(b.kg) > 0) statFor(date).weight_kg = round(num(b.kg), 2);
  }
  for (const m of list(data.measures)) {
    const key = MEASURE_TO_STAT[String(m.k || '').toLowerCase()];
    const date = localDay(m.d);
    if (key && date && num(m.v) > 0) statFor(date)[key] = round(num(m.v), 2);
  }
  bundle.bodyStats = [...stats.values()];

  // --- Nutrition (summed per day; FitRack stores daily totals) ---
  const nutrition: Json = data.nutrition && typeof data.nutrition === 'object' ? data.nutrition : {};
  const days = new Map<string, ImportedMacroDay & { names: string[] }>();
  for (const e of list(nutrition.log)) {
    const date = localDay(e.at);
    if (!date) continue;
    const servings = num(e.x) > 0 ? num(e.x) : 1;
    const m: Json = e.m && typeof e.m === 'object' ? e.m : {};
    let day = days.get(date);
    if (!day) {
      day = { date, calories: 0, protein: 0, carbs: 0, fat: 0, foods: '', names: [] };
      days.set(date, day);
    }
    day.calories += num(m.k) * servings;
    day.protein += num(m.p) * servings;
    day.carbs += num(m.c) * servings;
    day.fat += num(m.f) * servings;
    const label = typeof e.n === 'string' && e.n.trim() ? e.n.trim() : 'Food';
    const name = servings !== 1 ? `${label} ×${round(servings, 2)}` : label;
    if (label !== 'Food') day.names.push(name);
    // Keep each food in the meal GymMane logged it under.
    bundle.foods.push({
      date,
      meal: gymManeMeal(e.ml),
      name,
      calories: Math.round(num(m.k) * servings),
      protein: round(num(m.p) * servings, 1),
      carbs: round(num(m.c) * servings, 1),
      fat: round(num(m.f) * servings, 1),
    });
  }
  bundle.macros = [...days.values()].map(({ names, ...d }) => ({
    ...d,
    calories: Math.round(d.calories),
    protein: round(d.protein, 1),
    carbs: round(d.carbs, 1),
    fat: round(d.fat, 1),
    foods: names.join(', '),
  }));

  const water = new Map<string, number>();
  for (const w of list(nutrition.water)) {
    const date = localDay(w.at);
    if (date && num(w.ml) > 0) water.set(date, (water.get(date) ?? 0) + num(w.ml));
  }
  bundle.hydration = [...water.entries()].map(([date, ml]) => ({ date, ml: Math.round(ml) }));

  return bundle;
}
