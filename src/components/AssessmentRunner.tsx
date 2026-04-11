
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, ChevronLeft, CheckCircle, Clock, AlertCircle, Check, Loader2 } from 'lucide-react';
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
  if (!currentQuestion) {
      if (error) return (
        <div className="min-h-full flex items-center justify-center p-3 bg-zinc-50 dark:bg-black font-sans">
            <div className="clay-panel p-6 text-center max-w-lg">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
                    <AlertCircle size={48} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-zinc-950 dark:text-white mb-4">Ошибка загрузки</h3>
                <p className="font-bold text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">{error}</p>
                <button onClick={onExit} className="w-full py-4 clay-btn-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl">Вернуться назад</button>
            </div>
        </div>
      );
      return null;
  }
  
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const qType = String(currentQuestion.type || 'single').trim().toLowerCase();
  const hasOptions = Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isProcessing = status === 'calculating' || status === 'saving';

  return (
    <div className="min-h-full bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4"
        >
            <div className="flex justify-between items-center clay-panel p-3 sticky top-4 z-20">
               <div className="min-w-0">
                   <h2 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Аттестация специалиста</h2>
                   <h1 className="text-xl font-black text-zinc-950 dark:text-white leading-none truncate">{session.title}</h1>
               </div>
               <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-mono text-xl font-black shadow-inner transition-colors ${timeLeft < 60 ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30 dark:border-red-900/50' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700'}`}>
                   <Clock size={20} className={timeLeft < 60 ? 'animate-pulse' : ''} />
                   {formatTime(timeLeft)}
               </div>
            </div>

            <div className="clay-panel p-3 overflow-x-auto no-print">
                <div className="flex flex-wrap gap-2 justify-center">
                    {questions.map((q, idx) => {
                        const userVal = answers[q.id];
                        const isAnswered = userVal !== undefined && userVal !== '' && (!Array.isArray(userVal) || userVal.length > 0);
                        const isCurrent = idx === currentQuestionIndex;
                        return (
                            <button
                              key={q.id}
                              disabled={isProcessing}
                              onClick={() => setCurrentQuestionIndex(idx)}
                              className={`w-10 h-10 rounded-lg text-xs font-black transition-all flex items-center justify-center border-2 
                                  ${isCurrent 
                                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white scale-110 shadow-lg' 
                                      : isAnswered 
                                          ? 'bg-zinc-200 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 text-zinc-900 dark:text-zinc-200' 
                                          : 'bg-white border-zinc-100 dark:bg-zinc-950 dark:border-zinc-800 text-zinc-400 hover:border-zinc-300'}`}
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="clay-panel overflow-hidden relative"
        >
           <div className="h-1.5 w-full bg-zinc-50 dark:bg-zinc-950">
               <div className="h-full bg-primary transition-all duration-700 ease-out" style={{width: `${progress}%`}}></div>
           </div>

           <div className="p-4 md:p-12">
               <div className="flex flex-wrap items-center gap-4 mb-8">
                   <span className="clay-btn-primary text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      Вопрос {currentQuestionIndex + 1} из {questions.length}
                   </span>
                   <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>
                   <div className="ml-auto flex items-center gap-4">
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                           Вес: <span className="text-primary">{currentQuestion.weight} б.</span>
                       </span>
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1 rounded-lg bg-primary/5 border border-primary/10">
                          {qType === 'single' ? 'Один правильный ответ' : qType === 'multiple' ? 'Множественный выбор' : 'Развернутый текстовый ответ'}
                       </span>
                   </div>
               </div>

               <h3 className="text-2xl md:text-3xl font-black text-zinc-950 dark:text-white mb-10 leading-tight tracking-tight">
                    {currentQuestion.text}
               </h3>

               {currentQuestion.media && (
                   <div className="mb-10 rounded-3xl overflow-hidden clay-panel group">
                       <img src={currentQuestion.media.url} className="w-full max-h-[400px] object-contain mx-auto" alt="Media" />
                   </div>
               )}

               <div className="space-y-3">
                   {hasOptions ? (
                       <div className="grid gap-3">
                          {currentQuestion.options.map(opt => {
                                  const ansVal = answers[currentQuestion.id];
                                  const isSelected = qType === 'multiple' 
                                      ? (Array.isArray(ansVal) ? ansVal.includes(opt.id) : false)
                                      : String(ansVal) === String(opt.id);
                                  
                                  return (
                                      <label key={opt.id} className={`flex items-center gap-5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg scale-[1.01]' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-zinc-200 dark:border-zinc-700 group-hover:border-zinc-400'}`}>
                                              {isSelected && (qType === 'multiple' ? <Check size={16} className="text-white"/> : <div className="w-2 h-2 bg-white rounded-full"></div>)}
                                          </div>
                                          <span className={`text-lg font-bold ${isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>{opt.text}</span>
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
                              className="w-full h-48 p-3 clay-input text-lg font-medium dark:text-white"
                              placeholder="Ваш развернутый ответ..."
                           />
                       </div>
                   )}
               </div>
           </div>

           <div className="p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
               <button 
                  onClick={() => setCurrentQuestionIndex(p => Math.max(0, p-1))} 
                  disabled={currentQuestionIndex===0 || isProcessing} 
                  className="w-full sm:w-auto px-8 py-4 clay-btn font-black text-[10px] uppercase tracking-widest text-zinc-500 disabled:opacity-20 flex items-center justify-center gap-2"
               >
                   <ChevronLeft size={16}/> Назад
               </button>
               
               <button 
                  disabled={isProcessing}
                  onClick={() => { 
                    if (!isLastQuestion) {
                      setCurrentQuestionIndex(p => p + 1);
                    } else {
                      // Custom UI transition instead of confirm()
                      setStatus('calculating');
                      setTimeout(() => finishAssessment(), 300);
                    }
                  }} 
                  className={`w-full sm:w-auto px-10 py-4 clay-btn font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 group ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'clay-btn-primary'}`}
               >
                   {isProcessing ? (
                     <>Обработка... <Loader2 size={18} className="animate-spin" /></>
                   ) : (
                     <>
                        {isLastQuestion ? 'Завершить тест' : 'Следующий вопрос'} 
                        {isLastQuestion ? <CheckCircle size={18}/> : <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
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
