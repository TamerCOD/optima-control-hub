
import React, { useState } from 'react';
import { Plus, Trash2, FolderOpen, ChevronLeft, Save, X, Edit2, Check, ShieldOff } from 'lucide-react';
import { Ticket, Question, QuestionType, QuestionOption, User, RoleDefinition, UserRole } from '../types';

interface Props {
  tickets: Ticket[];
  currentUser: User;
  roles: RoleDefinition[];
  onUpdateTicket: (ticket: Ticket) => void;
  onCreateTicket: (ticket: Ticket) => void;
  onDeleteTicket: (id: string) => void;
}

const TicketBank: React.FC<Props> = ({ tickets, currentUser, roles, onUpdateTicket, onCreateTicket, onDeleteTicket }) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);

  // --- Ticket Editing State ---
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  
  // --- Question Form State ---
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null); 

  const [newQ, setNewQ] = useState<Partial<Question>>({
     type: QuestionType.SINGLE,
     text: '',
     weight: 1,
     tags: [],
     options: [
       { id: `opt_${Date.now()}_1`, text: '', isCorrect: true },
       { id: `opt_${Date.now()}_2`, text: '', isCorrect: false }
     ],
     media: undefined
  });

  const hasPermission = (permId: string) => {
    if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return true;
    return currentUser.roles.some(rId => {
        const roleDef = roles.find(rd => rd.id === rId);
        return roleDef?.permissionIds.includes(permId);
    });
  };

  const canManage = hasPermission('kb_manage');

  const handleOpenTicket = (ticket?: Ticket) => {
    if (ticket) {
      setCurrentTicket(ticket);
      setEditTitle(ticket.title);
      setEditDesc(ticket.description || '');
      const sanitized = (ticket.questions || []).map(q => sanitizeQuestion(q as Question));
      setEditQuestions(sanitized);
    } else {
      // Create mode requires permission
      if (!canManage) return; 
      setCurrentTicket(null);
      setEditTitle('');
      setEditDesc('');
      setEditQuestions([]);
    }
    setEditingQuestionId(null);
    setIsAddingQuestion(false);
    setView('edit');
  };

  const sanitizeQuestion = (q: Question): Question => {
      const hasOptions = Array.isArray(q.options) && q.options.length > 0;
      let type = String(q.type || 'single').trim().toLowerCase();
      
      // Force change type to single if options exist but marked as open
      if (hasOptions && type === 'open') type = 'single';

      let options = (q.options || []).map(opt => ({
          id: opt.id || `opt-${Math.random().toString(36).substr(2, 9)}`,
          text: opt.text || '',
          isCorrect: Boolean(opt.isCorrect === true || String(opt.isCorrect) === 'true')
      }));

      if ((type === 'single' || type === 'multiple') && options.length === 0) {
          options = [
              { id: `opt-${Date.now()}-1`, text: '', isCorrect: true },
              { id: `opt-${Date.now()}-2`, text: '', isCorrect: false }
          ];
      }

      return {
          id: q.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: type as QuestionType,
          text: q.text || '',
          weight: Number(q.weight) || 1,
          tags: q.tags || [],
          options: options,
          explanation: q.explanation || '',
          media: q.media
      };
  };

  const handleSaveTicket = () => {
    if (!canManage) return;
    if (!editTitle.trim()) return alert("Введите название");
    if (editQuestions.length === 0) return alert("Добавьте вопросы");

    const ticketData: Ticket = {
      id: currentTicket ? currentTicket.id : `t-${Date.now()}`,
      title: editTitle,
      description: editDesc,
      questions: editQuestions.map(sanitizeQuestion),
      createdAt: currentTicket ? currentTicket.createdAt : new Date().toISOString()
    };

    if (currentTicket) onUpdateTicket(ticketData);
    else onCreateTicket(ticketData);
    setView('list');
  };

  const handleSaveQuestionToTicket = () => {
    if (!newQ.text) return alert("Введите текст вопроса");

    const safeQ = sanitizeQuestion({
      ...newQ,
      id: editingQuestionId || `q-${Date.now()}`
    } as Question);

    if (editingQuestionId) {
        setEditQuestions(prev => prev.map(item => item.id === editingQuestionId ? safeQ : item));
    } else {
        setEditQuestions([...editQuestions, safeQ]);
    }
    resetQuestionForm();
  };

  const handleEditQuestion = (qId: string) => {
      const q = editQuestions.find(item => item.id === qId);
      if (q) {
          const qCopy = JSON.parse(JSON.stringify(q));
          setNewQ(qCopy);
          setEditingQuestionId(qId);
          setIsAddingQuestion(true);
      }
  };

  const resetQuestionForm = () => {
    setIsAddingQuestion(false);
    setEditingQuestionId(null);
    setNewQ({
        type: QuestionType.SINGLE,
        text: '',
        weight: 1,
        tags: [],
        options: [
            { id: `opt_${Date.now()}_1`, text: '', isCorrect: true }, 
            { id: `opt_${Date.now()}_2`, text: '', isCorrect: false }
        ],
        media: undefined
    });
  };

  const updateOption = (idx: number, field: keyof QuestionOption, value: any) => {
      const opts = [...(newQ.options || [])];
      const currentType = String(newQ.type || 'single').trim().toLowerCase();
      
      if (field === 'isCorrect' && currentType === 'single' && value === true) {
          opts.forEach((o, i) => { if (i !== idx) o.isCorrect = false; });
      }
      opts[idx] = { ...opts[idx], [field]: value };
      setNewQ({ ...newQ, options: opts });
  };

  const addOption = () => {
      setNewQ({
          ...newQ,
          options: [...(newQ.options || []), { id: `opt_${Date.now()}`, text: '', isCorrect: false }]
      });
  };

  const renderListView = () => (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className="flex flex-col md:flex-row justify-between items-end border-b dark:border-zinc-800 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">Библиотека Знаний</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 uppercase text-[10px] font-black tracking-widest">Управление проверочными материалами</p>
        </div>
        {canManage && (
            <button onClick={() => handleOpenTicket()} className="bg-primary text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg flex items-center gap-2">
                <Plus size={18} /> Создать билет
            </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tickets.map(ticket => (
          <div key={ticket.id} onClick={() => handleOpenTicket(ticket)} className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-4 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl transition-all cursor-pointer group">
             <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl flex items-center justify-center border dark:border-zinc-700"><FolderOpen size={28} /></div>
                <span className="bg-zinc-950 dark:bg-white text-white dark:text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{ticket.questions?.length || 0} вопр.</span>
             </div>
             <h3 className="text-xl font-black text-zinc-950 dark:text-white mb-2 uppercase tracking-tighter leading-tight">{ticket.title}</h3>
             <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 font-bold uppercase tracking-wide">{ticket.description || 'Нет описания'}</p>
             <div className="pt-6 mt-6 border-t dark:border-zinc-800 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 {canManage ? (
                     <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Удалить?')) onDeleteTicket(ticket.id); }} className="p-2 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                 ) : (
                     <div className="text-[10px] text-zinc-300 flex items-center gap-1"><ShieldOff size={12}/> Только чтение</div>
                 )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEditorView = () => (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className="flex items-center justify-between border-b dark:border-zinc-800 pb-6 sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl z-20 pt-4">
          <button onClick={() => setView('list')} className="flex items-center gap-3 text-zinc-950 dark:text-white px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 transition-all font-black text-[10px] uppercase tracking-widest"><ChevronLeft size={18} /> Назад</button>
          {canManage && (
              <button onClick={handleSaveTicket} className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-xl"><Save size={18} /> Сохранить билет</button>
          )}
       </div>
       
       <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border dark:border-zinc-800 p-6 shadow-xl space-y-8">
          <div className="grid md:grid-cols-3 gap-10">
              <div className="md:col-span-2 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-2">Название Билета</label>
                    <input disabled={!canManage} value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-2xl font-black focus:border-primary outline-none transition-all dark:text-white uppercase tracking-tighter disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-2">Описание</label>
                    <textarea disabled={!canManage} value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm h-24 resize-none focus:border-primary outline-none transition-all dark:text-white font-bold disabled:opacity-50" />
                  </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
                  <div className="text-7xl font-black text-primary mb-2">{editQuestions.length}</div>
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Вопросов в билете</div>
              </div>
          </div>
       </div>

       <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
              <h3 className="text-2xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">Список Вопросов</h3>
              {(!isAddingQuestion && canManage) && <button onClick={() => { resetQuestionForm(); setIsAddingQuestion(true); }} className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-3">+ Добавить вопрос</button>}
          </div>

          {isAddingQuestion && (
             <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border-4 border-primary/10 dark:border-zinc-800 p-6 mb-8 animate-fade-in">
                <div className="flex justify-between items-center mb-8 border-b dark:border-zinc-800 pb-6"><h4 className="font-black text-xl uppercase tracking-widest dark:text-white">{editingQuestionId ? 'Редактировать вопрос' : 'Параметры вопроса'}</h4><button onClick={resetQuestionForm} className="text-zinc-400 hover:text-primary"><X size={24}/></button></div>
                <div className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-3">
                          <label className="block text-[10px] font-black text-zinc-400 uppercase mb-2 ml-2">Тип вопроса</label>
                          <select className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-primary dark:text-white" 
                            value={String(newQ.type || 'single').trim().toLowerCase()} 
                            onChange={e => { 
                                const type = e.target.value as QuestionType; 
                                setNewQ({ ...newQ, type }); 
                            }}>
                             <option value="single">Один правильный ответ</option>
                             <option value="multiple">Множественный выбор</option>
                             <option value="open">Развернутый ответ</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-zinc-400 uppercase mb-2 ml-2">Вес (баллы) *</label>
                          <input type="number" className="w-full px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-center font-black outline-none focus:border-primary dark:text-white" value={newQ.weight} onChange={e => setNewQ({...newQ, weight: +e.target.value})}/>
                      </div>
                   </div>
                   <div><label className="block text-[10px] font-black text-zinc-400 uppercase mb-2 ml-2">Текст вопроса</label><textarea className="w-full px-6 py-5 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl text-lg font-bold leading-tight focus:border-primary outline-none transition-all dark:text-white h-24" value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} /></div>
                   
                   {(() => {
                       const normalizedType = String(newQ.type || 'single').trim().toLowerCase();
                       if (normalizedType === 'single' || normalizedType === 'multiple' || (newQ.options && newQ.options.length > 0)) {
                           return (
                              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-3xl border-2 dark:border-zinc-800 space-y-4 shadow-inner">
                                 <div className="flex justify-between items-center mb-4">
                                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Варианты ответа</p>
                                     <button onClick={addOption} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">+ Добавить вариант</button>
                                 </div>
                                 <div className="space-y-3">
                                    {(newQ.options || []).map((opt, idx) => (
                                    <div key={opt.id} className="flex items-center gap-4 animate-fade-in group/opt">
                                        <input 
                                            type={normalizedType === 'multiple' ? "checkbox" : "radio"} 
                                            name="correctOption" 
                                            checked={opt.isCorrect} 
                                            onChange={e => updateOption(idx, 'isCorrect', e.target.checked)} 
                                            className="w-6 h-6 accent-primary cursor-pointer shrink-0" 
                                        />
                                        <input 
                                            value={opt.text} 
                                            onChange={e => updateOption(idx, 'text', e.target.value)} 
                                            className="flex-1 px-5 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl text-sm font-bold focus:border-primary outline-none transition-all dark:text-white" 
                                            placeholder={`Ответ №${idx + 1}...`} 
                                        />
                                        <button onClick={() => { const opts = [...(newQ.options || [])]; opts.splice(idx, 1); setNewQ({...newQ, options: opts}); }} className="p-2 text-zinc-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                    </div>
                                    ))}
                                 </div>
                              </div>
                           );
                       }
                       return null;
                   })()}

                   <div className="flex gap-4 pt-6 border-t dark:border-zinc-800">
                      <button onClick={handleSaveQuestionToTicket} className="flex-1 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">{editingQuestionId ? 'Сохранить изменения' : 'Добавить вопрос'}</button>
                      <button onClick={resetQuestionForm} className="px-10 py-4 font-black text-[10px] uppercase tracking-widest text-zinc-400">Отмена</button>
                   </div>
                </div>
             </div>
          )}

          <div className="grid gap-4">
            {editQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white dark:bg-zinc-900 p-3 rounded-3xl border dark:border-zinc-800 flex gap-6 hover:shadow-lg transition-all group animate-fade-in relative">
                    {canManage && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleEditQuestion(q.id)} className="p-2 text-zinc-400 hover:text-primary bg-zinc-50 dark:bg-zinc-800 rounded-lg border dark:border-zinc-700 transition-all"><Edit2 size={16} /></button>
                            <button onClick={() => { if(window.confirm('Удалить?')) setEditQuestions(editQuestions.filter(x => x.id !== q.id)); }} className="p-2 text-zinc-300 hover:text-red-500 bg-zinc-50 dark:bg-zinc-800 rounded-lg border dark:border-zinc-700 transition-all"><Trash2 size={16} /></button>
                        </div>
                    )}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black text-sm">{idx + 1}</div>
                    <div className="flex-1 min-w-0 pr-20">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase tracking-widest">{(q.type || 'SINGLE').toUpperCase()}</span>
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">{Number(q.weight) || 1} БАЛЛ.</span>
                        </div>
                        <p className="text-lg font-black text-zinc-900 dark:text-white leading-tight mb-4">{q.text}</p>
                        {String(q.type || 'single').trim().toLowerCase() !== 'open' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(q.options || []).map(opt => (
                                    <div key={opt.id} className={`flex items-center gap-2 text-[11px] font-bold ${opt.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
                                        {opt.isCorrect ? <Check size={12}/> : <div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 ml-1.5 mr-1"/>}
                                        <span className="truncate">{opt.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
          </div>
       </div>
    </div>
  );

  return view === 'list' ? renderListView() : renderEditorView();
};

export default TicketBank;
