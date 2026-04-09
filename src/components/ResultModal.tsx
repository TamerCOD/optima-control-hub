
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, User as UserIcon, FileText, Calendar, CheckCircle, XCircle, Save } from 'lucide-react';
import { AssessmentResult, AssessmentSession, Ticket, User, QuestionType } from '../types';

interface ResultModalProps {
  result: AssessmentResult;
  session?: AssessmentSession;
  ticket?: Ticket;
  user?: User;
  canEdit?: boolean;
  passingThreshold?: number; 
  hideDetails?: boolean; 
  onSave?: (updatedResult: AssessmentResult) => void;
  onClose: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ result, session, ticket, user, canEdit = false, passingThreshold = 70, hideDetails = false, onSave, onClose }) => {
  // Sort answers based on the original Ticket Question Order to ensure history is readable (1, 2, 3...)
  // regardless of how they were shuffled during the test.
  const [editedResult, setEditedResult] = useState<AssessmentResult>(() => {
      const clonedResult = JSON.parse(JSON.stringify(result));
      if (ticket?.questions) {
          // Create a map for sorting: QuestionID -> Index
          const orderMap = new Map<string, number>(ticket.questions.map((q, i) => [q.id, i]));
          
          clonedResult.answers.sort((a: any, b: any) => {
              const idxA = orderMap.get(a.questionId) ?? 9999;
              const idxB = orderMap.get(b.questionId) ?? 9999;
              return idxA - idxB;
          });
      }
      return clonedResult;
  });

  const [isDirty, setIsDirty] = useState(false);

  const scorePercent = editedResult.maxScore > 0 ? (editedResult.totalScore / editedResult.maxScore) * 100 : 0;
  const isPassed = Math.round(scorePercent * 100) / 100 >= passingThreshold;

  const formattedDate = new Date(editedResult.completedAt || editedResult.startedAt).toLocaleDateString('ru-RU');
  const deptName = user?.departmentName || '—';

  const toggleAnswerScore = (answerIndex: number, weight: number) => {
      const newResult = { ...editedResult };
      const answer = newResult.answers[answerIndex];
      
      if (answer.score > 0) {
          answer.score = 0;
          answer.isCorrect = false;
      } else {
          answer.score = weight;
          answer.isCorrect = true;
      }

      const newTotalScore = newResult.answers.reduce((acc, a) => acc + a.score, 0);
      newResult.totalScore = newTotalScore;
      newResult.passed = (newTotalScore / newResult.maxScore) * 100 >= passingThreshold;

      setEditedResult(newResult);
      setIsDirty(true);
  };

  const handleSave = () => { if (onSave) onSave(editedResult); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 p-3 backdrop-blur-md no-print">
         <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="clay-panel w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden"
         >
            <div className="p-6 border-b border-white/20 dark:border-zinc-700/30 flex justify-between items-start shrink-0">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6">
                         {isPassed ? (
                             <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xl">
                                <CheckCircle size={16} /> Аттестация Пройдена
                             </span>
                         ) : (
                             <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest clay-btn-primary text-white shadow-red-glow">
                                <XCircle size={16} /> Порог не достигнут
                             </span>
                         )}
                         <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest">ID: {editedResult.id.slice(-8)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">
                                <FileText size={14} /> Пройденный курс
                            </div>
                            <h2 className="text-3xl font-black text-zinc-950 dark:text-white leading-none mb-2 tracking-tight">{session?.title || 'Архивное задание'}</h2>
                            <p className="text-sm font-bold text-zinc-500 uppercase tracking-tight">{ticket?.title}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">
                                <UserIcon size={14} /> Специалист
                            </div>
                            <div className="text-2xl font-black text-zinc-950 dark:text-white leading-none mb-2">{user?.name || 'Система'}</div>
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{deptName}</div>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="text-zinc-400 hover:text-primary transition-colors p-2">
                    <X size={32} />
                </button>
            </div>

            <div className="overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                     <div className="clay-panel p-4 text-center bg-white/30 dark:bg-zinc-800/30">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Баллы за тест</div>
                        <div className="text-4xl font-black text-zinc-950 dark:text-white tabular-nums">{editedResult.totalScore.toFixed(1)} <span className="text-xl text-zinc-400 font-bold">/ {editedResult.maxScore}</span></div>
                     </div>
                     <div className="clay-panel p-4 text-center bg-white/30 dark:bg-zinc-800/30">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Эффективность</div>
                        <div className={`text-4xl font-black tabular-nums ${isPassed ? 'text-zinc-950 dark:text-zinc-100' : 'text-primary'}`}>{scorePercent.toFixed(1)}%</div>
                     </div>
                     <div className="clay-panel p-4 text-center bg-white/30 dark:bg-zinc-800/30">
                         <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Дата контроля</div>
                         <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1 flex items-center justify-center gap-3">
                            <Calendar size={20} className="text-primary" /> {formattedDate}
                         </div>
                     </div>
                </div>

                {!hideDetails ? (
                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex justify-between items-center mb-6">
                            <span>Протокол ответов</span>
                            {canEdit && <span className="text-[10px] bg-primary text-white px-2 py-1 rounded">Редактирование</span>}
                        </h3>
                        
                        <div className="space-y-4">
                            {editedResult.answers.map((ans, idx) => {
                                // Find question in ORIGINAL ticket to display proper text even if user didn't see it (though result should contain all)
                                const question = ticket?.questions.find(q => q.id === ans.questionId);
                                const isOpenQuestion = question?.type === QuestionType.OPEN;
                                const isCorrect = ans.score === (question?.weight || 1);
                                const isPartial = ans.score > 0 && ans.score < (question?.weight || 1);
                                const weight = question?.weight || 1;
                                
                                return (
                                    <div key={idx} className={`clay-panel p-4 transition-all ${
                                        isPartial 
                                            ? 'border-amber-400 dark:border-amber-600'
                                            : isCorrect || (isOpenQuestion && ans.score > 0)
                                                ? 'border-transparent' 
                                                : 'border-primary'
                                    }`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-lg font-black">
                                                    {idx + 1}
                                                </div>
                                                <div className={`text-[10px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-lg ${
                                                    isPartial 
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : isOpenQuestion 
                                                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                                                            : ans.score > 0 
                                                                ? 'bg-zinc-950 dark:bg-white text-white dark:text-black' 
                                                                : 'clay-btn-primary text-white'
                                                }`}>
                                                    {isPartial ? 'Частично верно' : isOpenQuestion ? 'Текстовый ответ' : ans.score > 0 ? `Верно (+${ans.score})` : 'Ошибка (0)'} 
                                                </div>
                                            </div>

                                            {canEdit && (
                                                <button 
                                                    onClick={() => toggleAnswerScore(idx, weight)}
                                                    className={`px-4 py-2 clay-btn text-[10px] font-black uppercase tracking-widest transition-all ${ans.score > 0 ? 'text-primary' : 'text-zinc-900 dark:text-white'}`}
                                                >
                                                    {ans.score > 0 ? 'Аннулировать' : 'Зачесть балл'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        <p className="text-xl font-black text-zinc-900 dark:text-white mb-6 leading-snug">{question?.text || 'Запрос недоступен (удален)'}</p>
                                        
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Полученный ответ:</div>
                                            
                                            {!isOpenQuestion ? (
                                                <div className="space-y-2">
                                                    {(() => {
                                                        const ids = ans.selectedOptions || (ans.textAnswer ? [ans.textAnswer] : []);
                                                        if (ids.length === 0) return <div className="text-sm italic text-zinc-500 font-bold uppercase">(Пустой ответ)</div>;

                                                        return ids.map((optId: string) => {
                                                            const opt = question?.options?.find(o => o.id === optId);
                                                            return (
                                                                <div key={optId} className="flex items-center gap-4 p-3 clay-panel bg-white/30 dark:bg-zinc-800/30">
                                                                    <div className={`w-3 h-3 rounded-full ${isCorrect ? 'bg-primary' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                                                                    <span className="font-bold text-zinc-900 dark:text-zinc-200">{opt?.text || optId}</span>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="p-3 clay-panel bg-white/30 dark:bg-zinc-800/30 text-zinc-900 dark:text-zinc-200 font-bold leading-relaxed whitespace-pre-wrap">
                                                    {ans.textAnswer || "(Ответ не предоставлен)"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 clay-panel bg-white/30 dark:bg-zinc-800/30">
                        <CheckCircle size={64} className={`mx-auto mb-6 ${isPassed ? 'text-primary' : 'text-zinc-400'}`} />
                        <h3 className="text-3xl font-black text-zinc-950 dark:text-white mb-3 uppercase tracking-tighter">Фиксация результата</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto font-bold text-sm">
                            Ваша активность успешно сохранена в базе данных. Вы можете вернуться к списку заданий.
                        </p>
                    </div>
                )}
            </div>

            {canEdit && isDirty && (
                <div className="p-4 border-t border-white/20 dark:border-zinc-700/30 flex justify-end gap-4 shrink-0">
                    <button onClick={onClose} className="px-8 py-3.5 clay-btn text-xs font-black uppercase tracking-widest">Отмена</button>
                    <button onClick={handleSave} className="px-10 py-3.5 clay-btn clay-btn-primary text-xs font-black uppercase tracking-widest flex items-center gap-3">
                        <Save size={18} /> Принять изменения
                    </button>
                </div>
            )}
         </motion.div>
    </div>
  );
};

export default ResultModal;
