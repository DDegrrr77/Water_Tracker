export type DrinkType = 'water' | 'coffee' | 'tea' | 'soda' | 'sports_drink';

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
  reminderInterval: number; // 알림 간격 (분) — PADO 페이로드 settings.reminderInterval
}

export interface HydrationLog {
  id: string;
  timestamp: number;
  drinkType: DrinkType;
  rawAmount: number;     // ml inputted
  hydrationAmount: number; // ml after applying hydrationRate
}

export type Tab = 'home' | 'stats' | 'settings';

/**
 * @deprecated v0.2.0부터 단일 사용자 모델로 전환되어 더 이상 생성/관리하지 않습니다.
 * 레거시 `app_users` 키의 마이그레이션 파싱에만 사용됩니다.
 */
export interface User {
  id: string;
  name: string;
  character: string;
}

