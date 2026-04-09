import React, { useState, useMemo, useCallback } from 'react';
import { 
    LayoutGrid, Kanban, CalendarRange, BarChart3, Settings2, 
    Plus, Search, Briefcase,
    AlertCircle,
    Trash2, X, Layers
} from 'lucide-react';
import { 
    ProjectTask, User, Project, TaskSettings, 
    RoleDefinition, Department, UserRole, Permission 
} from '../../types';
import TaskListView from './TaskListView';
import TaskBoardView from './TaskBoardView';
import TaskTimelineView from './TaskTimelineView';
import ProjectManager from './ProjectManager';
import TaskReports from './TaskReports';
import TMSSettings from './TMSSettings';
import TaskDetailModal from './TaskDetailModal';

interface Props {
  tasks: ProjectTask[];
  users: User[];
  projects: Project[];
  taskSettings: TaskSettings;
  roles?: RoleDefinition[];
  permissions?: Permission[];
  departments?: Department[];
  currentUser: User;
  onUpdateTask: (task: ProjectTask) => void;
  onCreateTask: (task: ProjectTask) => void;
  onDeleteTask: (id: string) => void;
  onSaveSettings?: (settings: TaskSettings) => void;
  onUpdateProjects?: (projects: Project[]) => void;
  onUpdateRole?: (role: RoleDefinition) => void;
  onCreateRole?: (role: RoleDefinition) => void;
  onDeleteRole?: (id: string) => void;
  onUpdateUser?: (user: User) => void;
  initialTab?: 'all' | 'my' | 'projects' | 'boards' | 'timeline' | 'reports' | 'settings';
}

const TMS: React.FC<Props> = ({ 
    tasks = [], users = [], projects = [], taskSettings, 
    roles = [], permissions = [], departments = [],
    currentUser, 
    onUpdateTask, onCreateTask, onDeleteTask, 
    onSaveSettings, onUpdateProjects, onUpdateRole, onCreateRole, onDeleteRole, onUpdateUser,
    initialTab = 'all'
}) => {
    const [activeTab, setActiveTab] = useState<'all' | 'my' | 'projects' | 'boards' | 'timeline' | 'reports' | 'settings'>(initialTab);
    
    // Update active tab when initialTab prop changes
    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [showHelpModal, setShowHelpModal] = useState(false);
    const [helpMessage, setHelpMessage] = useState('');

    // Deadline Reminders
    React.useEffect(() => {
        const checkDeadlines = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            tasks.forEach(task => {
                if (!task.endDate || task.completedAt) return;

                const project = projects.find(p => p.id === task.projectId);
                // Only for projects with deadline constraint as requested
                if (!project || project.deadlineDayConstraint === undefined) return;

                const deadline = new Date(task.endDate);
                const timeDiff = deadline.getTime() - now.getTime();
                const daysDiff = timeDiff / (1000 * 3600 * 24);

                // Check if deadline is within 24-48 hours (tomorrow)
                if (daysDiff > 0 && daysDiff <= 1.5) {
                    const reminderKey = `reminder_sent_${task.id}_${deadline.toISOString().split('T')[0]}`;
                    if (localStorage.getItem(reminderKey)) return;

                    // Send Reminder
                    if (project.notificationSettings?.telegram) {
                        const botToken = taskSettings.integrations?.telegram?.botToken;
                        const chatId = project.notificationSettings.telegramChatId || project.notificationSettings.telegramUserId;
                        const threadId = project.notificationSettings.telegramThreadId;

                        if (botToken && chatId) {
                            const msg = `⏰ <b>Напоминание о дедлайне</b>\nЗадача: <b>${task.key}</b> ${task.title}\nДедлайн: ${deadline.toLocaleDateString()} ${deadline.toLocaleTimeString()}\nОсталось менее суток!`;
                            
                            fetch('/api/telegram/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    botToken: botToken.trim(),
                                    chatId: chatId.trim(),
                                    messageThreadId: threadId ? threadId.trim() : undefined,
                                    text: msg,
                                    parseMode: 'HTML'
                                })
                            }).then(res => {
                                if (res.ok) {
                                    localStorage.setItem(reminderKey, 'true');
                                }
                            }).catch(console.error);
                        }
                    }
                }
            });
        };

        // Check every hour
        checkDeadlines();
        const interval = setInterval(checkDeadlines, 3600000);
        return () => clearInterval(interval);
    }, [tasks, projects, taskSettings]);

    const handleSendHelp = async () => {
        if (!helpMessage.trim()) return;
        
        const telegramConfig = taskSettings.integrations?.telegram;
        const botToken = telegramConfig?.botToken;
        const supportId = telegramConfig?.supportTelegramId;
        
        if (!telegramConfig?.enabled || !botToken || !supportId) {
            alert('Ошибка: Интеграция с Telegram не настроена или отключена. Пожалуйста, обратитесь к администратору.');
            return;
        }

        const messageText = `🆘 <b>Запрос помощи</b>\n\n<b>От:</b> ${currentUser.name} (ID: ${currentUser.id})\n<b>Сообщение:</b> ${helpMessage}`;

        try {
            const response = await fetch('/api/telegram/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    botToken: botToken.trim(),
                    chatId: supportId.trim(),
                    text: messageText,
                    parseMode: 'HTML'
                }),
            });

            const data = await response.json();

            if (data.ok) {
                alert('Запрос о помощи успешно отправлен администратору в Telegram!');
                setHelpMessage('');
                setShowHelpModal(false);
            } else {
                console.error('Telegram API Error:', data);
                alert(`Ошибка отправки сообщения: ${data.description || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            console.error('Network Error:', error);
            alert('Ошибка сети при отправке сообщения в Telegram.');
        }
    };

    const isGlobalAdmin = useMemo(() => currentUser.roles.includes(UserRole.SUPER_ADMIN), [currentUser]);

    const visibleProjects = useMemo(() => {
        return projects.filter(p => {
            if (isGlobalAdmin) return true;
            const isProjAdmin = p.adminIds?.includes(currentUser.id);
            
            let hasRoleViewPermission = false;
            const memberConfig = p.memberConfigs?.find(c => c.userId === currentUser.id);
            if (memberConfig?.roleId && p.projectRoles) {
                const role = p.projectRoles.find(r => r.id === memberConfig.roleId);
                if (role && role.permissions.canViewProject) {
                    hasRoleViewPermission = true;
                }
            }

            // Strict check: if not added to any role list, do not show
            return isProjAdmin || hasRoleViewPermission;
        });
    }, [projects, currentUser, isGlobalAdmin]);

    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterProject, setFilterProject] = useState<string>('all');
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');
    const [filterOverdue, setFilterOverdue] = useState<boolean>(false);
    const [filterUnassigned, setFilterUnassigned] = useState<boolean>(false);
    const [filterBlocked, setFilterBlocked] = useState<boolean>(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const hasPermission = useCallback((permissionId: string) => {
        if (currentUser.roles.includes('admin')) return true;
        return currentUser.permissionIds?.includes(permissionId);
    }, [currentUser]);

    const allStatuses = useMemo(() => {
        return taskSettings.statuses || [];
    }, [taskSettings.statuses]);

    const filteredTasks = useMemo(() => {
        let base = tasks.filter(t => !t.parentId); // Only top-level tasks for main views
        
        if (activeTab === 'my') {
            base = base.filter(t => t.assigneeId === currentUser.id);
        }

        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            base = base.filter(t => 
                t.title.toLowerCase().includes(s) || 
                t.key.toLowerCase().includes(s) ||
                t.description?.toLowerCase().includes(s) ||
                Object.values(t.customFieldValues || {}).some(v => String(v).toLowerCase().includes(s))
            );
        }

        // Apply filters
        if (filterStatus !== 'all') {
            base = base.filter(t => t.status === filterStatus);
        }
        if (filterPriority !== 'all') {
            base = base.filter(t => t.priority === filterPriority);
        }
        if (filterProject !== 'all') {
            base = base.filter(t => t.projectId === filterProject);
        }
        if (filterDateStart && filterDateEnd) {
            base = base.filter(t => {
                if (!t.endDate) return false;
                const d = new Date(t.endDate);
                return d >= new Date(filterDateStart) && d <= new Date(filterDateEnd);
            });
        }
        
        if (filterUnassigned) {
            base = base.filter(t => !t.assigneeId);
        }
        if (filterBlocked) {
            const blockerStatusIds = allStatuses.filter(s => s.isBlocker).map(s => s.id);
            base = base.filter(t => blockerStatusIds.includes(t.status));
        }
        if (filterOverdue) {
            const now = new Date().getTime();
            base = base.filter(t => t.endDate && new Date(t.endDate).getTime() < now && !t.completedAt);
        }

        // Permission checks
        if (activeTab === 'all' && !hasPermission('tasks_view_all')) return [];
        
        // Blocker permission check
        base = base.filter(t => {
            const isBlocker = allStatuses.find(s => s.id === t.status)?.isBlocker;
            if (isBlocker && !hasPermission('tasks_view_blockers') && !hasPermission('tasks_view_all')) return false;
            return true;
        });

        return base.filter(t => visibleProjects.some(p => p.id === t.projectId));
    }, [tasks, activeTab, currentUser.id, searchTerm, visibleProjects, filterStatus, filterPriority, filterProject, filterDateStart, filterDateEnd, filterOverdue, filterUnassigned, filterBlocked, allStatuses, hasPermission]);

    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev => 
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedTaskIds.length === filteredTasks.length) {
            setSelectedTaskIds([]);
        } else {
            setSelectedTaskIds(filteredTasks.map(t => t.id));
        }
    };

    const handleMassDelete = () => {
        if (window.confirm(`Вы уверены, что хотите удалить ${selectedTaskIds.length} задач?`)) {
            selectedTaskIds.forEach(id => onDeleteTask(id));
            setSelectedTaskIds([]);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'all':
                return (
                    <TaskListView 
                        tasks={filteredTasks} 
                        users={users} 
                        projects={visibleProjects} 
                        taskSettings={taskSettings} 
                        currentUser={currentUser}
                        onSelectTask={setSelectedTaskId}
                        onUpdateTask={onUpdateTask}
                        selectedTaskIds={selectedTaskIds}
                        onToggleTaskSelection={toggleTaskSelection}
                        onToggleAllSelection={toggleAllSelection}
                    />
                );
            case 'my':
                return (
                    <TaskListView 
                        tasks={filteredTasks} 
                        users={users} 
                        projects={visibleProjects} 
                        taskSettings={taskSettings} 
                        currentUser={currentUser}
                        onSelectTask={setSelectedTaskId}
                        onUpdateTask={onUpdateTask}
                        selectedTaskIds={selectedTaskIds}
                        onToggleTaskSelection={toggleTaskSelection}
                        onToggleAllSelection={toggleAllSelection}
                    />
                );
            case 'boards':
                return (
                    <TaskBoardView 
                        tasks={filteredTasks} 
                        users={users} 
                        projects={visibleProjects} 
                        taskSettings={taskSettings} 
                        currentUser={currentUser}
                        onSelectTask={setSelectedTaskId}
                        onUpdateTask={onUpdateTask}
                    />
                );
            case 'timeline':
                return (
                    <TaskTimelineView 
                        tasks={filteredTasks} 
                        users={users} 
                        projects={visibleProjects} 
                        taskSettings={taskSettings} 
                        currentUser={currentUser}
                        onSelectTask={setSelectedTaskId}
                    />
                );
            case 'projects':
                return (
                    <ProjectManager 
                        projects={visibleProjects} 
                        users={users} 
                        currentUser={currentUser}
                        onUpdateProjects={onUpdateProjects}
                        taskSettings={taskSettings}
                    />
                );
            case 'reports':
                return (
                    <TaskReports 
                        tasks={tasks.filter(t => visibleProjects.some(p => p.id === t.projectId))} 
                        users={users} 
                        projects={visibleProjects} 
                        taskSettings={taskSettings} 
                        onSaveSettings={onSaveSettings}
                    />
                );
            case 'settings':
                return (
                    <TMSSettings 
                        settings={taskSettings} 
                        onSave={onSaveSettings}
                        users={users}
                        roles={roles}
                        permissions={permissions}
                        departments={departments}
                        onUpdateRole={onUpdateRole}
                        onCreateRole={onCreateRole}
                        onDeleteRole={onDeleteRole}
                        onUpdateUser={onUpdateUser}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in">
            {/* TMS Navigation */}
            <div className="flex flex-col gap-4 no-print clay-panel p-3">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1">
                        {hasPermission('tasks_view_all') && (
                            <button 
                                onClick={() => setActiveTab('all')}
                                className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'all' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <LayoutGrid size={16}/> Все задачи
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('my')}
                            className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'my' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            <Briefcase size={16}/> Мои задачи
                        </button>
                        {(hasPermission('projects_manage') || projects.some(p => {
                            const memberConfig = p.memberConfigs?.find(c => c.userId === currentUser.id);
                            if (memberConfig?.roleId && p.projectRoles) {
                                const role = p.projectRoles.find(r => r.id === memberConfig.roleId);
                                return role?.permissions.canManageRoles;
                            }
                            return false;
                        })) && (
                            <button 
                                onClick={() => setActiveTab('projects')}
                                className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'projects' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <Layers size={16}/> Проекты
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('boards')}
                            className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'boards' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            <Kanban size={16}/> Доски
                        </button>
                        <button 
                            onClick={() => setActiveTab('timeline')}
                            className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'timeline' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            <CalendarRange size={16}/> Таймлайн
                        </button>
                        {hasPermission('reports_view') && (
                            <button 
                                onClick={() => setActiveTab('reports')}
                                className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'reports' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <BarChart3 size={16}/> Отчеты
                            </button>
                        )}
                        {hasPermission('settings_manage') && (
                            <button 
                                onClick={() => setActiveTab('settings')}
                                className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'clay-btn text-primary' : 'text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                            >
                                <Settings2 size={16}/> Настройки
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowHelpModal(true)}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                        >
                            <AlertCircle size={16} /> Помощь
                        </button>
                        {hasPermission('tasks_create') && (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-primary hover:bg-indigo-600 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Новая задача
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                {(activeTab === 'all' || activeTab === 'my' || activeTab === 'boards' || activeTab === 'timeline') && hasPermission('tasks_filter_advanced') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-white/20 dark:border-zinc-700/30">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Поиск задач..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-full text-xs font-semibold outline-none focus:border-primary transition-all shadow-inner dark:text-white"
                            />
                        </div>
                        
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-full text-xs font-semibold outline-none focus:border-primary transition-all shadow-sm dark:text-white appearance-none pr-8"
                        >
                            <option value="all">Все статусы</option>
                            {allStatuses.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>

                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="px-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-full text-xs font-semibold outline-none focus:border-primary transition-all shadow-sm dark:text-white appearance-none pr-8"
                        >
                            <option value="all">Все приоритеты</option>
                            {taskSettings.priorities.map(p => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>

                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="px-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-full text-xs font-semibold outline-none focus:border-primary transition-all shadow-sm dark:text-white appearance-none pr-8 truncate"
                        >
                            <option value="all">Все проекты</option>
                            {visibleProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2">
                            <input 
                                type="date"
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                                className="w-full px-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-full text-[10px] font-semibold outline-none focus:border-primary transition-all shadow-sm dark:text-white"
                            />
                            <span className="text-zinc-400">-</span>
                            <input 
                                type="date"
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                className="w-full px-4 py-2 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-full text-[10px] font-semibold outline-none focus:border-primary transition-all shadow-sm dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-4 ml-2 lg:col-span-5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={filterOverdue} 
                                    onChange={(e) => setFilterOverdue(e.target.checked)}
                                    className="w-4 h-4 accent-primary rounded"
                                />
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Просроченные</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={filterUnassigned} 
                                    onChange={(e) => setFilterUnassigned(e.target.checked)}
                                    className="w-4 h-4 accent-primary rounded"
                                />
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Без исполнителя</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={filterBlocked} 
                                    onChange={(e) => setFilterBlocked(e.target.checked)}
                                    className="w-4 h-4 accent-primary rounded"
                                />
                                <span className="text-[10px] font-bold uppercase text-zinc-500">Блокеры</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 relative">
                {renderContent()}

                {/* Mass Actions Bar */}
                {selectedTaskIds.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-slide-up z-50">
                        <div className="flex items-center gap-2 border-r border-zinc-700 dark:border-zinc-200 pr-6">
                            <span className="text-sm font-black">{selectedTaskIds.length}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">выбрано</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleMassDelete}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-500 rounded-xl text-xs font-bold transition-all"
                            >
                                <Trash2 size={16} />
                                Удалить
                            </button>
                            <button 
                                onClick={() => setSelectedTaskIds([])}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold transition-all ml-2"
                            >
                                <X size={16} />
                                Отмена
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedTaskId && (
                <TaskDetailModal 
                    taskId={selectedTaskId}
                    tasks={tasks}
                    users={users}
                    projects={visibleProjects}
                    taskSettings={taskSettings}
                    currentUser={currentUser}
                    onClose={() => setSelectedTaskId(null)}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                />
            )}

            {isCreateModalOpen && (
                <TaskDetailModal 
                    isNew={true}
                    tasks={tasks}
                    users={users}
                    projects={visibleProjects}
                    taskSettings={taskSettings}
                    currentUser={currentUser}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreateTask={onCreateTask}
                />
            )}

            {showHelpModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-3">
                    <div className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md border-4 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-3 border-b-4 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                            <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white flex items-center gap-2"><AlertCircle className="text-red-500"/> Запрос помощи</h3>
                            <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"><X size={24} className="text-zinc-400"/></button>
                        </div>
                        <div className="p-3 space-y-4">
                            <p className="text-xs text-zinc-500 font-medium">Опишите вашу проблему, и администратор получит уведомление в Telegram.</p>
                            <textarea 
                                value={helpMessage}
                                onChange={e => setHelpMessage(e.target.value)}
                                placeholder="Что случилось?"
                                className="w-full h-32 p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-sm font-medium dark:text-white outline-none focus:border-primary transition-all resize-none"
                            />
                            <button onClick={handleSendHelp} className="w-full bg-red-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase shadow-xl hover:bg-red-600 transition-all">Отправить запрос</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TMS;
