export type TrackingType = 'weight_reps' | 'distance_time' | 'time_only';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Hard';

export interface Exercise {
  id: number;
  name: string;
  category: string;
  tracking_type: TrackingType;
  is_custom: number;
}

export interface WorkoutSession {
  id: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  created_at?: string;
}

export interface ExerciseLog {
  id: number;
  session_id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number;
  reps: number;
  distance_val?: number;
  distance_unit?: string;
  time_duration?: string; // HH:MM:SS
  difficulty?: DifficultyLevel | null;
  comment?: string | null;
  superset_id?: string | null;
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

export interface WorkoutTemplate {
  id: number;
  name: string;
  category: string;
  notes?: string;
  exercisesCount?: number;
  exercises?: TemplateExerciseWithDetails[];
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number;
}

export interface TemplateExerciseWithDetails extends TemplateExercise {
  exercise_name: string;
  exercise_category: string;
  tracking_type: TrackingType;
}

export interface CustomFood {
  id: number;
  name: string;
  serving_size_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroLog {
  id?: number;
  date: string; // YYYY-MM-DD
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  actual_food?: string;
}

export interface HydrationLog {
  id?: number;
  date: string;
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
  notes?: string;
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

export interface WeeklyStreakInfo {
  currentStreak: number;
  bestStreak: number;
  weekDays: {
    label: string; // 'M', 'T', 'W', etc.
    date: string;
    completed: boolean;
    isToday: boolean;
  }[];
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

export interface ExerciseProgressionPoint {
  date: string;
  value: number;
  reps?: number;
  weight?: number;
  displayDate: string;
}
