import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AlertTriangle, Clock, Scale, TrendingUp } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '../common/Typography';
import { useTheme } from '../../theme/theme';
import { SoftCard, Kicker } from './ProgressKit';
import { InsightKind, ProgressData, thisWeek } from '../../analytics/progress';

/** Sets per day this week, plus up to three things worth knowing. */
export const ThisWeekCard: React.FC<{ data: ProgressData }> = ({ data }) => {
  const { colors } = useTheme();
  const w = useMemo(() => thisWeek(data), [data]);
  const peak = Math.max(1, ...w.days.map((d) => d.sets));

  const icon = (k: InsightKind) => {
    const c = k === 'up' ? colors.success : k === 'load' ? colors.danger : k === 'balance' ? colors.secondary : colors.warning;
    const I = k === 'up' ? TrendingUp : k === 'load' ? AlertTriangle : k === 'balance' ? Scale : Clock;
    return (
      <View style={[styles.insightIcon, { backgroundColor: `${c}22` }]}>
        <I size={15} color={c} />
      </View>
    );
  };

  return (
    <SoftCard>
      <Kicker>This week</Kicker>
      <Text style={[styles.headline, { color: colors.text }]}>
        {w.totalSets} <Text style={[styles.unit, { color: colors.textMuted }]}>sets</Text>
      </Text>

      <View style={styles.bars}>
        {w.days.map((d) => (
          <View key={d.date} style={[styles.barCol, { opacity: d.future ? 0.4 : 1 }]}>
            <Text style={[styles.barVal, { color: d.sets > 0 ? colors.text : 'transparent' }]}>{d.sets}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${d.sets > 0 ? Math.max(8, (d.sets / peak) * 100) : 4}%`,
                    backgroundColor: d.sets > 0 ? (d.isToday ? colors.primary : colors.textMuted) : colors.surfaceHighlight,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: d.isToday ? colors.text : colors.textMuted, fontWeight: d.isToday ? '800' : '700' }]}>
              {format(parseISO(d.date), 'EEEEE')}
            </Text>
          </View>
        ))}
      </View>

      {w.insights.length > 0 && (
        <View style={styles.insights}>
          {w.insights.map((ins, i) => (
            <View key={i} style={[styles.insight, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              {icon(ins.kind)}
              <Text style={[styles.insightText, { color: colors.text }]}>{ins.text}</Text>
            </View>
          ))}
        </View>
      )}
    </SoftCard>
  );
};

const styles = StyleSheet.create({
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 14, fontWeight: '600' },
  bars: { flexDirection: 'row', gap: 8, height: 110, marginTop: 10 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontSize: 10, fontWeight: '700' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 5 },
  barLabel: { fontSize: 11 },
  insights: { marginTop: 14 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  insightIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19 },
});
