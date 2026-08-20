# 🏋️ FitRack — 100% Offline Fitness, Workout & Macro Tracker

[![React Native](https://img.shields.io/badge/React%20Native-0.76-blue.svg)](https://reactnative.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/Storage-100%25%20Offline%20SQLite-003B57.svg)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**FitRack** is a fast, privacy-first, **100% offline fitness tracking application** built with React Native, Expo, TypeScript, and SQLite. It combines the power and workflows of **FitNotes** with a **Material Design 3 dark/light interface**, dynamic accent color theming, and multi-metric analytics.

Zero cloud dependencies. Zero logins required. 100% of your data stays on your device in a local SQLite database with one-tap CSV backup and restore.

---

## ✨ Features

### 1. 🏠 Home Dashboard
- **Daily Goals Overview**: 3 circular meters tracking **Daily Protein**, **Workout Target**, and **Daily Calories**.
- **Food Today**: Remaining calories and protein left with a 1-tap quick log action.
- **Hydration Tracker**: Real-time fluid progress bar with fast increment pills (`+250ml`, `+500ml`) and undo button.
- **Weekly Consistency Streak**: Flame streak counter with `M T W T F S S` day indicators and workout completion badges.
- **This Week Summary**: Track distance (`km`), active time (`m`), and calories burned.

---

### 2. ⚡ Workout Logging & Superset Engine
- **FitNotes-Style Exercise Picker**:
  - Instant live search.
  - Drill-down muscle group categories: *Chest, Back, Legs, Shoulders, Biceps, Triceps, Abs, Cardio, Custom*.
  - Clean alphabetical exercise lists with quick custom exercise creation.
- **Set Logger**:
  - Log Weight (kg), Reps, RPE difficulty levels (*Easy*, *Moderate*, *Hard*), and set-specific notes/comments.
  - Automatic **Personal Record (PR)** trophy badges on breakthrough sets.
  - Previous workout benchmark comparison (`Last: 22.5kg × 8`).
- **🔗 Superset Pairing**:
  - Long-press on an exercise card or tap the link icon to select a partner exercise.
  - Groups them into a unified Superset card with neon accents and unlink controls.
- **📅 Interactive "Copy from Date" Calendar Picker**:
  - Tapping "Copy from Date" opens a past session calendar/list.
  - Preview all exercises and sets from that day with **checkboxes (all selected by default)**.
  - Selectively uncheck any sets you want to skip and copy the rest in 1 tap.
- **📋 Workout Routines & Splits Engine**:
  - Save custom routines (*Push, Pull, Legs, Upper, Lower, Full Body*).
  - 1-tap launch into today's workout with pre-filled target exercises, sets, and weights.
- **🏋️ Plate & Warm-Up Calculator**:
  - Visual barbell plate sleeve showing exact plates to load on each side (20kg / 15kg bar + 25kg, 20kg, 15kg, 10kg, 5kg, 2.5kg, 1.25kg plates).
  - Automated 4-tier warm-up pyramid generator (`Bar × 10` $\rightarrow$ `50% × 5` $\rightarrow$ `70% × 3` $\rightarrow$ `90% × 1`).

---

### 3. 📊 Analytics, Progression Graphs & Records
- **📈 Single-Exercise Deep-Dive Progression Charts**:
  - Interactive SVG line charts for Estimated 1RM (Epley formula), Max Weight, Workout Volume, and Max Reps.
  - Range filters: `1m`, `3m`, `6m`, `1y`, `All Time`.
  - Chronological history log list with individual set details and notes.
- **🍩 Category Breakdown & Donut Chart**:
  - Interactive SVG Donut chart displaying muscle group distribution.
  - Filterable by **Metric** (*Sets* vs *Volume*) and **Period** (*Week*, *Month*, *Year*, *All Time*).
  - 4-Box Summary Grid: `TOTAL WORKOUTS`, `TOTAL SETS`, `TOTAL REPS`, `TOTAL VOLUME (kgs)`.
- **🏋️ 1 RM – 15 RM Records Matrix**:
  - Full matrix table analyzing your peak weight achieved across every rep count from 1RM through 15RM.
- **📅 Multi-Color Muscle Group Dots Calendar**:
  - Continuous multi-month calendar view.
  - Under each date, colored indicator dots display the exact muscle groups trained (🔴 Chest, 🔵 Back, 🔷 Legs, 🟣 Shoulders, 🟢 Triceps, 🌸 Biceps, 🟠 Abs/Cardio).

---

### 4. 🥗 Offline Custom Food Database & Macro Tracker
- **Offline Food Catalog**: Search pre-seeded and custom-created foods (*Chicken Breast, Eggs, Oats, Salmon, Whey Protein, Rice, etc.*).
- **Portion & Gram Multiplier**: Enter grams (e.g. `150g`) to automatically compute exact Calories, Protein, Carbs, and Fats.
- Track Daily Calories, Protein (g), Carbs (g), and Fat (g) with macro ratio progress bars.
- Meal notes and food journal input.

---

### 5. 🎨 Material 3 Dynamic Theming
- **🌙 Dark & ☀️ Light Mode Switcher**:
  - Dark mode with Onyx surfaces and elevated card layers.
  - Light mode with clean Material 3 slate surfaces.
- **🌈 6-Color Accent Palette**:
  - 🟢 **Volt Green** (`#A3E635`) — Default
  - 🔵 **Cyan Blue** (`#38BDF8`) — FitNotes Classic
  - 🍃 **Emerald Mint** (`#10B981`) — Clean Wellness
  - 🟠 **Sunset Amber** (`#FB923C`) — Warm Energy
  - 🟣 **Electric Purple** (`#A855F7`) — Modern Synth
  - 🔴 **Crimson Rose** (`#F43F5E`) — Bold Intensity
- **💾 Local Persistence**: Themes and accents are stored locally in the `app_settings` SQLite table and restored automatically on boot.

---

### 6. 💾 100% Offline Data Portability (CSV Import/Export)
- **Import**: Auto-detects and imports existing CSV backups from **FitNotes**, Google Sheets, or Excel.
- **Export**: Generates native `.csv` files for *ExerciseLogs.csv*, *MealLogs.csv*, *BodyStats.csv*, and *Exercises.csv* using native Android sharing.

---

## 🛠️ Tech Stack

- **Core**: React Native (Expo SDK 54)
- **Language**: TypeScript
- **Database**: `expo-sqlite` (Native embedded SQLite)
- **Safe Area**: `react-native-safe-area-context`
- **Charts & Graphics**: `react-native-svg`
- **Icons**: `lucide-react-native`
- **Date Handling**: `date-fns`
- **File System / Sharing**: `expo-file-system`, `expo-document-picker`, `expo-sharing`, `papaparse`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone repository
git clone https://github.com/punitdm/FitRack.git
cd FitRack/fitrack

# Install dependencies
npm install

# Start local development server
npm run start
```

### Running on Android Device
1. Install **Expo Go** from the Google Play Store.
2. Scan the QR code displayed in the terminal.

---

## 📦 Building Standalone Android APK

FitRack is pre-configured with `eas.json` for creating standalone `.apk` files:

```bash
# Build standalone APK via EAS Cloud
npx eas-cli build -p android --profile preview
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
