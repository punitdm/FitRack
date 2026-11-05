/**
 * Muscle model for the Progress screen.
 *
 * FitRack stores one broad category per exercise (Chest, Back, Legs…), so the
 * muscles an exercise works are worked out from its name, falling back to the
 * category. The primary muscle gets full credit per set, helpers get half.
 */

export type MuscleId =
  | 'chest'
  | 'shoulders'
  | 'trapezius'
  | 'back'
  | 'lowerback'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abdomen'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export const MUSCLES: { id: MuscleId; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'trapezius', label: 'Traps' },
  { id: 'back', label: 'Back' },
  { id: 'lowerback', label: 'Lower back' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearm', label: 'Forearms' },
  { id: 'abdomen', label: 'Abs' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'calves', label: 'Calves' },
];

export const MUSCLE_LABEL: Record<MuscleId, string> = Object.fromEntries(MUSCLES.map((m) => [m.id, m.label])) as Record<
  MuscleId,
  string
>;

/** Hours for a muscle to fully recover from a hard session. */
export const RECOVERY_HOURS: Record<MuscleId, number> = {
  chest: 60,
  back: 60,
  lowerback: 72,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  shoulders: 48,
  trapezius: 48,
  biceps: 48,
  triceps: 48,
  forearm: 36,
  calves: 36,
  abdomen: 36,
};

/** Sets per muscle per week the map treats as "full volume". */
export const WEEKLY_SET_TARGET = 12;

export const PUSH_MUSCLES = new Set<MuscleId>(['chest', 'shoulders', 'triceps']);
export const PULL_MUSCLES = new Set<MuscleId>(['back', 'biceps', 'trapezius']);

export interface MuscleWork {
  primary: MuscleId;
  secondary: MuscleId[];
}

type Rule = { test: (n: string, cat: string) => boolean; work: MuscleWork };

const has = (...words: string[]) => (n: string) => words.some((w) => n.includes(w));

// Ordered: the first matching rule wins, so specific patterns come first.
const RULES: Rule[] = [
  { test: has('calf'), work: { primary: 'calves', secondary: [] } },
  { test: has('hip thrust', 'glute bridge', 'glute kickback', 'glute'), work: { primary: 'glutes', secondary: ['hamstrings'] } },
  { test: has('romanian', 'rdl', 'stiff leg', 'stiff-leg', 'good morning'), work: { primary: 'hamstrings', secondary: ['glutes', 'lowerback'] } },
  { test: has('deadlift'), work: { primary: 'lowerback', secondary: ['glutes', 'hamstrings', 'trapezius'] } },
  { test: has('leg curl', 'hamstring'), work: { primary: 'hamstrings', secondary: [] } },
  { test: has('leg extension'), work: { primary: 'quads', secondary: [] } },
  { test: has('squat', 'leg press', 'lunge', 'split', 'step up', 'step-up', 'hack'), work: { primary: 'quads', secondary: ['glutes'] } },
  { test: has('back extension', 'hyperextension'), work: { primary: 'lowerback', secondary: ['glutes'] } },
  { test: has('shrug'), work: { primary: 'trapezius', secondary: [] } },
  { test: has('face pull', 'rear delt', 'reverse pec', 'reverse fly'), work: { primary: 'shoulders', secondary: ['trapezius', 'back'] } },
  { test: has('upright row'), work: { primary: 'shoulders', secondary: ['trapezius'] } },
  { test: has('lateral raise', 'front raise', 'lateral dumbbell raise', 'front dumbbell raise'), work: { primary: 'shoulders', secondary: [] } },
  { test: has('shoulder press', 'overhead press', 'military', 'arnold'), work: { primary: 'shoulders', secondary: ['triceps'] } },
  { test: (n, c) => c === 'shoulders' && n.includes('press'), work: { primary: 'shoulders', secondary: ['triceps'] } },
  { test: (n) => /\b(pull[- ]?ups?|chin[- ]?ups?|chins|pull[- ]?downs?|pulldowns?)\b/.test(n), work: { primary: 'back', secondary: ['biceps'] } },
  { test: has('pullover'), work: { primary: 'back', secondary: ['chest'] } },
  { test: (n) => /\brows?\b/.test(n), work: { primary: 'back', secondary: ['biceps', 'trapezius'] } },
  { test: has('close grip', 'close-grip'), work: { primary: 'triceps', secondary: ['chest'] } },
  { test: has('skull', 'tricep', 'push down', 'pushdown', 'push-down', 'kickback'), work: { primary: 'triceps', secondary: [] } },
  { test: (n, c) => n.includes('dip') && c !== 'chest', work: { primary: 'triceps', secondary: ['chest', 'shoulders'] } },
  { test: has('wrist', 'forearm', 'farmer'), work: { primary: 'forearm', secondary: [] } },
  { test: has('hammer'), work: { primary: 'biceps', secondary: ['forearm'] } },
  { test: has('curl'), work: { primary: 'biceps', secondary: [] } },
  {
    test: has('crunch', 'sit up', 'sit-up', 'leg raise', 'knee', 'plank', 'rollout', 'roll out', 'woodchop', 'russian', 'criss', 'dead bug', 'oblique', 'v-up', 'hollow', 'ab '),
    work: { primary: 'abdomen', secondary: [] },
  },
  { test: has('fly', 'flye', 'crossover', 'pec deck'), work: { primary: 'chest', secondary: ['shoulders'] } },
  { test: has('bench', 'chest press', 'push up', 'push-up', 'pushup', 'dip', 'dand'), work: { primary: 'chest', secondary: ['triceps', 'shoulders'] } },
];

const CATEGORY_FALLBACK: Record<string, MuscleWork> = {
  chest: { primary: 'chest', secondary: ['triceps'] },
  back: { primary: 'back', secondary: ['biceps'] },
  shoulders: { primary: 'shoulders', secondary: [] },
  biceps: { primary: 'biceps', secondary: [] },
  triceps: { primary: 'triceps', secondary: [] },
  legs: { primary: 'quads', secondary: ['glutes'] },
  core: { primary: 'abdomen', secondary: [] },
  abs: { primary: 'abdomen', secondary: [] },
  forearms: { primary: 'forearm', secondary: [] },
  glutes: { primary: 'glutes', secondary: [] },
  calves: { primary: 'calves', secondary: [] },
};

const cache = new Map<string, MuscleWork | null>();

/** Muscles an exercise works, or null for cardio / non-lifting entries. */
export function musclesFor(name: string, category: string): MuscleWork | null {
  const key = `${name}|${category}`;
  if (cache.has(key)) return cache.get(key)!;
  const n = ` ${name.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  const c = category.toLowerCase().trim();
  let out: MuscleWork | null = null;
  for (const r of RULES) {
    if (r.test(n, c)) {
      out = r.work;
      break;
    }
  }
  if (!out) out = CATEGORY_FALLBACK[c] ?? null;
  cache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Strength standards (estimated 1RM ÷ bodyweight). Five levels per lift.
// ---------------------------------------------------------------------------

export type LiftKind = 'bench' | 'squat' | 'deadlift' | 'ohp' | 'row';

/** Cut-offs to reach Intermediate, Advanced, Very advanced, Elite (male, female). */
export const STRENGTH_STEPS: Record<LiftKind, { male: number[]; female: number[] }> = {
  bench: { male: [0.8, 1.15, 1.5, 2.0], female: [0.5, 0.7, 1.0, 1.3] },
  squat: { male: [1.0, 1.4, 1.9, 2.5], female: [0.75, 1.1, 1.5, 1.9] },
  deadlift: { male: [1.25, 1.75, 2.25, 3.0], female: [1.0, 1.35, 1.75, 2.3] },
  ohp: { male: [0.5, 0.7, 0.95, 1.25], female: [0.35, 0.45, 0.65, 0.85] },
  row: { male: [0.6, 0.85, 1.15, 1.5], female: [0.4, 0.6, 0.8, 1.05] },
};

export const STRENGTH_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Very advanced', 'Elite'];

/** Which standard lift an exercise counts as (barbell versions only). */
export function liftKindFor(name: string): LiftKind | null {
  const n = name.toLowerCase();
  const dumbbell = /dumbbell|\bdb\b|machine|smith|cable/.test(n);
  if (/bench press/.test(n) && !/incline|decline|close/.test(n) && !dumbbell) return 'bench';
  if (/squat/.test(n) && !/front|split|goblet|bulgarian|body ?weight|hack|jump|sumo/.test(n) && !dumbbell) return 'squat';
  if (/deadlift/.test(n) && !/romanian|rdl|stiff|sumo|trap|hex/.test(n) && !dumbbell) return 'deadlift';
  if (/(overhead|military|shoulder) press/.test(n) && !dumbbell && !/seated|arnold/.test(n)) return 'ohp';
  if (/(barbell|bent[- ]over|pendlay).*row|row.*barbell/.test(n) && !dumbbell && !/upright/.test(n)) return 'row';
  return null;
}
