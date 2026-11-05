import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { TouchableOpacity } from '../components/common/Touchable';
import { Text, TextInput } from '../components/common/Typography';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Footprints,
  Clock,
  Gauge,
  Flame,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Award,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { RunningLog, RunningSplit } from '../types/database';
import {
  getAllRunningLogs,
  saveRunningLog,
  deleteRunningLog,
} from '../db/database';
import { formatDisplayDate, shiftDate } from '../utils/dateUtils';
import { Card } from '../components/common/Card';

import { PopIn } from '../components/common/Motion';
import { SwipeToDelete } from '../components/common/SwipeToDelete';
import { notify, notifyUndo } from '../utils/feedback';
import { haptics } from '../utils/haptics';
interface RunningScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onBackToHub: () => void;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const RunningScreen: React.FC<RunningScreenProps> = ({
  db,
  selectedDate,
  onBackToHub,
  onDateChange,
  onOpenDatePicker,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();

  const [allLogs, setAllLogs] = useState<RunningLog[]>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  // Manual Log Form State
  const [manualDistance, setManualDistance] = useState('5.0');
  const [manualMinutes, setManualMinutes] = useState('25');
  const [manualSeconds, setManualSeconds] = useState('00');
  const [manualTitle, setManualTitle] = useState('Outdoor Running');

  const loadData = async () => {
    try {
      const logs = await getAllRunningLogs(db, 50);
      setAllLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [db, selectedDate]);

  const handlePrevDay = () => {
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, -1));
    }
  };

  const handleNextDay = () => {
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, 1));
    }
  };

  // Overall Running Aggregates
  const totalDistanceKm = allLogs.reduce((acc, r) => acc + (r.distance_km || 0), 0);
  const totalRunsCount = allLogs.length;
  const totalSeconds = allLogs.reduce((acc, r) => acc + (r.duration_seconds || 0), 0);
  const avgPaceSec = totalDistanceKm > 0 ? Math.round(totalSeconds / totalDistanceKm) : 0;
  const avgPaceM = Math.floor(avgPaceSec / 60);
  const avgPaceS = avgPaceSec % 60;
  const avgPaceFormatted =
    totalDistanceKm > 0
      ? `${avgPaceM}'${avgPaceS < 10 ? '0' : ''}${avgPaceS}"`
      : `--'--"`;

  const handleSaveManualRun = async () => {
    const dist = parseFloat(manualDistance) || 0;
    const mins = parseInt(manualMinutes, 10) || 0;
    const secs = parseInt(manualSeconds, 10) || 0;
    const totalSecs = mins * 60 + secs;

    if (dist <= 0 || totalSecs <= 0) {
      notify('error', 'Enter a distance and a duration first');
      return;
    }

    const paceSec = Math.round(totalSecs / dist);
    const cals = Math.round(dist * 65);

    // Calculate KM splits
    const numKm = Math.floor(dist);
    const splits: RunningSplit[] = [];
    for (let k = 1; k <= numKm; k++) {
      const splitPace = Math.max(200, paceSec + (k % 2 === 0 ? 4 : -4));
      const m = Math.floor(splitPace / 60);
      const s = splitPace % 60;
      splits.push({
        km: k,
        paceSeconds: splitPace,
        paceFormatted: `${m}'${s < 10 ? '0' : ''}${s}"`,
      });
    }

    await saveRunningLog(
      db,
      selectedDate,
      dist,
      totalSecs,
      paceSec,
      JSON.stringify(splits),
      cals,
      manualTitle.trim() || 'Outdoor Running'
    );

    setIsManualModalOpen(false);
    setManualDistance('5.0');
    setManualMinutes('25');
    setManualTitle('Outdoor Running');
    loadData();
    onShowToast('success', `Logged a ${dist.toFixed(2)} km run`);
  };

  const handleDeleteRun = async (id: number) => {
    if (id < 0) {
      notify('info', 'This run was logged in Workout. Edit or delete it there.');
      return;
    }
    // Delete straight away; Undo restores it.
    const run = allLogs.find((r) => r.id === id);
    haptics.tap();
    await deleteRunningLog(db, id);
    loadData();
    if (run) {
      notifyUndo('Run deleted', async () => {
        await saveRunningLog(
          db,
          run.date,
          run.distance_km,
          run.duration_seconds,
          run.pace_seconds_per_km ?? 0,
          run.splits_json ?? undefined,
          run.calories_burned ?? 0,
          run.notes ?? undefined
        );
        loadData();
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. TOP APP BAR */}
      <View style={[styles.topAppBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToHub} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#38BDF8" />
          <Text style={styles.backBtnText}>Hub</Text>
        </TouchableOpacity>

        {/* Date Navigator with Calendar Trigger */}
        <View style={[styles.dateNavWrapper, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevDay} activeOpacity={0.6}>
            <ChevronLeft size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateCenterBtn}
            onPress={onOpenDatePicker}
            activeOpacity={0.7}
          >
            <Calendar size={14} color="#38BDF8" />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDisplayDate(selectedDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.arrowBtn} onPress={handleNextDay} activeOpacity={0.6}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.manualAddBtn, { backgroundColor: colors.pillars.running.soft, borderColor: '#38BDF8' }]}
          onPress={() => setIsManualModalOpen(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================= 2. RUNNING OVERVIEW STATS HERO ================= */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.running.tint,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroSubHeader, { color: colors.textMuted }]}>Total distance run</Text>
              <Text style={[styles.heroDistanceBig, { color: colors.pillars.running.accent }]}>
                {totalDistanceKm.toFixed(1)}
                <Text style={[styles.heroKmUnit, { color: colors.textMuted }]}> km</Text>
              </Text>
            </View>

            <View style={[styles.runsBadge, { backgroundColor: colors.pillars.running.soft }]}>
              <Award size={18} color={colors.pillars.running.accent} />
              <Text style={[styles.runsBadgeText, { color: colors.pillars.running.accent }]}>
                {totalRunsCount} Sessions
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={[styles.metricsRow, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.text }]}>{avgPaceFormatted}</Text>
              <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Avg pace /km</Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {Math.floor(totalSeconds / 3600)}h {Math.floor((totalSeconds % 3600) / 60)}m
              </Text>
              <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Total time</Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {Math.round(totalDistanceKm * 65)}
              </Text>
              <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Calories</Text>
            </View>
          </View>
        </View>

        {/* ================= 3. ALL RUNNING SESSIONS (HISTORY & STATS) ================= */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>All running sessions</Text>
            <TouchableOpacity onPress={() => setIsManualModalOpen(true)}>
              <Text style={styles.manualEntryLink}>+ Log Run</Text>
            </TouchableOpacity>
          </View>

          {allLogs.length > 0 ? (
            <View style={styles.historyList}>
              {allLogs.map((log) => {
                const mins = Math.floor(log.duration_seconds / 60);
                const secs = log.duration_seconds % 60;
                const pMin = Math.floor((log.pace_seconds_per_km || 0) / 60);
                const pSec = (log.pace_seconds_per_km || 0) % 60;
                const isExpanded = expandedRunId === log.id;

                let splits: RunningSplit[] = [];
                if (log.splits_json) {
                  try {
                    splits = JSON.parse(log.splits_json);
                  } catch {
                    splits = [];
                  }
                }

                return (
                  <SwipeToDelete key={log.id} enabled={log.id > 0} onDelete={() => handleDeleteRun(log.id)}>
                  <View
                    key={log.id}
                    style={[
                      styles.runCard,
                      {
                        backgroundColor: colors.surfaceCard,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Card Top */}
                    <View style={styles.runCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.runDateText, { color: colors.textMuted }]}>
                          {formatDisplayDate(log.date)}
                        </Text>
                        <Text style={[styles.runTitleText, { color: colors.text }]}>
                          {log.notes || 'Running Session'}
                        </Text>
                      </View>

                      {log.id > 0 && (
                        <TouchableOpacity
                          onPress={() => handleDeleteRun(log.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Card Metrics Grid */}
                    <View
                      style={[
                        styles.runCardMetrics,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <View style={styles.runMetricBox}>
                        <Text
                          style={[
                            styles.runDistanceBig,
                            { color: colors.pillars.running.accent },
                          ]}
                        >
                          {log.distance_km.toFixed(2)}
                          <Text style={{ fontSize: 13, color: colors.textMuted }}> km</Text>
                        </Text>
                        <Text style={[styles.runMetricLabel, { color: colors.textMuted }]}>Distance</Text>
                      </View>

                      <View style={styles.runMetricBox}>
                        <Text style={[styles.runMetricVal, { color: colors.text }]}>
                          {mins}m {secs < 10 ? '0' : ''}{secs}s
                        </Text>
                        <Text style={[styles.runMetricLabel, { color: colors.textMuted }]}>Time</Text>
                      </View>

                      <View style={styles.runMetricBox}>
                        <Text style={[styles.runMetricVal, { color: colors.text }]}>
                          {pMin}'{pSec < 10 ? '0' : ''}{pSec}"
                        </Text>
                        <Text style={[styles.runMetricLabel, { color: colors.textMuted }]}>Pace /km</Text>
                      </View>
                    </View>

                    {/* Splits Accordion Toggle */}
                    {splits.length > 0 && (
                      <TouchableOpacity
                        style={styles.splitsToggleBtn}
                        onPress={() => setExpandedRunId(isExpanded ? null : log.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.splitsToggleText, { color: colors.pillars.running.accent }]}>
                          {isExpanded ? 'Hide KM Splits' : `View ${splits.length} KM Splits`}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={15} color={colors.pillars.running.accent} />
                        ) : (
                          <ChevronDown size={15} color={colors.pillars.running.accent} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Expanded KM Splits Table */}
                    {isExpanded && splits.length > 0 && (
                      <View
                        style={[
                          styles.splitsTable,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        {splits.map((s) => (
                          <View
                            key={s.km}
                            style={[
                              styles.splitTableRow,
                              { borderBottomColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.splitTableKm, { color: colors.textSecondary }]}>
                              Km {s.km}
                            </Text>
                            <Text
                              style={[
                                styles.splitTablePace,
                                { color: colors.pillars.running.accent },
                              ]}
                            >
                              {s.paceFormatted}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  </SwipeToDelete>
                );
              })}
            </View>
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Footprints size={40} color={colors.pillars.running.accent} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Running Sessions Recorded</Text>
              <Text style={[styles.emptySubTitle, { color: colors.textMuted }]}>
                Log running exercises in your Workout tab or use '+ Log Run' above.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Manual Run Log Modal */}
      <Modal
        visible={isManualModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsManualModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <PopIn
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Running Session</Text>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Exercise / type</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={manualTitle}
                onChangeText={setManualTitle}
                placeholder="Outdoor Running / Treadmill"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Distance (km)</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="decimal-pad"
                value={manualDistance}
                onChangeText={setManualDistance}
                placeholder="5.0"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Duration (minutes : seconds)</Text>
              <View style={styles.durationInputRow}>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      flex: 1,
                      textAlign: 'center',
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                  placeholder="25"
                  placeholderTextColor={colors.textDisabled}
                />
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>:</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      flex: 1,
                      textAlign: 'center',
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={manualSeconds}
                  onChangeText={setManualSeconds}
                  placeholder="00"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
                onPress={() => setIsManualModalOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#38BDF8' }]}
                onPress={handleSaveManualRun}
              >
                <Text style={styles.modalSaveText}>Save Run</Text>
              </TouchableOpacity>
            </View>
          </PopIn>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backBtnText: {
    ...typography.titleSmall,
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 14,
  },
  dateNavWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  arrowBtn: {
    padding: 6,
  },
  dateCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dateText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  manualAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSubHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  heroDistanceBig: {
    ...typography.mono,
    fontSize: 44,
    fontWeight: '900',
    marginVertical: 2,
  },
  heroKmUnit: {
    fontSize: 20,
    fontWeight: '700',
  },
  runsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  runsBadgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    ...typography.mono,
    fontSize: 16,
    fontWeight: '800',
  },
  metricLbl: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  historySection: {
    gap: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  manualEntryLink: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  historyList: {
    gap: 10,
  },
  runCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  runCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  runDateText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  runTitleText: {
    ...typography.titleSmall,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  runCardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 10,
  },
  runMetricBox: {
    alignItems: 'center',
    flex: 1,
  },
  runDistanceBig: {
    ...typography.mono,
    fontSize: 18,
    fontWeight: '800',
  },
  runMetricVal: {
    ...typography.mono,
    fontSize: 15,
    fontWeight: '700',
  },
  runMetricLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  splitsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  splitsToggleText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  splitsTable: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  splitTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
  },
  splitTableKm: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  splitTablePace: {
    ...typography.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  emptyTitle: {
    ...typography.titleSmall,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubTitle: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontSize: 18,
    fontWeight: '800',
  },
  modalField: {
    gap: 4,
  },
  modalLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  modalInput: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.titleSmall,
    fontSize: 13,
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    ...typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
