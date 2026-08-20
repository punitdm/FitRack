import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  UploadCloud,
  DownloadCloud,
  Database,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Palette,
  Moon,
  Sun,
  Check,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import {
  colors as defaultColors,
  typography,
  borderRadius,
  spacing,
  useTheme,
  ACCENT_PRESETS,
  AccentKey,
  ThemeMode,
} from '../theme/theme';
import {
  getDatabaseSummary,
  clearAllUserData,
  getAllExercises,
  deleteCustomExercise,
} from '../db/database';
import {
  importExerciseLogsCsv,
  importMealLogsCsv,
  importBodyStatsCsv,
  detectCsvType,
  ImportResult,
} from '../utils/csvImporter';
import {
  exportExerciseLogs,
  exportMealLogs,
  exportBodyStats,
  exportExerciseCatalog,
} from '../utils/csvExporter';
import { Exercise } from '../types/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

interface ImportExportScreenProps {
  db: SQLite.SQLiteDatabase;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const ImportExportScreen: React.FC<ImportExportScreenProps> = ({
  db,
  onShowToast,
}) => {
  const { colors, mode, accent, setMode, setAccent } = useTheme();

  const [dbSummary, setDbSummary] = useState({
    totalExercises: 0,
    totalSessions: 0,
    totalSets: 0,
    totalMacroDays: 0,
    totalBodyStatDays: 0,
  });

  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const summary = await getDatabaseSummary(db);
      setDbSummary(summary);

      const allEx = await getAllExercises(db);
      setCustomExercises(allEx.filter((e) => e.is_custom === 1));
    } catch (e) {
      console.error(e);
    }
  }, [db]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Pick and import CSV
  const handleImportFile = async (forcedType?: 'exercises' | 'macros' | 'stats') => {
    try {
      setIsProcessing(true);
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        setIsProcessing(false);
        return;
      }

      const fileAsset = pickerResult.assets[0];
      const csvContent = await FileSystem.readAsStringAsync(fileAsset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!csvContent || csvContent.trim().length === 0) {
        onShowToast('error', 'Selected file is empty');
        setIsProcessing(false);
        return;
      }

      let result: ImportResult;

      if (forcedType === 'exercises') {
        result = await importExerciseLogsCsv(db, csvContent);
      } else if (forcedType === 'macros') {
        result = await importMealLogsCsv(db, csvContent);
      } else if (forcedType === 'stats') {
        result = await importBodyStatsCsv(db, csvContent);
      } else {
        const firstLine = csvContent.split('\n')[0] || '';
        const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const detected = detectCsvType(headers);

        if (detected === 'exercises') {
          result = await importExerciseLogsCsv(db, csvContent);
        } else if (detected === 'macros') {
          result = await importMealLogsCsv(db, csvContent);
        } else if (detected === 'stats') {
          result = await importBodyStatsCsv(db, csvContent);
        } else {
          result = {
            success: false,
            type: 'unknown',
            totalRows: 0,
            importedCount: 0,
            errorCount: 1,
            message: 'Unable to auto-detect CSV type. Please choose a specific import button.',
            errors: ['Unknown column headers: ' + firstLine],
          };
        }
      }

      setLastImportResult(result);

      if (result.success) {
        onShowToast('success', result.message);
        await loadSummary();
      } else {
        onShowToast('error', result.message);
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('error', `Import failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export handlers
  const handleExportExercises = async () => {
    setIsProcessing(true);
    const res = await exportExerciseLogs(db);
    setIsProcessing(false);
    onShowToast(res.success ? 'success' : 'error', res.message);
  };

  const handleExportMeals = async () => {
    setIsProcessing(true);
    const res = await exportMealLogs(db);
    setIsProcessing(false);
    onShowToast(res.success ? 'success' : 'error', res.message);
  };

  const handleExportStats = async () => {
    setIsProcessing(true);
    const res = await exportBodyStats(db);
    setIsProcessing(false);
    onShowToast(res.success ? 'success' : 'error', res.message);
  };

  const handleExportCatalog = async () => {
    setIsProcessing(true);
    const res = await exportExerciseCatalog(db);
    setIsProcessing(false);
    onShowToast(res.success ? 'success' : 'error', res.message);
  };

  // Delete custom exercise
  const handleDeleteCustomEx = async (id: number, name: string) => {
    Alert.alert('Delete Exercise', `Are you sure you want to delete "${name}" from your catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomExercise(db, id);
          await loadSummary();
          onShowToast('info', `Deleted ${name}`);
        },
      },
    ]);
  };

  // Clear data
  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Clear All User Data',
      'This will delete all logged workouts, sets, meal logs, and body stats. Pre-seeded exercises will remain. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllUserData(db);
            await loadSummary();
            onShowToast('success', 'User data wiped successfully');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================= 1. THEME & APPEARANCE CARD ================= */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance & Theme</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                Customize Dark/Light mode and app accent color
              </Text>
            </View>
          </View>

          {/* Mode Switcher */}
          <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>COLOR THEME</Text>
          <View style={[styles.modeToggleRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'dark' && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, borderWidth: 1 }]}
              onPress={() => setMode('dark')}
              activeOpacity={0.7}
            >
              <Moon size={16} color={mode === 'dark' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeBtnText, { color: mode === 'dark' ? colors.text : colors.textMuted }]}>
                Dark Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === 'light' && { backgroundColor: '#FFFFFF', borderColor: colors.primary, borderWidth: 1 }]}
              onPress={() => setMode('light')}
              activeOpacity={0.7}
            >
              <Sun size={16} color={mode === 'light' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeBtnText, { color: mode === 'light' ? colors.text : colors.textMuted }]}>
                Light Mode
              </Text>
            </TouchableOpacity>
          </View>

          {/* Accent Color Palette Picker */}
          <Text style={[styles.controlLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
            ACCENT COLOR PALETTE
          </Text>
          <View style={styles.accentGrid}>
            {(Object.keys(ACCENT_PRESETS) as AccentKey[]).map((accKey) => {
              const config = ACCENT_PRESETS[accKey];
              const isSelected = accent === accKey;

              return (
                <TouchableOpacity
                  key={accKey}
                  style={[
                    styles.accentChip,
                    { borderColor: isSelected ? config.primary : colors.border },
                    isSelected && { backgroundColor: config.primaryMuted },
                  ]}
                  onPress={() => setAccent(accKey)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.accentCircle, { backgroundColor: config.primary }]}>
                    {isSelected && <Check size={14} color="#000" />}
                  </View>
                  <Text style={[styles.accentName, { color: isSelected ? colors.text : colors.textSecondary }]}>
                    {config.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ================= 2. DATABASE DIAGNOSTICS ================= */}
        <Card style={[styles.dbCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.dbCardHeader}>
            <Database size={18} color={colors.primary} />
            <Text style={[styles.dbCardTitle, { color: colors.text }]}>Local SQLite Database (`fitrack.db`)</Text>
          </View>

          <View style={[styles.summaryGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{dbSummary.totalExercises}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Exercises</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{dbSummary.totalSessions}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Workouts</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{dbSummary.totalSets}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Sets Logged</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: colors.primary }]}>{dbSummary.totalMacroDays}</Text>
              <Text style={[styles.statKey, { color: colors.textMuted }]}>Macro Days</Text>
            </View>
          </View>
        </Card>

        {/* ================= 3. IMPORT CSV SECTION ================= */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <UploadCloud size={18} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Import CSV Files</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                Import your existing workout & meal data from Google Sheets / FitNotes exports.
              </Text>
            </View>
          </View>

          <View style={styles.btnGrid}>
            <Button
              title="Auto-Detect & Import CSV"
              variant="secondary"
              onPress={() => handleImportFile()}
              disabled={isProcessing}
              style={{ marginBottom: 6 }}
            />

            <View style={styles.buttonRow}>
              <Button
                title="ExerciseLogs.csv"
                variant="outline"
                size="sm"
                onPress={() => handleImportFile('exercises')}
                disabled={isProcessing}
                style={{ flex: 1 }}
              />
              <Button
                title="MealLogs.csv"
                variant="outline"
                size="sm"
                onPress={() => handleImportFile('macros')}
                disabled={isProcessing}
                style={{ flex: 1 }}
              />
              <Button
                title="BodyStats.csv"
                variant="outline"
                size="sm"
                onPress={() => handleImportFile('stats')}
                disabled={isProcessing}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Last Import Result Card */}
          {lastImportResult && (
            <View
              style={[
                styles.resultCard,
                lastImportResult.success ? styles.resultSuccess : styles.resultError,
              ]}
            >
              {lastImportResult.success ? (
                <CheckCircle2 size={16} color={colors.primary} />
              ) : (
                <AlertTriangle size={16} color={colors.danger} />
              )}
              <Text style={[styles.resultText, { color: colors.text }]}>{lastImportResult.message}</Text>
            </View>
          )}
        </Card>

        {/* ================= 4. EXPORT & BACKUP SECTION ================= */}
        <Card style={[styles.sectionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <DownloadCloud size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Export & Local Backup</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                Export all your data into clean CSVs. Compatible with Excel, Google Sheets, and FitNotes.
              </Text>
            </View>
          </View>

          <View style={styles.buttonCol}>
            <Button
              title="Export Workout Logs (ExerciseLogs.csv)"
              icon={<FileSpreadsheet size={15} color={colors.text} />}
              variant="secondary"
              onPress={handleExportExercises}
              disabled={isProcessing}
              style={styles.exportBtn}
            />

            <Button
              title="Export Meal Logs (MealLogs.csv)"
              icon={<FileSpreadsheet size={15} color={colors.text} />}
              variant="secondary"
              onPress={handleExportMeals}
              disabled={isProcessing}
              style={styles.exportBtn}
            />

            <Button
              title="Export Body Stats (BodyStats.csv)"
              icon={<FileSpreadsheet size={15} color={colors.text} />}
              variant="secondary"
              onPress={handleExportStats}
              disabled={isProcessing}
              style={styles.exportBtn}
            />

            <Button
              title="Export Exercise Catalog (Exercises.csv)"
              icon={<FileSpreadsheet size={15} color={colors.text} />}
              variant="secondary"
              onPress={handleExportCatalog}
              disabled={isProcessing}
              style={styles.exportBtn}
            />
          </View>
        </Card>

        {/* ================= 5. CUSTOM EXERCISES ================= */}
        {customExercises.length > 0 && (
          <Card style={[styles.sectionCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Layers size={18} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Custom Exercises ({customExercises.length})</Text>
            </View>

            {customExercises.map((ex) => (
              <View key={ex.id} style={[styles.customExRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.customExName, { color: colors.text }]}>{ex.name}</Text>
                  <Text style={[styles.customExSub, { color: colors.textMuted }]}>{ex.category} • {ex.tracking_type}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteCustomEx(ex.id, ex.name)}
                  style={styles.deleteExBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        {/* ================= 6. DANGER ZONE ================= */}
        <Card style={[styles.dangerCard, { backgroundColor: colors.dangerMuted }]}>
          <View style={styles.dangerHeader}>
            <AlertTriangle size={18} color={colors.danger} />
            <Text style={[styles.dangerTitle, { color: colors.danger }]}>Danger Zone</Text>
          </View>
          <Text style={[styles.dangerSub, { color: colors.textMuted }]}>
            Permanently clear all workout sessions, sets, macro entries, and body stats from the local database.
          </Text>
          <Button
            title="Erase All User Data"
            variant="danger"
            size="md"
            onPress={handleClearAllData}
            disabled={isProcessing}
            style={{ marginTop: spacing.sm }}
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontSize: 16,
  },
  sectionSub: {
    ...typography.caption,
    marginTop: 2,
    lineHeight: 16,
  },
  controlLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modeToggleRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  modeBtnText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accentChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  accentCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentName: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  dbCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  dbCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dbCardTitle: {
    ...typography.titleSmall,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  statCell: {
    alignItems: 'center',
  },
  statVal: {
    ...typography.mono,
    fontSize: 18,
  },
  statKey: {
    ...typography.caption,
    marginTop: 2,
  },
  btnGrid: {
    gap: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  buttonCol: {
    gap: 8,
  },
  exportBtn: {
    justifyContent: 'flex-start',
    paddingLeft: spacing.lg,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
    borderColor: '#A3E635',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  resultText: {
    ...typography.caption,
    flex: 1,
  },
  customExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  customExName: {
    ...typography.body,
    fontWeight: '600',
  },
  customExSub: {
    ...typography.caption,
    marginTop: 2,
  },
  deleteExBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  dangerTitle: {
    ...typography.titleSmall,
  },
  dangerSub: {
    ...typography.caption,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
});
