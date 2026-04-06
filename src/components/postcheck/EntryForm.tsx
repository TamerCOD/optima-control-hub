import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { PostCheckEntry, PostCheckConfig, User, PostCheckLicensedActivity } from '../../types';
import { Loader2, Save, X, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

interface Props {
    user: User;
    initialData?: PostCheckEntry;
    onClose: () => void;
    onEntryAdded: () => void;
}

const EntryForm: React.FC<Props> = ({ user, initialData, onClose, onEntryAdded }) => {
    const [formData, setFormData] = useState({
        inn: initialData?.inn || '',
        fullName: initialData?.fullName || '',
        okpo: initialData?.okpo || '',
        gked: initialData?.gked || '',
        isOkpoCorrect: initialData?.isOkpoCorrect ?? null as boolean | null,
        isGkedCorrect: initialData?.isGkedCorrect ?? null as boolean | null,
        isApproved: initialData?.isApproved ?? null as boolean | null,
        rejectionReason: initialData?.rejectionReason || '',
        hasLicense: initialData?.hasLicense ?? null as boolean | null
    });

    const [startTime, setStartTime] = useState<Date | null>(initialData ? new Date(initialData.startTime) : null);
    const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
    const [licensedActivities, setLicensedActivities] = useState<PostCheckLicensedActivity[]>([]);
    const [rejectedCount, setRejectedCount] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [showToast, setShowToast] = useState(false);

    // Load settings
    useEffect(() => {
        db.collection('settings').doc('post_check').get().then(doc => {
            if (doc.exists) {
                const data = doc.data() as PostCheckConfig;
                setRejectionReasons(data.rejectionReasons || []);
                setLicensedActivities(data.licensedActivities || []);
            }
            setLoadingReasons(false);
        });
    }, []);

    // Fetch rejected count when INN changes
    useEffect(() => {
        if (formData.inn.length >= 10) {
            const fetchCount = async () => {
                const snap = await db.collection('post_check_entries')
                    .where('inn', '==', formData.inn)
                    .where('isApproved', '==', false)
                    .get();
                setRejectedCount(snap.size);
            };
            const timer = setTimeout(fetchCount, 500);
            return () => clearTimeout(timer);
        } else {
            setRejectedCount(null);
        }
    }, [formData.inn]);

    const handleInputChange = (field: string, value: any) => {
        if (!startTime && !initialData) setStartTime(new Date());
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!startTime) return;
        
        // Validation
        if (!formData.inn || !formData.fullName) {
            alert('ИНН и ФИО обязательны для заполнения');
            return;
        }
        if (formData.isApproved === null) {
            alert('Выберите решение (Одобрено/Отклонено)');
            return;
        }
        if (formData.isApproved === false && !formData.rejectionReason) {
            alert('Укажите причину отказа');
            return;
        }

        const isLicensedActivity = licensedActivities.some(a => a.code === formData.gked);

        if (isLicensedActivity && formData.hasLicense === null) {
            alert('Укажите наличие лицензии для данного вида деятельности');
            return;
        }

        setIsSubmitting(true);
        const endTime = new Date();
        const timeSpent = initialData ? initialData.timeSpentSeconds : Math.round((endTime.getTime() - startTime.getTime()) / 1000);

        const entryId = initialData?.id || `pc_${Date.now()}`;
        const newEntry: PostCheckEntry = {
            id: entryId,
            inn: formData.inn,
            fullName: formData.fullName,
            okpo: formData.okpo,
            gked: formData.gked,
            isOkpoCorrect: formData.isOkpoCorrect ?? false, // Default to false if skipped
            isGkedCorrect: formData.isGkedCorrect ?? false, // Default to false if skipped
            isApproved: formData.isApproved,
            rejectionReason: formData.isApproved ? null : (formData.rejectionReason || null),
            hasLicense: isLicensedActivity ? formData.hasLicense : null,
            isLicensedActivity: isLicensedActivity,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            timeSpentSeconds: timeSpent,
            userId: initialData?.userId || user.id,
            userName: initialData?.userName || user.name,
            createdAt: initialData?.createdAt || new Date().toISOString()
        };

        try {
            await db.collection('post_check_entries').doc(newEntry.id).set(newEntry);
            onEntryAdded();
            
            if (!initialData) {
                // Reset form but keep open for new entry
                setFormData({
                    inn: '',
                    fullName: '',
                    okpo: '',
                    gked: '',
                    isOkpoCorrect: null,
                    isGkedCorrect: null,
                    isApproved: null,
                    rejectionReason: '',
                    hasLicense: null
                });
                setStartTime(null);
                setRejectedCount(null);
                
                // Show toast
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
            } else {
                onClose(); // Close if editing
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка при сохранении');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingReasons) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="glass-panel rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] w-full max-w-3xl mx-auto overflow-hidden relative">
            {showToast && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-emerald-500/90 backdrop-blur-md text-white px-8 py-3 rounded-2xl shadow-lg z-50 flex items-center gap-3 animate-fade-in-down border border-emerald-400/50">
                    <CheckCircle2 size={20} />
                    <span className="font-bold text-sm tracking-wide">Данные успешно записаны!</span>
                </div>
            )}

            <div className="p-3 md:p-3 border-b border-white/20 dark:border-zinc-700/30 flex justify-between items-center bg-white/30 dark:bg-zinc-800/30 backdrop-blur-md">
                <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white">{initialData ? 'Редактирование' : 'Новая запись'}</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all shadow-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"><X size={20} /></button>
            </div>
            
            <div className="p-3 md:p-3 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {/* Compact Grid */}
                <div className="grid grid-cols-12 gap-6">
                    {/* INN - 4 cols */}
                    <div className="col-span-12 md:col-span-4">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">ИНН *</label>
                        <input 
                            value={formData.inn}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                                handleInputChange('inn', val);
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-mono text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-sm dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                            placeholder="14 цифр"
                        />
                        {rejectedCount !== null && (
                            <div className="mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1.5 animate-fade-in ml-2">
                                <AlertCircle size={12} /> Отказов: {rejectedCount}
                            </div>
                        )}
                    </div>

                    {/* FIO - 8 cols */}
                    <div className="col-span-12 md:col-span-8">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">ФИО Клиента *</label>
                        <input 
                            value={formData.fullName}
                            onChange={e => handleInputChange('fullName', e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-sm dark:text-white font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                            placeholder="Иванов Иван Иванович"
                        />
                    </div>

                    {/* OKPO - 3 cols */}
                    <div className="col-span-6 md:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">ОКПО</label>
                        <input 
                            value={formData.okpo}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                                handleInputChange('okpo', val);
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-mono text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-sm dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                            placeholder="8 цифр"
                        />
                    </div>

                    {/* OKPO Check - 3 cols */}
                    <div className="col-span-6 md:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">ОКПО Верно?</label>
                        <div className="flex gap-2">
                            <button onClick={() => handleInputChange('isOkpoCorrect', true)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${formData.isOkpoCorrect === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}>Да</button>
                            <button onClick={() => handleInputChange('isOkpoCorrect', false)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${formData.isOkpoCorrect === false ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}>Нет</button>
                        </div>
                    </div>

                    {/* GKED - 3 cols */}
                    <div className="col-span-6 md:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">ГКЭД</label>
                        <input 
                            value={formData.gked}
                            onChange={e => {
                                const val = e.target.value.replace(/[^0-9.]/g, '').slice(0, 10);
                                handleInputChange('gked', val);
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-mono text-sm focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all shadow-sm dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                            placeholder="5 цифр"
                        />
                    </div>

                    {/* GKED Check - 3 cols */}
                    <div className="col-span-6 md:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">ГКЭД Верно?</label>
                        <div className="flex gap-2">
                            <button onClick={() => handleInputChange('isGkedCorrect', true)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${formData.isGkedCorrect === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}>Да</button>
                            <button onClick={() => handleInputChange('isGkedCorrect', false)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${formData.isGkedCorrect === false ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}>Нет</button>
                        </div>
                    </div>
                </div>

                {licensedActivities.some(a => a.code === formData.gked) && (
                    <div className="animate-fade-in bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 shadow-inner">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">Лицензируемая деятельность</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                    {licensedActivities.find(a => a.code === formData.gked)?.description}
                                </p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 ml-2">Наличие лицензии *</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleInputChange('hasLicense', true)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${formData.hasLicense === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}
                                >Есть</button>
                                <button 
                                    onClick={() => handleInputChange('hasLicense', false)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${formData.hasLicense === false ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}
                                >Нет</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-px bg-white/20 dark:bg-zinc-700/30 my-6"></div>

                {/* Decision & Reason */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-2">Решение *</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleInputChange('isApproved', true)}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2 ${formData.isApproved === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}
                            >Одобрено</button>
                            <button 
                                onClick={() => handleInputChange('isApproved', false)}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2 ${formData.isApproved === false ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm'}`}
                            >Отклонено</button>
                        </div>
                    </div>

                    {formData.isApproved === false && (
                        <div className="animate-fade-in">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2 ml-2">Причина отказа *</label>
                            <select 
                                value={formData.rejectionReason}
                                onChange={e => handleInputChange('rejectionReason', e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-red-800 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all text-red-700 dark:text-red-300 text-sm font-medium shadow-sm"
                            >
                                <option value="">Выберите причину...</option>
                                {rejectionReasons.map((r, i) => (
                                    <option key={i} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between bg-white/30 dark:bg-zinc-900/30 p-3 rounded-2xl text-[10px] font-mono text-zinc-400 mt-auto border border-white/20 dark:border-zinc-700/30 shadow-inner">
                    <div className="font-medium">User: <span className="text-zinc-700 dark:text-zinc-300 font-bold">{user.name}</span></div>
                    <div className="font-medium">Start: <span className="text-zinc-700 dark:text-zinc-300 font-bold">{startTime ? startTime.toLocaleTimeString() : '--:--:--'}</span></div>
                </div>
            </div>

            <div className="p-3 md:p-3 border-t border-white/20 dark:border-zinc-700/30 bg-white/30 dark:bg-zinc-800/30 backdrop-blur-md flex justify-end gap-4">
                <button onClick={onClose} className="px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-all shadow-sm">Закрыть</button>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="px-10 py-3 bg-primary hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md flex items-center gap-3"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {initialData ? 'Сохранить' : 'Отправить'}
                </button>
            </div>
        </div>
    );
};

export default EntryForm;
