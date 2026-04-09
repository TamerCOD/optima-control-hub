

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { 
    Clock, Target, Hash, Percent, TrendingUp, Layers, AlertTriangle, Briefcase, 
    FileQuestion, Globe, CheckCircle, Circle, User as UserIcon, 
    Sun, ChevronRight, ChevronDown, Building2, XCircle, Trophy, AlertCircle, X,
    TrendingDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { db } from '../firebase';
import { SharedDashboardData } from '../types';

interface Props {
    shareId: string;
}

const SharedDashboardView: React.FC<Props> = ({ shareId }) => {
    const [data, setData] = useState<SharedDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);

    // --- Interactive States (Local) ---
    const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
    const [expandedRoles, setExpandedRoles] = useState<string[]>([]);
    const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);
    const [expandedAnalysisItems, setExpandedAnalysisItems] = useState<string[]>([]);
    const [questionSort, setQuestionSort] = useState<'hardest' | 'easiest'>('hardest');
    const [showAllQuestions] = useState(false);

    // --- Ranking Modal State ---
    const [rankingDeptId, setRankingDeptId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const doc = await db.collection('shared_dashboards').doc(shareId).get();
                if (doc.exists) {
                    setData(doc.data() as SharedDashboardData);
                } else {
                    setError('Ссылка недействительна или срок действия истек.');
                }
            } catch (e) {
                console.error(e);
                setError('Ошибка загрузки данных.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [shareId]);

    // --- Derived Rankings for Boards ---
    const globalRankings = useMemo(() => {
        if (!data) return { topBranches: [], bottomBranches: [], topEmps: [], bottomEmps: [] };

        // 1. Branches
        const sortedBranches = [...data.deptPerformance].sort((a: any, b: any) => b.score - a.score);
        const topBranches = sortedBranches.slice(0, 5);
        const bottomBranches = [...sortedBranches].reverse().slice(0, 5);

        // 2. Employees (Aggregated from all depts)
        const allEmps: any[] = [];
        data.deptAssignmentStats.forEach((dept: any) => {
            dept.rolesBreakdown.forEach((role: any) => {
                role.employees.forEach((emp: any) => {
                    allEmps.push({
                        ...emp,
                        deptName: dept.name,
                        roleName: role.name
                    });
                });
            });
        });

        // Sort by Score DESC
        allEmps.sort((a, b) => b.avgScore - a.avgScore);
        const topEmps = allEmps.slice(0, 5);
        const bottomEmps = [...allEmps].reverse().filter(e => e.avgScore > 0).slice(0, 5);

        return { topBranches, bottomBranches, topEmps, bottomEmps };
    }, [data]);

    // --- Toggles ---
    const toggleExpandDept = (id: string) => setExpandedDepts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleExpandRole = (id: string) => setExpandedRoles(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleExpandQuestion = (id: string) => setExpandedQuestions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleAnalysisItem = (id: string) => setExpandedAnalysisItems(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const rankingData = useMemo(() => {
        if (!rankingDeptId || !data) return null;
        if (data.rankings && data.rankings[rankingDeptId]) {
            return {
                deptName: data.deptPerformance.find((d: any) => d.id === rankingDeptId)?.name || 'Отдел',
                ...data.rankings[rankingDeptId]
            };
        }
        const deptStats = data.deptAssignmentStats.find((d: any) => d.id === rankingDeptId);
        if (!deptStats) return null;
        let allEmps: any[] = [];
        deptStats.rolesBreakdown.forEach((role: any) => {
            role.employees.forEach((emp: any) => {
                allEmps.push({ ...emp, roleName: role.name });
            });
        });
        allEmps.sort((a, b) => b.avgScore - a.avgScore);
        return { deptName: deptStats.name, top15: allEmps.slice(0, 15), bottom15: [...allEmps].reverse().slice(0, 15) };
    }, [rankingDeptId, data]);

    const theme = {
        bg: isDarkMode ? 'bg-gray-900' : 'bg-secondary-50',
        card: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-secondary-200',
        text: isDarkMode ? 'text-gray-100' : 'text-secondary-900',
        textSub: isDarkMode ? 'text-gray-400' : 'text-secondary-500',
        border: isDarkMode ? 'border-gray-700' : 'border-secondary-200',
        hover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-secondary-50',
        input: isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-secondary-200 text-secondary-900',
        subCard: isDarkMode ? 'bg-gray-700/50' : 'bg-secondary-50/50',
        chartGrid: isDarkMode ? '#374151' : '#e5e7eb',
        chartText: isDarkMode ? '#9ca3af' : '#6b7280',
    };

    if (loading) return <div className={`min-h-full flex items-center justify-center ${theme.bg}`}><div className="w-12 h-12 border-4 border-gray-500 border-t-primary-600 rounded-full animate-spin"></div></div>;
    if (error || !data) return <div className={`min-h-full flex flex-col items-center justify-center p-3 text-center ${theme.bg}`}><div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={32} /></div><h2 className={`text-xl font-bold mb-2 ${theme.text}`}>Доступ недоступен</h2><p className={theme.textSub}>{error}</p></div>;

    const { kpiData, timelineData, roleStats, sessionStats, ticketStats, questionStats, deptAssignmentStats, deptPerformance } = data;
    const sortedQuestions = [...questionStats].sort((a: any, b: any) => questionSort === 'hardest' ? b.incorrectRate - a.incorrectRate : a.incorrectRate - b.incorrectRate);

    const StatCard = ({ label, value, sub, icon: Icon, iconColor = "text-secondary-900", delay = 0 }: any) => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="clay-panel p-3"
        >
           <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</span>
              {Icon && <div className={`p-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 ${iconColor}`}><Icon size={20} /></div>}
           </div>
           <div className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">{value}</div>
           {sub && <div className="mt-2 text-xs font-bold text-zinc-400">{sub}</div>}
        </motion.div>
    );

    const RankingBoard = ({ title, items, type, isEmployee = false, delay = 0 }: any) => {
        const isBest = type === 'best';
        const accentColor = isBest ? 'text-green-500' : 'text-red-500';
        const bgAccent = isBest ? 'bg-green-500/10' : 'bg-red-500/10';
        const Icon = isBest ? Trophy : TrendingDown;

        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                className="clay-panel p-3 h-full flex flex-col"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${bgAccent} ${accentColor}`}>
                            <Icon size={20} />
                        </div>
                        <h3 className="font-serif font-bold text-lg">{title}</h3>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${bgAccent} ${accentColor}`}>
                        Top 5
                    </span>
                </div>
                <div className="space-y-4 flex-1">
                    {items.map((item: any, idx: number) => {
                        const val = isEmployee ? item.avgScore : item.score;
                        return (
                            <div key={idx} className="group relative">
                                <div className="flex justify-between items-end mb-1.5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`text-xs font-bold ${theme.textSub} w-4`}>{idx + 1}.</span>
                                        <div className="truncate">
                                            <div className="font-bold text-sm truncate">{item.name}</div>
                                            {isEmployee && <div className={`text-[10px] ${theme.textSub} truncate`}>{item.deptName} • {item.roleName}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`font-bold text-sm ${isBest ? (isDarkMode ? 'text-green-400' : 'text-green-700') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
                                            {val}%
                                        </span>
                                        {isBest ? <ArrowUpRight size={14} className="text-green-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
                                    </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/50 dark:bg-zinc-800/50 shadow-inner">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 shadow-sm ${isBest ? 'bg-green-500' : 'bg-red-500'}`} 
                                        style={{ width: `${val}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                    {items.length === 0 && <div className="text-center py-10 text-sm text-zinc-400 font-bold">Нет данных</div>}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="min-h-full font-sans transition-colors duration-300 pb-20 bg-transparent">
            {/* Header */}
            <div className="clay-panel rounded-none border-b-0 sticky top-0 z-30">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50 shadow-sm">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="font-serif text-lg font-bold tracking-tight">Optima Edu</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1 w-max"><Globe size={10} /> Публичный отчет</span>
                                <span className="text-[10px] font-bold text-zinc-400">{new Date(data.generatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="clay-btn p-2 rounded-full"><Sun size={20} /> </button>
                </div>
            </div>

            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
                
                {/* 1. KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Средний Балл" value={`${kpiData.avgScore}%`} sub="По выборке" icon={Target} iconColor="text-primary" delay={0.1} />
                    <StatCard label="Проходимость" value={`${kpiData.passRate}%`} sub={`${kpiData.passedCount} из ${kpiData.totalAttempts} сдали`} icon={Percent} iconColor="text-zinc-900 dark:text-white" delay={0.2} />
                    <StatCard label="Среднее Время" value={`${kpiData.avgTime} м.`} sub="В минутах на тест" icon={Clock} iconColor="text-blue-500" delay={0.3} />
                    <StatCard label="Активность" value={kpiData.totalAttempts} sub="Всего попыток" icon={Hash} iconColor="text-purple-500" delay={0.4} />
                </div>

                {/* --- NEW RANKING BOARDS (BRANCHES) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RankingBoard title="Лучшие филиалы" items={globalRankings.topBranches} type="best" delay={0.5} />
                    <RankingBoard title="Отстающие филиалы" items={globalRankings.bottomBranches} type="worst" delay={0.6} />
                </div>

                {/* 2. Dynamics & Roles */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="lg:col-span-2 clay-panel p-3 flex flex-col min-h-[350px]"
                    >
                        <h3 className="font-serif text-lg font-bold flex items-center gap-2 mb-6 text-zinc-900 dark:text-white">
                            <div className="p-1.5 rounded bg-white/50 dark:bg-zinc-800/50 text-primary"><TrendingUp size={18}/></div>
                            Динамика (По часам)
                        </h3>
                        <div className="flex-grow">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 10, fill: theme.chartText}} axisLine={false} tickLine={false} dy={10} interval="preserveStartEnd" />
                                    <YAxis domain={[0, 100]} tick={{fontSize: 12, fill: theme.chartText}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#fff' : '#000'}} />
                                    <Line type="monotone" dataKey="score" stroke="#dc2626" strokeWidth={3} dot={{r: 3, fill: '#dc2626', strokeWidth: 0}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        className="clay-panel p-3 flex flex-col min-h-[350px]"
                    >
                        <h3 className="font-serif text-lg font-bold flex items-center gap-2 mb-2 text-zinc-900 dark:text-white">
                            <div className="p-1.5 bg-primary/10 rounded text-primary"><Briefcase size={18}/></div>
                            Успеваемость (Должности)
                        </h3>
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                            <div className="space-y-4 mt-2">
                                {roleStats.map((r: any, idx: number) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1 font-bold">
                                            <span className="text-zinc-500 dark:text-zinc-400">{r.name}</span>
                                            <span className="text-zinc-900 dark:text-white">{r.avgScore}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full overflow-hidden bg-white/50 dark:bg-zinc-800/50 shadow-inner">
                                            <div className="h-full rounded-full bg-primary shadow-sm" style={{width: `${r.avgScore}%`}}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* --- NEW RANKING BOARDS (EMPLOYEES) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RankingBoard title="Лучшие сотрудники" items={globalRankings.topEmps} type="best" isEmployee={true} delay={0.9} />
                    <RankingBoard title="Группа риска (сотрудники)" items={globalRankings.bottomEmps} type="worst" isEmployee={true} delay={1.0} />
                </div>

                {/* 3. Session & Ticket Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="clay-panel flex flex-col max-h-[500px]">
                        <div className={`p-3 border-b ${theme.border}`}>
                            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                                <div className={`p-1.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-secondary-100'} ${theme.text}`}><Layers size={18}/></div>
                                Аналитика Сессий
                            </h3>
                        </div>
                        <div className="overflow-auto custom-scrollbar p-0">
                            <table className="w-full text-left">
                                <thead className={`${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-secondary-50 text-secondary-500'} text-xs font-semibold uppercase sticky top-0 z-10`}>
                                    <tr><th className="p-3">Сессия</th><th className="p-3 text-center">Прошло</th><th className="p-3 text-center">Успех</th><th className="p-3 text-center">Провал</th><th className="p-3 text-right">Балл</th></tr>
                                </thead>
                                <tbody className={`text-sm divide-y ${theme.border}`}>
                                    {sessionStats.map((s: any) => (
                                        <tr key={s.id} className={theme.hover}><td className="p-3"><div className="font-bold">{s.title}</div><div className={`text-xs ${theme.textSub} truncate max-w-[150px]`}>{s.ticketName}</div></td><td className="p-3 text-center">{s.attempts}</td><td className="p-3 text-center text-green-600">{s.passed}</td><td className="p-3 text-center text-red-600">{s.failed}</td><td className="p-3 text-right font-bold">{s.avgScore}%</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="clay-panel p-3 flex flex-col">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-serif text-lg font-bold flex items-center gap-2"><div className={`p-1.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-secondary-100'} ${theme.text}`}><FileQuestion size={18}/></div> Сложность Билетов </h3></div>
                        <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                            {ticketStats.map((t: any) => (
                                <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-secondary-50/50 border-secondary-100'}`}><div className="flex-1 min-w-0 mr-4"><div className="font-medium text-sm truncate">{t.title}</div><div className={`text-xs ${theme.textSub}`}>Прошло: {t.total} чел.</div></div><div className="text-right"><div className={`font-bold text-sm ${t.failRate > 50 ? 'text-primary-500' : theme.text}`}>{t.failRate}% провалов</div><div className={`w-24 h-1.5 rounded-full mt-1 ml-auto ${isDarkMode ? 'bg-gray-600' : 'bg-secondary-200'}`}><div className="h-full bg-primary-600 rounded-full" style={{width: `${t.failRate}%`}}></div></div></div></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Question Analysis (Deep Dive) */}
                <div className="clay-panel flex flex-col">
                    <div className={`p-3 border-b ${theme.border} flex justify-between items-center`}><h3 className="font-serif text-lg font-bold flex items-center gap-2"><div className="p-1.5 bg-primary-50 rounded text-primary-600"><AlertTriangle size={18}/></div>Анализ Вопросов (Детализация)</h3><div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-secondary-100'}`}><button onClick={() => setQuestionSort('hardest')} className={`px-2 py-1 rounded text-xs font-medium transition-all ${questionSort === 'hardest' ? (isDarkMode ? 'bg-gray-600 text-white' : 'bg-white shadow text-secondary-900') : theme.textSub}`}>Топ Ошибок</button><button onClick={() => setQuestionSort('easiest')} className={`px-2 py-1 rounded text-xs font-medium transition-all ${questionSort === 'easiest' ? (isDarkMode ? 'bg-gray-600 text-white' : 'bg-white shadow text-secondary-900') : theme.textSub}`}>Легкие</button></div></div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0 max-h-[600px]">
                        <div className={`divide-y ${theme.border}`}>
                            {sortedQuestions.slice(0, showAllQuestions ? undefined : 15).map((q: any) => {
                                const isExpanded = expandedQuestions.includes(q.id);
                                return (
                                    <div key={q.id} className="group transition-all">
                                        <div onClick={() => toggleExpandQuestion(q.id)} className={`p-3 cursor-pointer flex items-start gap-3 ${isExpanded ? (isDarkMode ? 'bg-gray-700/50' : 'bg-secondary-50') : theme.hover}`}><button className={`mt-0.5 ${theme.textSub} transition-transform ${isExpanded ? 'rotate-90' : ''}`}><ChevronRight size={16} /></button><div className="flex-1"><div className="flex justify-between items-start mb-1"><span className={`text-xs ${theme.textSub} font-medium truncate max-w-[200px]`}>{q.ticketTitle}</span><span className={`text-xs font-bold ${questionSort === 'hardest' ? 'text-primary-500' : 'text-green-600'}`}>{questionSort === 'hardest' ? `${q.incorrectRate}% Ошибок` : `${100 - q.incorrectRate}% Верно`}</span></div><p className="text-sm font-medium line-clamp-2">{q.text}</p></div></div>
                                        {isExpanded && (
                                            <div className={`p-3 pl-10 border-t ${theme.border} ${theme.subCard} text-xs`}><div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div><h5 className={`font-bold uppercase mb-2 flex items-center gap-1 ${theme.textSub}`}><Building2 size={12}/> Отделы</h5><div className="space-y-1">{Object.entries(q.deptBreakdown).sort((a:any, b:any) => b[1].length - a[1].length).map(([dept, names]: any) => { const uniqueKey = `${q.id}_dept_${dept}`; const isItemExpanded = expandedAnalysisItems.includes(uniqueKey); return <div key={dept} className={`border rounded overflow-hidden ${theme.border} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}><div onClick={() => toggleAnalysisItem(uniqueKey)} className={`flex justify-between items-center p-1.5 cursor-pointer ${theme.hover}`}><span className="truncate pr-2 font-medium">{dept}</span><div className="flex items-center gap-1"><span className="font-bold text-primary-600">{names.length}</span><ChevronDown size={10} className={`transition-transform ${isItemExpanded ? 'rotate-180' : ''}`}/></div></div>{isItemExpanded && <div className={`p-2 border-t ${theme.border} ${isDarkMode ? 'bg-gray-900' : 'bg-secondary-50'}`}><ul className={`list-disc list-inside space-y-0.5 ${theme.textSub}`}>{names.map((name: string, i: number) => <li key={i}>{name}</li>)}</ul></div>}</div>; })}</div></div>
                                                <div><h5 className={`font-bold uppercase mb-2 flex items-center gap-1 ${theme.textSub}`}><Briefcase size={12}/> Должности</h5><div className="space-y-1">{Object.entries(q.roleBreakdown).sort((a:any, b:any) => b[1].length - a[1].length).map(([role, names]: any) => { const uniqueKey = `${q.id}_role_${role}`; const isItemExpanded = expandedAnalysisItems.includes(uniqueKey); return <div key={role} className={`border rounded overflow-hidden ${theme.border} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}><div onClick={() => toggleAnalysisItem(uniqueKey)} className={`flex justify-between items-center p-1.5 cursor-pointer ${theme.hover}`}><span className="truncate pr-2 font-medium">{role}</span><div className="flex items-center gap-1"><span className="font-bold text-primary-600">{names.length}</span><ChevronDown size={10} className={`transition-transform ${isItemExpanded ? 'rotate-180' : ''}`}/></div></div>{isItemExpanded && <div className={`p-2 border-t ${theme.border} ${isDarkMode ? 'bg-gray-900' : 'bg-secondary-50'}`}><ul className={`list-disc list-inside space-y-0.5 ${theme.textSub}`}>{names.map((name: string, i: number) => <li key={i}>{name}</li>)}</ul></div>}</div>; })}</div></div>
                                                <div><h5 className={`font-bold uppercase mb-2 flex items-center gap-1 ${theme.textSub}`}><XCircle size={12}/> Варианты ответов</h5><div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">{q.optionsBreakdown?.sort((a:any, b:any) => b.count - a.count).map((opt: any) => { const uniqueKey = `${q.id}_opt_${opt.id}`; const isItemExpanded = expandedAnalysisItems.includes(uniqueKey); const isWrongAndHasUsers = !opt.isCorrect && opt.userNames.length > 0; return <div key={opt.id} className={`border rounded overflow-hidden ${opt.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}><div onClick={() => isWrongAndHasUsers && toggleAnalysisItem(uniqueKey)} className={`flex justify-between items-start gap-2 p-1.5 ${isWrongAndHasUsers ? 'cursor-pointer hover:opacity-80' : ''}`}><span className={`line-clamp-2 text-xs ${opt.isCorrect ? 'text-green-800 font-medium' : isDarkMode ? 'text-gray-300' : 'text-secondary-700'}`}>{opt.isCorrect && '✅ '}{opt.text}</span><div className="flex items-center gap-1 shrink-0"><span className={`font-bold ${opt.isCorrect ? 'text-green-600' : 'text-red-600'}`}>{opt.count}</span>{isWrongAndHasUsers && <ChevronDown size={10} className={`text-secondary-400 transition-transform ${isItemExpanded ? 'rotate-180' : ''}`}/>}</div></div>{isItemExpanded && isWrongAndHasUsers && <div className={`p-2 border-t ${theme.border} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}><ul className={`list-disc list-inside space-y-0.5 text-[10px] ${theme.textSub}`}>{opt.userNames.map((name: string, i: number) => <li key={i}>{name}</li>)}</ul></div>}</div>; })}</div></div>
                                            </div></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 5. Department Assignment Stats (3 Levels) */}
                <div className="clay-panel flex flex-col">
                    <div className={`p-3 border-b ${theme.border}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-secondary-100'} ${theme.text}`}><Briefcase size={20} /></div><div><h3 className="font-serif text-lg font-bold">Статистика Назначений (Детализация)</h3><p className={`text-xs ${theme.textSub}`}>Прогресс выполнения по отделам и сотрудникам</p></div></div></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className={`${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-secondary-50 text-secondary-500'} text-xs font-semibold uppercase`}><th className="p-3 pl-6">Отдел</th><th className="p-3 text-center">Сотрудников</th><th className="p-3 text-center">Назначено</th><th className="p-3 text-center">Завершено</th><th className="p-3 pr-6">Прогресс</th></tr></thead>
                            <tbody className={`text-sm divide-y ${theme.border}`}>
                                {deptAssignmentStats.map((dept: any) => (
                                    <React.Fragment key={dept.id}>
                                        <tr className={`transition-colors ${expandedDepts.includes(dept.id) ? (isDarkMode ? 'bg-gray-700/50' : 'bg-secondary-50') : theme.hover}`}><td className="p-3 pl-6"><div className="flex items-center gap-3"><button onClick={() => toggleExpandDept(dept.id)} className={`p-1 rounded transition-all ${expandedDepts.includes(dept.id) ? 'rotate-90' : ''} ${theme.textSub} hover:bg-gray-500/20`}><ChevronRight size={16} /></button><span className="font-medium">{dept.name}</span></div></td><td className={`p-3 text-center ${theme.textSub}`}>{dept.userCount}</td><td className="p-3 text-center font-semibold">{dept.assigned}</td><td className="p-3 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${dept.completed === dept.assigned ? 'bg-green-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-secondary-100 text-secondary-700'}`}>{dept.completed}</span></td><td className="p-3 pr-6 w-1/3"><div className="flex items-center gap-3"><div className={`flex-1 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : 'bg-secondary-100'}`}><div className={`h-full rounded-full ${dept.percentage === 100 ? 'bg-green-500' : dept.percentage < 50 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${dept.percentage}%` }}></div></div><span className="text-xs font-bold w-8 text-right">{dept.percentage}%</span></div></td></tr>
                                        {expandedDepts.includes(dept.id) && (
                                            <tr><td colSpan={5} className="p-0 border-none"><div className={`p-3 pl-14 border-b ${theme.border} ${theme.subCard}`}><div className={`rounded-lg border overflow-hidden ${theme.card}`}><div className={`px-4 py-2 border-b text-xs font-bold uppercase flex justify-between ${theme.border} ${isDarkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-secondary-100/50 text-secondary-500'}`}><span>Должности (Роли)</span><span>Прогресс</span></div><div className={`divide-y ${theme.border}`}>{dept.rolesBreakdown.map((role: any) => (
                                                <React.Fragment key={role.uniqueKey}><div className={`p-2 transition-colors ${theme.hover}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => toggleExpandRole(role.uniqueKey)} className={`p-1 rounded transition-all ${expandedRoles.includes(role.uniqueKey) ? 'rotate-90' : ''} ${theme.textSub} hover:bg-gray-500/20`}><ChevronRight size={14} /></button><div className="flex flex-col cursor-pointer" onClick={() => toggleExpandRole(role.uniqueKey)}><span className="text-sm font-medium">{role.name}</span><span className={`text-[10px] ${theme.textSub}`}>Назначено: {role.assigned} | Сдано: {role.completed}</span></div></div><div className="w-1/3 flex items-center gap-3"><div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : 'bg-secondary-100'}`}><div className="h-full bg-primary-500 rounded-full" style={{ width: `${role.percentage}%` }}></div></div><span className={`text-xs font-bold w-8 text-right ${theme.textSub}`}>{role.percentage}%</span></div></div></div>
                                                {expandedRoles.includes(role.uniqueKey) && <div className={`p-2 pl-12 border-t animate-slide-up ${theme.border} ${isDarkMode ? 'bg-gray-900/30' : 'bg-secondary-50/50'}`}><div className="space-y-1">{role.employees.map((emp: any) => (<div key={emp.id} className={`flex items-center justify-between p-2 rounded border text-xs ${theme.card}`}><div className="flex items-center gap-2"><UserIcon size={12} className={theme.textSub}/><span className="font-medium">{emp.name}</span></div><div className="flex items-center gap-4"><span className={theme.textSub}>Тестов: {emp.completedCount}/{emp.assignedCount}</span>{emp.status === 'completed' && <span className="flex items-center gap-1 text-green-500 font-bold"><CheckCircle size={10} /> Все сданы</span>}{emp.status === 'in_progress' && <span className="flex items-center gap-1 text-amber-500 font-bold"><Circle size={10} /> В процессе</span>}{emp.status === 'pending' && <span className={`flex items-center gap-1 ${theme.textSub}`}>Не начинал</span>}</div></div>))}</div></div>}</React.Fragment>
                                            ))}</div></div></div></td></tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Ranking Charts */}
                {deptPerformance && deptPerformance.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="clay-panel flex flex-col">
                            <div className={`p-3 border-b ${theme.border} flex justify-between items-center`}><div><h3 className="font-serif text-lg font-bold">Рейтинг Успеваемости</h3><p className={`text-xs ${theme.textSub} mt-1`}>Средний балл по отделам</p></div><select className={`clay-input text-xs px-2 py-1 outline-none cursor-pointer`} onChange={(e) => { if (e.target.value) setRankingDeptId(e.target.value); }} value="" ><option value="" disabled>Детализация по отделу...</option>{deptPerformance.map((d: any) => (<option key={d.id} value={d.id}>{d.name}</option>))}</select></div>
                            <div className="p-3 overflow-x-auto"><div style={{ height: `${Math.max(350, deptPerformance.length * 60)}px`, minWidth: '100%' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={deptPerformance} layout="vertical" margin={{left: 10, right: 30}} onClick={(data: any) => { if (data && data.activePayload && data.activePayload.length > 0) setRankingDeptId(data.activePayload[0].payload.id); }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.chartGrid} /><XAxis type="number" domain={[0, 100]} hide /><YAxis dataKey="name" type="category" width={220} tick={{fontSize: 11, fill: theme.chartText, fontWeight: 500, cursor: 'pointer'}} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: isDarkMode ? '#374151' : '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#fff' : '#000'}} /><Bar dataKey="score" fill="#9ca3af" barSize={24} radius={[0, 4, 4, 0]} label={{ position: 'right', fill: theme.chartText, fontSize: 11, formatter: (v: any) => `${v}%` }} className="cursor-pointer hover:opacity-80 transition-opacity"/></BarChart></ResponsiveContainer></div></div>
                        </div>
                    </div>
                )}

                {/* DEPARTMENT RANKING MODAL */}
                {rankingDeptId && rankingData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-fade-in"><div className={`rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden ${theme.card}`}><div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${theme.border} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}><div><div className={`text-xs font-bold uppercase tracking-wide mb-1 ${theme.textSub}`}>Детализация отдела</div><h2 className="font-serif text-2xl font-bold flex items-center gap-2"><Building2 size={24} className={theme.textSub}/>{rankingData.deptName}</h2></div><button onClick={() => setRankingDeptId(null)} className={`p-2 rounded-full transition-colors ${theme.textSub} ${theme.hover}`}><X size={24} /></button></div><div className={`flex-1 overflow-y-auto custom-scrollbar p-3 ${theme.subCard}`}><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-800 border-green-900' : 'bg-white border-green-100'}`}><div className={`p-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-green-900/20 border-green-900 text-green-400' : 'bg-green-50 border-green-100 text-green-800'}`}><Trophy size={18} /><h3 className="font-bold">Топ 15 Лучших</h3></div><div className={`divide-y flex-1 ${isDarkMode ? 'divide-gray-700' : 'divide-secondary-50'}`}>{rankingData.top15.length > 0 ? rankingData.top15.map((u: any, idx: number) => (<div key={idx} className={`p-2 flex items-center gap-3 transition-colors ${theme.hover}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>{idx + 1}</div><div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{u.name}</div><div className={`text-xs truncate ${theme.textSub}`}>{u.roleName}</div></div><div className="text-right"><div className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{u.avgScore}%</div><div className={`text-[10px] ${theme.textSub}`}>{u.count} тестов</div></div></div>)) : (<div className={`p-4 text-center text-sm ${theme.textSub}`}>Нет данных</div>)}</div></div><div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-800 border-red-900' : 'bg-white border-red-100'}`}><div className={`p-3 border-b flex items-center gap-2 ${isDarkMode ? 'bg-red-900/20 border-red-900 text-red-400' : 'bg-red-50 border-red-100 text-red-800'}`}><AlertCircle size={18} /><h3 className="font-bold">Топ 15 Отстающих</h3></div><div className={`divide-y flex-1 ${isDarkMode ? 'divide-gray-700' : 'divide-secondary-50'}`}>{rankingData.bottom15.length > 0 ? rankingData.bottom15.map((u: any, idx: number) => (<div key={idx} className={`p-2 flex items-center gap-3 transition-colors ${theme.hover}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'}`}>{idx + 1}</div><div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{u.name}</div><div className={`text-xs truncate ${theme.textSub}`}>{u.roleName}</div></div><div className="text-right"><div className={`font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{u.avgScore}%</div><div className={`text-[10px] ${theme.textSub}`}>{u.count} тестов</div></div></div>)) : (<div className={`p-4 text-center text-sm ${theme.textSub}`}>Нет данных</div>)}</div></div></div></div></div></div>
                )}

            </div>
        </div>
    );
};

export default SharedDashboardView;

