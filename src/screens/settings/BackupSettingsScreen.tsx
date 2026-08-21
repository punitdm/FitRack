import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ArrowLeft, Download, Upload, ShieldCheck, FileSpreadsheet } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  exportExerciseLogs,
  exportMealLogs,
  exportBodyStats,
  exportExerciseCatalog,
} from '../../utils/csvExporter';
import {
  detectCsvType,
  importExerciseLogsCsv,
  importMealLogsCsv,
  importBodyStatsCsv,
} from '../../utils/csvImporter';

interface BackupSettingsScreenProps {
  db: SQLite.SQLiteDatabase;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const BackupSettingsScreen: React.FC<BackupSettingsScreenProps> = ({
  db,
  onBack,
  onShowToast,
}) => {
  const { colors } = useTheme();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportExercises = async () => {
    try {
      setIsExporting(true);
      const res = await exportExerciseLogs(db);
      if (res.success) onShowToast('success', res.message);
      else onShowToast('error', res.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMeals = async () => {
    try {
      setIsExporting(true);
      const res = await exportMealLogs(db);
      if (res.success) onShowToast('success', res.message);
      else onShowToast('error', res.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBodyStats = async () => {
    try {
      setIsExporting(true);
      const res = await exportBodyStats(db);
      if (res.success) onShowToast('success', res.message);
      else onShowToast('error', res.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCatalog = async () => {
    try {
      setIsExporting(true);
      const res = await exportExerciseCatalog(db);
      if (res.success) onShowToast('success', res.message);
      else onShowToast('error', res.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async () => {
    try {
      setIsImporting(true);
      const pickerRes = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickerRes.canceled || !pickerRes.assets || pickerRes.assets.length === 0) {
        setIsImporting(false);
        return;
      }

      const file = pickerRes.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Parse headers to auto-detect CSV type
      const parsed = Papa.parse<string[]>(content, { preview: 1 });
      const headers = parsed.data && parsed.data.length > 0 ? parsed.data[0] : [];
      const detectedType = detectCsvType(headers);

      let importRes;
      if (detectedType === 'exercises') {
        importRes = await importExerciseLogsCsv(db, content);
      } else if (detectedType === 'macros') {
        importRes = await importMealLogsCsv(db, content);
      } else if (detectedType === 'stats') {
        importRes = await importBodyStatsCsv(db, content);
      } else {
        // Fallback try exercise logs
        importRes = await importExerciseLogsCsv(db, content);
      }

      if (importRes.success) {
        onShowToast('success', importRes.message);
      } else {
        onShowToast('error', importRes.message);
      }
    } catch (e: any) {
      console.error(e);
      onShowToast('error', `Import failed: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Backup & Data</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Privacy Card */}
        <Card style={[styles.privacyCard, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
          <ShieldCheck size={20} color={colors.primary} />
          <Text style={[styles.privacyText, { color: colors.text }]}>
            FitRack is 100% offline. Export CSV backups regularly so you never lose your workout history.
          </Text>
        </Card>

        {/* CSV Export Options */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Download size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Export CSV Backups</Text>
          </View>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Export your data into standard CSV spreadsheets compatible with FitNotes, Google Sheets, and Excel:
          </Text>

          <View style={styles.exportButtonsList}>
            <Button
              title="Export Workout Logs (ExerciseLogs.csv)"
              icon={<FileSpreadsheet size={16} color={colors.textInverse} />}
              variant="primary"
              size="md"
              onPress={handleExportExercises}
              loading={isExporting}
            />

            <Button
              title="Export Meal Logs (MealLogs.csv)"
              variant="secondary"
              size="md"
              onPress={handleExportMeals}
              loading={isExporting}
            />

            <Button
              title="Export Body Measurements (BodyStats.csv)"
              variant="secondary"
              size="md"
              onPress={handleExportBodyStats}
              loading={isExporting}
            />

            <Button
              title="Export Exercise Catalog (Exercises.csv)"
              variant="secondary"
              size="md"
              onPress={handleExportCatalog}
              loading={isExporting}
            />
          </View>
        </Card>

        {/* CSV Import */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Upload size={20} color={colors.secondary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Import CSV Backup</Text>
          </View>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Restore past logs from previously exported FitRack files, FitNotes CSV backups, or custom spreadsheets.
          </Text>

          <Button
            title="Select & Import CSV File"
            icon={<Upload size={16} color={colors.text} />}
            variant="outline"
            size="md"
            onPress={handleImportFile}
            loading={isImporting}
            style={{ marginTop: spacing.xs }}
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
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  privacyText: {
    flex: 1,
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  cardTitle: {
    ...typography.titleSmall,
    fontSize: 16,
  },
  cardSub: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  exportButtonsList: {
    gap: 8,
  },
});
