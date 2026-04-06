
import React, { useState, useEffect } from 'react';
import { Course, User, Ticket, AssessmentSession } from '../types';
import { ChevronLeft, CheckCircle, Download, ExternalLink, Quote, Loader, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';

interface Props {
  course: Course;
  users: User[];
  currentUser: User;
  tickets: Ticket[];
  onAcknowledge: (course: Course) => Promise<void>;
  onSessionCreated: (session: AssessmentSession) => void;
  onBack: () => void;
}

const CourseViewer: React.FC<Props> = ({ course, users, currentUser, tickets, onAcknowledge, onSessionCreated, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fullContent, setFullContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isAck = course.acknowledgedUserIds.includes(currentUser.id);

  useEffect(() => {
      const loadContent = async () => {
          setLoadError(null);
          
          // Case 1: Chunked Content (Large)
          if (course.totalChunks && course.totalChunks > 0) {
              setLoadingContent(true);
              try {
                  // Removed .orderBy('index') to prevent "Missing Index" errors on client
                  // We sort in memory instead, which is safer for this use case
                  const snapshot = await db.collection('courses').doc(course.id).collection('chunks').get();
                  
                  if (snapshot.empty) {
                      throw new Error("Файлы контента не найдены (0 chunks).");
                  }

                  const chunks = snapshot.docs.map(doc => doc.data());
                  // Sort by index locally
                  chunks.sort((a, b) => (a.index || 0) - (b.index || 0));
                  
                  let content = '';
                  chunks.forEach(c => {
                      content += (c.data || '');
                  });
                  setFullContent(content);
              } catch (e: any) {
                  console.error("Chunk load error:", e);
                  setLoadError(`Ошибка загрузки: ${e.message || 'Не удалось получить данные'}. Попробуйте обновить страницу.`);
              } finally {
                  setLoadingContent(false);
              }
          } 
          // Case 2: Legacy/Small Content (Directly in doc)
          else if (course.docxContent) {
              setFullContent(course.docxContent);
          }
          // Case 3: Only Blocks (No docx)
          else {
              setFullContent('');
          }
      };
      
      loadContent();
  }, [course]);

  const handleAcknowledge = async () => {
    setIsProcessing(true);
    try {
        const updatedCourse = { ...course, acknowledgedUserIds: [...course.acknowledgedUserIds, currentUser.id] };
        await onAcknowledge(updatedCourse);
        
        // Auto-generate session
        const now = new Date();
        const endDate = new Date(now.getTime() + course.testDurationDays * 86400000);
        
        const newSession: AssessmentSession = {
            id: `s_c_${course.id}_${currentUser.id}_${Date.now()}`,
            title: `Аттестация: ${course.title}`,
            description: `Автоматически созданная сессия после изучения курса.`,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            status: 'active',
            ticketId: course.ticketId,
            courseId: course.id,
            participants: [currentUser.id],
            targeting: { type: 'manual', specificUserIds: [currentUser.id] },
            settings: {
                timeLimitMinutes: 30,
                attempts: 1,
                randomize: true,
                scoring: true,
                showResults: 'always',
                allowPause: false
            }
        };
        
        onSessionCreated(newSession);
        alert("Материал изучен! Вам назначена аттестация со сроком прохождения " + course.testDurationDays + " дня.");
    } catch (e) { alert("Ошибка сохранения"); } finally { setIsProcessing(false); }
  };

  if (loadingContent) {
      return (
          <div className="max-w-5xl mx-auto min-h-[50vh] flex flex-col items-center justify-center space-y-4">
              <Loader size={48} className="animate-spin text-primary"/>
              <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Загрузка материала ({course.totalChunks} частей)...</p>
          </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-40">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"><ChevronLeft size={18}/> Назад к списку</button>
        
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Обучающий материал</span>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ID: {course.id.slice(-6)}</span>
            </div>
            <h1 className="text-5xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter leading-tight">{course.title}</h1>
            <p className="text-lg font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide leading-relaxed">{course.description}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border-2 dark:border-zinc-800 p-6 md:p-20 shadow-2xl space-y-12">
            
            {loadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400">
                    <AlertTriangle size={32} className="shrink-0"/>
                    <div>
                        <h4 className="font-black uppercase text-sm mb-1">Ошибка отображения контента</h4>
                        <p className="text-xs font-bold opacity-80">{loadError}</p>
                    </div>
                </div>
            )}

            {/* DOCX CONTENT RENDERING */}
            {fullContent ? (
                <div className="word-content animate-fade-in" dangerouslySetInnerHTML={{ __html: fullContent }} />
            ) : !loadError && course.totalChunks ? (
                <div className="text-center py-20 text-zinc-400 font-black uppercase tracking-widest">Контент пуст или загружается...</div>
            ) : null}

            {/* BLOCK CONTENT RENDERING (LEGACY/HYBRID) */}
            {course.blocks?.map(block => (
                <div key={block.id} className="animate-fade-in">
                    {block.type === 'heading' && <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white mb-6">{block.value}</h2>}
                    {block.type === 'text' && <p className="text-lg leading-relaxed font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{block.value}</p>}
                    {block.type === 'quote' && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border-l-8 border-primary italic">
                            <Quote size={32} className="text-primary mb-4 opacity-50"/>
                            <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{block.value}</p>
                        </div>
                    )}
                    {block.type === 'list_bullet' && (
                        <ul className="space-y-4">
                            {block.value.split('\n').map((item, i) => <li key={i} className="flex items-start gap-4 text-lg font-medium text-zinc-700 dark:text-zinc-300"><div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0"/> {item}</li>)}
                        </ul>
                    )}
                    {block.type === 'image' && (
                        <div className="rounded-[2.5rem] overflow-hidden border-4 border-zinc-100 dark:border-zinc-800 shadow-xl">
                            <img src={block.fileUrl} className="w-full h-auto" alt=""/>
                        </div>
                    )}
                    {block.type === 'video' && (
                        <div className="rounded-[2.5rem] overflow-hidden border-4 border-zinc-100 dark:border-zinc-800 shadow-xl bg-black aspect-video">
                            <video controls className="w-full h-full"><source src={block.fileUrl} type="video/mp4"/></video>
                        </div>
                    )}
                    {block.type === 'file' && (
                        <a href={block.fileUrl} download={block.fileName} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border-2 dark:border-zinc-700 hover:border-primary transition-all group">
                            <div className="flex items-center gap-4"><Download size={24} className="text-primary"/><span className="font-black uppercase text-sm dark:text-white">{block.fileName || 'Файл для скачивания'}</span></div>
                            <span className="text-[10px] font-black text-zinc-400">СКАЧАТЬ (25MB MAX)</span>
                        </a>
                    )}
                    {block.type === 'link' && (
                        <a href={block.value} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-primary font-black uppercase text-sm hover:underline"><ExternalLink size={18}/> {block.fileName || block.value}</a>
                    )}
                </div>
            ))}

            {!isAck && (
                <div className="pt-20 border-t-4 dark:border-zinc-800 flex flex-col items-center gap-8 text-center">
                    <div className="space-y-2">
                        <div className="text-sm font-black uppercase text-zinc-400 tracking-widest">Финальный этап обучения</div>
                        <p className="text-zinc-500 font-bold max-w-md">Подтверждая изучение, вы соглашаетесь с условиями прохождения аттестации в течение {course.testDurationDays} дн.</p>
                    </div>
                    <button 
                        onClick={handleAcknowledge}
                        disabled={isProcessing}
                        className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-20 py-6 rounded-[2.5rem] text-xl font-black uppercase tracking-widest shadow-2xl hover:bg-green-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isProcessing ? 'Регистрация...' : 'МАТЕРИАЛ ИЗУЧЕН'}
                    </button>
                </div>
            )}

            {isAck && (
                <div className="pt-20 border-t-4 dark:border-zinc-800 flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mb-2">
                        <CheckCircle size={48}/>
                    </div>
                    <div className="text-3xl font-black uppercase tracking-tighter text-zinc-950 dark:text-white">Ознакомление завершено</div>
                    <p className="text-zinc-500 font-bold max-w-md mx-auto">Тест по данному курсу уже назначен. Вы можете найти его в разделе «Мои Задания».</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default CourseViewer;
