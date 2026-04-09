
import React, { useState, useMemo } from 'react';
import { 
    Plus, Trash2, Edit2, X, GraduationCap, 
    Search, 
    CheckCircle, Users, BarChart3, ChevronRight, 
    Clock, Download, UploadCloud, 
    FileText, UserPlus, Info, Check, Loader
} from 'lucide-react';
import { Course, CourseContentBlock, Ticket, RoleDefinition, Department, User, UserRole, AssessmentResult } from '../types';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { db } from '../firebase'; // Import DB directly for chunk saving

interface Props {
  courses: Course[];
  tickets: Ticket[];
  roles: RoleDefinition[];
  departments: Department[];
  users: User[];
  results: AssessmentResult[];
  currentUser: User;
  onCreateCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
  onOpenCourse: (id: string) => void;
}

const CourseManager: React.FC<Props> = ({ courses, tickets, roles, departments, users, results, currentUser, onCreateCourse, onUpdateCourse, onDeleteCourse, onOpenCourse }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [targetUserSearch, setTargetUserSearch] = useState('');
  const [targetRoleSearch, setTargetRoleSearch] = useState('');
  const [targetDeptSearch, setTargetDeptSearch] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDocxContent, setFormDocxContent] = useState('');
  const [formBlocks, setFormBlocks] = useState<CourseContentBlock[]>([]);
  const [formTicketId, setFormTicketId] = useState('');
  const [formDurationDays, setFormDurationDays] = useState(20);
  const [formTestDurationDays, setFormTestDurationDays] = useState(3);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTargeting, setFormTargeting] = useState<Course['targeting']>({ roles: [], departments: [], specificUserIds: [] });
  const [importReport, setImportReport] = useState<{added: number, notFound: string[]}>({added: 0, notFound: []});
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const hasPermission = (permId: string) => {
    if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return true;
    return currentUser.roles.some(rId => roles.find(rd => rd.id === rId)?.permissionIds.includes(permId));
  };

  // Granular permissions for Course Manager
  const canCreate = hasPermission('course_create');
  const canEdit = hasPermission('course_edit');
  const canDelete = hasPermission('course_delete');
  const canViewStats = hasPermission('course_stats');

  const isGlobalAdmin = currentUser.roles.includes(UserRole.SUPER_ADMIN);

  const filteredCourses = useMemo(() => {
    const s = searchTerm.toLowerCase();
    const now = new Date();
    
    return courses.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(s);
        const isAssigned = c.assignedUserIds.includes(currentUser.id);
        const dateReached = new Date(c.startDate) <= now;
        
        // Admins see everything. Employees see only assigned AND reached dates.
        if (canCreate || canEdit || isGlobalAdmin) return matchesSearch;
        return matchesSearch && isAssigned && dateReached;
    });
  }, [courses, searchTerm, currentUser, isGlobalAdmin, canCreate, canEdit]);

  const fetchCourseContent = async (course: Course) => {
      // If content is chunked, fetch it. Otherwise use what's in the doc.
      if (course.totalChunks && course.totalChunks > 0) {
          setLoadingContent(true);
          try {
              const snapshot = await db.collection('courses').doc(course.id).collection('chunks').orderBy('index').get();
              let fullContent = '';
              snapshot.forEach(doc => {
                  fullContent += (doc.data().data || '');
              });
              setFormDocxContent(fullContent);
          } catch (e) {
              console.error(e);
              alert("Ошибка загрузки частей контента");
          } finally {
              setLoadingContent(false);
          }
      } else {
          setFormDocxContent(course.docxContent || '');
      }
  };

  const handleOpenEditor = async (course?: Course) => {
    setImportReport({added: 0, notFound: []});
    
    if (course) {
        setEditingCourse(course);
        setFormTitle(course.title);
        setFormDesc(course.description);
        setFormBlocks(course.blocks || []);
        setFormTicketId(course.ticketId);
        setFormDurationDays(course.courseDurationDays);
        setFormTestDurationDays(course.testDurationDays);
        setFormStartDate(course.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
        setFormTargeting(course.targeting || { roles: [], departments: [], specificUserIds: [] });
        
        // Load content
        setIsEditorOpen(true);
        await fetchCourseContent(course);
    } else {
        setEditingCourse(null);
        setFormTitle('');
        setFormDesc('');
        setFormDocxContent('');
        setFormBlocks([]);
        setFormTicketId(tickets[0]?.id || '');
        setFormDurationDays(20);
        setFormTestDurationDays(3);
        setFormStartDate(new Date().toISOString().split('T')[0]);
        setFormTargeting({ roles: [], departments: [], specificUserIds: [] });
        setIsEditorOpen(true);
    }
  };

  const handleDocxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
        alert("Файл слишком большой. Максимальный размер: 20 МБ");
        e.target.value = '';
        return;
    }

    setIsConverting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then((result) => {
                setFormDocxContent(result.value);
                if (!formTitle) setFormTitle(file.name.replace('.docx', ''));
                setIsConverting(false);
            })
            .catch((err) => {
                console.error(err);
                alert("Ошибка конвертации Word файла.");
                setIsConverting(false);
            });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveCourse = async () => {
    if (!formTitle || !formTicketId) return alert("Заполните название и выберите тест");
    
    setIsSaving(true);

    let participantIds: string[] = [...formTargeting.specificUserIds];
    users.forEach(u => {
        const matchesRole = formTargeting.roles.length > 0 && u.roles.some(r => formTargeting.roles.includes(r));
        const matchesDept = formTargeting.departments.length > 0 && formTargeting.departments.includes(u.departmentId);
        if ((matchesRole || matchesDept) && !participantIds.includes(u.id)) {
            participantIds.push(u.id);
        }
    });

    const courseId = editingCourse?.id || `c_${Date.now()}`;
    const CHUNK_SIZE = 400000; // ~400KB characters per chunk (safe limit)
    let chunks: string[] = [];
    let isChunked = false;

    // Check size and split if needed
    if (formDocxContent.length > CHUNK_SIZE) {
        isChunked = true;
        for (let i = 0; i < formDocxContent.length; i += CHUNK_SIZE) {
            chunks.push(formDocxContent.substring(i, i + CHUNK_SIZE));
        }
    }

    const courseData: Course = {
        id: courseId,
        title: formTitle,
        description: formDesc,
        // If chunked, don't store content in main doc. If not chunked, store it there.
        docxContent: isChunked ? '' : formDocxContent,
        totalChunks: isChunked ? chunks.length : 0,
        blocks: formBlocks,
        ticketId: formTicketId,
        courseDurationDays: formDurationDays,
        testDurationDays: formTestDurationDays,
        assignedUserIds: participantIds,
        acknowledgedUserIds: editingCourse?.acknowledgedUserIds || [],
        targeting: formTargeting,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(new Date(formStartDate).getTime() + formDurationDays * 86400000).toISOString(),
        createdAt: editingCourse?.createdAt || new Date().toISOString(),
        createdBy: editingCourse?.createdBy || currentUser.id
    };

    try {
        const batch = db.batch();
        const courseRef = db.collection('courses').doc(courseId);

        // 1. Set main document
        batch.set(courseRef, courseData);

        // 2. Handle Chunks
        if (isChunked) {
            // Overwrite chunks
            chunks.forEach((chunk, idx) => {
                const chunkRef = courseRef.collection('chunks').doc(idx.toString());
                batch.set(chunkRef, { data: chunk, index: idx });
            });
        } else {
            // If we are updating a course that USED to be chunked but is now small, 
            // we ideally should delete old chunks.
            // For now, we assume overwriting main doc with totalChunks=0 is enough to signal not to look there.
        }

        await batch.commit();
        setIsEditorOpen(false);
    } catch (e: any) {
        console.error(e);
        alert("Ошибка сохранения: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleParticipantUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            const foundIds = new Set(formTargeting.specificUserIds);
            const notFound: string[] = [];
            data.forEach((row, idx) => {
                if (idx === 0) return;
                const email = String(row[1] || '').trim().toLowerCase();
                const user = users.find(u => u.email.toLowerCase() === email);
                if (user) foundIds.add(user.id); else if (email) notFound.push(email);
            });
            setFormTargeting({ ...formTargeting, specificUserIds: Array.from(foundIds) });
            setImportReport({ added: foundIds.size - formTargeting.specificUserIds.length, notFound });
        } catch (e) { alert("Ошибка парсинга"); }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [["ФИО", "Email"], ["Иванов Иван", "ivan@optima.kg"]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Employees");
    XLSX.writeFile(wb, "Optima_Course_Import_Template.xlsx");
  };

  const getCourseStats = (course: Course) => {
      const assignedCount = course.assignedUserIds.length;
      const ackCount = course.acknowledgedUserIds.length;
      const ackPercent = assignedCount > 0 ? Math.round((ackCount / assignedCount) * 100) : 0;
      const courseResults = results.filter(r => r.courseId === course.id);
      const passedCount = courseResults.filter(r => r.passed).length;
      const passPercent = assignedCount > 0 ? Math.round((passedCount / assignedCount) * 100) : 0;
      const avgScore = courseResults.length > 0 
        ? Math.round(courseResults.reduce((acc, r) => acc + (r.totalScore/r.maxScore)*100, 0) / courseResults.length)
        : 0;
      return { assignedCount, ackCount, ackPercent, passedCount, passPercent, avgScore };
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-end border-b-4 border-zinc-950 dark:border-zinc-800 pb-6 gap-4">
            <div>
                <h1 className="text-4xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter leading-none">Обучение</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-bold uppercase text-xs tracking-widest">Образовательные курсы и материалы</p>
            </div>
            {canCreate && (
                <button onClick={() => handleOpenEditor()} className="bg-primary text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg flex items-center gap-2">
                    <Plus size={18} /> Создать курс
                </button>
            )}
        </div>

        <div className="relative group max-w-xl">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white dark:bg-zinc-900 border-2 dark:border-zinc-800 rounded-2xl outline-none font-bold text-sm focus:border-primary transition-all dark:text-white" placeholder="Поиск курса..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredCourses.map(course => {
                const isAck = course.acknowledgedUserIds.includes(currentUser.id);
                
                return (
                    <div key={course.id} className="bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-100 dark:border-zinc-800 p-4 shadow-sharp hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 border dark:border-zinc-700 shadow-inner group-hover:scale-110 transition-transform">
                                <GraduationCap size={32} />
                            </div>
                            <div className="flex gap-2">
                                {canViewStats && (
                                    <button onClick={() => { setEditingCourse(course); setIsStatsOpen(true); }} className="p-2.5 text-zinc-400 hover:text-blue-500 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-all border dark:border-zinc-700" title="Статистика"><BarChart3 size={18}/></button>
                                )}
                                {canEdit && (
                                    <button onClick={() => handleOpenEditor(course)} className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-all border dark:border-zinc-700" title="Редактировать"><Edit2 size={18}/></button>
                                )}
                                {canDelete && (
                                    <button onClick={() => { if(window.confirm("Удалить курс?")) onDeleteCourse(course.id); }} className="p-2.5 text-zinc-400 hover:text-primary bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-all border dark:border-zinc-700" title="Удалить"><Trash2 size={18}/></button>
                                )}
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter mb-2 leading-tight truncate">{course.title}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide line-clamp-2 mb-6">{course.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                            <div className="text-[10px] font-black text-zinc-400 uppercase">Старт: {new Date(course.startDate).toLocaleDateString()}</div>
                            <div className="text-[10px] font-black text-primary uppercase">Тест: {course.testDurationDays} дн.</div>
                        </div>

                        <button 
                            onClick={() => onOpenCourse(course.id)}
                            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${isAck ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-primary hover:text-white'}`}
                        >
                            {isAck ? 'Изучено' : 'Начать обучение'} <ChevronRight size={18}/>
                        </button>
                    </div>
                );
            })}
        </div>

        {isStatsOpen && editingCourse && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-3 animate-fade-in overflow-y-auto">
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-[95vw] flex flex-col max-h-[90vh] border-2 dark:border-zinc-800 overflow-hidden shadow-2xl">
                    <div className="px-10 py-8 border-b-2 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Аналитика курса</h3>
                            <p className="text-[10px] font-black text-zinc-400 uppercase mt-1">{editingCourse.title}</p>
                        </div>
                        <button onClick={() => setIsStatsOpen(false)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"><X size={32} className="text-zinc-400"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Назначено', val: editingCourse.assignedUserIds.length, icon: Users, color: 'text-zinc-400' },
                                { label: 'Ознакомлено', val: `${getCourseStats(editingCourse).ackPercent}%`, icon: CheckCircle, color: 'text-zinc-900 dark:text-white' },
                                { label: 'Прошли тест', val: `${getCourseStats(editingCourse).passPercent}%`, icon: GraduationCap, color: 'text-primary' },
                                { label: 'Средний балл', val: `${getCourseStats(editingCourse).avgScore}%`, icon: BarChart3, color: 'text-blue-500' }
                            ].map((s,i) => (
                                <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-3xl border-2 dark:border-zinc-700 flex flex-col items-center text-center">
                                    <s.icon className={`${s.color} mb-3`} size={24}/>
                                    <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">{s.label}</div>
                                    <div className={`text-4xl font-black ${s.color}`}>{s.val}</div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3"><Users size={18}/> Детализация</h4>
                            <div className="clay-panel overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase text-zinc-400 tracking-widest border-b dark:border-zinc-700">
                                        <tr><th className="p-4 pl-8">ФИО</th><th className="p-4">Должность</th><th className="p-4">Ознакомлен</th><th className="p-4">Аттестация</th><th className="p-4 text-right pr-8">Балл %</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs font-bold uppercase">
                                        {editingCourse.assignedUserIds.map(uid => {
                                            const u = users.find(x => x.id === uid);
                                            const isAck = editingCourse.acknowledgedUserIds.includes(uid);
                                            const res = results.find(r => r.userId === uid && r.courseId === editingCourse.id);
                                            return (
                                                <tr key={uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                    <td className="p-4 pl-8 text-zinc-950 dark:text-white">{u?.name || 'Удален'}</td>
                                                    <td className="p-4 text-zinc-400">{u?.roles.map(r => roles.find(rd => rd.id === r)?.name || r).join(', ')}</td>
                                                    <td className="p-4">{isAck ? <span className="text-green-600">ДА</span> : <span className="text-zinc-300">—</span>}</td>
                                                    <td className="p-4">{res ? <span className={res.passed ? 'text-green-600' : 'text-primary'}>{res.passed ? 'СДАНО' : 'ПРОВАЛ'}</span> : <span className="text-zinc-300">—</span>}</td>
                                                    <td className="p-4 text-right pr-8 font-black text-lg tabular-nums">{res ? `${Math.round((res.totalScore/res.maxScore)*100)}%` : '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isEditorOpen && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl p-3 overflow-y-auto">
                <div className="bg-white dark:bg-zinc-900 rounded-[3rem] w-full max-w-[95vw] max-h-[95vh] flex flex-col border-4 dark:border-zinc-800 shadow-2xl overflow-hidden">
                    <div className="p-4 border-b-4 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Конструктор обучения</h3>
                            <p className="text-[10px] font-black text-zinc-400 uppercase mt-1">Добавьте Word файл и настройте назначение</p>
                        </div>
                        <button onClick={() => setIsEditorOpen(false)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"><X size={32} className="text-zinc-400"/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-8 space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-4 tracking-widest">Основная информация</label>
                                    <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Название курса" className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-2xl font-black dark:text-white uppercase outline-none focus:border-primary transition-all" />
                                    <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Описание целей курса" className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-2 dark:border-zinc-700 rounded-2xl text-sm font-bold dark:text-white h-24 outline-none focus:border-primary transition-all" />
                                </div>

                                <div className="p-4 clay-panel border-4 border-dashed dark:border-zinc-800 text-center space-y-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600 mb-4 shadow-inner">
                                            {isConverting ? <Clock size={40} className="animate-spin" /> : <FileText size={40} />}
                                        </div>
                                        <h4 className="text-xl font-black uppercase tracking-tighter dark:text-white">Материал из Word</h4>
                                        <p className="text-xs text-zinc-500 font-bold uppercase mt-1">Загрузите документ .docx для импорта контента с форматированием</p>
                                    </div>
                                    <div className="flex flex-col gap-4 max-w-sm mx-auto">
                                        <label className="bg-zinc-950 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-xl">
                                            {formDocxContent ? 'Заменить Word файл' : 'Выбрать .DOCX'}
                                            <input type="file" accept=".docx" className="hidden" onChange={handleDocxUpload} disabled={isConverting || isSaving} />
                                        </label>
                                        {formDocxContent && (
                                            <button onClick={() => setFormDocxContent('')} className="text-xs font-black uppercase text-primary hover:underline">Удалить контент</button>
                                        )}
                                    </div>
                                    {loadingContent ? (
                                        <div className="flex items-center justify-center gap-2 text-zinc-400 py-10">
                                            <Loader className="animate-spin" size={20}/> Загрузка контента...
                                        </div>
                                    ) : formDocxContent && (
                                        <div className="mt-8 border-2 dark:border-zinc-800 rounded-3xl p-3 text-left max-h-[300px] overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50 custom-scrollbar shadow-inner">
                                            <div className="word-content text-xs opacity-60 pointer-events-none" dangerouslySetInnerHTML={{ __html: formDocxContent }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-8">
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-[3rem] border-2 dark:border-zinc-800 space-y-8 shadow-sm">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Тест по завершению *</label>
                                            <select value={formTicketId} onChange={e => setFormTicketId(e.target.value)} className="w-full p-3 clay-input font-black text-xs">
                                                {tickets.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Дата открытия курса</label>
                                            <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} className="w-full p-3 border-2 rounded-2xl font-black text-xs dark:bg-zinc-900"/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black uppercase text-zinc-400 ml-1 text-center block">Доступ (дн)</label>
                                                <input type="number" value={formDurationDays} onChange={e => setFormDurationDays(+e.target.value)} className="w-full p-2 border-2 rounded-xl text-center font-black dark:bg-zinc-900"/>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black uppercase text-zinc-400 ml-1 text-center block">На тест (дн)</label>
                                                <input type="number" value={formTestDurationDays} onChange={e => setFormTestDurationDays(+e.target.value)} className="w-full p-2 border-2 rounded-xl text-center font-black dark:bg-zinc-900"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t-2 dark:border-zinc-700 space-y-6">
                                        <h4 className="text-[10px] font-black uppercase text-zinc-950 dark:text-white tracking-[0.2em] flex items-center gap-2"><UserPlus size={16}/> Назначение</h4>
                                        
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end"><label className="text-[8px] font-black uppercase text-zinc-400 ml-2">По ролям</label><input value={targetRoleSearch} onChange={e=>setTargetRoleSearch(e.target.value)} placeholder="Поиск роли..." className="text-[9px] bg-transparent border-b outline-none w-24 px-1"/></div>
                                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                                {roles.filter(r => r.name.toLowerCase().includes(targetRoleSearch.toLowerCase())).map(r => (
                                                    <button key={r.id} type="button" onClick={() => setFormTargeting(p => ({...p, roles: p.roles.includes(r.id) ? p.roles.filter(x=>x!==r.id) : [...p.roles, r.id]}))} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${formTargeting.roles.includes(r.id) ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}>{r.name}</button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end"><label className="text-[8px] font-black uppercase text-zinc-400 ml-2">По отделам</label><input value={targetDeptSearch} onChange={e=>setTargetDeptSearch(e.target.value)} placeholder="Поиск отдела..." className="text-[9px] bg-transparent border-b outline-none w-24 px-1"/></div>
                                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                                {departments.filter(d => d.name.toLowerCase().includes(targetDeptSearch.toLowerCase())).map(d => (
                                                    <button key={d.id} type="button" onClick={() => setFormTargeting(p => ({...p, departments: p.departments.includes(d.id) ? p.departments.filter(x=>x!==d.id) : [...p.departments, d.id]}))} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${formTargeting.departments.includes(d.id) ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}>{d.name}</button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t dark:border-zinc-700">
                                            <div className="flex justify-between items-end"><label className="text-[8px] font-black uppercase text-zinc-400 ml-2">Индивидуально</label><input value={targetUserSearch} onChange={e=>setTargetUserSearch(e.target.value)} placeholder="Найти сотрудника..." className="text-[9px] bg-transparent border-b outline-none w-32 px-1"/></div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1 space-y-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                                {users.filter(u => u.name.toLowerCase().includes(targetUserSearch.toLowerCase())).map(u => (
                                                    <button key={u.id} type="button" onClick={() => setFormTargeting(p => ({...p, specificUserIds: p.specificUserIds.includes(u.id) ? p.specificUserIds.filter(x=>x!==u.id) : [...p.specificUserIds, u.id]}))} className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left group ${formTargeting.specificUserIds.includes(u.id) ? 'bg-zinc-50 dark:bg-zinc-800' : 'hover:bg-zinc-50'}`}>
                                                        <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${formTargeting.specificUserIds.includes(u.id) ? 'bg-primary border-primary' : 'border-zinc-300'}`}>{formTargeting.specificUserIds.includes(u.id) && <Check size={10} className="text-white"/>}</div>
                                                        <span className={`text-[10px] font-bold truncate uppercase ${formTargeting.specificUserIds.includes(u.id) ? 'text-zinc-950 dark:text-white' : 'text-zinc-400'}`}>{u.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t dark:border-zinc-700 space-y-4">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400"><Info size={12} className="text-primary"/> Массовый импорт</div>
                                            <div className="bg-zinc-950 text-white p-3 rounded-2xl space-y-3">
                                                <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">Шаблон Excel:</div>
                                                <div className="bg-white/10 p-2 rounded border border-white/10 text-[8px] font-mono">
                                                    Col A: ФИО<br/>Col B: Email
                                                </div>
                                                <button onClick={downloadTemplate} className="w-full py-2 bg-white text-zinc-950 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"><Download size={12}/> Скачать шаблон</button>
                                            </div>
                                            <label className="w-full p-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-zinc-800 transition-all">
                                                <UploadCloud size={20} className="text-zinc-400 mb-1"/>
                                                <span className="text-[10px] font-black uppercase text-zinc-400">Загрузить список</span>
                                                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleParticipantUpload} />
                                            </label>
                                            {importReport.added > 0 && <div className="text-[9px] text-green-500 font-bold bg-green-50 p-2 rounded-lg flex items-center gap-2"><CheckCircle size={10}/> Добавлено: {importReport.added} чел.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t-4 dark:border-zinc-800 flex justify-end gap-6 bg-zinc-50 dark:bg-zinc-800/50">
                        <button onClick={() => setIsEditorOpen(false)} className="px-10 py-4 text-xs font-black uppercase text-zinc-400">Отмена</button>
                        <button onClick={handleSaveCourse} disabled={isConverting || isSaving} className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-24 py-5 rounded-[2.5rem] text-sm font-black uppercase shadow-2xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <Loader className="animate-spin" size={16}/> : null}
                            {editingCourse ? 'Сохранить изменения' : 'Запустить обучение'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CourseManager;
