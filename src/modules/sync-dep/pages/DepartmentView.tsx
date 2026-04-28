import React, { useState, useMemo, useEffect } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../store/authStore';
import { useFilters } from '../hooks/useFilters';
import { MultiSelect } from '../components/ui/MultiSelect';
import { TaskCard } from '../components/ui/TaskCard';
import { TaskModal } from '../components/modals/TaskModal';
import { usePermissions } from '../hooks/usePermissions';
import { TaskFormModal } from '../components/modals/TaskFormModal';
import { MassTaskFormModal } from '../components/modals/MassTaskFormModal';
import { BlockerModal } from '../components/modals/BlockerModal';
import { EmptyState } from '../components/ui/EmptyState';
import { SyncDepTask, TaskStatus } from '../types/core.types';
import { Search, Filter, Plus, LayoutGrid, List, Users, Calendar, Table } from 'lucide-react';
import { TaskTable } from '../components/ui/TaskTable';
import { isPast, isToday } from 'date-fns';

export const DepartmentView: React.FC = () => {
  const { tasks, statuses, departments, users } = useTasksStore();
  const { currentUser } = useAuthStore();
  const { canMassEdit, canCreateTaskInAnyDepartment } = usePermissions();
  const { search, setSearch, statusIds, priorities, isOverdue, toggleOverdue, showArchived, toggleArchived } = useFilters();
  
  const allowedDepartments = useMemo(() => {
    return canCreateTaskInAnyDepartment ? departments : departments.filter(d => {
      const userDepIds = currentUser?.department_ids || (currentUser?.department_id ? [currentUser.department_id] : []);
      return userDepIds.includes(d.id);
    });
  }, [departments, currentUser, canCreateTaskInAnyDepartment]);

  const [selectedDepId, setSelectedDepId] = useState<string>('');
  
  useEffect(() => {
    if (allowedDepartments.length > 0 && !allowedDepartments.find(d => d.id === selectedDepId)) {
      setSelectedDepId(allowedDepartments[0].id);
    }
  }, [allowedDepartments, selectedDepId]);

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'table'>('kanban');
  const [selectedTask, setSelectedTask] = useState<SyncDepTask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMassFormOpen, setIsMassFormOpen] = useState(false);
  const [blockerTask, setBlockerTask] = useState<{task: SyncDepTask, status: TaskStatus} | null>(null);

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDeadlineStart, setFilterDeadlineStart] = useState('');
  const [filterDeadlineEnd, setFilterDeadlineEnd] = useState('');
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

  const selectedDepartment = useMemo(() => {
    return allowedDepartments.find(d => d.id === selectedDepId) || allowedDepartments[0];
  }, [allowedDepartments, selectedDepId]);

  const departmentUsers = useMemo(() => {
    return users.filter(u => {
      const uDepIds = u.department_ids || (u.department_id ? [u.department_id] : []);
      return uDepIds.includes(selectedDepartment?.id || '');
    });
  }, [users, selectedDepartment]);

  const filteredTasks = useMemo(() => {
    if (!selectedDepartment) return [];
    let filtered = tasks.filter(t => t.department_id === selectedDepartment.id);
    
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
        return t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline));
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
  }, [tasks, selectedDepartment, search, statusIds, priorities, isOverdue, statuses, showArchived, filterStartDate, filterEndDate, filterDeadlineStart, filterDeadlineEnd, filterAssignee, filterStatus, filterPriority]);

  if (!selectedDepartment) return null;

  return (
    <div className="w-full mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Отделы</h1>
            <select
              value={selectedDepartment.id}
              onChange={(e) => setSelectedDepId(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-white font-semibold rounded-xl px-3 py-1 focus:ring-2 focus:ring-primary/50"
              disabled={!canCreateTaskInAnyDepartment && allowedDepartments.length <= 1}
            >
              {allowedDepartments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2 text-sm">
              <Users size={16} />
              {departmentUsers.length} сотрудников в отделе
            </p>
            <div className="flex -space-x-2 overflow-hidden">
              {departmentUsers.slice(0, 5).map(user => (
                <div 
                  key={user.id}
                  title={user.name}
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-primary">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
              {departmentUsers.length > 5 && (
                <div className="flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500">
                  +{departmentUsers.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Поиск задач..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-64"
            />
          </div>
          
          <button 
            onClick={toggleOverdue}
            className={`px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${
              isOverdue 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            Просроченные
          </button>
          
          <button 
            onClick={toggleArchived}
            className={`px-3 py-2 border rounded-xl text-sm font-medium transition-colors ${
              showArchived 
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            В архиве
          </button>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-xl transition-colors ${
              showFilters 
                ? 'bg-primary/10 border-primary/20 text-primary' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Filter size={18} />
          </button>
          
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <List size={16} />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <Table size={16} />
            </button>
          </div>
          
          {canMassEdit && (
            <button 
              onClick={() => setIsMassFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Массовое добавление</span>
            </button>
          )}
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Создать</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-wrap gap-4">
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
            options={departmentUsers.map(u => ({ value: u.id, label: u.name || u.email || 'Неизвестно' }))}
            value={filterAssignee}
            onChange={setFilterAssignee}
            placeholder="Все исполнители"
            icon={<Users size={14} />}
          />

          <MultiSelect
            options={statuses.map(s => ({ value: s.id, label: s.name }))}
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="Все статусы"
            icon={<Filter size={14} />}
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
            icon={<Filter size={14} />}
          />
          
          {(filterStartDate || filterEndDate || filterDeadlineStart || filterDeadlineEnd || filterAssignee.length > 0 || filterStatus.length > 0 || filterPriority.length > 0) && (
            <button 
              onClick={() => {
                setFilterStartDate(''); setFilterEndDate(''); setFilterDeadlineStart(''); setFilterDeadlineEnd(''); setFilterAssignee([]); setFilterStatus([]); setFilterPriority([]);
              }}
              className="text-sm text-red-500 hover:text-red-600 font-medium px-2"
            >
              Сбросить
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {filteredTasks.length === 0 ? (
          <EmptyState 
            title="Нет задач" 
            description="В этом отделе пока нет задач или они не найдены по текущим фильтрам."
          />
        ) : viewMode === 'table' ? (
          <div className="pb-6">
            <TaskTable tasks={filteredTasks} onTaskClick={setSelectedTask} />
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
            ))}
          </div>
        ) : (
          <div className="flex gap-6 h-full pb-6 overflow-x-auto custom-scrollbar">
            {statuses.map(status => {
              const columnTasks = filteredTasks.filter(t => t.status_id === status.id);
              return (
                <div 
                  key={status.id} 
                  className="w-80 shrink-0 flex flex-col h-full"
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
                      if (task && task.status_id !== status.id && canChangeStatus(task)) {
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
                  <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl p-2 overflow-y-auto custom-scrollbar space-y-3 border border-zinc-200/50 dark:border-zinc-800/50 transition-colors">
                    {columnTasks.map(task => {
                      const draggable = canChangeStatus(task);
                      return (
                        <div 
                          key={task.id}
                          draggable={draggable}
                          onDragStart={(e) => {
                            if (!draggable) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('taskId', task.id);
                          }}
                          className={draggable ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-80"}
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
      
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
      
      {isFormOpen && (
        <TaskFormModal 
          onClose={() => setIsFormOpen(false)} 
          initialDepartmentId={selectedDepartment.id}
        />
      )}

      {isMassFormOpen && (
        <MassTaskFormModal 
          onClose={() => setIsMassFormOpen(false)} 
        />
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
