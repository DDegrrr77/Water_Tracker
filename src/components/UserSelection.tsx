import React, { useState } from 'react';
import { User, UserSettings } from '../types';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { defaultSettings } from '../store/HydrationContext';

const CHARACTER_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCwOKcrSA7ecDZkfvmg6QQxY57eb0GYbeEMJAeQipCgKCBTYlKxy5NuRB_f1p79DYe1pEb6Uugcryxlh-zIKysPKW5-o2Q7DkOHWY6HqCMrzhZyC1AmGvJ8lrosSo2Yjqc2yjMHth4n_sEflJeXfbwns9kdGHRMxMhD_HMjG7Ic4y3uLsak77GojzMFa7eYwKFL5BNkGd_yWrdmOltr_0EexJZWXkkxlBgRI9kyvgr1dJAKxK0QBAZn11drHDH7ZzNcA_iUP09vxa5X",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA8MpkTL0wNmjNDTU1-Iqz-dFENe2h-49Ede_-eWub2WsewC97ioaaJPohymHCiTN0G-RUk8VIpGK5AZBFeYnFPywiEHMWJ_mRZd9tYR86ENhPJrXxG6qj2L8b0OnO31IA4Sg7qUjIoC-uc8L8ooy7Wa_a5LWidTZB56BG1RMcxOS7oUCBZiAYUKFhbZgHOH7uUh_kC6G20mgCkawb_2qxNxGoSwJlX1UPc_WcNAbQN6c_fzimQS1o3cOgxe7NhtzQjbkjMil5wWDn0",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBdw3z-xdGZRZOpMB4NZ1akrcAG_o56q4m8s7ApYdosBXDI6WoXnr43j9RNB6e66iT0HSDXUvT8e04tPf548nHRZlB3Gdz9uxtuv7CTK9UIwX7NPmowM2hfpjEI6r34VfBt6_YdOY5qwMThslTosMzTSGAF27f06fO4ix2Ab80odFj1wDuXQqzi0VX9wsiujMB_XrsGD-O0m6lTFs3xvwFeKNowWOFeHuXu03tvTInv8chiZZY5M1o7TUTMJwOjTwN5ImZ5OHpBhrSp",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB2b6RzGBLCFEYDpwDGwLpPrnz-N5ZkSOh22jUv8R4oybN1OYurmuxehKizMzS0dfPzD74MHcbslnkcPHWMpI4kplwgZuxFK4-1XJBrP7sjF6k9xRAJjCvQojTbjI6SZQO9D0pQKs80seW2I2vfFCctHMLU4SCwBQ_bRpvGHebR8VRjnXGpGJCw-EbKdq-x6aOop2q2pUy7FsTxzS3CUKiciS_R3FKagn4HlJuSYC7yTWSEAtR-XEyuYjqG93CQQOsaaEKJVUeotFeD"
];

export const renderCharacter = (char: string, className?: string) => {
  if (char.startsWith('http')) {
    return <img src={char} alt="character" className={className || "w-full h-full object-cover rounded-2xl"} />;
  }
  return <span>{char}</span>;
};

interface Props {
  users: User[];
  setUsers: (users: User[]) => void;
  onSelectUser: (user: User) => void;
}

export function UserSelection({ users, setUsers, onSelectUser }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [newName, setNewName] = useState('');
  const [selectedChar, setSelectedChar] = useState(CHARACTER_IMAGES[0]);
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<'light' | 'moderate' | 'high'>('moderate');
  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const [bedTime, setBedTime] = useState('23:00');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      setStep(2);
    }
  };

  const handleFinishAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !weight) return;
    
    const newUser: User = {
      id: newName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      name: newName.trim(),
      character: selectedChar,
    };

    const initialSettings: UserSettings = {
      ...defaultSettings,
      weight: Number(weight) || 60,
      activityLevel: activityLevel,
      wakeUpTime: wakeUpTime,
      bedTime: bedTime,
    };
    
    localStorage.setItem(`hydration_settings_${newUser.id}`, JSON.stringify(initialSettings));
    
    setUsers([...users, newUser]);
    onSelectUser(newUser);
    setIsAdding(false);
    setStep(1);
    setNewName('');
    setWeight('');
    setActivityLevel('moderate');
    setWakeUpTime('07:00');
    setBedTime('23:00');
  };

  const promptDeleteUser = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      localStorage.removeItem(`hydration_settings_${userToDelete.id}`);
      localStorage.removeItem(`hydration_logs_${userToDelete.id}`);
      setUserToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-gradient-to-br from-[#f7fafe] to-[#d8e2ff] text-slate-900 shadow-xl relative z-0">
      <div className="absolute bottom-0 left-0 w-full h-[50dvh] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDMyMCI+PHBhdGggZmlsbD0iIzAwNThiZiIgZmlsbC1vcGFjaXR5PSIwLjAzIiBkPSJNMiwxNjBMODQsMTc2Qzk2LDE5MiwxOTIsMjI0LDI4OCwyMTMuM0MzODQsMjAzLDQ4MCwxNDksNTc2LDE0NEM2NzIsMTM5LDc2OCwxODEsODY0LDE5MkM5NjAsMjAzLDEwNTYsMTgxLDExNTIsMTQ5LjNDMTI0OCwxMTcsMTM0NCw3NSwxMzkyLDUzLjNMMTQ0MCwzMkwxNDQwLDMyMEwxMzkyLDMyMEMxMzQ0LDMyMCwxMjQ4LDMyMCwxMTUyLDMyMEMxMDU2LDMyMCw5NjAsMzIwLDg2NCwzMjBDNzY4LDMyMCw2NzIsMzIwLDU3NiwzMjBDNDgwLDMyMCwzODQsMzIwLDI4OCwzMjBDMTkyLDMyMCw5NiwzMjAsNDgsMzIwTDAsMzIwWiI+PC9wYXRoPjwvc3ZnPg==')] bg-bottom bg-no-repeat bg-cover -z-10 pointer-events-none"></div>

      <header className="flex flex-col items-center mt-12 mb-8 relative z-10 px-6 text-center">
        {(!isAdding && users.length > 0) || step === 1 ? (
          <>
            <div className="w-20 h-20 mb-4 drop-shadow-xl flex items-center justify-center text-blue-600">
              <img src="https://lh3.googleusercontent.com/aida/ADBb0uhDDNf8WHzgQhHI5ro4oykFxLNvHTJH5HALy3s4DuYvwoEdlcqszNOmxQSfaT27xBRNsJpCqtUAwXEmMTLGTy5S1mdjRjSvsDed7QIhWWMGSQYvsFql4DaAFhNsotFFMPlwakSvvJp7YfcLqgdY7suZVfR5rLxM2-c4ywKHqAa-jGfoHB1EugV2zp6qMTgxrghW8kss3pwAEX2V3Kv-prnn07qQx8OB9GVE3hn4yIKp3ha8fqSPMiOppaom" alt="AquaFlow" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-[32px] font-extrabold text-[#0058bf] tracking-tight leading-10">시작하기</h1>
            <p className="text-slate-600 font-medium text-sm mt-2">당신의 수분 리듬을 찾아보세요</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#006fef] text-white mb-6 shadow-[0_8px_32px_0_rgba(0,119,255,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.5C7 21.5 3 17.5 3 12.5C3 7.5 12 2.5 12 2.5C12 2.5 21 7.5 21 12.5C21 17.5 17 21.5 12 21.5Z" fill="white" />
                <path d="M8 15.5C8.5 17 10 18.5 12 18.5" fill="none" stroke="#006fef" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-[32px] font-extrabold text-[#0058bf] tracking-tight leading-10 max-w-[280px]">아쿠아플로우에 오신 것을 환영합니다</h1>
            <p className="text-slate-600 font-medium text-base mt-4 max-w-[280px]">당신만의 수분 섭취 여정을 시작해 보세요.</p>
          </>
        )}
      </header>

      <main className="flex-1 flex flex-col relative z-10 w-full px-6 pb-6 overflow-y-auto">
        {isAdding || users.length === 0 ? (
          step === 1 ? (
            <form onSubmit={handleNextStep} className="flex-1 flex flex-col w-full min-h-full pb-4">
              <div className="flex flex-col gap-6 mb-auto">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">사용자 이름</label>
                  <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 p-1 shadow-sm flex items-center">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="이름을 입력해주세요"
                      className="w-full bg-transparent border-none px-4 py-3.5 text-base font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">나만의 캐릭터 선택</label>
                  <div className="grid grid-cols-4 gap-3">
                    {CHARACTER_IMAGES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedChar(c)}
                        className={`aspect-square rounded-2xl flex items-center justify-center p-1.5 transition-all duration-300 ${
                          selectedChar === c 
                            ? 'bg-[#d8e2ff] border-2 border-[#0058bf] scale-105 shadow-md' 
                            : 'bg-white/50 backdrop-blur-xl border-2 border-transparent hover:bg-white/80 active:scale-95'
                        }`}
                      >
                        {renderCharacter(c)}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-slate-500 text-xs mt-2">앱 내에서 언제든 변경할 수 있습니다.</p>
                </div>
              </div>

              <div className="mt-8 pt-4 pb-2">
                <div className="flex gap-3 mb-6">
                  {users.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-4 bg-white/50 backdrop-blur-xl rounded-full text-sm font-bold text-slate-600 hover:bg-white/80 transition-colors border border-white/60 shadow-sm"
                    >
                      취소
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="flex-[2] py-4 bg-gradient-to-r from-[#0058bf] to-[#006fef] rounded-full text-[17px] font-bold text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    계속하기
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-center text-slate-500/70 text-[10px] font-bold tracking-widest uppercase">
                  By continuing you agree to our terms
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinishAddUser} className="flex-1 flex flex-col w-full min-h-full pb-4">
              <div className="flex flex-col gap-6 mb-auto bg-white/60 backdrop-blur-xl rounded-2xl border border-white p-6 shadow-lg shadow-blue-500/5">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">현재 체중</label>
                  <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400 transition-all">
                    <div className="pl-4 pr-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                    </div>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 70"
                      required
                      className="w-full bg-transparent border-none px-2 py-3 text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-0"
                    />
                    <div className="pr-4 text-slate-400 font-bold">kg</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">활동량</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="cursor-pointer">
                      <input type="radio" name="activity" className="peer sr-only" value="light" checked={activityLevel === 'light'} onChange={() => setActivityLevel('light')} />
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 text-slate-500 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/></svg>
                        <span className="text-[11px] font-bold">가벼움</span>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="activity" className="peer sr-only" value="moderate" checked={activityLevel === 'moderate'} onChange={() => setActivityLevel('moderate')} />
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 text-slate-500 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="m15 5 4 4"/><path d="M13 14h-2"/><path d="M19 14h-2"/><path d="m21 16-4-4"/><path d="m21 8-4 4"/><path d="m3 16 4-4"/><path d="m3 8 4 4"/><path d="M5 14h2"/><path d="m7 5-4 4"/><path d="M11 14h2"/></svg>
                        <span className="text-[11px] font-bold">보통</span>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" name="activity" className="peer sr-only" value="high" checked={activityLevel === 'high'} onChange={() => setActivityLevel('high')} />
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 text-slate-500 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.6 21.4a6 6 0 1 0-8.5-8.5l-5.1 5.2a2 2 0 0 0 2.8 2.8z"/></svg>
                        <span className="text-[11px] font-bold">활동적</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">기상 시간</label>
                    <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400 transition-all">
                      <div className="px-1 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <input type="time" value={wakeUpTime} onChange={(e) => setWakeUpTime(e.target.value)} required className="w-full bg-transparent border-none py-1.5 px-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-0" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wider">취침 시간</label>
                    <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400 transition-all">
                      <div className="px-1 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M4 12v6"/><path d="M20 12v6"/><path d="M4 8h16"/><path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
                      </div>
                      <input type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} required className="w-full bg-transparent border-none py-1.5 px-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-0" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 pb-2">
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-white/50 backdrop-blur-xl rounded-full text-sm font-bold text-slate-600 hover:bg-white/80 transition-colors border border-white/60 shadow-sm"
                  >
                    이전
                  </button>
                  <button
                    type="submit"
                    disabled={!weight}
                    className="flex-[2] py-4 bg-gradient-to-r from-[#44aeff] to-[#0058bf] rounded-full text-[17px] font-bold text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    시작하기
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-center text-slate-500/70 text-[10px] font-bold tracking-widest uppercase">
                  나중에 설정에서 언제든지 변경할 수 있습니다.
                </p>
              </div>
            </form>
          )
        ) : (
          <div className="w-full flex flex-col gap-6 h-full">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mt-2">저장된 사용자</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {users.map(u => (
                <div key={u.id} className="relative group">
                  <button
                    onClick={() => onSelectUser(u)}
                    className="w-full bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 p-6 shadow-sm flex flex-col items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1"
                  >
                    <div className="w-20 h-20 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center text-5xl">
                      {renderCharacter(u.character)}
                    </div>
                    <span className="font-semibold text-slate-800">{u.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => promptDeleteUser(u, e)}
                    className="absolute -top-2 -right-2 bg-red-100/90 backdrop-blur-sm text-red-600 p-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-red-500 hover:text-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"
                    aria-label="사용자 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={() => setIsAdding(true)}
                className="bg-white/20 backdrop-blur-sm rounded-3xl border-2 border-white/60 border-dashed p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/40 hover:border-white transition-all text-slate-500 hover:text-[#0058bf] group"
              >
                <Plus className="w-10 h-10 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-sm">새 사용자</span>
              </button>
            </div>
            
            <div className="mt-auto pb-8">
              <p className="text-center text-slate-500/70 text-[10px] font-bold tracking-widest uppercase">
                By continuing you agree to our terms
              </p>
            </div>
          </div>
        )}
      </main>

      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-slate-800 text-lg mb-2">정말 삭제하시겠습니까?</h3>
            <p className="text-center text-sm text-slate-500 mb-6 font-medium">
              '{userToDelete.name}' 사용자와 관련된<br/>
              모든 데이터가 영구적으로 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setUserToDelete(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm">
                취소
              </button>
              <button 
                onClick={confirmDeleteUser} 
                className="flex-[1.5] py-3 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/20 text-sm"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
