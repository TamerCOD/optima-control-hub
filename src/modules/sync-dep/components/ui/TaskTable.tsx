import React from 'react';
import { SyncDepTask } from '../../types/core.types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { DeadlineLabel } from './DeadlineLabel';
import { useTasksStore } from '../../store/tasksStore';
import { formatDate } from '../../utils/dates';
import { AlertTriangle, MessageSquare, Paperclip } from 'lucide-react';

import { formatTaskId } from '../../utils/taskUtils';

interface Props {
  tasks: SyncDepTask[];
  onTaskClick: (task: SyncDepTask) => void;
}

export const TaskTable: React.FC<Props> = ({ tasks, onTaskClick }) => {
  const { statuses, users, departments, allUsers } = useTasksStore();

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-base whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-2 py-2 font-medium">ID</th>
              <th className="px-2 py-2 font-medium">Название</th>
              <th className="px-2 py-2 font-medium">Отдел</th>
              <th className="px-2 py-2 font-medium">Приоритет</th>
              <th className="px-2 py-2 font-medium">Дедлайн</th>
              <th className="px-2 py-2 font-medium">Исполнители</th>
              <th className="px-2 py-2 font-medium">Статус</th>
              <th className="px-2 py-2 font-medium">Блокер</th>
              <th className="px-2 py-2 font-medium">Автор</th>
              <th className="px-2 py-2 font-medium">Создано</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tasks.map(task => {
              const status = statuses.find(s => s.id === task.status_id);
              
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
                <tr 
                  key={task.id} 
                  onClick={() => onTaskClick(task)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                >
                  <td className="px-2 py-2 text-sm text-zinc-400">{formatTaskId(task.id)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2 max-w-[300px]">
                      <span className="font-medium text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                      {((task.comments_count || 0) > 0 || (task.attachments_count || 0) > 0) && (
                        <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
                          {(task.comments_count || 0) > 0 && <MessageSquare size={12} />}
                          {(task.attachments_count || 0) > 0 && <Paperclip size={12} />}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">
                    {department?.name || '—'}
                  </td>
                  <td className="px-2 py-2">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-2 py-2">
                    <DeadlineLabel date={task.deadline} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1.5">
                      {assignees.length > 0 ? (
                        assignees.map(assignee => (
                          <div key={assignee.id} className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-medium text-zinc-600 dark:text-zinc-300 shrink-0 overflow-hidden">
                              {assignee.avatar_url ? (
                                <img src={assignee.avatar_url} alt={assignee.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                assignee.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{assignee.name}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-2 py-2">
                    {task.has_blocker ? (
                      <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <AlertTriangle size={14} />
                        <span>Да</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {creator ? (((creator as any).avatar_url || (creator as any).avatar) ? (
                          <img src={(creator as any).avatar_url || (creator as any).avatar} alt={creator.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          creator.name?.charAt(0).toUpperCase() || '?'
                        )) : '?'}
                      </div>
                      <span className="text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">
                        {creator?.name || creator?.email || 'Система'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-zinc-500 text-sm">
                    {task.created_at ? formatDate(task.created_at) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
