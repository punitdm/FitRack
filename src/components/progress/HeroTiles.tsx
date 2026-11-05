import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text } from '../common/Typography';
import { ScalePressable } from '../common/Motion';
import { useTheme, borderRadius, spacing } from '../../theme/theme';
import { DeltaChip, Sparkline, fmtKg } from './ProgressKit';
import { WeightHistorySheet } from './WeightHistorySheet';
import { useUnits } from '../../utils/units';
import { format, parseISO } from 'date-fns';

import { RollingNumber } from '../common/Polish';
/**
 * Two hero tiles: lifted volume over the last 30 days (with change vs the 30
 * days before and a cumulative curve) and body weight (tap to log a weigh-in).
 */
export const HeroTiles: React.FC<{
  volume: { volumeKg: number; changePct: number | null; points: number[] };
  bodyweight: { latestKg: number | null; latestDate: string | null; series: number[] };
  /** Full weigh-in history (oldest first) for the Bodyweight sheet. */
  weights: { date: string; kg: number }[];
  goalKg: number | null;
  onLogWeight: (kg: number) => void;
  onSaveGoal: (kg: number | null) => void;
}> = ({ volume, bodyweight, weights, goalKg, onLogWeight, onSaveGoal }) => {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [open, setOpen] = useState(false);
  const u = useUnits();
  const v = u.fmtVolume(volume.volumeKg);

  return (
    <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setW((e.nativeEvent.layout.width - 12) / 2)}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceCard }]}>
        <View style={styles.tileHead}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>Volume · 30 days</Text>
        </View>
        <View style={styles.valueRow}>
          <RollingNumber
            value={u.unit === 'lb' ? volume.volumeKg * 2.2046226218 : volume.volumeKg}
            format={(x) => (v.unit === 't' || v.unit === 'k lb' ? (Math.round(x / 100) / 10).toLocaleString() : Math.round(x).toLocaleString())}
            style={[styles.value, { color: colors.text }]}
          />
          <Text style={[styles.unit, { color: colors.textSecondary }]}>{v.unit}</Text>
        </View>
        {volume.changePct != null ? (
          <DeltaChip pct={volume.changePct} />
        ) : (
          <Text style={[styles.note, { color: colors.textMuted }]}>vs previous 30 days</Text>
        )}
        <View style={styles.chart}>
          <Sparkline id="vol" values={volume.points} width={Math.max(0, w - spacing.lg * 2)} height={44} color={colors.primary} fill />
        </View>
      </View>

      <ScalePressable
        style={[styles.tile, { backgroundColor: colors.surfaceCard }]}
        onPress={() => setOpen(true)}
        pressedScale={0.97}
        accessibilityLabel={bodyweight.latestKg ? `Body weight ${bodyweight.latestKg} kilograms. Tap for history` : 'Add your body weight'}
      >
        <View style={styles.tileHead}>
          <Text style={[styles.kicker, { color: colors.textMuted }]}>Weight</Text>
        </View>
        {bodyweight.latestKg ? (
          <>
            <View style={styles.valueRow}>
              <Text style={[styles.value, { color: colors.text }]}>{u.fmt(bodyweight.latestKg, { unit: false })}</Text>
              <Text style={[styles.unit, { color: colors.textSecondary }]}>{u.label}</Text>
            </View>
            <Text style={[styles.note, { color: colors.textMuted }]}>
              {bodyweight.latestDate ? format(parseISO(bodyweight.latestDate), 'd MMM') : ''}
            </Text>
            <View style={styles.chart}>
              <Sparkline
                id="bw"
                values={bodyweight.series}
                width={Math.max(0, w - spacing.lg * 2)}
                height={44}
                color={colors.pillars.body.accent}
              />
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.value, { color: colors.text, fontSize: 22 }]}>Add yours</Text>
            <Text style={[styles.note, { color: colors.textMuted }]}>Tap to log a weigh-in</Text>
          </View>
        )}
      </ScalePressable>

      <WeightHistorySheet
        visible={open}
        weights={weights}
        goalKg={goalKg}
        onClose={() => setOpen(false)}
        onLogWeight={onLogWeight}
        onSaveGoal={onSaveGoal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: borderRadius.xl, padding: spacing.lg, gap: 6, minHeight: 168 },
  tileHead: { flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { fontSize: 12, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  unit: { fontSize: 13, fontWeight: '600' },
  note: { fontSize: 12, fontWeight: '500' },
  chart: { marginTop: 'auto' },
  empty: { flex: 1, justifyContent: 'center', gap: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, minHeight: 52 },
  input: { flex: 1, fontSize: 22, fontWeight: '800' },
});
