import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
      <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
    </div>
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mb-4"></div>
    <div className="flex items-center justify-between mt-4">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
      <div className="flex -space-x-2">
        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900"></div>
        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900"></div>
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
    <div className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center gap-4">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-8"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24"></div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-16 border-b border-zinc-100 dark:border-zinc-800/50 px-4 flex items-center gap-4 animate-pulse">
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-8"></div>
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3"></div>
        <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full w-24"></div>
        <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full w-24"></div>
      </div>
    ))}
  </div>
);
