import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { SyncDepTask } from '../../types/core.types';

import { generateUniqueTaskId } from '../../utils/taskUtils';

interface Props {
  onClose: () => void;
}

export const MassTaskFormModal: React.FC<Props> = ({ onClose }) => {
  const { departments, users, addTask, addTaskLog, statuses, tasks: existingTasks } = useTasksStore();
  const { currentUser } = useAuthStore();
  const { canCreateTaskInAnyDepartment } = usePermissions();
  
  const allowedDepartments = canCreateTaskInAnyDepartment ? departments : departments.filter(d => {
    const userDepIds = currentUser?.department_ids || (currentUser?.department_id ? [currentUser.department_id] : []);
    return userDepIds.includes(d.id);
  });
  
  const [tasks, setTasks] = useState([{ title: '', description: '', departmentId: allowedDepartments[0]?.id || '', assigneeIds: currentUser ? [currentUser.id] : [] }]);

  const handleAddTaskRow = () => {
    setTasks([...tasks, { title: '', description: '', departmentId: allowedDepartments[0]?.id || '', assigneeIds: currentUser ? [currentUser.id] : [] }]);
  };

  const handleRemoveTaskRow = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    
    // Reset assignees if department changes
    if (field === 'departmentId') {
      newTasks[index].assigneeIds = [];
    }
    
    setTasks(newTasks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const departmentOffsets: Record<string, number> = {};

    tasks.forEach(task => {
      if (!task.title.trim() || !task.departmentId) return;

      const defaultStatus = statuses.find(s => s.is_default) || statuses[0];
      
      const currentOffset = departmentOffsets[task.departmentId] || 0;
      const newTaskId = generateUniqueTaskId(task.departmentId, existingTasks, departments, currentOffset);
      departmentOffsets[task.departmentId] = currentOffset + 1;

      const newTask: SyncDepTask = {
        id: newTaskId,
        title: task.title.trim(),
        description: task.description.trim(),
        status_id: defaultStatus?.id || 's1',
        priority: 'medium',
        department_id: task.departmentId,
        assignee_ids: task.assigneeIds,
        created_by: currentUser?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_blocker: false,
        comments_count: 0,
        attachments_count: 0,
        checklists: [],
        tags: [],
        linked_task_ids: [],
        is_archived: false,
        updates_count: 0,
        is_overdue: false,
      };

      addTask(newTask);
      
      if (currentUser) {
        addTaskLog({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          task_id: newTask.id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_role: currentUser.role,
          action_type: 'TASK_CREATED',
          details: `Задача создана (массовое добавление)`,
          created_at: new Date().toISOString()
        });
      }
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Массовое добавление задач</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
            {tasks.map((task, index) => {
              const availableUsers = users.filter(u => {
                const uDepIds = u.department_ids || (u.department_id ? [u.department_id] : []);
                return uDepIds.includes(task.departmentId);
              });
              return (
              <div key={index} className="flex flex-col md:flex-row gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 relative">
                <div className="flex-1 space-y-4">
                  <div>
                    <input 
                      type="text" 
                      required
                      value={task.title}
                      onChange={e => handleChange(index, 'title', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Название задачи *"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      value={task.description}
                      onChange={e => handleChange(index, 'description', e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Описание"
                    />
                  </div>
                </div>
                <div className="w-full md:w-64 space-y-4">
                  <select 
                    required
                    value={task.departmentId}
                    onChange={e => handleChange(index, 'departmentId', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={!canCreateTaskInAnyDepartment && allowedDepartments.length <= 1}
                  >
                    <option value="" disabled>Отдел *</option>
                    {allowedDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select 
                    multiple
                    value={task.assigneeIds}
                    onChange={e => handleChange(index, 'assigneeIds', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    size={3}
                  >
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                {tasks.length > 1 && (
                  <button type="button" onClick={() => handleRemoveTaskRow(index)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )})}
            
            <button 
              type="button" 
              onClick={handleAddTaskRow}
              className="flex items-center gap-2 text-primary font-medium text-sm hover:underline"
            >
              <Plus size={16} /> Добавить еще задачу
            </button>
          </div>

          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm shadow-primary/20"
            >
              Создать задачи
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
