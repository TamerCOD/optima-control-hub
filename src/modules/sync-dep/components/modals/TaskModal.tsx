import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Edit2, Trash2, Archive, Send } from 'lucide-react';
import { SyncDepTask, TaskUpdate, ActionLog, TaskProgressUpdate, TaskBlocker } from '../../types/core.types';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { DeadlineLabel } from '../ui/DeadlineLabel';
import { UserAvatarStack } from '../ui/UserAvatarStack';
import { formatDate } from '../../utils/dates';
import { TaskFormModal } from './TaskFormModal';
import { db } from '../../../../firebase';

import { formatTaskId } from '../../utils/taskUtils';

interface Props {
  task: SyncDepTask;
  onClose: () => void;
}

export const TaskModal: React.FC<Props> = ({ task: initialTask, onClose }) => {
  const { tasks, statuses, users, departments, allUsers, deleteTask, updateTask, addTaskUpdate, addTaskLog } = useTasksStore();
  const { currentUser } = useAuthStore();
  
  const task = tasks.find(t => t.id === initialTask.id) || initialTask;
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

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history' | 'progress_updates' | 'blockers'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<TaskProgressUpdate[]>([]);
  const [blockers, setBlockers] = useState<TaskBlocker[]>([]);
  
  const [newComment, setNewComment] = useState('');
  const [newProgressUpdate, setNewProgressUpdate] = useState('');
  const [blockerReason, setBlockerReason] = useState('');
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  useEffect(() => {
    const unsubUpdates = db.collection('sync_dep_tasks').doc(task.id).collection('updates').orderBy('created_at', 'desc').onSnapshot(s => {
      setUpdates(s.docs.map(d => ({ ...d.data(), id: d.id } as TaskUpdate)));
    });
    const unsubLogs = db.collection('sync_dep_tasks').doc(task.id).collection('logs').orderBy('created_at', 'desc').onSnapshot(s => {
      setLogs(s.docs.map(d => ({ ...d.data(), id: d.id } as ActionLog)));
    });
    const unsubProgress = db.collection('sync_dep_tasks').doc(task.id).collection('progress_updates').orderBy('created_at', 'desc').onSnapshot(s => {
      setProgressUpdates(s.docs.map(d => ({ ...d.data(), id: d.id } as TaskProgressUpdate)));
    });
    const unsubBlockers = db.collection('sync_dep_tasks').doc(task.id).collection('blockers').orderBy('created_at', 'desc').onSnapshot(s => {
      setBlockers(s.docs.map(d => ({ ...d.data(), id: d.id } as TaskBlocker)));
    });
    return () => {
      unsubUpdates();
      unsubLogs();
      unsubProgress();
      unsubBlockers();
    };
  }, [task.id]);

  // Permissions
  const userDepartmentIds = currentUser?.department_ids || (currentUser?.department_id ? [currentUser.department_id] : []);
  const isSameDepartment = userDepartmentIds.includes(task.department_id);
  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator' && isSameDepartment;
  const isEmployee = currentUser?.role === 'employee' && isSameDepartment;
  const isAssignee = task.assignee_ids.includes(currentUser?.id || '');
  const isCreator = task.created_by === currentUser?.id;
  
  const canEdit = isAdmin || isModerator || isEmployee || isCreator || isAssignee;
  const canDelete = isAdmin || isModerator || isEmployee || isCreator || isAssignee;
  const canChangeStatus = isAdmin || isModerator || isEmployee || isCreator || isAssignee;
  const canComment = isAdmin || isSameDepartment || isCreator || isAssignee;

  const handleDelete = () => {
    if (!canDelete) return;
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      deleteTask(task.id);
      
      if (currentUser) {
        addTaskLog({
          id: Date.now().toString(),
          task_id: task.id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_role: currentUser.role,
          action_type: 'TASK_DELETED',
          details: `Задача "${task.title}" удалена`,
          created_at: new Date().toISOString()
        });
      }
      
      onClose();
    }
  };

  const handleArchive = () => {
    if (!canEdit) return;
    updateTask(task.id, { is_archived: !task.is_archived });
    
    if (currentUser) {
      addTaskLog({
        id: Date.now().toString(),
        task_id: task.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
        action_type: 'TASK_UPDATED',
        details: `Задача ${!task.is_archived ? 'отправлена в архив' : 'восстановлена из архива'}`,
        created_at: new Date().toISOString()
      });
    }
    
    onClose();
  };

  const handleStatusChange = (newStatusId: string) => {
    if (!canChangeStatus) return;
    const newStatus = statuses.find(s => s.id === newStatusId);
    if (!newStatus) return;

    if (newStatus.is_blocker) {
      setPendingStatusId(newStatusId);
      setShowBlockerModal(true);
      return;
    }

    applyStatusChange(newStatusId);
  };

  const applyStatusChange = (newStatusId: string, reason?: string) => {
    const newStatus = statuses.find(s => s.id === newStatusId);
    if (!newStatus) return;

    updateTask(task.id, { 
      status_id: newStatusId,
      has_blocker: newStatus.is_blocker,
      blocker_reason: reason || null
    });
    
    if (currentUser) {
      addTaskLog({
        id: Date.now().toString(),
        task_id: task.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
        action_type: 'STATUS_CHANGED',
        details: `Статус изменен на "${newStatus.name}"${reason ? `. Причина: ${reason}` : ''}`,
        created_at: new Date().toISOString()
      });

      if (newStatus.is_blocker && reason) {
        const blocker: TaskBlocker = {
          id: Date.now().toString(),
          task_id: task.id,
          author_id: currentUser.id,
          reason: reason,
          created_at: new Date().toISOString()
        };
        db.collection('sync_dep_tasks').doc(task.id).collection('blockers').doc(blocker.id).set(blocker);
      }
    }
  };

  const submitBlocker = () => {
    if (!blockerReason.trim() || !pendingStatusId) return;
    applyStatusChange(pendingStatusId, blockerReason.trim());
    setShowBlockerModal(false);
    setBlockerReason('');
    setPendingStatusId(null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || !canComment) return;

    const update: TaskUpdate = {
      id: Date.now().toString(),
      task_id: task.id,
      author_id: currentUser.id,
      text: newComment.trim(),
      created_at: new Date().toISOString()
    };

    try {
      await addTaskUpdate(update);
      
      await addTaskLog({
        id: Date.now().toString(),
        task_id: task.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
        action_type: 'UPDATE_ADDED',
        details: `Добавлен комментарий`,
        created_at: new Date().toISOString()
      });

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Ошибка при добавлении комментария. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleAddProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgressUpdate.trim() || !currentUser || !canComment) return;

    const update: TaskProgressUpdate = {
      id: Date.now().toString(),
      task_id: task.id,
      author_id: currentUser.id,
      text: newProgressUpdate.trim(),
      created_at: new Date().toISOString()
    };

    try {
      await db.collection('sync_dep_tasks').doc(task.id).collection('progress_updates').doc(update.id).set(update);
      
      await addTaskLog({
        id: Date.now().toString(),
        task_id: task.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_role: currentUser.role,
        action_type: 'UPDATE_ADDED',
        details: `Добавлен апдейт`,
        created_at: new Date().toISOString()
      });

      setNewProgressUpdate('');
    } catch (error) {
      console.error('Error adding progress update:', error);
      alert('Ошибка при добавлении апдейта. Пожалуйста, попробуйте еще раз.');
    }
  };

  if (isEditing) {
    return <TaskFormModal taskToEdit={task} onClose={() => setIsEditing(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{formatTaskId(task.id)}</span>
              
              {canChangeStatus ? (
                <select
                  value={task.status_id}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  style={{ color: status?.color }}
                >
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={status} />
              )}
              
              <PriorityBadge priority={task.priority} />
              {task.has_blocker && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                  <AlertTriangle size={12} />
                  Блокер
                </span>
              )}
              {task.is_archived && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                  <Archive size={12} />
                  В архиве
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-2 text-zinc-400 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Редактировать">
                  <Edit2 size={18} />
                </button>
                <button onClick={handleArchive} className="p-2 text-zinc-400 hover:text-orange-600 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title={task.is_archived ? "Разархивировать" : "В архив"}>
                  <Archive size={18} />
                </button>
              </>
            )}
            {canDelete && (
              <button onClick={handleDelete} className="p-2 text-zinc-400 hover:text-red-600 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors" title="Удалить">
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0 overflow-x-auto custom-scrollbar">
          {[
            { id: 'details', label: 'Детали' },
            { id: 'comments', label: `Комментарии (${task.updates_count || 0})` },
            { id: 'history', label: 'История' },
            { id: 'progress_updates', label: `Апдейты (${progressUpdates.length})` },
            { id: 'blockers', label: `Блокеры (${blockers.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Описание</h3>
                  <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {task.description || <span className="text-zinc-400 italic">Нет описания</span>}
                  </div>
                </div>

                {task.checklists && task.checklists.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Чек-листы</h3>
                    {task.checklists.map(checklist => (
                      <div key={checklist.id} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <h4 className="font-medium text-zinc-900 dark:text-white mb-3">{checklist.title}</h4>
                        <div className="space-y-2">
                          {checklist.items.map(item => (
                            <label key={item.id} className="flex items-start gap-3 group cursor-pointer">
                              <div className="relative flex items-center justify-center mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={item.is_completed}
                                  onChange={() => {
                                    if (!canEdit) return;
                                    const newChecklists = task.checklists!.map(c => 
                                      c.id === checklist.id 
                                        ? { ...c, items: c.items.map(i => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i) }
                                        : c
                                    );
                                    updateTask(task.id, { checklists: newChecklists });
                                    
                                    if (currentUser) {
                                      addTaskLog({
                                        id: Date.now().toString(),
                                        task_id: task.id,
                                        user_id: currentUser.id,
                                        user_name: currentUser.name,
                                        user_role: currentUser.role,
                                        action_type: 'TASK_UPDATED',
                                        details: `Чек-лист "${checklist.title}": пункт "${item.text}" ${!item.is_completed ? 'выполнен' : 'отменен'}`,
                                        created_at: new Date().toISOString()
                                      });
                                    }
                                  }}
                                  disabled={!canEdit}
                                  className="peer sr-only"
                                />
                                <div className="w-5 h-5 rounded border-2 border-zinc-300 dark:border-zinc-600 peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/50 transition-all flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                              <span className={`text-sm transition-colors ${item.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Отдел</span>
                    <div className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: department?.color || '#ccc' }}></span>
                      {department?.name || 'Не указан'}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Исполнители</span>
                    <div className="flex items-center gap-2 mt-1">
                      <UserAvatarStack users={assignees} max={5} size="md" />
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Дедлайн</span>
                    <DeadlineLabel date={task.deadline} isClosing={status?.is_closing} />
                  </div>
                  
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Создатель</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-medium overflow-hidden">
                        {creator ? (((creator as any).avatar_url || (creator as any).avatar) ? <img src={(creator as any).avatar_url || (creator as any).avatar} alt="Creator avatar" className="w-full h-full object-cover" /> : creator.name[0]) : '?'}
                      </div>
                      <span className="text-sm text-zinc-900 dark:text-white">{creator?.name || 'Неизвестно'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Создано</span>
                    <span className="text-sm text-zinc-900 dark:text-white">{formatDate(task.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'comments' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {updates.length === 0 ? (
                  <div className="text-center text-zinc-500 italic py-8">Нет комментариев</div>
                ) : (
                  updates.map(update => {
                    const author = users.find(u => u.id === update.author_id);
                    return (
                      <div key={update.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium shrink-0">
                          {author ? (author.avatar_url ? <img src={author.avatar_url} alt="Author avatar" className="w-full h-full rounded-full" /> : author.name[0]) : '?'}
                        </div>
                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{author?.name || 'Неизвестно'}</span>
                            <span className="text-xs text-zinc-500">{formatDate(update.created_at)}</span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{update.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {canComment && (
                <form onSubmit={handleAddComment} className="flex gap-2 shrink-0 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Написать комментарий..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim()}
                    className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </form>
              )}
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="text-center text-zinc-500 italic py-8">История пуста</div>
                ) : (
                  <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-3 space-y-6">
                    {logs.map(log => (
                      <div key={log.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900"></div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                          <span className="font-medium text-zinc-900 dark:text-white">{log.user_name}</span>
                          {' '}{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{formatDate(log.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'progress_updates' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {progressUpdates.length === 0 ? (
                  <div className="text-center text-zinc-500 italic py-8">Апдейтов пока нет</div>
                ) : (
                  progressUpdates.map(update => {
                    const author = users.find(u => u.id === update.author_id);
                    return (
                      <div key={update.id} className="flex gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                          {author?.name.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-zinc-900 dark:text-white">{author?.name || 'Неизвестный'}</span>
                            <span className="text-xs text-zinc-500">{formatDate(update.created_at)}</span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{update.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {canComment && (
                <form onSubmit={handleAddProgressUpdate} className="flex gap-2 shrink-0 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <input
                    type="text"
                    value={newProgressUpdate}
                    onChange={(e) => setNewProgressUpdate(e.target.value)}
                    placeholder="Добавить апдейт..."
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button 
                    type="submit"
                    disabled={!newProgressUpdate.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium text-sm"
                  >
                    Добавить
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'blockers' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {blockers.length === 0 ? (
                  <div className="text-center text-zinc-500 italic py-8">Блокеров не зафиксировано</div>
                ) : (
                  blockers.map(blocker => {
                    const author = users.find(u => u.id === blocker.author_id);
                    return (
                      <div key={blocker.id} className="flex gap-3 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-medium shrink-0">
                          <AlertTriangle size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-red-900 dark:text-red-400">{author?.name || 'Неизвестный'}</span>
                            <span className="text-xs text-red-500/70 dark:text-red-400/70">{formatDate(blocker.created_at)}</span>
                          </div>
                          <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{blocker.reason}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer actions */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Закрыть
          </button>
          {canEdit && (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors">
              Редактировать
            </button>
          )}
          {canChangeStatus && !status?.is_closing && (
            <button 
              onClick={() => {
                const closingStatus = statuses.find(s => s.is_closing);
                if (closingStatus) {
                  handleStatusChange(closingStatus.id);
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Завершить
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-[70] bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={20} />
          <span className="font-medium">Задача закрыта</span>
        </div>
      )}

      {/* Blocker Modal */}
      {showBlockerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-3">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowBlockerModal(false); setPendingStatusId(null); }}></div>
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden p-3">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Укажите причину блокера</h3>
            <textarea
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              placeholder="Почему задача заблокирована?"
              className="w-full h-32 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowBlockerModal(false); setPendingStatusId(null); }}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={submitBlocker}
                disabled={!blockerReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
