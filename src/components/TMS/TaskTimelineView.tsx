import React, { useMemo, useState } from 'react';
import { 
    CalendarDays,
    ChevronLeft, ChevronRight as ChevronRightIcon, Layers
} from 'lucide-react';
import { ProjectTask, User, Project, TaskSettings } from '../../types';

interface Props {
    tasks: ProjectTask[];
    users: User[];
    projects: Project[];
    taskSettings: TaskSettings;
    currentUser: User;
    onSelectTask: (id: string) => void;
}

const TaskTimelineView: React.FC<Props> = ({ 
    tasks, users, projects, taskSettings, currentUser, onSelectTask 
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const allStatuses = useMemo(() => {
        return taskSettings.statuses || [];
    }, [taskSettings.statuses]);

    const getPriority = (id: string) => taskSettings.priorities.find(p => p.id === id) || { label: '?', emoji: '⚪', color: '#ccc' };

    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentMonth]);

    const tasksInTimeline = useMemo(() => {
        return tasks.filter(t => t.endDate || t.startDate);
    }, [tasks]);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-full animate-fade-in">
            <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-6">
                    <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">
                        {currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex clay-panel p-1 rounded-xl shadow-sm">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                            <ChevronLeft size={20}/>
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                            <ChevronRightIcon size={20}/>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-primary"></div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Просрочено</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">В срок</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-[1200px]">
                    {/* Header Row */}
                    <div className="flex border-b dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                        <div className="w-64 p-3 border-r dark:border-zinc-800 text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                            <Layers size={14}/> Задача
                        </div>
                        <div className="flex-1 flex">
                            {daysInMonth.map(day => (
                                <div key={day.toISOString()} className={`flex-1 p-3 border-r dark:border-zinc-800 text-center text-[10px] font-black uppercase ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-zinc-50 dark:bg-zinc-950 text-zinc-300' : 'text-zinc-400'}`}>
                                    {day.getDate()}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Rows */}
                    <div className="divide-y dark:divide-zinc-800">
                        {tasksInTimeline.length === 0 ? (
                            <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                                <CalendarDays size={64} />
                                <span className="text-xl font-black uppercase tracking-[0.3em]">Задач с дедлайнами нет</span>
                            </div>
                        ) : (
                            tasksInTimeline.map(task => {
                                const priority = getPriority(task.priority);
                                const isOverdue = task.endDate && new Date(task.endDate) < new Date() && !task.completedAt;
                                
                                return (
                                    <div key={task.id} className="flex hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group">
                                        <div 
                                            onClick={() => onSelectTask(task.id)}
                                            className="w-64 p-3 border-r dark:border-zinc-800 flex flex-col cursor-pointer"
                                        >
                                            <span className="text-[8px] font-mono font-black text-zinc-400 group-hover:text-primary transition-colors">{task.key}</span>
                                            <span className="text-[11px] font-black uppercase tracking-tighter dark:text-white line-clamp-1">{task.title}</span>
                                        </div>
                                        <div className="flex-1 flex relative h-16">
                                            {daysInMonth.map(day => (
                                                <div key={day.toISOString()} className={`flex-1 border-r dark:border-zinc-800 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-zinc-50/30 dark:bg-zinc-950/30' : ''}`}></div>
                                            ))}
                                            
                                            {/* Task Bar */}
                                            {(() => {
                                                const start = task.startDate ? new Date(task.startDate) : task.endDate ? new Date(task.endDate) : null;
                                                const end = task.endDate ? new Date(task.endDate) : null;
                                                if (!start || !end) return null;

                                                const monthStart = daysInMonth[0];
                                                const monthEnd = daysInMonth[daysInMonth.length - 1];

                                                if (end < monthStart || start > monthEnd) return null;

                                                const startIndex = Math.max(0, daysInMonth.findIndex(d => d.toDateString() === start.toDateString()));
                                                const endIndex = Math.max(startIndex, daysInMonth.findIndex(d => d.toDateString() === end.toDateString()));
                                                
                                                if (startIndex === -1 && endIndex === -1) return null;

                                                const left = (startIndex / daysInMonth.length) * 100;
                                                const width = ((endIndex - startIndex + 1) / daysInMonth.length) * 100;

                                                return (
                                                    <div 
                                                        onClick={() => onSelectTask(task.id)}
                                                        className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-xl flex items-center px-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl z-10 ${isOverdue ? 'bg-primary text-white shadow-red-glow' : 'bg-green-500 text-white shadow-green-glow'}`}
                                                        style={{ left: `${left}%`, width: `${width}%`, minWidth: '40px' }}
                                                    >
                                                        <span className="text-[9px] font-black uppercase truncate">{priority.emoji} {task.title}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskTimelineView;
