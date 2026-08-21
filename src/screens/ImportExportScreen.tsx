import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  Palette,
  HardDrive,
  Dumbbell,
  Scale,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { ACCENT_PRESETS } from '../theme/ThemeContext';
import { Card } from '../components/common/Card';
import { ThemeSettingsScreen } from './settings/ThemeSettingsScreen';
import { BackupSettingsScreen } from './settings/BackupSettingsScreen';
import { ExerciseCatalogScreen } from './settings/ExerciseCatalogScreen';
import { AboutSettingsScreen } from './settings/AboutSettingsScreen';
import { BodyStatsScreen } from './BodyStatsScreen';
import { getTodayISO } from '../utils/dateUtils';

interface ImportExportScreenProps {
  db: SQLite.SQLiteDatabase;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

type SubScreen = 'none' | 'theme' | 'backup' | 'catalog' | 'bodystats' | 'about';

export const ImportExportScreen: React.FC<ImportExportScreenProps> = ({ db, onShowToast }) => {
  const { colors, isDark, accent } = useTheme();
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreen>('none');

  if (activeSubScreen === 'theme') {
    return (
      <ThemeSettingsScreen
        onBack={() => setActiveSubScreen('none')}
        onShowToast={onShowToast}
      />
    );
  }

  if (activeSubScreen === 'backup') {
    return (
      <BackupSettingsScreen
        db={db}
        onBack={() => setActiveSubScreen('none')}
        onShowToast={onShowToast}
      />
    );
  }

  if (activeSubScreen === 'catalog') {
    return (
      <ExerciseCatalogScreen
        db={db}
        onBack={() => setActiveSubScreen('none')}
        onShowToast={onShowToast}
      />
    );
  }

  if (activeSubScreen === 'bodystats') {
    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.subScreenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.subBackBtn} onPress={() => setActiveSubScreen('none')}>
            <ChevronRight size={20} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
            <Text style={[styles.subBackText, { color: colors.text }]}>Settings</Text>
          </TouchableOpacity>
          <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Body Stats</Text>
          <View style={{ width: 60 }} />
        </View>
        <BodyStatsScreen
          db={db}
          selectedDate={getTodayISO()}
          onShowToast={onShowToast}
        />
      </View>
    );
  }

  if (activeSubScreen === 'about') {
    return (
      <AboutSettingsScreen
        db={db}
        onBack={() => setActiveSubScreen('none')}
        onShowToast={onShowToast}
      />
    );
  }

  const currentAccentName = ACCENT_PRESETS[accent]?.name || 'Volt Green';

  const menuGroups = [
    {
      title: 'CUSTOMIZATION & PREFERENCES',
      items: [
        {
          key: 'theme' as SubScreen,
          icon: <Palette size={20} color={colors.primary} />,
          title: 'Appearance & Theme',
          subtitle: `${isDark ? 'Dark Mode' : 'Light Mode'} • ${currentAccentName}`,
        },
      ],
    },
    {
      title: 'TRAINING & DATA',
      items: [
        {
          key: 'catalog' as SubScreen,
          icon: <Dumbbell size={20} color={colors.secondary} />,
          title: 'Exercise Catalog',
          subtitle: 'Manage muscle categories and custom exercises',
        },
        {
          key: 'bodystats' as SubScreen,
          icon: <Scale size={20} color={colors.accent} />,
          title: 'Body Stats & Weigh-Ins',
          subtitle: 'Track body weight and circumference logs',
        },
        {
          key: 'backup' as SubScreen,
          icon: <HardDrive size={20} color={colors.primary} />,
          title: 'Backup & Data Export (CSV)',
          subtitle: 'Export to Excel / Google Sheets or import backups',
        },
      ],
    },
    {
      title: 'APP INFO',
      items: [
        {
          key: 'about' as SubScreen,
          icon: <Info size={20} color="#94A3B8" />,
          title: 'About FitRack',
          subtitle: 'Version 1.0.0 • SQLite Offline Storage & Reset',
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Privacy Guarantee Header */}
      <View style={[styles.privacyBanner, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
        <ShieldCheck size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.privacyTitle, { color: colors.text }]}>100% Offline & Private</Text>
          <Text style={[styles.privacySub, { color: colors.textMuted }]}>
            All workout logs and nutrition stay stored locally on your device in SQLite.
          </Text>
        </View>
      </View>

      {/* Menu Groups */}
      {menuGroups.map((group, gIdx) => (
        <View key={gIdx} style={styles.groupContainer}>
          <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group.title}</Text>
          <Card style={[styles.menuCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            {group.items.map((item, iIdx) => {
              const isLast = iIdx === group.items.length - 1;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuRow,
                    !isLast && [styles.menuRowBorder, { borderBottomColor: colors.border }],
                  ]}
                  onPress={() => setActiveSubScreen(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.surfaceHighlight }]}>
                      {item.icon}
                    </View>
                    <View style={styles.textCol}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    letterSpacing: 0.6,
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
