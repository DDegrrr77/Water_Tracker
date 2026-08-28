/**
 * PADO(파도) 플랫폼 양방향 데이터 브릿지 — 프로토콜/페이로드 정의
 *
 * 본 앱(AquaFlow, appId: 'water_tracker')이 PADO 허브에 커스텀 모듈(iframe)로
 * 임베딩될 때 postMessage를 통해 부모 창과 데이터를 동기화합니다.
 * - 단독 브라우저(Standalone) 실행 시에는 이 모듈이 아무 작업도 하지 않으며
 *   기존 localStorage 동작을 그대로 유지합니다.
 * - PADO 에이전트(Hermes)는 `summary` 필드를 통해 수분 섭취 현황을 분석합니다.
 *
 * 메시지 규격 (모든 메시지는 appId: 'water_tracker' 포함):
 * - 앱 → 부모: PADO_DATA_INIT_REQUEST  { type, appId }
 * - 부모 → 앱: PADO_DATA_INIT_RESPONSE { type, appId, payload: PadoPayload | null }
 * - 앱 → 부모: PADO_DATA_SYNC          { type, appId, payload: PadoPayload }
 */
import { startOfDay, endOfDay } from 'date-fns';
import { User, UserSettings, HydrationLog } from '../types';
import { defaultSettings } from '../store/HydrationContext';
import { calculateTotalRecommended } from './utils';
import { readLocalJson } from './storage';

export const PADO_APP_ID = 'water_tracker';

export const PADO_MESSAGE_INIT_REQUEST = 'PADO_DATA_INIT_REQUEST';
export const PADO_MESSAGE_INIT_RESPONSE = 'PADO_DATA_INIT_RESPONSE';
export const PADO_MESSAGE_SYNC = 'PADO_DATA_SYNC';

/** PADO 에이전트(Hermes) 분석용 요약 필드 */
export interface PadoSummary {
  todayIntake: number;      // 활성 사용자의 오늘 총 섭취량 (ml)
  target: number;           // 일일 목표량 (ml)
  achievementRate: number;  // 달성률 (%)
  todayLogCount: number;    // 오늘 기록 횟수
}

/** PADO 통합 동기화 페이로드 */
export interface PadoPayload {
  appId: string;
  updatedAt: string; // ISO 8601
  users: User[];
  settings: Record<string, UserSettings>; // { [userId]: settings }
  logs: Record<string, HydrationLog[]>;   // { [userId]: logs }
  summary: PadoSummary;
}

export interface PadoBridgeMessage {
  type: string;
  appId?: string;
  payload?: PadoPayload | null;
}

export const APP_USERS_KEY = 'app_users';

export const userSettingsKey = (userId: string) => `hydration_settings_${userId}`;
export const userLogsKey = (userId: string) => `hydration_logs_${userId}`;

/** iframe 임베딩 여부 판별. 크로스 오리진에서 예외가 나면 false로 안전 처리. */
export function isEmbedded(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.parent && window.parent !== window;
  } catch {
    return false;
  }
}

/** 모든 사용자의 settings/logs를 localStorage에서 읽는다. */
export function readAllUsersData(users: User[]): {
  settings: Record<string, UserSettings>;
  logs: Record<string, HydrationLog[]>;
} {
  const settings: Record<string, UserSettings> = {};
  const logs: Record<string, HydrationLog[]> = {};
  for (const user of users) {
    settings[user.id] = readLocalJson<UserSettings>(userSettingsKey(user.id), defaultSettings);
    logs[user.id] = readLocalJson<HydrationLog[]>(userLogsKey(user.id), []);
  }
  return { settings, logs };
}

/** 활성 사용자의 오늘 요약(summary) 계산 */
export function buildSummary(
  settings: Record<string, UserSettings>,
  logs: Record<string, HydrationLog[]>,
  activeUserId: string | null
): PadoSummary {
  if (!activeUserId) {
    return { todayIntake: 0, target: 0, achievementRate: 0, todayLogCount: 0 };
  }

  const now = new Date();
  const start = startOfDay(now).getTime();
  const end = endOfDay(now).getTime();
  const todayLogs = (logs[activeUserId] ?? []).filter(
    (log) => log.timestamp >= start && log.timestamp <= end
  );

  const todayIntake = todayLogs.reduce((acc, log) => acc + log.hydrationAmount, 0);
  const userSettings = settings[activeUserId];
  const target = userSettings
    ? calculateTotalRecommended(userSettings.weight, userSettings.activityLevel)
    : 0;
  const achievementRate = target > 0 ? Math.min(100, Math.round((todayIntake / target) * 100)) : 0;

  return { todayIntake, target, achievementRate, todayLogCount: todayLogs.length };
}

/** 현재 localStorage 기준 전체 페이로드를 조립한다. */
export function buildPadoPayload(users: User[], activeUserId: string | null): PadoPayload {
  const { settings, logs } = readAllUsersData(users);
  return {
    appId: PADO_APP_ID,
    updatedAt: new Date().toISOString(),
    users,
    settings,
    logs,
    summary: buildSummary(settings, logs, activeUserId),
  };
}

/** 로컬스토리지에 기존 데이터(사용자 목록 또는 hydration 기록)가 있는지 확인 */
export function hasLocalData(): boolean {
  try {
    const users = readLocalJson<User[]>(APP_USERS_KEY, []);
    if (users.length > 0) return true;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('hydration_')) return true;
    }
    return false;
  } catch {
    return false;
  }
}
