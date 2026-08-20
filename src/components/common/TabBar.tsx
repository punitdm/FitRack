import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, Dumbbell, BarChart2, Utensils, Settings } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { TabType } from '../../types/navigation';

interface TabBarProps {
  activeTab: TabType;
  onTabSelect: (tab: TabType) => void;
}

interface TabItem {
  key: TabType;
  label: string;
  icon: (color: string, size: number) => React.ReactNode;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabSelect }) => {
  const { colors, isDark } = useTheme();

  const tabs: TabItem[] = [
    {
      key: 'home',
      label: 'Home',
      icon: (color, size) => <Home color={color} size={size} strokeWidth={2.4} />,
    },
    {
      key: 'workout',
      label: 'Workout',
      icon: (color, size) => <Dumbbell color={color} size={size} strokeWidth={2.4} />,
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: (color, size) => <BarChart2 color={color} size={size} strokeWidth={2.4} />,
    },
    {
      key: 'macros',
      label: 'Macros',
      icon: (color, size) => <Utensils color={color} size={size} strokeWidth={2.4} />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: (color, size) => <Settings color={color} size={size} strokeWidth={2.4} />,
    },
  ];

  return (
    <View style={styles.outerWrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            shadowColor: isDark ? '#000000' : '#64748B',
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const iconColor = isActive ? colors.textInverse : colors.textMuted;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => onTabSelect(tab.key)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconCapsule,
                  isActive && {
                    backgroundColor: colors.primary,
                    transform: [{ scale: 1.05 }],
                  },
                ]}
              >
                {tab.icon(iconColor, 19)}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? (isDark ? colors.text : colors.text) : colors.textMuted },
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconCapsule: {
    width: 56,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    fontWeight: '800',
  },
});
