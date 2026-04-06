import React, { useMemo } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { isOverdue, isThisWeek } from '../utils/dates';
import { CheckCircle2, AlertCircle, Clock, Activity, Users, Building2, Calendar } from 'lucide-react';
import { MultiSelect } from '../components/ui/MultiSelect';
import { TaskCard } from '../components/ui/TaskCard';
import { SyncDepTask } from '../types/core.types';
import { TaskModal } from '../components/modals/TaskModal';

export const AllDashboard: React.FC = () => {
  const { tasks, statuses, departments, users } = useTasksStore();
  const [selectedTask, setSelectedTask] = React.useState<SyncDepTask | null>(null);

  const [filterStartDate, setFilterStartDate] = React.useState('');
  const [filterEndDate, setFilterEndDate] = React.useState('');
  const [filterDeadlineStart, setFilterDeadlineStart] = React.useState('');
  const [filterDeadlineEnd, setFilterDeadlineEnd] = React.useState('');
  const [filterDepartment, setFilterDepartment] = React.useState<string[]>([]);

  const activeTasksList = useMemo(() => {
    let filtered = tasks.filter(t => !t.is_archived);
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
    if (filterDepartment.length > 0) {
      filtered = filtered.filter(t => filterDepartment.includes(t.department_id));
    }
    return filtered;
  }, [tasks, filterStartDate, filterEndDate, filterDeadlineStart, filterDeadlineEnd, filterDepartment]);

  const metrics = useMemo(() => {
    const activeTasks = activeTasksList.filter(t => {
      const status = statuses.find(s => s.id === t.status_id);
      return status && !status.is_closing;
    });
    
    const overdueTasks = activeTasks.filter(t => isOverdue(t.deadline));
    
    const completedThisWeek = activeTasksList.filter(t => {
      const status = statuses.find(s => s.id === t.status_id);
      return status?.is_closing && t.updated_at && isThisWeek(new Date(t.updated_at));
    });

    return {
      active: activeTasks.length,
      overdue: overdueTasks.length,
      completedWeek: completedThisWeek.length,
      total: activeTasksList.length
    };
  }, [activeTasksList, statuses]);

  const departmentStats = useMemo(() => {
    return departments.map(dep => {
      const depTasks = activeTasksList.filter(t => t.department_id === dep.id);
      const active = depTasks.filter(t => {
        const status = statuses.find(s => s.id === t.status_id);
        return status && !status.is_closing;
      });
      const overdue = active.filter(t => isOverdue(t.deadline));
      const completed = depTasks.filter(t => {
        const status = statuses.find(s => s.id === t.status_id);
        return status?.is_closing;
      });

      return {
        ...dep,
        totalTasks: depTasks.length,
        activeTasks: active.length,
        overdueTasks: overdue.length,
        completedTasks: completed.length
      };
    }).sort((a, b) => b.activeTasks - a.activeTasks);
  }, [departments, activeTasksList, statuses]);

  const recentTasks = useMemo(() => {
    return [...activeTasksList]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);
  }, [activeTasksList]);

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Общий дашборд</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Сводка по всем отделам и задачам компании</p>
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

          <MultiSelect
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            value={filterDepartment}
            onChange={setFilterDepartment}
            placeholder="Все отделы"
            icon={<Building2 size={16} />}
          />
          
          {(filterStartDate || filterEndDate || filterDeadlineStart || filterDeadlineEnd || filterDepartment.length > 0) && (
            <button 
              onClick={() => {
                setFilterStartDate(''); setFilterEndDate(''); setFilterDeadlineStart(''); setFilterDeadlineEnd(''); setFilterDepartment([]);
              }}
              className="text-sm text-red-500 hover:text-red-600 font-medium px-2"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Global Metrics */}
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
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Сотрудников</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{users.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Building2 className="text-zinc-400" size={20} />
              Сводка по отделам
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departmentStats.map(dep => (
              <div key={dep.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: dep.color }}>
                    {dep.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{dep.name}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{dep.activeTasks} задач в работе</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Всего</p>
                    <p className="font-semibold text-zinc-900 dark:text-white">{dep.totalTasks}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Просрочено</p>
                    <p className={`font-semibold ${dep.overdueTasks > 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                      {dep.overdueTasks}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Готово</p>
                    <p className="font-semibold text-emerald-500">{dep.completedTasks}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock className="text-blue-500" size={20} />
              Последние обновления
            </h2>
          </div>
          
          <div className="grid gap-3">
            {recentTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
            ))}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
};
