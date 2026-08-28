import React, { useRef } from 'react';
import { useHydration } from '../store/HydrationContext';
import { DrinkType, DrinkSetting } from '../types';
import { Download, Upload } from 'lucide-react';

export function SettingsTab() {
  const { settings, updateSettings, totalRecommended, backupData, restoreData } = useHydration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrinkSettingChange = (type: DrinkType, field: keyof DrinkSetting, value: number) => {
    updateSettings({
      drinkSettings: {
        ...settings.drinkSettings,
        [type]: {
          ...settings.drinkSettings[type],
          [field]: value,
        },
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const success = restoreData(result);
      if (success) {
        alert("데이터 복구가 완료되었습니다.");
      } else {
        alert("유효하지 않은 백업 파일입니다.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const drinkLabels: Record<DrinkType, string> = {
    water: '물',
    coffee: '커피',
    tea: '차',
    soda: '탄산음료',
    sports_drink: '이온음료'
  };

  return (
    <div className="p-6 pb-20 space-y-6">
      <header>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 mb-4">설정</h3>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div>
          <label className="text-[11px] font-bold text-slate-500 mb-2 block">몸무게 (kg)</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="number"
              value={settings.weight}
              onChange={(e) => updateSettings({ weight: Number(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
            />
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">권장: {totalRecommended}ml</span>
          </div>
        </div>

        <div className="pt-2">
          <label className="text-[11px] font-bold text-slate-500 mb-2 block">활동량</label>
          <div className="grid grid-cols-3 gap-2">
            <label className="cursor-pointer">
              <input type="radio" name="settings_activity" className="peer sr-only" value="light" checked={settings.activityLevel === 'light'} onChange={() => updateSettings({ activityLevel: 'light' })} />
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 peer-checked:border-[#0058bf] peer-checked:bg-[#e6efff] peer-checked:text-[#0058bf] text-slate-500 transition-all duration-200">
                <span className="text-[11px] font-bold">가벼움</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="settings_activity" className="peer sr-only" value="moderate" checked={settings.activityLevel === 'moderate'} onChange={() => updateSettings({ activityLevel: 'moderate' })} />
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 peer-checked:border-[#0058bf] peer-checked:bg-[#e6efff] peer-checked:text-[#0058bf] text-slate-500 transition-all duration-200">
                <span className="text-[11px] font-bold">보통</span>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="settings_activity" className="peer sr-only" value="high" checked={settings.activityLevel === 'high'} onChange={() => updateSettings({ activityLevel: 'high' })} />
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 peer-checked:border-[#0058bf] peer-checked:bg-[#e6efff] peer-checked:text-[#0058bf] text-slate-500 transition-all duration-200">
                <span className="text-[11px] font-bold">활동적</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-2">
           <label className="text-[11px] font-bold text-slate-500 mb-3 block">하루 리듬 (시간)</label>
           <div className="flex flex-col gap-4">
             <div className="flex flex-col">
               <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5 ml-1">기상</p>
               <input
                 type="time"
                 value={settings.wakeUpTime}
                 onChange={(e) => updateSettings({ wakeUpTime: e.target.value })}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
               />
             </div>
             <div className="flex flex-col">
               <p className="text-[9px] text-slate-400 uppercase font-bold mb-1.5 ml-1">취침</p>
               <input
                 type="time"
                 value={settings.bedTime}
                 onChange={(e) => updateSettings({ bedTime: e.target.value })}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
               />
             </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-800">음료 종류</h3>
        <div className="space-y-4">
          {(Object.keys(settings.drinkSettings) as DrinkType[]).map((type) => (
            <div key={type} className="flex flex-col space-y-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <span className="text-xs font-bold text-slate-700">{drinkLabels[type]}</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase w-14">기본량</span>
                  <input
                    type="number"
                    value={settings.drinkSettings[type].amount}
                    onChange={(e) => handleDrinkSettingChange(type, 'amount', Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase w-14">반영률(%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.drinkSettings[type].hydrationRate}
                    onChange={(e) => handleDrinkSettingChange(type, 'hydrationRate', Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-800">수분 부족 알림</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.notificationsEnabled}
              onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
            />
            <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
        <p className="text-[10px] text-slate-500 mt-3 font-medium">현재 권장량 대비 10% 이상 부족할 때 알림을 받습니다.</p>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">알림 간격 (분)</span>
          <input
            type="number"
            min="10"
            max="240"
            step="10"
            value={settings.reminderInterval}
            onChange={(e) => updateSettings({ reminderInterval: Number(e.target.value) || 60 })}
            className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">데이터 백업 및 복구</h3>
        <div className="flex gap-3">
           <button 
             onClick={backupData}
             className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-colors"
           >
             <Download className="w-5 h-5 text-blue-500" />
             <span className="text-xs font-bold text-slate-700">백업 저장</span>
           </button>
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-colors"
           >
             <Upload className="w-5 h-5 text-blue-500" />
             <span className="text-xs font-bold text-slate-700">데이터 복구</span>
           </button>
           <input 
             type="file" 
             accept=".json" 
             className="hidden" 
             ref={fileInputRef}
             onChange={handleFileChange} 
           />
        </div>
      </div>
    </div>
  );
}
