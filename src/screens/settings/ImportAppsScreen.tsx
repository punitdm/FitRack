import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { TouchableOpacity } from '../../components/common/Touchable';
import { Text } from '../../components/common/Typography';
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, NotebookPen, Dumbbell } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, typography } from '../../theme/theme';
import { Card } from '../../components/common/Card';
import { formatDisplayDate } from '../../utils/dateUtils';
import {
  ImportBundle,
  ImportCommitResult,
  ImportPreview,
  ImportSource,
  commitImport,
  parseImportFile,
  previewBundle,
} from '../../importers';

interface ImportAppsScreenProps {
  db: SQLite.SQLiteDatabase;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

const SOURCES: {
  key: ImportSource;
  name: string;
  formats: string;
  steps: string[];
  imports: string;
}[] = [
  {
    key: 'fitnotes',
    name: 'FitNotes',
    formats: '.fitnotes backup or spreadsheet .csv',
    steps: [
      'FitNotes → Settings → Backup → Create backup (or)',
      'FitNotes → Settings → Spreadsheet export → Workouts',
      'Save / share the file to your phone, then pick it here',
    ],
    imports: 'Workouts, sets, cardio time & distance · body weight & measurements',
  },
  {
    key: 'gymmane',
    name: 'GymMane',
    formats: 'backup .zip or gymmane.json',
    steps: [
      'GymMane → Settings → Backup → Export backup',
      'Pick the gymmane-backup-….zip (or the gymmane.json inside it)',
    ],
    imports: 'Workouts, sets, RPE & notes · body weight & measurements · daily calories, macros & water',
  },
];

type Stage =
  | { kind: 'idle' }
  | { kind: 'reading'; source: ImportSource }
  | { kind: 'preview'; bundle: ImportBundle; preview: ImportPreview; fileName: string }
  | { kind: 'saving'; preview: ImportPreview }
  | { kind: 'done'; preview: ImportPreview; result: ImportCommitResult };

export const ImportAppsScreen: React.FC<ImportAppsScreenProps> = ({ db, onBack, onShowToast }) => {
  const { colors } = useTheme();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });

  const pickFile = async (source: ImportSource) => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.length) return;
      const file = picked.assets[0];
      setStage({ kind: 'reading', source });
      const bundle = await parseImportFile(file.uri, source);
      const preview = previewBundle(bundle);
      if (preview.sets + preview.bodyStats + preview.macroDays + preview.hydrationDays === 0) {
        setStage({ kind: 'idle' });
        onShowToast('info', `No importable data found in ${file.name}.`);
        return;
      }
      setStage({ kind: 'preview', bundle, preview, fileName: file.name });
    } catch (e: any) {
      setStage({ kind: 'idle' });
      onShowToast('error', e?.message || 'Could not read that file.');
    }
  };

  const confirmImport = async () => {
    if (stage.kind !== 'preview') return;
    const { bundle, preview } = stage;
    setStage({ kind: 'saving', preview });
    try {
      const result = await commitImport(db, bundle);
      setStage({ kind: 'done', preview, result });
      onShowToast('success', `Imported ${result.setsAdded} sets from ${preview.sourceLabel}.`);
    } catch (e: any) {
      setStage({ kind: 'idle' });
      onShowToast('error', `Import failed, nothing was changed: ${e?.message || e}`);
    }
  };

  const busy = stage.kind === 'reading' || stage.kind === 'saving';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} disabled={busy} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Setup</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Import from Other Apps</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        {(stage.kind === 'preview' || stage.kind === 'saving') && (
          <PreviewCard
            preview={stage.preview}
            fileName={stage.kind === 'preview' ? stage.fileName : ''}
            saving={stage.kind === 'saving'}
            onConfirm={confirmImport}
            onCancel={() => setStage({ kind: 'idle' })}
          />
        )}

        {stage.kind === 'done' && (
          <ResultCard preview={stage.preview} result={stage.result} onDone={() => setStage({ kind: 'idle' })} />
        )}

        {(stage.kind === 'idle' || stage.kind === 'reading') && (
          <>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              Bring your history into FitRack. Your existing data is never overwritten, and importing the same
              file twice won't create duplicates.
            </Text>

            {SOURCES.map((s) => {
              const reading = stage.kind === 'reading' && stage.source === s.key;
              return (
                <Card key={s.key} style={[styles.sourceCard, { borderColor: colors.border }]}>
                  <View style={styles.sourceHead}>
                    <View style={[styles.sourceIcon, { backgroundColor: colors.primaryMuted }]}>
                      {s.key === 'fitnotes' ? (
                        <NotebookPen size={20} color={colors.primary} />
                      ) : (
                        <Dumbbell size={20} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sourceName, { color: colors.text }]}>{s.name}</Text>
                      <Text style={[styles.sourceFormats, { color: colors.textMuted }]}>{s.formats}</Text>
                    </View>
                  </View>

                  <Text style={[styles.label, { color: colors.textMuted }]}>How to export</Text>
                  {s.steps.map((step, i) => (
                    <Text key={i} style={[styles.step, { color: colors.textSecondary }]}>
                      {i + 1}. {step}
                    </Text>
                  ))}

                  <Text style={[styles.label, { color: colors.textMuted }]}>What comes across</Text>
                  <Text style={[styles.step, { color: colors.textSecondary }]}>{s.imports}</Text>

                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
                    onPress={() => pickFile(s.key)}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    {reading ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <Upload size={18} color={colors.textInverse} />
                        <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>
                          Choose {s.name} file
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Card>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
};

const PreviewCard: React.FC<{
  preview: ImportPreview;
  fileName: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ preview, fileName, saving, onConfirm, onCancel }) => {
  const { colors } = useTheme();
  return (
    <Card style={[styles.sourceCard, { borderColor: colors.primary }]}>
      <Text style={[styles.sourceName, { color: colors.text }]}>Ready to import from {preview.sourceLabel}</Text>
      {!!fileName && <Text style={[styles.sourceFormats, { color: colors.textMuted }]}>{fileName}</Text>}
      {preview.firstDate && preview.lastDate && (
        <Text style={[styles.step, { color: colors.textSecondary }]}>
          {formatDisplayDate(preview.firstDate)} → {formatDisplayDate(preview.lastDate)}
        </Text>
      )}

      <View style={{ marginTop: 8 }}>
        <StatRow label="Workouts" value={preview.sessions} />
        <StatRow label="Sets" value={preview.sets} />
        <StatRow label="Exercises" value={preview.exercises} />
        <StatRow label="Body stat days" value={preview.bodyStats} />
        {preview.macroDays > 0 && <StatRow label="Nutrition days" value={preview.macroDays} />}
        {preview.hydrationDays > 0 && <StatRow label="Water days" value={preview.hydrationDays} />}
      </View>

      {preview.warnings.map((w, i) => (
        <View key={i} style={[styles.warning, { backgroundColor: colors.warningMuted }]}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.text }]}>{w}</Text>
        </View>
      ))}

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={onCancel}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.flex1, { backgroundColor: colors.primary, marginTop: 0 }]}
          onPress={onConfirm}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Import</Text>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const ResultCard: React.FC<{ preview: ImportPreview; result: ImportCommitResult; onDone: () => void }> = ({
  preview,
  result,
  onDone,
}) => {
  const { colors } = useTheme();
  return (
    <Card style={[styles.sourceCard, { borderColor: colors.success }]}>
      <View style={styles.sourceHead}>
        <CheckCircle2 size={22} color={colors.success} />
        <Text style={[styles.sourceName, { color: colors.text }]}>{preview.sourceLabel} import complete</Text>
      </View>
      <StatRow label="Sets added" value={result.setsAdded} />
      <StatRow label="Workout days updated" value={result.sessionsTouched} />
      <StatRow label="New exercises created" value={result.exercisesCreated} />
      {result.setsSkippedAsDuplicate > 0 && (
        <StatRow label="Sets already in FitRack (skipped)" value={result.setsSkippedAsDuplicate} />
      )}
      <StatRow label="Body stat days merged" value={result.bodyStatsMerged} />
      {preview.macroDays > 0 && <StatRow label="Nutrition days added" value={result.macroDaysAdded} />}
      {result.macroDaysSplitIntoMeals > 0 && (
        <StatRow label="Nutrition days split into meals" value={result.macroDaysSplitIntoMeals} />
      )}
      {result.macroDaysKept > 0 && (
        <StatRow label="Nutrition days kept (already logged)" value={result.macroDaysKept} />
      )}
      {preview.hydrationDays > 0 && <StatRow label="Water days added" value={result.hydrationDaysAdded} />}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={onDone}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Done</Text>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backBtnText: { ...typography.titleSmall, fontSize: 14, fontWeight: '700' },
  screenTitle: { ...typography.titleMedium, fontSize: 16, fontWeight: '800' },
  body: { padding: 16, gap: 16 },
  intro: { ...typography.bodySecondary, fontSize: 13, lineHeight: 19 },
  sourceCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 6 },
  sourceHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  sourceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sourceName: { ...typography.titleMedium, fontSize: 16, fontWeight: '800' },
  sourceFormats: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.1, marginTop: 8 },
  step: { fontSize: 13, lineHeight: 19 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flex1: { flex: 1 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '800' },
  warning: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 12, marginTop: 8, alignItems: 'flex-start' },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
