
import React, { useState } from 'react';
import { AssessmentSession, User, Ticket, RoleDefinition, Department, UserRole } from '../types';
import { Calendar, Users, Plus, Trash2, PlayCircle, ChevronLeft, ChevronRight, FolderOpen, Edit2, X, Settings2, Shuffle, CheckCircle, HelpCircle, Check, Briefcase, UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  sessions: AssessmentSession[];
  users: User[];
  tickets: Ticket[];
  roles: RoleDefinition[];
  departments: Department[];
  onCreateSession: (session: AssessmentSession) => void;
  onUpdateSession: (session: AssessmentSession) => void;
  onDeleteSession: (id: string) => void;
  onRunSession: (session: AssessmentSession) => void;
  currentUser?: User;
}

const SessionManager: React.FC<Props> = ({ 
  sessions, 
  users, 
  tickets, 
  roles, 
  departments, 
  onCreateSession, 
  onUpdateSession,
  onDeleteSession,
  onRunSession,
  currentUser
}) => {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  
  // --- Randomizer State ---
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [randStep, setRandStep] = useState(1);
  const [randConfig, setRandConfig] = useState<Partial<AssessmentSession>>({
      title: '',
      description: '',
      status: 'active',
      settings: {
        timeLimitMinutes: 30,
        attempts: 1,
        randomize: true,
        scoring: true,
        showResults: 'after_session',
        allowPause: false
      }
  });
  const [randDepts, setRandDepts] = useState<string[]>([]);
  const [randRoles, setRandRoles] = useState<string[]>([]); // New state for Roles
  const [randTickets, setRandTickets] = useState<string[]>([]);

  // --- Standard Creator State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Basics, 2: Audience, 3: Content (Ticket)
  const [importReport, setImportReport] = useState<{added: number, notFound: string[]}>({added: 0, notFound: []});

  // Form State for Standard Creator
  const [newSession, setNewSession] = useState<Partial<AssessmentSession>>({
    title: '',
    description: '',
    status: 'active',
    settings: {
      timeLimitMinutes: 30,
      attempts: 1,
      randomize: true,
      scoring: true,
      showResults: 'after_session',
      allowPause: false
    },
    targeting: {
      type: 'auto',
      roles: [],
      departments: [],
      specificUserIds: []
    },
    ticketId: ''
  });

  // Check Permissions
  const hasPermission = (permId: string) => {
    if (!currentUser) return false;
    if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return true;
    return currentUser.roles.some(rId => {
        const roleDef = roles.find(rd => rd.id === rId);
        return roleDef?.permissionIds.includes(permId);
    });
  };

  const canCreate = hasPermission('sess_create');
  const canEdit = hasPermission('sess_edit');
  const canDelete = hasPermission('sess_delete');
  const canRandom = hasPermission('sess_random');

  // Helper to format ISO date string to "YYYY-MM-DDThh:mm" for datetime-local input
  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // --- Standard Handlers ---

  const handleOpenCreator = () => {
    setEditingId(null);
    setNewSession({
      title: '',
      description: '',
      status: 'active',
      settings: {
        timeLimitMinutes: 30,
        attempts: 1,
        randomize: true,
        scoring: true,
        showResults: 'after_session',
        allowPause: false
      },
      targeting: {
        type: 'auto',
        roles: [],
        departments: [],
        specificUserIds: []
      },
      ticketId: ''
    });
    setStep(1);
    setImportReport({added: 0, notFound: []});
    setIsCreatorOpen(true);
  };

  const handleEdit = (session: AssessmentSession) => {
    setEditingId(session.id);
    setNewSession(JSON.parse(JSON.stringify(session))); // Deep copy
    setStep(1);
    setImportReport({added: 0, notFound: []});
    setIsCreatorOpen(true);
  };

  const handleSaveStandard = () => {
    if (!newSession.ticketId) {
        alert('Требуется выбрать билет');
        return;
    }

    let participantIds: string[] = [];
    
    if (newSession.targeting?.type === 'manual') {
      participantIds = newSession.targeting.specificUserIds || [];
    } else {
      const targetRoles = newSession.targeting?.roles || [];
      const targetDepts = newSession.targeting?.departments || [];
      
      participantIds = users.filter(u => {
        const roleMatch = targetRoles.length === 0 || u.roles.some(r => targetRoles.includes(r));
        const deptMatch = targetDepts.length === 0 || targetDepts.includes(u.departmentId);
        return roleMatch && deptMatch;
      }).map(u => u.id);
    }

    const startDate = newSession.startDate ? new Date(newSession.startDate).toISOString() : new Date().toISOString();
    const endDate = newSession.endDate ? new Date(newSession.endDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const sessionData: AssessmentSession = {
      id: editingId || `s-${Date.now()}`,
      title: newSession.title!,
      description: newSession.description || '',
      startDate: startDate,
      endDate: endDate,
      settings: newSession.settings!,
      status: newSession.status || 'active',
      ticketId: newSession.ticketId,
      participants: participantIds,
      targeting: newSession.targeting!
    };

    if (editingId) {
      onUpdateSession(sessionData);
    } else {
      onCreateSession(sessionData);
    }

    setIsCreatorOpen(false);
    setStep(1);
    setEditingId(null);
  };

  const handleParticipantUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const bstr = evt.target?.result;
        try {
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // Read as array of arrays. Expected: Col 0 = Name, Col 1 = Email
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            const foundIds = new Set(newSession.targeting?.specificUserIds || []);
            const notFound: string[] = [];
            let newAddedCount = 0;

            data.forEach((row, index) => {
                if (!row || row.length < 2) return;

                const nameInput = String(row[0] || '').trim();
                const emailInput = String(row[1] || '').trim().toLowerCase();

                // Simple check to skip header row if it contains "email" or "fio"
                if (index === 0 && (emailInput.includes('email') || emailInput.includes('mail') || emailInput.includes('почта'))) return;
                if (!emailInput.includes('@')) {
                     // Check if it might be just a header row skip, or invalid data
                     if (index !== 0 && emailInput) notFound.push(`${nameInput} (Некорректный Email: ${emailInput})`);
                     return;
                }

                // Find user by Email (Exact match) OR Name (Loose match if email fails, risky but requested)
                // Prioritize Email matching as it is unique
                const user = users.find(u => u.email.toLowerCase() === emailInput);

                if (user) {
                    if (!foundIds.has(user.id)) {
                        foundIds.add(user.id);
                        newAddedCount++;
                    }
                } else {
                    notFound.push(`${nameInput} (${emailInput})`);
                }
            });

            setNewSession(prev => ({
                ...prev,
                targeting: { ...prev.targeting!, specificUserIds: Array.from(foundIds) }
            }));

            setImportReport({ added: newAddedCount, notFound });
        } catch (error) {
            alert('Ошибка при чтении файла. Убедитесь, что это корректный Excel файл.');
            console.error(error);
        }
        // Reset input to allow re-uploading same file if needed
        e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // --- Randomizer Handlers ---

  const handleOpenRandomizer = () => {
      setRandStep(1);
      setRandDepts([]);
      setRandRoles([]);
      setRandTickets([]);
      setRandConfig({
        title: '',
        description: '',
        status: 'active',
        settings: {
            timeLimitMinutes: 30,
            attempts: 1,
            randomize: true,
            scoring: true,
            showResults: 'after_session',
            allowPause: false
        }
      });
      setIsRandomizerOpen(true);
  };

  const handleExecuteRandomDistribution = () => {
      if (!randConfig.title) { alert("Введите название"); return; }
      if (randDepts.length === 0) { alert("Выберите хотя бы один отдел"); return; }
      if (randRoles.length === 0) { alert("Выберите хотя бы одну роль (должность)"); return; }
      if (randTickets.length === 0) { alert("Выберите билеты для распределения"); return; }

      // 1. Get Pool of Users (Intersection of Depts AND Roles)
      const eligibleUsers = users.filter(u => 
          randDepts.includes(u.departmentId) && 
          u.roles.some(r => randRoles.includes(r))
      );
      
      if (eligibleUsers.length === 0) {
          alert("В выбранных отделах нет сотрудников с указанными ролями.");
          return;
      }

      // 2. Group Users by (Department + Roles) to avoid collision within same teams
      const groups: Record<string, User[]> = {};
      eligibleUsers.forEach(u => {
          // Create a signature key like "deptId_admin-employee"
          const key = `${u.departmentId}_${[...u.roles].sort().join('-')}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(u);
      });

      // 3. Distribute Tickets
      // Map: TicketID -> Array of UserIDs
      const distributionMap: Record<string, string[]> = {};
      randTickets.forEach(tId => distributionMap[tId] = []);

      Object.values(groups).forEach(groupUsers => {
          // Shuffle users in this small group
          const shuffledUsers = [...groupUsers].sort(() => Math.random() - 0.5);
          // Shuffle tickets for this group to ensure randomness
          const shuffledTickets = [...randTickets].sort(() => Math.random() - 0.5);

          shuffledUsers.forEach((user, index) => {
              // Round-robin assignment
              const ticketId = shuffledTickets[index % shuffledTickets.length];
              distributionMap[ticketId].push(user.id);
          });
      });

      // 4. Create Sessions (One per Ticket)
      const startDate = randConfig.startDate ? new Date(randConfig.startDate).toISOString() : new Date().toISOString();
      const endDate = randConfig.endDate ? new Date(randConfig.endDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      let createdCount = 0;

      Object.entries(distributionMap).forEach(([ticketId, participantIds]) => {
          if (participantIds.length === 0) return;

          const ticketInfo = tickets.find(t => t.id === ticketId);
          const sessionTitle = randTickets.length > 1 
            ? `${randConfig.title} - ${ticketInfo?.title || 'Вариант'}` 
            : randConfig.title!;

          const session: AssessmentSession = {
              id: `s-rnd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              title: sessionTitle,
              description: randConfig.description || 'Автоматическое распределение',
              startDate: startDate,
              endDate: endDate,
              settings: randConfig.settings!,
              status: randConfig.status || 'active',
              ticketId: ticketId,
              participants: participantIds,
              targeting: {
                  type: 'manual', // Lock targeting since it's a fixed distribution
                  specificUserIds: participantIds
              }
          };

          onCreateSession(session);
          createdCount++;
      });

      alert(`Успешно создано сессий: ${createdCount}. Билеты распределены между ${eligibleUsers.length} сотрудниками.`);
      setIsRandomizerOpen(false);
  };

  // --- Render Steps for Standard Creator ---

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Название Сессии</label>
        <input 
          type="text" 
          value={newSession.title}
          onChange={e => setNewSession({...newSession, title: e.target.value})}
          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-base font-medium focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder-secondary-300 dark:placeholder-zinc-600 dark:text-white"
          placeholder="Например: Квартальная аттестация"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Описание</label>
        <textarea 
          value={newSession.description}
          onChange={e => setNewSession({...newSession, description: e.target.value})}
          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg h-32 resize-none text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder-secondary-300 dark:placeholder-zinc-600 dark:text-white"
          placeholder="Краткое описание целей и задач тестирования..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Начало (Дата и Время)</label>
          <input 
            type="datetime-local" 
            value={formatDateForInput(newSession.startDate)}
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all dark:text-white"
            onChange={e => setNewSession({...newSession, startDate: e.target.value})} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Окончание (Дата и Время)</label>
          <input 
            type="datetime-local" 
            value={formatDateForInput(newSession.endDate)}
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all dark:text-white"
            onChange={e => setNewSession({...newSession, endDate: e.target.value})}
          />
        </div>
      </div>
      
      <div className="bg-secondary-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-secondary-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-4 text-secondary-700 dark:text-zinc-300">
            <Settings2 size={18} />
            <h4 className="text-sm font-bold uppercase tracking-wide">Параметры проведения</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 mb-1.5">Статус</label>
                <select 
                    value={newSession.status}
                    onChange={e => setNewSession({...newSession, status: e.target.value as any})}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-secondary-300 dark:border-zinc-700 rounded-lg text-sm outline-none focus:border-primary-500 dark:text-white"
                >
                    <option value="active">Активна</option>
                    <option value="draft">Черновик</option>
                    <option value="completed">Завершена</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 mb-1.5">Лимит времени (мин)</label>
                <input type="number" className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-secondary-300 dark:border-zinc-700 rounded-lg text-sm outline-none focus:border-primary-500 dark:text-white" 
                value={newSession.settings?.timeLimitMinutes}
                onChange={e => setNewSession(p => ({...p, settings: {...p.settings!, timeLimitMinutes: +e.target.value}}))}
                />
            </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
       <div className="flex bg-secondary-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button 
            onClick={() => setNewSession(p => ({...p, targeting: {...p.targeting!, type: 'auto'}}))}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${newSession.targeting?.type === 'auto' ? 'clay-btn text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-600 dark:text-zinc-400 hover:text-secondary-900 dark:hover:text-zinc-200'}`}
          >
            Автоматический подбор
          </button>
          <button 
            onClick={() => setNewSession(p => ({...p, targeting: {...p.targeting!, type: 'manual'}}))}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${newSession.targeting?.type === 'manual' ? 'clay-btn text-secondary-900 dark:text-white shadow-sm' : 'text-secondary-600 dark:text-zinc-400 hover:text-secondary-900 dark:hover:text-zinc-200'}`}
          >
            Ручной выбор сотрудников
          </button>
       </div>

       {newSession.targeting?.type === 'auto' ? (
         <div className="space-y-6 animate-fade-in">
            <div>
              <h4 className="text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Фильтр по Ролям</h4>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => {
                  const isSelected = newSession.targeting?.roles?.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => {
                        const current = newSession.targeting?.roles || [];
                        const updated = isSelected ? current.filter(r => r !== role.id) : [...current, role.id];
                        setNewSession(p => ({...p, targeting: {...p.targeting!, roles: updated}}));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected 
                            ? 'bg-secondary-900 dark:bg-white text-white dark:text-black border-secondary-900 dark:border-white' 
                            : 'bg-white dark:bg-zinc-900 text-secondary-600 dark:text-zinc-300 border-secondary-200 dark:border-zinc-700 hover:border-secondary-300'
                      }`}
                    >
                      {role.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Фильтр по Отделам</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {departments.map(dept => {
                   const isSelected = newSession.targeting?.departments?.includes(dept.id);
                   return (
                     <div 
                        key={dept.id}
                        onClick={() => {
                          const current = newSession.targeting?.departments || [];
                          const updated = isSelected ? current.filter(d => d !== dept.id) : [...current, dept.id];
                          setNewSession(p => ({...p, targeting: {...p.targeting!, departments: updated}}));
                        }}
                        className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-all border ${
                            isSelected 
                                ? 'bg-secondary-100 dark:bg-zinc-800 border-secondary-300 dark:border-zinc-600' 
                                : 'bg-white dark:bg-zinc-900 border-secondary-200 dark:border-zinc-700 hover:bg-secondary-50 dark:hover:bg-zinc-800/50'
                        }`}
                     >
                        <span className={`text-sm font-medium ${isSelected ? 'text-secondary-900 dark:text-white' : 'text-secondary-700 dark:text-zinc-300'}`}>{dept.name}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-secondary-900 dark:bg-white border-secondary-900 dark:border-white' : 'border-secondary-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
                             {isSelected && <Check size={12} className="text-white dark:text-black"/>}
                        </div>
                     </div>
                   )
                })}
              </div>
            </div>
         </div>
       ) : (
         <div className="space-y-4 animate-fade-in">
            {/* Import Block */}
            <div className="bg-secondary-50 dark:bg-zinc-900 p-3 rounded-xl border border-secondary-200 dark:border-zinc-800">
               <div className="flex justify-between items-center mb-3">
                   <h4 className="text-xs font-bold text-secondary-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2"><FileSpreadsheet size={16}/> Импорт из Excel</h4>
               </div>
               <div className="flex gap-4 items-start">
                   <label className="flex-1 border-2 border-dashed border-secondary-300 dark:border-zinc-700 rounded-lg p-3 clay-panel hover:bg-secondary-50 dark:hover:bg-zinc-900 cursor-pointer flex flex-col items-center justify-center text-center transition-colors">
                       <UploadCloud size={20} className="text-primary-600 mb-1" />
                       <span className="text-xs font-medium text-secondary-600 dark:text-zinc-300">Загрузить файл (XLSX)</span>
                       <span className="text-[10px] text-secondary-400 dark:text-zinc-500 mt-1">Столбцы: А=ФИО, B=Email</span>
                       <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleParticipantUpload} />
                   </label>
                   
                   {(importReport.added > 0 || importReport.notFound.length > 0) && (
                       <div className="flex-1 clay-panel border border-secondary-200 dark:border-zinc-800 rounded-lg p-2 max-h-24 overflow-y-auto custom-scrollbar text-xs">
                           {importReport.added > 0 && <div className="text-green-700 dark:text-green-400 font-bold mb-1">Добавлено: {importReport.added}</div>}
                           {importReport.notFound.length > 0 && (
                               <div>
                                   <div className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><AlertCircle size={10}/> Не найдено ({importReport.notFound.length}):</div>
                                   <div className="text-secondary-500 dark:text-zinc-500 mt-1 space-y-0.5">
                                       {importReport.notFound.map((s,i) => <div key={i}>• {s}</div>)}
                                   </div>
                               </div>
                           )}
                       </div>
                   )}
               </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-secondary-200 dark:border-zinc-800 rounded-xl p-2 bg-secondary-50 dark:bg-zinc-900/50">
                {users.map(u => {
                const isSelected = newSession.targeting?.specificUserIds?.includes(u.id);
                return (
                    <div 
                        key={u.id}
                        onClick={() => {
                        const current = newSession.targeting?.specificUserIds || [];
                        const updated = isSelected ? current.filter(id => id !== u.id) : [...current, u.id];
                        setNewSession(p => ({...p, targeting: {...p.targeting!, specificUserIds: updated}}));
                        }}
                        className={`p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-zinc-800/50'}`}
                    >
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-secondary-400 dark:border-zinc-600'}`}>
                            {isSelected && <Check size={10} className="text-white"/>}
                        </div>
                        <div className="flex-1 truncate">
                        <div className={`text-sm font-medium ${isSelected ? 'text-primary-900 dark:text-white' : 'text-secondary-700 dark:text-zinc-400'}`}>{u.name}</div>
                        <div className="text-[10px] text-secondary-400 dark:text-zinc-500">{u.email}</div>
                        </div>
                    </div>
                )
                })}
            </div>
         </div>
       )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
       <div className="p-3 bg-secondary-50 dark:bg-zinc-900 text-secondary-800 dark:text-zinc-300 rounded-lg text-sm flex items-center gap-2 border border-secondary-200 dark:border-zinc-800">
         <FolderOpen size={18} />
         <span className="font-medium">Выберите билет с вопросами для этой сессии</span>
       </div>
       <div className="grid gap-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
          {tickets.map(ticket => {
             const isSelected = newSession.ticketId === ticket.id;
             return (
               <div 
                  key={ticket.id} 
                  onClick={() => setNewSession(p => ({...p, ticketId: ticket.id}))}
                  className={`p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${
                      isSelected 
                        ? 'bg-secondary-900 dark:bg-white text-white dark:text-black border-secondary-900 dark:border-white shadow-lg transform scale-[1.01]' 
                        : 'bg-white dark:bg-zinc-900 border-secondary-200 dark:border-zinc-700 text-secondary-900 dark:text-white hover:border-secondary-400 dark:hover:border-zinc-500 hover:shadow-sm'
                  }`}
               >
                 <div>
                    <p className="font-bold text-base mb-1">{ticket.title}</p>
                    <p className={`text-xs ${isSelected ? 'text-secondary-300 dark:text-zinc-500' : 'text-secondary-500 dark:text-zinc-400'}`}>
                        {ticket.questions.length} вопросов • ID: {ticket.id}
                    </p>
                 </div>
                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-white dark:border-black bg-white/20 dark:bg-black/10' : 'border-secondary-300 dark:border-zinc-600'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-black"></div>}
                 </div>
               </div>
             )
          })}
       </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-secondary-200 dark:border-zinc-800 pb-4 gap-4">
         <div>
           <h2 className="text-3xl font-serif font-bold text-secondary-900 dark:text-white">Сессии</h2>
           <p className="text-secondary-500 dark:text-zinc-400 mt-1">Управление назначениями и расписанием</p>
         </div>
         <div className="flex gap-3">
            {canRandom && (
                <button 
                    onClick={handleOpenRandomizer}
                    className="clay-btn text-secondary-800 dark:text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                >
                    <Shuffle size={18} /> Рандом-распределение
                </button>
            )}
            {canCreate && (
                <button 
                    onClick={handleOpenCreator}
                    className="clay-btn-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm shadow-primary-200/50 flex items-center gap-2"
                >
                    <Plus size={18} /> Создать сессию
                </button>
            )}
         </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {sessions.map((s, idx) => {
           const sessionTicket = tickets.find(t => t.id === s.ticketId);
           const isActive = s.status === 'active';
           const isCompleted = s.status === 'completed';

           return (
            <div key={s.id} className="clay-panel p-3 flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
                <div className="mb-6">
                    <div className="flex justify-between items-start mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${isActive ? 'bg-primary-100 text-primary-700' : isCompleted ? 'bg-secondary-100 text-secondary-600' : 'bg-secondary-200 text-secondary-700'}`}>
                            {isActive ? 'Активна' : isCompleted ? 'Завершена' : 'Черновик'}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && <button onClick={() => handleEdit(s)} className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"><Edit2 size={16}/></button>}
                            {canDelete && <button onClick={() => onDeleteSession(s.id)} className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 size={16}/></button>}
                        </div>
                    </div>
                    
                    <h3 className="font-serif text-xl font-bold text-secondary-900 dark:text-white mb-2 leading-tight">{s.title}</h3>
                    
                    <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-zinc-400">
                            <Calendar size={14} className="text-secondary-400 dark:text-zinc-500"/> 
                            <span className="text-xs">
                                {new Date(s.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — 
                                {new Date(s.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-zinc-400">
                            <Users size={14} className="text-secondary-400 dark:text-zinc-500"/> 
                            <span>{s.participants.length} участников</span>
                        </div>
                        {sessionTicket && (
                            <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-zinc-400">
                                <FolderOpen size={14} className="text-secondary-400 dark:text-zinc-500"/> 
                                <span className="truncate">{sessionTicket.title}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="pt-4 border-t border-secondary-50 dark:border-zinc-800">
                    <button 
                        onClick={() => onRunSession(s)} 
                        className="w-full py-2.5 clay-btn text-secondary-700 dark:text-zinc-300 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <PlayCircle size={16} /> Предпросмотр
                    </button>
                </div>
            </div>
         )})}
      </div>

      {/* RANDOMIZER MODAL */}
      {isRandomizerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/40 backdrop-blur-sm p-3 animate-fade-in">
           <div className="clay-panel w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border dark:border-zinc-800">
                <div className="bg-gradient-to-r from-secondary-900 to-secondary-800 dark:from-zinc-900 dark:to-black text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <Shuffle size={20} className="text-primary-400" />
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Рандомное Распределение</h3>
                            <p className="text-xs text-secondary-300 opacity-80">Шаг {randStep} из 3</p>
                        </div>
                    </div>
                    <button onClick={() => setIsRandomizerOpen(false)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-transparent">
                    {/* Step 1: Config */}
                    {randStep === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Общее название (Префикс)</label>
                                <input 
                                    type="text" 
                                    value={randConfig.title}
                                    onChange={e => setRandConfig({...randConfig, title: e.target.value})}
                                    className="w-full px-4 py-3 bg-secondary-50 dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-base focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none dark:text-white"
                                    placeholder="Например: Аттестация Октябрь"
                                    autoFocus
                                />
                                <p className="text-xs text-secondary-400 dark:text-zinc-500 mt-1">Сессии будут называться: "Название - Билет 1", "Название - Билет 2" и т.д.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Начало</label>
                                <input 
                                    type="datetime-local" 
                                    value={formatDateForInput(randConfig.startDate)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-sm dark:text-white"
                                    onChange={e => setRandConfig({...randConfig, startDate: e.target.value})} 
                                />
                                </div>
                                <div>
                                <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Конец</label>
                                <input 
                                    type="datetime-local" 
                                    value={formatDateForInput(randConfig.endDate)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-sm dark:text-white"
                                    onChange={e => setRandConfig({...randConfig, endDate: e.target.value})}
                                />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-secondary-500 dark:text-zinc-400 mb-1.5">Лимит времени (мин)</label>
                                <input type="number" className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-secondary-200 dark:border-zinc-700 rounded-lg text-sm dark:text-white" 
                                value={randConfig.settings?.timeLimitMinutes}
                                onChange={e => setRandConfig(p => ({...p, settings: {...p.settings!, timeLimitMinutes: +e.target.value}}))}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Departments & Roles */}
                    {randStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-start gap-3 bg-secondary-50 dark:bg-zinc-900 p-3 rounded-xl border border-secondary-100 dark:border-zinc-800 text-sm text-secondary-600 dark:text-zinc-300 mb-4">
                                <HelpCircle size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
                                <p>Выберите <strong>Отделы</strong> и <strong>Роли</strong>. Система выберет сотрудников, у которых есть хотя бы одна из выбранных ролей и которые работают в выбранных отделах.</p>
                            </div>
                            
                            {/* Departments Grid */}
                            <div>
                                <h4 className="text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-3">1. Выберите Отделы</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {departments.map(dept => {
                                    const isSelected = randDepts.includes(dept.id);
                                    return (
                                        <div 
                                            key={dept.id}
                                            onClick={() => {
                                                const updated = isSelected ? randDepts.filter(d => d !== dept.id) : [...randDepts, dept.id];
                                                setRandDepts(updated);
                                            }}
                                            className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-all border ${
                                                isSelected 
                                                    ? 'bg-secondary-100 dark:bg-zinc-800 border-secondary-400 dark:border-zinc-600 shadow-sm' 
                                                    : 'bg-white dark:bg-zinc-900 border-secondary-200 dark:border-zinc-700 hover:bg-secondary-50 dark:hover:bg-zinc-800'
                                            }`}
                                        >
                                            <span className={`text-sm font-medium ${isSelected ? 'text-secondary-900 dark:text-white' : 'text-secondary-700 dark:text-zinc-300'}`}>{dept.name}</span>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-secondary-900 dark:bg-white border-secondary-900 dark:border-white' : 'border-secondary-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
                                                {isSelected && <Check size={12} className="text-white dark:text-black"/>}
                                            </div>
                                        </div>
                                    )
                                    })}
                                </div>
                            </div>

                            {/* Roles Grid */}
                            <div>
                                <h4 className="text-xs font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wider mb-3">2. Выберите Должности (Роли)</h4>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(role => {
                                        const isSelected = randRoles.includes(role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                onClick={() => {
                                                    const updated = isSelected ? randRoles.filter(r => r !== role.id) : [...randRoles, role.id];
                                                    setRandRoles(updated);
                                                }}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 ${
                                                    isSelected 
                                                        ? 'bg-secondary-900 dark:bg-white text-white dark:text-black border-secondary-900 dark:border-white shadow-sm' 
                                                        : 'bg-white dark:bg-zinc-900 text-secondary-600 dark:text-zinc-300 border-secondary-200 dark:border-zinc-700 hover:border-secondary-400'
                                                }`}
                                            >
                                                <Briefcase size={14} />
                                                {role.name}
                                                {isSelected && <CheckCircle size={14} className="ml-1" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Tickets */}
                    {randStep === 3 && (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-sm font-semibold text-secondary-500 dark:text-zinc-400 uppercase tracking-wide">Выберите билеты для распределения (минимум 2)</p>
                            <div className="grid gap-3 max-h-80 overflow-y-auto custom-scrollbar p-1">
                                {tickets.map(ticket => {
                                    const isSelected = randTickets.includes(ticket.id);
                                    return (
                                    <div 
                                        key={ticket.id} 
                                        onClick={() => {
                                            const updated = isSelected ? randTickets.filter(t => t !== ticket.id) : [...randTickets, ticket.id];
                                            setRandTickets(updated);
                                        }}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${
                                            isSelected 
                                                ? 'bg-secondary-900 dark:bg-white text-white dark:text-black border-secondary-900 dark:border-white shadow-md transform scale-[1.01]' 
                                                : 'bg-white dark:bg-zinc-900 border-secondary-200 dark:border-zinc-700 text-secondary-900 dark:text-white hover:border-secondary-400 hover:shadow-sm'
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-base mb-1">{ticket.title}</p>
                                            <p className={`text-xs ${isSelected ? 'text-secondary-300 dark:text-zinc-500' : 'text-secondary-500 dark:text-zinc-400'}`}>
                                                {ticket.questions.length} вопросов
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-white dark:border-black bg-white/20 dark:bg-black/10' : 'border-secondary-300 dark:border-zinc-600'}`}>
                                            {isSelected && <Check size={14} className="text-white dark:text-black"/>}
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-secondary-200 dark:border-zinc-800 bg-secondary-50 dark:bg-zinc-900 flex justify-between items-center shrink-0">
                    {randStep > 1 ? (
                        <button onClick={() => setRandStep(p => p - 1)} className="px-5 py-2.5 clay-btn border border-secondary-300 dark:border-zinc-700 rounded-lg text-secondary-700 dark:text-zinc-300 text-sm font-medium hover:bg-secondary-100 dark:hover:bg-zinc-800 transition-colors">
                            Назад
                        </button>
                    ) : <div></div>}
                    
                    {randStep < 3 ? (
                        <button onClick={() => setRandStep(p => p + 1)} className="px-6 py-2.5 clay-btn-primary text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                            Далее <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button onClick={handleExecuteRandomDistribution} className="px-6 py-2.5 clay-btn-primary text-white rounded-lg text-sm font-medium transition-colors shadow-md flex items-center gap-2">
                            <CheckCircle size={16} /> Создать и распределить
                        </button>
                    )}
                </div>
           </div>
        </div>
      )}

      {/* STANDARD CREATOR MODAL */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/40 backdrop-blur-sm p-3 animate-fade-in">
           <div className="clay-panel w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border dark:border-zinc-800">
              <div className="px-6 py-4 border-b border-secondary-100 dark:border-zinc-800 flex justify-between items-center bg-secondary-50/50 dark:bg-zinc-900/50">
                 <div>
                   <h3 className="font-serif text-xl font-bold text-secondary-900 dark:text-white">{editingId ? 'Настройка сессии' : 'Новая сессия'}</h3>
                   <div className="flex gap-1.5 mt-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 w-8 rounded-full transition-all ${step >= i ? 'bg-primary-600' : 'bg-secondary-200 dark:bg-zinc-700'}`}></div>
                      ))}
                   </div>
                 </div>
                 <button onClick={() => setIsCreatorOpen(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-zinc-800 p-1 rounded-full transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-transparent">
                 {step === 1 && renderStep1()}
                 {step === 2 && renderStep2()}
                 {step === 3 && renderStep3()}
              </div>

              <div className="p-3 border-t border-secondary-100 dark:border-zinc-800 bg-secondary-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                 {step > 1 ? (
                   <button onClick={() => setStep(p => p - 1)} className="px-5 py-2.5 clay-btn text-secondary-700 dark:text-zinc-300 text-sm font-medium transition-colors flex items-center gap-2">
                     <ChevronLeft size={16} /> Назад
                   </button>
                 ) : <div></div>}
                 
                 {step < 3 ? (
                   <button onClick={() => setStep(p => p + 1)} className="px-5 py-2.5 clay-btn-primary text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-primary-200/50">
                     Далее <ChevronRight size={16} />
                   </button>
                 ) : (
                   <button onClick={handleSaveStandard} className="px-6 py-2.5 clay-btn-primary text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                     {editingId ? 'Сохранить изменения' : 'Запустить сессию'}
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;
