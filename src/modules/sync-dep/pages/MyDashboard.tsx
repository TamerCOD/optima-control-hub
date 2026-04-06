import React, { useMemo, useState } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../store/authStore';
import { TaskCard } from '../components/ui/TaskCard';
import { TaskModal } from '../components/modals/TaskModal';
import { isOverdue, isThisWeek } from '../utils/dates';
import { CheckCircle2, AlertCircle, Clock, Activity, Calendar } from 'lucide-react';
import { SyncDepTask } from '../types/core.types';

export const MyDashboard: React.FC = () => {
  const { tasks, statuses } = useTasksStore();
  const { currentUser } = useAuthStore();
  const [selectedTask, setSelectedTask] = useState<SyncDepTask | null>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDeadlineStart, setFilterDeadlineStart] = useState('');
  const [filterDeadlineEnd, setFilterDeadlineEnd] = useState('');

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    let filtered = tasks.filter(t => t.assignee_ids.includes(currentUser.id) && !t.is_archived);
    
    if (filterStartDate) {
      filtered = filtered.filter(t => t.created_at >= filterStartDate);
    }
    if (filterEndDate) {
      filtered = filtered.filter(t => t.created_at <= filterEndDate + 'T23:59:59.999Z');
    }
    if (filterDeadlineStart) {
      filtered = filtered.filter(t => t.deadline && t.deadline >= filterDeadlineStart);
    }
    if (filterDeadlineEnd) {
      filtered = filtered.filter(t => t.deadline && t.deadline <= filterDeadlineEnd);
    }
    
    return filtered;
  }, [tasks, currentUser, filterStartDate, filterEndDate, filterDeadlineStart, filterDeadlineEnd]);

  const metrics = useMemo(() => {
    const activeTasks = myTasks.filter(t => {
      const status = statuses.find(s => s.id === t.status_id);
      return status && !status.is_closing;
    });
    
    const overdueTasks = activeTasks.filter(t => isOverdue(t.deadline));
    
    const completedThisWeek = myTasks.filter(t => {
      const status = statuses.find(s => s.id === t.status_id);
      return status?.is_closing && t.updated_at && isThisWeek(new Date(t.updated_at));
    });

    return {
      active: activeTasks.length,
      overdue: overdueTasks.length,
      completedWeek: completedThisWeek.length,
      total: myTasks.length
    };
  }, [myTasks, statuses]);

  const attentionTasks = useMemo(() => {
    return myTasks.filter(t => {
      const status = statuses.find(s => s.id === t.status_id);
      if (status?.is_closing) return false;
      return t.has_blocker || t.priority === 'critical' || isOverdue(t.deadline);
    }).slice(0, 5);
  }, [myTasks, statuses]);

  const recentTasks = useMemo(() => {
    return [...myTasks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  }, [myTasks]);

  if (!currentUser) return null;

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">С возвращением, {currentUser.name.split(' ')[0]}!</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Вот что происходит с вашими задачами сегодня.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5">
            <Calendar size={16} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold leading-none mb-1">Создано</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
                <span className="text-zinc-400">-</span>
                <input 
                  type="date" 
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5">
            <Calendar size={16} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold leading-none mb-1">Дедлайн</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filterDeadlineStart}
                  onChange={e => setFilterDeadlineStart(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
                <span className="text-zinc-400">-</span>
                <input 
                  type="date" 
                  value={filterDeadlineEnd}
                  onChange={e => setFilterDeadlineEnd(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>
            </div>
          </div>
          
          {(filterStartDate || filterEndDate || filterDeadlineStart || filterDeadlineEnd) && (
            <button 
              onClick={() => {
                setFilterStartDate(''); setFilterEndDate(''); setFilterDeadlineStart(''); setFilterDeadlineEnd('');
              }}
              className="text-sm text-red-500 hover:text-red-600 font-medium px-2"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">В работе</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{metrics.active}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Просрочено</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{metrics.overdue}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Сделано за неделю</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{metrics.completedWeek}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Всего задач</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{metrics.total}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Требует внимания */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              Требует внимания
            </h2>
          </div>
          
          {attentionTasks.length > 0 ? (
            <div className="grid gap-3">
              {attentionTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-zinc-900 dark:text-white font-medium">Всё под контролем</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Нет просроченных или критичных задач</p>
            </div>
          )}
        </div>

        {/* Недавняя активность */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock className="text-blue-500" size={20} />
              Недавние задачи
            </h2>
          </div>
          
          {recentTasks.length > 0 ? (
            <div className="grid gap-3">
              {recentTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">Нет недавних задач</p>
            </div>
          )}
        </div>
      </div>
      
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
};
