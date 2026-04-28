import React from 'react';
import { SyncDepUser } from '../../types/core.types';
import { getInitials } from '../../utils/formatters';

interface Props {
  users: SyncDepUser[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatarStack: React.FC<Props> = ({ users, max = 3, size = 'sm' }) => {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  return (
    <div className="flex items-center -space-x-2">
      {displayUsers.map((u, i) => (
        <div 
          key={u.id} 
          className={`${sizeClasses[size]} rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-medium overflow-hidden z-[${10-i}]`}
          title={u.name}
        >
          {u.avatar_url ? (
            <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
          ) : (
            getInitials(u.name)
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className={`${sizeClasses[size]} rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 font-medium z-0`}>
          +{remaining}
        </div>
      )}
    </div>
  );
};
