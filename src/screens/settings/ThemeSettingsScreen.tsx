import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ArrowLeft, Moon, Sun, Check } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { ACCENT_PRESETS, AccentKey } from '../../theme/ThemeContext';
import { Card } from '../../components/common/Card';

interface ThemeSettingsScreenProps {
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const ThemeSettingsScreen: React.FC<ThemeSettingsScreenProps> = ({ onBack, onShowToast }) => {
  const { colors, mode, setMode, accent, setAccent, isDark } = useTheme();
  const availableAccents = Object.values(ACCENT_PRESETS);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Appearance & Theme</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Dark / Light Mode */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Color Mode</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            Choose between Dark OLED mode and clean Light mode:
          </Text>

          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                isDark && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
              ]}
              onPress={() => {
                setMode('dark');
                onShowToast('info', 'Dark Mode Activated');
              }}
              activeOpacity={0.7}
            >
              <Moon size={20} color={isDark ? colors.primary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: isDark ? colors.primary : colors.text }]}>
                Dark Mode
              </Text>
              {isDark && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                !isDark && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
              ]}
              onPress={() => {
                setMode('light');
                onShowToast('info', 'Light Mode Activated');
              }}
              activeOpacity={0.7}
            >
              <Sun size={20} color={!isDark ? colors.primary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: !isDark ? colors.primary : colors.text }]}>
                Light Mode
              </Text>
              {!isDark && <Check size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Accent Color Palettes */}
        <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accent Palette</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            Select your preferred primary brand highlight color:
          </Text>

          <View style={styles.accentsList}>
            {availableAccents.map((accItem) => {
              const isSelected = accent === accItem.key;
              return (
                <TouchableOpacity
                  key={accItem.key}
                  style={[
                    styles.accentRow,
                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                    isSelected && { borderColor: accItem.primary, backgroundColor: `${accItem.primary}15` },
                  ]}
                  onPress={() => {
                    setAccent(accItem.key as AccentKey);
                    onShowToast('success', `Theme accent set to ${accItem.name}`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.accentLeft}>
                    <View style={[styles.colorCircle, { backgroundColor: accItem.primary }]} />
                    <Text style={[styles.accentLabel, { color: colors.text }]}>{accItem.name}</Text>
                  </View>
                  {isSelected && <Check size={18} color={accItem.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
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
  sectionTitle: {
    ...typography.titleSmall,
    fontSize: 16,
    marginBottom: 4,
  },
  sectionSub: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  modeBtnText: {
    ...typography.titleSmall,
    fontSize: 14,
  },
  accentsList: {
    gap: 8,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  accentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  accentLabel: {
    ...typography.body,
    fontWeight: '700',
  },
});
