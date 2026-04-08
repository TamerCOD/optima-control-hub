
import React, { useState } from 'react';
import { Clock, Lock, ArrowRight, Eye, Timer, FileQuestion } from 'lucide-react';
import { AssessmentSession, AssessmentResult, User, Ticket, RoleDefinition } from '../types';
import ResultModal from './ResultModal';

interface Props {
  sessions: AssessmentSession[];
  results: AssessmentResult[];
  currentUser: User;
  tickets: Ticket[];
  roles: RoleDefinition[];
  passingThreshold: number;
  onStart: (session: AssessmentSession) => void;
}

const AssessmentList: React.FC<Props> = ({ sessions, results, currentUser, tickets, roles, passingThreshold, onStart }) => {
  const [selectedResult, setSelectedResult] = useState<{result: AssessmentResult, session: AssessmentSession} | null>(null);

  return (
    <div className="animate-fade-in pb-10 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end border-b-4 border-zinc-900 dark:border-zinc-800 pb-6 gap-4">
         <div>
            <h1 className="text-4xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter leading-none">Мои Задания</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-bold uppercase text-xs tracking-widest">Персональный список актуальных тестирований</p>
         </div>
         <div className="bg-zinc-900 dark:bg-zinc-800 px-4 py-2 rounded-lg">
            <span className="text-white text-xs font-black uppercase tracking-widest">
                Активно: {sessions.length}
            </span>
         </div>
      </div>
      
      {sessions.length === 0 ? (
        <div className="p-24 clay-panel text-center shadow-inner">
           <span className="text-zinc-400 dark:text-zinc-600 font-black text-xl uppercase tracking-widest">Нет доступных заданий</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {sessions.map((session) => {
            const ticket = tickets.find(t => t.id === session.ticketId);
            const questionCount = ticket?.questions?.length || 0;

            const now = new Date();
            const startDate = new Date(session.startDate);
            const endDate = new Date(session.endDate);
            
            const isStarted = now >= startDate;
            const isEnded = now > endDate;
            const isTimeValid = isStarted && !isEnded;

            const canStart = session.status === 'active' && isTimeValid;
            
            const userResults = results
                .filter(r => r.sessionId === session.id && r.userId === currentUser.id)
                .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());
            
            const latestResult = userResults[0];
            
            let hasPassed = false;
            let scorePercent = 0;
            let correctCount = 0;

            if (latestResult) {
                scorePercent = latestResult.maxScore > 0 ? (latestResult.totalScore / latestResult.maxScore) * 100 : 0;
                hasPassed = Math.round(scorePercent * 100) / 100 >= passingThreshold;
                correctCount = latestResult.answers.filter(a => a.isCorrect).length;
            }

            return (
              <div key={session.id} className={`group bg-white dark:bg-zinc-900 rounded-2xl shadow-sharp border-2 border-zinc-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/40 hover:shadow-2xl ${!canStart && !latestResult ? 'opacity-60 bg-zinc-50 dark:bg-zinc-950 grayscale' : ''}`}>
                <div className="flex flex-col md:flex-row">
                   <div className={`w-full md:w-3 ${latestResult ? (hasPassed ? 'bg-zinc-950 dark:bg-zinc-100' : 'bg-primary') : canStart ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>

                   <div className="flex-1 p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
                         <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded">ID: {session.id.slice(-6)}</span>
                                {latestResult ? (
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${hasPassed ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-black' : 'bg-primary text-white shadow-red-glow'}`}>
                                        {hasPassed ? 'Аттестация Пройдена' : 'Провал (Порог не достигнут)'}
                                    </span>
                                ) : (
                                    <>
                                        {!isStarted && (
                                            <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white flex items-center gap-2">
                                                <Timer size={12}/> Ожидание старта
                                            </span>
                                        )}
                                        {isEnded && (
                                            <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                                                Срок истек
                                            </span>
                                        )}
                                        {canStart && (
                                            <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                                                Доступ открыт
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">
                                {session.title}
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed font-medium">
                                {session.description || "Описание аттестации отсутствует."}
                            </p>
                         </div>

                         <div className="flex flex-col items-end gap-5 min-w-[240px]">
                            {/* Stats Display for Completed Test */}
                            {latestResult ? (
                                <div className={`flex items-center gap-3 p-2 rounded-2xl border-2 ${hasPassed ? 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' : 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                                    <div className="text-right">
                                        <div className={`text-2xl font-black leading-none ${hasPassed ? 'text-zinc-900 dark:text-white' : 'text-primary'}`}>
                                            {scorePercent.toFixed(0)}%
                                        </div>
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Результат</div>
                                    </div>
                                    <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
                                    <div className="text-right">
                                        <div className="text-xl font-black leading-none text-zinc-600 dark:text-zinc-300">
                                            {correctCount}<span className="text-zinc-300 text-sm">/{questionCount}</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Верно</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 w-24 h-24 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 text-center" title="Количество вопросов">
                                        <FileQuestion size={24} className="text-zinc-400 dark:text-zinc-600 mb-2" /> 
                                        <span className="text-sm font-black text-zinc-900 dark:text-white uppercase">{questionCount}</span>
                                        <span className="text-[9px] font-black text-zinc-500 uppercase">Вопросов</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 w-24 h-24 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 text-center" title="Лимит времени">
                                        <Clock size={24} className="text-zinc-400 dark:text-zinc-600 mb-2" /> 
                                        <span className="text-sm font-black text-zinc-900 dark:text-white uppercase">{session.settings.timeLimitMinutes}</span>
                                        <span className="text-[9px] font-black text-zinc-500 uppercase">Минут</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col text-xs text-right font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-500 gap-1.5">
                                <div className={`flex items-center gap-3 justify-end ${!isStarted ? 'text-amber-600 dark:text-amber-500' : ''}`}>
                                    <span className="text-[10px] opacity-60">Старт:</span>
                                    <span className="text-zinc-900 dark:text-zinc-300">
                                        {startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-3 justify-end ${isEnded ? 'text-primary' : ''}`}>
                                    <span className="text-[10px] opacity-60">Дедлайн:</span>
                                    <span className="text-zinc-900 dark:text-zinc-300">
                                        {endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-end pt-8 border-t-2 border-zinc-50 dark:border-zinc-800">
                        {latestResult ? (
                           // canViewResults permission might not be passed explicitly in props if reusing from dashboard, defaulting to true for own results usually
                           // Assuming passed down logic or always allow seeing own details if permitted
                           <button 
                             onClick={() => setSelectedResult({result: latestResult, session})}
                             className="text-zinc-950 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-950 dark:border-zinc-200 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center gap-3 shadow-lg active:scale-95"
                           >
                             <Eye size={18} /> Детализация
                           </button>
                        ) : canStart ? (
                          <button 
                            onClick={() => onStart(session)}
                            className="bg-primary text-white px-10 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-primary-600 transition-all flex items-center gap-3 shadow-red-glow active:scale-95"
                          >
                            Начать тест <ArrowRight size={20} />
                          </button>
                        ) : (
                          <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 cursor-not-allowed border-2 border-zinc-200 dark:border-zinc-700">
                            <Lock size={18} /> {!isStarted ? 'Доступ ожидается' : 'Тест закрыт'}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedResult && (
          <ResultModal 
            result={selectedResult.result}
            session={selectedResult.session}
            ticket={tickets.find(t => t.id === selectedResult.session.ticketId)}
            user={currentUser}
            passingThreshold={passingThreshold}
            onClose={() => setSelectedResult(null)}
          />
      )}
    </div>
  );
};

export default AssessmentList;
