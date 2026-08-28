/**
 * PADO(파도) 플랫폼 양방향 데이터 브릿지 훅 (단일 사용자 스키마)
 *
 * - iframe 임베딩 환경(PADO 허브)에서만 동작하고, 단독 브라우저(Standalone)에서는
 *   아무 작업도 하지 않습니다.
 * - 마운트 시 부모 창에 `PADO_DATA_INIT_REQUEST`를 발신하고,
 *   `PADO_DATA_INIT_RESPONSE` 수신 시 단일 settings/logs를 즉시 복원합니다.
 * - 수분 기록 추가/삭제·설정 수정 등 localStorage 변경이 감지되면 `PADO_DATA_SYNC`를
 *   250ms 디바운스하여 부모 창에 전송합니다.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { UserSettings, HydrationLog } from '../types';
import {
  PADO_APP_ID,
  PADO_MESSAGE_INIT_REQUEST,
  PADO_MESSAGE_INIT_RESPONSE,
  PADO_MESSAGE_SYNC,
  PadoBridgeMessage,
  PadoPayload,
  buildPadoPayload,
  hasLocalData,
  isEmbedded,
  restoreFromPadoPayload,
} from '../lib/pado';
import { LOCAL_STORAGE_UPDATE_EVENT } from '../lib/storage';

const SYNC_DEBOUNCE_MS = 250;

interface UsePadoBridgeOptions {
  /** 단일 사용자 설정 상태 (PADO 페이로드의 settings/summary 계산 기준) */
  settings: UserSettings;
  setSettings: Dispatch<SetStateAction<UserSettings>>;
  /** 단일 사용자 수분 기록 배열 */
  logs: HydrationLog[];
  setLogs: Dispatch<SetStateAction<HydrationLog[]>>;
}

export function usePadoBridge({ settings, setSettings, logs, setLogs }: UsePadoBridgeOptions) {
  const embeddedRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const migrationSentRef = useRef(false);
  const lastSentPayloadRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);

  // 최신 값 참조 (렌더링 시 갱신) — 콜백 내 클로저 스테일 방지
  const settingsRef = useRef(settings);
  const setSettingsRef = useRef(setSettings);
  const logsRef = useRef(logs);
  const setLogsRef = useRef(setLogs);
  settingsRef.current = settings;
  setSettingsRef.current = setSettings;
  logsRef.current = logs;
  setLogsRef.current = setLogs;


  /** 현재 상태를 페이로드로 조립해 부모 창에 PADO_DATA_SYNC 발신 */
  const sendSync = useCallback(() => {
    if (!embeddedRef.current) return;
    const payload = buildPadoPayload(settingsRef.current, logsRef.current);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSentPayloadRef.current) return; // 중복(에코) 방지
    lastSentPayloadRef.current = serialized;

    window.parent.postMessage({ type: PADO_MESSAGE_SYNC, appId: PADO_APP_ID, payload }, '*');
    console.log(
      `[PADO] PADO_DATA_SYNC sent (logs=${payload.logs.length}, todayIntake=${payload.summary.todayIntake}ml, ` +
        `target=${payload.summary.target}ml, achievementRate=${payload.summary.achievementRate}%, todayLogCount=${payload.summary.todayLogCount})`
    );
  }, []);

  /** 데이터 변경 이벤트 → 디바운스 후 SYNC */
  const scheduleSync = useCallback(() => {
    if (!embeddedRef.current) return;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      if (applyingRemoteRef.current) return; // 원격 복원 중에는 에코 방지
      sendSync();
    }, SYNC_DEBOUNCE_MS);
  }, [sendSync]);

  useEffect(() => {
    embeddedRef.current = isEmbedded();
    if (!embeddedRef.current) return;

    /**
     * PADO_DATA_INIT_RESPONSE 처리:
     * - payload에 데이터가 있으면 단일 settings/logs로 즉시 복원 (localStorage + React 상태)
     * - payload가 비어있고 로컬에 기존 데이터가 있으면 최초 마이그레이션 SYNC 1회
     */
    const applyRemotePayload = (payload: PadoPayload | null | undefined) => {
      const hasRemoteData = !!payload && (!!payload.settings || Array.isArray(payload.logs));

      if (hasRemoteData) {
        applyingRemoteRef.current = true;
        try {
          const restored = restoreFromPadoPayload(payload, settingsRef.current);
          // setSettings/setLogs(useLocalStorage)가 localStorage + React 상태를 동시에 갱신
          setSettingsRef.current(restored.settings);
          setLogsRef.current(restored.logs);
          // 방금 복원한 스냅샷을 "이미 동기화됨"으로 기록 → 에코 발신 방지
          lastSentPayloadRef.current = JSON.stringify(
            buildPadoPayload(restored.settings, restored.logs)
          );
        } finally {
          applyingRemoteRef.current = false;
        }
        console.log(
          `[PADO] PADO_DATA_INIT_RESPONSE applied — single-user settings/logs restored (logs=${Array.isArray(payload.logs) ? payload.logs.length : 0})`
        );
      } else if (hasLocalData()) {
        // PADO에 데이터가 없고 로컬에 기존 데이터가 있는 경우 → 최초 마이그레이션
        if (!migrationSentRef.current) {
          migrationSentRef.current = true;
          sendSync();
          console.log('[PADO] PADO_DATA_INIT_RESPONSE (empty) — local data migrated via PADO_DATA_SYNC');
        }
      } else {
        console.log('[PADO] PADO_DATA_INIT_RESPONSE (empty) — no local data to migrate');
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as PadoBridgeMessage | null | undefined;
      if (!data || typeof data !== 'object') return;
      if (data.appId !== PADO_APP_ID) return;
      if (data.type === PADO_MESSAGE_INIT_RESPONSE) {
        applyRemotePayload(data.payload);
      }
    };

    const handleLocalChange = () => {
      scheduleSync();
    };

    // 다른 탭에서의 변경도 감지 (PADO 임베딩 탭의 동기화 보강)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key != null && event.key.startsWith('hydration_')) {
        scheduleSync();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener(LOCAL_STORAGE_UPDATE_EVENT, handleLocalChange);
    window.addEventListener('storage', handleStorageEvent);

    // 1) 초기 데이터 요청
    window.parent.postMessage({ type: PADO_MESSAGE_INIT_REQUEST, appId: PADO_APP_ID }, '*');
    console.log(`[PADO] PADO_DATA_INIT_REQUEST sent (appId=${PADO_APP_ID})`);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener(LOCAL_STORAGE_UPDATE_EVENT, handleLocalChange);
      window.removeEventListener('storage', handleStorageEvent);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [scheduleSync, sendSync]);
}

