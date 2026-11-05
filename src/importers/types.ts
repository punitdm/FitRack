import { TrackingType } from '../types/database';

/**
 * Source-agnostic shape every importer produces. The commit step only ever
 * sees this, so adding a new app means writing one parser and nothing else.
 */

export type ImportSource = 'fitnotes' | 'gymmane';

export interface ImportedSet {
  weightKg: number;
  reps: number;
  /** Seconds for timed sets / cardio. */
  seconds?: number;
  /** Distance in kilometres. */
  km?: number;
  comment?: string;
}

export interface ImportedExercise {
  name: string;
  category: string;
  trackingType: TrackingType;
  sets: ImportedSet[];
}

export interface ImportedSession {
  /** YYYY-MM-DD (local). */
  date: string;
  exercises: ImportedExercise[];
}

export interface ImportedBodyStat {
  date: string;
  weight_kg?: number;
  body_fat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  thigh?: number;
  arm?: number;
  neck?: number;
  shoulders?: number;
  forearm?: number;
  calf?: number;
}

export interface ImportedMacroDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: string;
}

/** One logged food in a meal (sources that track meals, e.g. GymMane). */
export interface ImportedFoodEntry {
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ImportedHydrationDay {
  date: string;
  ml: number;
}

export interface ImportBundle {
  source: ImportSource;
  sessions: ImportedSession[];
  bodyStats: ImportedBodyStat[];
  macros: ImportedMacroDay[];
  /** Per-meal foods. When present for a date, they're imported instead of that date's total. */
  foods: ImportedFoodEntry[];
  hydration: ImportedHydrationDay[];
  /** Human-readable notes about anything skipped or approximated during parsing. */
  warnings: string[];
}

export interface ImportPreview {
  sourceLabel: string;
  sessions: number;
  sets: number;
  exercises: number;
  bodyStats: number;
  macroDays: number;
  hydrationDays: number;
  firstDate: string | null;
  lastDate: string | null;
  warnings: string[];
}

export interface ImportCommitResult {
  sessionsTouched: number;
  setsAdded: number;
  setsSkippedAsDuplicate: number;
  exercisesCreated: number;
  bodyStatsMerged: number;
  macroDaysAdded: number;
  macroDaysKept: number;
  /** Days previously imported as a single total that now have their meals. */
  macroDaysSplitIntoMeals: number;
  hydrationDaysAdded: number;
}

export function emptyBundle(source: ImportSource): ImportBundle {
  return { source, sessions: [], bodyStats: [], macros: [], foods: [], hydration: [], warnings: [] };
}

export const SOURCE_LABELS: Record<ImportSource, string> = {
  fitnotes: 'FitNotes',
  gymmane: 'GymMane',
};
