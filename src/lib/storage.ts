/**
 * localStorage 공용 유틸 + 동기화 이벤트
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

export const LOCAL_STORAGE_UPDATE_EVENT = 'aquaflow:storage-change';

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
