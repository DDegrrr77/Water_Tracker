import React, { useState } from 'react';
import { useHydration } from '../store/HydrationContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Coffee, Droplets, GlassWater, Undo2, Wine } from 'lucide-react';
import { DrinkType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface DrinkOptionProps {
  type: DrinkType;
  label: string;
  icon: React.ReactNode;
  amount: number;
}

export function HomeTab() {
  const {
    settings,
    todayTotalHydration,
    totalRecommended,
    currentRecommended,
    addLog,
    undoLastLog,
    todayLogs
  } = useHydration();

  const [ripples, setRipples] = useState<number[]>([]);

  const drinkOptions: DrinkOptionProps[] = [
    { type: 'water', label: '물', icon: <Droplets className="w-6 h-6" />, amount: settings.drinkSettings.water.amount },
    { type: 'coffee', label: '커피', icon: <Coffee className="w-6 h-6" />, amount: settings.drinkSettings.coffee.amount },
    { type: 'tea', label: '차', icon: <Wine className="w-6 h-6" />, amount: settings.drinkSettings.tea.amount },
    { type: 'soda', label: '탄산', icon: <GlassWater className="w-6 h-6" />, amount: settings.drinkSettings.soda.amount },
  ];

  const handleAdd = (type: DrinkType) => {
    addLog(type);
    
    // Add ripple effect
    const newRippleId = Date.now();
    setRipples((prev) => [...prev, newRippleId]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((id) => id !== newRippleId));
    }, 1000);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const percentage = Math.min((todayTotalHydration / Math.max(totalRecommended, 1)) * 100, 100);
  const currentRatio = Math.min((currentRecommended / Math.max(totalRecommended, 1)) * 100, 100);

  return (
    <div className="flex flex-col h-full p-6">
      <header className="mb-8 px-2 pt-2">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
          {format(new Date(), 'M월 d일 eeee', { locale: ko })}
        </p>
        <h2 className="text-2xl font-extrabold text-slate-800 leading-tight mt-1">
          오늘도 수분 가득한 하루! 💧
        </h2>
      </header>

      {/* Main Progress Indicator */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="w-64 h-64 rounded-full border-[12px] border-white p-1 relative overflow-hidden z-10 mx-auto shadow-sm bg-white">
          <div className="w-full h-full rounded-full bg-slate-50 flex flex-col items-center justify-center relative z-10 overflow-hidden shadow-inner">
            <span className="text-5xl font-black text-slate-800 tracking-tight">{todayTotalHydration}</span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">ml 마심</span>
            <div className="mt-4 w-8 h-1 bg-slate-200 rounded-full"></div>
            <div className="mt-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">현재 권장량</span>
              <span className="text-xs font-bold text-blue-600 mt-0.5">{currentRecommended}ml</span>
            </div>
            
            {/* Background indicating current recommended */}
            <div className="absolute bottom-0 left-0 w-full bg-blue-100 transition-all duration-1000 ease-in-out -z-20" style={{ height: `${currentRatio}%` }}></div>
            
            {/* Actual Wave indicating actual hydration */}
            <div className="absolute bottom-0 left-0 w-full bg-blue-500 opacity-40 transition-all duration-1000 ease-in-out -z-10" style={{ height: `${percentage}%` }}>
               <div className="absolute top-0 -mt-2 w-[200%] h-4 bg-blue-500 opacity-60 rounded-[50%] animate-wave" style={{ marginLeft: '-50%' }} />
            </div>

            {/* Render Ripples */}
            <AnimatePresence>
              {ripples.map((id) => (
                <motion.div
                  key={id}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute w-32 h-32 bg-white/80 rounded-full z-0 pointer-events-none"
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
        
        <p className="mt-6 text-[12px] font-medium text-slate-500 tracking-wider">
          하루 목표량: <span className="text-slate-800 font-bold">{totalRecommended}ml</span>
        </p>

      </div>

      {/* Quick Adds */}
      <div className="mt-auto pt-6">
        <div className="grid grid-cols-4 gap-3 mb-5 px-1">
          {drinkOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => handleAdd(opt.type)}
              className="flex flex-col items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all active:scale-95 shadow-sm"
            >
              <div className="text-blue-500">
                {opt.icon}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-700">{opt.label}</span>
                <span className="text-[9px] font-semibold text-slate-400 mt-0.5">{opt.amount}ml</span>
              </div>
            </button>
          ))}
          {!drinkOptions.find(o => o.type === 'sports_drink') && (
            <button
              onClick={() => handleAdd('sports_drink')}
              className="flex flex-col items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all active:scale-95 shadow-sm"
            >
              <div className="text-blue-500">
                <GlassWater className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-700">이온음료</span>
                <span className="text-[9px] font-semibold text-slate-400 mt-0.5">{settings.drinkSettings.sports_drink.amount}ml</span>
              </div>
            </button>
          )}
        </div>
        
        {/* Undo Button */}
        <div className="px-1">
          <button 
            onClick={undoLastLog}
            disabled={todayLogs.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white rounded-2xl text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white uppercase tracking-widest border border-slate-100 shadow-sm transition-all"
          >
            <Undo2 size={16} />
            최근 기록 취소
          </button>
        </div>
      </div>
    </div>
  );
}
