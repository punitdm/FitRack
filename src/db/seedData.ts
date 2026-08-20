import { TrackingType } from '../types/database';

export interface SeedExercise {
  name: string;
  category: string;
  tracking_type: TrackingType;
}

export const PRESEEDED_EXERCISES: SeedExercise[] = [
  // Abs
  { name: 'Plank (Time)', category: 'Abs', tracking_type: 'time_only' },
  { name: 'Crunches', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Hanging leg raises', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Russian twists', category: 'Abs', tracking_type: 'weight_reps' },
  { name: 'Bicycle crunches', category: 'Abs', tracking_type: 'weight_reps' },

  // Back
  { name: 'Barbell Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Barbell Shrug', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Chin Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Deadlift', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'T-Bar Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Lat Pulldown', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Neutral Chin Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Pull Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Seated Cable Row', category: 'Back', tracking_type: 'weight_reps' },

  // Biceps
  { name: 'Barbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Cable Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Hammer Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Preacher Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'EZ-Bar Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'EZ-Bar Preacher Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Seated Incline Dumbbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Seated Machine Curl', category: 'Biceps', tracking_type: 'weight_reps' },

  // Cardio
  { name: 'Running (Outdoor)', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Running (Treadmill)', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Walking', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Stationary Bike', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Cycling', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Swimming', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Rowing Machine', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Rope Jump', category: 'Cardio', tracking_type: 'time_only' },
  { name: 'Ball Push Catch', category: 'Cardio', tracking_type: 'weight_reps' },
  { name: 'Dead Bug', category: 'Cardio', tracking_type: 'weight_reps' },
  { name: 'Glute Bridges', category: 'Cardio', tracking_type: 'weight_reps' },

  // Chest
  { name: 'Flat Barbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Incline Barbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Decline Barbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Flat Dumbbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Incline Dumbbell Bench Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Flat Dumbbell Fly', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Incline Dumbbell Fly', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Dand', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Incline Hammer Strength Chest Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Decline Hammer Strength Chest Press', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Cable Crossover', category: 'Chest', tracking_type: 'weight_reps' },
  { name: 'Seated Machine Fly', category: 'Chest', tracking_type: 'weight_reps' },

  // Legs
  { name: 'Barbell Squat', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Barbell Front Squat', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Barbell Stiff-Legged Deadlift', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Sumo Deadlift', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Db Romanian Deadlift', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Romanian Deadlift', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Bulgarian Split Squat', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Bodyweight Squats', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Leg Press', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Leg Extension Machine', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Lying Leg Curl Machine', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Seated Leg Curl Machine', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Machine Glute Bridge', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Seated Calf Raise Machine', category: 'Legs', tracking_type: 'weight_reps' },
  { name: 'Lunges', category: 'Legs', tracking_type: 'weight_reps' },

  // Shoulders
  { name: 'Barbell Overhead Press', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Seated Dumbbell Press', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Smith Machine Overhead Press', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Lateral Dumbbell Raise', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Seated Dumbbell Lateral Raise', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Front Dumbbell Raise', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Rear Delt Dumbbell Raise', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Rear Delt Machine Fly', category: 'Shoulders', tracking_type: 'weight_reps' },
  { name: 'Cable Face Pull', category: 'Shoulders', tracking_type: 'weight_reps' },

  // Triceps
  { name: 'Close Grip Barbell Bench Press', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Overhead Triceps Extension', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Cable Overhead Triceps Extension', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'EZ-Bar Skullcrusher', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Parallel Bar Triceps Dip', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Triceps Push Down', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Rope Push Down', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'V-Bar Push Down', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Smith Machine Close Grip Bench Press', category: 'Triceps', tracking_type: 'weight_reps' },
];

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
