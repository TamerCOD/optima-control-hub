import React, { useState } from 'react';
import { SyncDepTask, TaskStatus, TaskBlocker } from '../../types/core.types';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../../../firebase';

interface Props {
  task: SyncDepTask;
  status: TaskStatus;
  onClose: () => void;
  onSuccess: () => void;
}

export const BlockerModal: React.FC<Props> = ({ task, status, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const { updateTask, addTaskLog } = useTasksStore();
  const { currentUser } = useAuthStore();

  const handleSubmit = () => {
    if (!reason.trim() || !currentUser) return;

    updateTask(task.id, { 
      status_id: status.id,
      has_blocker: true,
      blocker_reason: reason.trim()
    });
    
    addTaskLog({
      id: Date.now().toString(),
      task_id: task.id,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      action_type: 'STATUS_CHANGED',
      details: `Статус изменен на "${status.name}". Причина: ${reason.trim()}`,
      created_at: new Date().toISOString()
    });

    const blocker: TaskBlocker = {
      id: Date.now().toString(),
      task_id: task.id,
      author_id: currentUser.id,
      reason: reason.trim(),
      created_at: new Date().toISOString()
    };
    db.collection('sync_dep_tasks').doc(task.id).collection('blockers').doc(blocker.id).set(blocker);

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden p-3">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Укажите причину блокера</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Почему задача заблокирована?"
          className="w-full h-32 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
