import React, { useState, useEffect } from 'react';
import { 
    Trash2, X, Save, 
    Type,
    Bell, Zap, AlertCircle,
    ArrowRightLeft,
    ArrowRight, Activity, Mail, MessageCircle
} from 'lucide-react';
import { TaskSettings, RoleDefinition, Department, User, Permission } from '../../types';
import WorkflowVisualEditor from './WorkflowVisualEditor';

interface Props {
    settings: TaskSettings;
    onSave?: (settings: TaskSettings) => void;
    users: User[];
    roles: RoleDefinition[];
    permissions?: Permission[];
    departments: Department[];
    onUpdateRole?: (role: RoleDefinition) => void;
    onCreateRole?: (role: RoleDefinition) => void;
    onDeleteRole?: (id: string) => void;
    onUpdateUser?: (user: User) => void;
}



const TMSSettings: React.FC<Props> = ({ 
    settings, onSave, users, roles, departments,
    onUpdateRole, onCreateRole, onDeleteRole, onUpdateUser
}) => {

    const [localSettings, setLocalSettings] = useState<TaskSettings>(() => ({
        ...settings,
        integrations: {
            telegram: { 
                enabled: settings.integrations?.telegram?.enabled ?? false, 
                botToken: settings.integrations?.telegram?.botToken ?? '', 
                chatId: settings.integrations?.telegram?.chatId ?? '' 
            },
            email: { 
                enabled: settings.integrations?.email?.enabled ?? false, 
                smtpHost: settings.integrations?.email?.smtpHost ?? '',
                smtpPort: settings.integrations?.email?.smtpPort ?? 587,
                smtpUser: settings.integrations?.email?.smtpUser ?? '',
                smtpPass: settings.integrations?.email?.smtpPass ?? '',
                fromAddress: settings.integrations?.email?.fromAddress ?? ''
            }
        },
        notifications: {
            onTaskCreated: { internal: true, telegram: true, email: false },
            onStatusChanged: { internal: true, telegram: true, email: false },
            onCommentAdded: { internal: true, telegram: false, email: false },
            onDeadlineApproaching: { internal: true, telegram: true, email: true },
            onSlaBreached: { internal: true, telegram: true, email: true },
            ...settings.notifications
        }
    }));
    const [activeTab, setActiveTab] = useState<'statuses' | 'workflows' | 'types' | 'priorities' | 'integrations' | 'notifications'>('statuses');
    const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

    // Sync settings when prop changes and ensure structure
    useEffect(() => {
        const merged = {
            ...settings,
            integrations: {
                telegram: { 
                    enabled: settings.integrations?.telegram?.enabled ?? false, 
                    botToken: settings.integrations?.telegram?.botToken ?? '', 
                    chatId: settings.integrations?.telegram?.chatId ?? '' 
                },
                email: { 
                    enabled: settings.integrations?.email?.enabled ?? false, 
                    smtpHost: settings.integrations?.email?.smtpHost ?? '',
                    smtpPort: settings.integrations?.email?.smtpPort ?? 587,
                    smtpUser: settings.integrations?.email?.smtpUser ?? '',
                    smtpPass: settings.integrations?.email?.smtpPass ?? '',
                    fromAddress: settings.integrations?.email?.fromAddress ?? ''
                }
            },
            notifications: {
                onTaskCreated: { internal: true, telegram: true, email: false },
                onStatusChanged: { internal: true, telegram: true, email: false },
                onCommentAdded: { internal: true, telegram: false, email: false },
                onDeadlineApproaching: { internal: true, telegram: true, email: true },
                onSlaBreached: { internal: true, telegram: true, email: true },
                ...settings.notifications
            }
        };
        setLocalSettings(merged);
    }, [settings]);

    const handleSave = () => {
        if (onSave) onSave(localSettings);
    };

    const StatusEditor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Статусы Задач</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase">Жизненный цикл задачи от идеи до релиза</p>
                </div>
                <button 
                    onClick={() => setLocalSettings({
                        ...localSettings,
                        statuses: [...localSettings.statuses, { id: `s_${Date.now()}`, label: 'Новый статус', color: '#6366f1', isBlocker: false }]
                    })}
                    className="btn-3d bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-2 text-[10px] font-black uppercase"
                >
                    + Добавить
                </button>
            </div>
            <div className="grid gap-4">
                {localSettings.statuses.map((status, idx) => (
                    <div key={status.id} className="p-3 glass-panel grid grid-cols-12 gap-6 items-center group">
                        <div className="col-span-4 flex items-center gap-4">
                            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: status.color }}></div>
                            <input 
                                value={status.label} 
                                onChange={e => {
                                    const n = [...localSettings.statuses];
                                    n[idx].label = e.target.value;
                                    setLocalSettings({ ...localSettings, statuses: n });
                                }}
                                className="w-full bg-transparent text-sm font-black uppercase dark:text-white outline-none focus:text-primary transition-colors"
                            />
                        </div>
                        <div className="col-span-3">
                            <input 
                                type="color" 
                                value={status.color} 
                                onChange={e => {
                                    const n = [...localSettings.statuses];
                                    n[idx].color = e.target.value;
                                    setLocalSettings({ ...localSettings, statuses: n });
                                }}
                                className="input-3d w-full h-10 cursor-pointer"
                            />
                        </div>
                        <div className="col-span-3 flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                checked={status.isBlocker} 
                                onChange={e => {
                                    const n = [...localSettings.statuses];
                                    n[idx].isBlocker = e.target.checked;
                                    setLocalSettings({ ...localSettings, statuses: n });
                                }}
                                className="w-6 h-6 accent-primary"
                            />
                            <span className="text-[10px] font-black uppercase text-zinc-400">Блокирующий</span>
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button 
                                onClick={() => setLocalSettings({ ...localSettings, statuses: localSettings.statuses.filter(s => s.id !== status.id) })}
                                className="btn-3d p-2 text-zinc-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const WorkflowEditor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Бизнес-процессы (Workflows)</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase">Настройка переходов между статусами</p>
                </div>
                <button 
                    onClick={() => setLocalSettings({
                        ...localSettings,
                        workflows: [...(localSettings.workflows || []), { id: `wf_${Date.now()}`, name: 'Новый процесс', transitions: [] }]
                    })}
                    className="btn-3d bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-2 text-[10px] font-black uppercase"
                >
                    + Добавить процесс
                </button>
            </div>
            <div className="grid gap-8">
                {(localSettings.workflows || []).map((wf, wfIdx) => (
                    <div key={wf.id} className="p-3 glass-panel space-y-6">
                        <div className="flex items-center justify-between border-b-2 dark:border-zinc-800 pb-4">
                            <input 
                                value={wf.name} 
                                onChange={e => {
                                    const n = [...(localSettings.workflows || [])];
                                    n[wfIdx].name = e.target.value;
                                    setLocalSettings({ ...localSettings, workflows: n });
                                }}
                                className="bg-transparent text-lg font-black uppercase dark:text-white outline-none focus:text-primary transition-colors w-1/2"
                                placeholder="Название процесса"
                            />
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setEditingWorkflowId(wf.id)}
                                    className="btn-3d p-2 text-zinc-300 hover:text-primary transition-all"
                                    title="Визуальный редактор"
                                >
                                    <Activity size={20}/>
                                </button>
                                <button 
                                    onClick={() => setLocalSettings({ ...localSettings, workflows: (localSettings.workflows || []).filter(w => w.id !== wf.id) })}
                                    className="btn-3d p-2 text-zinc-300 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-black uppercase text-zinc-400">Переходы (Transitions)</h5>
                                <button 
                                    onClick={() => {
                                        const n = [...(localSettings.workflows || [])];
                                        n[wfIdx].transitions.push({ id: `tr_${Date.now()}`, name: 'Новый переход', fromStatus: [], toStatus: localSettings.statuses[0]?.id || '' });
                                        setLocalSettings({ ...localSettings, workflows: n });
                                    }}
                                    className="text-[10px] font-black uppercase text-primary hover:text-primary/80"
                                >
                                    + Добавить переход
                                </button>
                            </div>
                            
                            <div className="grid gap-3">
                                {wf.transitions.map((tr, trIdx) => (
                                    <div key={tr.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 border-2 dark:border-zinc-800 rounded-2xl grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-3">
                                            <input 
                                                value={tr.name} 
                                                onChange={e => {
                                                    const n = [...(localSettings.workflows || [])];
                                                    n[wfIdx].transitions[trIdx].name = e.target.value;
                                                    setLocalSettings({ ...localSettings, workflows: n });
                                                }}
                                                className="w-full bg-transparent text-xs font-black uppercase dark:text-white outline-none"
                                                placeholder="Название (напр. В работу)"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <input 
                                                value={tr.fromStatus.join(', ')} 
                                                onChange={e => {
                                                    const n = [...(localSettings.workflows || [])];
                                                    n[wfIdx].transitions[trIdx].fromStatus = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                    setLocalSettings({ ...localSettings, workflows: n });
                                                }}
                                                className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase"
                                                placeholder="Из статусов (ID через запятую, пусто = любой)"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center text-zinc-400">
                                            <ArrowRight size={16} />
                                        </div>
                                        <div className="col-span-3">
                                            <select 
                                                value={tr.toStatus}
                                                onChange={e => {
                                                    const n = [...(localSettings.workflows || [])];
                                                    n[wfIdx].transitions[trIdx].toStatus = e.target.value;
                                                    setLocalSettings({ ...localSettings, workflows: n });
                                                }}
                                                className="w-full p-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase"
                                            >
                                                <option value="">Выберите статус...</option>
                                                {localSettings.statuses.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label} ({s.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <button 
                                                onClick={() => {
                                                    const n = [...(localSettings.workflows || [])];
                                                    n[wfIdx].transitions = n[wfIdx].transitions.filter(t => t.id !== tr.id);
                                                    setLocalSettings({ ...localSettings, workflows: n });
                                                }}
                                                className="text-zinc-400 hover:text-red-500"
                                            >
                                                <X size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {wf.transitions.length === 0 && (
                                    <div className="text-center p-3 border-2 border-dashed dark:border-zinc-800 rounded-2xl text-zinc-400 text-[10px] font-black uppercase">
                                        Нет переходов. Задачи смогут переходить в любой статус.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {(!localSettings.workflows || localSettings.workflows.length === 0) && (
                    <div className="text-center p-12 glass-panel text-zinc-400 text-xs font-black uppercase">
                        Нет настроенных бизнес-процессов
                    </div>
                )}
            </div>
        </div>
    );

    const TypeEditor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Типы Задач</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase">Классификация и SLA для различных видов работ</p>
                </div>
                <button 
                    onClick={() => setLocalSettings({
                        ...localSettings,
                        taskTypes: [...localSettings.taskTypes, { id: `t_${Date.now()}`, label: 'Тип', emoji: '📄', slaMinutes: 0 }]
                    })}
                    className="btn-3d bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-2 text-[10px] font-black uppercase"
                >
                    + Добавить
                </button>
            </div>
            <div className="grid gap-4">
                {localSettings.taskTypes.map((type, idx) => (
                    <div key={type.id} className="p-3 glass-panel grid grid-cols-12 gap-6 items-center">
                        <div className="col-span-1 text-2xl text-center">
                            <input 
                                value={type.emoji} 
                                onChange={e => {
                                    const n = [...localSettings.taskTypes];
                                    n[idx].emoji = e.target.value;
                                    setLocalSettings({ ...localSettings, taskTypes: n });
                                }}
                                className="w-full bg-transparent text-center outline-none"
                            />
                        </div>
                        <div className="col-span-5">
                            <input 
                                value={type.label} 
                                onChange={e => {
                                    const n = [...localSettings.taskTypes];
                                    n[idx].label = e.target.value;
                                    setLocalSettings({ ...localSettings, taskTypes: n });
                                }}
                                className="w-full bg-transparent text-sm font-black uppercase dark:text-white outline-none focus:text-primary transition-colors"
                            />
                        </div>
                        <div className="col-span-4 flex items-center gap-4">
                            <div className="flex flex-col flex-1">
                                <label className="text-[8px] font-black text-zinc-400 uppercase mb-1">SLA (мин.)</label>
                                <input 
                                    type="number" 
                                    value={type.slaMinutes} 
                                    onChange={e => {
                                        const n = [...localSettings.taskTypes];
                                        n[idx].slaMinutes = parseInt(e.target.value) || 0;
                                        setLocalSettings({ ...localSettings, taskTypes: n });
                                    }}
                                    className="input-3d w-full p-2 text-xs font-black dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button 
                                onClick={() => setLocalSettings({ ...localSettings, taskTypes: localSettings.taskTypes.filter(t => t.id !== type.id) })}
                                className="btn-3d p-2 text-zinc-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const PriorityEditor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Приоритеты</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase">Уровни важности и срочности задач</p>
                </div>
                <button 
                    onClick={() => setLocalSettings({
                        ...localSettings,
                        priorities: [...localSettings.priorities, { id: `p_${Date.now()}`, label: 'Приоритет', emoji: '⚪', color: '#ccc', level: 0 }]
                    })}
                    className="btn-3d bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-2 text-[10px] font-black uppercase"
                >
                    + Добавить
                </button>
            </div>
            <div className="grid gap-4">
                {localSettings.priorities.map((prio, idx) => (
                    <div key={prio.id} className="p-3 glass-panel grid grid-cols-12 gap-6 items-center">
                        <div className="col-span-1 text-2xl text-center">
                            <input 
                                value={prio.emoji} 
                                onChange={e => {
                                    const n = [...localSettings.priorities];
                                    n[idx].emoji = e.target.value;
                                    setLocalSettings({ ...localSettings, priorities: n });
                                }}
                                className="w-full bg-transparent text-center outline-none"
                            />
                        </div>
                        <div className="col-span-5">
                            <input 
                                value={prio.label} 
                                onChange={e => {
                                    const n = [...localSettings.priorities];
                                    n[idx].label = e.target.value;
                                    setLocalSettings({ ...localSettings, priorities: n });
                                }}
                                className="w-full bg-transparent text-sm font-black uppercase dark:text-white outline-none focus:text-primary transition-colors"
                            />
                        </div>
                        <div className="col-span-2">
                            <input 
                                type="color" 
                                value={prio.color} 
                                onChange={e => {
                                    const n = [...localSettings.priorities];
                                    n[idx].color = e.target.value;
                                    setLocalSettings({ ...localSettings, priorities: n });
                                }}
                                className="input-3d w-full h-10 cursor-pointer"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[8px] font-black text-zinc-400 uppercase mb-1 block">Уровень</label>
                            <input 
                                type="number" 
                                value={prio.level} 
                                onChange={e => {
                                    const n = [...localSettings.priorities];
                                    n[idx].level = parseInt(e.target.value) || 0;
                                    setLocalSettings({ ...localSettings, priorities: n });
                                }}
                                className="input-3d w-full p-2 text-xs font-black dark:text-white"
                            />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button 
                                onClick={() => setLocalSettings({ ...localSettings, priorities: localSettings.priorities.filter(p => p.id !== prio.id) })}
                                className="btn-3d p-2 text-zinc-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const IntegrationEditor = () => {
        if (!localSettings?.integrations?.telegram || !localSettings?.integrations?.email) {
            return <div className="p-4 text-center text-zinc-400">Загрузка настроек интеграций...</div>;
        }

        return (
            <div className="space-y-12 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Telegram */}
                <div className="glass-panel p-6 space-y-8">
                    <div className="flex items-center gap-4 border-b-2 dark:border-zinc-800 pb-6">
                        <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                            <MessageCircle size={32} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Telegram Bot</h4>
                            <p className="text-[10px] font-black text-zinc-400 uppercase">Уведомления и управление через мессенджер</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Bot Token</label>
                            <input 
                                type="password"
                                value={localSettings.integrations.telegram.botToken}
                                onChange={e => setLocalSettings({
                                    ...localSettings,
                                    integrations: {
                                        ...localSettings.integrations,
                                        telegram: { ...localSettings.integrations.telegram, botToken: e.target.value }
                                    }
                                })}
                                className="input-3d w-full p-3 text-xs font-black dark:text-white"
                                placeholder="123456789:ABCDEF..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Support Telegram ID (User ID)</label>
                            <input 
                                value={localSettings.integrations.telegram.supportTelegramId || ''}
                                onChange={e => setLocalSettings({
                                    ...localSettings,
                                    integrations: {
                                        ...localSettings.integrations,
                                        telegram: { ...localSettings.integrations.telegram, supportTelegramId: e.target.value }
                                    }
                                })}
                                className="input-3d w-full p-3 text-xs font-black dark:text-white"
                                placeholder="e.g. 123456789"
                            />
                            <p className="text-[9px] text-zinc-400 ml-4">ID пользователя Telegram, которому будут приходить запросы о помощи.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Report Telegram Chat ID</label>
                            <input 
                                value={localSettings.integrations.telegram.reportTelegramChatId || ''}
                                onChange={e => setLocalSettings({
                                    ...localSettings,
                                    integrations: {
                                        ...localSettings.integrations,
                                        telegram: { ...localSettings.integrations.telegram, reportTelegramChatId: e.target.value }
                                    }
                                })}
                                className="input-3d w-full p-3 text-xs font-black dark:text-white"
                                placeholder="e.g. -100123456789"
                            />
                            <p className="text-[9px] text-zinc-400 ml-4">ID чата/канала Telegram для отправки регулярных отчетов.</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 glass-panel">
                            <input 
                                type="checkbox" 
                                checked={localSettings.integrations.telegram.enabled}
                                onChange={e => setLocalSettings({
                                    ...localSettings,
                                    integrations: {
                                        ...localSettings.integrations,
                                        telegram: { ...localSettings.integrations.telegram, enabled: e.target.checked }
                                    }
                                })}
                                className="w-6 h-6 accent-primary"
                            />
                            <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">Включить интеграцию</span>
                        </div>
                    </div>
                </div>

                {/* Email */}
                <div className="glass-panel p-6 space-y-8">
                    <div className="flex items-center gap-4 border-b-2 dark:border-zinc-800 pb-6">
                        <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                            <Mail size={32} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Email SMTP</h4>
                            <p className="text-[10px] font-black text-zinc-400 uppercase">Рассылка отчетов и уведомлений на почту</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">SMTP Host</label>
                            <input 
                                value={localSettings.integrations.email.smtpHost}
                                onChange={e => setLocalSettings({
                                    ...localSettings,
                                    integrations: {
                                        ...localSettings.integrations,
                                        email: { ...localSettings.integrations.email, smtpHost: e.target.value }
                                    }
                                })}
                                className="input-3d w-full p-3 text-xs font-black dark:text-white"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-3 glass-panel col-span-2">
                            <input 
                                type="checkbox" 
                                checked={localSettings.integrations.email.enabled}
                                onChange={e => setLocalSettings({
                                    ...localSettings,
                                    integrations: {
                                        ...localSettings.integrations,
                                        email: { ...localSettings.integrations.email, enabled: e.target.checked }
                                    }
                                })}
                                className="w-6 h-6 accent-primary"
                            />
                            <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-300">Включить интеграцию</span>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        );
    };

    const NotificationEditor = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="glass-panel p-6">
                <div className="flex items-center gap-3 mb-10 border-b-2 dark:border-zinc-800 pb-6">
                    <Bell size={24} className="text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Настройка Событий</h3>
                </div>
                <div className="grid gap-6">
                    {Object.entries(localSettings.notifications).map(([key, config]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between p-3 glass-panel group hover:border-primary transition-all">
                            <div>
                                <h5 className="text-xs font-black uppercase dark:text-white mb-1">
                                    {key === 'onTaskCreated' && 'Создание задачи'}
                                    {key === 'onStatusChanged' && 'Изменение статуса'}
                                    {key === 'onCommentAdded' && 'Новый комментарий'}
                                    {key === 'onDeadlineApproaching' && 'Приближение дедлайна'}
                                    {key === 'onSlaBreached' && 'Нарушение SLA'}
                                </h5>
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Выберите каналы для этого события</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.internal}
                                        onChange={e => setLocalSettings({
                                            ...localSettings,
                                            notifications: {
                                                ...localSettings.notifications,
                                                [key]: { ...config, internal: e.target.checked }
                                            }
                                        })}
                                        className="w-5 h-5 accent-primary"
                                    />
                                    <span className="text-[10px] font-black uppercase text-zinc-500">Система</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.telegram}
                                        onChange={e => setLocalSettings({
                                            ...localSettings,
                                            notifications: {
                                                ...localSettings.notifications,
                                                [key]: { ...config, telegram: e.target.checked }
                                            }
                                        })}
                                        className="w-5 h-5 accent-blue-500"
                                    />
                                    <span className="text-[10px] font-black uppercase text-zinc-500">Telegram</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.email}
                                        onChange={e => setLocalSettings({
                                            ...localSettings,
                                            notifications: {
                                                ...localSettings.notifications,
                                                [key]: { ...config, email: e.target.checked }
                                            }
                                        })}
                                        className="w-5 h-5 accent-indigo-500"
                                    />
                                    <span className="text-[10px] font-black uppercase text-zinc-500">Email</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full animate-fade-in">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-80 shrink-0 space-y-2">
                <button 
                    onClick={() => setActiveTab('statuses')}
                    className={`btn-3d w-full flex items-center gap-4 p-4 text-[11px] font-black uppercase tracking-widest ${activeTab === 'statuses' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 scale-[1.02]' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-2 dark:border-zinc-800 hover:border-primary'}`}
                >
                    <ArrowRightLeft size={20}/> Статусы
                </button>
                <button 
                    onClick={() => setActiveTab('workflows')}
                    className={`btn-3d w-full flex items-center gap-4 p-4 text-[11px] font-black uppercase tracking-widest ${activeTab === 'workflows' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 scale-[1.02]' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-2 dark:border-zinc-800 hover:border-primary'}`}
                >
                    <Activity size={20}/> Бизнес-процессы
                </button>
                <button 
                    onClick={() => setActiveTab('types')}
                    className={`btn-3d w-full flex items-center gap-4 p-4 text-[11px] font-black uppercase tracking-widest ${activeTab === 'types' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 scale-[1.02]' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-2 dark:border-zinc-800 hover:border-primary'}`}
                >
                    <Type size={20}/> Типы задач
                </button>
                <button 
                    onClick={() => setActiveTab('priorities')}
                    className={`btn-3d w-full flex items-center gap-4 p-4 text-[11px] font-black uppercase tracking-widest ${activeTab === 'priorities' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 scale-[1.02]' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-2 dark:border-zinc-800 hover:border-primary'}`}
                >
                    <AlertCircle size={20}/> Приоритеты
                </button>

                <button 
                    onClick={() => setActiveTab('integrations')}
                    className={`btn-3d w-full flex items-center gap-4 p-4 text-[11px] font-black uppercase tracking-widest ${activeTab === 'integrations' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 scale-[1.02]' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-2 dark:border-zinc-800 hover:border-primary'}`}
                >
                    <Zap size={20}/> Интеграции
                </button>
                <button 
                    onClick={() => setActiveTab('notifications')}
                    className={`btn-3d w-full flex items-center gap-4 p-4 text-[11px] font-black uppercase tracking-widest ${activeTab === 'notifications' ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 scale-[1.02]' : 'bg-white dark:bg-zinc-900 text-zinc-400 border-2 dark:border-zinc-800 hover:border-primary'}`}
                >
                    <Bell size={20}/> Уведомления
                </button>

                <div className="pt-8">
                    <button 
                        onClick={handleSave}
                        className="btn-3d w-full bg-primary text-white p-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                        <Save size={20}/> Сохранить всё
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                {activeTab === 'statuses' && <StatusEditor />}
                {activeTab === 'workflows' && <WorkflowEditor />}
                {activeTab === 'types' && <TypeEditor />}
                {activeTab === 'priorities' && <PriorityEditor />}

                {activeTab === 'integrations' && <IntegrationEditor />}
                {activeTab === 'notifications' && <NotificationEditor />}
            </div>

            {editingWorkflowId && (
                <WorkflowVisualEditor 
                    workflow={localSettings.workflows?.find(w => w.id === editingWorkflowId)!}
                    statuses={localSettings.statuses}
                    onSave={(updatedWorkflow) => {
                        const newWorkflows = [...(localSettings.workflows || [])];
                        const idx = newWorkflows.findIndex(w => w.id === updatedWorkflow.id);
                        if (idx !== -1) {
                            newWorkflows[idx] = updatedWorkflow;
                            setLocalSettings({ ...localSettings, workflows: newWorkflows });
                        }
                        setEditingWorkflowId(null);
                    }}
                    onClose={() => setEditingWorkflowId(null)}
                />
            )}
        </div>
    );
};

export default TMSSettings;
