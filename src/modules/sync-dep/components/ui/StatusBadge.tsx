import React from 'react';
import { TaskStatus } from '../../types/core.types';

export const StatusBadge: React.FC<{ status?: TaskStatus }> = ({ status }) => {
  if (!status) return null;
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
      style={{ 
        backgroundColor: `${status.color}15`, 
        color: status.color,
        borderColor: `${status.color}30`
      }}
    >
      <span>{status.icon}</span>
      <span>{status.name}</span>
    </span>
  );
};
