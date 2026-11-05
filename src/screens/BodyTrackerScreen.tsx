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
  Scale,
  TrendingDown,
  TrendingUp,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { BodyStats } from '../types/database';
import {
  getAllBodyStats,
  getBodyStats,
  saveBodyStats,
} from '../db/database';
import { formatDisplayDate, shiftDate } from '../utils/dateUtils';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

import { PopIn } from '../components/common/Motion';
import { useUnits } from '../utils/units';
import { notify } from '../utils/feedback';
interface BodyTrackerScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onBackToHub: () => void;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const BodyTrackerScreen: React.FC<BodyTrackerScreenProps> = ({
  db,
  selectedDate,
  onBackToHub,
  onDateChange,
  onOpenDatePicker,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();
  const u = useUnits();

  const [allStats, setAllStats] = useState<BodyStats[]>([]);
  const [currentDayStat, setCurrentDayStat] = useState<BodyStats | null>(null);

  // Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [weightKg, setWeightKg] = useState('74.2');
  const [bodyFat, setBodyFat] = useState('15.0');
  const [chest, setChest] = useState('102');
  const [waist, setWaist] = useState('81');
  const [arm, setArm] = useState('38.5');
  const [thigh, setThigh] = useState('58');

  const loadData = async () => {
    try {
      const [all, today] = await Promise.all([
        getAllBodyStats(db),
        getBodyStats(db, selectedDate),
      ]);
      setAllStats(all);
      setCurrentDayStat(today);

      if (today?.weight_kg) {
        setWeightKg(String(u.toDisplay(today.weight_kg)));
        setBodyFat(today.body_fat ? String(today.body_fat) : '');
        setChest(today.chest ? String(today.chest) : '');
        setWaist(today.waist ? String(today.waist) : '');
        setArm(today.arm ? String(today.arm) : '');
        setThigh(today.thigh ? String(today.thigh) : '');
      } else if (all.length > 0 && all[0].weight_kg) {
        setWeightKg(String(u.toDisplay(all[0].weight_kg)));
        setBodyFat(all[0].body_fat ? String(all[0].body_fat) : '');
      }
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

  const handleSaveWeighIn = async () => {
    const wNum = u.fromDisplay(parseFloat(weightKg));
    if (!wNum || wNum <= 0) {
      notify('error', `Enter a valid weight in ${u.label}`);
      return;
    }

    await saveBodyStats(db, {
      date: selectedDate,
      weight_kg: wNum,
      body_fat: parseFloat(bodyFat) || null,
      chest: parseFloat(chest) || null,
      waist: parseFloat(waist) || null,
      arm: parseFloat(arm) || null,
      thigh: parseFloat(thigh) || null,
    });

    setIsLogModalOpen(false);
    loadData();
    onShowToast('success', `Logged ${u.fmt(wNum)}`);
  };

  // Prepare chart points (sorted chronologically)
  const weightPoints = allStats
    .filter((s) => s.weight_kg && s.weight_kg > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10); // last 10 weigh-ins

  const latestStat = allStats[0];
  const prevStat = allStats[1];
  let changeWeek: number | null = null;
  if (latestStat?.weight_kg && prevStat?.weight_kg) {
    changeWeek = Math.round((latestStat.weight_kg - prevStat.weight_kg) * 10) / 10;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. TOP APP BAR */}
      <View style={[styles.topAppBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToHub} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#A855F7" />
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
            <Calendar size={14} color="#A855F7" />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDisplayDate(selectedDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.arrowBtn} onPress={handleNextDay} activeOpacity={0.6}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: colors.pillars.body.soft, borderColor: '#A855F7' }]}
          onPress={() => setIsLogModalOpen(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#A855F7" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================= 2. CURRENT WEIGHT HERO CARD ================= */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.body.tint,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.heroSubHeader, { color: colors.textMuted }]}>Current body weight</Text>
          <Text style={[styles.heroWeightNum, { color: colors.text }]}>
            {latestStat?.weight_kg ? u.fmt(latestStat.weight_kg, { unit: false }) : '--'}
            <Text style={styles.heroWeightUnit}> {u.label}</Text>
          </Text>

          <View style={styles.heroTrendRow}>
            {changeWeek !== null && (
              <View
                style={[
                  styles.trendPill,
                  { backgroundColor: colors.pillars.body.soft },
                ]}
              >
                {changeWeek <= 0 ? (
                  <TrendingDown size={14} color="#22C55E" />
                ) : (
                  <TrendingUp size={14} color="#F59E0B" />
                )}
                <Text
                  style={[
                    styles.trendPillText,
                    { color: changeWeek <= 0 ? '#22C55E' : '#F59E0B' },
                  ]}
                >
                  {changeWeek > 0 ? '+' : changeWeek < 0 ? '-' : ''}{u.fmt(Math.abs(changeWeek))} this week
                </Text>
              </View>
            )}

            {latestStat?.body_fat && (
              <Text style={styles.bodyFatPill}>Body Fat: {latestStat.body_fat}%</Text>
            )}
          </View>
        </View>

        {/* ================= 3. WEIGHT TREND CHART ================= */}
        <View
          style={[
            styles.chartSection,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Weight trend (recent weigh-ins)</Text>

          {weightPoints.length > 1 ? (
            <View style={styles.chartWrapper}>
              <Svg width={330} height={180}>
                {/* Horizontal Grid lines */}
                {[0, 0.5, 1].map((pct, idx) => (
                  <Line
                    key={idx}
                    x1={20}
                    y1={180 - 25 - pct * 120}
                    x2={310}
                    y2={180 - 25 - pct * 120}
                    stroke={colors.pillars.body.soft}
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Polyline */}
                <Polyline
                  points={weightPoints
                    .map((d, idx) => {
                      const values = weightPoints.map((p) => p.weight_kg || 70);
                      const minVal = Math.floor(Math.min(...values) - 1);
                      const maxVal = Math.ceil(Math.max(...values) + 1) || 10;
                      const valRange = maxVal - minVal || 1;
                      const x = 20 + (idx / (weightPoints.length - 1)) * (330 - 40);
                      const y = 180 - 25 - (((d.weight_kg || 70) - minVal) / valRange) * 120;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth={3}
                />

                {/* Value Labels & Circles */}
                {weightPoints.map((d, idx) => {
                  const values = weightPoints.map((p) => p.weight_kg || 70);
                  const minVal = Math.floor(Math.min(...values) - 1);
                  const maxVal = Math.ceil(Math.max(...values) + 1) || 10;
                  const valRange = maxVal - minVal || 1;
                  const x = 20 + (idx / (weightPoints.length - 1)) * (330 - 40);
                  const y = 180 - 25 - (((d.weight_kg || 70) - minVal) / valRange) * 120;

                  return (
                    <React.Fragment key={idx}>
                      <Circle cx={x} cy={y} r={5} fill="#A855F7" stroke={colors.surfaceCard} strokeWidth={2} />
                      <SvgText
                        x={x}
                        y={y - 8}
                        fill={colors.text}
                        fontSize="10"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {d.weight_kg ? u.fmt(d.weight_kg, { unit: false }) : ''}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>

              <View style={styles.chartDatesRow}>
                <Text style={[styles.chartDateLabel, { color: colors.textMuted }]}>{weightPoints[0]?.date}</Text>
                <Text style={[styles.chartDateLabel, { color: colors.textMuted }]}>{weightPoints[weightPoints.length - 1]?.date}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyChartText, { color: colors.textMuted }]}>
                Log 2 or more weigh-ins to see your weight trend curve.
              </Text>
            </View>
          )}
        </View>

        {/* ================= 4. TAPE MEASUREMENTS ================= */}
        <View
          style={[
            styles.tapeSection,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Tape measurements (cm)</Text>

          <View style={[styles.tapeRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tapeLabel, { color: colors.textSecondary }]}>Chest</Text>
            <Text style={[styles.tapeValue, { color: colors.text }]}>
              {latestStat?.chest ? `${latestStat.chest} cm` : '--'}
            </Text>
          </View>

          <View style={[styles.tapeRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tapeLabel, { color: colors.textSecondary }]}>Waist</Text>
            <Text style={[styles.tapeValue, { color: colors.text }]}>
              {latestStat?.waist ? `${latestStat.waist} cm` : '--'}
            </Text>
          </View>

          <View style={[styles.tapeRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.tapeLabel, { color: colors.textSecondary }]}>Arms (Biceps)</Text>
            <Text style={[styles.tapeValue, { color: colors.text }]}>
              {latestStat?.arm ? `${latestStat.arm} cm` : '--'}
            </Text>
          </View>

          <View style={[styles.tapeRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.tapeLabel, { color: colors.textSecondary }]}>Thighs</Text>
            <Text style={[styles.tapeValue, { color: colors.text }]}>
              {latestStat?.thigh ? `${latestStat.thigh} cm` : '--'}
            </Text>
          </View>
        </View>

        {/* Quick Log Weigh-in Button */}
        <TouchableOpacity
          style={[styles.mainLogBtn, { backgroundColor: '#A855F7' }]}
          onPress={() => setIsLogModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.mainLogBtnText}>Log Weigh-in & Measurements</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Log Weigh-in Modal */}
      <Modal
        visible={isLogModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLogModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <PopIn
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>Log Body Weigh-in</Text>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Weight ({u.label})</Text>
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
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="74.2"
                  placeholderTextColor={colors.textDisabled}
                  selectTextOnFocus
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Body fat % (optional)</Text>
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
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder="14.8"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <Text style={[styles.modalSectionLabel, { color: '#A855F7' }]}>
                Tape measurements (cm)
              </Text>

              <View style={styles.modalFieldDouble}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Chest</Text>
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
                    value={chest}
                    onChangeText={setChest}
                    placeholder="102"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Waist</Text>
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
                    value={waist}
                    onChangeText={setWaist}
                    placeholder="81"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </View>

              <View style={styles.modalFieldDouble}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Arms</Text>
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
                    value={arm}
                    onChangeText={setArm}
                    placeholder="38.5"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Thighs</Text>
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
                    value={thigh}
                    onChangeText={setThigh}
                    placeholder="58"
                    placeholderTextColor={colors.textDisabled}
                  />
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[
                    styles.modalCancelBtn,
                    { backgroundColor: colors.pillars.body.soft },
                  ]}
                  onPress={() => setIsLogModalOpen(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: '#A855F7' }]}
                  onPress={handleSaveWeighIn}
                >
                  <Text style={styles.modalSaveText}>Save Stats</Text>
                </TouchableOpacity>
              </View>
            </PopIn>
          </ScrollView>
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
    color: '#A855F7',
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
  quickAddBtn: {
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
  heroSubHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  heroWeightNum: {
    ...typography.mono,
    fontSize: 48,
    fontWeight: '900',
    marginVertical: 4,
  },
  heroWeightUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A855F7',
  },
  heroTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  trendPillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  bodyFatPill: {
    ...typography.caption,
    fontSize: 11,
    color: '#A855F7',
    fontWeight: '700',
  },
  chartSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
    marginBottom: 10,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chartDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  chartDateLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  emptyChart: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 12,
  },
  tapeSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  tapeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tapeLabel: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  tapeValue: {
    ...typography.mono,
    fontSize: 14,
    fontWeight: '800',
  },
  mainLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 18,
    marginTop: 4,
  },
  mainLogBtnText: {
    ...typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
    justifyContent: 'center',
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    marginTop: 4,
  },
  modalField: {
    gap: 4,
  },
  modalFieldDouble: {
    flexDirection: 'row',
    gap: 10,
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
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
    fontWeight: '900',
    fontSize: 13,
  },
});
