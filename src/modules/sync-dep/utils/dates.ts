import { format, isToday, isTomorrow, isPast, isThisWeek, isThisMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatDate = (dateString?: string) => {
  if (!dateString) return 'Без дедлайна';
  const date = new Date(dateString);
  
  if (isToday(date)) return 'Сегодня';
  if (isTomorrow(date)) return 'Завтра';
  
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return format(date, isCurrentYear ? 'd MMM' : 'd MMM yyyy', { locale: ru });
};

export const isOverdue = (dateString?: string) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return isPast(date) && !isToday(date);
};

export { isThisWeek, isThisMonth };
