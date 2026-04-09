import React, { useMemo, useState } from 'react';
import { 
    Table2,
    Trash2, Edit3
} from 'lucide-react';
import { ProjectTask, User, Project, TaskSettings } from '../../types';

interface Props {
    tasks: ProjectTask[];
    users: User[];
    projects: Project[];
    taskSettings: TaskSettings;
    currentUser: User;
    onSelectTask: (id: string) => void;
    onUpdateTask: (task: ProjectTask) => void;
    selectedTaskIds?: string[];
    onToggleTaskSelection?: (taskId: string) => void;
    onToggleAllSelection?: () => void;
}

const TaskListView: React.FC<Props> = ({ 
    tasks, users, projects, taskSettings, currentUser, onSelectTask, onUpdateTask,
    selectedTaskIds = [], onToggleTaskSelection, onToggleAllSelection
}) => {
    const [sortField, setSortField] = useState<keyof ProjectTask>('updatedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const allStatuses = useMemo(() => {
        return taskSettings.statuses || [];
    }, [taskSettings.statuses]);

    const getStatus = (id: string) => allStatuses.find(s => s.id === id) || { label: '?', color: '#ccc', isBlocker: false };
    const getPriority = (id: string) => taskSettings.priorities.find(p => p.id === id) || { label: '?', emoji: '⚪', color: '#ccc' };

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const valA = a[sortField] || '';
            const valB = b[sortField] || '';
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tasks, sortField, sortOrder]);

    const handleSort = (field: keyof ProjectTask) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const getCountdown = (endDate: string | null) => {
        if (!endDate) return null;
        const end = new Date(endDate).getTime();
        const now = new Date().getTime();
        const diff = end - now;
        if (diff < 0) return { text: 'ПРОСРОЧЕНО', isOverdue: true };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { text: `${days}д ${hours}ч`, isOverdue: false };
    };

    const allSelected = sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length;

    return (
        <div className="glass-panel rounded-[2.5rem] overflow-hidden flex flex-col h-full animate-fade-in">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="glass-panel sticky top-0 z-10">
                        <tr className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">
                            <th className="p-3 pl-10 w-16">
                                <input 
                                    type="checkbox" 
                                    checked={allSelected}
                                    onChange={onToggleAllSelection}
                                    className="w-4 h-4 accent-primary cursor-pointer rounded"
                                />
                            </th>
                            <th className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('key')}>Задача</th>
                            <th className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('projectId')}>Проект</th>
                            <th className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>Статус</th>
                            <th className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('assigneeId')}>Исполнитель</th>
                            <th className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('priority')}>Приоритет</th>
                            <th className="p-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('endDate')}>Дедлайн</th>
                            <th className="p-3 pr-10 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 dark:divide-zinc-700/30">
                        {sortedTasks.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Table2 size={64} />
                                        <span className="text-xl font-bold uppercase tracking-[0.3em]">Задач не найдено</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedTasks.map(task => {
                                const status = getStatus(task.status);
                                const priority = getPriority(task.priority);
                                const project = projects.find(p => p.id === task.projectId);
                                const assignee = users.find(u => u.id === task.assigneeId);
                                const countdown = getCountdown(task.endDate);
                                const isSelected = selectedTaskIds.includes(task.id);
                                
                                const isOverdue = countdown?.isOverdue && !task.completedAt;
                                const isBlocker = status.isBlocker;
                                
                                let rowClass = "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer group ";
                                if (isSelected) rowClass += "bg-primary/5 dark:bg-primary/10 ";
                                else if (isBlocker) rowClass += "bg-red-50/50 dark:bg-red-900/10 ";
                                else if (isOverdue) rowClass += "bg-orange-50/50 dark:bg-orange-900/10 ";

                                return (
                                    <tr 
                                        key={task.id} 
                                        className={rowClass}
                                    >
                                        <td className="p-3 pl-10" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => onToggleTaskSelection?.(task.id)}
                                                className="w-4 h-4 accent-primary cursor-pointer rounded"
                                            />
                                        </td>
                                        <td className="p-3" onClick={() => onSelectTask(task.id)}>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-mono font-bold text-zinc-500 group-hover:text-primary transition-colors">{task.key}</span>
                                                    <span className="text-sm font-bold uppercase tracking-tighter dark:text-white line-clamp-1">{task.title}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3" onClick={() => onSelectTask(task.id)}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: project?.color || '#ccc' }}></div>
                                                <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">{project?.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3" onClick={() => onSelectTask(task.id)}>
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm" style={{ backgroundColor: `${status.color}15`, borderColor: `${status.color}40`, color: status.color }}>
                                                    {status.label}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3" onClick={() => onSelectTask(task.id)}>
                                            <div className="flex items-center gap-3">
                                                {assignee ? (
                                                    <>
                                                        <img src={assignee.avatar} className="w-8 h-8 rounded-full object-cover border border-white/20 dark:border-zinc-700/30 shadow-sm" alt={assignee.name} />
                                                        <span className="text-[10px] font-bold uppercase text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{assignee.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-zinc-400 italic">Не назначен</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3" onClick={() => onSelectTask(task.id)}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg drop-shadow-sm">{priority.emoji}</span>
                                                <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">{priority.label}</span>
                                            </div>
                                        </td>
                                        <td className="p-3" onClick={() => onSelectTask(task.id)}>
                                            {task.endDate ? (
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'dark:text-zinc-300'}`}>{new Date(task.endDate).toLocaleDateString()}</span>
                                                    {countdown && !task.completedAt && (
                                                        <span className={`text-[8px] font-bold uppercase ${countdown.isOverdue ? 'text-red-500' : 'text-zinc-500'}`}>
                                                            {countdown.text}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-3 pr-10 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onSelectTask(task.id)} className="btn-3d p-2 text-zinc-500 hover:text-primary transition-all">
                                                    <Edit3 size={16}/>
                                                </button>
                                                <button className="btn-3d p-2 text-zinc-500 hover:text-red-500 transition-all">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TaskListView;
