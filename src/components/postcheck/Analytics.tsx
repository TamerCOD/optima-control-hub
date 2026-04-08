import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { PostCheckEntry } from '../../types';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, LabelList
} from 'recharts';
import { Loader2, Calendar, Clock, CheckCircle2, XCircle, FileSpreadsheet, Filter, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const formatDuration = (seconds: number) => {
    if (!seconds) return '0с';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}д`);
    if (h > 0) parts.push(`${h}ч`);
    if (m > 0) parts.push(`${m}м`);
    if (s > 0 || parts.length === 0) parts.push(`${s}с`);
    
    return parts.join(' ');
};

const CustomEmployeeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = data.approved + data.rejected;
        const rate = total > 0 ? Math.round((data.approved / total) * 100) : 0;
        return (
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-zinc-700/30 shadow-xl">
                <p className="font-bold text-zinc-900 dark:text-white mb-2">{label}</p>
                <div className="space-y-1 text-sm">
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">Одобрено: {data.approved}</p>
                    <p className="text-red-600 dark:text-red-400 font-medium">Отклонено: {data.rejected}</p>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1">
                        Конверсия: <span className="font-bold text-zinc-900 dark:text-white">{rate}%</span>
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                        Ср. время: <span className="font-bold text-zinc-900 dark:text-white">{formatDuration(data.avgTime)}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const CustomGkedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const total = data.approved + data.rejected;
        const rate = total > 0 ? Math.round((data.approved / total) * 100) : 0;
        return (
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-zinc-700/30 shadow-xl">
                <p className="font-bold text-zinc-900 dark:text-white mb-2">ГКЭД: {label}</p>
                <div className="space-y-1 text-sm">
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">Одобрено: {data.approved}</p>
                    <p className="text-red-600 dark:text-red-400 font-medium">Отклонено: {data.rejected}</p>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1">
                        Всего: <span className="font-bold text-zinc-900 dark:text-white">{total}</span>
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                        Конверсия: <span className="font-bold text-zinc-900 dark:text-white">{rate}%</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const Analytics: React.FC = () => {
    const [entries, setEntries] = useState<PostCheckEntry[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [trendType, setTrendType] = useState<'all' | 'approved' | 'rejected'>('all');
    const [expandedRepeatGroup, setExpandedRepeatGroup] = useState<'4-6' | '7-9' | '10+' | null>(null);
    const [expandedRejectionGroup, setExpandedRejectionGroup] = useState<'approved' | 'abandoned' | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubEntries = db.collection('post_check_entries').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                const data = snap.docs.map(d => d.data() as PostCheckEntry);
                setEntries(data);
                setLoading(false);
            });
            
        const unsubUsers = db.collection('users').onSnapshot(snap => {
            const map: Record<string, string> = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.name) {
                    map[d.id] = data.name;
                    if (data.email) {
                        map[data.email.toLowerCase()] = data.name;
                    }
                }
            });
            setUsersMap(map);
        });

        return () => {
            unsubEntries();
            unsubUsers();
        };
    }, []);

    const filteredData = useMemo(() => {
        return entries.filter(e => {
            const date = new Date(e.createdAt);
            if (dateFrom && date < new Date(dateFrom)) return false;
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (date > to) return false;
            }
            return true;
        });
    }, [entries, dateFrom, dateTo]);

    // Metrics
    const total = filteredData.length;
    const approved = filteredData.filter(e => e.isApproved).length;
    const rejected = total - approved;
    const totalSeconds = filteredData.reduce((acc, e) => acc + e.timeSpentSeconds, 0);
    const avgTime = total > 0 ? Math.round(totalSeconds / total) : 0;

    const { avgTimePerMonth, avgTimePerDay, avgEntriesPerMonth, avgEntriesPerDay } = useMemo(() => {
        if (filteredData.length === 0) return { avgTimePerMonth: 0, avgTimePerDay: 0, avgEntriesPerMonth: 0, avgEntriesPerDay: 0 };
        const firstDate = new Date(filteredData[filteredData.length - 1].createdAt);
        const lastDate = new Date(filteredData[0].createdAt);
        const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
        const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const months = Math.max(1, (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1);
        
        return {
            avgTimePerMonth: Math.round(totalSeconds / months),
            avgTimePerDay: Math.round(totalSeconds / days),
            avgEntriesPerMonth: Math.round(total / months),
            avgEntriesPerDay: Math.round(total / days)
        };
    }, [filteredData, totalSeconds, total]);

    // Charts Data
    const reasonStats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.filter(e => !e.isApproved && e.rejectionReason).forEach(e => {
            counts[e.rejectionReason!] = (counts[e.rejectionReason!] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredData]);

    const employeeStats = useMemo(() => {
        const stats: Record<string, { name: string, approved: number, rejected: number, time: number, count: number }> = {};
        filteredData.forEach(e => {
            // Try to find real name by userId or userName (which might be an email)
            const realName = usersMap[e.userId] || usersMap[e.userName?.toLowerCase()] || e.userName || 'Неизвестно';
            const key = realName; // Group by real name
            
            if (!stats[key]) stats[key] = { name: realName, approved: 0, rejected: 0, time: 0, count: 0 };
            if (e.isApproved) stats[key].approved++; else stats[key].rejected++;
            stats[key].time += e.timeSpentSeconds;
            stats[key].count++;
        });
        return Object.values(stats)
            .map(s => ({ ...s, avgTime: Math.round(s.time / s.count) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredData, usersMap]);

    const trendData = useMemo(() => {
        const data: Record<string, { date: string, count: number }> = {};
        
        let dataToProcess = filteredData;
        if (!dateFrom && !dateTo) {
            // Filter for the last 20 days
            const twentyDaysAgo = new Date();
            twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
            twentyDaysAgo.setHours(0, 0, 0, 0);
            dataToProcess = filteredData.filter(e => new Date(e.createdAt) >= twentyDaysAgo);
        }

        dataToProcess.forEach(e => {
            if (trendType === 'approved' && !e.isApproved) return;
            if (trendType === 'rejected' && e.isApproved) return;

            const date = new Date(e.createdAt).toLocaleDateString('ru-RU');
            if (!data[date]) data[date] = { date, count: 0 };
            data[date].count++;
        });
        return Object.values(data).sort((a, b) => {
            const [d1, m1, y1] = a.date.split('.');
            const [d2, m2, y2] = b.date.split('.');
            return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
        });
    }, [filteredData, trendType, dateFrom, dateTo]);

    const gkedStats = useMemo(() => {
        const stats: Record<string, { name: string, approved: number, rejected: number, count: number }> = {};
        filteredData.forEach(e => {
            if (e.gked) {
                if (!stats[e.gked]) stats[e.gked] = { name: e.gked, approved: 0, rejected: 0, count: 0 };
                if (e.isApproved) stats[e.gked].approved++; else stats[e.gked].rejected++;
                stats[e.gked].count++;
            }
        });
        return Object.values(stats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredData]);

    const innRepeats = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(e => {
            if (!e.isApproved && e.inn) {
                counts[e.inn] = (counts[e.inn] || 0) + 1;
            }
        });
        const over4: {inn: string, count: number}[] = [];
        const over7: {inn: string, count: number}[] = [];
        const over10: {inn: string, count: number}[] = [];

        Object.entries(counts).forEach(([inn, count]) => {
            if (count >= 10) over10.push({inn, count});
            else if (count >= 7) over7.push({inn, count});
            else if (count >= 4) over4.push({inn, count});
        });

        over4.sort((a,b) => b.count - a.count);
        over7.sort((a,b) => b.count - a.count);
        over10.sort((a,b) => b.count - a.count);

        return { over4, over7, over10, counts };
    }, [filteredData]);

    const approvedAfterRejectionStats = useMemo(() => {
        const sortedEntries = [...filteredData].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const innHistory: Record<string, PostCheckEntry[]> = {};
        sortedEntries.forEach(e => {
            if (!e.inn) return;
            if (!innHistory[e.inn]) innHistory[e.inn] = [];
            innHistory[e.inn].push(e);
        });

        let totalClientsWithRejections = 0;
        let totalApprovedAfterRejection = 0;
        let totalAbandonedAfterRejection = 0;
        const rejectionsBeforeApprovalCount: Record<number, number> = {};
        const approvedClientsList: {inn: string, fullName: string, rejections: number, date: string}[] = [];
        const abandonedClientsList: {inn: string, fullName: string, rejections: number, date: string}[] = [];

        Object.entries(innHistory).forEach(([inn, history]) => {
            let rejections = 0;
            let hasRejection = false;
            let isApproved = false;
            let lastEntryDate = '';
            let fullName = '';
            
            for (const entry of history) {
                fullName = entry.fullName;
                if (!entry.isApproved) {
                    rejections++;
                    hasRejection = true;
                    lastEntryDate = entry.createdAt;
                } else {
                    if (rejections > 0) {
                        totalApprovedAfterRejection++;
                        rejectionsBeforeApprovalCount[rejections] = (rejectionsBeforeApprovalCount[rejections] || 0) + 1;
                        approvedClientsList.push({
                            inn,
                            fullName,
                            rejections,
                            date: entry.createdAt
                        });
                    }
                    isApproved = true;
                    break; 
                }
            }
            if (hasRejection) {
                totalClientsWithRejections++;
                if (!isApproved) {
                    totalAbandonedAfterRejection++;
                    abandonedClientsList.push({
                        inn,
                        fullName,
                        rejections,
                        date: lastEntryDate
                    });
                }
            }
        });

        const breakdown = Object.entries(rejectionsBeforeApprovalCount)
            .map(([rejections, count]) => ({ rejections: parseInt(rejections), count }))
            .sort((a, b) => a.rejections - b.rejections);

        return {
            totalClientsWithRejections,
            totalApprovedAfterRejection,
            totalAbandonedAfterRejection,
            percentageApproved: totalClientsWithRejections > 0 ? Math.round((totalApprovedAfterRejection / totalClientsWithRejections) * 100) : 0,
            percentageAbandoned: totalClientsWithRejections > 0 ? Math.round((totalAbandonedAfterRejection / totalClientsWithRejections) * 100) : 0,
            breakdown,
            approvedClientsList,
            abandonedClientsList
        };
    }, [filteredData]);

    const additionalConversions = useMemo(() => {
        const sortedEntries = [...filteredData].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const innHistory: Record<string, PostCheckEntry[]> = {};
        sortedEntries.forEach(e => {
            if (!e.inn) return;
            if (!innHistory[e.inn]) innHistory[e.inn] = [];
            innHistory[e.inn].push(e);
        });

        let totalUniqueInns = 0;
        let firstTimeApproved = 0;

        Object.values(innHistory).forEach(history => {
            totalUniqueInns++;
            if (history[0].isApproved) {
                firstTimeApproved++;
            }
        });

        const firstTimeApprovalRate = totalUniqueInns > 0 ? Math.round((firstTimeApproved / totalUniqueInns) * 100) : 0;

        const totalEntries = filteredData.length;
        const okpoCorrect = filteredData.filter(e => e.isOkpoCorrect).length;
        const gkedCorrect = filteredData.filter(e => e.isGkedCorrect).length;
        const bothCorrect = filteredData.filter(e => e.isOkpoCorrect && e.isGkedCorrect).length;

        const okpoCorrectRate = totalEntries > 0 ? Math.round((okpoCorrect / totalEntries) * 100) : 0;
        const gkedCorrectRate = totalEntries > 0 ? Math.round((gkedCorrect / totalEntries) * 100) : 0;
        const bothCorrectRate = totalEntries > 0 ? Math.round((bothCorrect / totalEntries) * 100) : 0;

        return {
            totalUniqueInns,
            firstTimeApproved,
            firstTimeApprovalRate,
            totalEntries,
            okpoCorrect,
            okpoCorrectRate,
            gkedCorrect,
            gkedCorrectRate,
            bothCorrect,
            bothCorrectRate
        };
    }, [filteredData]);

    const handleExportExcel = () => {
        // Main Data Sheet
        const exportData = filteredData.map(e => {
            const dateObj = new Date(e.createdAt);
            return {
                'Дата': dateObj.toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                'День': dateObj.toLocaleDateString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                'Время': dateObj.toLocaleTimeString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                'ИНН': e.inn,
                'Повторных отказов (ИНН)': innRepeats.counts[e.inn] || 0,
                'ФИО': e.fullName,
                'ОКПО': e.okpo,
                'ГКЭД': e.gked,
                'ОКПО OK': e.isOkpoCorrect ? 'Да' : 'Нет',
                'ГКЭД OK': e.isGkedCorrect ? 'Да' : 'Нет',
                'Статус': e.isApproved ? 'Одобрено' : 'Отклонено',
                'Причина': e.rejectionReason || '',
                'Сотрудник': e.userName,
                'Email сотрудника': e.userEmail || '',
                'Время (сек)': e.timeSpentSeconds,
                'Время обработки': formatDuration(e.timeSpentSeconds)
            };
        });

        // Analytics Sheet
        const analyticsData = [
            { 'Метрика': 'Всего заявок', 'Значение': total },
            { 'Метрика': 'Одобрено', 'Значение': approved },
            { 'Метрика': 'Отклонено', 'Значение': rejected },
            { 'Метрика': 'Процент одобрения', 'Значение': `${total > 0 ? Math.round(approved/total*100) : 0}%` },
            { 'Метрика': 'Процент отклонения', 'Значение': `${total > 0 ? Math.round(rejected/total*100) : 0}%` },
            { 'Метрика': 'Среднее заявок в месяц', 'Значение': avgEntriesPerMonth },
            { 'Метрика': 'Среднее заявок в день', 'Значение': avgEntriesPerDay },
            { 'Метрика': 'Суммарное время', 'Значение': formatDuration(totalSeconds) },
            { 'Метрика': 'Среднее время на заявку', 'Значение': formatDuration(avgTime) },
            { 'Метрика': 'Среднее время в месяц', 'Значение': formatDuration(avgTimePerMonth) },
            { 'Метрика': 'Среднее время в день', 'Значение': formatDuration(avgTimePerDay) },
            { 'Метрика': 'Отклонений 4-6 раз', 'Значение': innRepeats.over4.length },
            { 'Метрика': 'Отклонений 7-9 раз', 'Значение': innRepeats.over7.length },
            { 'Метрика': 'Отклонений 10+ раз', 'Значение': innRepeats.over10.length },
            { 'Метрика': '', 'Значение': '' },
            { 'Метрика': '--- КОНВЕРСИЯ ПОСЛЕ ОТКАЗОВ ---', 'Значение': '' },
            { 'Метрика': 'Всего клиентов с отказами', 'Значение': approvedAfterRejectionStats.totalClientsWithRejections },
            { 'Метрика': 'Одобрено в итоге', 'Значение': approvedAfterRejectionStats.totalApprovedAfterRejection },
            { 'Метрика': 'Процент одобренных после отказов', 'Значение': `${approvedAfterRejectionStats.percentageApproved}%` },
            { 'Метрика': 'Не стали подавать снова', 'Значение': approvedAfterRejectionStats.totalAbandonedAfterRejection },
            { 'Метрика': 'Процент бросивших после отказов', 'Значение': `${approvedAfterRejectionStats.percentageAbandoned}%` },
            ...approvedAfterRejectionStats.breakdown.map(item => ({ 'Метрика': `Одобрено после ${item.rejections} отказов`, 'Значение': item.count })),
            { 'Метрика': '', 'Значение': '' },
            { 'Метрика': '--- ДОПОЛНИТЕЛЬНЫЕ КОНВЕРСИИ ---', 'Значение': '' },
            { 'Метрика': 'Всего уникальных ИНН', 'Значение': additionalConversions.totalUniqueInns },
            { 'Метрика': 'Одобрено с первого раза', 'Значение': additionalConversions.firstTimeApproved },
            { 'Метрика': 'Конверсия с первого раза', 'Значение': `${additionalConversions.firstTimeApprovalRate}%` },
            { 'Метрика': 'Корректный ОКПО', 'Значение': `${additionalConversions.okpoCorrectRate}% (${additionalConversions.okpoCorrect})` },
            { 'Метрика': 'Корректный ГКЭД', 'Значение': `${additionalConversions.gkedCorrectRate}% (${additionalConversions.gkedCorrect})` },
            { 'Метрика': 'ОКПО и ГКЭД корректны', 'Значение': `${additionalConversions.bothCorrectRate}% (${additionalConversions.bothCorrect})` },
            { 'Метрика': '', 'Значение': '' },
            { 'Метрика': '--- ПРИЧИНЫ ОТКАЗОВ ---', 'Значение': '' },
            ...reasonStats.map(r => ({ 'Метрика': r.name, 'Значение': r.value }))
        ];

        // Repeats Sheet
        const repeatsData = [
            ...innRepeats.over10.map(r => ({ 'ИНН': r.inn, 'Количество отказов': r.count, 'Группа': '10+ раз' })),
            ...innRepeats.over7.map(r => ({ 'ИНН': r.inn, 'Количество отказов': r.count, 'Группа': '7-9 раз' })),
            ...innRepeats.over4.map(r => ({ 'ИНН': r.inn, 'Количество отказов': r.count, 'Группа': '4-6 раз' }))
        ];

        // Approved After Rejection Sheet
        const approvedAfterRejectionData = approvedAfterRejectionStats.approvedClientsList.map(c => ({
            'ИНН': c.inn,
            'ФИО': c.fullName,
            'Количество отказов до одобрения': c.rejections,
            'Дата одобрения': new Date(c.date).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'})
        }));

        // Abandoned After Rejection Sheet
        const abandonedAfterRejectionData = approvedAfterRejectionStats.abandonedClientsList.map(c => ({
            'ИНН': c.inn,
            'ФИО': c.fullName,
            'Всего отказов': c.rejections,
            'Дата последнего отказа': new Date(c.date).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'})
        }));

        const wb = XLSX.utils.book_new();
        
        const wsMain = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, wsMain, "Все записи");

        const wsAnalytics = XLSX.utils.json_to_sheet(analyticsData);
        XLSX.utils.book_append_sheet(wb, wsAnalytics, "Аналитика");

        if (repeatsData.length > 0) {
            const wsRepeats = XLSX.utils.json_to_sheet(repeatsData);
            XLSX.utils.book_append_sheet(wb, wsRepeats, "Повторные отказы");
        }

        if (approvedAfterRejectionData.length > 0) {
            const wsApprovedAfterRejection = XLSX.utils.json_to_sheet(approvedAfterRejectionData);
            XLSX.utils.book_append_sheet(wb, wsApprovedAfterRejection, "Одобрены после отказов");
        }

        if (abandonedAfterRejectionData.length > 0) {
            const wsAbandonedAfterRejection = XLSX.utils.json_to_sheet(abandonedAfterRejectionData);
            XLSX.utils.book_append_sheet(wb, wsAbandonedAfterRejection, "Бросили после отказов");
        }

        XLSX.writeFile(wb, `postcheck_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'ИНН': '12345678901234',
                'ФИО': 'Иванов Иван Иванович',
                'ОКПО': '12345678',
                'ГКЭД': '12345',
                'ОКПО OK (Да/Нет)': 'Да',
                'ГКЭД OK (Да/Нет)': 'Да',
                'Статус (Одобрено/Отклонено)': 'Одобрено',
                'Причина (если Отклонено)': '',
                'Время (сек)': '120',
                'Дата (ГГГГ-ММ-ДД)': '2023-10-25'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Шаблон");
        XLSX.writeFile(wb, "import_template.xlsx");
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Filters */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm flex flex-wrap gap-6 items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-zinc-500">
                        <Filter size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Период:</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl px-4 py-3 text-xs font-bold dark:text-white outline-none focus:border-primary transition-all shadow-inner" />
                        <span className="text-zinc-400 font-bold">-</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl px-4 py-3 text-xs font-bold dark:text-white outline-none focus:border-primary transition-all shadow-inner" />
                    </div>
                    {(dateFrom || dateTo) && (
                        <button 
                            onClick={() => { setDateFrom(''); setDateTo(''); }}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors bg-white/30 dark:bg-zinc-800/30 px-4 py-3 rounded-2xl shadow-sm border border-white/20 dark:border-zinc-700/30"
                        >
                            <X size={16} /> Сбросить
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleDownloadTemplate}
                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                    >
                        <Download size={16}/> Шаблон импорта
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
                    >
                        <FileSpreadsheet size={16}/> Экспорт Excel
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-3 bg-white/50 dark:bg-zinc-800/50 text-blue-500 rounded-2xl shadow-sm border border-white/20 dark:border-zinc-700/30"><Calendar size={24} /></div>
                        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Всего заявок</div>
                    </div>
                    <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter relative z-10 mb-4">{total}</div>
                    <div className="space-y-2 relative z-10">
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-white/20 dark:border-zinc-700/30">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">В месяц:</span> <span className="font-mono">{avgEntriesPerMonth}</span>
                        </div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-white/20 dark:border-zinc-700/30">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">В день:</span> <span className="font-mono">{avgEntriesPerDay}</span>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-3 bg-white/50 dark:bg-zinc-800/50 text-emerald-500 rounded-2xl shadow-sm border border-white/20 dark:border-zinc-700/30"><CheckCircle2 size={24} /></div>
                        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Одобрено</div>
                    </div>
                    <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter relative z-10">{approved} <span className="text-sm text-zinc-400 font-bold tracking-normal">({total > 0 ? Math.round(approved/total*100) : 0}%)</span></div>
                </div>
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-500/10 dark:bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-3 bg-white/50 dark:bg-zinc-800/50 text-red-500 rounded-2xl shadow-sm border border-white/20 dark:border-zinc-700/30"><XCircle size={24} /></div>
                        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Отклонено</div>
                    </div>
                    <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter relative z-10">{rejected} <span className="text-sm text-zinc-400 font-bold tracking-normal">({total > 0 ? Math.round(rejected/total*100) : 0}%)</span></div>
                </div>
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-3 bg-white/50 dark:bg-zinc-800/50 text-purple-500 rounded-2xl shadow-sm border border-white/20 dark:border-zinc-700/30"><Clock size={24} /></div>
                        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Время</div>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-white/20 dark:border-zinc-700/30">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Суммарно:</span> <span className="font-mono">{formatDuration(totalSeconds)}</span>
                        </div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-white/20 dark:border-zinc-700/30">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Среднее:</span> <span className="font-mono">{formatDuration(avgTime)}</span>
                        </div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-white/20 dark:border-zinc-700/30">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">В месяц:</span> <span className="font-mono">{formatDuration(avgTimePerMonth)}</span>
                        </div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-white/20 dark:border-zinc-700/30">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-widest">В день:</span> <span className="font-mono">{formatDuration(avgTimePerDay)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* INN Repeats */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm">
                <h3 className="text-xl font-bold uppercase tracking-tight mb-8 dark:text-white">Повторные отклонения ИНН</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-[2rem] border border-orange-200/50 dark:border-orange-900/30 overflow-hidden shadow-inner">
                        <button 
                            onClick={() => setExpandedRepeatGroup(expandedRepeatGroup === '4-6' ? null : '4-6')}
                            className="w-full p-3 md:p-3 text-center hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors flex flex-col items-center justify-center relative group"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-3">4-6 раз</div>
                            <div className="text-5xl font-black text-orange-700 dark:text-orange-300 tracking-tighter">{innRepeats.over4.length}</div>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-orange-400/50 group-hover:text-orange-500 transition-colors">
                                {expandedRepeatGroup === '4-6' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </div>
                        </button>
                        {expandedRepeatGroup === '4-6' && innRepeats.over4.length > 0 && (
                            <div className="p-3 border-t border-orange-200/50 dark:border-orange-900/30 max-h-64 overflow-y-auto custom-scrollbar bg-white/30 dark:bg-zinc-900/30">
                                {innRepeats.over4.map(r => (
                                    <div key={r.inn} className="flex justify-between items-center py-3 border-b border-orange-200/30 dark:border-orange-900/20 last:border-0">
                                        <span className="font-mono text-sm font-medium text-orange-800 dark:text-orange-200">{r.inn}</span>
                                        <span className="font-bold text-sm text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-3 py-1 rounded-lg">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-red-50/50 dark:bg-red-900/10 rounded-[2rem] border border-red-200/50 dark:border-red-900/30 overflow-hidden shadow-inner">
                        <button 
                            onClick={() => setExpandedRepeatGroup(expandedRepeatGroup === '7-9' ? null : '7-9')}
                            className="w-full p-3 md:p-3 text-center hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors flex flex-col items-center justify-center relative group"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-3">7-9 раз</div>
                            <div className="text-5xl font-black text-red-700 dark:text-red-300 tracking-tighter">{innRepeats.over7.length}</div>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-red-400/50 group-hover:text-red-500 transition-colors">
                                {expandedRepeatGroup === '7-9' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </div>
                        </button>
                        {expandedRepeatGroup === '7-9' && innRepeats.over7.length > 0 && (
                            <div className="p-3 border-t border-red-200/50 dark:border-red-900/30 max-h-64 overflow-y-auto custom-scrollbar bg-white/30 dark:bg-zinc-900/30">
                                {innRepeats.over7.map(r => (
                                    <div key={r.inn} className="flex justify-between items-center py-3 border-b border-red-200/30 dark:border-red-900/20 last:border-0">
                                        <span className="font-mono text-sm font-medium text-red-800 dark:text-red-200">{r.inn}</span>
                                        <span className="font-bold text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-3 py-1 rounded-lg">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-[2rem] border border-rose-200/50 dark:border-rose-900/30 overflow-hidden shadow-inner">
                        <button 
                            onClick={() => setExpandedRepeatGroup(expandedRepeatGroup === '10+' ? null : '10+')}
                            className="w-full p-3 md:p-3 text-center hover:bg-rose-100/50 dark:hover:bg-rose-900/20 transition-colors flex flex-col items-center justify-center relative group"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3">10+ раз</div>
                            <div className="text-5xl font-black text-rose-700 dark:text-rose-300 tracking-tighter">{innRepeats.over10.length}</div>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-rose-400/50 group-hover:text-rose-500 transition-colors">
                                {expandedRepeatGroup === '10+' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </div>
                        </button>
                        {expandedRepeatGroup === '10+' && innRepeats.over10.length > 0 && (
                            <div className="p-3 border-t border-rose-200/50 dark:border-rose-900/30 max-h-64 overflow-y-auto custom-scrollbar bg-white/30 dark:bg-zinc-900/30">
                                {innRepeats.over10.map(r => (
                                    <div key={r.inn} className="flex justify-between items-center py-3 border-b border-rose-200/30 dark:border-rose-900/20 last:border-0">
                                        <span className="font-mono text-sm font-medium text-rose-800 dark:text-rose-200">{r.inn}</span>
                                        <span className="font-bold text-sm text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-3 py-1 rounded-lg">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Approved after rejection */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm mt-8">
                <h3 className="text-xl font-bold uppercase tracking-tight mb-8 dark:text-white">Конверсия после отказов</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-200/50 dark:border-indigo-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3 text-center">Всего клиентов с отказами</div>
                        <div className="text-5xl font-black text-indigo-700 dark:text-indigo-300 tracking-tighter">{approvedAfterRejectionStats.totalClientsWithRejections}</div>
                    </div>
                    
                    <button 
                        onClick={() => setExpandedRejectionGroup(expandedRejectionGroup === 'approved' ? null : 'approved')}
                        className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-200/50 dark:border-emerald-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center relative group hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors w-full"
                    >
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 text-center">Одобрено в итоге</div>
                        <div className="text-5xl font-black text-emerald-700 dark:text-emerald-300 tracking-tighter">{approvedAfterRejectionStats.totalApprovedAfterRejection} <span className="text-xl text-emerald-500/70 font-bold tracking-normal">({approvedAfterRejectionStats.percentageApproved}%)</span></div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-400/50 group-hover:text-emerald-500 transition-colors">
                            {expandedRejectionGroup === 'approved' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                    </button>

                    <button 
                        onClick={() => setExpandedRejectionGroup(expandedRejectionGroup === 'abandoned' ? null : 'abandoned')}
                        className="bg-rose-50/50 dark:bg-rose-900/10 rounded-[2rem] border border-rose-200/50 dark:border-rose-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center relative group hover:bg-rose-100/50 dark:hover:bg-rose-900/20 transition-colors w-full"
                    >
                        <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3 text-center">Не стали подавать снова</div>
                        <div className="text-5xl font-black text-rose-700 dark:text-rose-300 tracking-tighter">{approvedAfterRejectionStats.totalAbandonedAfterRejection} <span className="text-xl text-rose-500/70 font-bold tracking-normal">({approvedAfterRejectionStats.percentageAbandoned}%)</span></div>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-rose-400/50 group-hover:text-rose-500 transition-colors">
                            {expandedRejectionGroup === 'abandoned' ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                    </button>
                </div>

                {expandedRejectionGroup === 'approved' && approvedAfterRejectionStats.approvedClientsList.length > 0 && (
                    <div className="mb-8 p-4 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 max-h-96 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-emerald-600 dark:text-emerald-400 border-b border-emerald-200/50 dark:border-emerald-900/30">
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">ИНН</th>
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">ФИО</th>
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">Отказов до одобрения</th>
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">Дата одобрения</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvedAfterRejectionStats.approvedClientsList.map(c => (
                                    <tr key={c.inn} className="border-b border-emerald-100 dark:border-emerald-900/20 last:border-0">
                                        <td className="py-2 font-mono">{c.inn}</td>
                                        <td className="py-2 font-medium">{c.fullName}</td>
                                        <td className="py-2"><span className="bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md font-bold">{c.rejections}</span></td>
                                        <td className="py-2 text-zinc-500">{new Date(c.date).toLocaleDateString('ru-RU')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {expandedRejectionGroup === 'abandoned' && approvedAfterRejectionStats.abandonedClientsList.length > 0 && (
                    <div className="mb-8 p-4 bg-rose-50/30 dark:bg-rose-900/10 rounded-2xl border border-rose-200/50 dark:border-rose-900/30 max-h-96 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-rose-600 dark:text-rose-400 border-b border-rose-200/50 dark:border-rose-900/30">
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">ИНН</th>
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">ФИО</th>
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">Всего отказов</th>
                                    <th className="pb-2 font-bold uppercase tracking-widest text-[10px]">Дата последнего отказа</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvedAfterRejectionStats.abandonedClientsList.map(c => (
                                    <tr key={c.inn} className="border-b border-rose-100 dark:border-rose-900/20 last:border-0">
                                        <td className="py-2 font-mono">{c.inn}</td>
                                        <td className="py-2 font-medium">{c.fullName}</td>
                                        <td className="py-2"><span className="bg-rose-100 dark:bg-rose-900/40 px-2 py-1 rounded-md font-bold">{c.rejections}</span></td>
                                        <td className="py-2 text-zinc-500">{new Date(c.date).toLocaleDateString('ru-RU')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {approvedAfterRejectionStats.breakdown.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 text-center">Детализация по количеству отказов до одобрения</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {approvedAfterRejectionStats.breakdown.map(item => (
                                <div key={item.rejections} className="bg-white/50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-white/20 dark:border-zinc-700/30 text-center flex flex-col items-center justify-center shadow-sm">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">После {item.rejections} отк.</div>
                                    <div className="text-2xl font-black text-zinc-900 dark:text-white">{item.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Additional Conversions */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm mt-8">
                <h3 className="text-xl font-bold uppercase tracking-tight mb-8 dark:text-white">Дополнительные конверсии</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-200/50 dark:border-blue-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3 text-center">Уникальных ИНН</div>
                        <div className="text-4xl font-black text-blue-700 dark:text-blue-300 tracking-tighter">{additionalConversions.totalUniqueInns}</div>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-200/50 dark:border-emerald-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 text-center">Одобрено с 1-го раза</div>
                        <div className="text-4xl font-black text-emerald-700 dark:text-emerald-300 tracking-tighter">{additionalConversions.firstTimeApprovalRate}%</div>
                        <div className="text-xs font-bold text-emerald-600/70 mt-2">{additionalConversions.firstTimeApproved} из {additionalConversions.totalUniqueInns}</div>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-200/50 dark:border-amber-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3 text-center">Корректный ОКПО</div>
                        <div className="text-4xl font-black text-amber-700 dark:text-amber-300 tracking-tighter">{additionalConversions.okpoCorrectRate}%</div>
                        <div className="text-xs font-bold text-amber-600/70 mt-2">{additionalConversions.okpoCorrect} из {additionalConversions.totalEntries}</div>
                    </div>
                    <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-[2rem] border border-purple-200/50 dark:border-purple-900/30 overflow-hidden shadow-inner p-6 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-3 text-center">Корректный ГКЭД</div>
                        <div className="text-4xl font-black text-purple-700 dark:text-purple-300 tracking-tighter">{additionalConversions.gkedCorrectRate}%</div>
                        <div className="text-xs font-bold text-purple-600/70 mt-2">{additionalConversions.gkedCorrect} из {additionalConversions.totalEntries}</div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 - Dynamics (Full Width) */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm h-[500px] flex flex-col mb-8 mt-8">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold uppercase tracking-tight dark:text-white">Динамика поступлений</h3>
                    <div className="flex bg-white/30 dark:bg-zinc-900/30 p-1.5 rounded-2xl border border-white/20 dark:border-zinc-700/30 shadow-inner">
                        <button 
                            onClick={() => setTrendType('all')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${trendType === 'all' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            Общая
                        </button>
                        <button 
                            onClick={() => setTrendType('approved')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${trendType === 'approved' ? 'bg-emerald-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            Одобрено
                        </button>
                        <button 
                            onClick={() => setTrendType('rejected')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${trendType === 'rejected' ? 'bg-red-500 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                        >
                            Отклонено
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" opacity={0.3} vertical={false} />
                            <XAxis dataKey="date" stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight={600} tickMargin={10} />
                            <YAxis stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight={600} tickMargin={10} />
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: '1px solid rgba(255,255,255,0.2)', 
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    backdropFilter: 'blur(10px)'
                                }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke={trendType === 'approved' ? '#10b981' : trendType === 'rejected' ? '#ef4444' : '#6366f1'} 
                                strokeWidth={4} 
                                dot={{ r: 4, strokeWidth: 2 }} 
                                activeDot={{ r: 8, strokeWidth: 0 }}
                            >
                                <LabelList dataKey="count" position="top" className="fill-zinc-900 dark:fill-white font-black text-lg" style={{ fontSize: '18px' }} />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm h-[500px]">
                    <h3 className="text-xl font-bold uppercase tracking-tight mb-8 dark:text-white">Причины отказов (Топ 5)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={reasonStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                                labelLine={true}
                                className="font-bold text-xs dark:fill-white"
                            >
                                {reasonStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: '1px solid rgba(255,255,255,0.2)', 
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    backdropFilter: 'blur(10px)'
                                }} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Employee Stats */}
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm h-[500px]">
                    <h3 className="text-xl font-bold uppercase tracking-tight mb-8 dark:text-white">Эффективность сотрудников (Топ 10)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={employeeStats} layout="vertical" margin={{ left: 40, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" opacity={0.5} />
                            <XAxis type="number" stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight={600} />
                            <YAxis dataKey="name" type="category" width={120} stroke="currentColor" className="text-zinc-600 dark:text-zinc-300" fontSize={11} fontWeight={700} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<CustomEmployeeTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                            <Bar dataKey="approved" name="Одобрено" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                                <LabelList dataKey="approved" position="insideRight" style={{ fontSize: '10px', fill: '#fff', fontWeight: 'bold' }} />
                            </Bar>
                            <Bar dataKey="rejected" name="Отклонено" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24}>
                                <LabelList dataKey="rejected" position="insideRight" style={{ fontSize: '10px', fill: '#fff', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* GKED Stats */}
                <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm h-[550px]">
                    <h3 className="text-xl font-bold uppercase tracking-tight mb-8 dark:text-white">Топ 10 ГКЭД</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gkedStats} layout="vertical" margin={{ left: 40, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" opacity={0.5} />
                            <XAxis type="number" stroke="currentColor" className="text-zinc-400" fontSize={10} fontWeight={600} />
                            <YAxis dataKey="name" type="category" width={100} stroke="currentColor" className="text-zinc-600 dark:text-zinc-300" fontSize={11} fontWeight={700} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<CustomGkedTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                            <Bar dataKey="approved" name="Одобрено" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                                <LabelList dataKey="approved" position="insideRight" style={{ fontSize: '10px', fill: '#fff', fontWeight: 'bold' }} />
                            </Bar>
                            <Bar dataKey="rejected" name="Отклонено" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24}>
                                <LabelList dataKey="rejected" position="insideRight" style={{ fontSize: '10px', fill: '#fff', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;

