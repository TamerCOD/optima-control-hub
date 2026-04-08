import React, { useState } from 'react';
import { X, Plus, Save, Trash2, Loader2 } from 'lucide-react';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { SyncDepTask, TaskChecklist } from '../../types/core.types';
import { PRIORITIES } from '../../constants';

import { generateUniqueTaskId } from '../../utils/taskUtils';

interface Props {
  onClose: () => void;
  initialDepartmentId?: string;
  taskToEdit?: SyncDepTask;
}

export const TaskFormModal: React.FC<Props> = ({ onClose, initialDepartmentId, taskToEdit }) => {
  const { departments, users, addTask, updateTask, addTaskLog, statuses, tasks } = useTasksStore();
  const { currentUser } = useAuthStore();
  const { canCreateTaskInAnyDepartment } = usePermissions();
  
  const allowedDepartments = canCreateTaskInAnyDepartment ? departments : departments.filter(d => {
    const userDepIds = currentUser?.department_ids || (currentUser?.department_id ? [currentUser.department_id] : []);
    return userDepIds.includes(d.id);
  });
  
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [departmentId, setDepartmentId] = useState(taskToEdit?.department_id || initialDepartmentId || allowedDepartments[0]?.id || '');
  const [priority, setPriority] = useState(taskToEdit?.priority || 'medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(taskToEdit?.assignee_ids || (currentUser ? [currentUser.id] : []));
  const [deadline, setDeadline] = useState(taskToEdit?.deadline || '');
  const [checklists, setChecklists] = useState<TaskChecklist[]>(taskToEdit?.checklists || []);

  const getAllowedFridays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    let daysToFriday = 5 - dayOfWeek;
    if (dayOfWeek === 6) {
      daysToFriday = -1;
    }
    
    const currentFriday = new Date(today);
    currentFriday.setDate(today.getDate() + daysToFriday);
    
    const minFriday = new Date(currentFriday);
    minFriday.setDate(currentFriday.getDate() - 14);
    
    const maxFriday = new Date(currentFriday);
    maxFriday.setDate(currentFriday.getDate() + 56);
    
    return {
      min: minFriday.toISOString().split('T')[0],
      max: maxFriday.toISOString().split('T')[0]
    };
  };

  const { min: minDate, max: maxDate } = getAllowedFridays();

  const availableUsers = users.filter(u => {
    const uDepIds = u.department_ids || (u.department_id ? [u.department_id] : []);
    return uDepIds.includes(departmentId);
  });

  const handleAddChecklist = () => {
    setChecklists([...checklists, { id: `cl_${Date.now()}`, title: 'Новый чек-лист', items: [] }]);
  };

  const handleUpdateChecklistTitle = (id: string, title: string) => {
    setChecklists(checklists.map(cl => cl.id === id ? { ...cl, title } : cl));
  };

  const handleRemoveChecklist = (id: string) => {
    setChecklists(checklists.filter(cl => cl.id !== id));
  };

  const handleAddChecklistItem = (checklistId: string) => {
    setChecklists(checklists.map(cl => 
      cl.id === checklistId 
        ? { ...cl, items: [...cl.items, { id: `cli_${Date.now()}`, text: '', is_completed: false }] }
        : cl
    ));
  };

  const handleUpdateChecklistItem = (checklistId: string, itemId: string, text: string) => {
    setChecklists(checklists.map(cl => 
      cl.id === checklistId 
        ? { ...cl, items: cl.items.map(item => item.id === itemId ? { ...item, text } : item) }
        : cl
    ));
  };

  const handleRemoveChecklistItem = (checklistId: string, itemId: string) => {
    setChecklists(checklists.map(cl => 
      cl.id === checklistId 
        ? { ...cl, items: cl.items.filter(item => item.id !== itemId) }
        : cl
    ));
  };

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Название задачи обязательно');
      return;
    }

    if (!departmentId) {
      setError('Выберите отдел');
      return;
    }

    const selectedDep = departments.find(d => d.id === departmentId);
    if (!selectedDep) {
      setError('Выбранный отдел не существует или был удален');
      return;
    }

    if (assigneeIds.length > 0) {
      const invalidAssignees = assigneeIds.filter(id => !users.find(u => u.id === id));
      if (invalidAssignees.length > 0) {
        setError('Один или несколько выбранных исполнителей не найдены в системе');
        return;
      }
      
      const wrongDepartmentAssignees = assigneeIds.filter(id => {
        const user = users.find(u => u.id === id);
        if (!user) return false;
        const uDepIds = user.department_ids || (user.department_id ? [user.department_id] : []);
        return !uDepIds.includes(departmentId);
      });
      
      if (wrongDepartmentAssignees.length > 0) {
        setError('Все исполнители должны принадлежать к выбранному отделу задачи');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (taskToEdit) {
        await updateTask(taskToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          priority: priority as any,
          deadline: deadline || undefined,
          department_id: departmentId,
          assignee_ids: assigneeIds,
          checklists: checklists.map(cl => ({
            ...cl,
            items: cl.items.filter(item => item.text.trim() !== '')
          })).filter(cl => cl.title.trim() !== '' || cl.items.length > 0),
          updated_at: new Date().toISOString()
        });
        
        if (currentUser) {
          await addTaskLog({
            id: Date.now().toString(),
            task_id: taskToEdit.id,
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_role: currentUser.role,
            action_type: 'TASK_UPDATED',
            details: `Задача отредактирована`,
            created_at: new Date().toISOString()
          });
        }
      } else {
        const defaultStatus = statuses.find(s => s.is_default) || statuses[0];
        const newTaskId = generateUniqueTaskId(departmentId, tasks, departments);

        const newTask: SyncDepTask = {
          id: newTaskId,
          title: title.trim(),
          description: description.trim(),
          status_id: defaultStatus?.id || 's1',
          priority: priority as any,
          deadline: deadline || undefined,
          department_id: departmentId,
          assignee_ids: assigneeIds,
          created_by: currentUser?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          has_blocker: false,
          comments_count: 0,
          attachments_count: 0,
          checklists: checklists.map(cl => ({
            ...cl,
            items: cl.items.filter(item => item.text.trim() !== '')
          })).filter(cl => cl.title.trim() !== '' || cl.items.length > 0),
          tags: [],
          linked_task_ids: [],
          is_archived: false,
          updates_count: 0,
          is_overdue: false,
        };
        await addTask(newTask);
        
        if (currentUser) {
          await addTaskLog({
            id: Date.now().toString(),
            task_id: newTask.id,
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_role: currentUser.role,
            action_type: 'TASK_CREATED',
            details: `Задача создана`,
            created_at: new Date().toISOString()
          });
        }
      }
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Произошла ошибка при сохранении задачи. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{taskToEdit ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Название задачи <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Кратко и понятно..."
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Описание</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-y"
                placeholder="Подробности, ссылки, контекст..."
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Отдел <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={departmentId}
                  onChange={e => {
                    setDepartmentId(e.target.value);
                    setAssigneeIds([]); // Reset assignees when department changes
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isSubmitting || (!canCreateTaskInAnyDepartment && allowedDepartments.length <= 1)}
                >
                  <option value="" disabled>Выберите отдел</option>
                  {allowedDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Приоритет</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isSubmitting}
                >
                  {PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Дедлайн (только пятницы)</label>
                <input 
                  type="date" 
                  value={deadline}
                  min={minDate}
                  max={maxDate}
                  step="7"
                  onChange={e => {
                    const val = e.target.value;
                    if (val) {
                      const selectedDate = new Date(val);
                      if (selectedDate.getDay() !== 5) {
                        alert('Пожалуйста, выберите пятницу (день синха).');
                        return;
                      }
                    }
                    setDeadline(val);
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Исполнители</label>
                <select 
                  multiple
                  value={assigneeIds}
                  onChange={e => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setAssigneeIds(options);
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 h-[120px]"
                  disabled={isSubmitting}
                >
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">Зажмите Ctrl/Cmd для выбора нескольких</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Чек-листы</label>
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  disabled={isSubmitting}
                  className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <Plus size={16} />
                  Добавить чек-лист
                </button>
              </div>
              
              {checklists.map(checklist => (
                <div key={checklist.id} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={checklist.title}
                      onChange={e => handleUpdateChecklistTitle(checklist.id, e.target.value)}
                      placeholder="Название чек-листа"
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(checklist.id)}
                      disabled={isSubmitting}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 pl-2">
                    {checklist.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border-2 border-zinc-300 dark:border-zinc-600 shrink-0" />
                        <input
                          type="text"
                          value={item.text}
                          onChange={e => handleUpdateChecklistItem(checklist.id, item.id, e.target.value)}
                          placeholder="Пункт чек-листа"
                          className="flex-1 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(checklist.id, item.id)}
                          disabled={isSubmitting}
                          className="p-1 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddChecklistItem(checklist.id)}
                      disabled={isSubmitting}
                      className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium flex items-center gap-1 mt-2 disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Добавить пункт
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-end gap-3 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !title.trim() || !departmentId}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                taskToEdit ? <Save size={16} /> : <Plus size={16} />
              )}
              {taskToEdit ? 'Сохранить' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
