import React, { useMemo, useState } from 'react';
import { 
    Clock,
    Plus, X,
    CheckCircle2,
    MessageSquare, Activity, ArrowRight
} from 'lucide-react';
import { ProjectTask, User, Project, TaskSettings, TaskComment, TaskUpdate, TaskUpdateEntry } from '../../types';

interface Props {
    tasks: ProjectTask[];
    users: User[];
    projects: Project[];
    taskSettings: TaskSettings;
    currentUser: User;
    onSelectTask: (id: string) => void;
    onUpdateTask: (task: ProjectTask) => void;
}

const TaskBoardView: React.FC<Props> = ({ 
    tasks, users, projects, taskSettings, currentUser, onSelectTask, onUpdateTask 
}) => {
    const [showCompleted, setShowCompleted] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<'status' | 'project' | 'priority'>('status');
    const [pendingTransition, setPendingTransition] = useState<{
        task: ProjectTask;
        toStatus: string;
        requireComment: boolean;
        requireUpdate: boolean;
        commentText: string;
        updateText: string;
    } | null>(null);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!showCompleted && t.completedAt) {
                const completedDate = new Date(t.completedAt);
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                if (completedDate < twoDaysAgo) return false;
            }
            return true;
        });
    }, [tasks, showCompleted]);

    const allStatuses = useMemo(() => {
        return taskSettings.statuses || [];
    }, [taskSettings.statuses]);

    const columns = useMemo(() => {
        if (groupBy === 'status') return allStatuses.map(s => ({ id: s.id, label: s.label, color: s.color }));
        if (groupBy === 'project') return projects.map(p => ({ id: p.id, label: p.name, color: p.color }));
        if (groupBy === 'priority') return taskSettings.priorities.map(p => ({ id: p.id, label: p.label, color: p.color }));
        return [];
    }, [groupBy, allStatuses, projects, taskSettings.priorities]);

    const getStatus = (id: string) => allStatuses.find(s => s.id === id) || { label: '?', color: '#ccc' };
    const getPriority = (id: string) => taskSettings.priorities.find(p => p.id === id) || { label: '?', emoji: '⚪', color: '#ccc' };
    const getType = (id: string) => taskSettings.taskTypes.find(t => t.id === id) || { label: '?', emoji: '📄' };

    const getPermissions = (task: ProjectTask) => {
        const project = projects.find(p => p.id === task.projectId);
        const defaultPerms = {
            canEditTask: false,
            canCreateTask: false,
            canChangeStatus: false,
            canAddUpdate: false,
            canDeleteTask: false,
            canEditFields: false
        };
        if (!project) return { ...defaultPerms, canEditTask: true, canCreateTask: true, canChangeStatus: true, canAddUpdate: true, canDeleteTask: true, canEditFields: true };
        if (currentUser.roles.includes('admin') || project.adminIds?.includes(currentUser.id)) {
            return { ...defaultPerms, canEditTask: true, canCreateTask: true, canChangeStatus: true, canAddUpdate: true, canDeleteTask: true, canEditFields: true };
        }
        
        const memberConfig = project.memberConfigs?.find(c => c.userId === currentUser.id);
        if (memberConfig?.roleId && project.projectRoles) {
            const role = project.projectRoles.find(r => r.id === memberConfig.roleId);
            if (role) return role.permissions;
        }
        
        return defaultPerms;
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        
        const perms = getPermissions(task);
        if (groupBy === 'status' && !perms.canChangeStatus) {
            e.preventDefault();
            return;
        }
        if ((groupBy === 'project' || groupBy === 'priority') && !perms.canEditFields) {
            e.preventDefault();
            return;
        }

        setDraggedTaskId(id);
        e.dataTransfer.setData('taskId', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const perms = getPermissions(task);

        let updates: Partial<ProjectTask> = { updatedAt: new Date().toISOString() };
        
        if (groupBy === 'status' && task.status !== colId) {
            if (!perms.canChangeStatus) {
                alert('У вас нет прав на изменение статуса этой задачи.');
                setDraggedTaskId(null);
                return;
            }
            const project = projects.find(p => p.id === task.projectId);
            const activeWorkflow = project?.workflowId 
                ? taskSettings.workflows?.find(w => w.id === project.workflowId) 
                : null;

            if (activeWorkflow && activeWorkflow.transitions && activeWorkflow.transitions.length > 0) {
                const allowedNextStatuses = activeWorkflow.transitions
                    .filter(wf => wf.fromStatus.length === 0 || wf.fromStatus.includes(task.status))
                    .map(wf => wf.toStatus);
                
                if (!allowedNextStatuses.includes(colId)) {
                    alert(`Переход из статуса "${getStatus(task.status).label}" в "${getStatus(colId).label}" запрещен бизнес-процессом.`);
                    setDraggedTaskId(null);
                    return;
                }

                const transition = activeWorkflow.transitions.find(t => 
                    (t.fromStatus.length === 0 || t.fromStatus.includes(task.status)) && 
                    t.toStatus === colId
                );

                if (transition && (transition.requireComment || transition.requireUpdate)) {
                    setPendingTransition({
                        task,
                        toStatus: colId,
                        requireComment: !!transition.requireComment,
                        requireUpdate: !!transition.requireUpdate,
                        commentText: '',
                        updateText: ''
                    });
                    setDraggedTaskId(null);
                    return;
                }
            }

            const newStatus = allStatuses.find(s => s.id === colId);
            if (newStatus?.isBlocker) {
                const reason = window.prompt('Укажите причину блокировки (обязательно):');
                if (!reason) {
                    setDraggedTaskId(null);
                    return; // Cancel drop if no reason provided
                }
                updates.blockerReason = reason;
            }
            updates.status = colId;
        } else if (groupBy === 'project' && task.projectId !== colId) {
            if (!perms.canEditFields) {
                alert('У вас нет прав на изменение проекта этой задачи.');
                setDraggedTaskId(null);
                return;
            }
            updates.projectId = colId;
        } else if (groupBy === 'priority' && task.priority !== colId) {
            if (!perms.canEditFields) {
                alert('У вас нет прав на изменение приоритета этой задачи.');
                setDraggedTaskId(null);
                return;
            }
            updates.priority = colId;
        }

        if (Object.keys(updates).length > 1) { // updatedAt is always there
             onUpdateTask({ ...task, ...updates });
        }
        setDraggedTaskId(null);
    };

    const confirmTransition = () => {
        if (!pendingTransition) return;
        
        if (pendingTransition.requireComment && !pendingTransition.commentText.trim()) {
            alert('Пожалуйста, добавьте обязательный комментарий.');
            return;
        }
        if (pendingTransition.requireUpdate && !pendingTransition.updateText.trim()) {
            alert('Пожалуйста, добавьте обязательный апдейт.');
            return;
        }

        const updatedTask = { ...pendingTransition.task, status: pendingTransition.toStatus, updatedAt: new Date().toISOString() };
        
        if (pendingTransition.commentText.trim()) {
            const comment: TaskComment = {
                id: `c_${Date.now()}`,
                taskId: pendingTransition.task.id,
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar || '',
                text: pendingTransition.commentText,
                createdAt: new Date().toISOString(),
                reactions: {}
            };
            updatedTask.comments = [...(updatedTask.comments || []), comment];
        }

        if (pendingTransition.updateText.trim()) {
            const updateEntry: TaskUpdateEntry = {
                id: `upd_${Date.now()}`,
                number: (updatedTask.updates?.length || 0) + 1,
                text: pendingTransition.updateText,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.name
            };
            updatedTask.updates = [...(updatedTask.updates || []), updateEntry];
        }

        onUpdateTask(updatedTask);
        setPendingTransition(null);
    };

    const getCountdown = (endDate: string | null) => {
        if (!endDate) return null;
        const end = new Date(endDate).getTime();
        const now = new Date().getTime();
        const diff = end - now;
        if (diff < 0) return { text: 'ПРОСРОЧЕНО', isOverdue: true };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return { text: `${days}д`, isOverdue: false };
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between px-4 items-center">
                <div className="flex items-center gap-2 glass-panel p-1.5">
                    <button onClick={() => setGroupBy('status')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${groupBy === 'status' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Статус</button>
                    <button onClick={() => setGroupBy('project')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${groupBy === 'project' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Проект</button>
                    <button onClick={() => setGroupBy('priority')} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${groupBy === 'priority' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Приоритет</button>
                </div>
                <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`btn-3d flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest ${showCompleted ? 'bg-primary text-white' : 'glass-panel text-zinc-500'}`}
                >
                    {showCompleted ? <CheckCircle2 size={16} /> : <X size={16} />}
                    {showCompleted ? 'Скрыть старые завершенные' : 'Показать все завершенные'}
                </button>
            </div>
            <div className="flex gap-6 h-full overflow-x-auto custom-scrollbar pb-6 animate-fade-in px-2">
                {columns.map(col => {
                    const columnTasks = filteredTasks.filter(t => {
                        if (groupBy === 'status') return t.status === col.id;
                        if (groupBy === 'project') return t.projectId === col.id;
                        if (groupBy === 'priority') return t.priority === col.id;
                        return false;
                    });
                    return (
                        <div 
                            key={col.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className="flex flex-col w-[340px] shrink-0 glass-panel overflow-hidden"
                        >
                            <div className="p-3 flex items-center justify-between border-b dark:border-zinc-800/50 bg-white/30 dark:bg-zinc-800/30 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: col.color }}></div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">{col.label}</h3>
                                    <span className="bg-white dark:bg-zinc-800 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">{columnTasks.length}</span>
                                </div>
                                <button className="btn-3d p-2 text-zinc-400 hover:text-primary transition-all">
                                    <Plus size={18}/>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                                {columnTasks.map(task => {
                                    const priority = getPriority(task.priority);
                                    const type = getType(task.type);
                                    const project = projects.find(p => p.id === task.projectId);
                                    const assignee = users.find(u => u.id === task.assigneeId);
                                    const countdown = getCountdown(task.endDate);

                                    return (
                                        <div 
                                            key={task.id}
                                            draggable={
                                                (groupBy === 'status' && getPermissions(task).canChangeStatus) ||
                                                ((groupBy === 'project' || groupBy === 'priority') && getPermissions(task).canEditFields)
                                            }
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onClick={() => onSelectTask(task.id)}
                                            className={`glass-panel p-3 hover:border-primary/50 transition-all cursor-pointer group animate-fade-in ${draggedTaskId === task.id ? 'opacity-50 scale-95' : ''} ${!((groupBy === 'status' && getPermissions(task).canChangeStatus) || ((groupBy === 'project' || groupBy === 'priority') && getPermissions(task).canEditFields)) ? 'cursor-not-allowed opacity-80' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-primary transition-colors">{task.key}</span>
                                                <div className="flex items-center gap-2 glass-panel px-2 py-1">
                                                    <span className="text-sm drop-shadow-sm">{priority.emoji}</span>
                                                    <span className="text-sm drop-shadow-sm">{type.emoji}</span>
                                                </div>
                                            </div>
                                            <h4 className="text-sm font-bold uppercase mb-5 leading-snug text-zinc-800 dark:text-zinc-100 line-clamp-2">{task.title}</h4>
                                            
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 glass-panel">
                                                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project?.color || '#ccc' }}></div>
                                                    <span className="text-[9px] font-bold uppercase text-zinc-600 dark:text-zinc-400">{project?.name || '—'}</span>
                                                </div>
                                                {task.tags?.map(tag => (
                                                    <span key={tag} className="px-2.5 py-1.5 glass-panel text-zinc-600 dark:text-zinc-400 text-[9px] font-bold uppercase shadow-sm">#{tag}</span>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t dark:border-zinc-800/50">
                                                <div className="flex items-center gap-2">
                                                    {assignee ? (
                                                        <img src={assignee.avatar} className="w-8 h-8 rounded-full object-cover border border-white/40 dark:border-zinc-600 shadow-sm" title={assignee.name} alt={assignee.name} />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full glass-panel flex items-center justify-center text-[10px] font-bold text-zinc-400">?</div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {task.endDate && !task.completedAt && (
                                                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${countdown?.isOverdue ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                            <Clock size={12} />
                                                            {countdown?.text}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                                        <MessageSquare size={12} />
                                                        {task.comments?.length || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {columnTasks.length === 0 && (
                                    <div className="h-32 border border-dashed border-white/30 dark:border-zinc-700/50 rounded-3xl flex items-center justify-center text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Пусто</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Transition Modal */}
            {pendingTransition && (
                <div className="fixed inset-0 z-[60] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl border-2 border-zinc-100 dark:border-zinc-800">
                        <div className="p-3 border-b-2 border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Смена статуса</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase">
                                    Переход в статус: {allStatuses.find(s => s.id === pendingTransition.toStatus)?.label}
                                </p>
                            </div>
                            <button onClick={() => setPendingTransition(null)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-3 space-y-6">
                            {pendingTransition.requireComment && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                                        <MessageSquare size={14}/> Обязательный комментарий
                                    </label>
                                    <textarea 
                                        value={pendingTransition.commentText}
                                        onChange={e => setPendingTransition({ ...pendingTransition, commentText: e.target.value })}
                                        placeholder="Напишите комментарий..."
                                        className="w-full h-24 p-3 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all resize-none"
                                    />
                                </div>
                            )}
                            {pendingTransition.requireUpdate && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                                        <Activity size={14}/> Обязательный апдейт
                                    </label>
                                    <textarea 
                                        value={pendingTransition.updateText}
                                        onChange={e => setPendingTransition({ ...pendingTransition, updateText: e.target.value })}
                                        placeholder="Напишите апдейт..."
                                        className="w-full h-24 p-3 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all resize-none"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                            <button onClick={() => setPendingTransition(null)} className="px-6 py-3 rounded-xl text-xs font-black uppercase text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
                            <button onClick={confirmTransition} className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                                Подтвердить <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskBoardView;
