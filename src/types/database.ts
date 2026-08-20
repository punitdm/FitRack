export type TrackingType = 'weight_reps' | 'distance_time' | 'time_only';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Hard';

export interface Exercise {
  id: number;
  name: string;
  category: string;
  tracking_type: TrackingType;
  is_custom?: number;
}

export interface WorkoutSession {
  id: number;
  date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at?: string;
}

export interface ExerciseLog {
  id: number;
  session_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  distance_val: number;
  distance_unit: string; // 'km' | 'miles' | 'm'
  time_duration: string; // '00:00:00'
  difficulty?: DifficultyLevel | null;
  comment?: string | null;
  superset_id?: string | null;
  // Joined fields for convenience
  exercise_name?: string;
  exercise_category?: string;
  tracking_type?: TrackingType;
}

export interface ExerciseWithLogs {
  exercise: Exercise;
  logs: ExerciseLog[];
  supersetId?: string | null;
  supersetPartnerName?: string | null;
  previousSetInfo?: {
    weight_kg: number;
    reps: number;
    distance_val?: number;
    time_duration?: string;
  } | null;
}

export interface MacroLog {
  id?: number;
  date: string; // YYYY-MM-DD
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  actual_food?: string | null;
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface HydrationLog {
  id?: number;
  date: string; // YYYY-MM-DD
  amount_ml: number;
  target_ml: number;
}

export interface BodyStats {
  id?: number;
  date: string; // YYYY-MM-DD
  weight_kg?: number | null;
  body_fat?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  thigh?: number | null;
  arm?: number | null;
}

export interface WorkoutHistoryItem {
  sessionId: number;
  date: string;
  notes?: string | null;
  totalSets: number;
  totalVolumeKg: number;
  exercises: {
    name: string;
    category: string;
    setsCount: number;
    bestSet: string;
  }[];
}

export interface PersonalRecord {
  exerciseId: number;
  exerciseName: string;
  category: string;
  maxWeightKg: number;
  maxRepsAtMaxWeight: number;
  estimated1RM: number;
  dateAchieved: string;
}

export interface DayStreakItem {
  label: string; // M, T, W, T, F, S, S
  date: string; // YYYY-MM-DD
  completed: boolean;
  isToday: boolean;
}

export interface WeeklyStreakInfo {
  currentStreak: number;
  bestStreak: number;
  weekDays: DayStreakItem[];
}

export interface HomeDashboardSummary {
  goalsMetCount: number;
  totalGoals: number;
  proteinConsumed: number;
  proteinGoal: number;
  caloriesConsumed: number;
  caloriesGoal: number;
  workoutsDoneToday: number;
  workoutGoalToday: number;
  foodRemainingKcal: number;
  foodRemainingProtein: number;
  hydrationMl: number;
  hydrationTargetMl: number;
  latestWeightKg: number | null;
  weightDateText: string;
  streak: WeeklyStreakInfo;
  weeklyActivitiesCount: number;
  weeklyDistanceKm: number;
  weeklyDurationMinutes: number;
  weeklyCaloriesBurned: number;
}
