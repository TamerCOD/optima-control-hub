import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { formatDate, isOverdue } from '../../utils/dates';

export const DeadlineLabel: React.FC<{ date?: string, isClosing?: boolean }> = ({ date, isClosing }) => {
  if (!date) return <span className="text-zinc-400 text-xs flex items-center gap-1"><Calendar size={12}/> Без дедлайна</span>;
  
  const overdue = !isClosing && isOverdue(date);
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
      {overdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
      {formatDate(date)}
    </span>
  );
};
