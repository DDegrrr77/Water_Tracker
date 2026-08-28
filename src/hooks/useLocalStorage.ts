import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCAL_STORAGE_UPDATE_EVENT } from '../lib/storage';

/**
 * localStorage ↔ React state 동기화 훅
 *
 * - 쓰기(setValue) 시 localStorage에 저장하고 `aquaflow:storage-change` 이벤트 발행
 * - 외부 쓰기(PADO 브릿지 복원, 다른 탭의 storage 이벤트)를 감지해 자동 재조회
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return initialValue;
    }
  });

  // 클로저 스테일 방지용 최신 값 참조
  const storedValueRef = useRef(storedValue);
  storedValueRef.current = storedValue;
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  /** localStorage에서 다시 읽어 상태 갱신 */
  const refresh = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      setStoredValue(item ? (JSON.parse(item) as T) : initialValueRef.current);
    } catch (error) {
      console.error("Error reading from localStorage", error);
    }
  }, [key]);

  // 저장 키가 바뀌면(예: 사용자 전환) 다시 읽어온다
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 같은 키가 외부에서 변경되면(PADO 복원, 다른 탭) 다시 읽어온다
  useEffect(() => {
    const handleExternalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail && detail.key === key) refresh();
    };
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === key) refresh();
    };
    window.addEventListener(LOCAL_STORAGE_UPDATE_EVENT, handleExternalUpdate);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener(LOCAL_STORAGE_UPDATE_EVENT, handleExternalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [key, refresh]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValueRef.current) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(
          new CustomEvent<{ key: string }>(LOCAL_STORAGE_UPDATE_EVENT, { detail: { key } })
        );
      }
    } catch (error) {
      console.error("Error setting localStorage", error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}

