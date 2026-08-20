import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Polyline, Circle, Line, Rect } from 'react-native-svg';
import {
  TrendingUp,
  History,
  Calculator,
  Award,
  Calendar,
  Layers,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Modal } from '../common/Modal';
import { Card } from '../common/Card';
import { Exercise, ExerciseProgressionPoint, ExerciseLog } from '../../types/database';
import {
  getExerciseProgressionData,
  getExerciseHistoryLogs,
} from '../../db/database';
import { formatDisplayDate, formatShortDate } from '../../utils/dateUtils';
import { PlateCalculatorModal } from './PlateCalculatorModal';

interface ExerciseDetailModalProps {
  visible: boolean;
  db: SQLite.SQLiteDatabase;
  exercise: Exercise | null;
  onClose: () => void;
}

type TabKey = 'graph' | 'history' | 'calc';

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  visible,
  db,
  exercise,
  onClose,
}) => {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('graph');
  const [metric, setMetric] = useState<'1rm' | 'max_weight' | 'volume' | 'max_reps'>('1rm');
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>('1y');

  const [progressionData, setProgressionData] = useState<ExerciseProgressionPoint[]>([]);
  const [historySessions, setHistorySessions] = useState<{ date: string; logs: ExerciseLog[] }[]>([]);
  const [isCalcVisible, setIsCalcVisible] = useState(false);

  useEffect(() => {
    if (visible && exercise) {
      loadData();
    }
  }, [visible, exercise, metric, timeRange]);

  const loadData = async () => {
    if (!exercise) return;
    try {
      const [prog, hist] = await Promise.all([
        getExerciseProgressionData(db, exercise.id, metric, timeRange),
        getExerciseHistoryLogs(db, exercise.id),
      ]);
      setProgressionData(prog);
      setHistorySessions(hist);
    } catch (e) {
      console.error(e);
    }
  };

  // Render SVG Progression Chart
  const renderChart = () => {
    if (progressionData.length < 2) {
      return (
        <View style={styles.chartEmpty}>
          <TrendingUp size={36} color={colors.textDisabled} />
          <Text style={[styles.chartEmptyText, { color: colors.textMuted }]}>
            {progressionData.length === 1
              ? 'Only 1 data point logged so far. Keep training to see your progression line!'
              : 'No historical workout data recorded yet for this exercise.'}
          </Text>
        </View>
      );
    }

    const chartWidth = 320;
    const chartHeight = 180;
    const padding = 28;

    const values = progressionData.map((d) => d.value);
    const minVal = Math.floor(Math.min(...values) * 0.9);
    const maxVal = Math.ceil(Math.max(...values) * 1.1) || 10;
    const valRange = maxVal - minVal || 1;

    const points = progressionData.map((d, idx) => {
      const x = padding + (idx / (progressionData.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((d.value - minVal) / valRange) * (chartHeight - padding * 2);
      return { x, y, ...d };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Background horizontal gridlines */}
          {[0, 0.5, 1].map((pct, idx) => {
            const y = chartHeight - padding - pct * (chartHeight - padding * 2);
            return (
              <Line
                key={idx}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke={colors.border}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            );
          })}

          {/* Connected progression line */}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Point Markers */}
          {points.map((p, idx) => (
            <Circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={colors.primary}
              stroke={colors.surfaceCard}
              strokeWidth={2}
            />
          ))}
        </Svg>

        {/* X-Axis labels (First and Last date) */}
        <View style={styles.chartXLabels}>
          <Text style={[styles.xAxisText, { color: colors.textMuted }]}>
            {progressionData[0]?.displayDate}
          </Text>
          <Text style={[styles.xAxisText, { color: colors.primary, fontWeight: '800' }]}>
            Latest: {progressionData[progressionData.length - 1]?.value}{' '}
            {metric === 'volume' ? 'kg vol' : metric === 'max_reps' ? 'reps' : 'kg'}
          </Text>
          <Text style={[styles.xAxisText, { color: colors.textMuted }]}>
            {progressionData[progressionData.length - 1]?.displayDate}
          </Text>
        </View>
      </View>
    );
  };

  if (!exercise) return null;

  return (
    <Modal visible={visible} onClose={onClose} title={exercise.name}>
      <View style={styles.container}>
        {/* Subtabs Bar */}
        <View style={[styles.subtabsRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.subtabBtn, activeTab === 'graph' && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab('graph')}
          >
            <TrendingUp size={15} color={activeTab === 'graph' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.subtabText, { color: activeTab === 'graph' ? colors.primary : colors.textSecondary }]}>
              PROGRESSION
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subtabBtn, activeTab === 'history' && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab('history')}
          >
            <History size={15} color={activeTab === 'history' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.subtabText, { color: activeTab === 'history' ? colors.primary : colors.textSecondary }]}>
              HISTORY LOGS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subtabBtn, activeTab === 'calc' && { borderBottomColor: colors.primary }]}
            onPress={() => setIsCalcVisible(true)}
          >
            <Calculator size={15} color={colors.textSecondary} />
            <Text style={[styles.subtabText, { color: colors.textSecondary }]}>
              PLATES
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={false}>
          {/* ================= 1. PROGRESSION GRAPH TAB ================= */}
          {activeTab === 'graph' && (
            <View style={styles.graphTabSection}>
              {/* Metric Dropdown Pills */}
              <View style={styles.metricPickerRow}>
                {[
                  { key: '1rm' as const, label: 'Estimated 1RM' },
                  { key: 'max_weight' as const, label: 'Max Weight' },
                  { key: 'volume' as const, label: 'Workout Volume' },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.metricPill,
                      { backgroundColor: colors.surfaceHighlight },
                      metric === m.key && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setMetric(m.key)}
                  >
                    <Text
                      style={[
                        styles.metricPillText,
                        { color: metric === m.key ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time Range Filter Pills */}
              <View style={styles.rangePickerRow}>
                {(['1m', '3m', '6m', '1y', 'all'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.rangePill,
                      { backgroundColor: colors.surfaceHighlight },
                      timeRange === r && { backgroundColor: colors.secondary },
                    ]}
                    onPress={() => setTimeRange(r)}
                  >
                    <Text
                      style={[
                        styles.rangePillText,
                        { color: timeRange === r ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart Card */}
              <Card style={[styles.chartCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                {renderChart()}
              </Card>
            </View>
          )}

          {/* ================= 2. HISTORY LOGS TAB ================= */}
          {activeTab === 'history' && (
            <View style={styles.historyTabSection}>
              {historySessions.length > 0 ? (
                historySessions.map((item) => (
                  <Card
                    key={item.date}
                    style={[styles.historyDayCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <View style={styles.historyDayHeader}>
                      <View style={styles.historyDayTitleRow}>
                        <Calendar size={15} color={colors.primary} />
                        <Text style={[styles.historyDateText, { color: colors.text }]}>
                          {formatDisplayDate(item.date).toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Sets for this day */}
                    <View style={styles.historySetsTable}>
                      {item.logs.map((s) => (
                        <View key={s.id} style={[styles.historySetRow, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.historySetNum, { color: colors.textMuted }]}>
                            Set {s.set_number}
                          </Text>
                          <Text style={[styles.historySetVal, { color: colors.text }]}>
                            {s.weight_kg > 0 ? `${s.weight_kg} kgs` : '0 kg'}
                          </Text>
                          <Text style={[styles.historySetReps, { color: colors.primary }]}>
                            {s.reps} reps
                          </Text>
                          {s.comment && (
                            <Text style={[styles.historyComment, { color: colors.textSecondary }]} numberOfLines={1}>
                              💬 {s.comment}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <History size={36} color={colors.textDisabled} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No workout history logged yet for this exercise.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Plate Calculator Sub-Modal */}
        <PlateCalculatorModal
          visible={isCalcVisible}
          initialWeight={progressionData[progressionData.length - 1]?.weight || 60}
          exerciseName={exercise.name}
          onClose={() => setIsCalcVisible(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
  },
  subtabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  subtabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subtabText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  tabContentScroll: {
    maxHeight: 440,
  },
  graphTabSection: {
    gap: spacing.sm,
  },
  metricPickerRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  metricPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  metricPillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  rangePickerRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    marginVertical: 4,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  rangePillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 320,
    marginTop: spacing.xs,
  },
  xAxisText: {
    ...typography.caption,
    fontSize: 10,
  },
  chartEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
    width: 280,
  },
  chartEmptyText: {
    ...typography.bodySecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  historyTabSection: {
    gap: spacing.sm,
  },
  historyDayCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  historyDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyDayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historySetsTable: {
    marginTop: 4,
  },
  historySetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  historySetNum: {
    ...typography.caption,
    width: 50,
  },
  historySetVal: {
    ...typography.mono,
    fontSize: 13,
    width: 70,
  },
  historySetReps: {
    ...typography.mono,
    fontSize: 13,
    width: 60,
    textAlign: 'center',
  },
  historyComment: {
    ...typography.caption,
    flex: 1,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
});
