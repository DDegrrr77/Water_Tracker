import React, { useState, useRef } from 'react';
import { HydrationProvider, useHydration } from './store/HydrationContext';
import { Tab } from './types';
import { Settings } from 'lucide-react';
import { cn } from './lib/utils';
import { HomeTab } from './components/HomeTab';
import { StatsTab } from './components/StatsTab';
import { SettingsTab } from './components/SettingsTab';
import { Toast } from './components/Toast';
import { usePadoBridge } from './hooks/usePadoBridge';

function AppContent() {
  const { settings, setSettings, logs, setLogs } = useHydration();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'none'>('none');
  const lastScrollY = useRef(0);

  // PADO(파도) 플랫폼 임베딩 시 단일 사용자 settings/logs 양방향 동기화 브릿지
  // - 단독 브라우저(Standalone)에서는 아무 작업도 하지 않음
  // - 수분 기록 추가/삭제, 설정 변경 시 PADO_DATA_SYNC 자동 발신 (250ms 디바운스)
  usePadoBridge({ settings, setSettings, logs, setLogs });

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    if (currentScrollY <= 20) {
      setScrollDirection('none');
      lastScrollY.current = currentScrollY;
      return;
    }

    if (Math.abs(currentScrollY - lastScrollY.current) < 10) {
      return;
    }
    
    if (currentScrollY > lastScrollY.current) {
      setScrollDirection('down');
    } else {
      setScrollDirection('up');
    }
    
    lastScrollY.current = currentScrollY;
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-zinc-900 text-slate-900 relative z-0 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#bde9ff]/20 via-transparent to-transparent blur-3xl pointer-events-none -z-10"></div>
      
      <header className={cn(
        "absolute top-0 w-full h-16 bg-white/40 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-6 z-40 transition-transform duration-300",
        scrollDirection === 'down' ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="flex items-center gap-2 text-[#0058bf]">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6 0 1.2-.2 1.7-.6C4.8 4.6 5.9 4 7 4s2.2.6 3.3 1.4C11.4 6 12.6 6.5 14 6.5s2.6-.5 3.7-1.1C18.8 4.6 19.9 4 21 4v2c-1.1 0-2.2.6-3.3 1.4C16.6 8 15.4 8.5 14 8.5s-2.6-.5-3.7-1.1C9.2 6.6 8.1 6 7 6s-2.2.6-3.3 1.4C2.6 8 1.4 8.5 0 8.5V6.5h2z"/><path d="M2 12c.6 0 1.2-.2 1.7-.6C4.8 10.6 5.9 10 7 10s2.2.6 3.3 1.4c1.1.6 2.3 1.1 3.7 1.1s2.6-.5 3.7-1.1c1.1-.8 2.2-1.4 3.3-1.4v2c-1.1 0-2.2.6-3.3 1.4-1.1.6-2.3 1.1-3.7 1.1s-2.6-.5-3.7-1.1c-1.1-.8-2.2-1.4-3.3-1.4-1.1 0-2.2.6-3.3 1.4-1.1.6-2.3 1.1-3.7 1.1v-2h2z"/><path d="M2 18c.6 0 1.2-.2 1.7-.6.1-.1.2-.1.3-.2C5.1 16.5 6 16 7 16s1.9.5 3 1.2c.1.1.2.1.3.2 1.1.8 2.3 1.1 3.7 1.1s2.6-.5 3.7-1.1c.1-.1.2-.1.3-.2 1.1-.7 2-1.2 3-1.2v2c-1.1 0-2.2.6-3.3 1.4-1.1.6-2.3 1.1-3.7 1.1s-2.6-.5-3.7-1.1c-1.1-.8-2.2-1.4-3.3-1.4-1.1 0-2.2.6-3.3 1.4-1.1.6-2.3 1.1-3.7 1.1v-2h2z"/></svg>
          <span className="font-extrabold tracking-tight text-xl">AquaFlow</span>
        </div>
      </header>

      <main onScroll={handleScroll} className="flex-1 overflow-y-auto pt-16 pb-[88px] no-scrollbar">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      <nav className={cn(
        "absolute bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-white/40 pb-safe shadow-[0_-8px_32px_0_rgba(0,119,255,0.08)] z-50 transition-transform duration-300",
        scrollDirection === 'up' ? "translate-y-full" : "translate-y-0"
      )}>
        <div className="flex justify-around items-center h-20 px-4">
          <NavItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
            label="홈"
            isActive={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <NavItem
            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'stats' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>}
            label="통계"
            isActive={activeTab === 'stats'}
            onClick={() => setActiveTab('stats')}
          />
          <NavItem
            icon={<Settings className="w-6 h-6" />}
            label="설정"
            isActive={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </div>
      </nav>

      <Toast />
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-200 w-16 group",
        isActive ? "text-[#005c76]" : "text-slate-500 hover:text-slate-700"
      )}
    >
      <div className={cn(
        "w-16 h-8 rounded-full mb-1 flex items-center justify-center transition-all duration-200",
        isActive ? "bg-[#71d5fe]" : "group-hover:bg-slate-100/50"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[11px] tracking-wide font-bold transition-all",
        isActive ? "text-slate-900" : "text-slate-500"
      )}>{label}</span>
    </button>
  );
}

export default function App() {
  // v0.2.0: 사용자 선택 화면 없이 곧바로 메인 대시보드(오늘의 수분 기록 탭)로 진입
  return (
    <HydrationProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
        <div className="max-w-md mx-auto min-h-screen bg-white dark:bg-zinc-900 shadow-lg border-x border-gray-100 dark:border-zinc-800">
          <AppContent />
        </div>
      </div>
    </HydrationProvider>
  );
}
