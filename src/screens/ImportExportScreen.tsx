import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from '../components/common/Touchable';
import { Text } from '../components/common/Typography';
import {
  Palette,
  HardDrive,
  Dumbbell,
  Scale,
  Info,
  ChevronRight,
  ShieldCheck,
  ArrowDownToLine,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { ACCENT_PRESETS } from '../theme/ThemeContext';
import { Card } from '../components/common/Card';
import { ScalePressable } from '../components/common/Motion';
import { ThemeSettingsScreen } from './settings/ThemeSettingsScreen';
import { BackupSettingsScreen } from './settings/BackupSettingsScreen';
import { ImportAppsScreen } from './settings/ImportAppsScreen';
import { ExerciseCatalogScreen } from './settings/ExerciseCatalogScreen';
import { AboutSettingsScreen } from './settings/AboutSettingsScreen';
import { SettingsHome } from './settings/SettingsHome';
import { BodyStatsScreen } from './BodyStatsScreen';
import { getTodayISO } from '../utils/dateUtils';

interface ImportExportScreenProps {
  db: SQLite.SQLiteDatabase;
  onBackToHub?: () => void;
  /** Text for the back link (defaults to "Back to Hub"). */
  backLabel?: string;
  /** When provided (navigator present), sub-pages open as their own screens. */
  onOpenSubScreen?: (key: SettingsSubScreenKey) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export type SettingsSubScreenKey = 'theme' | 'backup' | 'importApps' | 'catalog' | 'bodystats' | 'about';
type SubScreen = 'none' | SettingsSubScreenKey;

/** Renders one settings sub-page. Used as its own navigation screen. */
export const SettingsSubScreen: React.FC<{
  screen: SettingsSubScreenKey;
  db: SQLite.SQLiteDatabase;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}> = ({ screen, db, onBack, onShowToast }) => {
  const { colors } = useTheme();
  switch (screen) {
    case 'theme':
      return <ThemeSettingsScreen onBack={onBack} onShowToast={onShowToast} />;
    case 'backup':
      return <BackupSettingsScreen db={db} onBack={onBack} onShowToast={onShowToast} />;
    case 'importApps':
      return <ImportAppsScreen db={db} onBack={onBack} onShowToast={onShowToast} />;
    case 'catalog':
      return <ExerciseCatalogScreen db={db} onBack={onBack} onShowToast={onShowToast} />;
    case 'about':
      return <AboutSettingsScreen db={db} onBack={onBack} onShowToast={onShowToast} />;
    case 'bodystats':
      return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.subScreenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity style={styles.subBackBtn} onPress={onBack} hitSlop={8}>
              <ChevronRight size={20} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={[styles.subBackText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
            <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Body Stats</Text>
            <View style={{ width: 60 }} />
          </View>
          <BodyStatsScreen db={db} selectedDate={getTodayISO()} onShowToast={onShowToast} />
        </View>
      );
  }
};

export const ImportExportScreen: React.FC<ImportExportScreenProps> = ({
  db,
  onBackToHub,
  backLabel = 'Back to Hub',
  onOpenSubScreen,
  onShowToast,
}) => {
  const { colors, isDark, accent } = useTheme();
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreen>('none');

  // Without a navigator (fallback), sub-pages render in place.
  if (activeSubScreen !== 'none') {
    return (
      <SettingsSubScreen
        screen={activeSubScreen}
        db={db}
        onBack={() => setActiveSubScreen('none')}
        onShowToast={onShowToast}
      />
    );
  }

  const openSubScreen = (key: SettingsSubScreenKey) =>
    onOpenSubScreen ? onOpenSubScreen(key) : setActiveSubScreen(key);

  return <SettingsHome onBack={onBackToHub} onOpen={openSubScreen} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backHubHeader: {
    paddingVertical: 6,
    marginBottom: 4,
  },
  backHubText: {
    ...typography.titleSmall,
    fontSize: 15,
    fontWeight: '800',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  privacyTitle: {
    ...typography.titleSmall,
    fontSize: 14,
    fontWeight: '800',
  },
  privacySub: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  groupContainer: {
    gap: 6,
  },
  groupTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    paddingLeft: 4,
  },
  menuCard: {
    borderRadius: borderRadius.xl,
    padding: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    paddingRight: spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  itemSubtitle: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  subScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  subBackText: {
    ...typography.titleSmall,
    fontSize: 14,
  },
  subHeaderTitle: {
    ...typography.titleMedium,
    fontSize: 16,
  },
});
