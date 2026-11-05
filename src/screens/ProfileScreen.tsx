import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Circle } from 'react-native-svg';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import {
  Settings,
  Pencil,
  Dumbbell,
  Timer,
  TrendingUp,
  Scale,
  Flame,
  Trophy,
  ChevronRight,
  HardDrive,
  ArrowDownToLine,
  Palette,
  BookOpen,
  Info,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { format, parseISO } from 'date-fns';

import { Text, TextInput } from '../components/common/Typography';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { FadeInUp, ScalePressable, prefersReducedMotion } from '../components/common/Motion';
import { useTheme, borderRadius, spacing } from '../theme/theme';
import { getPersonalRecords } from '../db/database';
import { PersonalRecord } from '../types/database';
import {
  DEFAULT_PROFILE,
  Profile,
  ProfileStats,
  Sex,
  bmi,
  formatVolume,
  getProfile,
  getProfileStats,
  saveProfile,
} from '../db/profile';
import type { SettingsSubScreenKey } from './ImportExportScreen';
import { haptics } from '../utils/haptics';

import { useTabBarSpace } from '../components/common/tabBarSpace';
import { useUnits } from '../utils/units';
interface ProfileScreenProps {
  db: SQLite.SQLiteDatabase;
  onOpenSettings: () => void;
  onOpenSettingsPage: (key: SettingsSubScreenKey) => void;
  onOpenBody: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
  /** Bumped when the tab regains focus so stats refresh. */
  refreshToken?: number;
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FR';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  db,
  onOpenSettings,
  onOpenSettingsPage,
  onOpenBody,
  onShowToast,
  refreshToken,
}) => {
  const { colors } = useTheme();
  const u = useUnits();
  const tabBarSpace = useTabBarSpace();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, records] = await Promise.all([getProfile(db), getProfileStats(db), getPersonalRecords(db)]);
      setProfile(p);
      setStats(s);
      setPrs([...records].sort((a, b) => b.estimated1RM - a.estimated1RM).slice(0, 3));
    } catch (e) {
      console.error('Profile load failed:', e);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const save = async (p: Profile) => {
    try {
      await saveProfile(db, p);
      setProfile(p);
      setIsEditing(false);
      onShowToast('success', 'Profile saved');
    } catch (e: any) {
      onShowToast('error', `Couldn't save profile: ${e?.message || e}`);
    }
  };

  const displayName = profile.name.trim() || 'Athlete';
  const since = stats?.firstWorkoutDate ? format(parseISO(stats.firstWorkoutDate), 'MMM yyyy') : null;
  const lifted = u.fmtVolume(stats?.totalVolumeKg ?? 0);
  const liftedYear = u.fmtVolume(stats?.volumeThisYearKg ?? 0);
  const liftedMonth = u.fmtVolume(selectedMonth === null ? 0 : stats?.volumeByMonth[selectedMonth] ?? 0);
  const year = format(new Date(), 'yyyy');
  const bodyMassIndex = bmi(stats?.latestWeightKg ?? null, profile.heightCm);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
        {/* Header: banner, avatar, name */}
        <View style={styles.banner}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.55" />
                <Stop offset="0.55" stopColor={colors.pillars.running.accent} stopOpacity="0.28" />
                <Stop offset="1" stopColor={colors.background} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#bannerGrad)" />
            <Circle cx="88%" cy="18%" r="70" fill={colors.primary} opacity={0.12} />
            <Circle cx="12%" cy="95%" r="50" fill={colors.pillars.running.accent} opacity={0.1} />
          </Svg>
          <View style={styles.bannerTop}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Profile</Text>
            <ScalePressable
              style={[styles.roundBtn, { backgroundColor: 'rgba(0,0,0,0.28)' }]}
              onPress={onOpenSettings}
              pressedScale={0.9}
              accessibilityLabel="Settings"
            >
              <Settings size={18} color="#FFFFFF" />
            </ScalePressable>
          </View>
        </View>

        <View style={styles.identity}>
          <View style={[styles.avatarRing, { backgroundColor: colors.background }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(profile.name)}</Text>
            </View>
          </View>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.since, { color: colors.textMuted }]}>
                {since ? `Training since ${since}` : 'Log a workout to start your story'}
                {profile.age ? ` · ${profile.age} yrs` : ''}
                {profile.heightCm ? ` · ${profile.heightCm} cm` : ''}
              </Text>
            </View>
            <ScalePressable
              style={[styles.editPill, { backgroundColor: colors.surfaceCard }]}
              onPress={() => setIsEditing(true)}
              accessibilityLabel="Edit profile"
            >
              <Pencil size={12} color={colors.textSecondary} />
              <Text style={[styles.editText, { color: colors.textSecondary }]}>Edit profile</Text>
            </ScalePressable>
          </View>
        </View>

        {/* Stat pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={styles.pillsScroll}>
          <Pill icon={<Dumbbell size={15} color={colors.text} />} value={`${stats?.totalWorkouts ?? 0}`} label="workouts" />
          <Pill icon={<Flame size={15} color={colors.warning} />} value={`${stats?.weekStreak ?? 0}`} label="week streak" />
          <Pill icon={<Timer size={15} color={colors.text} />} value={`~${stats?.estimatedHours ?? 0} h`} label="trained" />
          <Pill icon={<TrendingUp size={15} color={colors.text} />} value={`${lifted.value} ${lifted.unit}`} label="lifted" />
          {stats?.latestWeightKg ? (
            <Pill icon={<Scale size={15} color={colors.text} />} value={u.fmt(stats.latestWeightKg)} label="" />
          ) : null}
        </ScrollView>

        <View style={styles.sections}>
          {/* This week */}
          <FadeInUp delay={40}>
            <View style={[styles.card, { backgroundColor: colors.surfaceCard }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>This week</Text>
                <Text style={[styles.cardCount, { color: colors.textMuted }]}>
                  {stats?.workoutsThisWeek ?? 0} of {profile.weeklyGoal} workouts
                </Text>
              </View>
              <View style={styles.weekDots}>
                {Array.from({ length: profile.weeklyGoal }, (_, i) => {
                  const done = i < (stats?.workoutsThisWeek ?? 0);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.weekDot,
                        { backgroundColor: done ? colors.primary : colors.surfaceHighlight },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </FadeInUp>

          {/* This year: tap a month to see just that month */}
          <FadeInUp delay={90}>
            <View style={[styles.card, { backgroundColor: colors.surfaceCard }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {selectedMonth === null ? year : `${MONTH_NAMES[selectedMonth]} ${year}`}
                </Text>
                {selectedMonth !== null ? (
                  <Pressable
                    onPress={() => {
                      haptics.select();
                      setSelectedMonth(null);
                    }}
                    hitSlop={8}
                    style={[styles.yearChip, { backgroundColor: colors.surfaceHighlight }]}
                    accessibilityRole="button"
                    accessibilityLabel="Show whole year"
                  >
                    <Text style={[styles.yearChipText, { color: colors.textSecondary }]}>Show year</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.cardCount, { color: colors.textMuted }]}>Tap a month</Text>
                )}
              </View>
              <Animated.View key={selectedMonth ?? 'year'} entering={FadeIn.duration(220)} style={styles.yearStats}>
                {selectedMonth === null ? (
                  <>
                    <YearStat value={`${stats?.workoutsThisYear ?? 0}`} suffix="" label="Workouts" />
                    <YearStat value={liftedYear.value} suffix={` ${liftedYear.unit}`} label="Lifted" />
                    <YearStat value={`${stats?.monthsTrainedThisYear ?? 0}`} suffix="/12" label="Months" />
                  </>
                ) : (
                  <>
                    <YearStat value={`${stats?.workoutsByMonth[selectedMonth] ?? 0}`} suffix="" label="Workouts" />
                    <YearStat value={liftedMonth.value} suffix={` ${liftedMonth.unit}`} label="Lifted" />
                    <YearStat value={`${stats?.setsByMonth[selectedMonth] ?? 0}`} suffix="" label="Sets" />
                  </>
                )}
              </Animated.View>
              <MonthBars
                counts={stats?.workoutsByMonth ?? Array(12).fill(0)}
                selected={selectedMonth}
                onSelect={(i) => {
                  haptics.select();
                  setSelectedMonth((cur) => (cur === i ? null : i));
                }}
              />
            </View>
          </FadeInUp>

          {/* Personal bests */}
          {prs.length > 0 && (
            <FadeInUp delay={140}>
              <View style={[styles.card, { backgroundColor: colors.surfaceCard }]}>
                <View style={styles.cardHead}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Personal bests</Text>
                  <Trophy size={16} color={colors.warning} />
                </View>
                {prs.map((pr, i) => (
                  <View
                    key={pr.exerciseId}
                    style={[styles.prRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prName, { color: colors.text }]} numberOfLines={1}>
                        {pr.exerciseName}
                      </Text>
                      <Text style={[styles.prSub, { color: colors.textMuted }]}>
                        {u.fmt(pr.maxWeightKg)} × {pr.maxRepsAtMaxWeight} · {format(parseISO(pr.dateAchieved), 'd MMM yyyy')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.prValue, { color: colors.text }]}>{u.fmt(pr.estimated1RM, { decimals: 0 })}</Text>
                      <Text style={[styles.prSub, { color: colors.textMuted }]}>est. 1RM</Text>
                    </View>
                  </View>
                ))}
              </View>
            </FadeInUp>
          )}

          {/* Body */}
          <FadeInUp delay={190}>
            <ScalePressable
              style={[styles.card, { backgroundColor: colors.surfaceCard }]}
              onPress={onOpenBody}
              pressedScale={0.985}
              accessibilityLabel="Open body tracker"
            >
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Body</Text>
                <ChevronRight size={18} color={colors.textMuted} />
              </View>
              <View style={styles.yearStats}>
                <YearStat value={stats?.latestWeightKg ? u.fmt(stats.latestWeightKg, { unit: false }) : '—'} suffix={stats?.latestWeightKg ? ` ${u.label}` : ''} label="Weight" />
                <YearStat
                  value={stats?.weightChange30dKg != null ? `${stats.weightChange30dKg > 0 ? '+' : stats.weightChange30dKg < 0 ? '-' : ''}${u.fmt(Math.abs(stats.weightChange30dKg), { unit: false })}` : '—'}
                  suffix={stats?.weightChange30dKg != null ? ` ${u.label}` : ''}
                  label="30 days"
                />
                <YearStat value={bodyMassIndex ? `${bodyMassIndex}` : '—'} suffix="" label={profile.heightCm ? 'BMI' : 'BMI (add height)'} />
              </View>
            </ScalePressable>
          </FadeInUp>

        </View>
      </ScrollView>

      <EditProfileSheet visible={isEditing} profile={profile} onClose={() => setIsEditing(false)} onSave={save} />
    </View>
  );
};

// ---------------------------------------------------------------------------

const Pill: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceCard }]}>
      {icon}
      <Text style={[styles.pillValue, { color: colors.text }]}>{value}</Text>
      {!!label && <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>{label}</Text>}
    </View>
  );
};

const YearStat: React.FC<{ value: string; suffix: string; label: string }> = ({ value, suffix, label }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.yearValue, { color: colors.text }]}>
        {value}
        <Text style={[styles.yearSuffix, { color: colors.textMuted }]}>{suffix}</Text>
      </Text>
      <Text style={[styles.yearLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const Bar: React.FC<{ pct: number; color: string; delay: number }> = ({ pct, color, delay }) => {
  const h = useSharedValue(prefersReducedMotion() ? pct : 0);
  useEffect(() => {
    h.value = prefersReducedMotion() ? pct : withDelay(delay, withTiming(pct, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [pct, delay, h]);
  const style = useAnimatedStyle(() => ({ height: `${Math.max(4, h.value * 100)}%` }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
};

const MonthBars: React.FC<{ counts: number[]; selected: number | null; onSelect: (month: number) => void }> = ({
  counts,
  selected,
  onSelect,
}) => {
  const { colors } = useTheme();
  const peak = Math.max(1, ...counts);
  const now = new Date().getMonth();
  return (
    <View style={styles.bars}>
      {counts.map((c, i) => {
        const isSelected = selected === i;
        const highlight = selected === null ? i === now : isSelected;
        return (
          <Pressable
            key={i}
            style={styles.barCol}
            onPress={() => onSelect(i)}
            hitSlop={{ top: 8, bottom: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${MONTH_NAMES[i]}: ${c} workouts`}
          >
            <View style={[styles.barTrack, isSelected && { backgroundColor: colors.primaryMuted, borderRadius: 6 }]}>
              <Bar
                pct={c / peak}
                delay={i * 30}
                color={highlight ? colors.primary : c > 0 ? colors.textMuted : colors.surfaceHighlight}
              />
            </View>
            <Text style={[styles.barLabel, { color: highlight ? colors.text : colors.textMuted }]}>{MONTHS[i]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const EditProfileSheet: React.FC<{
  visible: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => void;
}> = ({ visible, profile, onClose, onSave }) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState<Sex>('');
  const [weekly, setWeekly] = useState(4);

  useEffect(() => {
    if (!visible) return;
    setName(profile.name);
    setAge(profile.age ? String(profile.age) : '');
    setHeight(profile.heightCm ? String(profile.heightCm) : '');
    setSex(profile.sex);
    setWeekly(profile.weeklyGoal);
  }, [visible, profile]);

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };

  const input = [styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }];

  return (
    <Modal visible={visible} onClose={onClose} title="Edit profile">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
        <TextInput style={input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textDisabled} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Age</Text>
            <TextInput style={input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.textDisabled} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
            <TextInput style={input} value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.textDisabled} />
          </View>
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Sex</Text>
        <View style={styles.segment}>
          {(
            [
              ['male', 'Male'],
              ['female', 'Female'],
              ['other', 'Other'],
            ] as [Sex, string][]
          ).map(([key, label]) => {
            const on = sex === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  haptics.select();
                  setSex(on ? '' : key);
                }}
                style={[styles.segmentBtn, { backgroundColor: on ? colors.primaryMuted : colors.background, borderColor: on ? colors.primary : colors.border }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.segmentText, { color: on ? colors.primary : colors.textSecondary }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weekly goal: {weekly} workouts</Text>
        <View style={styles.segment}>
          {[2, 3, 4, 5, 6].map((n) => {
            const on = weekly === n;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  haptics.select();
                  setWeekly(n);
                }}
                style={[styles.segmentBtn, { backgroundColor: on ? colors.primaryMuted : colors.background, borderColor: on ? colors.primary : colors.border }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.segmentText, { color: on ? colors.primary : colors.textSecondary }]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          title="Save profile"
          size="lg"
          style={{ borderRadius: 14, marginTop: 4 }}
          onPress={() => onSave({ name: name.trim(), age: num(age), heightCm: num(height), sex, weeklyGoal: weekly })}
        />
      </ScrollView>
    </Modal>
  );
};

// ---------------------------------------------------------------------------

const AVATAR = 88;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 32 },
  banner: { height: 150, overflow: 'hidden' },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bannerTitle: { fontSize: 17, fontWeight: '800' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  identity: { paddingHorizontal: spacing.lg, marginTop: -AVATAR / 2 - 4 },
  avatarRing: { width: AVATAR + 8, height: AVATAR + 8, borderRadius: (AVATAR + 8) / 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 10 },
  name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  since: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 16 },
  editText: { fontSize: 12, fontWeight: '700' },

  pillsScroll: { marginTop: 18 },
  pills: { paddingHorizontal: spacing.lg, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 36, paddingHorizontal: 13, borderRadius: 18 },
  pillValue: { fontSize: 14, fontWeight: '800' },
  pillLabel: { fontSize: 13, fontWeight: '500' },

  sections: { paddingHorizontal: spacing.lg, paddingTop: 22, gap: 14 },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  cardCount: { fontSize: 13, fontWeight: '600' },
  weekDots: { flexDirection: 'row', gap: 8 },
  weekDot: { flex: 1, height: 10, borderRadius: 5 },

  yearStats: { flexDirection: 'row', gap: 10 },
  yearValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  yearSuffix: { fontSize: 14, fontWeight: '700' },
  yearLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 92 },
  barCol: { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, fontWeight: '700' },
  yearChip: { paddingHorizontal: 10, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  yearChipText: { fontSize: 12, fontWeight: '700' },

  prRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  prName: { fontSize: 15, fontWeight: '700' },
  prSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  prValue: { fontSize: 17, fontWeight: '800' },

  groupTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginTop: 8, marginBottom: 10 },
  settingsCard: { padding: 0, gap: 0, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 13 },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingsText: { flex: 1, fontSize: 15, fontWeight: '600' },

  fieldLabel: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, fontSize: 16, fontWeight: '600' },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontWeight: '700' },
});
