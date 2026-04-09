import React from 'react';
import { PRIORITIES } from '../../constants';

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const p = PRIORITIES.find(x => x.id === priority) || PRIORITIES[2];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
      <span>{p.emoji}</span>
      <span>{p.label}</span>
    </span>
  );
};
