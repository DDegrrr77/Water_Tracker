import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time string 'HH:MM' to date object today
export function timeStringToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Calculate standard daily recommended intake (ml) given weight (kg) and activity level
export function calculateTotalRecommended(weight: number, activityLevel: 'light' | 'moderate' | 'high' = 'moderate'): number {
  let base = weight * 30;
  if (activityLevel === 'moderate') base += 300;
  if (activityLevel === 'high') base += 600;
  return base;
}

// Calculate point-in-time recommended intake based on wake up and bed time
export function calculateCurrentRecommended(
  totalRecommended: number,
  wakeUpTimeStr: string,
  bedTimeStr: string
): number {
  const now = new Date();
  let wakeUpTime = timeStringToDate(wakeUpTimeStr);
  let bedTime = timeStringToDate(bedTimeStr);

  // If bed time is next day (e.g., wake up 07:00, bed 01:00)
  if (bedTime <= wakeUpTime) {
    if (now.getHours() < wakeUpTime.getHours()) {
      // currently past midnight, so wake up time was yesterday
      wakeUpTime.setDate(wakeUpTime.getDate() - 1);
    } else {
      // currently daytime, bed time is tomorrow
      bedTime.setDate(bedTime.getDate() + 1);
    }
  }

  const awakeDurationMillis = bedTime.getTime() - wakeUpTime.getTime();
  const elapsedTimeMillis = now.getTime() - wakeUpTime.getTime();

  if (elapsedTimeMillis < 0) {
    return 0; // hasn't woken up yet
  }
  if (elapsedTimeMillis > awakeDurationMillis) {
    return totalRecommended; // past bed time
  }

  const ratio = elapsedTimeMillis / awakeDurationMillis;
  return Math.round(totalRecommended * ratio);
}
