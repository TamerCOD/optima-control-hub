
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AssessmentResult, User, AssessmentSession, Ticket, Department, RoleDefinition, UserRole, Course } from '../types';
import { Search, ChevronDown, Check, Eye, Printer, Lock, Trash2, GraduationCap } from 'lucide-react';
import ResultModal from './ResultModal';
import { db } from '../firebase';

interface Props {
  results: AssessmentResult[];
  users: User[];
  sessions: AssessmentSession[];
  tickets: Ticket[];
  departments: Department[];
  roles: RoleDefinition[];
  currentUser: User;
  passingThreshold: number;
  courses?: Course[];
}

const MultiSelectFilter = ({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string[]) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isDarkMode = document.documentElement.classList.contains('dark');

    return (
        <div className="relative no-print" ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-3 px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all border-2 ${selected.length > 0 ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'}`}>
              {title}
              {selected.length > 0 && <span className="bg-primary text-white px-2 py-0.5 rounded-full text-[9px]">{selected.length}</span>}
              <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border-2 border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden animate-fade-in">
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {options.map(opt => (
                    <div key={opt} onClick={() => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])} className={`flex items-center gap-3 p-2 cursor-pointer rounded-lg text-xs font-bold transition-colors ${selected.includes(opt) ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected.includes(opt) ? 'bg-zinc-950 border-zinc-950 dark:bg-white dark:border-white' : 'border-zinc-300 dark:border-zinc-700'}`}>
                        {selected.includes(opt) && <Check size={12} className={isDarkMode ? 'text-black' : 'text-white'} />}
                      </div>
                      <span className="truncate">{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
    );
};

const HistoryView: React.FC<Props> = ({ results, users, sessions, tickets, departments, roles, currentUser, passingThreshold, courses = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepts, setFilterDepts] = useState<string[]>([]);
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterSessions, setFilterSessions] = useState<string[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const hasPermission = useCallback((permId: string) => {
    if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return true;
    return currentUser.roles.some(rId => roles.find(rd => rd.id === rId)?.permissionIds.includes(permId));
  }, [currentUser, roles]);

  const canViewDetails = hasPermission('archive_view_details');
  const canEditResult = hasPermission('archive_edit_result');
  const canDeleteResult = hasPermission('archive_delete_result');

  const enrichedData = useMemo(() => {
    let allowed: typeof results = [];
    if (hasPermission('archive_general')) allowed = results;
    else if (hasPermission('archive_dept')) allowed = results.filter(r => users.find(u => u.id === r.userId)?.departmentId === currentUser.departmentId);
    else if (hasPermission('archive_personal')) allowed = results.filter(r => r.userId === currentUser.id);
    
    return allowed.map(r => {
        const u = users.find(uu => uu.id === r.userId) || { name: '?', departmentId: '', roles: [] } as any;
        const s = sessions.find(ss => ss.id === r.sessionId);
        const t = tickets.find(tt => tt.id === (s?.ticketId || ''));
        const c = courses.find(cc => cc.id === r.courseId || cc.id === s?.courseId);
        const score = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
        return { 
            ...r, 
            userName: u.name, 
            deptName: departments.find(d => d.id === u.departmentId)?.name || '?', 
            roleNames: u.roles.map((rid:any) => roles.find(ro => ro.id === rid)?.name || rid), 
            sessionTitle: s?.title || '?', 
            ticketTitle: t?.title || '?',
            courseTitle: c?.title || null,
            formattedDate: new Date(r.completedAt || r.startedAt).toLocaleDateString('ru-RU'), 
            scorePercent: score, 
            passed: Math.round(score * 100) / 100 >= passingThreshold 
        };
    }).sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());
  }, [results, users, sessions, tickets, departments, roles, currentUser, passingThreshold, courses, hasPermission]);

  const uniqueDepts = useMemo(() => Array.from(new Set(enrichedData.map(i => i.deptName))), [enrichedData]);
  const uniqueRoles = useMemo(() => Array.from(new Set(enrichedData.flatMap(i => i.roleNames))), [enrichedData]);
  const uniqueSessions = useMemo(() => Array.from(new Set(enrichedData.map(i => i.sessionTitle))), [enrichedData]);

  const filteredData = enrichedData.filter(item => {
      const search = searchTerm.toLowerCase();
      return (item.userName.toLowerCase().includes(search) || item.id.toLowerCase().includes(search)) && (filterDepts.length === 0 || filterDepts.includes(item.deptName)) && (filterRoles.length === 0 || item.roleNames.some((r: string) => filterRoles.includes(r))) && (filterSessions.length === 0 || filterSessions.includes(item.sessionTitle)) && (filterStatus.length === 0 || filterStatus.includes(item.passed ? 'Сдал' : 'Не сдал'));
  });

  const handleDeleteResult = async (id: string) => { if (window.confirm("Удалить этот результат?")) { try { await db.collection('results').doc(id).delete(); } catch (e) { alert(e); } } };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-4 border-zinc-950 dark:border-zinc-800 pb-8 no-print">
            <div><h2 className="text-4xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">Архив Результатов</h2><p className="text-zinc-500 dark:text-zinc-400 mt-3 font-bold text-xs uppercase tracking-widest">Полная история аттестационных кампаний</p></div>
            <div className="flex gap-3"><button onClick={() => window.print()} className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 px-6 py-3 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-primary transition-all font-black text-xs uppercase tracking-widest"><Printer size={18}/> Печать</button></div>
        </div>

        <div className="clay-panel p-3 flex flex-col xl:flex-row gap-6 items-center no-print">
            <div className="relative w-full xl:w-96 flex-shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input type="text" placeholder="Поиск по ФИО или ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl outline-none text-sm font-bold focus:border-primary transition-all dark:text-white" />
            </div>
            <div className="flex flex-wrap gap-3 items-center flex-1 w-full xl:w-auto">
              <MultiSelectFilter title="Отдел" options={uniqueDepts} selected={filterDepts} onChange={setFilterDepts} />
              <MultiSelectFilter title="Роль" options={uniqueRoles} selected={filterRoles} onChange={setFilterRoles} />
              <MultiSelectFilter title="Сессия" options={uniqueSessions} selected={filterSessions} onChange={setFilterSessions} />
              <MultiSelectFilter title="Статус" options={['Сдал', 'Не сдал']} selected={filterStatus} onChange={setFilterStatus} />
              {(filterDepts.length > 0 || filterRoles.length > 0 || filterStatus.length > 0 || filterSessions.length > 0 || searchTerm) && (
                <button onClick={() => { setFilterDepts([]); setFilterRoles([]); setFilterStatus([]); setFilterSessions([]); setSearchTerm(''); }} className="ml-auto text-primary font-black uppercase text-[10px] tracking-widest hover:underline">Сбросить всё</button>
              )}
            </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-2 border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-200 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="p-3">ID Записи</th>
                    <th className="p-3">Результат</th>
                    <th className="p-3">Сотрудник</th>
                    <th className="p-3">Кампания / Билет</th>
                    <th className="p-3 text-right">Эффективность</th>
                    <th className="p-3 text-center no-print">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-zinc-50 dark:divide-zinc-800 text-sm">
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={6} className="p-20 text-center text-zinc-400 font-bold uppercase tracking-widest">Записи не найдены</td></tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                        <td className="p-3">
                            <div className="flex flex-col gap-1">
                                <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{row.id.slice(-8)}</span>
                                <span className="font-mono text-[9px] text-zinc-300 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-900 rounded px-1 w-max">SID: {row.sessionId.slice(-6)}</span>
                            </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            {row.passed ? (
                              <span className="text-zinc-950 dark:text-white font-black text-xs uppercase tracking-widest">УСПЕШНО</span>
                            ) : (
                              <span className="text-primary font-black text-xs uppercase tracking-widest">ПРОВАЛ</span>
                            )}
                            <span className="text-[10px] text-zinc-500 font-bold mt-1 uppercase">{row.formattedDate}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-black text-zinc-900 dark:text-zinc-100">{row.userName}</div>
                          <div className="text-[10px] text-zinc-500 font-bold mt-0.5 uppercase">{row.deptName}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[250px]">{row.sessionTitle}</div>
                          <div className="text-[10px] text-zinc-500 font-bold mt-0.5 uppercase truncate max-w-[200px] flex items-center gap-2">
                             {row.courseTitle && <GraduationCap size={12} className="text-primary"/>}
                             {row.courseTitle ? row.courseTitle : row.ticketTitle}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-2xl font-black tabular-nums ${row.passed ? 'text-zinc-950 dark:text-white' : 'text-primary'}`}>{row.scorePercent.toFixed(1)}%</span>
                        </td>
                        <td className="p-3 text-center no-print">
                          <div className="flex justify-center gap-2">
                            {canViewDetails ? (
                              <button onClick={() => setSelectedResultId(row.id)} className="p-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-white bg-zinc-50 dark:bg-zinc-900 rounded-xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sharp hover:scale-[1.02] active:scale-[0.98]"><Eye size={20} /></button>
                            ) : (
                              <Lock size={18} className="opacity-10"/>
                            )}
                            {canDeleteResult && (
                              <button onClick={() => handleDeleteResult(row.id)} className="p-2 text-zinc-300 hover:text-primary bg-zinc-50 dark:bg-zinc-900 rounded-xl transition-all border border-transparent hover:border-primary/20 shadow-sharp hover:scale-[1.02] active:scale-[0.98]"><Trash2 size={20}/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>
        
        {selectedResultId && (
          <ResultModal 
            result={results.find(r => r.id === selectedResultId)!} 
            session={sessions.find(s => s.id === results.find(r => r.id === selectedResultId)?.sessionId)} 
            ticket={tickets.find(t => t.id === sessions.find(s => s.id === results.find(r => r.id === selectedResultId)?.sessionId)?.ticketId)} 
            user={users.find(u => u.id === results.find(r => r.id === selectedResultId)?.userId)} 
            passingThreshold={passingThreshold} 
            canEdit={canEditResult} 
            onSave={(res) => { db.collection('results').doc(res.id).update(res as any); setSelectedResultId(null); }} 
            onClose={() => setSelectedResultId(null)} 
          />
        )}
    </div>
  );
};

export default HistoryView;
