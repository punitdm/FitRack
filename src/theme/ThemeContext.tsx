import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import { getAppSetting, setAppSetting } from '../db/database';

export type ThemeMode = 'dark' | 'light';
export type AccentKey = 'volt' | 'cyan' | 'emerald' | 'amber' | 'purple' | 'rose';

export interface AccentColorConfig {
  key: AccentKey;
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
}

export const ACCENT_PRESETS: Record<AccentKey, AccentColorConfig> = {
  volt: {
    key: 'volt',
    name: 'Volt Green',
    primary: '#A3E635',
    primaryLight: '#BEF264',
    primaryDark: '#65A30D',
    primaryMuted: 'rgba(163, 230, 53, 0.15)',
  },
  cyan: {
    key: 'cyan',
    name: 'Cyan Blue',
    primary: '#38BDF8',
    primaryLight: '#7DD3FC',
    primaryDark: '#0284C7',
    primaryMuted: 'rgba(56, 189, 248, 0.15)',
  },
  emerald: {
    key: 'emerald',
    name: 'Emerald Mint',
    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    primaryMuted: 'rgba(16, 185, 129, 0.15)',
  },
  amber: {
    key: 'amber',
    name: 'Sunset Amber',
    primary: '#FB923C',
    primaryLight: '#FDBA74',
    primaryDark: '#EA580C',
    primaryMuted: 'rgba(251, 146, 60, 0.15)',
  },
  purple: {
    key: 'purple',
    name: 'Electric Purple',
    primary: '#A855F7',
    primaryLight: '#C084FC',
    primaryDark: '#7C3AED',
    primaryMuted: 'rgba(168, 85, 247, 0.15)',
  },
  rose: {
    key: 'rose',
    name: 'Crimson Rose',
    primary: '#F43F5E',
    primaryLight: '#FB7185',
    primaryDark: '#E11D48',
    primaryMuted: 'rgba(244, 63, 94, 0.15)',
  },
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceCard: string;
  surfaceHighlight: string;
  border: string;
  borderLight: string;
  borderHighlight: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  secondary: string;
  secondaryLight: string;
  secondaryMuted: string;
  accent: string;
  accentMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  success: string;
  successMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;
  easy: string;
  moderate: string;
  hard: string;
  categories: Record<string, string>;
}

export function buildThemeColors(mode: ThemeMode, accent: AccentKey): ThemeColors {
  const isDark = mode === 'dark';
  const acc = ACCENT_PRESETS[accent] || ACCENT_PRESETS.volt;

  if (isDark) {
    return {
      background: '#090A0D',
      surface: '#12151B',
      surfaceElevated: '#181C24',
      surfaceCard: '#1E232E',
      surfaceHighlight: '#272E3C',
      border: '#252B37',
      borderLight: '#323B4C',
      borderHighlight: acc.primary,
      primary: acc.primary,
      primaryLight: acc.primaryLight,
      primaryDark: acc.primaryDark,
      primaryMuted: acc.primaryMuted,
      secondary: '#38BDF8',
      secondaryLight: '#7DD3FC',
      secondaryMuted: 'rgba(56, 189, 248, 0.15)',
      accent: '#A855F7',
      accentMuted: 'rgba(168, 85, 247, 0.15)',
      warning: '#FB923C',
      warningMuted: 'rgba(251, 146, 60, 0.15)',
      danger: '#F87171',
      dangerMuted: 'rgba(248, 113, 113, 0.15)',
      success: '#4ADE80',
      successMuted: 'rgba(74, 222, 128, 0.15)',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      textDisabled: '#475569',
      textInverse: '#090A0D',
      easy: '#4ADE80',
      moderate: '#FB923C',
      hard: '#F87171',
      categories: {
        Abs: '#FB7185',
        Back: '#60A5FA',
        Biceps: '#C084FC',
        Cardio: '#38BDF8',
        Chest: acc.primary,
        Legs: '#FBBF24',
        Shoulders: '#F472B6',
        Triceps: '#A78BFA',
        Custom: '#818CF8',
      },
    };
  } else {
    // Light Mode (Material 3 Surface Elevation)
    return {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceElevated: '#F1F5F9',
      surfaceCard: '#FFFFFF',
      surfaceHighlight: '#E2E8F0',
      border: '#E2E8F0',
      borderLight: '#CBD5E1',
      borderHighlight: acc.primaryDark,
      primary: acc.primaryDark,
      primaryLight: acc.primary,
      primaryDark: acc.primaryDark,
      primaryMuted: acc.primaryMuted,
      secondary: '#0284C7',
      secondaryLight: '#38BDF8',
      secondaryMuted: 'rgba(2, 132, 199, 0.15)',
      accent: '#7C3AED',
      accentMuted: 'rgba(124, 58, 237, 0.15)',
      warning: '#EA580C',
      warningMuted: 'rgba(234, 88, 12, 0.15)',
      danger: '#DC2626',
      dangerMuted: 'rgba(220, 38, 38, 0.15)',
      success: '#16A34A',
      successMuted: 'rgba(22, 163, 74, 0.15)',
      text: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      textDisabled: '#94A3B8',
      textInverse: '#FFFFFF',
      easy: '#16A34A',
      moderate: '#EA580C',
      hard: '#DC2626',
      categories: {
        Abs: '#E11D48',
        Back: '#2563EB',
        Biceps: '#9333EA',
        Cardio: '#0284C7',
        Chest: acc.primaryDark,
        Legs: '#D97706',
        Shoulders: '#DB2777',
        Triceps: '#7C3AED',
        Custom: '#4F46E5',
      },
    };
  }
}

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentKey;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  accent: 'volt',
  isDark: true,
  colors: buildThemeColors('dark', 'volt'),
  setMode: () => {},
  setAccent: () => {},
});

export const ThemeProvider: React.FC<{ db?: SQLite.SQLiteDatabase | null; children: React.ReactNode }> = ({
  db,
  children,
}) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<AccentKey>('volt');

  // Load saved theme on boot
  useEffect(() => {
    if (!db) return;
    async function loadTheme() {
      try {
        const savedMode = (await getAppSetting(db!, 'theme_mode', 'dark')) as ThemeMode;
        const savedAccent = (await getAppSetting(db!, 'theme_accent', 'volt')) as AccentKey;
        if (savedMode === 'dark' || savedMode === 'light') setModeState(savedMode);
        if (ACCENT_PRESETS[savedAccent]) setAccentState(savedAccent);
      } catch (e) {
        console.error('Failed to load theme settings:', e);
      }
    }
    loadTheme();
  }, [db]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (db) {
      setAppSetting(db, 'theme_mode', newMode).catch(console.error);
    }
  };

  const setAccent = (newAccent: AccentKey) => {
    setAccentState(newAccent);
    if (db) {
      setAppSetting(db, 'theme_accent', newAccent).catch(console.error);
    }
  };

  const colors = buildThemeColors(mode, accent);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        isDark: mode === 'dark',
        colors,
        setMode,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
