import React from 'react';
import { MessageSquare, Paperclip, AlertTriangle } from 'lucide-react';
import { SyncDepTask } from '../../types/core.types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { DeadlineLabel } from './DeadlineLabel';
import { UserAvatarStack } from './UserAvatarStack';
import { useTasksStore } from '../../store/tasksStore';
import { formatDate } from '../../utils/dates';

import { formatTaskId } from '../../utils/taskUtils';

interface Props {
  task: SyncDepTask;
  onClick?: (task: SyncDepTask) => void;
}

export const TaskCard: React.FC<Props> = ({ task, onClick }) => {
  const { statuses, users, departments, allUsers } = useTasksStore();
  const status = statuses.find(s => s.id === task.status_id);
  
  // Find assignees in sync_dep_users first, then fallback to allUsers
  const assignees = task.assignee_ids.map(id => 
    users.find(u => u.id === id) || 
    (() => {
      const au = allUsers.find(u => u.id === id);
      if (!au) return null;
      return {
        id: au.id,
        name: au.name,
        email: au.email,
        avatar_url: au.avatar,
        role: au.roles?.includes('admin') ? 'admin' : 'employee',
        department_ids: [],
        department_id: null,
        is_active: au.isActive,
        notify_email: false,
        notify_tg: false,
        created_at: '',
        updated_at: ''
      } as any;
    })()
  ).filter(Boolean);

  const creator = users.find(u => u.id === task.created_by) || allUsers.find(u => u.id === task.created_by);
  const department = departments.find(d => d.id === task.department_id);
  
  return (
    <div 
      onClick={() => onClick?.(task)}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
    >
      {department?.color && (
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none" 
          style={{ backgroundColor: department.color }} 
        />
      )}
      {task.has_blocker && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-sm border-2 border-white dark:border-zinc-900 z-10" title="Есть блокер">
          <AlertTriangle size={12} />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3 gap-2 relative z-10">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <PriorityBadge priority={task.priority} />
          {department && (
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50"
              title={department.name}
            >
              {department.name}
            </span>
          )}
        </div>
        <span className="text-base font-medium text-zinc-400 dark:text-zinc-500 shrink-0 relative z-10">
          {formatTaskId(task.id)}
        </span>
      </div>
      
      <h4 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors relative z-10">
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-base text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 relative z-10">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/50 relative z-10">
        <div className="flex flex-col gap-1.5">
          <DeadlineLabel date={task.deadline} />
          <div className="flex flex-col text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {creator && (
              <span title="Автор задачи" className="truncate max-w-[180px] flex items-center gap-1">
                <span className="text-zinc-400">Автор:</span> 
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{creator.name || creator.email}</span>
              </span>
            )}
            {task.created_at && (
              <span title="Дата создания" className="flex items-center gap-1">
                <span className="text-zinc-400">Создано:</span> 
                <span>{formatDate(task.created_at)}</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {((task.comments_count || 0) > 0 || (task.attachments_count || 0) > 0) && (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              {(task.comments_count || 0) > 0 && (
                <span className="flex items-center gap-1"><MessageSquare size={14} /> {task.comments_count}</span>
              )}
              {(task.attachments_count || 0) > 0 && (
                <span className="flex items-center gap-1"><Paperclip size={14} /> {task.attachments_count}</span>
              )}
            </div>
          )}
          
          <div className="flex flex-col items-end gap-1">
            {assignees.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[140px]" title={assignees.map(a => a.name).join(', ')}>
                  {assignees.length === 1 ? assignees[0].name : `${assignees.length} исполн.`}
                </span>
                <UserAvatarStack users={assignees} max={3} size="sm" />
              </div>
            ) : (
              <span className="text-xs text-zinc-400 italic">Нет исполнителя</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
