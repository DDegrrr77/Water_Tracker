export type DrinkType = 'water' | 'coffee' | 'tea' | 'soda' | 'sports_drink';

export interface User {
  id: string;
  name: string;
  character: string;
}

export interface DrinkSetting {
  amount: number;      // default ml
  hydrationRate: number; // percentage (0-100)
}

export interface UserSettings {
  weight: number; // kg
  activityLevel: 'light' | 'moderate' | 'high';
  wakeUpTime: string; // 'HH:MM'
  bedTime: string; // 'HH:MM'
  drinkSettings: Record<DrinkType, DrinkSetting>;
  notificationsEnabled: boolean;
}

export interface HydrationLog {
  id: string;
  timestamp: number;
  drinkType: DrinkType;
  rawAmount: number;     // ml inputted
  hydrationAmount: number; // ml after applying hydrationRate
}

export type Tab = 'home' | 'stats' | 'settings';
