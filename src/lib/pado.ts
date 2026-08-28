/**
 * PADO(파도) 플랫폼 양방향 데이터 브릿지 — 프로토콜/페이로드 정의
 *
 * 본 앱(AquaFlow, appId: 'water_tracker')이 PADO 허브에 커스텀 모듈(iframe)로
 * 임베딩될 때 postMessage를 통해 부모 창과 데이터를 동기화합니다.
 * - 단독 브라우저(Standalone) 실행 시에는 이 모듈이 아무 작업도 하지 않으며
 *   기존 localStorage 동작을 그대로 유지합니다.
 * - PADO 에이전트(Hermes)는 `summary` 필드를 통해 수분 섭취 현황을 분석합니다.
 * - v0.2.0부터 다중 사용자를 제거하고 단일 사용자 스키마(settings/logs)를 사용합니다.
 *
 * 메시지 규격 (모든 메시지는 appId: 'water_tracker' 포함):
 * - 앱 → 부모: PADO_DATA_INIT_REQUEST  { type, appId }
 * - 부모 → 앱: PADO_DATA_INIT_RESPONSE { type, appId, payload: PadoPayload | null }
 * - 앱 → 부모: PADO_DATA_SYNC          { type, appId, payload: PadoPayload }
 */
import { startOfDay, endOfDay } from 'date-fns';
import { UserSettings, HydrationLog, DrinkType } from '../types';
import { calculateTotalRecommended } from './utils';
import { SETTINGS_KEY, LOGS_KEY, APP_USERS_KEY } from './storage';

export const PADO_APP_ID = 'water_tracker';

export const PADO_MESSAGE_INIT_REQUEST = 'PADO_DATA_INIT_REQUEST';
export const PADO_MESSAGE_INIT_RESPONSE = 'PADO_DATA_INIT_RESPONSE';
export const PADO_MESSAGE_SYNC = 'PADO_DATA_SYNC';

/** PADO 외부 동기화용 단순화 설정 (내부 UserSettings와 1:1 대응 아님) */
export interface PadoSettings {
  target: number;            // 일일 목표량 (ml)
  cupSize: number;           // 컵 1회 기본 용량 (ml)
  reminderInterval: number;  // 알림 간격 (분)
}

/** PADO 외부 동기화용 단순화 로그 */
export interface PadoLog {
  id: string;
  timestamp: string; // ISO 8601
  amount: number;    // 수분 반영량 (ml)
  type: string;      // DrinkType (현재 스키마: 'water')
}

/** PADO 에이전트(Hermes) 분석용 요약 필드 */
export interface PadoSummary {
  todayIntake: number;      // 오늘 총 섭취량 (ml)
  target: number;           // 일일 목표량 (ml)
  achievementRate: number;  // 달성률 (%)
  todayLogCount: number;    // 오늘 기록 횟수
}

/** PADO 통합 동기화 페이로드 (v0.2.0 단일 사용자 스키마) */
export interface PadoPayload {
  appId: string;
  updatedAt: string; // ISO 8601
  settings: PadoSettings;
  logs: PadoLog[];
  summary: PadoSummary;
}

export interface PadoBridgeMessage {
  type: string;
  appId?: string;
  payload?: PadoPayload | null;
}

const DRINK_TYPES: DrinkType[] = ['water', 'coffee', 'tea', 'soda', 'sports_drink'];

function isValidDrinkType(value: string): value is DrinkType {
  return (DRINK_TYPES as string[]).includes(value);
}

/** iframe 임베딩 여부 판별. 크로스 오리진에서 예외가 나면 false로 안전 처리. */
export function isEmbedded(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.parent && window.parent !== window;
  } catch {
    return false;
  }
}


/** 단일 사용자 설정/logs로 오늘 요약(summary) 계산 */
export function buildSummary(settings: UserSettings, logs: HydrationLog[]): PadoSummary {
  const now = new Date();
  const start = startOfDay(now).getTime();
  const end = endOfDay(now).getTime();
  const todayLogs = logs.filter((log) => log.timestamp >= start && log.timestamp <= end);

  const todayIntake = todayLogs.reduce((acc, log) => acc + log.hydrationAmount, 0);
  const target = calculateTotalRecommended(settings.weight, settings.activityLevel);
  const achievementRate = target > 0 ? Math.min(100, Math.round((todayIntake / target) * 100)) : 0;

  return { todayIntake, target, achievementRate, todayLogCount: todayLogs.length };
}

/** 내부 단일 사용자 상태(settings/logs)를 PADO 외부 페이로드로 변환 */
export function buildPadoPayload(settings: UserSettings, logs: HydrationLog[]): PadoPayload {
  return {
    appId: PADO_APP_ID,
    updatedAt: new Date().toISOString(),
    settings: {
      target: calculateTotalRecommended(settings.weight, settings.activityLevel),
      cupSize: settings.drinkSettings?.water?.amount ?? 200,
      reminderInterval: settings.reminderInterval ?? 60,
    },
    logs: logs.map((log) => ({
      id: log.id,
      timestamp: new Date(log.timestamp).toISOString(),
      amount: log.hydrationAmount,
      type: log.drinkType,
    })),
    summary: buildSummary(settings, logs),
  };
}

/**
 * PADO 페이로드(간소화 스키마)를 내부 단일 사용자 상태로 복원.
 * PADO_DATA_INIT_RESPONSE 수신 시 settings/logs를 즉시 복원할 때 사용한다.
 */
export function restoreFromPadoPayload(
  payload: PadoPayload,
  fallbackSettings: UserSettings
): { settings: UserSettings; logs: HydrationLog[] } {
  const settings: UserSettings = { ...fallbackSettings };

  if (payload.settings && typeof payload.settings.target === 'number' && payload.settings.target > 0) {
    // target = weight * 30 + 300(moderate) → 체중 역산(대략 복원)
    const weight = Math.max(1, Math.round((payload.settings.target - 300) / 30));
    settings.weight = weight;
  }
  if (payload.settings && typeof payload.settings.cupSize === 'number' && payload.settings.cupSize > 0) {
    settings.drinkSettings = {
      ...settings.drinkSettings,
      water: { ...settings.drinkSettings.water, amount: payload.settings.cupSize },
    };
  }
  if (payload.settings && typeof payload.settings.reminderInterval === 'number') {
    settings.reminderInterval = payload.settings.reminderInterval;
  }

  const logs: HydrationLog[] = Array.isArray(payload.logs)
    ? payload.logs.map((log) => {
        const parsed = Date.parse(log.timestamp);
        return {
          id: log.id,
          timestamp: Number.isNaN(parsed) ? Date.now() : parsed,
          drinkType: isValidDrinkType(log.type) ? log.type : 'water',
          rawAmount: log.amount,
          hydrationAmount: log.amount,
        };
      })
    : [];

  return { settings, logs };
}

/** 로컬스토리지에 동기화 가능한 데이터(신규 키 또는 레거시 키)가 있는지 확인 */
export function hasLocalData(): boolean {
  try {
    if (window.localStorage.getItem(SETTINGS_KEY) !== null) return true;
    if (window.localStorage.getItem(LOGS_KEY) !== null) return true;
    if (window.localStorage.getItem(APP_USERS_KEY) !== null) return true;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('hydration_')) return true;
    }
    return false;
  } catch {
    return false;
  }
}
