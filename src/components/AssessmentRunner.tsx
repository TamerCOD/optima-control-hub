
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle, Check, Loader2, Award } from 'lucide-react';
import { AssessmentSession, Question, QuestionType, AssessmentResult, Ticket } from '../types';

interface Props {
  session: AssessmentSession;
  tickets: Ticket[];
  userId: string;
  passingThreshold?: number;
  onComplete: (result: AssessmentResult) => Promise<void>; 
  onExit: () => void;
}

const AssessmentRunner: React.FC<Props> = ({ session, tickets, userId, passingThreshold = 70, onComplete, onExit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const answersRef = useRef<Record<string, any>>({});
  const [status, setStatus] = useState<'active' | 'calculating' | 'saving'>('active');
  const [startTime] = useState(new Date().toISOString());

  // Helper for loose-boolean check (handles string "true" and boolean true)
  const isCorrectOption = (opt: any) => opt.isCorrect === true || String(opt.isCorrect) === 'true';

  // Fisher-Yates Shuffle Algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialization & Strict Data Normalization
  useEffect(() => {
      if (!session || !tickets) return;
      
      const mins = session?.settings?.timeLimitMinutes || 30;
      setTimeLeft(mins * 60);
      
      // Find the specific ticket assigned to this session
      const ticket = tickets.find(t => String(t.id) === String(session.ticketId));
      
      if (ticket && ticket.questions) {
          console.log("Loading ticket for runner:", ticket.title);
          
          let sanitizedQs = ticket.questions.map(q => {
              // NORMALIZE TYPE: if options exist, it's a choice question, not open text
              const hasOptions = Array.isArray(q.options) && q.options.length > 0;
              let actualType = String(q.type || 'single').trim().toLowerCase();
              
              if (hasOptions && actualType === 'open') {
                  actualType = 'single';
              }

              // NORMALIZE WEIGHT: ensure it's a number and not the total question count
              const rawWeight = Number(q.weight);
              const cleanWeight = isNaN(rawWeight) || rawWeight <= 0 ? 1 : rawWeight;

              return {
                ...q,
                id: String(q.id),
                type: actualType as QuestionType,
                weight: cleanWeight,
                options: (q.options || []).map(opt => ({
                    ...opt,
                    id: String(opt.id),
                    isCorrect: isCorrectOption(opt) // Force boolean for runtime
                }))
              };
          });

          // RANDOMIZATION LOGIC
          if (session.settings.randomize) {
              sanitizedQs = shuffleArray(sanitizedQs);
          }

          setQuestions(sanitizedQs);
      } else {
          console.error("Ticket not found or empty. Session ID:", session.id, "Ticket ID:", session.ticketId);
          setError("Билет не найден или содержит ошибки. Свяжитесь с администратором.");
      }
  }, [session, tickets]);

  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    if (status !== 'active' || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { 
          clearInterval(timer); 
          finishAssessment(); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, questions.length]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAnswer = (val: any) => {
    if (status !== 'active') return;
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const qId = currentQ.id;
    const type = String(currentQ.type).toLowerCase();

    if (type === 'multiple') {
        const currentAns = answers[qId] || [];
        const newAns = currentAns.includes(String(val)) 
            ? currentAns.filter((id: string) => id !== String(val)) 
            : [...currentAns, String(val)];
        setAnswers(prev => ({ ...prev, [qId]: newAns }));
    } else {
        setAnswers(prev => ({ ...prev, [qId]: String(val) }));
    }
  };

  const finishAssessment = async () => {
      if (status !== 'active') return;
      
      try {
          setStatus('calculating');
          console.log("Finishing test. Calculating scores...");
          
          let totalScore = 0; 
          let maxScore = 0;
          
          const finalAnswers = questions.map((q, idx) => {
              const weight = Number(q.weight) || 1;
              maxScore += weight;
              
              const userAns = answersRef.current[q.id];
              const type = String(q.type).toLowerCase();
              let score = 0;

              if (type === 'single') {
                  const correctOpt = q.options?.find(o => o.isCorrect);
                  // Strict string check to ensure 1 === "1"
                  if (correctOpt && userAns && String(correctOpt.id) === String(userAns)) {
                      score = weight;
                  }
              } else if (type === 'multiple') {
                  const correctIds = q.options?.filter(o => o.isCorrect).map(o => String(o.id)) || [];
                  const userIds = Array.isArray(userAns) ? userAns.map(id => String(id)) : [];
                  
                  const isPerfect = correctIds.length > 0 && 
                                   correctIds.length === userIds.length && 
                                   correctIds.every(id => userIds.includes(id));
                  
                  if (isPerfect) score = weight;
              }

              totalScore += score;
              
              return { 
                  questionId: q.id, 
                  score: Number(score) || 0, 
                  isCorrect: score > 0, 
                  selectedOptions: Array.isArray(userAns) ? userAns.map(id => String(id)) : (userAns ? [String(userAns)] : []),
                  textAnswer: type === 'open' ? String(userAns || "") : ""
              };
          });

          const finalMaxScore = maxScore > 0 ? maxScore : 1;
          const scorePercentage = (totalScore / finalMaxScore) * 100;
          
          console.log(`Calculation results: Total Score: ${totalScore}, Max Score: ${maxScore}, Pct: ${scorePercentage}%`);

          const result: AssessmentResult = {
              id: `res-${Date.now()}`, 
              sessionId: session.id, 
              courseId: session.courseId || undefined,
              userId, 
              attemptNumber: 1, 
              startedAt: startTime, 
              completedAt: new Date().toISOString(),
              answers: finalAnswers, 
              totalScore: Number(totalScore.toFixed(1)), 
              maxScore: Number(finalMaxScore.toFixed(1)), 
              passed: Math.round(scorePercentage * 100) / 100 >= passingThreshold, 
              status: 'completed'
          };
          
          setStatus('saving');
          await onComplete(result);

      } catch (err: any) {
          console.error("Critical error in assessment calculation:", err);
          alert("Произошла ошибка при подсчете результатов. Пожалуйста, обратитесь в поддержку. " + err.message);
          setStatus('active');
      }
  };

  const currentQuestion = questions[currentQuestionIndex];
  
  if (error || !currentQuestion) {
      return (
        <div className="min-h-full flex items-center justify-center p-6 bg-transparent font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="premium-card p-12 text-center max-w-lg border-surface3 bg-surface1/50 backdrop-blur-xl shadow-2xl"
            >
                <div className="w-24 h-24 bg-red/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-red shadow-lg">
                    <AlertCircle size={48} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest text-text mb-4 font-headline">Ошибка загрузки</h3>
                <p className="font-bold text-muted mb-10 leading-relaxed">{error || "Вопросы не найдены"}</p>
                <button 
                    onClick={onExit} 
                    className="w-full py-5 bg-red text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] font-headline hover:bg-red/90 transition-all shadow-[0_15px_30px_rgba(230,57,70,0.3)] active:scale-95"
                >
                    Вернуться назад
                </button>
            </motion.div>
        </div>
      );
  }
  
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const qType = String(currentQuestion.type || 'single').trim().toLowerCase();
  const hasOptions = Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isProcessing = status === 'calculating' || status === 'saving';

  return (
    <div className="min-h-full bg-transparent py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
        >
            <div className="flex justify-between items-center premium-card p-4 sticky top-4 z-20 bg-surface1/80 backdrop-blur-2xl border-surface3 shadow-2xl">
               <div className="min-w-0 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-red/10 flex items-center justify-center text-red shadow-lg shrink-0">
                        <Award size={24} />
                   </div>
                   <div>
                       <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.3em] font-headline opacity-50 mb-1">Аттестация специалиста</h2>
                       <h1 className="text-xl font-black text-text leading-none truncate font-headline uppercase tracking-tight">{session.title}</h1>
                   </div>
               </div>
               <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-mono text-2xl font-black shadow-inner transition-all duration-500 border ${timeLeft < 60 ? 'bg-red/10 text-red border-red/20 shadow-[0_0_20px_rgba(230,57,70,0.2)]' : 'bg-surface2 text-text border-surface3'}`}>
                   <Clock size={22} className={timeLeft < 60 ? 'animate-pulse' : 'opacity-50'} />
                   {formatTime(timeLeft)}
               </div>
            </div>

            <div className="premium-card p-4 overflow-x-auto no-print bg-surface1/30 border-surface3">
                <div className="flex flex-wrap gap-3 justify-center">
                    {questions.map((q, idx) => {
                        const userVal = answers[q.id];
                        const isAnswered = userVal !== undefined && userVal !== '' && (!Array.isArray(userVal) || userVal.length > 0);
                        const isCurrent = idx === currentQuestionIndex;
                        return (
                            <button
                              key={q.id}
                              disabled={isProcessing}
                              onClick={() => setCurrentQuestionIndex(idx)}
                              className={`w-12 h-12 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center border-2 
                                  ${isCurrent 
                                      ? 'bg-red text-white border-red scale-110 shadow-[0_10px_20px_rgba(230,57,70,0.3)]' 
                                      : isAnswered 
                                          ? 'bg-surface3 border-surface3 text-text shadow-md' 
                                          : 'bg-surface1 border-surface3 text-muted hover:border-red/50 hover:text-red'}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>
        </motion.div>

        <motion.div 
            key={currentQuestionIndex}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="premium-card overflow-hidden relative border-surface3 shadow-2xl bg-surface1/50 backdrop-blur-sm"
        >
           <div className="h-2 w-full bg-surface2">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="h-full bg-red shadow-[0_0_15px_rgba(230,57,70,0.5)]"
               />
           </div>

           <div className="p-8 md:p-16">
               <div className="flex flex-wrap items-center gap-6 mb-12">
                   <span className="bg-red text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] font-headline shadow-lg">
                      Вопрос {currentQuestionIndex + 1} из {questions.length}
                   </span>
                   <div className="h-6 w-px bg-surface3 hidden sm:block"></div>
                   <div className="ml-auto flex items-center gap-6">
                       <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] font-headline opacity-60">
                           Вес: <span className="text-red">{currentQuestion.weight} б.</span>
                       </span>
                       <span className="text-[10px] font-black text-red uppercase tracking-[0.2em] font-headline px-4 py-2 rounded-xl bg-red/10 border border-red/20 shadow-sm">
                          {qType === 'single' ? 'Один правильный ответ' : qType === 'multiple' ? 'Множественный выбор' : 'Развернутый текстовый ответ'}
                       </span>
                   </div>
               </div>

               <h3 className="text-3xl md:text-4xl font-black text-text mb-12 leading-tight tracking-tighter font-headline uppercase">
                    {currentQuestion.text}
               </h3>

               {currentQuestion.media && (
                   <div className="mb-12 rounded-3xl overflow-hidden premium-card border-surface3 group shadow-2xl">
                       <img src={currentQuestion.media.url} className="w-full max-h-[500px] object-contain mx-auto group-hover:scale-[1.02] transition-transform duration-700" alt="Media" />
                   </div>
               )}

               <div className="space-y-4">
                   {hasOptions ? (
                       <div className="grid gap-4">
                          {currentQuestion.options.map(opt => {
                                  const ansVal = answers[currentQuestion.id];
                                  const isSelected = qType === 'multiple' 
                                      ? (Array.isArray(ansVal) ? ansVal.includes(opt.id) : false)
                                      : String(ansVal) === String(opt.id);
                                  
                                  return (
                                      <label key={opt.id} className={`flex items-center gap-6 p-6 rounded-3xl border-2 cursor-pointer transition-all duration-500 group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? 'border-red bg-red/5 shadow-[0_15px_30px_rgba(230,57,70,0.1)] scale-[1.01]' : 'border-surface3 bg-surface2/30 hover:border-red/30 hover:bg-surface2'}`}>
                                          <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-500 shrink-0 ${isSelected ? 'bg-red border-red shadow-lg scale-110' : 'border-surface3 group-hover:border-red/50'}`}>
                                              {isSelected && (qType === 'multiple' ? <Check size={20} className="text-white"/> : <div className="w-2.5 h-2.5 bg-white rounded-full"></div>)}
                                          </div>
                                          <span className={`text-xl font-black font-headline uppercase tracking-tight ${isSelected ? 'text-text' : 'text-muted group-hover:text-text'}`}>{opt.text}</span>
                                          <input 
                                              type={qType === 'multiple' ? "checkbox" : "radio"} 
                                              className="hidden" 
                                              disabled={isProcessing}
                                              onChange={() => handleAnswer(opt.id)} 
                                              checked={isSelected} 
                                          />
                                      </label>
                                  );
                              })
                          }
                       </div>
                   ) : (
                       <div className="relative group">
                           <textarea 
                               disabled={isProcessing}
                               value={answers[currentQuestion.id] || ''}
                               onChange={e => handleAnswer(e.target.value)}
                               className="w-full h-64 p-8 premium-card bg-surface2/50 border-surface3 text-xl font-bold text-text focus:border-red focus:ring-1 focus:ring-red/20 transition-all outline-none resize-none font-headline"
                               placeholder="Ваш развернутый ответ..."
                           />
                       </div>
                   )}
               </div>
           </div>

           <div className="p-6 md:p-10 flex flex-col sm:flex-row justify-between items-center gap-6 bg-surface2/30 border-t border-surface3">
               <button 
                  onClick={() => setCurrentQuestionIndex(p => Math.max(0, p-1))} 
                  disabled={currentQuestionIndex===0 || isProcessing} 
                  className="w-full sm:w-auto px-10 py-5 premium-card bg-surface2 border-surface3 font-black text-[11px] uppercase tracking-[0.2em] font-headline text-muted disabled:opacity-20 flex items-center justify-center gap-3 hover:bg-surface3 hover:text-text transition-all active:scale-95"
               >
                   <ChevronLeft size={18}/> Назад
               </button>
               
               <button 
                  disabled={isProcessing}
                  onClick={() => { 
                    if (!isLastQuestion) {
                      setCurrentQuestionIndex(p => p + 1);
                    } else {
                      setStatus('calculating');
                      setTimeout(() => finishAssessment(), 300);
                    }
                  }} 
                  className={`w-full sm:w-auto px-12 py-5 premium-card font-black text-[11px] uppercase tracking-[0.3em] font-headline flex items-center justify-center gap-3 group transition-all active:scale-95 shadow-2xl ${isProcessing ? 'opacity-50 cursor-not-allowed bg-surface3 text-muted' : 'bg-red text-white border-red shadow-[0_15px_40px_rgba(230,57,70,0.3)] hover:bg-red/90'}`}
               >
                   {isProcessing ? (
                     <>Обработка... <Loader2 size={20} className="animate-spin" /></>
                   ) : (
                     <>
                        {isLastQuestion ? 'Завершить тест' : 'Следующий вопрос'} 
                        {isLastQuestion ? <CheckCircle size={20}/> : <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                     </>
                   )}
               </button>
           </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AssessmentRunner;
