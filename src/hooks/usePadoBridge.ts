/**
 * PADO(파도) 플랫폼 양방향 데이터 브릿지 훅
 *
 * - iframe 임베딩 환경(PADO 허브)에서만 동작하고, 단독 브라우저(Standalone)에서는
 *   아무 작업도 하지 않습니다.
 * - 마운트 시 부모 창에 `PADO_DATA_INIT_REQUEST`를 발신하고,
 *   `PADO_DATA_INIT_RESPONSE` 수신 시 데이터 복원 또는 최초 마이그레이션을 수행합니다.
 * - users/settings/logs 등 localStorage 변경이 감지되면 `PADO_DATA_SYNC`를
 *   디바운스하여 부모 창에 전송합니다.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { User } from '../types';
import {
  PADO_APP_ID,
  PADO_MESSAGE_INIT_REQUEST,
  PADO_MESSAGE_INIT_RESPONSE,
  PADO_MESSAGE_SYNC,
  PadoBridgeMessage,
  PadoPayload,
  APP_USERS_KEY,
  buildPadoPayload,
  hasLocalData,
  isEmbedded,
  userLogsKey,
  userSettingsKey,
} from '../lib/pado';
import { LOCAL_STORAGE_UPDATE_EVENT, writeLocalJson } from '../lib/storage';

const SYNC_DEBOUNCE_MS = 250;

interface UsePadoBridgeOptions {
  /** 현재 사용자 목록 (App 상태) */
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  /** 활성 사용자 ID — summary 계산 기준. null이면 사용자 선택 화면. */
  currentUserId: string | null;
  /** 부모에서 복원된 사용자 목록에 현재 사용자가 없을 때 로그아웃 처리 등에 사용 */
  onRemoteRestore?: (users: User[]) => void;
}

export function usePadoBridge({ users, setUsers, currentUserId, onRemoteRestore }: UsePadoBridgeOptions) {
  const embeddedRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const migrationSentRef = useRef(false);
  const lastSentPayloadRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);

  // 최신 값 참조 (렌더링 시 갱신) — 콜백 내 클로저 스테일 방지
  const usersRef = useRef(users);
  const setUsersRef = useRef(setUsers);
  const currentUserIdRef = useRef(currentUserId);
  const onRemoteRestoreRef = useRef(onRemoteRestore);
  usersRef.current = users;
  setUsersRef.current = setUsers;
  currentUserIdRef.current = currentUserId;
  onRemoteRestoreRef.current = onRemoteRestore;

  /** 현재 상태를 페이로드로 조립해 부모 창에 PADO_DATA_SYNC 발신 */
  const sendSync = useCallback(() => {
    if (!embeddedRef.current) return;
    const payload = buildPadoPayload(usersRef.current, currentUserIdRef.current);
    const serialized = JSON.stringify(payload);
    if (serialized === lastSentPayloadRef.current) return; // 중복(에코) 방지
    lastSentPayloadRef.current = serialized;

    window.parent.postMessage({ type: PADO_MESSAGE_SYNC, appId: PADO_APP_ID, payload }, '*');
    console.log(
      `[PADO] PADO_DATA_SYNC sent (users=${payload.users.length}, todayIntake=${payload.summary.todayIntake}ml, ` +
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
     * - payload에 데이터가 있으면 localStorage에 저장 + React 상태 갱신(화면 복원)
     * - payload가 비어있고 로컬에 기존 데이터가 있으면 최초 마이그레이션 SYNC 1회
     */
    const applyRemotePayload = (payload: PadoPayload | null | undefined) => {
      const hasRemoteData =
        !!payload && Array.isArray(payload.users) && payload.users.length > 0;

      if (hasRemoteData) {
        applyingRemoteRef.current = true;
        try {
          // 1) users → React 상태 + localStorage 저장
          setUsersRef.current(payload.users);
          // 2) settings / logs → localStorage 저장 (useLocalStorage가 이벤트로 재조회)
          for (const [userId, settings] of Object.entries(payload.settings || {})) {
            writeLocalJson(userSettingsKey(userId), settings);
          }
          for (const [userId, logs] of Object.entries(payload.logs || {})) {
            writeLocalJson(userLogsKey(userId), logs);
          }
          onRemoteRestoreRef.current?.(payload.users);
        } finally {
          // 방금 복원한 스냅샷을 "이미 동기화됨"으로 기록 → 에코 발신 방지
          lastSentPayloadRef.current = JSON.stringify(
            buildPadoPayload(payload.users, currentUserIdRef.current)
          );
          applyingRemoteRef.current = false;
        }
        console.log(
          `[PADO] PADO_DATA_INIT_RESPONSE applied — restored ${payload.users.length} user(s) from parent`
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
      if (
        event.key === APP_USERS_KEY ||
        (event.key != null && event.key.startsWith('hydration_'))
      ) {
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

