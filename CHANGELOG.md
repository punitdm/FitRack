# Changelog

## 1.3.0 — 2026-11-14

### Platform
- Upgraded to **Expo SDK 58**: React Native 0.88, React 19.3, Reanimated 4.7, Gesture Handler 3.3, and every Expo module on its SDK 58 version.
- Works with the current Expo Go from the Play Store (SDK 58).
- Android release builds now use R8, which shrinks the code (on by default in SDK 58).
- The APK build on GitHub Actions now uses Node 22, which React Native 0.88 requires.

### Fixes
- **Keyboard no longer covers bottom sheets.** Quick add, Daily goals, Edit profile, weight logging, Measurements and the exercise search now slide up above the keyboard and scroll if they don't fit.
- **Quick add and Daily goals keep every digit.** Typing 25 used to leave only 5, because the box re-selected its text after the first digit.
- **Enter moves to the next box** in Quick add (Name → Calories → Protein → Carbs → Fat) and Daily goals (Calories → Protein → Carbs → Fat → Water). On the last box it closes the keyboard.
- **The tab bar blurs again on Android.** SDK 58 needs a blur target, and without one the bar showed a flat tint. It now blurs the content of the open tab.

### Housekeeping
- Removed app config fields that SDK 58 no longer accepts (`newArchEnabled`, the top-level `splash`, and `android.edgeToEdgeEnabled`). The New Architecture and edge-to-edge are always on now, and the splash screen comes from the `expo-splash-screen` plugin.
- Updated code types for React Native 0.88's stricter TypeScript types. This doesn't change how anything behaves.

## 1.2.2 — 2026-11-05
- CI: fixed the APK build by moving to `setup-android` v4.

## 1.2.0 — 2026-11-05
- Redesign. Native navigation and smooth animations, a floating blurred tab bar, and Settings moved into Profile.
- Progress: an Overview with hero tiles, consistency, a tappable muscle map, a radar chart, this week, strength (est. 1RM) with search, readiness, and measurements. A bodyweight history sheet. Breakdown, Nutrition and Body tabs.
- Nutrition: meals ordered Breakfast, Lunch, Snacks, Dinner. Remove food, undo, and a water bottle you tap to fill.
- Home streak header. Profile with a tappable monthly chart.
- Importers for FitNotes (.fitnotes and CSV) and GymMane (.json). A universal JSON backup and restore that merges with what's already there.
- kg and lb units, the Inter font, haptics, and a new app icon and splash screen.
