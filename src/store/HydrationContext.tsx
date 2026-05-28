import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { UserSettings, HydrationLog, DrinkType } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { sendBrowserNotification, requestNotificationPermission } from '../lib/notifications';
import { calculateCurrentRecommended, calculateTotalRecommended } from '../lib/utils';
import { startOfDay, endOfDay, format } from 'date-fns';

export const defaultSettings: UserSettings = {
  weight: 60,
  activityLevel: 'moderate',
  wakeUpTime: '07:00',
  bedTime: '23:00',
  drinkSettings: {
    water: { amount: 200, hydrationRate: 100 },
    coffee: { amount: 250, hydrationRate: 80 },
    tea: { amount: 250, hydrationRate: 100 },
    soda: { amount: 250, hydrationRate: 50 },
    sports_drink: { amount: 300, hydrationRate: 100 },
  },
  notificationsEnabled: false,
};

interface HydrationContextProps {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  logs: HydrationLog[];
  addLog: (drinkType: DrinkType) => void;
  undoLastLog: () => void;
  todayLogs: HydrationLog[];
  todayTotalHydration: number;
  totalRecommended: number;
  currentRecommended: number;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  backupData: () => void;
  restoreData: (jsonData: string) => boolean;
}

const HydrationContext = createContext<HydrationContextProps | undefined>(undefined);

export function HydrationProvider({ userId, children }: { userId: string, children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<UserSettings>(`hydration_settings_${userId}`, defaultSettings);
  const [logs, setLogs] = useLocalStorage<HydrationLog[]>(`hydration_logs_${userId}`, []);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentRecommended, setCurrentRecommended] = useState<number>(0);

  const totalRecommended = calculateTotalRecommended(settings.weight, settings.activityLevel);

  // Filter today's logs
  const now = new Date();
  const startOfToday = startOfDay(now).getTime();
  const endOfToday = endOfDay(now).getTime();
  
  const todayLogs = logs.filter(
    (log) => log.timestamp >= startOfToday && log.timestamp <= endOfToday
  );
  
  const todayTotalHydration = todayLogs.reduce((acc, log) => acc + log.hydrationAmount, 0);

  // Update current recommended periodically
  useEffect(() => {
    const update = () => {
      setCurrentRecommended(calculateCurrentRecommended(totalRecommended, settings.wakeUpTime, settings.bedTime));
    };
    update();
    const interval = setInterval(update, 60000); // every minute
    return () => clearInterval(interval);
  }, [totalRecommended, settings.wakeUpTime, settings.bedTime]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (updated.notificationsEnabled && !prev.notificationsEnabled) {
        requestNotificationPermission();
      }
      return updated;
    });
  };

  const addLog = (drinkType: DrinkType) => {
    const setting = settings.drinkSettings[drinkType];
    const rawAmount = setting.amount;
    const hydrationAmount = Math.round(rawAmount * (setting.hydrationRate / 100));
    
    const newLog: HydrationLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      drinkType,
      rawAmount,
      hydrationAmount,
    };

    setLogs((prev) => [...prev, newLog]);

    // Check for notification if enabled
    if (settings.notificationsEnabled) {
      // Defer check to after state updates but we can compute with new expected total
      const newTotal = todayTotalHydration + hydrationAmount;
      const threshold = currentRecommended * 0.9; // 10% deficit
      if (newTotal < threshold) {
         setToastMessage("수분이 부족해요! 물을 더 마셔주세요 💧");
         sendBrowserNotification("수분 부족 경고", `현재 권장량보다 ${Math.round(currentRecommended - newTotal)}ml 부족합니다.`);
      }
    }
  };

  const undoLastLog = () => {
    if (todayLogs.length === 0) return;
    const lastLog = todayLogs[todayLogs.length - 1];
    setLogs((prev) => prev.filter((log) => log.id !== lastLog.id));
  };

  const backupData = () => {
    const data = { settings, logs, version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = format(new Date(), 'yyyyMMdd_HHmmss');
    a.download = `water_${userId}_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreData = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.settings && data.logs) {
        setSettings(data.settings);
        setLogs(data.logs);
        return true;
      }
    } catch (e) {
       console.error("Restore failed", e);
    }
    return false;
  };

  return (
    <HydrationContext.Provider value={{
      settings,
      updateSettings,
      logs,
      addLog,
      undoLastLog,
      todayLogs,
      todayTotalHydration,
      totalRecommended,
      currentRecommended,
      toastMessage,
      setToastMessage,
      backupData,
      restoreData
    }}>
      {children}
    </HydrationContext.Provider>
  );
}

export function useHydration() {
  const context = useContext(HydrationContext);
  if (context === undefined) {
    throw new Error('useHydration must be used within a HydrationProvider');
  }
  return context;
}
