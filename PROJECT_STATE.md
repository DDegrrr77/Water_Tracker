# PROJECT_STATE.md — 프로젝트 상태 및 로드맵 추적

> 본 문서는 프로젝트의 현재 상태, 데이터 구조, 알려진 이슈, 향후 작업 계획을
> 추적하기 위한 문서입니다. 코드 변경 시 함께 갱신하세요.
> 최종 갱신일: 2026-08-28

---

## 1. 현재 버전 및 빌드 상태

| 항목 | 값 |
|---|---|
| 패키지명 | `react-example` (package.json 기준, AI Studio 스캐폴딩 기본값) |
| 버전 | `0.0.0` (package.json 기준) — ※ UI 하단 표기는 `v1.0.0` |
| 런타임 | Node.js v24.19.0, React 19.0.1 |
| 앱 이름 | AquaFlow / 수분 섭취 트래커 |
| AI Studio 앱 URL | https://ai.studio/apps/143530bd-d5d7-4e3d-9193-ace782e3931f (README.md 참고) |

### 빌드 검증 (2026-08-28 실행)

| 명령 | 결과 | 비고 |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | ✅ **통과** | 문서 작성 시점에 타입 오류 1건 수정 완료 (아래 4.1 참고) |
| `npm run build` (`vite build`) | ✅ **통과** | 3562 모듈 변환, 약 12~15초 소요 |
| 번들 크기 | ⚠️ 경고 | `index-*.js` 786.74 kB (gzip 241.92 kB) > 500 kB 경고 발생 |

### 생성된 빌드 산출물 (dist/)

```
dist/index.html                  1.05 kB
dist/assets/index-*.css         44.23 kB  (gzip 8.15 kB)
dist/assets/index-*.js         786.74 kB  (gzip 241.92 kB)
```

---

## 2. 구현 완료 기능

### 2.1 사용자 관리 (UserSelection.tsx + App.tsx)
- [x] 신규 사용자 생성 **2단계 위저드** (이름 → 캐릭터 선택 → 체중/활동량/기상·취침)
- [x] 저장된 사용자 목록 그리드 표시 및 캐릭터 이미지 렌더링 (`renderCharacter`)
- [x] 사용자 선택 → 앱 진입 (`currentUser` 세션, 새로고침 시 유지 안 됨 — 메모리 전용)
- [x] 사용자 삭제 확인 모달 (관련 localStorage 키 정리 포함)
- [x] 앱 내 사용자 전환 (로그아웃 → 선택 화면 복귀)

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
- [x] JSON 백업 다운로드 / 복구 업로드 (성공·실패 alert)
- [x] 사용자 전환 / 계정 삭제(확인 모달)

### 2.5 공통/인프라
- [x] PWA 기반 (manifest.json + icon.svg + sw.js 등록, SW는 패스스루)
- [x] 토스트 알림 (수분 부족 경고, 3초 자동 숨김)
- [x] 모바일 우선 반응형 레이아웃 (스크롤 방향에 따른 헤더/네비 숨김)
- [x] 브라우저 Notification API 권한 관리

---

## 3. 데이터 구조 요약

### 3.1 localStorage 키 및 스키마

| 저장 키 | 타입 | 비고 |
|---|---|---|
| `app_users` | `User[]` | 전체 사용자 목록 (`{ id, name, character }`) |
| `hydration_settings_{userId}` | `UserSettings` | 사용자별 설정 (체중/활동량/시간/음료 설정/알림) |
| `hydration_logs_{userId}` | `HydrationLog[]` | 사용자별 전체 섭취 기록 |

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
  "notificationsEnabled": false
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

### 3.4 백업 파일 형식 (버전 1.0)

```json
{ "settings": { ... UserSettings }, "logs": [ ... HydrationLog ], "version": "1.0" }
```

---

## 4. 알려진 이슈 / 기술 부채

### 4.1 (수정 완료) 타입 오류 — UserSelection props 불일치
- **상태**: `npm run lint` 실패 → 문서 작성 중 **수정 완료** (2026-08-28)
- **원인**: `UserSelection.tsx`의 `Props.setUsers`가 `(users: User[]) => void`로
  선언되어 `useLocalStorage`의 함수형 업데이터 시그니처와 불일치
  (`confirmDeleteUser`의 `setUsers(prev => ...)`에서 TS2345 발생)
- **수정**: `React.Dispatch<React.SetStateAction<User[]>>`로 변경 → lint/빌드 통과 확인

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
- **useLocalStorage 한계**:
  - 브라우저 탭 간 실시간 동기화(`storage` 이벤트) 미구현
  - 함수형 업데이트 시 내부에서 `prev`가 아닌 **클로저의 `storedValue`** 를 사용해
    연속 업데이트 시 이전 상태 기준으로 계산될 수 있음
- **restoreData 검증 부족**: `settings`·`logs` 키 존재만 확인하고 스키마 심층 검증
  및 `version` 처리 없음 → 잘못된 형식 복원 시 런타임 오류 위험
- **스키마 버전 관리 부재**: localStorage 데이터에 마이그레이션/버전 필드가
  `settings`/`logs`에는 없음 (백업 파일에만 `version: "1.0"`)
- **사용자 세션 비영속화**: `currentUser`는 React 메모리 상태 — 새로고침 시
  사용자 선택 화면으로 돌아감 (의도된 동작일 수 있으나 개선 여지 있음)
- **backupData의 Blob URL**: `URL.createObjectURL` 후 `revokeObjectURL` 정상 처리됨
  (확인 완료 — 이슈 아님)

### 4.4 프로젝트 구성/코드 품질
- **미사용 의존성**: `@google/genai`, `dotenv`, `express`는 `src/`에서 사용되지 않는
  AI Studio 스캐폴딩 잔재 (package.json의 `clean` 스크립트는 존재하지 않는
  `server.js`를 삭제 대상으로 참조)
- **패키지명/버전 미정리**: `name: "react-example"`, `version: "0.0.0"`,
  UI 표기 `v1.0.0`과 불일치. 배포 전 정리 필요
- **테스트 미설정**: 단위/통합 테스트 프레임워크 없음
- **린트 도구 부재**: `npm run lint` = `tsc --noEmit` 뿐. ESLint/Prettier 없음
- **번들 크기**: recharts를 포함한 메인 번들 786.74 kB — lazy loading/코드 스플리팅 필요
- **코드 중복**: `SettingsTab`/`UserSelection`의 활동량 라디오 UI, 삭제 확인 모달,
  드링크 설정 폼이 유사 패턴으로 중복 구현
- **다크 모드 미지원**: `index.css`에 변수만 정의, 컴포넌트는 라이트 모드 고정
- **ErrorBoundary 없음**: 렌더링 중 예외 시 빈 화면 가능

---

## 5. 향후 작업 예정 (TODO / 로드맵)

### 다음 마일스톤 (P0 — 안정화)
- [ ] 통계 탭 **일/월 뷰** 실제 구현 (타임프레임 버튼을 데이터 필터에 연결)
- [ ] 하드코딩된 "+12% 지난주 대비" 및 "습관 분석" 문구를 실제 데이터 기반으로 교체
- [ ] `useLocalStorage` 개선: `storage` 이벤트 기반 탭 간 동기화, 함수형 업데이트에
      `prev` 콜백 사용, 스키마 버전·마이그레이션 지원
- [ ] `restoreData` 스키마 검증 강화 (백업 `version` 필드 검사, 필수 필드 타입 검증)
- [ ] HomeTab 이온음료 버튼의 dead condition 제거 (`drinkOptions`로 통합)
- [ ] 번들 최적화: recharts/차트 lazy import 또는 `manualChunks` 분리

### P1 — 기능 확장
- [ ] 새로고침 후에도 사용자 세션 유지 (`sessionStorage` 또는 `app_users` 기반 자동 선택)
- [ ] 수분 부족 알림 스케줄링 (기상~취침 중 주기적 체크, 매 기록 시에만 체크하는
      현재 로직 대체)
- [ ] 다크 모드 실제 지원 (컴포넌트 색상을 CSS 변수 기반으로 전환)
- [ ] 테스트 프레임워크 도입 (Vitest + React Testing Library, 권장량 계산 로직 우선)
- [ ] ESLint + Prettier 설정 및 기존 코드 정리
- [ ] 에러 경계(ErrorBoundary) 및 전역 오류 처리 도입
- [ ] PWA 강화: 오프라인 캐싱 전략, install prompt, 아이콘 PNG 세트 추가

### P2 — 후보/아이디어
- [ ] 음료 종류·사용자 설정 내보내기/가져오기의 세밀한 병합 정책
- [ ] 주간/월간 리포트 공유(이미지/텍스트 내보내기)
- [ ] 중복 코드(활동량 라디오, 삭제 모달, 드링크 설정 폼) 공통 컴포넌트 추출
- [ ] package.json 메타데이터 정리 (실제 앱명/버전 반영, 미사용 의존성 제거)

---

## 부록 A. 문서 유지 관리 규칙

1. **기능 추가/변경 시**: PROJECT_STATE.md의 "구현 완료 기능"과 "알려진 이슈"를 함께 갱신
2. **타입/스토리지 키 변경 시**: AI_INSTRUCTIONS.md의 4장(데이터 스키마)·5장(영속화) 갱신
3. **의존성 변경 시**: AI_INSTRUCTIONS.md 2장(기술 스택)의 버전 표 갱신
4. **마일스톤 완료 시**: TODO 항목 체크 후 해당 항목을 "구현 완료 기능"으로 이동
5. 빌드/린트 상태는 `npm run build`·`npm run lint`로 주기적으로 재검증
