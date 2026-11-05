import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { TouchableOpacity } from '../../components/common/Touchable';
import { Text } from '../../components/common/Typography';
import {
  ArrowLeft,
  Download,
  Upload,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Card } from '../../components/common/Card';
import {
  exportFullJsonBackup,
  smartImportFile,
} from '../../utils/jsonBackup';
import {
  exportExerciseLogs,
  exportMealLogs,
  exportBodyStats,
  exportExerciseCatalog,
} from '../../utils/csvExporter';

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
  const { colors, isDark } = useTheme();

  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // 1. Export Full JSON
  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      const res = await exportFullJsonBackup(db);
      if (res.success) {
        onShowToast('success', res.message);
      } else {
        onShowToast('error', res.message);
      }
    } finally {
      setIsExportingJson(false);
    }
  };

  // 2. Import JSON or CSV
  const handleImportFile = async () => {
    try {
      setIsImporting(true);
      const pickerRes = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'text/json',
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          '*/*',
        ],
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

      const res = await smartImportFile(db, content, file.name);
      if (res.success) {
        onShowToast('success', res.message);
      } else {
        onShowToast('error', res.message);
      }
    } catch (e: any) {
      onShowToast('error', `Import failed: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // 3. Optional CSV Exports for Excel
  const handleCsvExport = async (type: 'exercises' | 'meals' | 'body' | 'catalog') => {
    try {
      setIsExportingCsv(true);
      let res;
      if (type === 'exercises') res = await exportExerciseLogs(db);
      else if (type === 'meals') res = await exportMealLogs(db);
      else if (type === 'body') res = await exportBodyStats(db);
      else res = await exportExerciseCatalog(db);

      if (res.success) onShowToast('success', res.message);
      else onShowToast('error', res.message);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Setup</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Data Backup & Restore</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.bodySection}>
        {/* ================= 1. PRIMARY JSON BACKUP (SUPABASE & WEBAPP READY) ================= */}
        <View
          style={[
            styles.heroJsonCard,
            {
              backgroundColor: colors.pillars.running.tint,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.heroTopHeader}>
            <View style={styles.badgeRow}>
              <View style={[styles.formatBadge, { backgroundColor: '#38BDF820', borderColor: '#38BDF8' }]}>
                <FileCode size={13} color="#38BDF8" />
                <Text style={[styles.formatBadgeText, { color: '#38BDF8' }]}>Universal JSON backup</Text>
              </View>
              <Text style={[styles.recommendedTag, { color: '#22C55E' }]}>Recommended</Text>
            </View>
          </View>

          <Text style={[styles.heroCardTitle, { color: colors.text }]}>
            Complete Single-File Backup
          </Text>
          <Text style={[styles.heroCardDesc, { color: colors.textSecondary }]}>
            Exports your complete app in 1 type-safe file: Workouts, Sets, Indian Meals, Running Splits, and Body Weight. Ready for 2-way sync with Supabase and Mac WebApp.
          </Text>

          <View style={styles.jsonButtonsRow}>
            {/* Export JSON Button */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#38BDF8' }]}
              onPress={handleExportJson}
              disabled={isExportingJson}
              activeOpacity={0.8}
            >
              {isExportingJson ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Download size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Export Full JSON</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Import JSON/CSV Button */}
            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
              ]}
              onPress={handleImportFile}
              disabled={isImporting}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Upload size={18} color={colors.text} />
                  <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                    Import File (.json / .csv)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. SECURITY & PRIVACY CARD ================= */}
        <Card style={[styles.privacyCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <ShieldCheck size={20} color="#22C55E" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.privacyTitle, { color: colors.text }]}>100% Offline & Private</Text>
            <Text style={[styles.privacyDesc, { color: colors.textMuted }]}>
              All data is stored directly in your phone's encrypted SQLite database. You have full ownership of your backup files.
            </Text>
          </View>
        </Card>

        {/* ================= 3. OPTIONAL SPREADSHEET CSV EXPORT ================= */}
        <View style={styles.csvSection}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Spreadsheet export (Excel / Google Sheets)
          </Text>

          <Card style={[styles.csvOptionsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.csvRowItem, { borderBottomColor: colors.border }]}
              onPress={() => handleCsvExport('exercises')}
              disabled={isExportingCsv}
              activeOpacity={0.7}
            >
              <FileSpreadsheet size={18} color="#22C55E" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.csvItemTitle, { color: colors.text }]}>Export Workouts (.csv)</Text>
                <Text style={[styles.csvItemDesc, { color: colors.textMuted }]}>Exercise sets, weights, reps & volume</Text>
              </View>
              <Download size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.csvRowItem, { borderBottomColor: colors.border }]}
              onPress={() => handleCsvExport('meals')}
              disabled={isExportingCsv}
              activeOpacity={0.7}
            >
              <FileSpreadsheet size={18} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.csvItemTitle, { color: colors.text }]}>Export Nutrition Logs (.csv)</Text>
                <Text style={[styles.csvItemDesc, { color: colors.textMuted }]}>Daily calories, protein, carbs & actual food</Text>
              </View>
              <Download size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.csvRowItem, { borderBottomColor: colors.border }]}
              onPress={() => handleCsvExport('body')}
              disabled={isExportingCsv}
              activeOpacity={0.7}
            >
              <FileSpreadsheet size={18} color="#A855F7" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.csvItemTitle, { color: colors.text }]}>Export Body Stats (.csv)</Text>
                <Text style={[styles.csvItemDesc, { color: colors.textMuted }]}>Body weight, body fat & measurements</Text>
              </View>
              <Download size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.csvRowItem}
              onPress={() => handleCsvExport('catalog')}
              disabled={isExportingCsv}
              activeOpacity={0.7}
            >
              <FileSpreadsheet size={18} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.csvItemTitle, { color: colors.text }]}>Export Exercise Catalog (.csv)</Text>
                <Text style={[styles.csvItemDesc, { color: colors.textMuted }]}>All preseeded and custom exercises</Text>
              </View>
              <Download size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '700',
  },
  screenTitle: {
    ...typography.titleMedium,
    fontSize: 16,
    fontWeight: '800',
  },
  bodySection: {
    padding: 16,
    gap: 16,
  },
  heroJsonCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  heroTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  formatBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  recommendedTag: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  heroCardTitle: {
    ...typography.titleMedium,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  heroCardDesc: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
  },
  jsonButtonsRow: {
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  primaryActionText: {
    ...typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    ...typography.titleSmall,
    fontWeight: '800',
    fontSize: 13,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  privacyTitle: {
    ...typography.titleSmall,
    fontSize: 13,
    fontWeight: '700',
  },
  privacyDesc: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  csvSection: {
    gap: 10,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    paddingLeft: 4,
  },
  csvOptionsCard: {
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
  },
  csvRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  csvItemTitle: {
    ...typography.titleSmall,
    fontSize: 13,
    fontWeight: '700',
  },
  csvItemDesc: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
});
