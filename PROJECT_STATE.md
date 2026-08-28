# PROJECT_STATE.md — 프로젝트 상태 및 로드맵 추적

> 본 문서는 프로젝트의 현재 상태, 데이터 구조, 알려진 이슈, 향후 작업 계획을
> 추적하기 위한 문서입니다. 코드 변경 시 함께 갱신하세요.
> 최종 갱신일: 2026-08-28

---

## 1. 현재 버전 및 빌드 상태

| 항목 | 값 |
|---|---|
| 패키지명 | `react-example` (package.json 기준, AI Studio 스캐폴딩 기본값) |
| 버전 | `0.2.0` (package.json 기준) — UI 하단 버전 표기 삭제(사용자 선택 화면 제거) |
| 런타임 | Node.js v24.19.0, React 19.0.1 |
| 앱 이름 | AquaFlow / 수분 섭취 트래커 |
| AI Studio 앱 URL | https://ai.studio/apps/143530bd-d5d7-4e3d-9193-ace782e3931f (README.md 참고) |

### 빌드 검증 (2026-08-28 실행, v0.2.0)

| 명령 | 결과 | 비고 |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | ✅ **통과** | 타입 오류 0건 |
| `npm run build` (`vite build`) | ✅ **통과** | 3,564 모듈 변환, 약 10~14초 소요 |
| 번들 크기 | ⚠️ 경고 | `index-*.js` 771.35 kB (gzip 238.75 kB) > 500 kB 경고 발생 (기존 이슈) |
| PADO 페이로드 검증 | ✅ 통과 | `scripts/verify-pado-payload.ts` — 단일 사용자 스키마 일치 |
| 마이그레이션 검증 | ✅ 통과 | `migrateLegacyData` 시나리오 3종 + 앱 렌더 스모크 확인 |

### 생성된 빌드 산출물 (dist/)

```
dist/index.html                  1.05 kB
dist/assets/index-*.css         34.97 kB  (gzip 6.66 kB)
dist/assets/index-*.js         771.35 kB  (gzip 238.75 kB)
```

---

## 2. 구현 완료 기능

### 2.1 단일 사용자 데이터 모델 (v0.2.0 — 멀티 유저 제거)
- [x] **UserSelection(사용자 선택) 화면 제거** — `src/components/UserSelection.tsx` 삭제
- [x] 앱 기동 시 사용자 선택 절차 없이 **즉시 메인 대시보드(오늘의 수분 기록)**로 진입
- [x] `currentUser`/`users`/`setCurrentUser` 등 멀티 유저 상태 전면 제거
- [x] 네비게이션·헤더·설정 화면의 '사용자 전환', '사용자 추가/삭제', '계정 관리' UI 제거
- [x] 스토리지 키 단일화: `hydration_settings`, `hydration_logs` (단일 사용자)
- [x] **레거시 자동 마이그레이션**: 앱 마운트 시 `migrateLegacyData()`가
  `app_users`/`hydration_logs_*`(기본·활성 사용자)를 신규 키로 1회 복사 (비파괴)

### 2.2 수분 기록 (HomeTab.tsx + HydrationContext.tsx)
- [x] 음료 5종(물/커피/차/탄산/이온음료) 퀵 추가 버튼
- [x] 수분 반영률 반영한 `hydrationAmount` 계산 및 저장
- [x] 당일 마지막 기록 취소 (undo)
- [x] 원형 게이지 + 파도(웨이브) 애니메이션으로 진행률 표시
- [x] 현재 시점 권장량(선형 보간) 표시, 1분 주기 갱신
- [x] 기록 시 ripple 효과 + 햅틱 진동(`navigator.vibrate`)

### 2.3 통계 (StatsTab.tsx)
- [x] 최근 7일 평균 섭취량 / 목표 달성률 카드
- [x] 주간 막대 차트 (recharts, 날짜별 달성 여부 색상 구분, 커스텀 툴팁)
- [x] 월간 캘린더 (목표 달성일/오늘/부분 섭취/빈 날 색상 구분 + 범례)
- [ ] ⚠️ **일/월 뷰**: 타임프레임 버튼은 존재하나 실제 데이터는 주간(7일) 고정
  (알려진 이슈 참고)

### 2.4 설정 (SettingsTab.tsx)
- [x] 몸무게 입력 → 일일 권장량 실시간 반영
- [x] 활동량 3단계(가벼움/보통/활동적) 라디오 선택
- [x] 기상/취침 시간 입력 (24시간 형식)
- [x] 음료별 기본량(ml) 및 수분 반영률(%) 편집
- [x] 수분 부족 브라우저 알림 토글 (권한 요청 포함)
- [x] 알림 간격(분) 설정 추가 (PADO 페이로드 `settings.reminderInterval` 연동)
- [x] JSON 백업 다운로드 / 복구 업로드 (성공·실패 alert, 기본값 병합 복원)
- [x] ~~사용자 전환 / 계정 삭제(확인 모달)~~ → **제거** (v0.2.0 단일 사용자)

### 2.5 공통/인프라
- [x] PWA 기반 (manifest.json + icon.svg + sw.js 등록, SW는 패스스루)
- [x] 토스트 알림 (수분 부족 경고, 3초 자동 숨김)
- [x] 모바일 우선 반응형 레이아웃 (스크롤 방향에 따른 헤더/네비 숨김)
- [x] 브라우저 Notification API 권한 관리

### 2.6 PADO(파도) 플랫폼 양방향 데이터 브릿지 (단일 사용자 스키마)
- [x] `usePadoBridge` 훅 구현 (appId: `water_tracker`, 임베딩 감지 `isEmbedded()`)
- [x] 마운트 시 `PADO_DATA_INIT_REQUEST` 발신 → `PADO_DATA_INIT_RESPONSE` 수신 처리
- [x] **단일 사용자 페이로드 스키마로 개편** (v0.2.0):
  - `users`/사용자별 `{userId}` 분기 제거, `settings{target,cupSize,reminderInterval}` + `logs[]`
  - `PADO_DATA_INIT_RESPONSE` 수신 시 `restoreFromPadoPayload`로 **단일 settings/logs 즉시 복원**
- [x] PADO 데이터 없음 + 로컬 데이터 존재 시 최초 마이그레이션(`PADO_DATA_SYNC`) 1회
- [x] 데이터 변경 감지(기록 추가/삭제, 설정 수정) → **250ms 디바운스** 자동 SYNC
- [x] summary(오늘 섭취량/목표/달성률/기록 수) 계산 — PADO 에이전트(Hermes) 분석용
- [x] 에코 방지(JSON 비교 가드), 언마운트 시 리스너/타이머 정리
- [x] Standalone 모드 무영향 보장 (리스너·postMessage·로그 미발생)
- [x] 임베딩 검증 하니스 (`public/pado-harness.html`), 페이로드 구조 검증 스크립트
  (`scripts/verify-pado-payload.ts` — v0.2.0 스키마 검증)
- [x] `useLocalStorage` 개선: `aquaflow:storage-change` 이벤트 발행/구독, 탭 간 동기화,
      함수형 업데이트 최신값 기준 계산

### 2.7 화면 비율 및 레이아웃 최적화 (iframe / 데스크톱 대응)
- [x] 최상위 레이아웃을 반응형 앱 프레임 구조로 유지 (v0.2.0부터 **단일 프레임**):
  - 앱 프레임: `max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-900 shadow-lg border-x border-gray-100 dark:border-zinc-800`
  - 외부 배경: `min-h-screen bg-slate-50 dark:bg-zinc-950` — 넓은 화면/iframe의 빈 공간을 중립 색으로 채움
- [x] 모바일 셸(`h-[100dvh] flex flex-col`) 유지 — iframe 높이에 맞춰 내부 스크롤·하단 네비게이션
  잘림 방지 (헤더/네비 absolute + main `flex-1 overflow-y-auto` 구조 유지)
- [x] ~~UserSelection 화면 셸~~ → **사용자 선택 화면 제거** (v0.2.0)
- [x] UI 하단 버전 표기 제거 (사용자 선택 화면 삭제로 불필요)

---

## 3. 데이터 구조 요약

### 3.1 localStorage 키 및 스키마 (v0.2.0 단일 사용자)

| 저장 키 | 타입 | 비고 |
|---|---|---|
| `hydration_settings` | `UserSettings` | 단일 사용자 설정 (체중/활동량/시간/음료 설정/알림/알림 간격) |
| `hydration_logs` | `HydrationLog[]` | 단일 사용자 전체 섭취 기록 |
| ~~`app_users`~~ / ~~`hydration_settings_{userId}`~~ / ~~`hydration_logs_{userId}`~~ | — | **레거시 (v0.1.x)** — 앱 마운트 시 `migrateLegacyData()`가 1회 복사 (비파괴, 유지) |

### 3.2 `UserSettings` 구조 (예시)

```json
{
  "weight": 60,
  "activityLevel": "moderate",
  "wakeUpTime": "07:00",
  "bedTime": "23:00",
  "drinkSettings": {
    "water":        { "amount": 200, "hydrationRate": 100 },
    "coffee":       { "amount": 250, "hydrationRate": 80 },
    "tea":          { "amount": 250, "hydrationRate": 100 },
    "soda":         { "amount": 250, "hydrationRate": 50 },
    "sports_drink": { "amount": 300, "hydrationRate": 100 }
  },
  "notificationsEnabled": false,
  "reminderInterval": 60
}
```

### 3.3 `HydrationLog` 구조 (예시)

```json
{
  "id": "a1b2c3d",
  "timestamp": 1735350000000,
  "drinkType": "coffee",
  "rawAmount": 250,
  "hydrationAmount": 200
}
```

### 3.4 백업 파일 형식 (버전 2.0)

```json
{ "settings": { ... UserSettings }, "logs": [ ... HydrationLog ], "version": "2.0" }
```

### 3.5 PADO 통합 동기화 페이로드 (appId: `water_tracker`, v0.2.0 단일 사용자)

```json
{
  "appId": "water_tracker",
  "updatedAt": "2026-08-28T00:00:00.000Z",
  "settings": { "target": 2100, "cupSize": 200, "reminderInterval": 60 },
  "logs": [
    { "id": "a1b2c3d", "timestamp": "2026-08-28T00:00:00.000Z", "amount": 200, "type": "water" }
  ],
  "summary": {
    "todayIntake": 600,
    "target": 2100,
    "achievementRate": 29,
    "todayLogCount": 3
  }
}
```

- `summary`는 **단일 사용자** 기준 오늘 데이터 (상세는 AI_INSTRUCTIONS.md 7장 참고)
- 동기화 대상 localStorage 키: `hydration_settings` + `hydration_logs`
  (레거시 키 존재 시 `migrateLegacyData()` 후 신규 키 기준)

---

## 4. 알려진 이슈 / 기술 부채

### 4.1 (v0.2.0 반영) 멀티 유저 → 단일 사용자 전환
- **상태**: **완료** (2026-08-28)
- **변경**: `UserSelection.tsx` 삭제, `currentUser`/`users`/`app_users` 제거,
  스토리지 키 `hydration_settings`/`hydration_logs` 단일화, 레거시 키 자동 마이그레이션
- **잔여**: 레거시 키(`app_users`, `hydration_*_{userId}`)는 비파괴로 localStorage에
  유지됨 — 추후 일괄 정리(삭제) 정책 결정 필요

### 4.2 기능·동작 관련
- **통계 탭 타임프레임 미구현**: `day`/`week`/`month` 버튼이 UI 상태만 변경하고
  실제 차트/통계는 항상 최근 7일 기준. `day`/`month` 데이터 뷰가 없음
- **하드코딩 표시값**: 평균 섭취량 카드의 "+12% 지난주 대비" 증가율과
  "습관 분석" 카드 문구가 실제 데이터가 아닌 고정 텍스트
- **주간 차트 색상 이상**: `isTargetMet`일 때 `index === 2`(3번째 바)만
  `#71d5fe`로 표시 — 의도된 디자인인지 확인 필요
- **HomeTab 이온음료 버튼 조건**: `!drinkOptions.find(o => o.type === 'sports_drink')`
  조건이 항상 참(dead condition) — `drinkOptions`에 sports_drink가 없어서 항상 렌더됨.
  `drinkOptions`에 통합하는 리팩토링 권장
- **서비스워커 미완성**: `sw.js`가 install/activate/fetch 패스스루만 구현 —
  오프라인 캐싱·앱쉘 불가 (PWA 설치 시 오프라인 동작 없음)

### 4.3 상태/데이터 관리
- ~~**useLocalStorage 한계**~~ → **개선 완료 (PADO 브릿지 구현 시)**: 탭 간 동기화,
  함수형 업데이트 최신값 기준 (세부는 v0.1.0 레포트 참고)
- **restoreData 검증 부족**: `settings`·`logs` 키 존재만 확인하고 스키마 심층 검증
  및 `version` 처리 없음 → 잘못된 형식 복원 시 런타임 오류 위험
- **PADO 복원 검증 부족**: `PADO_DATA_INIT_RESPONSE` 수신 시 `settings`/`logs` 존재만
  확인하고 개별 항목 스키마 검증은 하지 않음 (향후 타입 가드 도입 필요)
- **스키마 버전 관리 부재**: localStorage 데이터에 마이그레이션/버전 필드가
  `settings`/`logs`에는 없음 (백업 파일에만 `version: "2.0"`)
- **PADO settings 복원 근사**: 간소화 페이로드(`target`)로 내부 `weight`를 역산하므로
  활동량이 moderate가 아닐 경우 목표량이 약간 다를 수 있음 (의도된 단순화)
- **backupData의 Blob URL**: `URL.createObjectURL` 후 `revokeObjectURL` 정상 처리됨
  (확인 완료 — 이슈 아님)

### 4.4 프로젝트 구성/코드 품질
- **미사용 의존성**: `@google/genai`, `dotenv`, `express`는 `src/`에서 사용되지 않는
  AI Studio 스캐폴딩 잔재 (package.json의 `clean` 스크립트는 존재하지 않는
  `server.js`를 삭제 대상으로 참조)
- **패키지명 미정리**: `name: "react-example"` (AI Studio 스캐폴딩 기본값) — 버전은
  `0.2.0`으로 갱신 완료. 앱명 반영(`aquaflow` 등)은 배포 전 정리 필요
- **테스트 미설정**: 단위/통합 테스트 프레임워크 없음
- **린트 도구 부재**: `npm run lint` = `tsc --noEmit` 뿐. ESLint/Prettier 없음
- **번들 크기**: recharts를 포함한 메인 번들 771.35 kB — lazy loading/코드 스플리팅 필요
- **코드 중복**: 음료 설정 폼/라디오 UI가 탭 내부에서 유사 패턴으로 반복
- **다크 모드 미지원**: `index.css`에 변수만 정의, 컴포넌트는 라이트 모드 고정
- **ErrorBoundary 없음**: 렌더링 중 예외 시 빈 화면 가능

---

## 5. 향후 작업 예정 (TODO / 로드맵)

### 다음 마일스톤 (P0 — 안정화)
- [ ] 통계 탭 **일/월 뷰** 실제 구현 (타임프레임 버튼을 데이터 필터에 연결)
- [ ] 하드코딩된 "+12% 지난주 대비" 및 "습관 분석" 문구를 실제 데이터 기반으로 교체
- [x] ~~`useLocalStorage` 개선: 탭 간 동기화, 함수형 업데이트 최신값 기준~~ →
      **완료** (PADO 브릿지 구현 시)
- [x] ~~멀티 유저 제거·단일 사용자 스토리지 키 단순화~~ →
      **완료** (v0.2.0: `migrateLegacyData`로 레거시 키 1회 복사)
- [ ] `useLocalStorage` 스키마 버전·마이그레이션 지원 (신규 필드 추가 시 자동 병합)
- [ ] `restoreData`/PADO 복원 시 스키마 검증 강화 (백업 `version` 필드 검사,
      페이로드 타입 가드)
- [ ] HomeTab 이온음료 버튼의 dead condition 제거 (`drinkOptions`로 통합)
- [ ] 번들 최적화: recharts/차트 lazy import 또는 `manualChunks` 분리

### P1 — 기능 확장
- [ ] 레거시 키(`app_users`, `hydration_*_{userId}`) 일괄 정리 정책 결정 (삭제 or 유지)
- [ ] 수분 부족 알림 스케줄링 (기상~취침 중 주기적 체크 + `reminderInterval` 활용,
      매 기록 시에만 체크하는 현재 로직 대체)
- [ ] 다크 모드 실제 지원 (컴포넌트 색상을 CSS 변수 기반으로 전환)
- [ ] 테스트 프레임워크 도입 (Vitest + React Testing Library, 권장량 계산/PADO 페이로드/마이그레이션 우선)
- [ ] ESLint + Prettier 설정 및 기존 코드 정리
- [ ] 에러 경계(ErrorBoundary) 및 전역 오류 처리 도입
- [ ] PWA 강화: 오프라인 캐싱 전략, install prompt, 아이콘 PNG 세트 추가
- [ ] PADO 연동 고도화: 브릿지 재시도/재연결 처리, 요약(summary)에 주간 통계 추가,
      수신 페이로드 타입 가드(스키마 검증) 도입

### P2 — 후보/아이디어
- [ ] 음료 종류·사용자 설정 내보내기/가져오기의 세밀한 병합 정책
- [ ] 주간/월간 리포트 공유(이미지/텍스트 내보내기)
- [ ] 중복 코드(활동량 라디오, 드링크 설정 폼) 공통 컴포넌트 추출
- [ ] package.json 메타데이터 정리 (실제 앱명/버전 반영, 미사용 의존성 제거)

---

## 부록 A. 문서 유지 관리 규칙

1. **기능 추가/변경 시**: PROJECT_STATE.md의 "구현 완료 기능"과 "알려진 이슈"를 함께 갱신
2. **타입/스토리지 키 변경 시**: AI_INSTRUCTIONS.md의 4장(데이터 스키마)·5장(영속화) 갱신
3. **의존성 변경 시**: AI_INSTRUCTIONS.md 2장(기술 스택)의 버전 표 갱신
4. **마일스톤 완료 시**: TODO 항목 체크 후 해당 항목을 "구현 완료 기능"으로 이동
5. 빌드/린트 상태는 `npm run build`·`npm run lint`로 주기적으로 재검증
