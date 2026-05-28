import React, { useMemo, useState } from 'react';
import { useHydration } from '../store/HydrationContext';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function StatsTab() {
  const { logs, totalRecommended } = useHydration();
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const today = new Date();

  const weeklyData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });

    return last7Days.map(date => {
      const start = startOfDay(date).getTime();
      const end = endOfDay(date).getTime();
      
      const dayLogs = logs.filter(log => log.timestamp >= start && log.timestamp <= end);
      const totalAmount = dayLogs.reduce((acc, log) => acc + log.hydrationAmount, 0);

      return {
        name: format(date, 'E', { locale: ko }),
        amount: totalAmount,
        fullDate: format(date, 'yyyy-MM-dd'),
        isTargetMet: totalAmount >= totalRecommended,
        percentage: Math.min(100, Math.round((totalAmount / totalRecommended) * 100))
      };
    });
  }, [logs, totalRecommended]);

  const stats = useMemo(() => {
    const totalIntake = weeklyData.reduce((acc, day) => acc + day.amount, 0);
    const avgIntake = Math.round(totalIntake / 7);
    const goalCompletionRate = Math.round((totalIntake / (totalRecommended * 7)) * 100) || 0;
    
    return {
      avgIntake,
      goalCompletionRate: Math.min(100, goalCompletionRate),
    };
  }, [weeklyData, totalRecommended]);

  // Calendar logic
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const dateFormat = "yyyy-MM-dd";
    const days = [];
    let day = startDate;

    const dailyTotalsMap = new Map<string, number>();
    logs.forEach(log => {
      const logDateStr = format(new Date(log.timestamp), dateFormat);
      dailyTotalsMap.set(logDateStr, (dailyTotalsMap.get(logDateStr) || 0) + log.hydrationAmount);
    });

    while (day <= endDate) {
      const dayStr = format(day, dateFormat);
      const amount = dailyTotalsMap.get(dayStr) || 0;
      days.push({
        date: day,
        dayStr,
        amount,
        isCurrentMonth: isSameMonth(day, monthStart),
        isToday: isSameDay(day, today),
        isTargetMet: amount >= totalRecommended
      });
      day = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  }, [today, logs, totalRecommended]);

  return (
    <div className="px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="pt-2">
        <h1 className="text-[28px] font-extrabold text-slate-800 tracking-tight leading-10">나의 수분 리듬</h1>
        <p className="text-[#414755] font-medium text-sm mt-1">일일 리듬과 달성 현황을 확인하세요.</p>
      </div>

      <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm overflow-hidden">
        <button onClick={() => setTimeframe('day')} className={`flex-1 py-2.5 rounded-[12px] text-xs font-bold transition-all ${timeframe === 'day' ? 'bg-white shadow-sm text-[#0058bf] border border-white/80' : 'text-slate-500 hover:text-slate-700'}`}>일</button>
        <button onClick={() => setTimeframe('week')} className={`flex-1 py-2.5 rounded-[12px] text-xs font-bold transition-all ${timeframe === 'week' ? 'bg-white shadow-sm text-[#0058bf] border border-white/80' : 'text-slate-500 hover:text-slate-700'}`}>주</button>
        <button onClick={() => setTimeframe('month')} className={`flex-1 py-2.5 rounded-[12px] text-xs font-bold transition-all ${timeframe === 'month' ? 'bg-white shadow-sm text-[#0058bf] border border-white/80' : 'text-slate-500 hover:text-slate-700'}`}>월</button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border-t border-l border-white shadow-[0_4px_24px_rgba(0,119,255,0.03)] relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#bde9ff]/40 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-[#006fef] text-white flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.5C7 21.5 3 17.5 3 12.5C3 7.5 12 2.5 12 2.5C12 2.5 21 7.5 21 12.5C21 17.5 17 21.5 12 21.5Z" /></svg>
            </div>
            <h3 className="font-semibold text-slate-700 text-sm">평균 섭취량</h3>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.avgIntake.toLocaleString()}</span>
            <span className="font-medium text-slate-500 text-sm">ml/day</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[#006783] text-[11px] font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <span>+12% 지난주 대비</span>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border-t border-l border-white shadow-[0_4px_24px_rgba(0,119,255,0.03)] relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#d8e2ff]/40 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-[#71d5fe] text-[#005c76] flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
            <h3 className="font-semibold text-slate-700 text-sm">목표 달성률</h3>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.goalCompletionRate}</span>
            <span className="font-medium text-slate-500 text-sm">%</span>
          </div>
          <div className="mt-4 w-full bg-[#e0e3e7]/50 rounded-full h-2 overflow-hidden relative z-10">
            <div className="bg-[#006fef] h-full rounded-full transition-all duration-1000" style={{ width: `${stats.goalCompletionRate}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-[#d5e3ff] text-[#001b3c] flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-[17px] mb-2 tracking-tight">습관 분석</h3>
          <p className="text-[13px] leading-relaxed text-[#414755] font-medium">
            오전 수분 섭취량이 낮습니다. 일정한 리듬을 유지하기 위해 오후 12시 전에 물을 좀 더 마셔보세요.
          </p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border-t border-l border-white shadow-[0_4px_24px_rgba(0,119,255,0.03)] pt-6">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-slate-900 text-lg">주간 리듬</h3>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#006fef]"></div>
              <span className="text-[10px] font-bold text-slate-500 tracking-wide">섭취량</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 border-dashed"></div>
              <span className="text-[10px] font-bold text-slate-500 tracking-wide">목표 ({totalRecommended}ml)</span>
            </div>
          </div>
        </div>

        <div className="h-44 relative">
          <div className="absolute w-full border-t border-slate-300 border-dashed top-[20%] left-0 opacity-50 z-0"></div>
          
          <ResponsiveContainer width="100%" height="100%" className="z-10 relative">
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={24}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isTargetMet ? (index === 2 ? '#71d5fe' : '#006fef') : '#e5e8ec'} />
                ))}
              </Bar>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#727786', fontWeight: 600 }} dy={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border-t border-l border-white shadow-[0_4px_24px_rgba(0,119,255,0.03)]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-900 text-lg">꾸준함</h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {['월', '화', '수', '목', '금', '토', '일'].map(d => (
            <div key={d} className="text-[11px] font-bold text-slate-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-3 gap-x-2">
          {calendarDays.map((day, idx) => {
            const isFuture = day.date > today && !day.isToday;
            
            let bgClass = "bg-transparent";
            let textClass = "text-slate-400";
            
            if (!day.isCurrentMonth) {
              textClass = "text-slate-300";
            } else if (day.isToday) {
              bgClass = "bg-[#006783] text-white shadow-md border-2 border-white";
              textClass = "text-white font-extrabold";
            } else if (day.isTargetMet) {
              bgClass = "bg-[#006fef] shadow-sm text-white";
              textClass = "text-white font-bold";
            } else if (!isFuture && day.amount > 0) {
              bgClass = "bg-[#d8e2ff]";
              textClass = "text-[#0058bf] font-bold";
            } else if (!isFuture) {
              bgClass = "bg-slate-100/80";
              textClass = "text-slate-500 font-medium";
            }

            return (
              <div key={idx} className="flex justify-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] transition-all cursor-default ${bgClass} ${textClass}`}>
                  {format(day.date, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center gap-5 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#006fef]"></div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wide">목표 달성</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#006783]"></div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wide">오늘</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/90 backdrop-blur-md border border-slate-100 p-2.5 rounded-xl shadow-lg">
        <p className="text-[10px] font-bold text-slate-400 mb-1">{data.fullDate}</p>
        <p className="text-[#0058bf] font-extrabold text-sm">{data.amount.toLocaleString()} <span className="text-[10px] font-medium text-slate-500">ml</span></p>
      </div>
    );
  }
  return null;
};
