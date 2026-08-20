import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, Dumbbell, BarChart2, Utensils, Settings } from 'lucide-react-native';
import { useTheme, typography, borderRadius } from '../../theme/theme';
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
      icon: (color, size) => <Home color={color} size={size} />,
    },
    {
      key: 'workout',
      label: 'Workout',
      icon: (color, size) => <Dumbbell color={color} size={size} />,
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: (color, size) => <BarChart2 color={color} size={size} />,
    },
    {
      key: 'macros',
      label: 'Macros',
      icon: (color, size) => <Utensils color={color} size={size} />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: (color, size) => <Settings color={color} size={size} />,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = isActive ? colors.textInverse : colors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => onTabSelect(tab.key)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCapsule,
                isActive && { backgroundColor: colors.primary },
              ]}
            >
              {tab.icon(iconColor, 20)}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.text : colors.textMuted },
                isActive && { fontWeight: '800' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconCapsule: {
    width: 52,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 11,
  },
});
