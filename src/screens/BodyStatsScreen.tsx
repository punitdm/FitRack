import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ruler, Scale, Save, Activity, TrendingDown, TrendingUp } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { colors, typography, borderRadius, spacing } from '../theme/theme';
import { BodyStats } from '../types/database';
import { getBodyStats, saveBodyStats, getAllBodyStats } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { formatDisplayDate, formatShortDate } from '../utils/dateUtils';

interface BodyStatsScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const BodyStatsScreen: React.FC<BodyStatsScreenProps> = ({
  db,
  selectedDate,
  onShowToast,
}) => {
  const [stats, setStats] = useState<BodyStats>({
    date: selectedDate,
    weight_kg: null,
    body_fat: null,
    chest: null,
    waist: null,
    hips: null,
    thigh: null,
    arm: null,
  });

  const [allStats, setAllStats] = useState<BodyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const current = await getBodyStats(db, selectedDate);
      if (current) {
        setStats(current);
      } else {
        setStats({
          date: selectedDate,
          weight_kg: null,
          body_fat: null,
          chest: null,
          waist: null,
          hips: null,
          thigh: null,
          arm: null,
        });
      }

      const list = await getAllBodyStats(db);
      setAllStats(list);
    } catch (err: any) {
      console.error(err);
      onShowToast('error', `Failed to load body stats: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveBodyStats(db, stats);
      onShowToast('success', 'Body stats recorded!');
      const list = await getAllBodyStats(db);
      setAllStats(list);
    } catch (err: any) {
      onShowToast('error', `Failed to save body stats: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof BodyStats, val: string) => {
    const num = parseFloat(val);
    setStats((prev) => ({
      ...prev,
      [field]: isNaN(num) ? null : num,
    }));
  };

  // Find latest recorded weight for trend
  const previousRecord = allStats.find((s) => s.date < selectedDate && s.weight_kg != null);
  const weightDiff =
    stats.weight_kg != null && previousRecord?.weight_kg != null
      ? Math.round((stats.weight_kg - previousRecord.weight_kg) * 10) / 10
      : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />}
      >
        {/* Main Weight & Body Fat Card */}
        <Card style={styles.mainMetricsCard}>
          <View style={styles.metricColumn}>
            <View style={styles.metricHeader}>
              <Scale size={16} color={colors.primary} />
              <Text style={styles.metricTitle}>Weight (kg)</Text>
            </View>
            <TextInput
              style={styles.bigNumericInput}
              keyboardType="decimal-pad"
              value={stats.weight_kg != null ? String(stats.weight_kg) : ''}
              placeholder="0.0"
              placeholderTextColor={colors.textDisabled}
              onChangeText={(v) => updateField('weight_kg', v)}
            />
            {weightDiff !== null && (
              <View style={styles.trendRow}>
                {weightDiff >= 0 ? (
                  <TrendingUp size={12} color={colors.warning} />
                ) : (
                  <TrendingDown size={12} color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.trendText,
                    { color: weightDiff >= 0 ? colors.warning : colors.primary },
                  ]}
                >
                  {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg vs last log
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricColumn}>
            <View style={styles.metricHeader}>
              <Activity size={16} color={colors.secondary} />
              <Text style={styles.metricTitle}>Body Fat (%)</Text>
            </View>
            <TextInput
              style={styles.bigNumericInput}
              keyboardType="decimal-pad"
              value={stats.body_fat != null ? String(stats.body_fat) : ''}
              placeholder="0.0"
              placeholderTextColor={colors.textDisabled}
              onChangeText={(v) => updateField('body_fat', v)}
            />
          </View>
        </Card>

        {/* Circumference Measurements Card */}
        <Card style={styles.measurementsCard}>
          <View style={styles.measurementsHeader}>
            <Ruler size={16} color={colors.accent} />
            <Text style={styles.measurementsTitle}>Circumference Measurements (in/cm)</Text>
          </View>

          <View style={styles.gridRow}>
            {/* Chest */}
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Chest</Text>
              <TextInput
                style={styles.gridInput}
                keyboardType="decimal-pad"
                value={stats.chest != null ? String(stats.chest) : ''}
                placeholder="—"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(v) => updateField('chest', v)}
              />
            </View>

            {/* Waist */}
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Waist</Text>
              <TextInput
                style={styles.gridInput}
                keyboardType="decimal-pad"
                value={stats.waist != null ? String(stats.waist) : ''}
                placeholder="—"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(v) => updateField('waist', v)}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            {/* Hips */}
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Hips</Text>
              <TextInput
                style={styles.gridInput}
                keyboardType="decimal-pad"
                value={stats.hips != null ? String(stats.hips) : ''}
                placeholder="—"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(v) => updateField('hips', v)}
              />
            </View>

            {/* Thigh */}
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Thigh</Text>
              <TextInput
                style={styles.gridInput}
                keyboardType="decimal-pad"
                value={stats.thigh != null ? String(stats.thigh) : ''}
                placeholder="—"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(v) => updateField('thigh', v)}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            {/* Arm */}
            <View style={styles.gridCol}>
              <Text style={styles.fieldLabel}>Arm / Bicep</Text>
              <TextInput
                style={styles.gridInput}
                keyboardType="decimal-pad"
                value={stats.arm != null ? String(stats.arm) : ''}
                placeholder="—"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(v) => updateField('arm', v)}
              />
            </View>
            <View style={styles.gridCol} />
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title="Save Body Stats"
          icon={<Save size={16} color={colors.textInverse} />}
          variant="primary"
          size="lg"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
        />

        {/* Historical Body Stats Log */}
        {allStats.length > 0 && (
          <Card style={styles.historyCard}>
            <Text style={styles.historySectionTitle}>Body Stats History ({allStats.length})</Text>

            <View style={styles.tableHead}>
              <Text style={[styles.th, { width: 75 }]}>DATE</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>WEIGHT</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>BF%</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>WAIST</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>CHEST</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ARM</Text>
            </View>

            {allStats.map((item) => (
              <View key={item.date} style={styles.tableRow}>
                <Text style={[styles.td, { width: 75, color: colors.textSecondary }]}>
                  {formatShortDate(item.date)}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'center', color: colors.primary }]}>
                  {item.weight_kg != null ? `${item.weight_kg}kg` : '—'}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'center', color: colors.secondary }]}>
                  {item.body_fat != null ? `${item.body_fat}%` : '—'}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                  {item.waist != null ? item.waist : '—'}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                  {item.chest != null ? item.chest : '—'}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                  {item.arm != null ? item.arm : '—'}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  mainMetricsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  bigNumericInput: {
    ...typography.mono,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    minWidth: 100,
    paddingVertical: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  trendText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  measurementsCard: {
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  measurementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  measurementsTitle: {
    ...typography.titleSmall,
    color: colors.text,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridCol: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  gridInput: {
    ...typography.mono,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  saveBtn: {
    marginBottom: spacing.lg,
  },
  historyCard: {
    backgroundColor: colors.surfaceCard,
  },
  historySectionTitle: {
    ...typography.titleSmall,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  th: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  td: {
    ...typography.mono,
    fontSize: 11,
    color: colors.text,
  },
});
