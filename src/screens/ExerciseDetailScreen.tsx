import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PanResponder,
} from 'react-native';
import {
  ArrowLeft,
  Timer,
  Award,
  Info,
  MessageSquare,
  Minus,
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
} from 'lucide-react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import {
  Exercise,
  ExerciseLog,
  ExerciseWithLogs,
  ExerciseProgressionPoint,
} from '../types/database';
import {
  getExerciseHistoryLogs,
  getExerciseProgressionData,
  addExerciseSet,
  updateExerciseSet,
  deleteExerciseSet,
} from '../db/database';
import { formatDisplayDate } from '../utils/dateUtils';
import { PlateCalculatorModal } from '../components/workout/PlateCalculatorModal';

interface ExerciseDetailScreenProps {
  db: SQLite.SQLiteDatabase;
  exerciseItem: ExerciseWithLogs;
  allSessionExercises?: ExerciseWithLogs[];
  currentDate: string;
  onBack: () => void;
  onDataChanged: () => void;
  onSwitchExercise?: (nextItem: ExerciseWithLogs) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

type TabKey = 'track' | 'history' | 'graph';

export const ExerciseDetailScreen: React.FC<ExerciseDetailScreenProps> = ({
  db,
  exerciseItem,
  allSessionExercises = [],
  currentDate,
  onBack,
  onDataChanged,
  onSwitchExercise,
  onShowToast,
}) => {
  const { colors } = useTheme();
  const { exercise, logs, supersetId, supersetJumpBetween } = exerciseItem;

  const [activeTab, setActiveTab] = useState<TabKey>('track');

  // Exact FitNotes Inputs
  const [weightKg, setWeightKg] = useState<string>('0.0');
  const [reps, setReps] = useState<string>('0');
  const [distanceVal, setDistanceVal] = useState<string>('0');
  const [timeDuration, setTimeDuration] = useState<string>('00:00:00');
  const [comment, setComment] = useState<string>('');
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);

  // History & Graph states
  const [historySessions, setHistorySessions] = useState<{ date: string; logs: ExerciseLog[] }[]>([]);
  const [progressionData, setProgressionData] = useState<ExerciseProgressionPoint[]>([]);
  const [graphMetric, setGraphMetric] = useState<'1rm' | 'max_weight' | 'volume'>('1rm');
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);

  const isWeightReps = exercise.tracking_type === 'weight_reps';
  const isDistanceTime = exercise.tracking_type === 'distance_time';
  const isTimeOnly = exercise.tracking_type === 'time_only';

  const tabsList: TabKey[] = ['track', 'history', 'graph'];

  // Slide / Swipe through tabs!
  const tabPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 35 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8
          );
        },
        onPanResponderRelease: (evt, gestureState) => {
          const curIdx = tabsList.indexOf(activeTab);
          if (gestureState.dx < -50 && curIdx < tabsList.length - 1) {
            // Swipe Left -> Next Tab
            setActiveTab(tabsList[curIdx + 1]);
          } else if (gestureState.dx > 50 && curIdx > 0) {
            // Swipe Right -> Prev Tab
            setActiveTab(tabsList[curIdx - 1]);
          }
        },
      }),
    [activeTab]
  );

  useEffect(() => {
    loadAllData();
    prefillInputs();
  }, [exerciseItem]);

  const loadAllData = async () => {
    try {
      const [hist, prog] = await Promise.all([
        getExerciseHistoryLogs(db, exercise.id),
        getExerciseProgressionData(db, exercise.id, graphMetric, '1y'),
      ]);
      setHistorySessions(hist);
      setProgressionData(prog);
    } catch (e) {
      console.error(e);
    }
  };

  const prefillInputs = () => {
    setEditingLogId(null);
    setComment('');
    setShowNoteInput(false);

    if (logs.length > 0) {
      const last = logs[logs.length - 1];
      setWeightKg(last.weight_kg > 0 ? (Math.round(last.weight_kg * 10) / 10).toFixed(1) : '0.0');
      setReps(last.reps > 0 ? String(last.reps) : '0');
      setDistanceVal(last.distance_val ? String(last.distance_val) : '0');
      setTimeDuration(last.time_duration || '00:00:00');
    } else if (exerciseItem.previousSetInfo) {
      const prev = exerciseItem.previousSetInfo;
      setWeightKg(prev.weight_kg > 0 ? (Math.round(prev.weight_kg * 10) / 10).toFixed(1) : '0.0');
      setReps(prev.reps > 0 ? String(prev.reps) : '0');
      setDistanceVal(prev.distance_val ? String(prev.distance_val) : '0');
      setTimeDuration(prev.time_duration || '00:00:00');
    } else {
      setWeightKg(isWeightReps ? '40.0' : '0.0');
      setReps(isWeightReps ? '8' : '0');
      setDistanceVal('1.0');
      setTimeDuration('00:05:00');
    }
  };

  const handleWeightDelta = (delta: number) => {
    const cur = parseFloat(weightKg) || 0;
    const next = Math.max(0, Math.round((cur + delta) * 10) / 10);
    setWeightKg(next.toFixed(1));
  };

  const handleRepsDelta = (delta: number) => {
    const cur = parseInt(reps, 10) || 0;
    const next = Math.max(0, cur + delta);
    setReps(String(next));
  };

  const handleSave = async () => {
    const wNum = parseFloat(weightKg) || 0;
    const rNum = parseInt(reps, 10) || 0;
    const dNum = parseFloat(distanceVal) || 0;

    const isNewSet = !editingLogId;
    const nextSetNum = logs.length + 1;

    if (editingLogId) {
      await updateExerciseSet(db, editingLogId, {
        weight_kg: wNum,
        reps: rNum,
        distance_val: dNum,
        time_duration: timeDuration || '00:00:00',
        comment: comment.trim() || null,
      });
      setEditingLogId(null);
      onShowToast('success', 'Set updated');
    } else {
      await addExerciseSet(
        db,
        logs[0]?.session_id || 1,
        exercise.id,
        nextSetNum,
        wNum,
        rNum,
        dNum,
        'km',
        timeDuration || '00:00:00',
        null,
        comment.trim() || null,
        exerciseItem.supersetId || null
      );
      onShowToast('success', `Set ${nextSetNum} saved!`);
    }

    setShowNoteInput(false);
    onDataChanged();
    loadAllData();

    // Auto-Jump between superset exercises (Requirement 4)
    if (isNewSet && supersetId && supersetJumpBetween !== false && onSwitchExercise && allSessionExercises.length > 1) {
      const supersetPartners = allSessionExercises.filter((e) => e.supersetId === supersetId);
      if (supersetPartners.length > 1) {
        const currentIndex = supersetPartners.findIndex((e) => e.exercise.id === exercise.id);
        const nextPartner = supersetPartners[(currentIndex + 1) % supersetPartners.length];
        if (nextPartner && nextPartner.exercise.id !== exercise.id) {
          setTimeout(() => {
            onSwitchExercise(nextPartner);
            onShowToast('info', `Switched to ${nextPartner.exercise.name} 🔗`);
          }, 300);
        }
      }
    }
  };

  const handleClear = () => {
    setWeightKg('0.0');
    setReps('0');
    setDistanceVal('0');
    setTimeDuration('00:00:00');
    setComment('');
    setEditingLogId(null);
    setShowNoteInput(false);
  };

  const handleSelectSetForEdit = (log: ExerciseLog) => {
    if (editingLogId === log.id) {
      prefillInputs();
    } else {
      setEditingLogId(log.id);
      setWeightKg((Math.round(log.weight_kg * 10) / 10).toFixed(1));
      setReps(String(log.reps));
      setDistanceVal(String(log.distance_val || 0));
      setTimeDuration(log.time_duration || '00:00:00');
      setComment(log.comment || '');
      setShowNoteInput(!!log.comment);
    }
  };

  const handleDeleteSet = (logId: number) => {
    Alert.alert('Delete Set', 'Are you sure you want to delete this set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExerciseSet(db, logId);
          if (editingLogId === logId) setEditingLogId(null);
          onDataChanged();
          loadAllData();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#121316' }]}>
      {/* 1. TOP APP BAR */}
      <View style={[styles.topAppBar, { backgroundColor: '#1A1B1F', borderBottomColor: '#26282E' }]}>
        <TouchableOpacity style={styles.appBarBack} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.appBarTitle} numberOfLines={1}>
          {exercise.name}
        </Text>

        <View style={styles.appBarIcons}>
          {isWeightReps && (
            <TouchableOpacity
              style={styles.appBarIconBtn}
              onPress={() => setIsPlateModalOpen(true)}
              activeOpacity={0.7}
            >
              <Info size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.appBarIconBtn}
            onPress={() => setActiveTab('graph')}
            activeOpacity={0.7}
          >
            <Award size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 3 CLEAN TABS: TRACK | HISTORY | GRAPH */}
      <View style={[styles.tabNavRow, { backgroundColor: '#18191D', borderBottomColor: '#26282E' }]}>
        <TouchableOpacity
          style={[styles.tabNavItem, activeTab === 'track' && [styles.activeTabNavItem, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('track')}
        >
          <Text style={[styles.tabNavText, activeTab === 'track' && { color: colors.primary, fontWeight: '800' }]}>
            TRACK
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabNavItem, activeTab === 'history' && [styles.activeTabNavItem, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabNavText, activeTab === 'history' && { color: colors.primary, fontWeight: '800' }]}>
            HISTORY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabNavItem, activeTab === 'graph' && [styles.activeTabNavItem, { borderBottomColor: colors.primary }]]}
          onPress={() => setActiveTab('graph')}
        >
          <Text style={[styles.tabNavText, activeTab === 'graph' && { color: colors.primary, fontWeight: '800' }]}>
            GRAPH
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. TAB CONTENT (Swipeable across tabs) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View {...tabPanResponder.panHandlers} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ======================= TAB 1: TRACK ======================= */}
            {activeTab === 'track' && (
              <View style={styles.trackContainer}>
                {/* WEIGHT SECTION */}
                {isWeightReps && (
                  <View style={styles.fieldSection}>
                    <View style={[styles.fieldHeaderLine, { borderBottomColor: colors.primary }]}>
                      <Text style={styles.fieldHeaderLabel}>WEIGHT (kgs)</Text>
                    </View>

                    <View style={styles.stepperControlRow}>
                      <TouchableOpacity
                        style={styles.bigMinusButton}
                        onPress={() => handleWeightDelta(-2.5)}
                        onLongPress={() => handleWeightDelta(-5.0)}
                        activeOpacity={0.6}
                      >
                        <Minus size={26} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>

                      <TextInput
                        style={styles.bigValueDisplay}
                        keyboardType="decimal-pad"
                        value={weightKg}
                        onChangeText={setWeightKg}
                        selectTextOnFocus
                      />

                      <TouchableOpacity
                        style={styles.bigPlusButton}
                        onPress={() => handleWeightDelta(2.5)}
                        onLongPress={() => handleWeightDelta(5.0)}
                        activeOpacity={0.6}
                      >
                        <Plus size={26} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* REPS SECTION */}
                {isWeightReps && (
                  <View style={styles.fieldSection}>
                    <View style={[styles.fieldHeaderLine, { borderBottomColor: colors.primary }]}>
                      <Text style={styles.fieldHeaderLabel}>REPS</Text>
                    </View>

                    <View style={styles.stepperControlRow}>
                      <TouchableOpacity
                        style={styles.bigMinusButton}
                        onPress={() => handleRepsDelta(-1)}
                        onLongPress={() => handleRepsDelta(-5)}
                        activeOpacity={0.6}
                      >
                        <Minus size={26} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>

                      <TextInput
                        style={styles.bigValueDisplay}
                        keyboardType="number-pad"
                        value={reps}
                        onChangeText={setReps}
                        selectTextOnFocus
                      />

                      <TouchableOpacity
                        style={styles.bigPlusButton}
                        onPress={() => handleRepsDelta(1)}
                        onLongPress={() => handleRepsDelta(5)}
                        activeOpacity={0.6}
                      >
                        <Plus size={26} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* CARDIO / DISTANCE & TIME */}
                {isDistanceTime && (
                  <View style={styles.fieldSection}>
                    <View style={[styles.fieldHeaderLine, { borderBottomColor: colors.primary }]}>
                      <Text style={styles.fieldHeaderLabel}>DISTANCE (km)</Text>
                    </View>
                    <View style={styles.stepperControlRow}>
                      <TouchableOpacity
                        style={styles.bigMinusButton}
                        onPress={() => {
                          const cur = parseFloat(distanceVal) || 0;
                          setDistanceVal(Math.max(0, cur - 0.5).toFixed(1));
                        }}
                      >
                        <Minus size={26} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.bigValueDisplay}
                        keyboardType="decimal-pad"
                        value={distanceVal}
                        onChangeText={setDistanceVal}
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.bigPlusButton}
                        onPress={() => {
                          const cur = parseFloat(distanceVal) || 0;
                          setDistanceVal((cur + 0.5).toFixed(1));
                        }}
                      >
                        <Plus size={26} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.fieldHeaderLine, { borderBottomColor: colors.primary, marginTop: 14 }]}>
                      <Text style={styles.fieldHeaderLabel}>DURATION (HH:MM:SS)</Text>
                    </View>
                    <TextInput
                      style={[styles.bigValueDisplay, { marginVertical: 8 }]}
                      value={timeDuration}
                      onChangeText={setTimeDuration}
                    />
                  </View>
                )}

                {/* TIME ONLY (PLANK) */}
                {isTimeOnly && (
                  <View style={styles.fieldSection}>
                    <View style={[styles.fieldHeaderLine, { borderBottomColor: colors.primary }]}>
                      <Text style={styles.fieldHeaderLabel}>TIME (MM:SS)</Text>
                    </View>
                    <TextInput
                      style={[styles.bigValueDisplay, { marginVertical: 8 }]}
                      value={timeDuration}
                      onChangeText={setTimeDuration}
                    />
                  </View>
                )}

                {/* Optional Set Note Input */}
                {showNoteInput && (
                  <View style={styles.noteInputWrapper}>
                    <TextInput
                      style={styles.noteInputText}
                      placeholder="Add comment / note for this set..."
                      placeholderTextColor="#64748B"
                      value={comment}
                      onChangeText={setComment}
                      autoFocus
                    />
                  </View>
                )}

                {/* ACTION BUTTONS: SAVE & CLEAR */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.saveActionButton, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.saveActionText, { color: colors.textInverse }]}>
                      {editingLogId ? 'SAVE EDIT' : 'SAVE'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.clearActionButton}
                    onPress={handleClear}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearActionText}>CLEAR</Text>
                  </TouchableOpacity>
                </View>

                {/* SETS TABLE LIST (FitNotes Exact Style) */}
                <View style={styles.setsTableWrapper}>
                  {logs.map((log) => {
                    const isSelected = editingLogId === log.id;
                    const hasNote = !!log.comment;

                    return (
                      <TouchableOpacity
                        key={log.id}
                        style={[styles.setTableRow, isSelected && { backgroundColor: `${colors.primary}18` }]}
                        onPress={() => handleSelectSetForEdit(log)}
                        onLongPress={() => handleDeleteSet(log.id)}
                        activeOpacity={0.7}
                      >
                        {/* Left: Note Icon */}
                        <TouchableOpacity
                          style={styles.setRowNoteBtn}
                          onPress={() => {
                            handleSelectSetForEdit(log);
                            setShowNoteInput(true);
                          }}
                        >
                          <MessageSquare
                            size={18}
                            color={hasNote ? colors.primary : '#475569'}
                            fill={hasNote ? colors.primary : 'transparent'}
                          />
                        </TouchableOpacity>

                        {/* Set Number */}
                        <Text style={[styles.setRowNumber, isSelected && { color: colors.primary, fontWeight: '800' }]}>
                          {log.set_number}
                        </Text>

                        {/* Weight Value */}
                        <Text style={styles.setRowWeight}>
                          {isWeightReps
                            ? `${(Math.round(log.weight_kg * 10) / 10).toFixed(1)} kgs`
                            : isDistanceTime
                            ? `${log.distance_val} km`
                            : log.time_duration}
                        </Text>

                        {/* Reps Value */}
                        <Text style={[styles.setRowReps, { color: isSelected ? colors.primary : '#F1F5F9' }]}>
                          {isWeightReps ? `${log.reps} reps` : isDistanceTime ? log.time_duration : ''}
                        </Text>

                        {/* Trash Delete on right */}
                        <TouchableOpacity
                          style={styles.setRowTrashBtn}
                          onPress={() => handleDeleteSet(log.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color="#475569" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ======================= TAB 2: HISTORY ======================= */}
            {activeTab === 'history' && (
              <View style={styles.historyContainer}>
                {historySessions.length > 0 ? (
                  historySessions.map((item) => (
                    <View key={item.date} style={styles.historyGroupCard}>
                      <View style={styles.historyHeaderRow}>
                        <Calendar size={15} color={colors.primary} />
                        <Text style={styles.historyDateText}>
                          {formatDisplayDate(item.date).toUpperCase()}
                        </Text>
                      </View>

                      {item.logs.map((s) => (
                        <View key={s.id} style={styles.historySetItemRow}>
                          <Text style={styles.histItemSetNum}>{s.set_number}</Text>
                          <Text style={styles.histItemWeight}>
                            {isWeightReps ? `${(Math.round(s.weight_kg * 10) / 10).toFixed(1)} kgs` : `${s.distance_val} km`}
                          </Text>
                          <Text style={styles.histItemReps}>
                            {isWeightReps ? `${s.reps} reps` : s.time_duration}
                          </Text>
                          {s.comment && (
                            <Text style={styles.histItemComment} numberOfLines={1}>
                              💬 {s.comment}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyViewText}>No past history logged yet.</Text>
                  </View>
                )}
              </View>
            )}

            {/* ======================= TAB 3: GRAPH (With Value Labels on Every Point!) ======================= */}
            {activeTab === 'graph' && (
              <View style={styles.graphContainer}>
                <View style={styles.graphMetricSwitchRow}>
                  {[
                    { key: '1rm' as const, label: 'Estimated 1RM' },
                    { key: 'max_weight' as const, label: 'Max Weight' },
                    { key: 'volume' as const, label: 'Volume' },
                  ].map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.graphMetricPill, graphMetric === m.key && { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setGraphMetric(m.key);
                        loadAllData();
                      }}
                    >
                      <Text style={[styles.graphMetricText, graphMetric === m.key && { color: colors.textInverse, fontWeight: '800' }]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {progressionData.length > 0 ? (
                  <View style={styles.chartWrapper}>
                    {progressionData.length > 1 ? (
                      <Svg width={330} height={200}>
                        {/* Horizontal Grid lines */}
                        {[0, 0.5, 1].map((pct, idx) => (
                          <Line
                            key={idx}
                            x1={24}
                            y1={200 - 30 - pct * 130}
                            x2={306}
                            y2={200 - 30 - pct * 130}
                            stroke="#26282E"
                            strokeDasharray="4 4"
                          />
                        ))}

                        {/* Polyline */}
                        <Polyline
                          points={progressionData
                            .map((d, idx) => {
                              const values = progressionData.map((p) => p.value);
                              const minVal = Math.floor(Math.min(...values) * 0.85);
                              const maxVal = Math.ceil(Math.max(...values) * 1.15) || 10;
                              const valRange = maxVal - minVal || 1;
                              const x = 24 + (idx / (progressionData.length - 1)) * (330 - 48);
                              const y = 200 - 30 - ((d.value - minVal) / valRange) * 130;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke={colors.primary}
                          strokeWidth={3}
                        />

                        {/* Value Labels & Circles on every point (Requirement 1) */}
                        {progressionData.map((d, idx) => {
                          const values = progressionData.map((p) => p.value);
                          const minVal = Math.floor(Math.min(...values) * 0.85);
                          const maxVal = Math.ceil(Math.max(...values) * 1.15) || 10;
                          const valRange = maxVal - minVal || 1;
                          const x = 24 + (idx / (progressionData.length - 1)) * (330 - 48);
                          const y = 200 - 30 - ((d.value - minVal) / valRange) * 130;
                          const isMax = d.value === Math.max(...values);

                          return (
                            <React.Fragment key={idx}>
                              {/* Circle Point */}
                              <Circle
                                cx={x}
                                cy={y}
                                r={isMax ? 6 : 4.5}
                                fill={isMax ? '#FBBF24' : colors.primary}
                                stroke="#121316"
                                strokeWidth={2}
                              />

                              {/* Exact Numeric Value Label above circle */}
                              <SvgText
                                x={x}
                                y={y - 9}
                                fill={isMax ? '#FBBF24' : '#E2E8F0'}
                                fontSize="11"
                                fontWeight="800"
                                textAnchor="middle"
                              >
                                {d.value}
                              </SvgText>
                            </React.Fragment>
                          );
                        })}
                      </Svg>
                    ) : (
                      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <Text style={{ ...typography.mono, fontSize: 36, color: colors.primary, fontWeight: '900' }}>
                          {progressionData[0]?.value} kg
                        </Text>
                        <Text style={{ ...typography.caption, color: '#94A3B8', marginTop: 4 }}>
                          Recorded on {progressionData[0]?.displayDate}
                        </Text>
                      </View>
                    )}

                    <View style={styles.chartDatesRow}>
                      <Text style={styles.chartDateLabel}>{progressionData[0]?.displayDate}</Text>
                      <Text style={[styles.chartDateLabel, { color: colors.primary, fontWeight: '800' }]}>
                        Best PR: {Math.max(...progressionData.map((p) => p.value))} kg 🏆
                      </Text>
                      <Text style={styles.chartDateLabel}>{progressionData[progressionData.length - 1]?.displayDate}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyViewText}>Log sets to see progression graph.</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Plate Calculator Sub-Modal */}
      <PlateCalculatorModal
        visible={isPlateModalOpen}
        initialWeight={parseFloat(weightKg) || 60}
        exerciseName={exercise.name}
        onClose={() => setIsPlateModalOpen(false)}
      />
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  appBarBack: {
    padding: 6,
  },
  appBarTitle: {
    ...typography.titleMedium,
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  appBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appBarIconBtn: {
    padding: 6,
  },
  tabNavRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabNavItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabNavItem: {
    borderBottomWidth: 3,
  },
  tabNavText: {
    ...typography.caption,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scrollBody: {
    flex: 1,
  },
  scrollBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  trackContainer: {
    gap: 8,
  },
  fieldSection: {
    marginBottom: 8,
  },
  fieldHeaderLine: {
    borderBottomWidth: 2,
    paddingBottom: 4,
    marginBottom: 8,
  },
  fieldHeaderLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.6,
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bigMinusButton: {
    width: 72,
    height: 50,
    backgroundColor: '#262930',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlusButton: {
    width: 72,
    height: 50,
    backgroundColor: '#262930',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigValueDisplay: {
    flex: 1,
    height: 50,
    backgroundColor: '#18191D',
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
    borderRadius: 12,
    ...typography.mono,
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  noteInputWrapper: {
    backgroundColor: '#18191D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 4,
  },
  noteInputText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  saveActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveActionText: {
    ...typography.titleSmall,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  clearActionButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#262930',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearActionText: {
    ...typography.titleSmall,
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  setsTableWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#26282E',
    marginTop: 4,
  },
  setTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#202227',
    borderRadius: 8,
  },
  setRowNoteBtn: {
    width: 32,
    alignItems: 'center',
  },
  setRowNumber: {
    ...typography.titleSmall,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  setRowWeight: {
    ...typography.body,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  setRowReps: {
    ...typography.body,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    width: 90,
    textAlign: 'right',
    paddingRight: 10,
  },
  setRowTrashBtn: {
    padding: 6,
  },
  historyContainer: {
    gap: 12,
  },
  historyGroupCard: {
    backgroundColor: '#18191D',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26282E',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#26282E',
    marginBottom: 6,
  },
  historyDateText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  historySetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  histItemSetNum: {
    ...typography.caption,
    color: '#94A3B8',
    width: 30,
  },
  histItemWeight: {
    ...typography.body,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
  },
  histItemReps: {
    ...typography.body,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    width: 70,
  },
  histItemComment: {
    ...typography.caption,
    color: '#64748B',
  },
  graphContainer: {
    gap: 12,
    alignItems: 'center',
  },
  graphMetricSwitchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  graphMetricPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#262930',
    borderRadius: 16,
  },
  graphMetricText: {
    ...typography.caption,
    fontSize: 11,
    color: '#E2E8F0',
  },
  chartWrapper: {
    backgroundColor: '#18191D',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#26282E',
    alignItems: 'center',
    width: '100%',
  },
  chartDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  chartDateLabel: {
    ...typography.caption,
    fontSize: 10,
    color: '#94A3B8',
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyViewText: {
    color: '#64748B',
    fontSize: 13,
  },
});
