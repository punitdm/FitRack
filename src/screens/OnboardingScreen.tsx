import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import * as SQLite from 'expo-sqlite';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ArrowDownToLine, Check, ChevronLeft, Dumbbell, Sparkles } from 'lucide-react-native';
import { format } from 'date-fns';
import { Text, TextInput } from '../components/common/Typography';
import { Button } from '../components/common/Button';
import { useTheme } from '../theme/theme';
import { haptics } from '../utils/haptics';
import { useUnits, WeightUnit } from '../utils/units';
import { DEFAULT_PROFILE, Profile, Sex, saveProfile } from '../db/profile';
import { DEFAULT_GOALS, saveNutritionGoals } from '../db/nutrition';

export const ONBOARDED_KEY = 'onboarded';

/** True when this install has never finished onboarding and has no data yet. */
export async function needsOnboarding(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const done = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [ONBOARDED_KEY]);
  if (done) return false;
  const any = await db.getFirstAsync<{ c: number }>(
    `SELECT (SELECT COUNT(*) FROM exercise_logs) + (SELECT COUNT(*) FROM macro_logs) + (SELECT COUNT(*) FROM body_stats) AS c`
  );
  if ((any?.c ?? 0) > 0) {
    // Existing user from before onboarding existed: don't interrupt them.
    await markOnboarded(db);
    return false;
  }
  return true;
}

async function markOnboarded(db: SQLite.SQLiteDatabase) {
  await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    ONBOARDED_KEY,
    '1',
  ]);
}

const STEPS = 5;

/**
 * First-run setup: who you are, units + weight, daily goals, and an offer to
 * import from FitNotes / GymMane. Every step can be skipped and changed later.
 */
export const OnboardingScreen: React.FC<{ db: SQLite.SQLiteDatabase; onDone: (openImport: boolean) => void }> = ({ db, onDone }) => {
  const { colors } = useTheme();
  const units = useUnits();
  const { height: screenH } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [heightText, setHeightText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [kcalText, setKcalText] = useState(String(DEFAULT_GOALS.calories));
  const [proteinText, setProteinText] = useState(String(DEFAULT_GOALS.protein));
  const [saving, setSaving] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const num = (t: string) => {
    const n = parseFloat(t.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const go = (to: number) => {
    haptics.select();
    setStep(to);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const finish = async (openImport: boolean) => {
    setSaving(true);
    try {
      await saveProfile(db, { ...profile, name: profile.name.trim(), heightCm: num(heightText) ? Math.round(num(heightText)!) : null });
      const w = num(weightText);
      if (w) {
        await db.runAsync(
          `INSERT INTO body_stats (date, weight_kg) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg`,
          [format(new Date(), 'yyyy-MM-dd'), Math.round(units.fromDisplay(w) * 100) / 100]
        );
      }
      await saveNutritionGoals(db, {
        ...DEFAULT_GOALS,
        calories: Math.round(num(kcalText) ?? DEFAULT_GOALS.calories),
        protein: Math.round(num(proteinText) ?? DEFAULT_GOALS.protein),
      });
      await markOnboarded(db);
      haptics.success();
      onDone(openImport);
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { color: colors.text, backgroundColor: colors.surfaceCard, borderColor: colors.border }];

  const Choice: React.FC<{ on: boolean; label: string; onPress: () => void }> = ({ on, label, onPress }) => (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.choice, { backgroundColor: on ? colors.primaryMuted : colors.surfaceCard, borderColor: on ? colors.primary : colors.border }]}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.choiceText, { color: on ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  );

  const body = useMemo(() => {
    switch (step) {
      case 0:
        return (
          <View style={[styles.welcome, { minHeight: screenH * 0.62 }]}>
            <View style={[styles.logo, { backgroundColor: colors.primaryMuted }]}>
              <Dumbbell size={44} color={colors.primary} />
            </View>
            <Text style={[styles.hero, { color: colors.text }]}>Welcome to FitRack</Text>
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              Your workouts, nutrition and body in one place. Everything stays on your phone, no account needed.
            </Text>
            {['Log sets in seconds', 'Meals, macros and water', 'Progress, streaks and muscle map'].map((t) => (
              <View key={t} style={styles.bullet}>
                <View style={[styles.bulletIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Check size={14} color={colors.primary} strokeWidth={3} />
                </View>
                <Text style={[styles.bulletText, { color: colors.text }]}>{t}</Text>
              </View>
            ))}
          </View>
        );
      case 1:
        return (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>About you</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Used for your profile and strength levels. All optional.</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput style={input} value={profile.name} onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} placeholder="Your name" placeholderTextColor={colors.textDisabled} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sex</Text>
            <View style={styles.row}>
              {(
                [
                  ['male', 'Male'],
                  ['female', 'Female'],
                  ['other', 'Other'],
                ] as [Sex, string][]
              ).map(([k, l]) => (
                <Choice key={k} on={profile.sex === k} label={l} onPress={() => setProfile((p) => ({ ...p, sex: p.sex === k ? '' : k }))} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Height (cm)</Text>
            <TextInput style={input} value={heightText} onChangeText={setHeightText} keyboardType="number-pad" placeholder="175" placeholderTextColor={colors.textDisabled} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Workouts per week</Text>
            <View style={styles.row}>
              {[2, 3, 4, 5, 6].map((n) => (
                <Choice key={n} on={profile.weeklyGoal === n} label={String(n)} onPress={() => setProfile((p) => ({ ...p, weeklyGoal: n }))} />
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>Units and weight</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>You can switch units any time in Settings.</Text>
            <View style={styles.row}>
              {(
                [
                  ['kg', 'Kilograms'],
                  ['lb', 'Pounds'],
                ] as [WeightUnit, string][]
              ).map(([u, l]) => (
                <Choice key={u} on={units.unit === u} label={l} onPress={() => units.setUnit(u)} />
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Current body weight ({units.label})</Text>
            <TextInput style={input} value={weightText} onChangeText={setWeightText} keyboardType="decimal-pad" placeholder={units.unit === 'lb' ? '180' : '80'} placeholderTextColor={colors.textDisabled} />
          </View>
        );
      case 3:
        return (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>Daily goals</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>A starting point for Nutrition. Fine-tune carbs, fat and water later.</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Calories (kcal)</Text>
            <TextInput style={input} value={kcalText} onChangeText={setKcalText} keyboardType="number-pad" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Protein (g)</Text>
            <TextInput style={input} value={proteinText} onChangeText={setProteinText} keyboardType="number-pad" />
            {num(weightText) ? (
              <Text style={[styles.tip, { color: colors.textMuted }]}>
                Tip: about {Math.round(units.fromDisplay(num(weightText)!) * 1.8)} g of protein a day suits most people who lift.
              </Text>
            ) : null}
          </View>
        );
      default:
        return (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>Bring your history?</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Coming from another app? Import your workouts, body stats and meals so your progress starts where you left off.
            </Text>
            <Pressable
              onPress={() => finish(true)}
              style={[styles.bigOption, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <View style={[styles.bulletIcon, { backgroundColor: colors.primaryMuted, width: 40, height: 40, borderRadius: 20 }]}>
                <ArrowDownToLine size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Import from FitNotes or GymMane</Text>
                <Text style={[styles.optionSub, { color: colors.textMuted }]}>Or restore a FitRack backup</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => finish(false)}
              style={[styles.bigOption, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <View style={[styles.bulletIcon, { backgroundColor: colors.primaryMuted, width: 40, height: 40, borderRadius: 20 }]}>
                <Sparkles size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Start fresh</Text>
                <Text style={[styles.optionSub, { color: colors.textMuted }]}>Log your first workout today</Text>
              </View>
            </Pressable>
          </View>
        );
    }
  }, [step, profile, heightText, weightText, kcalText, proteinText, units, colors, screenH]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        {step > 0 ? (
          <Pressable onPress={() => go(step - 1)} hitSlop={10} style={styles.back} accessibilityLabel="Back">
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.dots}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.surfaceHighlight, width: i === step ? 22 : 8 }]} />
          ))}
        </View>
        {step > 0 && step < STEPS - 1 ? (
          <Pressable onPress={() => go(STEPS - 1)} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.skip, { color: colors.textMuted }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={step === 0 ? FadeIn.duration(400) : FadeInDown.duration(260)}>
          {body}
        </Animated.View>
      </ScrollView>

      {step < STEPS - 1 && (
        <View style={styles.footer}>
          <Button title={step === 0 ? 'Get started' : 'Continue'} size="lg" loading={saving} onPress={() => go(step + 1)} style={{ borderRadius: 16 }} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, height: 52 },
  back: { width: 34, height: 34, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  skip: { fontSize: 15, fontWeight: '700' },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },
  welcome: { justifyContent: 'center', gap: 14 },
  logo: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  hero: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  lead: { fontSize: 16, lineHeight: 23, marginBottom: 8 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bulletText: { fontSize: 16, fontWeight: '600' },
  form: { gap: 10, paddingTop: 16 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  sub: { fontSize: 15, lineHeight: 21, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 15, fontWeight: '700' },
  tip: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  bigOption: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 16, marginTop: 6 },
  optionTitle: { fontSize: 16, fontWeight: '800' },
  optionSub: { fontSize: 13, marginTop: 2 },
  footer: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 8 },
});
