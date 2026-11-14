import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  NavigationContainer,
  useNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  Theme as NavTheme,
  useFocusEffect,
} from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import * as SQLite from 'expo-sqlite';
import { Dumbbell } from 'lucide-react-native';

import { Text, appFonts, markFontsReady } from './src/components/common/Typography';
import { ThemeProvider, useTheme, typography, spacing } from './src/theme/theme';
import { getDb, initDatabase, getCalendarCategoryDots, CalendarDayWorkoutData } from './src/db/database';
import { getTodayISO } from './src/utils/dateUtils';
import { haptics } from './src/utils/haptics';
import { UnitsProvider } from './src/utils/units';

import { Toast, ToastMessage } from './src/components/common/Toast';
import { ConfirmSheet } from './src/components/common/ConfirmSheet';
import { ConfirmRequest, ToastRequest, setConfirmListener, setToastListener } from './src/utils/feedback';
import { Modal } from './src/components/common/Modal';
import { AppTabBar } from './src/components/common/AppTabBar';
import { TabBlurTarget } from './src/components/common/blurTargets';
import { WorkoutCalendar } from './src/components/analytics/WorkoutCalendar';

import { HubScreen } from './src/screens/HubScreen';
import { WorkoutScreen } from './src/screens/WorkoutScreen';
import { MacroScreen } from './src/screens/MacroScreen';
import { RunningScreen } from './src/screens/RunningScreen';
import { BodyTrackerScreen } from './src/screens/BodyTrackerScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { ImportExportScreen, SettingsSubScreen, SettingsSubScreenKey } from './src/screens/ImportExportScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OnboardingScreen, needsOnboarding } from './src/screens/OnboardingScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------

type PillarRoute = 'workout' | 'nutrition' | 'running' | 'body' | 'analytics' | 'settings';

/** Bottom bar: Home · Progress · [Workout] · Nutrition · Profile. */
export type TabParamList = {
  hub: undefined;
  analytics: undefined;
  workout: undefined;
  nutrition: undefined;
  profile: undefined;
};

/** Screens that slide in over the tabs. */
export type RootStackParamList = {
  tabs: NavigatorScreenParams<TabParamList>;
  running: undefined;
  body: undefined;
  settings: undefined;
  settingsPage: { screen: SettingsSubScreenKey };
};

type TabProps<K extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, K>,
  NativeStackScreenProps<RootStackParamList>
>;
type StackProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ---------------------------------------------------------------------------
// Shared app state (the selected date, toasts, date picker) for every screen
// ---------------------------------------------------------------------------

type ToastType = ToastRequest['type'];

interface AppState {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  openDatePicker: () => void;
  showToast: (type: ToastType, text: string) => void;
}

const AppContext = createContext<AppState | null>(null);

function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppContext');
  return ctx;
}

/** Increments every time the screen regains focus (not on first mount). */
function useReturnToken(): number {
  const [token, setToken] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setToken((t) => t + 1);
    }, [])
  );
  return token;
}

// ---------------------------------------------------------------------------
// Screens: thin adapters from navigation to the existing screen components
// ---------------------------------------------------------------------------

function HubRoute({ navigation }: TabProps<'hub'>) {
  const app = useApp();
  const refreshToken = useReturnToken();
  return (
    <HubScreen
      db={app.db}
      selectedDate={app.selectedDate}
      onDateChange={app.setSelectedDate}
      onOpenDatePicker={app.openDatePicker}
      onNavigatePillar={(pillar: PillarRoute) => {
        haptics.select();
        if (pillar === 'running' || pillar === 'body' || pillar === 'settings') navigation.navigate(pillar);
        else navigation.navigate('tabs', { screen: pillar });
      }}
      onShowToast={app.showToast}
      refreshToken={refreshToken}
    />
  );
}

function WorkoutRoute({ navigation }: TabProps<'workout'>) {
  const app = useApp();
  return (
    <WorkoutScreen
      db={app.db}
      selectedDate={app.selectedDate}
      onDateChange={app.setSelectedDate}
      // The full-screen set logger takes the whole screen, so hide the bottom bar.
      onFullScreenToggle={(full) => navigation.setOptions({ tabBarStyle: full ? { display: 'none' } : undefined })}
      onShowToast={app.showToast}
    />
  );
}

function NutritionRoute(_: TabProps<'nutrition'>) {
  const app = useApp();
  return (
    <MacroScreen
      db={app.db}
      selectedDate={app.selectedDate}
      onDateChange={app.setSelectedDate}
      onOpenDatePicker={app.openDatePicker}
      onShowToast={app.showToast}
    />
  );
}

function RunningRoute({ navigation }: StackProps<'running'>) {
  const app = useApp();
  return (
    <RunningScreen
      db={app.db}
      selectedDate={app.selectedDate}
      onBackToHub={() => navigation.goBack()}
      onDateChange={app.setSelectedDate}
      onOpenDatePicker={app.openDatePicker}
      onShowToast={app.showToast}
    />
  );
}

function BodyRoute({ navigation }: StackProps<'body'>) {
  const app = useApp();
  return (
    <BodyTrackerScreen
      db={app.db}
      selectedDate={app.selectedDate}
      onBackToHub={() => navigation.goBack()}
      onDateChange={app.setSelectedDate}
      onOpenDatePicker={app.openDatePicker}
      onShowToast={app.showToast}
    />
  );
}

function AnalyticsRoute({ navigation }: TabProps<'analytics'>) {
  const app = useApp();
  const refreshToken = useReturnToken();
  return (
    <AnalyticsScreen
      db={app.db}
      onSelectDateAndNavigate={(newDate) => {
        app.setSelectedDate(newDate);
        navigation.navigate('workout');
      }}
      onShowToast={app.showToast}
      refreshToken={refreshToken}
    />
  );
}

function ProfileRoute({ navigation }: TabProps<'profile'>) {
  const app = useApp();
  const refreshToken = useReturnToken();
  return (
    <ProfileScreen
      db={app.db}
      onOpenSettings={() => navigation.navigate('settings')}
      onOpenSettingsPage={(screen) => navigation.navigate('settingsPage', { screen })}
      onOpenBody={() => navigation.navigate('body')}
      onShowToast={app.showToast}
      refreshToken={refreshToken}
    />
  );
}

function SettingsRoute({ navigation }: StackProps<'settings'>) {
  const app = useApp();
  return (
    <ImportExportScreen
      db={app.db}
      onBackToHub={() => navigation.goBack()}
      backLabel="Back"
      onOpenSubScreen={(screen) => navigation.navigate('settingsPage', { screen })}
      onShowToast={app.showToast}
    />
  );
}

function SettingsPageRoute({ navigation, route }: StackProps<'settingsPage'>) {
  const app = useApp();
  return (
    <SettingsSubScreen
      screen={route.params.screen}
      db={app.db}
      onBack={() => navigation.goBack()}
      onShowToast={app.showToast}
    />
  );
}

function TabsRoute() {
  return (
    <Tab.Navigator
      initialRouteName="hub"
      backBehavior="firstRoute"
      tabBar={(props) => <AppTabBar {...props} />}
      screenLayout={({ route, children }) => <TabBlurTarget routeKey={route.key}>{children}</TabBlurTarget>}
      screenOptions={{ headerShown: false, animation: 'shift', lazy: true }}
    >
      <Tab.Screen name="hub" component={HubRoute} />
      <Tab.Screen name="analytics" component={AnalyticsRoute} />
      <Tab.Screen name="workout" component={WorkoutRoute} />
      <Tab.Screen name="nutrition" component={NutritionRoute} />
      <Tab.Screen name="profile" component={ProfileRoute} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const fontsSettled = fontsLoaded || !!fontError;
  markFontsReady(fontsLoaded);

  useEffect(() => {
    async function setup() {
      try {
        const database = await getDb();
        await initDatabase(database);
        setDb(database);
      } catch (err: any) {
        console.error('Failed to initialize SQLite:', err);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync().catch(() => {});
  }, [fontsSettled]);

  // Keep the native splash up for the few ms Inter takes to load, so text never re-flows.
  if (!fontsSettled) return null;

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider>
        <ThemeProvider db={db}>
          <UnitsProvider db={db}>
            <MainApp db={db} />
          </UnitsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MainApp({ db }: { db: SQLite.SQLiteDatabase | null }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [calendarDots, setCalendarDots] = useState<Record<string, CalendarDayWorkoutData>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeq = useRef(0);
  const presentToast = useCallback((req: ToastRequest) => {
    const action = req.action
      ? {
          label: req.action.label,
          onPress: () => {
            haptics.tap();
            setToast(null);
            req.action!.onPress();
          },
        }
      : undefined;
    setToast({ type: req.type, text: req.text, action, id: ++toastSeq.current });
    if (req.type === 'success') haptics.success();
    else if (req.type === 'error') haptics.error();
    // Restart the timer so a newer toast isn't cut short by an older one's timeout.
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), req.durationMs ?? (action ? 5000 : 3200));
  }, []);
  const showToast = useCallback((type: ToastType, text: string) => presentToast({ type, text }), [presentToast]);

  // App-wide feedback: undo toasts and confirmation sheets from any screen.
  const [confirmReq, setConfirmReq] = useState<{ req: ConfirmRequest; resolve: (ok: boolean) => void } | null>(null);
  useEffect(() => {
    setToastListener(presentToast);
    setConfirmListener((req, resolve) => setConfirmReq({ req, resolve }));
    return () => {
      setToastListener(null);
      setConfirmListener(null);
    };
  }, [presentToast]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!db) return;
    getCalendarCategoryDots(db).then(setCalendarDots).catch(console.error);
  }, [db, selectedDate]);

  const openDatePicker = useCallback(() => {
    haptics.select();
    setIsDatePickerVisible(true);
  }, []);

  // First run: onboarding before the main app.
  const [onboarding, setOnboarding] = useState<'checking' | 'show' | 'done'>('checking');
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const openImportWhenReady = useRef(false);
  useEffect(() => {
    if (!db) return;
    needsOnboarding(db)
      .then((need) => setOnboarding(need ? 'show' : 'done'))
      .catch(() => setOnboarding('done'));
  }, [db]);

  const appState = useMemo<AppState | null>(
    () => (db ? { db, selectedDate, setSelectedDate, openDatePicker, showToast } : null),
    [db, selectedDate, openDatePicker, showToast]
  );

  // Navigation colours follow the app theme, so there's never a white flash between screens.
  const navTheme = useMemo<NavTheme>(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [isDark, colors.primary, colors.background, colors.surface, colors.text, colors.border]);

  if (!appState || onboarding === 'checking') {
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.splashIcon, { backgroundColor: colors.primaryMuted }]}>
          <Dumbbell size={42} color={colors.primary} />
        </View>
        <Text style={[styles.splashTitle, { color: colors.text }]}>
          Fit<Text style={{ color: colors.primary }}>Rack</Text>
        </Text>
        <Text style={[styles.splashSub, { color: colors.textMuted }]}>100% offline fitness tracker</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (onboarding === 'show') {
    return (
      <SafeAreaView style={[styles.rootContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen
          db={appState.db}
          onDone={(openImport) => {
            openImportWhenReady.current = openImport;
            setOnboarding('done');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <AppContext.Provider value={appState}>
      <SafeAreaView
        style={[styles.rootContainer, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <NavigationContainer
          ref={navRef}
          theme={navTheme}
          onReady={() => {
            if (openImportWhenReady.current) {
              openImportWhenReady.current = false;
              navRef.navigate('settingsPage', { screen: 'importApps' });
            }
          }}
        >
          <Stack.Navigator
            initialRouteName="tabs"
            screenOptions={{
              headerShown: false,
              // Native push with parallax; same feel on Android and iOS.
              animation: 'ios_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              // Pushed screens stop above the home indicator; the tabs screen handles its own.
              contentStyle: { backgroundColor: colors.background, paddingBottom: insets.bottom },
            }}
          >
            <Stack.Screen
              name="tabs"
              component={TabsRoute}
              options={{ animation: 'fade', contentStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen name="running" component={RunningRoute} />
            <Stack.Screen name="body" component={BodyRoute} />
            <Stack.Screen name="settings" component={SettingsRoute} />
            <Stack.Screen name="settingsPage" component={SettingsPageRoute} />
          </Stack.Navigator>
        </NavigationContainer>

        {/* In-app toast floats above every screen */}
        <Toast toast={toast} />

        <ConfirmSheet
          request={confirmReq?.req ?? null}
          onResult={(ok) => {
            confirmReq?.resolve(ok);
            setConfirmReq(null);
          }}
        />

        {/* Quick calendar date picker */}
        <Modal visible={isDatePickerVisible} onClose={() => setIsDatePickerVisible(false)} title="Select date">
          <WorkoutCalendar
            categoryDots={calendarDots}
            selectedDate={selectedDate}
            onSelectDate={(newDate) => {
              haptics.select();
              setSelectedDate(newDate);
              setIsDatePickerVisible(false);
            }}
          />
        </Modal>
      </SafeAreaView>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
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
