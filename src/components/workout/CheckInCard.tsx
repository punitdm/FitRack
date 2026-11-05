import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Moon, Zap } from 'lucide-react-native';
import { Text } from '../common/Typography';
import { useTheme, borderRadius, spacing } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { CHECK_IN_WORDS, CheckIn, getCheckIn, saveCheckIn } from '../../db/checkins';

/**
 * "How did you show up?" Rate sleep and energy (1–5) for a workout day.
 * Optional; tap a rating again to clear it. Feeds Progress → Sleep and energy.
 */
export const CheckInCard: React.FC<{ db: SQLite.SQLiteDatabase; date: string }> = ({ db, date }) => {
  const { colors } = useTheme();
  const [value, setValue] = useState<CheckIn | null>(null);

  useEffect(() => {
    let alive = true;
    getCheckIn(db, date)
      .then((c) => alive && setValue(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [db, date]);

  const set = async (key: 'sleep' | 'energy', v: number) => {
    haptics.select();
    const current = value?.[key] ?? null;
    const next = current === v ? null : v;
    setValue((prev) => ({ date, sleep: prev?.sleep ?? null, energy: prev?.energy ?? null, [key]: next }));
    try {
      setValue(await saveCheckIn(db, date, { [key]: next }));
    } catch {
      // keep optimistic value; nothing critical
    }
  };

  const row = (key: 'sleep' | 'energy', label: string, Icon: typeof Moon, tint: string) => {
    const current = value?.[key] ?? null;
    return (
      <View style={styles.row}>
        <View style={styles.rowHead}>
          <Icon size={15} color={tint} />
          <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.rowWord, { color: colors.textMuted }]}>{current ? CHECK_IN_WORDS[current - 1] : ''}</Text>
        </View>
        <View style={styles.chips}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = current === n;
            return (
              <Pressable
                key={n}
                onPress={() => set(key, n)}
                style={[styles.chip, { backgroundColor: on ? tint : colors.surfaceHighlight }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${label}: ${CHECK_IN_WORDS[n - 1]}`}
              >
                <Text style={[styles.chipText, { color: on ? colors.textInverse : colors.textSecondary }]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>How did you show up?</Text>
        <Text style={[styles.optional, { color: colors.textMuted }]}>Optional</Text>
      </View>
      {row('sleep', 'Sleep', Moon, colors.success)}
      {row('energy', 'Energy', Zap, colors.warning)}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: 12, borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800' },
  optional: { fontSize: 12, fontWeight: '600' },
  row: { gap: 8 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  rowWord: { marginLeft: 'auto', fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '800' },
});
