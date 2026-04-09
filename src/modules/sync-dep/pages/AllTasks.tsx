import React, { useState, useMemo } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../store/authStore';
import { useFilters } from '../hooks/useFilters';
import { MultiSelect } from '../components/ui/MultiSelect';
import { TaskCard } from '../components/ui/TaskCard';
import { TaskModal } from '../components/modals/TaskModal';
import { BlockerModal } from '../components/modals/BlockerModal';
import { EmptyState } from '../components/ui/EmptyState';
import { SyncDepTask, TaskStatus } from '../types/core.types';
import { Search, Filter, LayoutGrid, List, Calendar, User, Building2, Flag, CheckCircle2, Table } from 'lucide-react';
import { TaskTable } from '../components/ui/TaskTable';
import { isPast, isToday } from 'date-fns';

export const AllTasks: React.FC = () => {
  const { tasks, statuses, departments, allUsers } = useTasksStore();
  const { currentUser } = useAuthStore();
  const { search, setSearch, statusIds, priorities, isOverdue, showArchived, toggleArchived } = useFilters();
  
  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator';

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'table'>('list');
  const [selectedTask, setSelectedTask] = useState<SyncDepTask | null>(null);
  const [blockerTask, setBlockerTask] = useState<{task: SyncDepTask, status: TaskStatus} | null>(null);

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDeadlineStart, setFilterDeadlineStart] = useState('');
  const [filterDeadlineEnd, setFilterDeadlineEnd] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);

  const canChangeStatus = (task: SyncDepTask) => {
    const isAdmin = currentUser?.role === 'admin';
    const isModerator = currentUser?.role === 'moderator';
    const isEmployee = currentUser?.role === 'employee';
    const userDepartmentIds = currentUser?.department_ids || (currentUser?.department_id ? [currentUser.department_id] : []);
    const isSameDepartment = userDepartmentIds.includes(task.department_id);
    const isCreator = task.created_by === currentUser?.id;
    const isAssignee = task.assignee_ids.includes(currentUser?.id || '');
    return isAdmin || (isModerator && isSameDepartment) || (isEmployee && isSameDepartment) || isCreator || isAssignee;
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (showArchived) {
      filtered = filtered.filter(t => t.is_archived);
    } else {
      filtered = filtered.filter(t => !t.is_archived);
    }
    
    if (search) {
      filtered = filtered.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    }
    if (statusIds.length > 0) {
      filtered = filtered.filter(t => statusIds.includes(t.status_id));
    }
    if (priorities.length > 0) {
      filtered = filtered.filter(t => priorities.includes(t.priority));
    }
    if (isOverdue) {
      filtered = filtered.filter(t => {
        const status = statuses.find(s => s.id === t.status_id);
        if (status?.is_closing) return false;
        return t.deadline ? isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)) : false;
      });
    }

    // Advanced Filters
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
    if (filterAssignee.length > 0) {
      filtered = filtered.filter(t => t.assignee_ids.some(id => filterAssignee.includes(id)));
    }
    if (filterStatus.length > 0) {
      filtered = filtered.filter(t => filterStatus.includes(t.status_id));
    }
    if (filterPriority.length > 0) {
      filtered = filtered.filter(t => filterPriority.includes(t.priority));
    }
    
    return filtered;
  }, [tasks, search, statusIds, priorities, isOverdue, showArchived, statuses, filterStartDate, filterEndDate, filterDeadlineStart, filterDeadlineEnd, filterDepartment, filterAssignee, filterStatus, filterPriority]);

  const tasksByDepartment = useMemo(() => {
    const grouped: Record<string, SyncDepTask[]> = {};
    departments.forEach(d => {
      grouped[d.id] = [];
    });
    filteredTasks.forEach(t => {
      if (grouped[t.department_id]) {
        grouped[t.department_id].push(t);
      }
    });
    return grouped;
  }, [filteredTasks, departments]);

  if (!isAdmin && !isModerator) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <EmptyState 
          title="Доступ запрещен" 
          description="У вас нет прав для просмотра всех задач."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900">
      <div className="p-3 sm:p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Все задачи</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Сводка по всем отделам
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                title="Списком"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                title="Канбан"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                title="Таблица"
              >
                <Table size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск задач..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 border focus:border-primary rounded-xl text-sm transition-all"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              showFilters 
                ? 'bg-primary/10 border-primary/20 text-primary' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Filter size={16} />
            Фильтры
          </button>

          <button 
            onClick={() => toggleArchived()}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              showArchived 
                ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            Архив
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5">
              <Calendar size={14} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold leading-none mb-1">Создано</span>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none" />
                  <span className="text-zinc-400">-</span>
                  <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5">
              <Calendar size={14} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold leading-none mb-1">Дедлайн</span>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterDeadlineStart} onChange={e => setFilterDeadlineStart(e.target.value)} className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none" />
                  <span className="text-zinc-400">-</span>
                  <input type="date" value={filterDeadlineEnd} onChange={e => setFilterDeadlineEnd(e.target.value)} className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none" />
                </div>
              </div>
            </div>

            <MultiSelect
              options={departments.map(d => ({ value: d.id, label: d.name }))}
              value={filterDepartment}
              onChange={setFilterDepartment}
              placeholder="Все отделы"
              icon={<Building2 size={14} />}
            />

            <MultiSelect
              options={allUsers.map(u => ({ value: u.id, label: u.name || u.email }))}
              value={filterAssignee}
              onChange={setFilterAssignee}
              placeholder="Все исполнители"
              icon={<User size={14} />}
            />

            <MultiSelect
              options={statuses.map(s => ({ value: s.id, label: s.name }))}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Все статусы"
              icon={<CheckCircle2 size={14} />}
            />

            <MultiSelect
              options={[
                { value: 'critical', label: 'Критический' },
                { value: 'high', label: 'Высокий' },
                { value: 'medium', label: 'Средний' },
                { value: 'low', label: 'Низкий' }
              ]}
              value={filterPriority}
              onChange={setFilterPriority}
              placeholder="Все приоритеты"
              icon={<Flag size={14} />}
            />
            
            {(filterStartDate || filterEndDate || filterDeadlineStart || filterDeadlineEnd || filterDepartment.length > 0 || filterAssignee.length > 0 || filterStatus.length > 0 || filterPriority.length > 0) && (
              <button 
                onClick={() => {
                  setFilterStartDate(''); setFilterEndDate(''); setFilterDeadlineStart(''); setFilterDeadlineEnd(''); setFilterDepartment([]); setFilterAssignee([]); setFilterStatus([]); setFilterPriority([]);
                }}
                className="text-sm text-red-500 hover:text-red-600 font-medium px-2"
              >
                Сбросить
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-3 space-y-8">
        {departments.map(department => {
          const depTasks = tasksByDepartment[department.id] || [];
          if (depTasks.length === 0 && search) return null; // Hide empty departments when searching
          
          const completedCount = depTasks.filter(t => {
            const status = statuses.find(s => s.id === t.status_id);
            return status?.is_closing;
          }).length;
          
          const activeCount = depTasks.length - completedCount;

          return (
            <div key={department.id} className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: department.color || '#ccc' }}></span>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{department.name}</h2>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">
                    Всего: {depTasks.length}
                  </span>
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                    В работе: {activeCount}
                  </span>
                  <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md">
                    Завершено: {completedCount}
                  </span>
                </div>
              </div>

              {depTasks.length === 0 ? (
                <div className="text-sm text-zinc-500 italic py-4">Нет задач</div>
              ) : viewMode === 'table' ? (
                <TaskTable tasks={depTasks} onTaskClick={setSelectedTask} />
              ) : viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {depTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-4">
                  {statuses.map(status => {
                    const columnTasks = depTasks.filter(t => t.status_id === status.id);
                    return (
                      <div 
                        key={status.id} 
                        className="w-80 shrink-0 flex flex-col"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-zinc-100', 'dark:bg-zinc-800/50');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-zinc-100', 'dark:bg-zinc-800/50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-zinc-100', 'dark:bg-zinc-800/50');
                          const taskId = e.dataTransfer.getData('taskId');
                          if (taskId) {
                            const task = tasks.find(t => t.id === taskId);
                            if (task && task.status_id !== status.id && task.department_id === department.id && canChangeStatus(task)) {
                              if (status.is_blocker) {
                                setBlockerTask({ task, status });
                              } else {
                                useTasksStore.getState().updateTask(taskId, { 
                                  status_id: status.id,
                                  has_blocker: false,
                                  blocker_reason: null
                                });
                                if (currentUser) {
                                  useTasksStore.getState().addTaskLog({
                                    id: Date.now().toString(),
                                    task_id: taskId,
                                    user_id: currentUser.id,
                                    user_name: currentUser.name,
                                    user_role: currentUser.role,
                                    action_type: 'STATUS_CHANGED',
                                    details: `Статус изменен на "${status.name}" (перетаскивание)`,
                                    created_at: new Date().toISOString()
                                  });
                                }
                              }
                            }
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></span>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">{status.name}</h3>
                            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                              {columnTasks.length}
                            </span>
                          </div>
                        </div>
                        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 space-y-3 border border-zinc-200/50 dark:border-zinc-800/50 transition-colors min-h-[150px]">
                          {columnTasks.map(task => {
                            const draggable = canChangeStatus(task);
                            return (
                            <div 
                              key={task.id}
                              draggable={draggable}
                              onDragStart={(e) => {
                                if (draggable) {
                                  e.dataTransfer.setData('taskId', task.id);
                                }
                              }}
                              className={draggable ? "cursor-grab active:cursor-grabbing" : "opacity-80"}
                            >
                              <TaskCard task={task} onClick={setSelectedTask} />
                            </div>
                            );
                          })}
                          {columnTasks.length === 0 && (
                            <div className="h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-sm text-zinc-400 pointer-events-none">
                              Перетащите сюда
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {blockerTask && (
        <BlockerModal
          task={blockerTask.task}
          status={blockerTask.status}
          onClose={() => setBlockerTask(null)}
          onSuccess={() => setBlockerTask(null)}
        />
      )}
    </div>
  );
};
