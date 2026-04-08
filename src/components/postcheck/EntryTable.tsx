import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { PostCheckEntry } from '../../types';
import { Loader2, Plus, CheckCircle2, XCircle, Pencil, ChevronLeft, ChevronRight, PhoneCall, Download, Search, Send, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
    onCreate: () => void;
    onEdit: (entry: PostCheckEntry) => void;
    refreshTrigger: number;
}

const EntryTable: React.FC<Props> = ({ onCreate, onEdit, refreshTrigger }) => {
    const [entries, setEntries] = useState<PostCheckEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showReportMenu, setShowReportMenu] = useState(false);
    const [sendingReport, setSendingReport] = useState(false);
    const itemsPerPage = 30;

    useEffect(() => {
        setLoading(true);
        const unsub = db.collection('post_check_entries')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setEntries(snap.docs.map(d => d.data() as PostCheckEntry));
                setLoading(false);
            });
        return () => unsub();
    }, [refreshTrigger]);

    const innRejectionCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        entries.forEach(entry => {
            if (!entry.isApproved && entry.inn) {
                counts[entry.inn] = (counts[entry.inn] || 0) + 1;
            }
        });
        return counts;
    }, [entries]);

    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) return entries;
        const query = searchQuery.toLowerCase().trim();
        return entries.filter(entry => {
            return (
                (entry.inn && entry.inn.toLowerCase().includes(query)) ||
                (entry.fullName && entry.fullName.toLowerCase().includes(query)) ||
                (entry.okpo && entry.okpo.toLowerCase().includes(query)) ||
                (entry.gked && entry.gked.toLowerCase().includes(query)) ||
                (entry.userName && entry.userName.toLowerCase().includes(query)) ||
                (entry.rejectionReason && entry.rejectionReason.toLowerCase().includes(query))
            );
        });
    }, [entries, searchQuery]);

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
    const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const exportToExcel = () => {
        const dataToExport = filteredEntries.map(entry => ({
            'ИНН': entry.inn,
            'Повторы': innRejectionCounts[entry.inn] || 0,
            'ФИО': entry.fullName,
            'ОКПО': entry.okpo,
            'ГКЭД': entry.gked,
            'ОКПО OK?': entry.isOkpoCorrect ? 'Да' : 'Нет',
            'ГКЭД OK?': entry.isGkedCorrect ? 'Да' : 'Нет',
            'Лицензируемая': entry.isLicensedActivity ? 'Да' : 'Нет',
            'Лицензия': entry.isLicensedActivity ? (entry.hasLicense ? 'Есть' : 'Нет') : '-',
            'Статус': entry.isApproved ? 'Одобрено' : 'Отклонено',
            'Причина': entry.rejectionReason || '-',
            'Сотрудник': entry.userName,
            'Дата': new Date(entry.createdAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}),
            'Время (сек)': entry.timeSpentSeconds
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "PostCheck");
        XLSX.writeFile(workbook, `PostCheck_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSendReport = async (type: 'daily' | 'weekly') => {
        setSendingReport(true);
        setShowReportMenu(false);
        try {
            const res = await fetch('/api/postcheck/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send report');
            }
            alert(`Отчет (${type === 'daily' ? 'Ежедневный' : 'Еженедельный'}) успешно отправлен!`);
        } catch (e: any) {
            console.error(e);
            alert(`Ошибка при отправке отчета: ${e.message}`);
        } finally {
            setSendingReport(false);
        }
    };

    return (
        <div className="glass-panel rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 md:p-3 border-b border-white/20 dark:border-zinc-700/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/30 dark:bg-zinc-800/30 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white">Последние записи</h2>
                    <span className="bg-white/50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-inner border border-white/20 dark:border-zinc-700/30">
                        Всего: {filteredEntries.length}
                    </span>
                </div>
                
                <div className="flex-1 w-full md:max-w-md relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Поиск по ИНН, ФИО, ОКПО, ГКЭД..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-400 dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="relative">
                        <button 
                            onClick={() => setShowReportMenu(!showReportMenu)}
                            disabled={sendingReport}
                            className="glass-panel hover:bg-white/50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center gap-2 border border-white/20 dark:border-zinc-700/30"
                        >
                            {sendingReport ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <span className="hidden md:inline">Отчет</span>
                            <ChevronDown size={14} />
                        </button>
                        {showReportMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowReportMenu(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-20 animate-fade-in-down">
                                    <button 
                                        onClick={() => handleSendReport('daily')}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        Ежедневный отчет
                                    </button>
                                    <button 
                                        onClick={() => handleSendReport('weekly')}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-100 dark:border-zinc-700"
                                    >
                                        Еженедельный отчет
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <button 
                        onClick={exportToExcel}
                        className="glass-panel hover:bg-white/50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 px-4 md:px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm flex items-center gap-2 border border-white/20 dark:border-zinc-700/30"
                    >
                        <Download size={16} /> <span className="hidden md:inline">Выгрузить</span>
                    </button>
                    <button 
                        onClick={onCreate}
                        className="bg-primary hover:bg-indigo-600 text-white px-4 md:px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md flex items-center gap-2"
                    >
                        <Plus size={16} /> <span className="hidden md:inline">Создать</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/20 dark:bg-zinc-800/20 text-xs uppercase tracking-widest text-zinc-500 font-bold border-b border-white/20 dark:border-zinc-700/30 backdrop-blur-sm">
                            <th className="p-3 whitespace-nowrap">ИНН</th>
                            <th className="p-3 whitespace-nowrap">Повторы</th>
                            <th className="p-3 whitespace-nowrap">ФИО</th>
                            <th className="p-3 whitespace-nowrap">ОКПО / ГКЭД</th>
                            <th className="p-3 text-center whitespace-nowrap">ОКПО OK?</th>
                            <th className="p-3 text-center whitespace-nowrap">ГКЭД OK?</th>
                            <th className="p-3 text-center whitespace-nowrap">Лицензия</th>
                            <th className="p-3 text-center whitespace-nowrap">Статус</th>
                            <th className="p-3 whitespace-nowrap">Причина</th>
                            <th className="p-3 whitespace-nowrap">Сотрудник</th>
                            <th className="p-3 text-right whitespace-nowrap">Время</th>
                            <th className="p-3 text-center whitespace-nowrap">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 dark:divide-zinc-700/20">
                        {loading ? (
                            <tr><td colSpan={11} className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                        ) : paginatedEntries.length === 0 ? (
                            <tr><td colSpan={11} className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">Нет данных</td></tr>
                        ) : (
                            paginatedEntries.map(entry => {
                                const rejectionCount = innRejectionCounts[entry.inn] || 0;
                                const needsCall = rejectionCount >= 4;

                                return (
                                    <tr key={entry.id} className="hover:bg-white/30 dark:hover:bg-zinc-800/30 transition-colors group">
                                        <td className="p-3 font-mono text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                            {entry.inn}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                {rejectionCount > 0 ? (
                                                    <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">{rejectionCount}</span>
                                                ) : (
                                                    <span className="text-zinc-400 text-sm">-</span>
                                                )}
                                                {needsCall && (
                                                    <span className="inline-flex items-center gap-1 bg-red-100/80 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm border border-red-200/50 dark:border-red-800/50" title={`Отклонен ${rejectionCount} раз`}>
                                                        <PhoneCall size={10} /> Созвон
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 font-bold text-sm text-zinc-900 dark:text-white max-w-[200px] truncate" title={entry.fullName}>{entry.fullName}</td>
                                        <td className="p-3 font-mono text-xs text-zinc-500 font-medium">
                                            <div>{entry.okpo}</div>
                                            <div className="text-zinc-400">{entry.gked}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {entry.isOkpoCorrect ? <CheckCircle2 size={16} className="mx-auto text-emerald-500"/> : <XCircle size={16} className="mx-auto text-red-500"/>}
                                        </td>
                                        <td className="p-3 text-center">
                                            {entry.isGkedCorrect ? <CheckCircle2 size={16} className="mx-auto text-emerald-500"/> : <XCircle size={16} className="mx-auto text-red-500"/>}
                                        </td>
                                        <td className="p-3 text-center">
                                            {entry.isLicensedActivity ? (
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm border ${entry.hasLicense ? 'bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50' : 'bg-red-100/80 text-red-700 border-red-200/50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>
                                                    {entry.hasLicense ? 'Есть' : 'Нет'}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm border ${entry.isApproved ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-red-100/80 text-red-700 border-red-200/50 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>
                                                {entry.isApproved ? 'Одобрено' : 'Отклонено'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm text-red-500 font-medium max-w-[150px] truncate" title={entry.rejectionReason || ''}>
                                            {entry.rejectionReason || '-'}
                                        </td>
                                        <td className="p-3 text-sm text-zinc-500">
                                            <div className="font-bold text-zinc-700 dark:text-zinc-300">{entry.userName}</div>
                                            <div className="text-xs font-medium">{new Date(entry.createdAt).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek', dateStyle: 'short', timeStyle: 'short'})}</div>
                                        </td>
                                        <td className="p-3 text-right font-mono text-sm font-medium text-zinc-500">
                                            {entry.timeSpentSeconds}с
                                        </td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => onEdit(entry)}
                                                className="p-2 text-zinc-400 hover:text-primary hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all shadow-sm"
                                                title="Редактировать"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="p-3 md:p-3 border-t border-white/20 dark:border-zinc-700/30 flex items-center justify-between bg-white/30 dark:bg-zinc-800/30 backdrop-blur-md">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Страница {currentPage} из {totalPages}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntryTable;
