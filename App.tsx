import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { Dumbbell } from 'lucide-react-native';

import { ThemeProvider, useTheme, typography, spacing } from './src/theme/theme';
import { getDb, initDatabase } from './src/db/database';
import { TabType } from './src/types/navigation';
import { getTodayISO } from './src/utils/dateUtils';

import { Header } from './src/components/common/Header';
import { TabBar } from './src/components/common/TabBar';
import { Toast, ToastMessage } from './src/components/common/Toast';
import { Modal } from './src/components/common/Modal';
import { WorkoutCalendar } from './src/components/analytics/WorkoutCalendar';
import { getWorkoutDatesWithLogs, getCalendarCategoryDots, CalendarDayWorkoutData } from './src/db/database';

import { HomeScreen } from './src/screens/HomeScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { MacroScreen } from './src/screens/MacroScreen';
import { ImportExportScreen } from './src/screens/ImportExportScreen';

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        const database = await getDb();
        await initDatabase(database);
        setDb(database);
        setIsDbReady(true);
      } catch (err: any) {
        console.error('Failed to initialize SQLite:', err);
      }
    }
    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider db={db}>
        <MainApp db={db} isDbReady={isDbReady} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function MainApp({
  db,
  isDbReady,
}: {
  db: SQLite.SQLiteDatabase | null;
  isDbReady: boolean;
}) {
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [calendarDots, setCalendarDots] = useState<Record<string, CalendarDayWorkoutData>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  useEffect(() => {
    if (!db) return;
    async function loadDots() {
      try {
        const dots = await getCalendarCategoryDots(db!);
        setCalendarDots(dots);
      } catch (e) {
        console.error(e);
      }
    }
    loadDots();
  }, [db, selectedDate]);

  if (!isDbReady || !db) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} translucent={false} />
        <View style={[styles.splashIcon, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
          <Dumbbell size={42} color={colors.primary} />
        </View>
        <Text style={[styles.splashTitle, { color: colors.text }]}>
          Fit<Text style={{ color: colors.primary }}>Rack</Text>
        </Text>
        <Text style={[styles.splashSub, { color: colors.textMuted }]}>100% Offline Fitness Tracker</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const showDateNav = activeTab === 'workout' || activeTab === 'macros';

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.surface} translucent={false} />

      {/* In-App Toast */}
      <Toast toast={toast} />

      {/* Top Header */}
      {activeTab !== 'home' && (
        <Header
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onOpenDatePicker={() => setIsDatePickerVisible(true)}
          showDateNav={showDateNav}
        />
      )}

      {/* Main Screen Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'home' && (
          <HomeScreen
            db={db}
            selectedDate={selectedDate}
            onNavigateTab={setActiveTab}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutScreen
            db={db}
            selectedDate={selectedDate}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsScreen
            db={db}
            onSelectDateAndNavigate={(newDate) => {
              setSelectedDate(newDate);
              setActiveTab('workout');
            }}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'macros' && (
          <MacroScreen
            db={db}
            selectedDate={selectedDate}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <ImportExportScreen
            db={db}
            onShowToast={showToast}
          />
        )}
      </View>

      {/* Quick Calendar Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        title="Select Date"
      >
        <WorkoutCalendar
          categoryDots={calendarDots}
          selectedDate={selectedDate}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            setIsDatePickerVisible(false);
          }}
        />
      </Modal>

      {/* Bottom Navigation Tab Bar */}
      <TabBar activeTab={activeTab} onTabSelect={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  splashIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  splashTitle: {
    ...typography.titleLarge,
    fontSize: 32,
    letterSpacing: -1,
  },
  splashSub: {
    ...typography.bodySecondary,
    marginTop: 4,
  },
});
