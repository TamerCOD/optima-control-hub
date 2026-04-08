import React, { useState, useMemo, useEffect } from 'react';
import { 
    X, Save, Trash2, 
    Plus, MessageSquare, Paperclip, History, Send,
    Layers, ArrowRight, Activity,
    AlertCircle, CheckCircle2, ChevronRight,
    Square, Reply, Smile,
    FileText, ClipboardList
} from 'lucide-react';
import { 
    ProjectTask, User, Project, TaskSettings, 
    TaskComment, TaskChecklistItem,
    TaskUpdate
} from '../../types';

interface Props {
    taskId?: string;
    isNew?: boolean;
    tasks: ProjectTask[];
    users: User[];
    projects: Project[];
    taskSettings: TaskSettings;
    currentUser: User;
    onClose: () => void;
    onUpdateTask?: (task: ProjectTask) => void;
    onCreateTask?: (task: ProjectTask) => void;
    onDeleteTask?: (id: string) => void;
}

const TaskDetailModal: React.FC<Props> = ({ 
    taskId, isNew, tasks, users, projects, taskSettings, 
    currentUser, onClose, onUpdateTask, onCreateTask, onDeleteTask 
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments' | 'history' | 'updates'>('details');
    const [task, setTask] = useState<ProjectTask | null>(null);
    const [newComment, setNewComment] = useState('');
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [newUpdateText, setNewUpdateText] = useState('');
    const [pendingTransition, setPendingTransition] = useState<{
        toStatus: string;
        requireComment: boolean;
        requireUpdate: boolean;
        commentText: string;
        updateText: string;
    } | null>(null);

    const project = useMemo(() => projects.find(p => p.id === task?.projectId), [projects, task?.projectId]);
    const activeStatuses = useMemo(() => taskSettings.statuses || [], [taskSettings.statuses]);

    const permissions = useMemo(() => {
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
    }, [project, currentUser]);

    const calculateAutoDeadline = (start: Date, constraintDay: number) => {
        // Convert JS day (0-6 Sun-Sat) to ISO day (1-7 Mon-Sun)
        let currentIso = start.getDay();
        if (currentIso === 0) currentIso = 7;
        
        let constraintIso = constraintDay;
        if (constraintIso === 0) constraintIso = 7;
        
        let daysToAdd = 0;
        
        if (currentIso <= constraintIso) {
            daysToAdd = constraintIso - currentIso;
        } else {
            daysToAdd = 7 - (currentIso - constraintIso);
        }
        
        const deadline = new Date(start);
        deadline.setDate(start.getDate() + daysToAdd);
        return deadline;
    };

    useEffect(() => {
        if (isNew) {
            const defaultProject = projects[0];
            const now = new Date();
            let initialEndDate = null;

            if (defaultProject?.deadlineDayConstraint !== undefined) {
                initialEndDate = calculateAutoDeadline(now, defaultProject.deadlineDayConstraint).toISOString();
            }

            setTask({
                id: `t_${Date.now()}`,
                key: 'NEW',
                title: '',
                description: '',
                status: activeStatuses[0].id,
                priority: taskSettings.priorities[0].id,
                type: taskSettings.taskTypes[0].id,
                projectId: defaultProject?.id || '',
                reporterId: currentUser.id,
                assigneeId: defaultProject?.autoAssignCreator ? currentUser.id : '',
                startDate: now.toISOString(),
                endDate: initialEndDate,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                tags: [],
                subtaskIds: [],
                checklist: [],
                dependencies: [],
                attachments: [],
                links: [],
                customFieldValues: {},
                auditLog: [],
                updates: [],
                parentId: null,
                components: [],
                comments: []
            });
        } else if (taskId) {
            const existing = tasks.find(t => t.id === taskId);
            if (existing) setTask({ ...existing });
        }
    }, [taskId, isNew, tasks, taskSettings, projects, currentUser, activeStatuses]);

    // Update deadline when project changes (if new task)
    useEffect(() => {
        if (isNew && project && project.deadlineDayConstraint !== undefined && task?.startDate) {
            const start = new Date(task.startDate);
            const autoDeadline = calculateAutoDeadline(start, project.deadlineDayConstraint);
            setTask(prev => prev ? ({ ...prev, endDate: autoDeadline.toISOString() }) : null);
        }
    }, [project, isNew, task?.startDate]); 

    // Update assignee if project changes and auto-assign is enabled (only for new tasks)
    useEffect(() => {
        if (isNew && task && task.projectId) {
            const selectedProject = projects.find(p => p.id === task.projectId);
            if (selectedProject?.autoAssignCreator) {
                setTask(prev => prev ? ({ ...prev, assigneeId: currentUser.id }) : null);
            }
        }
    }, [task, isNew, projects, currentUser.id]);
    
    const availableTaskTypes = useMemo(() => {
        if (project?.customTaskTypes && project.customTaskTypes.length > 0) {
            return project.customTaskTypes;
        }
        return taskSettings.taskTypes.filter(tt => project?.taskTypeIds?.includes(tt.id));
    }, [project, taskSettings]);

    const isDateAllowed = (dateString: string) => {
        if (project?.deadlineDayConstraint === undefined) return true;
        // Parse input as Bishkek time (UTC+6)
        const bishkekDate = new Date(dateString + '+06:00');
        // Get day in Bishkek time
        const bishkekTime = new Date(bishkekDate.getTime() + (6 * 60 * 60 * 1000));
        return bishkekTime.getUTCDay() === project.deadlineDayConstraint;
    };

    const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val) {
            setTask({ ...task!, endDate: null });
            return;
        }
        
        const bishkekDate = new Date(val + '+06:00');
        if (task?.startDate && bishkekDate < new Date(task.startDate)) {
            alert('Дедлайн не может быть раньше даты старта!');
            return;
        }

        if (!isDateAllowed(val)) {
            alert(`Для этого проекта дедлайн может быть только в: ${['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][project!.deadlineDayConstraint!]}`);
            return;
        }
        setTask({ ...task!, endDate: bishkekDate.toISOString() });
    };

    const toBishkekISOString = (dateString?: string | null) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const bishkekTime = new Date(d.getTime() + (6 * 60 * 60 * 1000));
        return bishkekTime.toISOString().slice(0, 16);
    };

    const handleAddUpdate = () => {
        if (!newUpdateText.trim()) return;
        const updateEntry = {
            id: `upd_${Date.now()}`,
            number: (task?.updates?.length || 0) + 1,
            text: newUpdateText,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name
        };
        setTask({ ...task!, updates: [...(task?.updates || []), updateEntry] });
        setNewUpdateText('');
    };
    const handleStatusChange = (newStatusId: string) => {
        if (!task || !project) return;
        
        const activeWorkflow = project.workflowId 
            ? taskSettings.workflows?.find(w => w.id === project.workflowId) 
            : null;

        if (activeWorkflow && activeWorkflow.transitions) {
            const originalStatus = tasks.find(t => t.id === task.id)?.status || task.status;
            const transition = activeWorkflow.transitions.find(t => 
                (t.fromStatus.length === 0 || t.fromStatus.includes(originalStatus)) && 
                t.toStatus === newStatusId
            );

            if (transition && (transition.requireComment || transition.requireUpdate)) {
                setPendingTransition({
                    toStatus: newStatusId,
                    requireComment: !!transition.requireComment,
                    requireUpdate: !!transition.requireUpdate,
                    commentText: '',
                    updateText: ''
                });
                return;
            }
        }

        setTask({ ...task, status: newStatusId });
    };

    const confirmTransition = () => {
        if (!task || !pendingTransition) return;
        
        if (pendingTransition.requireComment && !pendingTransition.commentText.trim()) {
            alert('Пожалуйста, добавьте обязательный комментарий.');
            return;
        }
        if (pendingTransition.requireUpdate && !pendingTransition.updateText.trim()) {
            alert('Пожалуйста, добавьте обязательный апдейт.');
            return;
        }

        const updatedTask = { ...task, status: pendingTransition.toStatus };
        
        if (pendingTransition.commentText.trim()) {
            const comment: TaskComment = {
                id: `c_${Date.now()}`,
                taskId: task.id,
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
            const updateEntry: any = {
                id: `upd_${Date.now()}`,
                number: (updatedTask.updates?.length || 0) + 1,
                text: pendingTransition.updateText,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.name
            };
            updatedTask.updates = [...(updatedTask.updates || []), updateEntry];
        }

        setTask(updatedTask);
        setPendingTransition(null);
    };

    const subtasks = useMemo(() => tasks.filter(t => t.parentId === task?.id), [tasks, task?.id]);

    if (!task) return null;

    const sendTelegramNotification = async (message: string) => {
        const botToken = taskSettings.integrations?.telegram?.botToken;
        if (!botToken || !project?.notificationSettings?.telegram) return;

        const chatId = project.notificationSettings.telegramChatId;
        const threadId = project.notificationSettings.telegramThreadId;
        const userId = project.notificationSettings.telegramUserId;

        const targetId = chatId || userId;
        if (!targetId) return;

        try {
            // Fire and forget
            fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botToken: botToken,
                    chatId: targetId,
                    messageThreadId: threadId,
                    text: message,
                    parseMode: 'HTML'
                })
            }).catch(e => console.error('Failed to send Telegram notification', e));
        } catch (e) {
            console.error('Failed to prepare Telegram notification', e);
        }
    };

    const handleSave = () => {
        if (!task.projectId) {
            alert('Пожалуйста, выберите проект!');
            return;
        }

        // Validate Blocker Reason
        const isBlocker = activeStatuses.find(s => s.id === task.status)?.isBlocker;
        if (isBlocker && !task.blockerReason?.trim()) {
            alert('Пожалуйста, укажите причину блокировки!');
            return;
        }

        let updatedTask = { ...task };
        const now = new Date().toISOString();
        let logEntry: TaskUpdate | null = null;

        // Auto-add pending update
        if (newUpdateText.trim()) {
            const updateEntry = {
                id: `upd_${Date.now()}`,
                number: (updatedTask.updates?.length || 0) + 1,
                text: newUpdateText.trim(),
                createdAt: now,
                createdBy: currentUser.name
            };
            updatedTask.updates = [...(updatedTask.updates || []), updateEntry];
            setNewUpdateText('');
        }

        // Auto-add pending comment
        if (newComment.trim()) {
            const comment: TaskComment = {
                id: `c_${Date.now()}`,
                taskId: task.id,
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar || '',
                text: newComment.trim(),
                createdAt: now,
                reactions: {}
            };
            updatedTask.comments = [...(updatedTask.comments || []), comment];
            setNewComment('');
        }

        // Auto-add pending checklist item
        if (newChecklistItem.trim()) {
            const item: TaskChecklistItem = {
                id: `cli_${Date.now()}`,
                text: newChecklistItem.trim(),
                isCompleted: false
            };
            updatedTask.checklist = [...(updatedTask.checklist || []), item];
            setNewChecklistItem('');
        }

        if (isNew) {
            logEntry = {
                id: `log_${Date.now()}`,
                taskId: task.id,
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'create',
                createdAt: now
            };
            updatedTask.auditLog = [logEntry];
            
            if (onCreateTask) {
                onCreateTask({ ...updatedTask, key: `${project?.prefix || 'TASK'}-${tasks.filter(t => t.projectId === project?.id).length + 1}` });
                
                // Notify on create if needed (optional, but good for completeness)
                if (project?.notificationSettings?.telegram && project?.notificationSettings?.onStatusChange) {
                     const msg = `🆕 <b>Новая задача</b>\nПроект: ${project.name}\nЗадача: <b>${updatedTask.key}</b> ${updatedTask.title}\nСоздал: ${currentUser.name}`;
                     sendTelegramNotification(msg);
                }

                onClose();
            }
        } else {
            const original = tasks.find(t => t.id === task.id);
            if (original) {
                const changes: { field: string, oldValue: any, newValue: any }[] = [];
                
                if (original.title !== task.title) changes.push({ field: 'Заголовок', oldValue: original.title, newValue: task.title });
                if (original.description !== task.description) changes.push({ field: 'Описание', oldValue: '...', newValue: '...' });
                if (original.status !== task.status) changes.push({ field: 'Статус', oldValue: activeStatuses.find(s=>s.id===original.status)?.label, newValue: activeStatuses.find(s=>s.id===task.status)?.label });
                if (original.priority !== task.priority) changes.push({ field: 'Приоритет', oldValue: taskSettings.priorities.find(p=>p.id===original.priority)?.label, newValue: taskSettings.priorities.find(p=>p.id===task.priority)?.label });
                if (original.assigneeId !== task.assigneeId) changes.push({ field: 'Исполнитель', oldValue: users.find(u=>u.id===original.assigneeId)?.name || 'Нет', newValue: users.find(u=>u.id===task.assigneeId)?.name || 'Нет' });
                if (original.endDate !== task.endDate) changes.push({ field: 'Дедлайн', oldValue: original.endDate ? new Date(original.endDate).toLocaleDateString() : 'Нет', newValue: task.endDate ? new Date(task.endDate).toLocaleDateString() : 'Нет' });
                
                // Check custom fields
                if (project?.customFields) {
                    project.customFields.forEach(cf => {
                        const oldVal = original.customFieldValues?.[cf.id];
                        const newVal = task.customFieldValues?.[cf.id];
                        if (oldVal !== newVal) {
                            changes.push({ field: cf.name, oldValue: oldVal || '-', newValue: newVal || '-' });
                        }
                    });
                }

                if (changes.length > 0) {
                    logEntry = {
                        id: `log_${Date.now()}`,
                        taskId: task.id,
                        userId: currentUser.id,
                        userName: currentUser.name,
                        action: 'update',
                        changes: changes,
                        createdAt: now
                    };
                    updatedTask.auditLog = [...(original.auditLog || []), logEntry];
                }

                // Notifications
                if (project?.notificationSettings?.telegram) {
                    // Status Change - DISABLED as per request
                    /*
                    if (original.status !== task.status && project.notificationSettings.onStatusChange) {
                        const oldStatus = activeStatuses.find(s => s.id === original.status)?.label;
                        const newStatus = activeStatuses.find(s => s.id === task.status)?.label;
                        const msg = `🔄 <b>Статус изменен</b>\nЗадача: <b>${task.key}</b> ${task.title}\n${oldStatus} ➡️ ${newStatus}\nКем: ${currentUser.name}`;
                        sendTelegramNotification(msg);
                    }
                    */

                    // New Comments
                    if ((task.comments?.length || 0) > (original.comments?.length || 0) && project.notificationSettings.onComment) {
                        const newComments = task.comments!.slice(original.comments?.length || 0);
                        newComments.forEach(c => {
                            const msg = `💬 <b>Новый комментарий</b>\nЗадача: <b>${task.key}</b> ${task.title}\nОт: ${users.find(u => u.id === c.userId)?.name}\n\n${c.text}`;
                            sendTelegramNotification(msg);
                        });
                    }
                }
            }

            if (onUpdateTask) {
                onUpdateTask({ ...updatedTask, updatedAt: now });
                onClose();
            }
        }
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const comment: TaskComment = {
            id: `c_${Date.now()}`,
            taskId: task.id,
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar || '',
            text: newComment,
            createdAt: new Date().toISOString(),
            reactions: {}
        };
        const updated = { ...task, comments: [...(task.comments || []), comment] };
        setTask(updated);
        setNewComment('');
    };

    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const item: TaskChecklistItem = {
            id: `cli_${Date.now()}`,
            text: newChecklistItem,
            isCompleted: false
        };
        setTask({ ...task, checklist: [...(task.checklist || []), item] });
        setNewChecklistItem('');
    };

    const toggleChecklistItem = (id: string) => {
        const updated = task.checklist?.map(item => 
            item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
        );
        setTask({ ...task, checklist: updated });
    };

    return (
        <div className="fixed inset-0 z-[150] flex justify-end bg-zinc-950/40 backdrop-blur-md overflow-hidden animate-fade-in">
            <div className="bg-white/90 dark:bg-zinc-900/90 w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in backdrop-blur-2xl border-l border-white/20 dark:border-zinc-700/30">
                {/* Header */}
                <div className="p-4 border-b dark:border-zinc-800/50 flex justify-between items-center glass-panel shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="px-3 py-1.5 bg-white dark:bg-zinc-800 text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm border border-white/20 dark:border-zinc-700/30">{task.key}</span>
                                {isNew ? (
                                    <select
                                        value={task.projectId}
                                        onChange={e => setTask({ ...task, projectId: e.target.value, customFieldValues: {} })}
                                        className="input-3d px-4 py-1.5 text-[10px] font-bold uppercase"
                                    >
                                        <option value="" disabled>Выберите проект</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    project && (
                                        <div className="flex items-center gap-2 px-4 py-1.5 glass-panel">
                                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project.color }}></div>
                                            <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-300">{project.name}</span>
                                        </div>
                                    )
                                )}
                                <select 
                                    value={task.type}
                                    onChange={e => setTask({ ...task, type: e.target.value })}
                                    className="input-3d px-4 py-1.5 text-[10px] font-bold uppercase"
                                >
                                    {availableTaskTypes.map(tt => (
                                        <option key={tt.id} value={tt.id}>{tt.emoji} {tt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <input 
                                value={task.title}
                                onChange={e => setTask({ ...task, title: e.target.value })}
                                placeholder="Заголовок задачи..."
                                disabled={!permissions.canEditTask}
                                className="text-3xl font-bold uppercase tracking-tighter text-zinc-800 dark:text-white bg-transparent outline-none focus:text-primary transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!isNew && onDeleteTask && permissions.canDeleteTask && (
                            <button onClick={() => { if(window.confirm('Удалить задачу?')) { onDeleteTask(task.id); onClose(); } }} className="btn-3d p-3 text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={24}/></button>
                        )}
                        <button onClick={onClose} className="btn-3d p-3 transition-all"><X size={32} className="text-zinc-500"/></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex glass-panel border-b dark:border-zinc-800/50 px-8">
                    <button onClick={() => setActiveTab('details')} className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Детали</button>
                    <button onClick={() => setActiveTab('subtasks')} className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'subtasks' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Подзадачи ({subtasks.length})</button>
                    <button onClick={() => setActiveTab('comments')} className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Обсуждение ({task.comments?.length || 0})</button>
                    {project?.enableUpdates && (
                        <button onClick={() => setActiveTab('updates')} className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'updates' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Апдейты ({task.updates?.length || 0})</button>
                    )}
                    <button onClick={() => setActiveTab('history')} className={`px-8 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>История</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Left Column: Description & Checklist */}
                            <div className="lg:col-span-8 space-y-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-zinc-500 border-b border-white/20 dark:border-zinc-700/30 pb-2">
                                        <FileText size={18}/>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest">Описание</h4>
                                    </div>
                                    <textarea 
                                        value={task.description}
                                        onChange={e => setTask({ ...task, description: e.target.value })}
                                        placeholder="Добавьте подробное описание задачи..."
                                        disabled={!permissions.canEditTask}
                                        className="input-3d w-full h-64 p-3 text-sm font-medium resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Blocker Reason - Main Column */}
                                {activeStatuses.find(s => s.id === task.status)?.isBlocker && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="flex items-center gap-3 text-red-500 border-b border-red-200/50 dark:border-red-900/30 pb-2">
                                            <AlertCircle size={18}/>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Причина блокировки (Обязательно)</h4>
                                        </div>
                                        <textarea 
                                            value={task.blockerReason || ''}
                                            onChange={e => setTask({ ...task, blockerReason: e.target.value })}
                                            placeholder="Укажите причину блокировки..."
                                            disabled={!permissions.canChangeStatus}
                                            className="w-full h-32 p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-900/30 rounded-[2rem] text-sm font-medium dark:text-white outline-none focus:border-red-500 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                        />
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between text-zinc-500 border-b border-white/20 dark:border-zinc-700/30 pb-2">
                                        <div className="flex items-center gap-3">
                                            <ClipboardList size={18}/>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest">Чек-лист</h4>
                                        </div>
                                        <span className="text-[10px] font-bold">{task.checklist?.filter(i => i.isCompleted).length || 0} / {task.checklist?.length || 0}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {task.checklist?.map(item => (
                                            <div key={item.id} className="flex items-center gap-4 group glass-panel p-2 rounded-2xl">
                                                <button onClick={() => permissions.canEditTask && toggleChecklistItem(item.id)} disabled={!permissions.canEditTask} className={`p-1 rounded-lg transition-all ${item.isCompleted ? 'text-emerald-500' : 'text-zinc-400 hover:text-primary'} ${!permissions.canEditTask ? 'cursor-not-allowed opacity-50' : ''}`}>
                                                    {item.isCompleted ? <CheckCircle2 size={24}/> : <Square size={24}/>}
                                                </button>
                                                <span className={`flex-1 text-sm font-bold transition-all ${item.isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-200'}`}>{item.text}</span>
                                                {permissions.canEditTask && <button onClick={() => setTask({ ...task, checklist: task.checklist?.filter(i => i.id !== item.id) })} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>}
                                            </div>
                                        ))}
                                        {permissions.canEditTask && (
                                            <div className="flex items-center gap-4 mt-4">
                                                <div className="flex-1 relative">
                                                    <Plus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                    <input 
                                                        value={newChecklistItem}
                                                        onChange={e => setNewChecklistItem(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddChecklistItem()}
                                                        placeholder="Добавить пункт..."
                                                        className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold outline-none focus:border-primary transition-all dark:text-white shadow-inner"
                                                    />
                                                </div>
                                                <button onClick={handleAddChecklistItem} className="bg-primary hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-bold uppercase shadow-md transition-all">OK</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Meta & Custom Fields */}
                            <div className="lg:col-span-4 space-y-8">
                                <div className="glass-panel p-4 rounded-[2.5rem] space-y-8">
                                    {/* Status */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Статус</label>
                                        <select 
                                            value={task.status}
                                            onChange={e => handleStatusChange(e.target.value)}
                                            disabled={!permissions.canChangeStatus}
                                            className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold uppercase dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                        >
                                            {(() => {
                                                const activeWorkflow = project?.workflowId 
                                                    ? taskSettings.workflows?.find(w => w.id === project.workflowId) 
                                                    : null;

                                                if (!activeWorkflow || !activeWorkflow.transitions || activeWorkflow.transitions.length === 0) {
                                                    return activeStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>);
                                                }
                                                // If workflows exist, only allow defined transitions + current status
                                                const originalStatus = tasks.find(t => t.id === task.id)?.status || task.status;
                                                const allowedNextStatuses = activeWorkflow.transitions
                                                    .filter(wf => wf.fromStatus.length === 0 || wf.fromStatus.includes(originalStatus))
                                                    .map(wf => wf.toStatus);
                                                
                                                return activeStatuses
                                                    .filter(s => s.id === originalStatus || allowedNextStatuses.includes(s.id))
                                                    .map(s => <option key={s.id} value={s.id}>{s.label}</option>);
                                            })()}
                                        </select>
                                    </div>

                                    {/* Priority */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Приоритет</label>
                                        <select 
                                            value={task.priority}
                                            onChange={e => setTask({ ...task, priority: e.target.value })}
                                            disabled={!permissions.canEditTask}
                                            className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold uppercase dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                        >
                                            {taskSettings.priorities.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
                                        </select>
                                    </div>

                                    {/* Assignee */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Исполнитель</label>
                                        <select 
                                            value={task.assigneeId || ''}
                                            onChange={e => setTask({ ...task, assigneeId: e.target.value })}
                                            disabled={!permissions.canEditTask}
                                            className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold uppercase dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                        >
                                            <option value="">Не назначен</option>
                                            {project?.memberIds?.map(uid => {
                                                const u = users.find(user => user.id === uid);
                                                if (!u) return null;
                                                const config = project.memberConfigs?.find(c => c.userId === uid);
                                                const role = project.projectRoles?.find(r => r.id === config?.roleId);
                                                return (
                                                    <option key={u.id} value={u.id}>
                                                        {u.name} {role ? `(${role.name})` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Старт</label>
                                            <input 
                                                type="date"
                                                value={task.startDate?.split('T')[0] || ''}
                                                onChange={e => setTask({ ...task, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                                disabled={!permissions.canEditTask}
                                                className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Дедлайн</label>
                                            <input 
                                                type="datetime-local"
                                                value={toBishkekISOString(task.endDate)}
                                                onChange={handleDeadlineChange}
                                                disabled={!permissions.canEditTask}
                                                className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                            />
                                            {project?.deadlineDayConstraint !== undefined && (
                                                <div className="text-[9px] text-red-500 font-bold ml-2">
                                                    Только: {['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][project.deadlineDayConstraint]}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time Tracking */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Оценка (ч)</label>
                                            <input 
                                                type="number"
                                                value={task.estimatedTime || 0}
                                                onChange={e => setTask({ ...task, estimatedTime: parseFloat(e.target.value) || 0 })}
                                                disabled={!permissions.canEditTask}
                                                className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">Затрачено (ч)</label>
                                            <input 
                                                type="number"
                                                value={task.spentTime || 0}
                                                onChange={e => setTask({ ...task, spentTime: parseFloat(e.target.value) || 0 })}
                                                disabled={!permissions.canEditTask}
                                                className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Fields */}
                                {project?.customFields && project.customFields.length > 0 && (
                                    <div className="glass-panel p-4 rounded-[2.5rem] space-y-6">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-white/20 dark:border-zinc-700/30 pb-2">Доп. поля проекта</h4>
                                        {project.customFields.map(cf => (
                                            <div key={cf.id} className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase text-zinc-500 ml-2">{cf.name}</label>
                                                
                                                {cf.type === 'text' && (
                                                    <input 
                                                        value={task.customFieldValues?.[cf.id] || ''}
                                                        onChange={e => setTask({ ...task, customFieldValues: { ...task.customFieldValues, [cf.id]: e.target.value } })}
                                                        disabled={!permissions.canEditFields}
                                                        className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                                    />
                                                )}

                                                {cf.type === 'textarea' && (
                                                    <textarea 
                                                        value={task.customFieldValues?.[cf.id] || ''}
                                                        onChange={e => setTask({ ...task, customFieldValues: { ...task.customFieldValues, [cf.id]: e.target.value } })}
                                                        disabled={!permissions.canEditFields}
                                                        className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                                    />
                                                )}

                                                {cf.type === 'select' && (
                                                    <select 
                                                        value={task.customFieldValues?.[cf.id] || ''}
                                                        onChange={e => setTask({ ...task, customFieldValues: { ...task.customFieldValues, [cf.id]: e.target.value } })}
                                                        disabled={!permissions.canEditFields}
                                                        className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                                    >
                                                        <option value="">Не выбрано</option>
                                                        {cf.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                )}

                                                {cf.type === 'date' && (
                                                    <input 
                                                        type="date"
                                                        value={task.customFieldValues?.[cf.id] || ''}
                                                        onChange={e => setTask({ ...task, customFieldValues: { ...task.customFieldValues, [cf.id]: e.target.value } })}
                                                        disabled={!permissions.canEditFields}
                                                        className="w-full p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl text-xs font-bold dark:text-white outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                                                    />
                                                )}

                                                {cf.type === 'checkbox' && (
                                                    <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl shadow-sm">
                                                        <input 
                                                            type="checkbox"
                                                            checked={!!task.customFieldValues?.[cf.id]}
                                                            onChange={e => setTask({ ...task, customFieldValues: { ...task.customFieldValues, [cf.id]: e.target.checked } })}
                                                            disabled={!permissions.canEditFields}
                                                            className="w-5 h-5 accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                                        />
                                                        <span className="text-xs font-bold dark:text-white">{cf.name}</span>
                                                    </div>
                                                )}

                                                {cf.type === 'radio' && (
                                                    <div className="space-y-2 p-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl shadow-sm">
                                                        {cf.options?.map(o => (
                                                            <label key={o} className={`flex items-center gap-3 cursor-pointer ${!permissions.canEditFields ? 'cursor-not-allowed opacity-50' : ''}`}>
                                                                <input 
                                                                    type="radio"
                                                                    name={`cf_${cf.id}`}
                                                                    value={o}
                                                                    checked={task.customFieldValues?.[cf.id] === o}
                                                                    onChange={e => setTask({ ...task, customFieldValues: { ...task.customFieldValues, [cf.id]: e.target.value } })}
                                                                    disabled={!permissions.canEditFields}
                                                                    className="w-4 h-4 accent-primary disabled:cursor-not-allowed"
                                                                />
                                                                <span className="text-xs font-bold dark:text-white">{o}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'subtasks' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold uppercase tracking-tighter dark:text-white">Подзадачи</h3>
                                <button className="bg-primary hover:bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase shadow-md flex items-center gap-2 transition-all">+ Добавить</button>
                            </div>
                            <div className="grid gap-4">
                                {subtasks.map(st => (
                                    <div key={st.id} className="p-3 glass-panel rounded-3xl flex items-center justify-between group hover:border-primary transition-all">
                                        <div className="flex items-center gap-4">
                                            <CheckCircle2 size={24} className={st.completedAt ? 'text-emerald-500' : 'text-zinc-400'} />
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-mono font-bold text-zinc-500">{st.key}</span>
                                                <span className={`text-sm font-bold uppercase tracking-tighter dark:text-white ${st.completedAt ? 'line-through opacity-50' : ''}`}>{st.title}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {users.find(u => u.id === st.assigneeId) && (
                                                <img src={users.find(u => u.id === st.assigneeId)?.avatar} className="w-8 h-8 rounded-xl object-cover shadow-sm" alt=""/>
                                            )}
                                            <button className="p-2 text-zinc-400 hover:text-primary transition-all"><ChevronRight size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                                {subtasks.length === 0 && (
                                    <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                        <Layers size={64} />
                                        <span className="text-xl font-bold uppercase tracking-[0.3em]">Подзадач нет</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="flex flex-col gap-8">
                                {task.comments?.map(comment => {
                                    const user = users.find(u => u.id === comment.userId);
                                    return (
                                        <div key={comment.id} className="flex gap-6 group">
                                            <img src={user?.avatar} className="w-12 h-12 rounded-2xl object-cover border border-white/20 dark:border-zinc-700/30 shadow-md" alt=""/>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold uppercase dark:text-white">{user?.name}</span>
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase">{new Date(comment.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                                                        <button className="p-2 text-zinc-400 hover:text-primary transition-all"><Reply size={16}/></button>
                                                        <button className="p-2 text-zinc-400 hover:text-primary transition-all"><Smile size={16}/></button>
                                                        <button className="p-2 text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                                <div className="p-3 glass-panel rounded-[2rem] text-sm font-medium dark:text-zinc-300 leading-relaxed shadow-sm">
                                                    {comment.text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!task.comments || task.comments.length === 0) && (
                                    <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                        <MessageSquare size={64} />
                                        <span className="text-xl font-bold uppercase tracking-[0.3em]">Обсуждений пока нет</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-10 border-t border-white/20 dark:border-zinc-700/30">
                                <div className="flex gap-6">
                                    <img src={currentUser.avatar} className="w-12 h-12 rounded-2xl object-cover border border-white/20 dark:border-zinc-700/30 shadow-md" alt=""/>
                                    <div className="flex-1 space-y-4">
                                        <textarea 
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Напишите комментарий..."
                                            className="w-full h-32 p-3 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-[2rem] text-sm font-medium dark:text-white outline-none focus:border-primary transition-all resize-none shadow-inner"
                                        />
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-2">
                                                <button className="p-2 text-zinc-400 hover:text-primary hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all shadow-sm"><Paperclip size={20}/></button>
                                                <button className="p-2 text-zinc-400 hover:text-primary hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all shadow-sm"><Smile size={20}/></button>
                                            </div>
                                            <button 
                                                onClick={handleAddComment}
                                                className="bg-primary hover:bg-indigo-600 text-white px-10 py-4 rounded-[2rem] text-xs font-bold uppercase tracking-widest flex items-center gap-3 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                Отправить <Send size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'updates' && (
                        <div className="space-y-10 animate-fade-in">
                            <div className="flex flex-col gap-6">
                                {task.updates?.map(update => (
                                    <div key={update.id} className="flex gap-6 group">
                                        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center text-lg font-bold shadow-md shrink-0">
                                            #{update.number}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold uppercase dark:text-white">{update.createdBy}</span>
                                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">{new Date(update.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 glass-panel rounded-[2rem] text-sm font-medium dark:text-zinc-300 leading-relaxed shadow-sm">
                                                {update.text}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!task.updates || task.updates.length === 0) && (
                                    <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                        <Activity size={64} />
                                        <span className="text-xl font-bold uppercase tracking-[0.3em]">Апдейтов пока нет</span>
                                    </div>
                                )}
                            </div>

                            {permissions.canAddUpdate && (
                                <div className="pt-10 border-t border-white/20 dark:border-zinc-700/30">
                                    <div className="flex gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0 shadow-inner">
                                            <Plus size={24}/>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <textarea 
                                                value={newUpdateText}
                                                onChange={e => setNewUpdateText(e.target.value)}
                                                placeholder="Добавить апдейт..."
                                                className="w-full h-32 p-3 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-[2rem] text-sm font-medium dark:text-white outline-none focus:border-primary transition-all resize-none shadow-inner"
                                            />
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={handleAddUpdate}
                                                    className="bg-primary hover:bg-indigo-600 text-white px-10 py-4 rounded-[2rem] text-xs font-bold uppercase tracking-widest flex items-center gap-3 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    Добавить Апдейт <Plus size={18}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6 animate-fade-in">
                            {task.auditLog?.slice().reverse().map((log, idx) => {
                                const user = users.find(u => u.id === log.userId);
                                return (
                                    <div key={idx} className="flex gap-6 items-start">
                                        <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 shrink-0 shadow-inner">
                                            <History size={20}/>
                                        </div>
                                        <div className="flex-1 py-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold uppercase dark:text-white">{user?.name || 'Система'}</span>
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase">{new Date(log.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                                {log.action === 'create' && 'создал задачу'}
                                                {log.action === 'update' && (
                                                    <div className="space-y-1">
                                                        {log.changes?.map((c, i) => (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <span className="font-bold uppercase text-[10px] text-zinc-500">{c.field}:</span>
                                                                <span className="line-through opacity-50">{String(c.oldValue)}</span>
                                                                <ArrowRight size={12}/>
                                                                <span className="font-bold text-primary">{String(c.newValue)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                                {(!task.auditLog || task.auditLog.length === 0) && (
                                    <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                        <History size={64} />
                                        <span className="text-xl font-bold uppercase tracking-[0.3em]">История пуста</span>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/20 dark:border-zinc-700/30 flex justify-end gap-4 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md">
                    <button onClick={onClose} className="px-10 py-4 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Отмена</button>
                    {(permissions.canEditTask || permissions.canChangeStatus || permissions.canEditFields || permissions.canAddUpdate) && (
                        <button onClick={handleSave} className="bg-primary hover:bg-indigo-600 text-white px-16 py-4 rounded-[2rem] text-xs font-bold uppercase shadow-md flex items-center gap-3 transition-all">
                            <Save size={20}/> {isNew ? 'Создать Задачу' : 'Сохранить Изменения'}
                        </button>
                    )}
                </div>
            </div>

            {/* Transition Modal */}
            {pendingTransition && (
                <div className="fixed inset-0 z-[60] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl border-2 border-zinc-100 dark:border-zinc-800">
                        <div className="p-3 border-b-2 border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Смена статуса</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase">
                                    Переход в статус: {activeStatuses.find(s => s.id === pendingTransition.toStatus)?.label}
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

export default TaskDetailModal;
