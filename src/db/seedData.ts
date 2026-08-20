import { TrackingType } from '../types/database';

export interface PreseededExercise {
  name: string;
  category: string;
  tracking_type: TrackingType;
}

export interface PreseededRoutine {
  name: string;
  category: string;
  notes: string;
  exercises: {
    name: string;
    target_sets: number;
    target_reps: number;
    target_weight: number;
  }[];
}

export interface PreseededFood {
  name: string;
  serving_size_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Abs',
  'Cardio',
  'Custom',
];

export const PRESEEDED_EXERCISES: PreseededExercise[] = [
  // Abs
  { name: 'Plank', category: 'Abs', tracking_type: 'time_only' },
  { name: 'Crunches', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Hanging Leg Raises', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Russian Twists', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Bicycle Crunches', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Ab Wheel Rollout', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Cable Woodchopper', category: 'Abs', tracking_type: 'weight_reps' },

  // Back
  { name: 'Barbell Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Barbell Shrug', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Chin Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Deadlift', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Good Morning', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Hammer Strength Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Lat Pulldown', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Machine Shrug', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Neutral Chin Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Pendlay Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Pull Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Rack Pull', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Seated Cable Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'T-Bar Row', category: 'Back', tracking_type: 'weight_reps' },

  // Biceps
  { name: 'Barbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Hammer Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Preacher Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Concentration Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Cable Bicep Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Incline Dumbbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },

  // Cardio
  { name: 'Running', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Cycling', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Rowing Machine', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Jump Rope', category: 'Cardio', tracking_type: 'time_only' },
  { name: 'Stair Climber', category: 'Cardio', tracking_type: 'time_only' },
  { name: 'Elliptical', category: 'Cardio', tracking_type: 'distance_time' },

  // Chest
  { name: 'Flat Barbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Incline Dumbbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Incline Barbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Fly', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Cable Crossover', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Dips', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Push Up', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Seated Machine Fly', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Decline Barbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },

  // Legs
  { name: 'Barbell Back Squat', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Barbell Front Squat', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Leg Press', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Leg Extension', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Hamstring Curl', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Calf Raises', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Romanian Deadlift', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Bulgarian Split Squat', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Walking Lunges', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Hip Thrust', category: 'Legs', tracking_type: 'weight_reps' },

  // Shoulders
  { name: 'Overhead Shoulder Press', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Seated Dumbbell Press', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Lateral Dumbbell Raise', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Front Dumbbell Raise', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Face Pull', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Arnold Press', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Rear Delt Fly', category: 'Shoulders', tracking_type: 'weight_reps' },

  // Triceps
  { name: 'Rope Push Down', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Skull Crushers', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Tricep Dip Machine', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Overhead Dumbbell Tricep Extension', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Close Grip Bench Press', category: 'Triceps', tracking_type: 'weight_reps' },
];

export const PRESEEDED_ROUTINES: PreseededRoutine[] = [
  {
    name: 'Push (Chest, Shoulders, Triceps)',
    category: 'Push',
    notes: 'Focus on progressive overload on bench press and overhead press',
    exercises: [
      { name: 'Flat Barbell Bench Press', target_sets: 4, target_reps: 8, target_weight: 60 },
      { name: 'Incline Dumbbell Bench Press', target_sets: 3, target_reps: 10, target_weight: 22.5 },
      { name: 'Seated Dumbbell Press', target_sets: 3, target_reps: 10, target_weight: 17.5 },
      { name: 'Lateral Dumbbell Raise', target_sets: 4, target_reps: 15, target_weight: 10 },
      { name: 'Rope Push Down', target_sets: 3, target_reps: 12, target_weight: 25 },
    ],
  },
  {
    name: 'Pull (Back, Biceps, Rear Delts)',
    category: 'Pull',
    notes: 'Prioritize full range of motion and lat contraction',
    exercises: [
      { name: 'Deadlift', target_sets: 4, target_reps: 6, target_weight: 100 },
      { name: 'Barbell Row', target_sets: 3, target_reps: 8, target_weight: 50 },
      { name: 'Lat Pulldown', target_sets: 3, target_reps: 10, target_weight: 55 },
      { name: 'Face Pull', target_sets: 3, target_reps: 15, target_weight: 20 },
      { name: 'Barbell Curl', target_sets: 3, target_reps: 10, target_weight: 30 },
      { name: 'Hammer Curl', target_sets: 3, target_reps: 12, target_weight: 14 },
    ],
  },
  {
    name: 'Legs & Core (Quads, Hamstrings, Abs)',
    category: 'Legs',
    notes: 'Heavy compound leg day with hypertrophy accessories',
    exercises: [
      { name: 'Barbell Back Squat', target_sets: 4, target_reps: 8, target_weight: 80 },
      { name: 'Romanian Deadlift', target_sets: 3, target_reps: 10, target_weight: 60 },
      { name: 'Leg Press', target_sets: 3, target_reps: 12, target_weight: 140 },
      { name: 'Hamstring Curl', target_sets: 3, target_reps: 12, target_weight: 40 },
      { name: 'Hanging Leg Raises', target_sets: 3, target_reps: 15, target_weight: 0 },
    ],
  },
  {
    name: 'Upper Body Strength',
    category: 'Upper',
    notes: 'Heavy upper body compound power builder',
    exercises: [
      { name: 'Flat Barbell Bench Press', target_sets: 4, target_reps: 6, target_weight: 70 },
      { name: 'Pendlay Row', target_sets: 4, target_reps: 6, target_weight: 60 },
      { name: 'Overhead Shoulder Press', target_sets: 3, target_reps: 8, target_weight: 40 },
      { name: 'Pull Up', target_sets: 3, target_reps: 8, target_weight: 0 },
      { name: 'Skull Crushers', target_sets: 3, target_reps: 10, target_weight: 25 },
      { name: 'Incline Dumbbell Curl', target_sets: 3, target_reps: 10, target_weight: 12.5 },
    ],
  },
];

export const PRESEEDED_FOODS: PreseededFood[] = [
  { name: 'Chicken Breast (Cooked)', serving_size_g: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Whole Eggs (2 Large)', serving_size_g: 100, calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  { name: 'Egg Whites', serving_size_g: 100, calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: 'Rolled Oats (Raw)', serving_size_g: 100, calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { name: 'White Rice (Cooked)', serving_size_g: 100, calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
  { name: 'Whey Protein Scoop', serving_size_g: 30, calories: 120, protein: 24, carbs: 2, fat: 1.5 },
  { name: 'Peanut Butter', serving_size_g: 32, calories: 190, protein: 8, carbs: 7, fat: 16 },
  { name: 'Greek Yogurt (0% Fat)', serving_size_g: 100, calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: 'Salmon Fillet (Cooked)', serving_size_g: 100, calories: 206, protein: 22, carbs: 0, fat: 12.3 },
  { name: 'Banana (Medium)', serving_size_g: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.3 },
  { name: 'Almonds', serving_size_g: 30, calories: 173, protein: 6.3, carbs: 6.1, fat: 15 },
  { name: 'Sweet Potato (Cooked)', serving_size_g: 100, calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
];
