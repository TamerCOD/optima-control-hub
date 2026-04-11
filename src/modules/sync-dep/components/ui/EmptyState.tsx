import React from 'react';
import { FileQuestion } from 'lucide-react';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4">
      {icon || <FileQuestion size={32} />}
    </div>
    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
    {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);
