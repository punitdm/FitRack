export type TabType = 'home' | 'workout' | 'analytics' | 'macros' | 'settings';

export interface TabConfig {
  key: TabType;
  title: string;
  iconName: string;
}
