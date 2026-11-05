import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { format } from 'date-fns';
import { Text } from '../common/Typography';
import { FadeInUp } from '../common/Motion';
import { useTheme } from '../../theme/theme';
import { ProgressData, heroBodyweight, heroVolume, loadProgressData } from '../../analytics/progress';
import { HeroTiles } from './HeroTiles';
import { ConsistencyCard } from './ConsistencyCard';
import { MuscleMapCard } from './MuscleMapCard';
import { RadarCard } from './RadarCard';
import { ThisWeekCard } from './ThisWeekCard';
import { ReadinessCard, StrengthCard } from './StrengthCard';
import { getWeightGoal, saveWeightGoal } from '../../db/profile';
import { MeasurementsCard } from './MeasurementsCard';

import { SkeletonCard } from '../common/Polish';
interface ProgressOverviewProps {
  db: SQLite.SQLiteDatabase;
  /** Changes whenever the data should be reloaded (focus, pull to refresh). */
  reloadKey: number;
  onOpenDay?: (date: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

/**
 * Progress overview, in this order:
 * volume & weight → consistency → muscle map → radar → strength →
 * this week → sleep & energy → measurements.
 */
export const ProgressOverview: React.FC<ProgressOverviewProps> = ({ db, reloadKey, onOpenDay, onShowToast }) => {
  const { colors } = useTheme();
  const [data, setData] = useState<ProgressData | null>(null);
  const [goalKg, setGoalKg] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, g] = await Promise.all([loadProgressData(db), getWeightGoal(db)]);
      setData(d);
      setGoalKg(g);
    } catch (e) {
      console.error('Progress load failed:', e);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const logWeight = async (kg: number) => {
    try {
      await db.runAsync(
        `INSERT INTO body_stats (date, weight_kg) VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg`,
        [format(new Date(), 'yyyy-MM-dd'), kg]
      );
      onShowToast('success', 'Weigh-in saved');
      load();
    } catch (e: any) {
      onShowToast('error', `Couldn't save weight: ${e?.message || e}`);
    }
  };

  const saveGoal = async (kg: number | null) => {
    try {
      await saveWeightGoal(db, kg);
      setGoalKg(kg);
      onShowToast('success', kg ? 'Goal weight saved' : 'Goal weight cleared');
    } catch (e: any) {
      onShowToast('error', `Couldn't save goal: ${e?.message || e}`);
    }
  };

  if (!data) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <SkeletonCard rows={1} tall={44} />
          </View>
          <View style={{ flex: 1 }}>
            <SkeletonCard rows={1} tall={44} />
          </View>
        </View>
        <SkeletonCard rows={1} tall={120} />
        <SkeletonCard rows={2} tall={220} />
      </View>
    );
  }

  const sections = [
    <HeroTiles
      key="hero"
      volume={heroVolume(data)}
      bodyweight={heroBodyweight(data)}
      weights={data.weights}
      goalKg={goalKg}
      onLogWeight={logWeight}
      onSaveGoal={saveGoal}
    />,
    <ConsistencyCard key="consistency" data={data} onOpenDay={(d) => onOpenDay?.(d)} />,
    <MuscleMapCard key="muscles" data={data} />,
    <RadarCard key="radar" data={data} />,
    <StrengthCard key="strength" data={data} />,
    <ThisWeekCard key="week" data={data} />,
    <ReadinessCard key="readiness" data={data} />,
    <MeasurementsCard key="measurements" db={db} reloadKey={reloadKey} onShowToast={onShowToast} />,
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
      {sections.map((s, i) => (
        <FadeInUp key={s.key ?? i} delay={Math.min(i, 5) * 50}>
          {s}
        </FadeInUp>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginBottom: 4 },
  loading: { paddingVertical: 60, alignItems: 'center' },
});
