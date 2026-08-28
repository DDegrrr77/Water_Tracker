/**
 * PADO 페이로드 구조 검증 스크립트 (npm run lint/build와 별개로 실행)
 * - v0.2.0 단일 사용자 스키마의 buildPadoPayload / restoreFromPadoPayload를 검증
 *
 * 실행: npx tsx scripts/verify-pado-payload.ts
 */
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
};
(globalThis as any).window = {
  localStorage: mockStorage,
  parent: undefined,
  dispatchEvent: () => {},
};

async function main() {
  const {
    buildPadoPayload,
    restoreFromPadoPayload,
    isEmbedded,
    PADO_APP_ID,
  } = await import('../src/lib/pado');
  const { defaultSettings } = await import('../src/store/HydrationContext');

  const todayLog = {
    id: 'l1',
    timestamp: new Date().getTime(),
    drinkType: 'water' as const,
    rawAmount: 200,
    hydrationAmount: 200,
  };
  const logs = [todayLog];
  const payload = buildPadoPayload(defaultSettings, logs);

  const failures: string[] = [];
  if (payload.appId !== PADO_APP_ID) failures.push('appId');
  if (typeof payload.updatedAt !== 'string' || Number.isNaN(Date.parse(payload.updatedAt))) {
    failures.push('updatedAt(ISO 8601)');
  }
  // settings (단순화 스키마)
  if (typeof payload.settings?.target !== 'number' || payload.settings.target <= 0) {
    failures.push('settings.target');
  }
  if (typeof payload.settings?.cupSize !== 'number' || payload.settings.cupSize <= 0) {
    failures.push('settings.cupSize');
  }
  if (typeof payload.settings?.reminderInterval !== 'number') {
    failures.push('settings.reminderInterval');
  }
  // logs (단일 배열 + 항목 스키마)
  if (!Array.isArray(payload.logs)) failures.push('logs');
  if (payload.logs.length !== 1) failures.push('logs.length');
  if (payload.logs[0] && typeof payload.logs[0].id !== 'string') failures.push('logs[].id');
  if (payload.logs[0] && Number.isNaN(Date.parse(payload.logs[0].timestamp))) {
    failures.push('logs[].timestamp(ISO 8601)');
  }
  if (payload.logs[0] && typeof payload.logs[0].amount !== 'number') {
    failures.push('logs[].amount');
  }
  if (payload.logs[0] && typeof payload.logs[0].type !== 'string') {
    failures.push('logs[].type');
  }
  // summary
  const s = payload.summary;
  if (typeof s.todayIntake !== 'number') failures.push('summary.todayIntake');
  if (typeof s.target !== 'number') failures.push('summary.target');
  if (typeof s.achievementRate !== 'number') failures.push('summary.achievementRate');
  if (typeof s.todayLogCount !== 'number') failures.push('summary.todayLogCount');

  console.log('=== PADO Payload (v0.2.0 단일 사용자 스키마) ===');
  console.log(JSON.stringify(payload, null, 2));

  console.log('=== restoreFromPadoPayload 검증 (원복 라운드트립) ===');
  const restored = restoreFromPadoPayload(payload, defaultSettings);
  console.log(JSON.stringify({ settings: restored.settings, logs: restored.logs }, null, 2));
  if (restored.logs.length !== 1) failures.push('restored.logs.length');
  if (restored.settings.reminderInterval !== defaultSettings.reminderInterval) {
    failures.push('restored.settings.reminderInterval');
  }

  console.log('=== Standalone 판별 (window.parent 없음 → isEmbedded=false 기대) ===');
  console.log('isEmbedded =', isEmbedded());

  if (failures.length === 0) {
    console.log('\n✅ PAYLOAD STRUCTURE OK');
    process.exit(0);
  } else {
    console.log(`\n❌ FAILURES: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
