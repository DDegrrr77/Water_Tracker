/**
 * PADO 페이로드 구조 검증 스크립트 (npm run lint/build와 별개로 실행)
 * - localStorage를 스텁(mock)하여 buildPadoPayload의 출력이 표준 규격과 일치하는지 확인
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
  const { buildPadoPayload, isEmbedded, PADO_APP_ID } = await import('../src/lib/pado');
  const { defaultSettings } = await import('../src/store/HydrationContext');

  const users = [{ id: 'u1', name: '테스트', character: 'x' }];
  mockStorage.setItem('app_users', JSON.stringify(users));
  mockStorage.setItem('hydration_settings_u1', JSON.stringify(defaultSettings));
  const today = new Date();
  const todayLog = {
    id: 'l1',
    timestamp: today.getTime(),
    drinkType: 'water',
    rawAmount: 200,
    hydrationAmount: 200,
  };
  mockStorage.setItem('hydration_logs_u1', JSON.stringify([todayLog]));

  const payload = buildPadoPayload(users, 'u1');

  const failures: string[] = [];
  if (payload.appId !== PADO_APP_ID) failures.push('appId');
  if (typeof payload.updatedAt !== 'string' || isNaN(Date.parse(payload.updatedAt))) failures.push('updatedAt(ISO 8601)');
  if (!Array.isArray(payload.users)) failures.push('users');
  if (!payload.settings || typeof payload.settings !== 'object') failures.push('settings');
  if (!payload.logs || typeof payload.logs !== 'object') failures.push('logs');
  const s = payload.summary;
  if (typeof s.todayIntake !== 'number') failures.push('summary.todayIntake');
  if (typeof s.target !== 'number') failures.push('summary.target');
  if (typeof s.achievementRate !== 'number') failures.push('summary.achievementRate');
  if (typeof s.todayLogCount !== 'number') failures.push('summary.todayLogCount');

  console.log('=== PADO Payload ===');
  console.log(JSON.stringify(payload, null, 2));
  console.log('=== Standalone 여부 (window.parent 없음 → isEmbedded=false 기대) ===');
  console.log('isEmbedded =', isEmbedded());
  console.log(failures.length === 0 ? '\n✅ PAYLOAD STRUCTURE OK' : `\n❌ FAILURES: ${failures.join(', ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
