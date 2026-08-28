/**
 * localStorage 공용 유틸 + 동기화 이벤트 + 레거시 마이그레이션
 *
 * - 모든 localStorage 쓰기/삭제는 이 모듈을 통해 수행하면
 *   `aquaflow:storage-change` 커스텀 이벤트가 발행됩니다.
 * - 이 이벤트를 구독하는 대상:
 *   1) `useLocalStorage` — PADO 브릿지 복원(restore), 다른 탭 변경 반영
 *   2) `usePadoBridge` — 데이터 변경 감지 → PADO 부모 창 자동 동기화
 *
 * 별도 모듈로 분리한 이유: `useLocalStorage`(hooks) ↔ `pado.ts`(lib) 간
 * 순환 import를 방지하기 위함입니다.
 */

import { User, UserSettings, HydrationLog } from '../types';

export const LOCAL_STORAGE_UPDATE_EVENT = 'aquaflow:storage-change';

/** 단일 사용자 스토리지 키 (v0.2.0+) */
export const SETTINGS_KEY = 'hydration_settings';
export const LOGS_KEY = 'hydration_logs';

/** 레거시 멀티 유저 스토리지 키 (v0.1.x) — 마이그레이션 전용 */
export const APP_USERS_KEY = 'app_users';
export const userSettingsKey = (userId: string) => `hydration_settings_${userId}`;
export const userLogsKey = (userId: string) => `hydration_logs_${userId}`;

/** localStorage에서 JSON 값을 안전하게 읽는다. 실패 시 fallback 반환. */
export function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`[storage] Failed to read localStorage key "${key}"`, error);
    return fallback;
  }
}

/** localStorage에 JSON 값을 쓰고 동기화 이벤트를 발행한다. */
export function writeLocalJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    emitLocalStorageChange(key);
  } catch (error) {
    console.error(`[storage] Failed to write localStorage key "${key}"`, error);
  }
}

/** localStorage 키를 삭제하고 동기화 이벤트를 발행한다. */
export function removeLocalKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
    emitLocalStorageChange(key);
  } catch (error) {
    console.error(`[storage] Failed to remove localStorage key "${key}"`, error);
  }
}

/** 동기화 이벤트 발행 (외부에서 직접 상태 복원 후 호출 가능) */
export function emitLocalStorageChange(key: string): void {
  window.dispatchEvent(new CustomEvent<{ key: string }>(LOCAL_STORAGE_UPDATE_EVENT, { detail: { key } }));
}

/**
 * v0.1.x 멀티 유저 → v0.2.0 단일 사용자 키 1회 자동 마이그레이션 (앱 마운트 시 호출).
 *
 * - 신규 키(`hydration_logs`)가 이미 존재하면 아무 작업도 하지 않음 (멱등)
 * - 신규 키가 없고 기존 `app_users` 또는 `hydration_logs_*`/`hydration_settings_*`가
 *   남아있는 경우, 기본/활성(가장 마지막으로 생성된) 사용자의 기록을
 *   `hydration_logs` 및 `hydration_settings`로 자동 복사
 * - 레거시 키는 삭제하지 않음 (비파괴 마이그레이션 — 데이터 유실 방지)
 */
export function migrateLegacyData(defaultSettings: UserSettings): boolean {
  try {
    const hasNewSettings = window.localStorage.getItem(SETTINGS_KEY) !== null;
    const hasNewLogs = window.localStorage.getItem(LOGS_KEY) !== null;

    // 이미 단일 사용자 키가 모두 존재 → 마이그레이션 불필요
    if (hasNewSettings && hasNewLogs) return false;

    if (!hasNewLogs) {
      const targetId = findLegacyTargetUserId();
      if (!targetId) {
        // 레거시 데이터가 전혀 없으면 settings 기본값만 보장
        if (!hasNewSettings) writeLocalJson(SETTINGS_KEY, defaultSettings);
        return false;
      }

      const settings = readLocalJson<UserSettings>(userSettingsKey(targetId), defaultSettings);
      const logs = readLocalJson<HydrationLog[]>(userLogsKey(targetId), []);
      if (!hasNewSettings) writeLocalJson(SETTINGS_KEY, settings);
      writeLocalJson(LOGS_KEY, logs);
      console.log(
        `[storage] migrated legacy user data (userId=${targetId}) → ${SETTINGS_KEY} / ${LOGS_KEY}`
      );
      return true;
    }

    // logs는 있는데 settings가 없는 예외 케이스
    if (!hasNewSettings) {
      writeLocalJson(SETTINGS_KEY, defaultSettings);
    }
    return false;
  } catch (error) {
    console.error('[storage] legacy migration failed', error);
    return false;
  }
}

/** 마이그레이션 대상(기본/활성 사용자) userId 결정 */
function findLegacyTargetUserId(): string | null {
  // 1) app_users 목록의 마지막(가장 최근 생성 = 기본/활성) 사용자 우선
  const users = readLocalJson<User[]>(APP_USERS_KEY, []);
  if (users.length > 0 && users[users.length - 1].id) {
    return users[users.length - 1].id;
  }

  // 2) app_users가 없으면 남아있는 사용자별 키에서 대상 탐색
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith('hydration_logs_')) {
      return key.slice('hydration_logs_'.length);
    }
  }
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith('hydration_settings_')) {
      return key.slice('hydration_settings_'.length);
    }
  }
  return null;
}

