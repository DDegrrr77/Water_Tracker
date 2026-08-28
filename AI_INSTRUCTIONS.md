# AI_INSTRUCTIONS.md — AquaFlow (수분 섭취 트래커) AI 개발 가이드

> 본 문서는 AI 에이전트 및 신규 개발자가 코드베이스를 안정적으로 유지보수·확장하기 위한
> **아키텍처 명세서**입니다. 모든 내용은 실제 소스 코드(`src/`) 기준으로 작성되었습니다.
> 코드를 수정하기 전에 이 문서를 먼저 읽으십시오.

---

## 1. 프로젝트 개요

### 1.1 앱의 핵심 목적

**AquaFlow(수분 섭취 트래커)** 는 한국어 모바일 우선(모바일 퍼스트) 웹앱으로,
사용자의 하루 수분 섭취를 **빠르게 기록**하고, 체중·활동량·기상/취침 시간을 바탕으로
**맞춤형 권장 수분량**을 계산해 목표 달성을 도와주는 것이 목적입니다.

### 1.2 핵심 사용자 시나리오

1. **첫 실행 / 신규 사용자 가입**
   - `UserSelection` 화면에서 이름 입력 → 4종 캐릭터 선택 → 체중·활동량·기상/취침 시간 입력
   - 생성 즉시 `app_users`에 사용자 추가 + `hydration_settings_{userId}`에 초기 설정 저장
2. **수분 기록 (홈 탭)**
   - 물/커피/차/탄산/이온음료 버튼을 탭하면 `HydrationLog`가 생성됨
   - 원형 게이지에 오늘 섭취량·현재 권장량·일일 목표량이 시각화됨
   - 잘못 기록한 경우 "최근 기록 취소" 버튼으로 당일 마지막 로그를 삭제
3. **통계 확인 (통계 탭)**
   - 최근 7일 평균 섭취량, 목표 달성률, 주간 막대 차트, 월간 캘린더 확인
4. **설정 및 데이터 관리 (설정 탭)**
   - 몸무게·활동량·기상/취침 시간·음료별 기본량/반영률 변경
   - 수분 부족 브라우저 알림 활성화 (현재 권장량 대비 10% 이상 부족 시)
   - JSON 파일 백업/복구, 사용자 전환/삭제

### 1.3 앱 동작 방식 요약

- **SPA (단일 페이지 앱)**: 라우터 없이 `App.tsx` 내부의 `activeTab` 상태로 화면 전환
- **멀티 사용자**: 브라우저 `localStorage` 기반 로컬 프로필 (백엔드/DB 없음)
- **PWA 기반 구조**: `manifest.json` + `sw.js`(패스스루) + SVG 아이콘으로 설치 가능 형태

---

## 2. 기술 스택 명세

| 구분 | 기술 | 버전 | 용도/비고 |
|---|---|---|---|
| 프레임워크 | React | ^19.0.1 | `react-dom` 포함, StrictMode 사용 |
| 언어 | TypeScript | ~5.8.2 | `tsc --noEmit`로 타입 검증 (`npm run lint`) |
| 빌드 도구 | Vite | ^6.2.3 | dev 서버(포트 3000), `vite build` |
| 상태 관리 | React Context API + 커스텀 훅 | - | `src/store/HydrationContext.tsx` + `src/hooks/useLocalStorage.ts` (Redux/Zustand 미사용) |
| 스타일링 | Tailwind CSS v4 | ^4.1.14 | `@tailwindcss/vite` 플러그인, `@import "tailwindcss"` + `@theme` |
| 클래스 병합 | `clsx` + `tailwind-merge` | ^2.1.1 / ^3.6.0 | `cn()` 유틸 (`src/lib/utils.ts`) |
| 아이콘 | lucide-react | ^0.546.0 | 탭·버튼 아이콘 |
| 차트 | recharts | ^3.8.1 | 통계 탭 막대 차트 |
| 애니메이션 | motion | ^12.23.24 | `motion/react`, ripple·토스트·전환 효과 |
| 날짜 | date-fns | ^4.3.0 | `ko` locale, 일/주/월 계산 |
| 브라우저 알림 | Web Notification API | - | `src/lib/notifications.ts` |
| PWA | manifest.json + sw.js | - | 서비스워커는 패스스루(pass-through)만 구현 |
| PADO 브릿지 | postMessage + localStorage 이벤트 | - | iframe 임베딩 시 부모 창과 양방향 동기화 (`src/lib/pado.ts`, `src/hooks/usePadoBridge.ts`) |
| 기타(스캐폴딩 잔재) | @google/genai, dotenv, express | - | `src/`에서 미사용, AI Studio 앱 생성 시 포함된 의존성 |

### 2.1 주요 npm 스크립트

| 명령 | 동작 |
|---|---|
| `npm run dev` | Vite dev 서버 (포트 3000, `--host=0.0.0.0`) |
| `npm run build` | `vite build` → `dist/` 생성 (타입 체크 포함 안 함) |
| `npm run lint` | `tsc --noEmit` 타입 검사 |
| `npm run preview` | 빌드 산출물 프리뷰 서버 |
| `npm run clean` | `dist`와 `server.js` 삭제 (`server.js`는 현재 존재하지 않음) |

> ⚠️ **주의**: `vite build`는 esbuild 기반 트랜스파일만 수행하므로 **타입 오류를 잡지 못합니다.**
> 코드 변경 후에는 반드시 `npm run lint`도 함께 실행할 것.

---

## 3. 디렉터리 구조 맵

```
Water_Tracker/
├── .env.example              # GEMINI_API_KEY, APP_URL (AI Studio 스캐폴딩 잔재)
├── index.html                # 엔트리 HTML (한국어, PWA 메타, SW 등록)
├── metadata.json             # AI Studio 배포 메타데이터
├── package.json              # 의존성/스크립트
├── tsconfig.json             # TS 설정 (strict 미사용, bundler resolution, @/* alias)
├── vite.config.ts            # react + tailwindcss 플러그인, @ alias, DISABLE_HMR 처리
├── public/
│   ├── icon.svg              # 앱 아이콘 (SVG, manifest·apple-touch 용)
│   ├── manifest.json         # PWA 매니페스트
│   ├── sw.js                 # 서비스워커 (install/activate/fetch 패스스루)
│   └── pado-harness.html     # PADO 브릿지 테스트 하니스 (iframe 임베딩 시뮬레이터)
└── src/
    ├── main.tsx              # 엔트리: createRoot + StrictMode + index.css
    ├── App.tsx               # 루트: 사용자 세션, 탭 네비게이션, PADO 브릿지 마운트, 스크롤 반응 헤더/네비
    ├── types.ts              # 도메인 타입 (DrinkType/User/UserSettings/HydrationLog/Tab)
    ├── index.css             # Tailwind v4, @theme (primary 색상, wave 키프레임), 다크모드 변수
    ├── components/
    │   ├── UserSelection.tsx # 사용자 목록·생성(2단계 위저드)·삭제 화면 (+ renderCharacter)
    │   ├── HomeTab.tsx       # 홈: 원형 게이지, 웨이브, 음료 quick-add, undo
    │   ├── StatsTab.tsx      # 통계: 평균/달성률, 주간 차트, 캘린더
    │   ├── SettingsTab.tsx   # 설정: 프로필·음료 설정·알림·백업/복구·계정
    │   └── Toast.tsx         # 수분 부족 경고 토스트 (3초 자동 숨김)
    ├── hooks/
    │   ├── useLocalStorage.ts # localStorage ↔ React state 동기화 훅 (변경 이벤트 발행/구독)
    │   └── usePadoBridge.ts   # PADO 부모 창 양방향 동기화 브릿지 훅
    ├── lib/
    │   ├── utils.ts          # cn(), 권장량 계산 함수
    │   ├── notifications.ts  # 브라우저 알림 권한/발송
    │   ├── storage.ts        # localStorage 공용 유틸 + aquaflow:storage-change 이벤트
    │   └── pado.ts           # PADO 프로토콜/페이로드 정의 (appId, 메시지 타입, summary 계산)
    └── store/
        └── HydrationContext.tsx # 전역 상태 Provider + useHydration() 훅
```

### 3.1 컴포넌트 책임 및 연관 관계

```
main.tsx
  └─ App.tsx
       ├─ [currentUser 없음] UserSelection  ──▶ users (useLocalStorage 'app_users')
       └─ [currentUser 있음] HydrationProvider (userId)
            └─ AppContent
                 ├─ HomeTab        ┐
                 ├─ StatsTab       ├─ useHydration() 로 Context 접근
                 ├─ SettingsTab    ┘
                 └─ Toast
```


---

## 4. 핵심 데이터 스키마

모든 타입은 `src/types.ts`에 정의되어 있습니다. 변경 시 **반드시 이 파일을 수정**하세요.

### 4.1 `DrinkType`

```ts
export type DrinkType = 'water' | 'coffee' | 'tea' | 'soda' | 'sports_drink';
```

5종 고정 값. 음료 종류를 추가하려면 여기와 함께 다음을 수정해야 합니다:
- `HydrationContext.tsx`의 `defaultSettings.drinkSettings`
- `SettingsTab.tsx`의 `drinkLabels`
- `HomeTab.tsx`의 `drinkOptions` (아이콘·라벨)

### 4.2 `User` — 사용자 프로필 목록 항목

```ts
export interface User {
  id: string;        // e.g. "홍길동_1735350000000" (이름 소문자/underscore + Date.now())
  name: string;      // 표시 이름
  character: string; // 캐릭터 이미지 URL (http...) 또는 이모지 문자열
}
```

### 4.3 `DrinkSetting` · `UserSettings` — 사용자별 설정

```ts
export interface DrinkSetting {
  amount: number;        // 기본 섭취량 (ml)
  hydrationRate: number; // 수분 반영률 (% 0~100) — 커피 80%, 탄산 50% 등
}

export interface UserSettings {
  weight: number;        // 체중 (kg)
  activityLevel: 'light' | 'moderate' | 'high';
  wakeUpTime: string;    // 'HH:MM' 24시간 형식
  bedTime: string;       // 'HH:MM' (자정 넘김 허용 — 예: 01:00)
  drinkSettings: Record<DrinkType, DrinkSetting>;
  notificationsEnabled: boolean;
}
```

**기본값** (`HydrationContext.tsx`의 `defaultSettings`):
`weight: 60`, `activityLevel: 'moderate'`, `wakeUpTime: '07:00'`, `bedTime: '23:00'`,
`drinkSettings`: water `{200, 100}` / coffee `{250, 80}` / tea `{250, 100}` /
soda `{250, 50}` / sports_drink `{300, 100}`, `notificationsEnabled: false`

### 4.4 `HydrationLog` — 섭취 기록

```ts
export interface HydrationLog {
  id: string;             // Math.random().toString(36).substring(2,9) 생성
  timestamp: number;      // Date.now() epoch ms (로컬 시간 기준)
  drinkType: DrinkType;
  rawAmount: number;      // 입력한 원액량 (ml)
  hydrationAmount: number; // 수분 반영량 (ml) = rawAmount * hydrationRate / 100
}
```

### 4.5 `Tab`

```ts
export type Tab = 'home' | 'stats' | 'settings';
```


---

## 5. 상태 흐름 및 영속화 규칙

### 5.1 localStorage 저장 키 (스키마 버전 1)

| 키 | 값 타입 | 생성 시점 | 삭제 시점 |
|---|---|---|---|
| `app_users` | `User[]` | 첫 사용자 생성 | 해당 사용자 삭제 시 목록에서 제거 |
| `hydration_settings_{userId}` | `UserSettings` | 사용자 생성 직후 (기본값+입력값) | 사용자 삭제 시 `removeItem` |
| `hydration_logs_{userId}` | `HydrationLog[]` | 최초 기록 시 (빈 배열 기본) | 사용자 삭제 시 `removeItem` |

### 5.2 영속화 메커니즘 (`useLocalStorage` 훅 + `lib/storage.ts`)

- 초기화: `useState` 지연 초기화로 `localStorage`에서 JSON 파싱 → 없으면 `initialValue`
- 쓰기: `setValue()` 호출 시 **React state와 `localStorage.setItem`을 동시에** 수행 후
  `aquaflow:storage-change` 커스텀 이벤트 발행 (`lib/storage.ts`의 `writeLocalJson`/`setValue`)
- 동기화:
  - `key`가 바뀌면 `useEffect`에서 다시 읽어옴 (사용자 전환)
  - 같은 키의 외부 변경(`aquaflow:storage-change` 이벤트, PADO 복원, 다른 탭의 `storage` 이벤트)을
    감지해 자동 재조회
- 함수형 업데이트: `storedValueRef`를 사용해 최신 값 기준으로 계산 (클로저 스테일 방지)
- 에러 처리: 파싱/쓰기 실패 시 `console.error` 후 초기값 또는 기존 값 유지
- 삭제: `removeLocalKey()` 사용 (삭제 후 이벤트 발행 — 삭제 경로도 동기화 반영)

### 5.3 상태 생성/수정/삭제 시나리오

**① 사용자 생성** (`UserSelection.handleFinishAddUser`)
1. `User` 객체 생성 (`id = 이름_날짜시간`)
2. `localStorage.setItem('hydration_settings_{id}', JSON.stringify(초기 설정))` 직접 저장
3. `setUsers([...users, newUser])` → `app_users` 갱신
4. `onSelectUser(newUser)` → `App.currentUser` 상태로 진입

**② 수분 기록** (`HydrationContext.addLog`)
1. `settings.drinkSettings[type]`에서 `amount`·`hydrationRate` 조회
2. `hydrationAmount = Math.round(rawAmount * hydrationRate / 100)` 계산
3. `newLog` 생성 후 `setLogs(prev => [...prev, newLog])` → 로그+storage 동시 저장
4. 알림 활성 상태면 `todayTotalHydration + hydrationAmount < currentRecommended * 0.9`
   이면 토스트 + 브라우저 알림 발송

**③ 기록 취소** (`HydrationContext.undoLastLog`)
- 당일 로그(`todayLogs`) 중 **마지막 항목만** 제거 (`setLogs` + storage 갱신)
- 당일 로그가 없으면 동작하지 않음

**④ 설정 변경** (`HydrationContext.updateSettings`)
- `{ ...prev, ...newSettings }` 얕은 병합 후 저장
- `notificationsEnabled`가 false→true로 켜지면 `requestNotificationPermission()` 호출
- ⚠️ 음료 설정 변경 시 호출부(`SettingsTab`)에서 중첩 객체를 새로 만들어 넘김
  (`drinkSettings`는 얕은 병합이라 전체 객체를 재구성해야 함)

**⑤ 사용자 삭제** (`UserSelection.confirmDeleteUser` / `App.onDeleteUser`)
1. `app_users`에서 해당 사용자 제거
2. `hydration_settings_{id}`, `hydration_logs_{id}` 키 `removeItem`
3. 현재 사용자였다면 `currentUser = null` → 사용자 선택 화면 복귀

**⑥ 데이터 백업/복구** (`HydrationContext.backupData` / `restoreData`)
- 백업: `{ settings, logs, version: '1.0' }`을 JSON 파일로 다운로드
  (`water_{userId}_{yyyyMMdd_HHmmss}.json`)
- 복구: 파일 업로드 → 파싱 → `settings`와 `logs` 키가 모두 있으면 교체 저장
  (스키마 심층 검증은 없음 — 기술 부채 참고)


### 5.4 파생 상태 (매 렌더마다 계산)

- `totalRecommended = calculateTotalRecommended(weight, activityLevel)`
  - `weight * 30 + (moderate: 300 | high: 600 | light: 0)` (ml)
- `todayLogs`: `logs` 중 `startOfDay ≤ timestamp ≤ endOfDay`
- `todayTotalHydration`: `todayLogs`의 `hydrationAmount` 합계
- `currentRecommended`: 기상~취침 시간 사이를 선형 보간한 **현재 시점 권장량**
  (1분마다 갱신, 취침이 자정 넘김이면 하루 경계 처리)

### 5.5 Context 사용 규칙

- 모든 상태 접근은 `useHydration()` 훅을 통해 수행
- `useHydration()`은 `HydrationProvider` **밖에서 호출하면 에러를 throw**함
- Provider는 `App.tsx`에서 현재 사용자 ID를 받아 마운트됨
  (`<HydrationProvider userId={currentUser.id}>`)
- `Toast` 컴포넌트는 `toastMessage`/`setToastMessage`로 동작 (전역 마운트)

---

## 6. 코딩 컨벤션 및 제약 사항

### 6.1 코드 구조 컨벤션

- **컴포넌트 파일**: `PascalCase.tsx` (`HomeTab.tsx`), 기본 내보내기 대신 **명명된 함수 export** 사용
  (단, `App.tsx`는 `export default`), 메인 앱에선 `src/main.tsx`가 App을 import
- **훅/유틸 파일**: `camelCase.ts` (`useLocalStorage.ts`, `utils.ts`)
- **타입 정의**: 도메인 타입은 `src/types.ts`에 집중 정의. 컴포넌트 로컬 props는
  해당 파일 하단 `interface Props { ... }`로 정의
- **import 경로**: 상대 경로 사용 (`./components/HomeTab`, `../store/HydrationContext`)
  — `@/*` alias가 tsconfig/vite에 정의되어 있지만 소스에서는 미사용
- **확장자**: `.tsx` 파일은 `import './App.tsx'`처럼 확장자까지 명시
  (`allowImportingTsExtensions` 활성)
- **JSX 규칙**: 파일 상단에 `import React, { useState } from 'react'` 형태 (automatic JSX 런타임)

### 6.2 UI/UX 디자인 가이드

- **한국어 UI**: 모든 표시 텍스트는 한국어 (`label`, placeholder, toast, alert 모두)
- **모바일 퍼스트 레이아웃**:
  - 화면 컨테이너: `flex flex-col h-[100dvh] max-w-md mx-auto`
  - 스크롤 영역: `<main className="flex-1 overflow-y-auto ...">`
  - 하단 탭 바/헤더는 `absolute` 포지션 + `backdrop-blur`
  - `pb-safe`(iOS safe area), `no-scrollbar` 커스텀 클래스 사용
- **색상 팔레트**:
  - `index.css` `@theme`의 `--color-primary`(#0072CE) 계열
  - 포인트 컬러: `#0058bf`(텍스트/포커스), `#006fef`(강조), `#71d5fe`(포인트 배지),
    `#006783`(오늘/포인트)
  - 배경: `bg-gradient-to-br from-[#f7fafe] to-[#e6efff]` (홈), 카드 `bg-white rounded-3xl shadow-sm`
  - 절대 헥스(arbitrary value) 인라인 사용이 일반적 → `index.css`의 `@theme` 확장보다
    임시 색상은 inline으로 사용하는 관례
- **다크 모드**: `index.css`에 `prefers-color-scheme: dark`용 CSS 변수만 존재.
  실제 컴포넌트는 라이트 모드 전용 고정 색상(`text-slate-*`, `bg-white`) 사용 — 다크 모드 미지원
- **애니메이션**: `motion/react`의 `motion.div`, `AnimatePresence` 사용.
  무거운 애니메이션(웨이브, ripple)은 `animate-wave`(CSS)와 transition으로 구현
- **인터랙션**: 버튼 `active:scale-95`, `transition-all`, hover 상태 명시.
  `navigator.vibrate(50)` 햅틱(모바일)

### 6.3 에러 핸들링

- **localStorage**: 모든 읽기/쓰기를 `try/catch`로 감싸고 실패 시 `console.error`
  (스토리지 손상 시 기본값으로 폴백 — 사용자 데이터 보호 우선)
- **백업 복구**: `restoreData`는 JSON 파싱 실패/필수 키 누락 시 `false` 반환 →
  `SettingsTab`에서 `alert()`로 사용자 안내
- **Context 범위 밖**: `useHydration()`이 Provider 밖에서 호출되면 에러 throw (명시적 방어)
- **브라우저 미지원**: Notification 미지원 브라우저는 권한 요청 시 `false` 반환
- ⚠️ **주의**: 미니멀한 에러 UI만 존재. 전역 ErrorBoundary는 없음

### 6.4 빌드/린트 규칙

| 검사 | 명령 | 현재 상태 |
|---|---|---|
| 타입 검사 | `npm run lint` (`tsc --noEmit`) | ✅ 통과 |
| 프로덕션 빌드 | `npm run build` (`vite build`) | ✅ 통과 (chunk 크기 경고 있음) |

- **ESLint/Prettier 미설정** — `npm run lint`는 순수 타입 검사입니다.
  스타일 정적 검사는 별도 도구가 없으므로 이 문서의 컨벤션을 직접 준수해야 합니다.
- 빌드 시 **500KB 초과 chunk 경고** 발생 (`recharts` 포함 메인 번들 약 786KB).
  코드 스플리팅이 필요하지만 기능 동작에는 문제 없음.
- `vite.config.ts`의 `DISABLE_HMR` 분기(주석 포함)는 **AI Studio 환경용이므로 수정 금지**
  (파일 내 "Do not modify" 주석 참고).

### 6.5 주의·금지 사항

1. **상태 저장 우회 금지**: `settings`/`logs`는 반드시 Context의 `updateSettings`/
   `addLog`/`setLogs` 경로로 변경. `localStorage` 직접 쓰기는 UserSelection 생성 시점
   (초기 설정 저장)만 허용
2. **데이터 스키마 하위 호환**: `localStorage`에 저장된 기존 데이터를 깨는 타입 변경은
   마이그레이션 로직과 함께 수행 (현재 버전 관리 부재 — 기술 부채)
3. **Provider 재구조화 주의**: `HydrationProvider`는 userId에 의존하므로 구조 변경 시
   멀티 사용자 데이터 격리(`hydration_*_{userId}` 키)를 보장할 것
4. **`server.js`/서버 코드**: `package.json`의 `clean` 스크립트에만 참조됨. 소스에서
   서버 실행 코드를 추가하지 말 것 (AI Studio 정적 호스팅 전제)
5. **외부 라이브러리 추가 시**: 이미 사용 중인 스택(위 2장 표)에 없는 라이브러리는
   번들 크기에 민감하므로 사전 협의 필요
6. **시간/날짜 계산**: `timestamp`는 로컬 epoch ms 기준이며 `date-fns`의
   `startOfDay`/`endOfDay`로 하루 경계를 계산 — 시간대 관련 로직 추가 시 기존 방식 유지


---

## 7. PADO(파도) 플랫폼 브릿지 — 양방향 데이터 동기화

### 7.1 개요

본 앱(AquaFlow, **appId: `water_tracker`**)은 PADO 허브에 커스텀 모듈(iframe)로
임베딩될 수 있습니다. 임베딩 환경에서는 `postMessage` 프로토콜을 통해 부모 창과
사용자/설정/기록 데이터를 **양방향으로 동기화**하며, PADO 에이전트(Hermes)는
`summary` 필드로 수분 섭취 현황을 분석합니다.

- **Standalone(단독 브라우저)**: 브릿지는 아무 동작도 하지 않으며 기존 localStorage
  입출력이 100% 유지됩니다. (`isEmbedded()`가 false면 훅이 즉시 종료)
- **임베딩(PADO 허브)**: 아래 프로토콜로 자동 동기화됩니다.

관련 파일:
- `src/lib/pado.ts` — 프로토콜 상수, 페이로드 타입, `buildPadoPayload`/`buildSummary`
- `src/lib/storage.ts` — localStorage 공용 유틸 + `aquaflow:storage-change` 이벤트
- `src/hooks/usePadoBridge.ts` — 브릿지 훅 (App.tsx에서 마운트)
- `public/pado-harness.html` — 임베딩 동작 검증용 하니스

### 7.2 메시지 프로토콜 (postMessage, targetOrigin: `'*'`)

| 방향 | type | payload | 설명 |
|---|---|---|---|
| 앱 → 부모 | `PADO_DATA_INIT_REQUEST` | 없음 | 마운트 시 초기 데이터 요청 |
| 부모 → 앱 | `PADO_DATA_INIT_RESPONSE` | `PadoPayload \| null` | 초기 데이터 응답 (없으면 null) |
| 앱 → 부모 | `PADO_DATA_SYNC` | `PadoPayload` | 데이터 변경 시 최신 스냅샷 전송 |

모든 메시지는 `appId: 'water_tracker'`를 포함합니다.

### 7.3 통합 동기화 페이로드 (`PadoPayload`)

```ts
interface PadoPayload {
  appId: 'water_tracker';
  updatedAt: string;                          // ISO 8601
  users: User[];
  settings: Record<string, UserSettings>;     // { [userId]: settings }
  logs: Record<string, HydrationLog[]>;       // { [userId]: logs }
  summary: {
    todayIntake: number;                      // 활성 사용자의 오늘 총 섭취량 (ml)
    target: number;                           // 일일 목표량 (ml)
    achievementRate: number;                  // 달성률 (%)
    todayLogCount: number;                    // 오늘 기록 횟수
  };
}
```

`summary`는 **활성 사용자**(현재 로그인 사용자) 기준으로 계산됩니다.
`todayIntake` = 오늘 로그의 `hydrationAmount` 합계, `target` =
`calculateTotalRecommended(weight, activityLevel)`, `achievementRate` = 최대 100%로 캡.

### 7.4 동기화 흐름

1. **앱 마운트 (임베딩)**: `isEmbedded()`가 참이면
   `window.parent.postMessage({ type: 'PADO_DATA_INIT_REQUEST', appId }, '*')` 발신
2. **INIT_RESPONSE 수신 시**:
   - `payload`에 데이터 있음 → `users`는 React 상태 + localStorage에, `settings`/`logs`는
     localStorage에 저장. `useLocalStorage`가 이벤트로 재조회하여 **화면 복원**.
     복원 직후 동일 데이터 에코 발신은 방지(JSON 비교 가드)
   - `payload`가 null/비어있고 **로컬에 기존 데이터 있음** → 최초 마이그레이션 목적으로
     `PADO_DATA_SYNC` 1회 발신
3. **데이터 변경 감지**: `useLocalStorage`/`writeLocalJson`/`removeLocalKey`가 발행하는
   `aquaflow:storage-change` 이벤트(및 다른 탭의 `storage` 이벤트)를 구독 → 250ms 디바운스 후
   `PADO_DATA_SYNC` 발신
   - 수분 기록 추가/삭제, 사용자 생성/삭제/전환, 목표 설정 수정 시 즉시 동기화
4. **언마운트 정리**: `message`/`storage`/커스텀 이벤트 리스너 제거, 디바운스 타이머 해제

### 7.5 구현 규칙

- **에코 방지**: `lastSentPayloadRef`에 마지막으로 보낸 페이로드의 JSON을 저장하고,
  동일하면 전송을 건너뜁니다. 원격 복원 중에는 `applyingRemoteRef`로 추가 차단
- **로그 규격**: 임베딩 시 `[PADO] PADO_DATA_INIT_REQUEST sent ...`,
  `[PADO] PADO_DATA_SYNC sent (...)` 등으로 콘솔에 기록 (검증용)
- **Standalone 규칙**: `isEmbedded()`가 false이면 리스너 등록·postMessage·로그 모두 미발생
- **수신 검증**: `event.data`의 `type`/`appId`만 확인 (origin 검증 없음 — targetOrigin `'*'` 규격)
- **테스트**: `npm run dev` 후 `/pado-harness.html`을 열어 INIT_REQUEST 수신 →
  응답 버튼으로 복원/마이그레이션 → 앱 조작으로 SYNC 발신을 확인할 수 있습니다.
  페이로드 구조 검증: `npx tsx scripts/verify-pado-payload.ts`

