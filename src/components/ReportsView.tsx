
import React, { useState, useRef } from 'react';
import { 
    Download, FileSpreadsheet, Globe, Copy, Loader, 
    Users, X, Table, UploadCloud, FileDown, CheckCircle, AlertTriangle,
    ClipboardList, Database
} from 'lucide-react';
import { AssessmentResult, User, AssessmentSession, Ticket, Department, RoleDefinition, QuestionType } from '../types';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { generateAllDeptRankings } from '../utils/dataHelpers';

interface Props {
  results: AssessmentResult[];
  users: User[];
  sessions: AssessmentSession[];
  tickets: Ticket[];
  departments: Department[];
  roles: RoleDefinition[];
  currentUser: User;
  passingThreshold: number;
  onAddUser?: (user: User) => Promise<void>;
}

const ReportsView: React.FC<Props> = ({ results, users, sessions, tickets, departments, roles, currentUser, passingThreshold, onAddUser }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'import' | 'public'>('summary');
    
    // --- States ---
    const [isPublicLinkEnabled, setIsPublicLinkEnabled] = useState(false);
    const [publicShareId, setPublicShareId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    
    // --- Filters ---
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [filterDept, setFilterDept] = useState('all');

    // Import State
    const [importing, setImporting] = useState(false);
    const [importLogs, setImportLogs] = useState<{msg: string, type: 'success' | 'error'}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter Logic
    const getFilteredResults = () => {
        let filtered = [...results];
        if (dateStart) {
            const start = new Date(dateStart); start.setHours(0,0,0,0);
            filtered = filtered.filter(r => new Date(r.completedAt || r.startedAt) >= start);
        }
        if (dateEnd) {
            const end = new Date(dateEnd); end.setHours(23,59,59,999);
            filtered = filtered.filter(r => new Date(r.completedAt || r.startedAt) <= end);
        }
        if (filterDept !== 'all') {
            const deptUsers = users.filter(u => u.departmentId === filterDept).map(u => u.id);
            filtered = filtered.filter(r => deptUsers.includes(r.userId));
        }
        return filtered;
    };

    const generateSummaryReport = () => {
        setIsExporting(true);
        try {
            const dataToExport = getFilteredResults();
            const wb = XLSX.utils.book_new();
            const detailRows: any[][] = [[
                "ID Сотрудника", "ФИО", "Email", "ID Билета", "Название Билета", 
                "Отдел", "Роль (Должности)", "ID Сессии", "Название Сессии", 
                "Набранный балл", "Макс. балл", "%", "Статус", "Дата прохождения"
            ]];
            
            dataToExport.forEach(r => {
                const u = users.find(uu => uu.id === r.userId);
                const s = sessions.find(ss => ss.id === r.sessionId);
                const t = tickets.find(tt => tt.id === s?.ticketId);
                const score = r.maxScore > 0 ? (r.totalScore/r.maxScore)*100 : 0;
                const uRoles = u?.roles.map(rid => roles.find(ro => ro.id === rid)?.name || rid).join(', ') || '—';
                
                detailRows.push([
                    r.userId, u?.name || "Удален/Не найден", u?.email || "—", s?.ticketId || "—", t?.title || "Билет удален",
                    u?.departmentName || "—", uRoles, r.sessionId, s?.title || "Сессия удалена",
                    r.totalScore, r.maxScore, score.toFixed(1) + "%",
                    score >= passingThreshold ? "СДАЛ" : "ПРОВАЛ",
                    new Date(r.completedAt || r.startedAt).toLocaleString('ru-RU')
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(detailRows);
            ws['!cols'] = [{wch:30}, {wch:30}, {wch:25}, {wch:20}, {wch:30}, {wch:20}, {wch:20}, {wch:20}, {wch:30}, {wch:10}, {wch:10}, {wch:10}, {wch:10}, {wch:20}];
            XLSX.utils.book_append_sheet(wb, ws, "Сводка результатов");
            XLSX.writeFile(wb, `OptimaEdu_Summary_${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (e) { alert("Ошибка экспорта"); } finally { setIsExporting(false); }
    };

    const generateDetailedReport = () => {
        setIsExporting(true);
        try {
            const dataToExport = getFilteredResults();
            const wb = XLSX.utils.book_new();
            const dataRows: any[][] = [[
                "ID Сотрудника", "ФИО", "Email", "Отдел", "Роль (Должности)", 
                "ID Билета", "Название Билета", "Сессия", "Дата", "Общий % успеха", 
                "Вопрос №", "ID Вопроса", "Тип вопроса", "Вес", "Текст вопроса", 
                "Ответ сотрудника", "Балл за ответ", "Верно?"
            ]];

            dataToExport.forEach(r => {
                const u = users.find(uu => uu.id === r.userId);
                const s = sessions.find(ss => ss.id === r.sessionId);
                const t = tickets.find(tt => tt.id === s?.ticketId);
                const totalPct = r.maxScore > 0 ? (r.totalScore/r.maxScore)*100 : 0;
                const uRoles = u?.roles.map(rid => roles.find(ro => ro.id === rid)?.name || rid).join(', ') || '—';

                r.answers.forEach((ans, idx) => {
                    const question = t?.questions.find(q => q.id === ans.questionId);
                    let userResponseText = "";
                    if (question?.type === QuestionType.OPEN) {
                        userResponseText = ans.textAnswer || "(Нет ответа)";
                    } else {
                        const selectedIds = ans.selectedOptions || [];
                        userResponseText = selectedIds.map(id => {
                            const opt = question?.options?.find(o => o.id === id);
                            return opt ? opt.text : id;
                        }).join(" | ") || "(Нет ответа)";
                    }

                    dataRows.push([
                        r.userId, u?.name || "Удален", u?.email || "—", u?.departmentName || "—", uRoles,
                        s?.ticketId || "—", t?.title || "—", s?.title || "—", new Date(r.completedAt || r.startedAt).toLocaleDateString(),
                        totalPct.toFixed(1) + "%", idx + 1, ans.questionId, question?.type || "—", question?.weight || 1, question?.text || "Вопрос удален",
                        userResponseText, ans.score, ans.isCorrect ? "ДА" : "НЕТ"
                    ]);
                });
            });

            const ws = XLSX.utils.aoa_to_sheet(dataRows);
            XLSX.utils.book_append_sheet(wb, ws, "Детальный аудит");
            XLSX.writeFile(wb, `OptimaEdu_DetailedAudit_${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (e) { alert("Ошибка экспорта"); } finally { setIsExporting(false); }
    };

    const handleMassImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onAddUser) return;
        setImporting(true); setImportLogs([]);
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                for (const row of data) {
                    const email = row['Email']?.trim();
                    const name = row['ФИО']?.trim();
                    const pwd = String(row['Пароль (мин 6 символов)'] || 'qwe123!@#').trim();
                    const dId = row['ID Отдела']?.trim();
                    // Fix: Removed default 'employee' fallback if column is empty
                    const rolesInput = String(row['ID Роли (через запятую)'] || '').trim();
                    const rIds = rolesInput ? rolesInput.split(',').map(s => s.trim()) : [];

                    if (!email || !name || !dId) {
                        setImportLogs(prev => [...prev, { msg: `Пропущено: ${name || 'Без имени'} (недостаточно данных)`, type: 'error' }]);
                        continue;
                    }
                    try {
                        await onAddUser({
                            id: '', name, email, password: pwd, roles: rIds, departmentId: dId,
                            departmentName: departments.find(d => d.id === dId)?.name || 'Неизвестный отдел',
                            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                            isActive: true,
                            isDeleted: false
                        } as User);
                        setImportLogs(prev => [...prev, { msg: `Создан: ${name}`, type: 'success' }]);
                    } catch (err: any) {
                        setImportLogs(prev => [...prev, { msg: `Ошибка ${name}: ${err.message}`, type: 'error' }]);
                    }
                }
            } catch (err) { alert("Ошибка чтения файла"); } 
            finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
        };
        reader.readAsBinaryString(file);
    };

    const handleGeneratePublicLink = async () => {
        if (!window.confirm('Сгенерировать публичную ссылку? Это создаст снимок текущей статистики.')) return;
        setIsGeneratingLink(true);

        try {
            // 1. Calculate KPI Data
            const totalAttempts = results.length;
            const passedCount = results.filter(r => (r.totalScore / r.maxScore) * 100 >= passingThreshold).length;
            const avgScore = totalAttempts > 0 
                ? Math.round(results.reduce((acc, r) => acc + ((r.maxScore > 0 ? r.totalScore/r.maxScore : 0) * 100), 0) / totalAttempts) 
                : 0;
            const avgTime = Math.round(results.reduce((acc, r) => r.completedAt ? acc + (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) : acc, 0) / totalAttempts / 60000) || 0;
            
            const kpiData = { avgScore, passRate: totalAttempts ? Math.round((passedCount/totalAttempts)*100) : 0, passedCount, totalAttempts, avgTime };

            // 2. Timeline Data
            const timelineMap: any = {};
            results.forEach(r => {
                const d = new Date(r.completedAt || r.startedAt);
                const k = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
                if (!timelineMap[k]) timelineMap[k] = { total: 0, count: 0, sort: d.getTime() };
                timelineMap[k].total += (r.totalScore/r.maxScore)*100;
                timelineMap[k].count++;
            });
            const timelineData = Object.entries(timelineMap).map(([name, v]: any) => ({
                name, score: Math.round(v.total/v.count), sortTime: v.sort
            })).sort((a,b) => a.sortTime - b.sortTime);

            // 3. Dept & Role Stats
            const deptPerf = departments.map(d => {
                const deptResults = results.filter(r => users.find(u => u.id === r.userId)?.departmentId === d.id);
                const sc = deptResults.length ? Math.round(deptResults.reduce((acc, r) => acc + (r.totalScore/r.maxScore)*100, 0)/deptResults.length) : 0;
                return { id: d.id, name: d.name, score: sc, count: deptResults.length };
            }).sort((a,b) => b.score - a.score);

            const roleSt = roles.map(role => {
                const roleResults = results.filter(r => users.find(u => u.id === r.userId)?.roles.includes(role.id));
                const sc = roleResults.length ? Math.round(roleResults.reduce((acc, r) => acc + (r.totalScore/r.maxScore)*100, 0)/roleResults.length) : 0;
                return { name: role.name, avgScore: sc, count: roleResults.length };
            }).sort((a,b) => b.avgScore - a.avgScore);

            // 4. Rankings Calculation
            const rankings = generateAllDeptRankings(users, results, departments, roles);

            // 5. Payload Construction
            const payload = {
                id: `share_${Date.now()}`,
                generatedAt: new Date().toISOString(),
                kpiData,
                timelineData,
                roleStats: roleSt,
                sessionStats: sessions.map(s => {
                    const sRes = results.filter(r => r.sessionId === s.id);
                    return { 
                        id: s.id, 
                        title: s.title, 
                        ticketName: tickets.find(t=>t.id===s.ticketId)?.title || '?',
                        attempts: sRes.length,
                        passed: sRes.filter(r => (r.totalScore/r.maxScore)*100 >= passingThreshold).length,
                        failed: sRes.filter(r => (r.totalScore/r.maxScore)*100 < passingThreshold).length,
                        avgScore: sRes.length ? Math.round(sRes.reduce((acc, r) => acc + (r.totalScore/r.maxScore)*100, 0)/sRes.length) : 0
                    };
                }),
                ticketStats: [], // Simplified to save space
                questionStats: [], // Simplified to save space
                deptAssignmentStats: [], // Simplified to save space
                deptPerformance: deptPerf,
                rankings
            };

            const docRef = db.collection('shared_dashboards').doc(payload.id);
            await docRef.set(payload);
            
            setPublicShareId(payload.id);
            setIsPublicLinkEnabled(true);
            alert('Ссылка успешно создана и сохранена в базе данных!');

        } catch (e: any) {
            console.error(e);
            alert('Ошибка при создании ссылки: ' + e.message);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-secondary-200 pb-6 mb-6">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-secondary-900">Аналитический Центр</h2>
                    <p className="text-secondary-500 mt-1">Формирование отчетов и управление данными</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {[
                    { id: 'summary', label: 'Сводный Отчет', icon: FileSpreadsheet },
                    { id: 'detailed', label: 'Детальный Аудит', icon: ClipboardList },
                    { id: 'import', label: 'Импорт Данных', icon: Database },
                    { id: 'public', label: 'Публичный Дашборд', icon: Globe },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'bg-secondary-900 text-white shadow-lg shadow-secondary-900/20' 
                                : 'bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200'
                        }`}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border border-secondary-200 shadow-card p-3 min-h-[400px]">
                
                {/* --- SUMMARY REPORT --- */}
                {activeTab === 'summary' && (
                    <div className="max-w-3xl animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-50 text-green-600 rounded-xl"><FileSpreadsheet size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">Выгрузка сводных результатов</h3>
                                <p className="text-sm text-secondary-500">Реестр попыток аттестации. Содержит баллы и итоговые статусы.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-secondary-50 p-3 rounded-xl border border-secondary-100">
                            <div><label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">С даты</label><input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full p-2 rounded-lg border text-sm" /></div>
                            <div><label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">По дату</label><input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full p-2 rounded-lg border text-sm" /></div>
                            <div className="md:col-span-2"><label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">Отдел</label><select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full p-2 rounded-lg border text-sm"><option value="all">Все отделы</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                        </div>

                        <button onClick={generateSummaryReport} disabled={isExporting} className="w-full py-4 bg-secondary-900 text-white rounded-xl text-sm font-bold hover:bg-black hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-secondary-900/20">
                            {isExporting ? <Loader size={18} className="animate-spin" /> : <Download size={18} />} Скачать Excel
                        </button>
                    </div>
                )}

                {/* --- DETAILED REPORT --- */}
                {activeTab === 'detailed' && (
                    <div className="max-w-3xl animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl"><ClipboardList size={24} /></div>
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">Полный аудит ответов</h3>
                                <p className="text-sm text-secondary-500">Глубокая выгрузка: каждый вопрос каждого сотрудника.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-secondary-50 p-3 rounded-xl border border-secondary-100">
                            <div><label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">С даты</label><input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full p-2 rounded-lg border text-sm" /></div>
                            <div><label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">По дату</label><input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full p-2 rounded-lg border text-sm" /></div>
                            <div className="md:col-span-2"><label className="text-xs font-bold text-secondary-500 uppercase mb-1 block">Отдел</label><select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full p-2 rounded-lg border text-sm"><option value="all">Все отделы</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                        </div>

                        <button onClick={generateDetailedReport} disabled={isExporting} className="w-full py-4 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20">
                            {isExporting ? <Loader size={18} className="animate-spin" /> : <Table size={18} />} Скачать Аудит (XLSX)
                        </button>
                    </div>
                )}

                {/* --- IMPORT DATA --- */}
                {activeTab === 'import' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-secondary-100 text-secondary-900 rounded-xl"><Users size={24} /></div>
                                <div><h3 className="text-xl font-bold">Массовый импорт сотрудников</h3><p className="text-sm text-secondary-500">Загрузка базы через Excel</p></div>
                            </div>
                            
                            <div className="space-y-4">
                                <button onClick={() => {
                                    const wb = XLSX.utils.book_new();
                                    const data = [["ФИО", "Email", "Пароль (мин 6 символов)", "ID Отдела", "ID Роли (через запятую)"], ["Иванов Иван", "ivan@optima.kg", "123456", "dept1", "employee"]];
                                    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Template");
                                    XLSX.writeFile(wb, "Template.xlsx");
                                }} className="w-full py-3 bg-white border border-secondary-300 text-secondary-700 rounded-xl text-sm font-bold hover:bg-secondary-50 flex items-center justify-center gap-2">
                                    <FileDown size={16} /> Скачать шаблон
                                </button>
                                
                                <label className="w-full py-10 border-2 border-dashed border-primary-200 bg-primary-50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary-100 transition-colors group">
                                    <UploadCloud size={32} className="text-primary-500 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-bold text-primary-700">{importing ? 'Загрузка...' : 'Выберите файл XLSX'}</span>
                                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleMassImport} disabled={importing} />
                                </label>
                            </div>
                        </div>
                        
                        <div className="bg-secondary-50 rounded-xl p-3 border border-secondary-100 flex flex-col h-full max-h-[400px]">
                            <h4 className="font-bold text-sm uppercase text-secondary-500 mb-4 flex justify-between">Журнал операций {importLogs.length > 0 && <button onClick={() => setImportLogs([])}><X size={14}/></button>}</h4>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                {importLogs.length === 0 && <div className="text-center text-secondary-400 py-10 text-sm">Нет записей</div>}
                                {importLogs.map((log, i) => (
                                    <div key={i} className={`p-2 rounded text-xs flex gap-2 ${log.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {log.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>} {log.msg}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PUBLIC DASHBOARD --- */}
                {activeTab === 'public' && (
                    <div className="animate-fade-in text-center max-w-2xl mx-auto py-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-900 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl text-white">
                            <Globe size={40} />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-secondary-900 mb-2">Live Analytics Link</h3>
                        <p className="text-secondary-500 mb-8">Создайте безопасную внешнюю ссылку для руководства. Доступ к дашборду без авторизации.</p>
                        
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={handleGeneratePublicLink}
                                disabled={isGeneratingLink || isPublicLinkEnabled} 
                                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isPublicLinkEnabled ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg'}`}
                            >
                                {isGeneratingLink ? <Loader size={16} className="animate-spin" /> : isPublicLinkEnabled ? 'Доступ активен' : 'Активировать доступ'}
                            </button>
                            {isPublicLinkEnabled && (
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?share=${publicShareId}`); alert('Скопировано!'); }} 
                                    className="px-8 py-3 bg-white border border-secondary-300 text-secondary-900 rounded-xl font-bold text-sm hover:bg-secondary-50 transition-all flex items-center gap-2"
                                >
                                    <Copy size={16} /> Копировать ссылку
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsView;
