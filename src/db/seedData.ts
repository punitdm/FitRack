import { TrackingType } from '../types/database';

export const CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Core',
  'Cardio',
] as const;

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

export const PRESEEDED_EXERCISES: PreseededExercise[] = [
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

  // Back
  { name: 'Deadlift', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Barbell Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Lat Pulldown', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Seated Cable Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Pull Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Chin Up', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'T-Bar Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Single Arm Dumbbell Row', category: 'Back', tracking_type: 'weight_reps' },
  { name: 'Back Extension', category: 'Back', tracking_type: 'weight_reps' },

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

  // Biceps
  { name: 'Barbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Dumbbell Bicep Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Hammer Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Preacher Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Incline Dumbbell Curl', category: 'Biceps', tracking_type: 'weight_reps' },
  { name: 'Concentration Curl', category: 'Biceps', tracking_type: 'weight_reps' },

  // Triceps
  { name: 'Rope Push Down', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Skull Crushers', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Tricep Dip Machine', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Overhead Dumbbell Tricep Extension', category: 'Triceps', tracking_type: 'weight_reps' },
  { name: 'Close Grip Bench Press', category: 'Triceps', tracking_type: 'weight_reps' },

  // Core / Abs
  { name: 'Hanging Leg Raises', category: 'Core', tracking_type: 'weight_reps' },
  { name: 'Plank', category: 'Core', tracking_type: 'time_only' },
  { name: 'Cable Woodchopper', category: 'Core', tracking_type: 'weight_reps' },
  { name: 'Ab Rollout', category: 'Core', tracking_type: 'weight_reps' },
  { name: 'Decline Crunch', category: 'Core', tracking_type: 'weight_reps' },

  // Cardio / Running
  { name: 'Treadmill Running', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Outdoor Running', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Stationary Cycling', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Rowing Machine', category: 'Cardio', tracking_type: 'distance_time' },
  { name: 'Jump Rope', category: 'Cardio', tracking_type: 'time_only' },
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
      { name: 'Barbell Row', target_sets: 4, target_reps: 6, target_weight: 60 },
      { name: 'Overhead Shoulder Press', target_sets: 3, target_reps: 8, target_weight: 40 },
      { name: 'Pull Up', target_sets: 3, target_reps: 8, target_weight: 0 },
      { name: 'Skull Crushers', target_sets: 3, target_reps: 10, target_weight: 25 },
      { name: 'Incline Dumbbell Curl', target_sets: 3, target_reps: 10, target_weight: 12.5 },
    ],
  },
];

// Replaced with User's Exact Actual Diet & Indian Food Items
export const PRESEEDED_FOODS: PreseededFood[] = [
  // --- Rotis, Paranthas & Grains ---
  { name: 'Roti with Ghee (1 pc)', serving_size_g: 40, calories: 115, protein: 2.5, carbs: 15, fat: 4.5 },
  { name: 'Plain Roti (1 pc)', serving_size_g: 35, calories: 75, protein: 2.5, carbs: 15, fat: 0.5 },
  { name: 'Aalu Parantha (1 pc)', serving_size_g: 90, calories: 220, protein: 4.5, carbs: 32, fat: 9 },
  { name: 'Plain Parantha (1 pc)', serving_size_g: 70, calories: 180, protein: 3, carbs: 25, fat: 8 },
  { name: 'Puri (1 pc)', serving_size_g: 30, calories: 100, protein: 1.5, carbs: 12, fat: 6 },
  { name: 'White Rice (Cooked 100g)', serving_size_g: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'White Rice (Cooked 150g)', serving_size_g: 150, calories: 195, protein: 4, carbs: 42, fat: 0.5 },
  { name: 'White Rice (Cooked 200g)', serving_size_g: 200, calories: 260, protein: 5.4, carbs: 56, fat: 0.6 },
  { name: 'Namkeen Chawal / Pulao (100g)', serving_size_g: 100, calories: 160, protein: 3, carbs: 26, fat: 5 },
  { name: 'Chicken Biryani (150g)', serving_size_g: 150, calories: 280, protein: 12, carbs: 35, fat: 10 },
  { name: 'Suji Pasta (100g Cooked)', serving_size_g: 100, calories: 180, protein: 6, carbs: 36, fat: 1 },
  { name: 'Maggi with Butter (50g)', serving_size_g: 50, calories: 240, protein: 4, carbs: 32, fat: 11 },

  // --- Dahi, Daals & Sabjis (1 Katori ~150g) ---
  { name: 'Dahi / Curd (1 Katori)', serving_size_g: 150, calories: 95, protein: 4.5, carbs: 6, fat: 5 },
  { name: 'Boondi Raita (1 Katori)', serving_size_g: 150, calories: 125, protein: 4, carbs: 10, fat: 7 },
  { name: 'Chana Dal (1 Katora)', serving_size_g: 200, calories: 160, protein: 9, carbs: 24, fat: 3 },
  { name: 'Kadhi (1 Katori)', serving_size_g: 150, calories: 130, protein: 4, carbs: 12, fat: 7 },
  { name: 'Aalu Baingan (1 Katori)', serving_size_g: 150, calories: 110, protein: 2, carbs: 16, fat: 5 },
  { name: 'Aalu Parwal (1 Katori)', serving_size_g: 150, calories: 110, protein: 2, carbs: 16, fat: 5 },
  { name: 'Aalu Sabji / Tari (1 Katori)', serving_size_g: 150, calories: 120, protein: 2, carbs: 18, fat: 5 },
  { name: 'Aalu Gajar (1 Katori)', serving_size_g: 150, calories: 100, protein: 2, carbs: 15, fat: 4 },
  { name: 'Aalu Palak (1 Katori)', serving_size_g: 150, calories: 115, protein: 3, carbs: 14, fat: 5 },
  { name: 'Aalu Soyabean (1 Katori)', serving_size_g: 150, calories: 160, protein: 11, carbs: 14, fat: 6 },
  { name: 'Bhindi ki Sabji (1 Katori)', serving_size_g: 150, calories: 90, protein: 2, carbs: 8, fat: 6 },
  { name: 'Ghiya / Lauki ki Sabji (1 Katori)', serving_size_g: 150, calories: 70, protein: 1.5, carbs: 7, fat: 4 },
  { name: 'Ghiya ke Kofte (1 Katori)', serving_size_g: 150, calories: 180, protein: 3, carbs: 14, fat: 12 },
  { name: 'Chana Dal Ghiya (1 Katori)', serving_size_g: 150, calories: 140, protein: 7, carbs: 18, fat: 4 },
  { name: 'Arvi ki Sabji (1 Katori)', serving_size_g: 150, calories: 120, protein: 1.5, carbs: 18, fat: 5 },
  { name: 'Paneer ki Sabji (1 Katori)', serving_size_g: 150, calories: 240, protein: 12, carbs: 8, fat: 18 },
  { name: 'Tinde / Rajma Mix (1 Katori)', serving_size_g: 150, calories: 130, protein: 5, carbs: 18, fat: 4 },

  // --- Supplements & Shakes ---
  { name: 'Whey Protein (1 Scoop)', serving_size_g: 33, calories: 120, protein: 25, carbs: 2, fat: 1.5 },
  { name: 'Whey Protein (1.25 Scoop)', serving_size_g: 41, calories: 150, protein: 31, carbs: 2.5, fat: 2 },
  { name: 'Creatine Monohydrate (1 Scoop)', serving_size_g: 5, calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'Banana Shake (1 Banana + 150ml Milk + 1 Scoop Whey)', serving_size_g: 300, calories: 320, protein: 30, carbs: 36, fat: 6 },
  { name: 'Banana Shake (2 Banana + 150ml Milk + 1 Scoop Whey)', serving_size_g: 400, calories: 420, protein: 31, carbs: 62, fat: 7 },
  { name: 'Banana (1 Medium)', serving_size_g: 100, calories: 90, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Milk (150ml)', serving_size_g: 150, calories: 95, protein: 4.5, carbs: 7.5, fat: 4.5 },

  // --- Eggs & Non-Veg ---
  { name: 'Boiled Egg (1 Whole)', serving_size_g: 50, calories: 72, protein: 6.3, carbs: 0.4, fat: 5 },
  { name: '2 Eggs Omelette', serving_size_g: 110, calories: 180, protein: 13, carbs: 1, fat: 14 },
  { name: '3 Eggs Scrambled Omelette', serving_size_g: 165, calories: 260, protein: 19, carbs: 2, fat: 20 },
  { name: '4 Eggs Omelette', serving_size_g: 220, calories: 350, protein: 25, carbs: 2, fat: 27 },
  { name: '2 Eggs Bread Omelette (2 Slices)', serving_size_g: 180, calories: 320, protein: 17, carbs: 26, fat: 16 },
  { name: 'Chicken Breast (Cooked 100g)', serving_size_g: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Chicken Breast (Cooked 250g)', serving_size_g: 250, calories: 410, protein: 77, carbs: 0, fat: 9 },
  { name: 'Chicken Breast (Cooked 350g)', serving_size_g: 350, calories: 580, protein: 108, carbs: 0, fat: 13 },
  { name: 'Chicken Curry / Roast (300g)', serving_size_g: 300, calories: 520, protein: 75, carbs: 4, fat: 22 },
  { name: 'Chicken Wings (30g)', serving_size_g: 30, calories: 85, protein: 7, carbs: 0, fat: 6 },

  // --- Snacks, Drinks & Beverages ---
  { name: 'Chai (1 Cup)', serving_size_g: 120, calories: 60, protein: 1.5, carbs: 8, fat: 2.5 },
  { name: 'Chai (1 Glass)', serving_size_g: 200, calories: 110, protein: 3, carbs: 15, fat: 4.5 },
  { name: 'Black Coffee (1 Big Cup)', serving_size_g: 250, calories: 5, protein: 0.3, carbs: 0, fat: 0 },
  { name: 'Bread with Ghee (1 Slice)', serving_size_g: 35, calories: 110, protein: 2.5, carbs: 14, fat: 5 },
  { name: 'Salted Peanuts (20g)', serving_size_g: 20, calories: 115, protein: 5, carbs: 3, fat: 10 },
  { name: 'Samosa (1 pc)', serving_size_g: 80, calories: 220, protein: 4, carbs: 24, fat: 12 },
  { name: 'Bourbon Biscuit (2 pcs)', serving_size_g: 25, calories: 100, protein: 1, carbs: 14, fat: 4.5 },
  { name: 'Mathri / Mathhi (1 pc)', serving_size_g: 25, calories: 110, protein: 1.5, carbs: 11, fat: 7 },
  { name: 'McPuff (1 pc)', serving_size_g: 90, calories: 230, protein: 4, carbs: 25, fat: 12 },
  { name: 'Paneer Momos (4 pcs)', serving_size_g: 100, calories: 220, protein: 8, carbs: 24, fat: 10 },
  { name: 'Diamond Triangle Chips (20g)', serving_size_g: 20, calories: 110, protein: 1.5, carbs: 12, fat: 6 },
  { name: 'Arora Lemon Drink (Small)', serving_size_g: 200, calories: 60, protein: 0, carbs: 15, fat: 0 },
  { name: 'Vodka (60ml / 2 pegs)', serving_size_g: 60, calories: 130, protein: 0, carbs: 0, fat: 0 },
  { name: 'Vodka with Lemon Soda (120ml / 4 pegs)', serving_size_g: 300, calories: 270, protein: 0, carbs: 6, fat: 0 },
];
