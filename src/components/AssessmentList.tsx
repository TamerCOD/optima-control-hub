
import React, { useState } from 'react';
import { Clock, Lock, ArrowRight, Eye, Timer, FileQuestion, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="pb-20 space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-end border-b-2 border-surface3 pb-8 gap-6"
      >
         <div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red/10 flex items-center justify-center text-red shadow-[0_0_20px_rgba(230,57,70,0.2)]">
                    <Award size={24} />
                </div>
                <h1 className="text-5xl font-black text-text uppercase tracking-tighter leading-none font-headline">Мои Задания</h1>
            </div>
            <p className="text-muted font-black uppercase text-[11px] tracking-[0.3em] font-headline opacity-60">Персональный список актуальных тестирований и аттестаций</p>
         </div>
         <div className="bg-surface2/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-surface3 shadow-xl">
            <span className="text-text text-sm font-black uppercase tracking-[0.2em] font-headline">
                Активно: <span className="text-red ml-1">{sessions.length}</span>
            </span>
         </div>
      </motion.div>
      
      {sessions.length === 0 ? (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-32 premium-card text-center bg-surface1/30 border-dashed border-surface3"
        >
           <div className="w-20 h-20 rounded-full bg-surface2 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-muted opacity-20" />
           </div>
           <span className="text-muted font-black text-2xl uppercase tracking-[0.3em] font-headline opacity-40">Нет доступных заданий</span>
           <p className="text-muted mt-4 font-black uppercase text-[10px] tracking-widest font-headline opacity-30">Все текущие аттестации завершены или еще не назначены</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-10">
          {sessions.map((session, index) => {
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
              <motion.div 
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative premium-card bg-surface1/50 border-surface3 overflow-hidden transition-all duration-500 hover:translate-x-2 ${!canStart && !latestResult ? 'opacity-60 grayscale' : ''}`}
              >
                <div className="flex flex-col md:flex-row">
                   <div className={`w-full md:w-2 shrink-0 transition-all duration-500 group-hover:w-3 ${latestResult ? (hasPassed ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-red shadow-[0_0_20px_rgba(230,57,70,0.3)]') : canStart ? 'bg-red shadow-[0_0_20px_rgba(230,57,70,0.3)]' : 'bg-surface3'}`}></div>

                   <div className="flex-1 p-8">
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-10">
                         <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] font-headline bg-surface2 px-3 py-1 rounded-lg border border-surface3">ID: {session.id.slice(-6)}</span>
                                {latestResult ? (
                                    <span className={`px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] font-headline flex items-center gap-2 shadow-lg ${hasPassed ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red/10 text-red border border-red/20'}`}>
                                        {hasPassed ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                        {hasPassed ? 'Аттестация Пройдена' : 'Провал (Порог не достигнут)'}
                                    </span>
                                ) : (
                                    <>
                                        {!isStarted && (
                                            <span className="px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] font-headline bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-2 shadow-lg">
                                                <Timer size={14}/> Ожидание старта
                                            </span>
                                        )}
                                        {isEnded && (
                                            <span className="px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] font-headline bg-surface2 text-muted border border-surface3 flex items-center gap-2 shadow-lg">
                                                <Clock size={14}/> Срок истек
                                            </span>
                                        )}
                                        {canStart && (
                                            <span className="px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] font-headline bg-red/10 text-red border border-red/20 flex items-center gap-2 shadow-lg animate-pulse">
                                                <Award size={14}/> Доступ открыт
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <h3 className="text-3xl font-black text-text mb-4 tracking-tighter font-headline uppercase leading-tight">
                                {session.title}
                            </h3>
                            <p className="text-muted max-w-3xl leading-relaxed font-black uppercase text-[11px] tracking-widest font-headline opacity-60">
                                {session.description || "Описание аттестации отсутствует."}
                            </p>
                         </div>

                         <div className="flex flex-col items-end gap-6 min-w-[260px]">
                            {/* Stats Display for Completed Test */}
                            {latestResult ? (
                                <div className={`flex items-center gap-4 p-4 rounded-3xl border ${hasPassed ? 'bg-green-500/5 border-green-500/20 shadow-[0_10px_30px_rgba(34,197,94,0.1)]' : 'bg-red/5 border-red/20 shadow-[0_10px_30px_rgba(230,57,70,0.1)]'}`}>
                                    <div className="text-right">
                                        <div className={`text-3xl font-black leading-none font-headline ${hasPassed ? 'text-green-500' : 'text-red'}`}>
                                            {scorePercent.toFixed(0)}%
                                        </div>
                                        <div className="text-[9px] font-black text-muted uppercase tracking-[0.2em] font-headline opacity-50 mt-1">Результат</div>
                                    </div>
                                    <div className="h-10 w-px bg-surface3 mx-1"></div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black leading-none text-text font-headline">
                                            {correctCount}<span className="text-muted text-sm opacity-40">/{questionCount}</span>
                                        </div>
                                        <div className="text-[9px] font-black text-muted uppercase tracking-[0.2em] font-headline opacity-50 mt-1">Верно</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center justify-center bg-surface2/50 w-24 h-24 rounded-3xl border border-surface3 text-center shadow-lg group-hover:scale-105 transition-transform duration-500" title="Количество вопросов">
                                        <FileQuestion size={24} className="text-red mb-2" /> 
                                        <span className="text-sm font-black text-text uppercase font-headline">{questionCount}</span>
                                        <span className="text-[9px] font-black text-muted uppercase tracking-widest font-headline opacity-50">Вопросов</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-surface2/50 w-24 h-24 rounded-3xl border border-surface3 text-center shadow-lg group-hover:scale-105 transition-transform duration-500" title="Лимит времени">
                                        <Clock size={24} className="text-red mb-2" /> 
                                        <span className="text-sm font-black text-text uppercase font-headline">{session.settings.timeLimitMinutes}</span>
                                        <span className="text-[9px] font-black text-muted uppercase tracking-widest font-headline opacity-50">Минут</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col text-[10px] text-right font-black uppercase tracking-[0.2em] text-muted font-headline gap-2 opacity-60">
                                <div className={`flex items-center gap-3 justify-end ${!isStarted ? 'text-amber-500' : ''}`}>
                                    <span className="opacity-40">Старт:</span>
                                    <span className="text-text">
                                        {startDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-3 justify-end ${isEnded ? 'text-red' : ''}`}>
                                    <span className="opacity-40">Дедлайн:</span>
                                    <span className="text-text">
                                        {endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                         </div>
                      </div>

                      <div className="flex justify-end pt-8 border-t border-surface3">
                        {latestResult ? (
                           <button 
                             onClick={() => setSelectedResult({result: latestResult, session})}
                             className="text-text bg-surface2 border border-surface3 px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] font-headline hover:bg-surface3 hover:text-red transition-all flex items-center gap-3 shadow-xl active:scale-95 group/btn"
                           >
                             <Eye size={18} className="group-hover/btn:scale-110 transition-transform" /> Детализация
                           </button>
                        ) : canStart ? (
                          <button 
                            onClick={() => onStart(session)}
                            className="bg-red text-white px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] font-headline hover:bg-red/90 transition-all flex items-center gap-4 shadow-[0_15px_40px_rgba(230,57,70,0.3)] active:scale-95 group/btn"
                          >
                            Начать тест <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        ) : (
                          <div className="bg-surface2 text-muted px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] font-headline flex items-center gap-3 cursor-not-allowed border border-surface3 opacity-50">
                            <Lock size={18} /> {!isStarted ? 'Доступ ожидается' : 'Тест закрыт'}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
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
      </AnimatePresence>
    </div>
  );
};

export default AssessmentList;
