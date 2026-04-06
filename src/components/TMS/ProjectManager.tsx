import React, { useState } from 'react';
import { 
    Layers, Plus, 
    Trash2, Edit3, X,
    Users, 
    Type,
    EyeOff, CheckCircle2, UserCircle, Activity
} from 'lucide-react';
import { Project, User, TaskSettings, NestedOption, ProjectRole } from '../../types';

interface Props {
    projects: Project[];
    users: User[];
    currentUser: User;
    onUpdateProjects?: (projects: Project[]) => void;
    taskSettings: TaskSettings;
}

const ProjectManager: React.FC<Props> = ({ 
    projects, users, currentUser, onUpdateProjects, taskSettings 
}) => {
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<'main' | 'roles' | 'workflow'>('main');
    const [accessSearch, setAccessSearch] = useState('');

    const hasGlobalManage = currentUser.roles.includes('admin') || currentUser.permissionIds?.includes('projects_manage');

    const canManageProject = (project: Project) => {
        if (hasGlobalManage) return true;
        if (project.adminIds?.includes(currentUser.id)) return true;
        
        const memberConfig = project.memberConfigs?.find(c => c.userId === currentUser.id);
        if (memberConfig?.roleId && project.projectRoles) {
            const role = project.projectRoles.find(r => r.id === memberConfig.roleId);
            if (role && role.permissions.canManageRoles) return true;
        }
        return false;
    };

    const handleSaveProject = () => {
        if (!editingProject || !onUpdateProjects) return;
        const updatedProjects = projects.some(p => p.id === editingProject.id)
            ? projects.map(p => p.id === editingProject.id ? editingProject : p)
            : [...projects, editingProject];
        onUpdateProjects(updatedProjects);
        setEditingProject(null);
    };

    const parseNestedOptions = (text: string): NestedOption[] => {
        const lines = text.split('\n').filter(l => l.trim());
        const root: NestedOption[] = [];
        lines.forEach(line => {
            const parts = line.split('>').map(s => s.trim());
            let currentLevel = root;
            parts.forEach((part, idx) => {
                let existing = currentLevel.find(o => o.value === part);
                if (!existing) {
                    existing = { label: part, value: part, children: [] };
                    currentLevel.push(existing);
                }
                if (idx < parts.length - 1) {
                    if (!existing.children) existing.children = [];
                    currentLevel = existing.children;
                }
            });
        });
        return root;
    };

    const ProjectMembersManager = () => {
        if (!editingProject) return null;
        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(accessSearch.toLowerCase()));

        const toggleMember = (userId: string) => {
            const isMember = editingProject.memberIds.includes(userId);
            if (isMember) {
                setEditingProject({
                    ...editingProject,
                    memberIds: editingProject.memberIds.filter(id => id !== userId),
                    memberConfigs: (editingProject.memberConfigs || []).filter(c => c.userId !== userId),
                    adminIds: (editingProject.adminIds || []).filter(id => id !== userId)
                });
            } else {
                setEditingProject({
                    ...editingProject,
                    memberIds: [...editingProject.memberIds, userId],
                    memberConfigs: [...(editingProject.memberConfigs || []), { userId, editableFieldIds: [] }]
                });
            }
        };

        const updateMemberRole = (userId: string, roleId: string) => {
            const configs = [...(editingProject.memberConfigs || [])];
            const configIndex = configs.findIndex(c => c.userId === userId);
            if (configIndex >= 0) {
                configs[configIndex] = { ...configs[configIndex], roleId: roleId || undefined };
            } else {
                configs.push({ userId, roleId: roleId || undefined, editableFieldIds: [] });
            }
            setEditingProject({ ...editingProject, memberConfigs: configs });
        };

        const toggleAdmin = (userId: string) => {
            const isAdmin = editingProject.adminIds?.includes(userId);
            if (isAdmin) {
                setEditingProject({ ...editingProject, adminIds: (editingProject.adminIds || []).filter(id => id !== userId) });
            } else {
                setEditingProject({ ...editingProject, adminIds: [...(editingProject.adminIds || []), userId] });
            }
        };

        return (
            <div className="space-y-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-3xl border-2 dark:border-zinc-800 space-y-4">
                    <input 
                        value={accessSearch} 
                        onChange={e => setAccessSearch(e.target.value)} 
                        placeholder="Поиск пользователей..." 
                        className="w-full px-4 py-3 text-sm rounded-xl border-2 dark:border-zinc-700 outline-none bg-white dark:bg-zinc-900 dark:text-white font-bold" 
                    />
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {filteredUsers.map(u => {
                            const isMember = editingProject.memberIds.includes(u.id);
                            const isAdmin = editingProject.adminIds?.includes(u.id);
                            const config = editingProject.memberConfigs?.find(c => c.userId === u.id);

                            return (
                                <div key={u.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-colors border-2 ${isMember ? 'bg-white dark:bg-zinc-800 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}>
                                    <div onClick={() => toggleMember(u.id)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${isMember ? 'bg-primary border-primary' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                        {isMember && <CheckCircle2 size={14} className="text-white"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-black truncate dark:text-white">{u.name}</div>
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">{u.departmentName}</div>
                                    </div>
                                    {isMember && (
                                        <div className="flex items-center gap-4">
                                            <select 
                                                value={config?.roleId || ''} 
                                                onChange={e => updateMemberRole(u.id, e.target.value)}
                                                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl text-xs font-black uppercase outline-none"
                                            >
                                                <option value="">Без роли</option>
                                                {(editingProject.projectRoles || []).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={isAdmin} onChange={() => toggleAdmin(u.id)} className="w-4 h-4 accent-red-500" />
                                                <span className="text-[10px] font-black uppercase text-red-500">Админ</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const handleDeleteProject = (projectId: string) => {
        if (!onUpdateProjects || !window.confirm('Вы уверены, что хотите удалить этот проект?')) return;
        const updatedProjects = projects.filter(p => p.id !== projectId);
        onUpdateProjects(updatedProjects);
    };

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-3 rounded-[2rem] border-2 dark:border-zinc-800 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-2xl shadow-lg">
                        <Layers size={24}/>
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Управление Проектами</h3>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Создавайте и настраивайте рабочие пространства</p>
                    </div>
                </div>
                {hasGlobalManage && (
                    <button 
                        onClick={() => setEditingProject({ 
                            id: `p_${Date.now()}`, 
                            name: '', 
                            prefix: 'PROJ', 
                            description: '', 
                            status: 'active',
                            ownerId: currentUser.id,
                            memberIds: [currentUser.id],
                            color: '#FF6321',
                            emoji: '🚀',
                            customFields: [],
                            allowedRoles: [],
                            allowedUserIds: [],
                            memberConfigs: [],
                            taskTypeIds: taskSettings.taskTypes.map(t => t.id),
                            hiddenStandardFields: [],
                            adminIds: [currentUser.id],
                            executorIds: [],
                            viewerIds: [],
                            autoAssignCreator: false,
                            deadlineDayConstraint: undefined,
                            createdAt: new Date().toISOString()
                        })}
                        className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                    >
                        <Plus size={18}/> Новый проект
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div key={project.id} className="bg-white dark:bg-zinc-900 p-4 rounded-[2.5rem] border-2 dark:border-zinc-800 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 dark:bg-zinc-800/20 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="text-4xl">{project.emoji}</div>
                                {canManageProject(project) && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingProject(project)} className="p-2 clay-btn hover:text-primary transition-all shadow-sm"><Edit3 size={18}/></button>
                                        <button onClick={() => handleDeleteProject(project.id)} className="p-2 clay-btn hover:text-red-500 transition-all shadow-sm"><Trash2 size={18}/></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded text-[9px] font-black uppercase tracking-widest">{project.prefix}</span>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></div>
                            </div>
                            <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white mb-2">{project.name}</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-6 font-medium leading-relaxed">{project.description || 'Описание отсутствует...'}</p>
                            
                            <div className="flex items-center justify-between pt-6 border-t dark:border-zinc-800">
                                <div className="flex -space-x-2">
                                    {project.memberIds?.slice(0, 4).map(id => {
                                        const user = users.find(u => u.id === id);
                                        return <img key={id} src={user?.avatar} className="w-8 h-8 rounded-xl border-2 border-white dark:border-zinc-900 object-cover shadow-sm" alt=""/>
                                    })}
                                    {project.memberIds?.length > 4 && (
                                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-400">+{project.memberIds.length - 4}</div>
                                    )}
                                </div>
                                <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                                    {project.status === 'active' ? 'Активен' : 'Архив'}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {editingProject && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-3 overflow-y-auto">
                    <div className="bg-white dark:bg-zinc-900 rounded-[3rem] w-full max-w-[95vw] max-h-[90vh] flex flex-col border-4 dark:border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b-4 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                            <div><h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Настройка Проекта</h3><p className="text-[10px] font-black text-zinc-400 uppercase mt-1">Параметры, поля и роли участников</p></div>
                            <div className="flex gap-2">
                                <button onClick={() => setActiveTab('main')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'main' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>Основное</button>
                                <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'roles' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>Роли</button>
                                <button onClick={() => setActiveTab('workflow')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'workflow' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>Процессы</button>
                            </div>
                            <button onClick={() => setEditingProject(null)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"><X size={32} className="text-zinc-400"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                            {activeTab === 'main' && (
                                <>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 grid grid-cols-2 gap-8">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Название</label><input value={editingProject.name} onChange={e=>setEditingProject({...editingProject, name: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-sm font-black dark:text-white uppercase outline-none focus:border-primary transition-all" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Ключ-префикс</label><input value={editingProject.prefix} onChange={e=>setEditingProject({...editingProject, prefix: e.target.value.toUpperCase()})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-sm font-black dark:text-white text-center" /></div>
                                    <div className="col-span-2 space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Описание</label><textarea value={editingProject.description} onChange={e=>setEditingProject({...editingProject, description: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-sm font-medium dark:text-white outline-none focus:border-primary transition-all h-32" /></div>
                                    
                                    {/* Automation Settings */}
                                    <div className="col-span-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border-2 dark:border-zinc-800 space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Автоматизация</h4>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="checkbox" 
                                                checked={editingProject.autoAssignCreator} 
                                                onChange={e => setEditingProject({...editingProject, autoAssignCreator: e.target.checked})}
                                                className="w-5 h-5 accent-primary"
                                            />
                                            <span className="text-xs font-bold dark:text-white">Автоматически назначать создателя исполнителем</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="checkbox" 
                                                checked={editingProject.enableUpdates} 
                                                onChange={e => setEditingProject({...editingProject, enableUpdates: e.target.checked})}
                                                className="w-5 h-5 accent-primary"
                                            />
                                            <span className="text-xs font-bold dark:text-white">Включить нумерованные апдейты</span>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-zinc-400">Ограничение дедлайна (день недели)</label>
                                            <select 
                                                value={editingProject.deadlineDayConstraint ?? ''} 
                                                onChange={e => setEditingProject({...editingProject, deadlineDayConstraint: e.target.value ? parseInt(e.target.value) : undefined})}
                                                className="w-full p-2 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl text-xs font-bold"
                                            >
                                                <option value="">Без ограничений</option>
                                                <option value="1">Понедельник</option>
                                                <option value="2">Вторник</option>
                                                <option value="3">Среда</option>
                                                <option value="4">Четверг</option>
                                                <option value="5">Пятница</option>
                                                <option value="6">Суббота</option>
                                                <option value="0">Воскресенье</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Notification Settings */}
                                    <div className="col-span-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border-2 dark:border-zinc-800 space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Уведомления Проекта</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={editingProject.notificationSettings?.telegram ?? false} onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, telegram: e.target.checked }})} className="w-5 h-5 accent-primary" />
                                                <span className="text-xs font-bold dark:text-white">Telegram</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={editingProject.notificationSettings?.email ?? false} onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, email: e.target.checked }})} className="w-5 h-5 accent-primary" />
                                                <span className="text-xs font-bold dark:text-white">Email</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={editingProject.notificationSettings?.onStatusChange ?? false} onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, onStatusChange: e.target.checked }})} className="w-5 h-5 accent-primary" />
                                                <span className="text-xs font-bold dark:text-white">При смене статуса</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={editingProject.notificationSettings?.onComment ?? false} onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, onComment: e.target.checked }})} className="w-5 h-5 accent-primary" />
                                                <span className="text-xs font-bold dark:text-white">При комментарии</span>
                                            </label>
                                        </div>
                                        {editingProject.notificationSettings?.telegram && (
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-zinc-700">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-zinc-400">ID Чата / Канала</label>
                                                    <input 
                                                        value={editingProject.notificationSettings?.telegramChatId || ''} 
                                                        onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, telegramChatId: e.target.value }})}
                                                        placeholder="-100..."
                                                        className="w-full p-2 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl text-xs font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase text-zinc-400">ID Темы (Thread)</label>
                                                    <input 
                                                        value={editingProject.notificationSettings?.telegramThreadId || ''} 
                                                        onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, telegramThreadId: e.target.value }})}
                                                        placeholder="123"
                                                        className="w-full p-2 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl text-xs font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-[9px] font-black uppercase text-zinc-400">ID Пользователя (для ЛС)</label>
                                                    <input 
                                                        value={editingProject.notificationSettings?.telegramUserId || ''} 
                                                        onChange={e => setEditingProject({...editingProject, notificationSettings: { ...editingProject.notificationSettings!, telegramUserId: e.target.value }})}
                                                        placeholder="123456789"
                                                        className="w-full p-2 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-xl text-xs font-bold"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Эмодзи</label><input value={editingProject.emoji} onChange={e=>setEditingProject({...editingProject, emoji: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-3xl text-center outline-none focus:border-primary transition-all" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Цвет</label><input type="color" value={editingProject.color} onChange={e=>setEditingProject({...editingProject, color: e.target.value})} className="w-full h-16 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl cursor-pointer" /></div>
                                    
                                    {/* Custom Task Types */}
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-3xl border-2 dark:border-zinc-800 space-y-4">
                                        <div className="flex justify-between items-center border-b dark:border-zinc-700 pb-2">
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Типы Задач</h4>
                                            <button onClick={() => setEditingProject({...editingProject, customTaskTypes: [...(editingProject.customTaskTypes || []), { id: `tt_${Date.now()}`, label: 'Новый тип', emoji: '📝', category: 'task' }]})} className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-all"><Plus size={16}/></button>
                                        </div>
                                        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                            {(editingProject.customTaskTypes || []).map((tt, idx) => (
                                                <div key={tt.id} className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-xl border dark:border-zinc-700">
                                                    <input value={tt.emoji} onChange={e => { const n = [...(editingProject.customTaskTypes || [])]; n[idx].emoji = e.target.value; setEditingProject({...editingProject, customTaskTypes: n}); }} className="w-8 text-center bg-transparent outline-none" />
                                                    <input value={tt.label} onChange={e => { const n = [...(editingProject.customTaskTypes || [])]; n[idx].label = e.target.value; setEditingProject({...editingProject, customTaskTypes: n}); }} className="flex-1 bg-transparent outline-none text-xs font-bold" />
                                                    <select value={tt.category} onChange={e => { const n = [...(editingProject.customTaskTypes || [])]; n[idx].category = e.target.value as any; setEditingProject({...editingProject, customTaskTypes: n}); }} className="bg-transparent text-[9px] font-black uppercase outline-none w-20">
                                                        <option value="task">Task</option>
                                                        <option value="subtask">Sub</option>
                                                        <option value="story">Story</option>
                                                        <option value="bug">Bug</option>
                                                        <option value="epic">Epic</option>
                                                    </select>
                                                    <button onClick={() => setEditingProject({...editingProject, customTaskTypes: (editingProject.customTaskTypes || []).filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                                </div>
                                            ))}
                                            {(!editingProject.customTaskTypes || editingProject.customTaskTypes.length === 0) && (
                                                <div className="text-center text-[10px] text-zinc-400 py-4">Используются глобальные типы</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t-4 dark:border-zinc-800 space-y-8">
                                <div className="flex items-center gap-3 border-b-2 dark:border-zinc-800 pb-4">
                                    <Users size={24} className="text-primary" />
                                    <h4 className="text-sm font-black uppercase tracking-[0.2em] dark:text-white">Управление Участниками Проекта</h4>
                                </div>
                                <ProjectMembersManager />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border-2 dark:border-zinc-800">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-zinc-500">Доступные Типы Задач</h4>
                                    <div className="flex flex-wrap gap-2">{taskSettings.taskTypes.map(tt => (<button key={tt.id} onClick={() => { const current = editingProject.taskTypeIds || []; const updated = current.includes(tt.id) ? current.filter(id => id !== tt.id) : [...current, tt.id]; setEditingProject({...editingProject, taskTypeIds: updated}); }} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center gap-2 ${editingProject.taskTypeIds?.includes(tt.id) ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}><span>{tt.emoji}</span> {tt.label}</button>))}</div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-zinc-500">Скрыть Стандартные Поля</h4>
                                    <div className="flex flex-wrap gap-2">{[{id: 'description', label: 'Описание'}, {id: 'priority', label: 'Приоритет'}, {id: 'startDate', label: 'Дата старта'}, {id: 'endDate', label: 'Дедлайн'}, {id: 'assigneeId', label: 'Исполнитель'}].map(f => (<button key={f.id} onClick={() => { const current = editingProject.hiddenStandardFields || []; const updated = current.includes(f.id) ? current.filter(id => id !== f.id) : [...current, f.id]; setEditingProject({...editingProject, hiddenStandardFields: updated}); }} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center gap-2 ${editingProject.hiddenStandardFields?.includes(f.id) ? 'bg-red-50 text-red-600 border-red-200' : 'border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}>{editingProject.hiddenStandardFields?.includes(f.id) ? <EyeOff size={12}/> : <CheckCircle2 size={12}/>} {f.label}</button>))}</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b-2 dark:border-zinc-800 pb-4"><h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Type size={18} className="text-primary"/> Конструктор Полей</h4><button onClick={() => setEditingProject({...editingProject, customFields: [...(editingProject.customFields || []), { id: `f_${Date.now()}`, name: 'Поле', type: 'text', required: false }]})} className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl">+ Добавить</button></div>
                                <div className="grid gap-4">
                                    {(editingProject.customFields || []).map((f, idx) => (
                                        <div key={f.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 border-2 dark:border-zinc-700 rounded-3xl grid grid-cols-12 gap-6 items-start">
                                            <div className="col-span-4"><label className="text-[8px] font-black text-zinc-400 uppercase mb-2 block">Метка</label><input value={f.name} onChange={e=>{const n=[...(editingProject.customFields||[])]; n[idx].name=e.target.value; setEditingProject({...editingProject, customFields:n})}} className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-xs font-black uppercase" /></div>
                                            <div className="col-span-3"><label className="text-[8px] font-black text-zinc-400 uppercase mb-2 block">Тип</label><select value={f.type} onChange={e=>{const n=[...(editingProject.customFields||[])]; n[idx].type=e.target.value as any; setEditingProject({...editingProject, customFields:n})}} className="w-full p-2 border dark:border-zinc-700 rounded-xl text-xs font-black dark:bg-zinc-800"><option value="text">Текст</option><option value="textarea">Текст.область</option><option value="select">Выбор</option><option value="radio">Радио</option><option value="checkbox">Чекбокс</option><option value="date">Дата</option><option value="multiselect">Мульти-список (до 6 ур.)</option></select></div>
                                            <div className="col-span-2 flex flex-col items-center gap-2 mb-1"><label className="text-[8px] font-black text-zinc-400 uppercase">Обяз.</label><input type="checkbox" checked={f.required} onChange={e=>{const n=[...(editingProject.customFields||[])]; n[idx].required=e.target.checked; setEditingProject({...editingProject, customFields:n})}} className="w-6 h-6 accent-primary" /></div>
                                            <div className="col-span-3 flex justify-end"><button onClick={()=>setEditingProject({...editingProject, customFields: (editingProject.customFields||[]).filter(x=>x.id!==f.id)})} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"><Trash2 size={20}/></button></div>
                                            {['select','radio'].includes(f.type) && <div className="col-span-12 pt-2 border-t dark:border-zinc-700"><label className="text-[8px] font-black text-zinc-400 uppercase mb-2 block">Варианты (через запятую)</label><input value={f.options?.join(', ')} onChange={e=>{const n=[...(editingProject.customFields||[])]; n[idx].options=e.target.value.split(',').map(s=>s.trim()).filter(Boolean); setEditingProject({...editingProject, customFields:n})}} className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-xs font-bold" /></div>}
                                            {f.type === 'multiselect' && <div className="col-span-12 pt-2 border-t dark:border-zinc-700"><label className="text-[8px] font-black text-zinc-400 uppercase mb-2 block">Дерево вариантов (Вставьте текст, уровни через ' {'>'} ')</label><textarea className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-xs font-mono h-24" placeholder={'Категория > Подкатегория > Элемент\nЭлектроника > Телефоны > iPhone'} onBlur={(e) => { const n = [...(editingProject.customFields||[])]; n[idx].nestedOptions = parseNestedOptions(e.target.value); setEditingProject({...editingProject, customFields:n}); }} /><div className="text-[8px] text-zinc-400 mt-1">Поддерживается массовая вставка из Excel (если отформатировано как 'A {'>'} B {'>'} C')</div></div>}
                                        </div>
                                    ))}
                                </div>
                                </div>
                                </>
                            )}

                            {activeTab === 'roles' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center border-b-2 dark:border-zinc-800 pb-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><UserCircle size={18} className="text-primary"/> Роли в проекте</h4>
                                        <button onClick={() => setEditingProject({...editingProject, projectRoles: [...(editingProject.projectRoles || []), { id: `role_${Date.now()}`, name: 'Новая роль', permissions: { canViewProject: true, canCreateTask: false, canEditTask: false, canChangeStatus: false, canAddUpdate: false, canDeleteTask: false, canEditFields: false, canManageRoles: false } }]})} className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl">+ Добавить роль</button>
                                    </div>
                                    <div className="grid gap-4">
                                        {(editingProject.projectRoles || []).map((role, idx) => (
                                            <div key={role.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 border-2 dark:border-zinc-700 rounded-3xl space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <input value={role.name} onChange={e=>{const n=[...(editingProject.projectRoles||[])]; n[idx].name=e.target.value; setEditingProject({...editingProject, projectRoles:n})}} className="w-1/2 p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-sm font-black uppercase" placeholder="Название роли" />
                                                    <button onClick={()=>setEditingProject({...editingProject, projectRoles: (editingProject.projectRoles||[]).filter(x=>x.id!==role.id)})} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"><Trash2 size={20}/></button>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {Object.entries({
                                                        canViewProject: 'Просмотр проекта',
                                                        canCreateTask: 'Создание задач',
                                                        canEditTask: 'Редактирование задач',
                                                        canChangeStatus: 'Изменение статуса',
                                                        canAddUpdate: 'Добавление апдейтов',
                                                        canDeleteTask: 'Удаление задач',
                                                        canEditFields: 'Редактирование полей',
                                                        canManageRoles: 'Управление ролями'
                                                    }).map(([key, label]) => (
                                                        <label key={key} className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-xl border dark:border-zinc-700 cursor-pointer hover:border-primary transition-all">
                                                            <input type="checkbox" checked={role.permissions[key as keyof ProjectRole['permissions']]} onChange={e=>{const n=[...(editingProject.projectRoles||[])]; n[idx].permissions[key as keyof ProjectRole['permissions']]=e.target.checked; setEditingProject({...editingProject, projectRoles:n})}} className="w-5 h-5 accent-primary" />
                                                            <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">{label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {(!editingProject.projectRoles || editingProject.projectRoles.length === 0) && (
                                            <div className="text-center p-6 border-2 border-dashed dark:border-zinc-800 rounded-3xl text-zinc-400 text-xs font-black uppercase">Нет настроенных ролей</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'workflow' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center border-b-2 dark:border-zinc-800 pb-4">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Activity size={18} className="text-primary"/> Бизнес-процесс (Workflow)</h4>
                                    </div>
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-2 dark:border-zinc-700 rounded-3xl space-y-4">
                                        <label className="text-[10px] font-black uppercase text-zinc-400">Выберите бизнес-процесс для проекта</label>
                                        <select 
                                            value={editingProject.workflowId || ''}
                                            onChange={e => setEditingProject({...editingProject, workflowId: e.target.value})}
                                            className="w-full p-3 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-sm font-black uppercase outline-none focus:border-primary"
                                        >
                                            <option value="">Без бизнес-процесса (свободные переходы)</option>
                                            {(taskSettings.workflows || []).map(wf => (
                                                <option key={wf.id} value={wf.id}>{wf.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] font-bold text-zinc-500">
                                            Бизнес-процессы настраиваются глобально в настройках системы. Они определяют, какие статусы доступны и как задачи могут перемещаться между ними.
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="p-4 border-t-4 dark:border-zinc-800 flex justify-end gap-4 bg-zinc-50 dark:bg-zinc-800/50"><button onClick={()=>setEditingProject(null)} className="px-10 py-4 text-xs font-black uppercase text-zinc-400">Отмена</button><button onClick={handleSaveProject} className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-16 py-4 rounded-3xl text-xs font-black uppercase shadow-2xl">Сохранить Проект</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectManager;
