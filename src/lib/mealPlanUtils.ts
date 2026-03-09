import { format, startOfWeek } from 'date-fns';

export type MealPlanSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function getMealPlanWeekStart(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getMealPlanDayIndex(date: Date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export function getCurrentMealPlanSlot(date: Date = new Date()): MealPlanSlot {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  return 'dinner';
}
