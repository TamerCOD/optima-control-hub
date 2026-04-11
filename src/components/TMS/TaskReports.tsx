import React, { useMemo, useState } from 'react';
import { 
    PieChart, TrendingUp, Users, 
    CheckCircle2, AlertCircle,
    ArrowUpRight, ArrowDownRight, Activity,
    Briefcase, FileSpreadsheet, Zap, Filter, X, Clock
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, PieChart as RePieChart, 
    Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { ProjectTask, User, Project, TaskSettings, ScheduledReport } from '../../types';

interface Props {
    tasks: ProjectTask[];
    users: User[];
    projects: Project[];
    taskSettings: TaskSettings;
    onSaveSettings?: (settings: TaskSettings) => void;
}

const TaskReports: React.FC<Props> = ({ tasks, users, projects, taskSettings, onSaveSettings }) => {
    const [filterProject, setFilterProject] = useState<string>('all');
    const [filterUser, setFilterUser] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleName, setScheduleName] = useState('');
    const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [scheduleDay, setScheduleDay] = useState(1);
    const [scheduleInterval, setScheduleInterval] = useState(1);
    const [scheduleTime, setScheduleTime] = useState('09:00');

    const availableCustomFields = useMemo(() => {
        if (filterProject === 'all') {
            const allFields = projects.flatMap(p => p.customFields || []);
            const uniqueFields = Array.from(new Map(allFields.map(f => [f.name, f])).values());
            return uniqueFields;
        } else {
            const project = projects.find(p => p.id === filterProject);
            return project?.customFields || [];
        }
    }, [filterProject, projects]);

    const formatDuration = (hours: number) => {
        if (!hours) return '0d 00:00:00';
        const days = Math.floor(hours / 24);
        const remainingHours = Math.floor(hours % 24);
        const minutes = Math.floor((hours * 60) % 60);
        const seconds = Math.floor((hours * 3600) % 60);
        return `${days}d ${String(remainingHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (filterProject !== 'all' && t.projectId !== filterProject) return false;
            if (filterUser !== 'all' && t.assigneeId !== filterUser) return false;
            if (dateFrom && new Date(t.createdAt) < new Date(dateFrom)) return false;
            if (dateTo && new Date(t.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
            
            // Apply custom filters
            for (const [fieldName, filterValue] of Object.entries(customFilters)) {
                if (!filterValue) continue;
                
                // Find the field ID for this task's project
                const project = projects.find(p => p.id === t.projectId);
                if (!project) return false;
                
                const fieldDef = project.customFields?.find(f => f.name === fieldName);
                if (!fieldDef) return false; // Task's project doesn't have this field
                
                const taskValue = t.customFieldValues?.[fieldDef.id];
                
                if (fieldDef.type === 'checkbox') {
                    if (filterValue === 'true' && taskValue !== true) return false;
                    if (filterValue === 'false' && taskValue !== false) return false;
                } else if (fieldDef.type === 'select') {
                    if (taskValue !== filterValue) return false;
                } else if (fieldDef.type === 'multiselect') {
                    if (!Array.isArray(taskValue) || !taskValue.includes(filterValue)) return false;
                } else {
                    // Text/number/date
                    if (!taskValue || !String(taskValue).toLowerCase().includes(filterValue.toLowerCase())) return false;
                }
            }
            
            return true;
        });
    }, [tasks, filterProject, filterUser, dateFrom, dateTo, customFilters, projects]);

    const stats = useMemo(() => {
        const completed = filteredTasks.filter(t => t.completedAt).length;
        const total = filteredTasks.length;
        const overdue = filteredTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && !t.completedAt).length;
        const inProgress = filteredTasks.filter(t => !t.completedAt && t.status !== 'todo').length;

        return {
            total,
            completed,
            overdue,
            inProgress,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }, [filteredTasks]);

    const allStatuses = useMemo(() => {
        return taskSettings.statuses || [];
    }, [taskSettings.statuses]);

    const statusData = useMemo(() => {
        return allStatuses.map(s => ({
            name: s.label,
            value: filteredTasks.filter(t => t.status === s.id).length,
            color: s.color
        }));
    }, [filteredTasks, allStatuses]);

    const projectData = useMemo(() => {
        return projects.map(p => ({
            name: p.name,
            tasks: filteredTasks.filter(t => t.projectId === p.id).length,
            completed: filteredTasks.filter(t => t.projectId === p.id && t.completedAt).length,
            color: p.color
        })).filter(p => p.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 5);
    }, [filteredTasks, projects]);

    const assigneeData = useMemo(() => {
        return users.map(u => ({
            name: u.name.split(' ')[0],
            tasks: filteredTasks.filter(t => t.assigneeId === u.id).length,
            completed: filteredTasks.filter(t => t.assigneeId === u.id && t.completedAt).length
        })).filter(u => u.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 8);
    }, [filteredTasks, users]);

    const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: { val: string, up: boolean } }) => (
        <div className="glass-panel p-4 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] -mr-6 -mt-6 opacity-10 transition-all group-hover:scale-110`} style={{ backgroundColor: color }}></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl shadow-lg" style={{ backgroundColor: `${color}15`, color }}>
                        <Icon size={24} />
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${trend.up ? 'text-green-500' : 'text-primary'}`}>
                            {trend.up ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                            {trend.val}
                        </div>
                    )}
                </div>
                <div className="text-4xl font-black tracking-tighter dark:text-white mb-1">{value}</div>
                <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{title}</div>
            </div>
        </div>
    );

    const handleExportExcel = () => {
        const data = filteredTasks.map(t => {
            const project = projects.find(p => p.id === t.projectId);
            const assignee = users.find(u => u.id === t.assigneeId);
            const reporter = users.find(u => u.id === t.reporterId);
            const status = allStatuses.find(s => s.id === t.status);
            const priority = taskSettings.priorities.find(p => p.id === t.priority);
            const type = taskSettings.taskTypes.find(tt => tt.id === t.type);

            // Format updates: Date - Text (new line)
            const updatesFormatted = t.updates?.map(u => 
                `${new Date(u.createdAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'})}: ${u.text}`
            ).join('\n') || '';
            
            // Format status history and duration
            let historyFormatted = '';
            if (t.auditLog && t.auditLog.length > 0) {
                const statusLogs = t.auditLog
                    .filter(l => l.action === 'create' || (l.action === 'update' && l.changes?.some(c => c.field === 'Статус')))
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                
                let lastTime = new Date(t.createdAt).getTime();

                statusLogs.forEach(log => {
                    if (log.action === 'create') {
                        // Task created
                        lastTime = new Date(log.createdAt).getTime();
                    } else if (log.action === 'update') {
                        const statusChange = log.changes?.find(c => c.field === 'Статус');
                        if (statusChange) {
                            const changeTime = new Date(log.createdAt).getTime();
                            const durationMs = changeTime - lastTime;
                            const durationHours = durationMs / (1000 * 60 * 60);
                            
                            historyFormatted += `${new Date(log.createdAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'})}: ${statusChange.oldValue} -> ${statusChange.newValue} (Время в пред. статусе: ${formatDuration(durationHours)})\n`;
                            
                            lastTime = changeTime;
                        }
                    }
                });
                
                // Add time spent in current status
                const now = new Date().getTime();
                const durationMs = now - lastTime;
                const durationHours = durationMs / (1000 * 60 * 60);
                historyFormatted += `Текущий статус: ${status?.label || t.status} (Время в статусе: ${formatDuration(durationHours)})`;
            }

            return {
                'ID': t.key,
                'Title': t.title,
                'Description': t.description || '',
                'Project': project?.name || 'Unknown',
                'Type': type?.label || t.type,
                'Status': status?.label || t.status,
                'Priority': priority?.label || t.priority,
                'Assignee': assignee?.name || 'Unassigned',
                'Reporter': reporter?.name || 'Unknown',
                'Created At': new Date(t.createdAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                'Updated At': new Date(t.updatedAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                'Deadline': t.endDate ? new Date(t.endDate).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}) : '',
                'Completed At': t.completedAt ? new Date(t.completedAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}) : '',
                'Time Spent': formatDuration(t.spentTime || 0),
                'Updates': updatesFormatted,
                'Status History': historyFormatted
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
        
        // Adjust column widths
        const wscols = [
            {wch: 10}, // ID
            {wch: 40}, // Title
            {wch: 40}, // Description
            {wch: 20}, // Project
            {wch: 15}, // Type
            {wch: 15}, // Status
            {wch: 15}, // Priority
            {wch: 20}, // Assignee
            {wch: 20}, // Reporter
            {wch: 20}, // Created At
            {wch: 20}, // Updated At
            {wch: 20}, // Deadline
            {wch: 20}, // Completed At
            {wch: 15}, // Time Spent
            {wch: 50}, // Updates
            {wch: 50}  // Status History
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `task_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSendTelegramReport = async () => {
        const chatId = taskSettings.integrations?.telegram?.reportTelegramChatId;
        const botToken = taskSettings.integrations?.telegram?.botToken;

        if (!chatId || !botToken) {
            alert('Telegram integration for reports is not configured!');
            return;
        }

        const reportDate = new Date().toLocaleDateString();
        const summary = `
📊 <b>Task Report - ${reportDate}</b>

✅ <b>Completed:</b> ${stats.completed}
🔥 <b>Overdue:</b> ${stats.overdue}
⚡ <b>In Progress:</b> ${stats.inProgress}
📋 <b>Total:</b> ${stats.total}
📈 <b>Completion Rate:</b> ${stats.completionRate}%

<b>Top Projects:</b>
${projectData.map(p => `• ${p.name}: ${p.completed}/${p.tasks}`).join('\n')}

<b>Team Workload:</b>
${assigneeData.map(u => `• ${u.name}: ${u.completed}/${u.tasks}`).join('\n')}
        `.trim();

        try {
            const response = await fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    botToken,
                    chatId,
                    text: summary,
                    parseMode: 'HTML'
                })
            });

            if (response.ok) {
                alert('Report sent to Telegram successfully!');
            } else {
                alert('Failed to send report to Telegram.');
            }
        } catch (error) {
            console.error('Error sending report:', error);
            alert('Error sending report to Telegram.');
        }
    };

    const handleScheduleReport = () => {
        if (!onSaveSettings) return;
        if (!scheduleName.trim()) {
            alert('Введите название отчета');
            return;
        }

        const newReport: ScheduledReport = {
            id: `sr_${Date.now()}`,
            name: scheduleName,
            frequency: scheduleFreq,
            dayOfWeek: scheduleFreq === 'weekly' ? scheduleDay : undefined,
            intervalDays: scheduleFreq === 'custom' ? scheduleInterval : undefined,
            time: scheduleTime,
            filters: {
                projectId: filterProject,
                userId: filterUser,
                customFilters
            }
        };

        const updatedSettings = {
            ...taskSettings,
            scheduledReports: [...(taskSettings.scheduledReports || []), newReport]
        };

        onSaveSettings(updatedSettings);
        setIsScheduleModalOpen(false);
        setScheduleName('');
        alert('Отчет успешно запланирован!');
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Filters */}
            <div className="glass-panel p-3 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Filter size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">Фильтры:</span>
                </div>
                
                <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="input-3d px-4 py-2 text-xs font-bold dark:text-white">
                    <option value="all">Все проекты</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="input-3d px-4 py-2 text-xs font-bold dark:text-white">
                    <option value="all">Все сотрудники</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>

                <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-3d px-4 py-2 text-xs font-bold dark:text-white" />
                    <span className="text-zinc-400">-</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-3d px-4 py-2 text-xs font-bold dark:text-white" />
                </div>

                {availableCustomFields.map(field => (
                    <div key={field.name} className="flex items-center gap-2">
                        {field.type === 'select' || field.type === 'multiselect' ? (
                            <select
                                value={customFilters[field.name] || ''}
                                onChange={e => setCustomFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                                className="input-3d px-4 py-2 text-xs font-bold dark:text-white"
                            >
                                <option value="">{field.name} (Все)</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : field.type === 'checkbox' ? (
                            <select
                                value={customFilters[field.name] || ''}
                                onChange={e => setCustomFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                                className="input-3d px-4 py-2 text-xs font-bold dark:text-white"
                            >
                                <option value="">{field.name} (Все)</option>
                                <option value="true">Да</option>
                                <option value="false">Нет</option>
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder={`${field.name}...`}
                                value={customFilters[field.name] || ''}
                                onChange={e => setCustomFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                                className="input-3d px-4 py-2 text-xs font-bold dark:text-white w-32"
                            />
                        )}
                    </div>
                ))}

                {(filterProject !== 'all' || filterUser !== 'all' || dateFrom || dateTo || Object.keys(customFilters).length > 0) && (
                    <button 
                        onClick={() => { setFilterProject('all'); setFilterUser('all'); setDateFrom(''); setDateTo(''); setCustomFilters({}); }}
                        className="ml-auto flex items-center gap-2 text-xs font-black uppercase text-zinc-400 hover:text-primary transition-colors btn-3d px-4 py-2"
                    >
                        <X size={16} /> Сбросить
                    </button>
                )}
            </div>

            <div className="flex justify-end gap-4">
                {onSaveSettings && (
                    <button 
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="btn-3d bg-purple-500 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <Clock size={16}/> Запланировать
                    </button>
                )}
                <button 
                    onClick={handleSendTelegramReport}
                    className="btn-3d bg-blue-500 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                    <Zap size={16}/> Отправить в Telegram
                </button>
                <button 
                    onClick={handleExportExcel}
                    className="btn-3d bg-green-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                    <FileSpreadsheet size={16}/> Экспорт Excel
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Всего задач" value={stats.total} icon={Briefcase} color="#6366f1" trend={{ val: '+12%', up: true }} />
                <StatCard title="Выполнено" value={stats.completed} icon={CheckCircle2} color="#10b981" trend={{ val: '84%', up: true }} />
                <StatCard title="В работе" value={stats.inProgress} icon={Activity} color="#f59e0b" trend={{ val: '-5%', up: false }} />
                <StatCard title="Просрочено" value={stats.overdue} icon={AlertCircle} color="#ef4444" trend={{ val: '2%', up: false }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Distribution */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-10 border-b-2 dark:border-zinc-800 pb-6">
                        <PieChart size={24} className="text-primary" />
                        <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Распределение по статусам</h3>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    labelLine={false}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '16px', color: '#fff' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {statusData.map(s => (
                            <div key={s.name} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                                    <span className="text-[10px] font-black uppercase text-zinc-500">{s.name}</span>
                                </div>
                                <span className="text-xs font-black dark:text-white">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Project Performance */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-10 border-b-2 dark:border-zinc-800 pb-6">
                        <TrendingUp size={24} className="text-primary" />
                        <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Топ Проектов</h3>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '16px', color: '#fff' }}
                                />
                                <Bar dataKey="tasks" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} label={{ position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                <Bar dataKey="completed" fill="#10b981" radius={[0, 10, 10, 0]} barSize={20} label={{ position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex justify-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-indigo-500"></div>
                            <span className="text-[10px] font-black uppercase text-zinc-400">Всего задач</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500"></div>
                            <span className="text-[10px] font-black uppercase text-zinc-400">Выполнено</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Workload */}
            <div className="glass-panel p-6">
                <div className="flex items-center gap-3 mb-10 border-b-2 dark:border-zinc-800 pb-6">
                    <Users size={24} className="text-primary" />
                    <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Нагрузка Команды</h3>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assigneeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '16px', color: '#fff' }}
                            />
                            <Bar dataKey="tasks" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} label={{ position: 'top', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {isScheduleModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-3">
                    <div className="glass-panel w-full max-w-md p-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Планирование Отчета</h2>
                            <button onClick={() => setIsScheduleModalOpen(false)} className="text-zinc-400 hover:text-primary transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Название отчета</label>
                                <input 
                                    type="text" 
                                    value={scheduleName}
                                    onChange={e => setScheduleName(e.target.value)}
                                    className="input-3d w-full px-4 py-3 text-sm font-bold dark:text-white"
                                    placeholder="Ежедневный отчет по проекту X"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Частота</label>
                                <select 
                                    value={scheduleFreq}
                                    onChange={e => setScheduleFreq(e.target.value as any)}
                                    className="input-3d w-full px-4 py-3 text-sm font-bold dark:text-white"
                                >
                                    <option value="daily">Ежедневно</option>
                                    <option value="weekly">Еженедельно</option>
                                    <option value="custom">Свой интервал</option>
                                </select>
                            </div>
                            {scheduleFreq === 'weekly' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">День недели</label>
                                    <select 
                                        value={scheduleDay}
                                        onChange={e => setScheduleDay(Number(e.target.value))}
                                        className="input-3d w-full px-4 py-3 text-sm font-bold dark:text-white"
                                    >
                                        <option value={1}>Понедельник</option>
                                        <option value={2}>Вторник</option>
                                        <option value={3}>Среда</option>
                                        <option value={4}>Четверг</option>
                                        <option value={5}>Пятница</option>
                                        <option value={6}>Суббота</option>
                                        <option value={0}>Воскресенье</option>
                                    </select>
                                </div>
                            )}
                            {scheduleFreq === 'custom' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Интервал (дней)</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={scheduleInterval}
                                        onChange={e => setScheduleInterval(Number(e.target.value))}
                                        className="input-3d w-full px-4 py-3 text-sm font-bold dark:text-white"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Время (Бишкек)</label>
                                <input 
                                    type="time" 
                                    value={scheduleTime}
                                    onChange={e => setScheduleTime(e.target.value)}
                                    className="input-3d w-full px-4 py-3 text-sm font-bold dark:text-white"
                                />
                            </div>
                            <button 
                                onClick={handleScheduleReport}
                                className="btn-3d w-full bg-primary text-white px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-4"
                            >
                                <Clock size={16}/> Сохранить расписание
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskReports;
