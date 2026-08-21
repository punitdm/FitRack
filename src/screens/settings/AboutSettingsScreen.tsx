import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Info, Database, Trash2, Heart, Shield } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { getDatabaseSummary, clearAllUserData } from '../../db/database';

interface AboutSettingsScreenProps {
  db: SQLite.SQLiteDatabase;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const AboutSettingsScreen: React.FC<AboutSettingsScreenProps> = ({
  db,
  onBack,
  onShowToast,
}) => {
  const { colors } = useTheme();
  const [dbStats, setDbStats] = useState({
    totalExercises: 0,
    totalSessions: 0,
    totalSets: 0,
    totalMacroDays: 0,
    totalBodyStatDays: 0,
    totalTemplates: 0,
    totalFoods: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const stats = await getDatabaseSummary(db);
    setDbStats(stats);
  };

  const handleResetData = () => {
    Alert.alert(
      '⚠️ Clear All User Data',
      'This will erase all recorded workout sessions, sets, macro logs, and body stats. Built-in exercises and themes will remain intact.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllUserData(db);
            await loadStats();
            onShowToast('info', 'All user data cleared.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>About FitRack</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* App Info Card */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border, alignItems: 'center' }]}>
          <View style={[styles.iconBg, { backgroundColor: colors.primaryMuted }]}>
            <Text style={{ fontSize: 32 }}>🏋️</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>FitRack</Text>
          <Text style={[styles.appVersion, { color: colors.textMuted }]}>Version 1.0.0 (Build 2026)</Text>
          <Text style={[styles.appDesc, { color: colors.textSecondary }]}>
            A fast, 100% offline fitness, workout, macro & hydration tracking app built with React Native, Expo, and embedded SQLite.
          </Text>
        </Card>

        {/* Database Health Card */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Database size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Offline SQLite Storage</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.statVal, { color: colors.text }]}>{dbStats.totalExercises}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Exercises</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.statVal, { color: colors.text }]}>{dbStats.totalSessions}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Sessions</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{dbStats.totalSets}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Sets Logged</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.statVal, { color: colors.secondary }]}>{dbStats.totalMacroDays}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Meal Days</Text>
            </View>
          </View>
        </Card>

        {/* Danger Zone: Reset Data */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.danger }]}>
          <Text style={[styles.cardTitle, { color: colors.danger }]}>Danger Zone</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Permanently erase all your workout session logs, sets, and macro logs from the local database.
          </Text>
          <Button
            title="Reset All Training Data"
            icon={<Trash2 size={16} color={colors.danger} />}
            variant="outline"
            size="md"
            onPress={handleResetData}
            style={{ borderColor: colors.danger, marginTop: spacing.xs }}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  backText: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  headerTitle: {
    ...typography.titleMedium,
    fontSize: 17,
  },
  scrollContent: {
    flex: 1,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    ...typography.titleLarge,
    fontSize: 22,
    fontWeight: '900',
  },
  appVersion: {
    ...typography.caption,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  appDesc: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  cardSub: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statVal: {
    ...typography.mono,
    fontSize: 20,
  },
  statKey: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
});
