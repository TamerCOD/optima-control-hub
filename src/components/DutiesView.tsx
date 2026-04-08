import React, { useState, useEffect } from 'react';
import { User, RoleDefinition, DutyType, DutyAssignment, DutySettings } from '../types';
import { db } from '../firebase';
import { Calendar as CalendarIcon, Settings, ChevronLeft, ChevronRight, Search, Plus, Trash2, RefreshCw, Send, Save, X, User as UserIcon, Check, CalendarOff } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
    currentUser: User;
    roles: RoleDefinition[];
}

const DEFAULT_DUTY_TYPES: DutyType[] = [
    { id: 'PC', name: 'Пост контроль' },
    { id: 'PM', name: 'Мониторинг платежей' },
    { id: 'FIL', name: 'Группа СДБО' },
    { id: 'CC', name: 'Группа КЦ' },
    { id: 'SLS', name: 'Группа Sales' },
    { id: 'COL', name: 'Группы коллабо' },
];

const DutiesView: React.FC<Props> = ({ currentUser, roles }) => {
    const [activeTab, setActiveTab] = useState<'CALENDAR' | 'SETTINGS'>('CALENDAR');
    const [baseMonth, setBaseMonth] = useState(new Date());
    const [settings, setSettings] = useState<DutySettings | null>(null);
    const [duties, setDuties] = useState<DutyAssignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [editingDuty, setEditingDuty] = useState<DutyAssignment | null>(null);
    const [dutyForm, setDutyForm] = useState({ userId: '', dutyTypeId: '' });

    // Settings state
    const [editSettings, setEditSettings] = useState<DutySettings | null>(null);
    const [userSearch, setUserSearch] = useState('');

    // Day Off state
    const [isDayOffModalOpen, setIsDayOffModalOpen] = useState(false);
    const [dayOffForm, setDayOffForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), userId: 'ALL' });

    const hasPermission = (permId: string) => {
        if (currentUser.roles.includes('admin')) return true;
        if (currentUser.permissionIds?.includes(permId)) return true;
        return currentUser.roles.some(rId => {
            const roleDef = roles.find(rd => rd.id === rId);
            return roleDef?.permissionIds.includes(permId);
        });
    };
    
    const canManage = hasPermission('duties_manage');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const settingsDoc = await db.collection('settings').doc('duties').get();
            let currentSettings: DutySettings;
            if (settingsDoc.exists) {
                currentSettings = settingsDoc.data() as DutySettings;
            } else {
                currentSettings = {
                    types: DEFAULT_DUTY_TYPES,
                    participatingUserIds: [],
                    notificationTime: '08:00'
                };
                await db.collection('settings').doc('duties').set(currentSettings);
            }
            setSettings(currentSettings);

            const usersSnapshot = await db.collection('users').where('isDeleted', '==', false).get();
            const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);

            const dutiesSnapshot = await db.collection('duties').get();
            const dutiesData = dutiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DutyAssignment));
            setDuties(dutiesData);
        } catch (error) {
            console.error("Error fetching duties data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSchedule = async (targetMonth: Date) => {
        if (!settings || settings.participatingUserIds.length === 0 || settings.types.length === 0) {
            alert("Настройте типы дежурств и выберите участников в настройках.");
            return;
        }

        if (!window.confirm(`Сгенерировать график на ${format(targetMonth, 'LLLL yyyy', { locale: ru })}? Существующие дежурства в этом месяце будут перезаписаны.`)) {
            return;
        }

        const today = new Date();
        let start = startOfMonth(targetMonth);
        if (isSameMonth(targetMonth, today)) {
            start = today;
        }
        const end = endOfMonth(targetMonth);
        const days = eachDayOfInterval({ start, end });
        
        const newDuties: DutyAssignment[] = [];
        
        // Keep track of the last assigned user index for each duty type to distribute evenly
        const lastAssignedIndex: Record<string, number> = {};
        
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        const existingForMonth = duties.filter(d => {
            if (!d.date.startsWith(format(targetMonth, 'yyyy-MM'))) return false;
            return d.date >= startStr && d.date <= endStr;
        });
        const daysOff = existingForMonth.filter(d => d.dutyTypeId === 'DAY_OFF');

        // Distribute each duty type across all days
        settings.types.forEach(dutyType => {
            const eligibleUserIds = dutyType.allowedUserIds && dutyType.allowedUserIds.length > 0
                ? settings.participatingUserIds.filter(id => dutyType.allowedUserIds!.includes(id))
                : settings.participatingUserIds;

            if (eligibleUserIds.length === 0) return;

            let currentIndex = lastAssignedIndex[dutyType.id] !== undefined ? lastAssignedIndex[dutyType.id] + 1 : 0;

            days.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                
                const userId = eligibleUserIds[currentIndex % eligibleUserIds.length];
                
                newDuties.push({
                    id: `${dateStr}_${dutyType.id}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    date: dateStr,
                    userId,
                    dutyTypeId: dutyType.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                
                currentIndex++;
            });
            
            lastAssignedIndex[dutyType.id] = currentIndex - 1;
        });

        try {
            const batch = db.batch();
            
            existingForMonth.forEach(d => {
                if (d.dutyTypeId !== 'DAY_OFF') {
                    batch.delete(db.collection('duties').doc(d.id));
                }
            });
            
            newDuties.forEach(d => {
                const docRef = db.collection('duties').doc(d.id);
                batch.set(docRef, d);
            });
            
            await batch.commit();
            
            setDuties(prev => [
                ...prev.filter(d => {
                    if (d.dutyTypeId === 'DAY_OFF') return true;
                    if (!d.date.startsWith(format(targetMonth, 'yyyy-MM'))) return true;
                    return d.date < startStr || d.date > endStr;
                }),
                ...newDuties
            ]);
            
            alert("График успешно сгенерирован!");
        } catch (error) {
            console.error("Error generating schedule:", error);
            alert("Ошибка при генерации графика");
        }
    };

    const handleClearDuties = async (targetMonth: Date) => {
        const monthStr = format(targetMonth, 'yyyy-MM');
        const dutiesToDelete = duties.filter(d => d.date.startsWith(monthStr));
        
        if (dutiesToDelete.length === 0) {
            alert("В этом месяце нет задач для удаления.");
            return;
        }

        if (!window.confirm(`Вы уверены, что хотите удалить ВСЕ задачи на ${format(targetMonth, 'LLLL yyyy', { locale: ru })}?`)) {
            return;
        }

        try {
            const batch = db.batch();
            dutiesToDelete.forEach(d => {
                batch.delete(db.collection('duties').doc(d.id));
            });
            await batch.commit();
            
            setDuties(prev => prev.filter(d => !d.date.startsWith(monthStr)));
            alert("Задачи успешно удалены!");
        } catch (error) {
            console.error("Error clearing duties:", error);
            alert("Ошибка при удалении задач");
        }
    };

    const handleSendReport = async () => {
        if (!settings?.telegramBotToken || !settings?.telegramChatId) {
            alert("Не настроен токен бота или ID чата в настройках.");
            return;
        }

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayDuties = duties.filter(d => d.date === todayStr);
        
        if (todayDuties.length === 0) {
            alert("На сегодня нет дежурств.");
            return;
        }

        const formattedDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
        let message = `🔔 <b>Дежурства на сегодня</b>\n🗓 <i>${formattedDate}</i>\n\n`;
        
        settings.types.forEach(type => {
            const typeDuties = todayDuties.filter(d => d.dutyTypeId === type.id);
            if (typeDuties.length > 0) {
                message += `<b>${type.name}</b>\n`;
                typeDuties.forEach(duty => {
                    const user = users.find(u => u.id === duty.userId);
                    const userName = user ? user.name : 'Неизвестный';
                    const tgUser = user?.telegramUsername ? ` <a href="https://t.me/${user.telegramUsername.replace('@', '')}">@${user.telegramUsername.replace('@', '')}</a>` : '';
                    message += `👤 ${userName}${tgUser}\n`;
                });
                message += `\n`;
            }
        });
        
        message += `<i>Желаем продуктивного дня!</i> 🚀`;

        try {
            const token = settings.telegramBotToken.trim();
            const chatId = settings.telegramChatId.trim();
            const payload: any = {
                botToken: token,
                chatId: chatId,
                text: message,
                parseMode: 'HTML',
            };
            if (settings.telegramThreadId) {
                payload.messageThreadId = settings.telegramThreadId.trim();
            }

            const response = await fetch('/api/telegram/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Telegram API error: ${response.status} ${errData.details || errData.error}`);
            }
            alert("Уведомление успешно отправлено!");
        } catch (error) {
            console.error("Error sending telegram message:", error);
            alert(`Ошибка при отправке уведомления в Telegram: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    };

    const handleSaveDuty = async () => {
        if (!dutyForm.userId || !dutyForm.dutyTypeId) {
            alert("Выберите сотрудника и тип дежурства");
            return;
        }

        try {
            if (editingDuty) {
                const updatedDuty = {
                    ...editingDuty,
                    ...dutyForm,
                    updatedAt: new Date().toISOString()
                };
                await db.collection('duties').doc(editingDuty.id).update(updatedDuty);
                setDuties(prev => prev.map(d => d.id === editingDuty.id ? updatedDuty : d));
            } else {
                const newDuty: DutyAssignment = {
                    id: `duty_${Date.now()}`,
                    date: selectedDate,
                    userId: dutyForm.userId,
                    dutyTypeId: dutyForm.dutyTypeId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await db.collection('duties').doc(newDuty.id).set(newDuty);
                setDuties(prev => [...prev, newDuty]);
            }
            setIsDutyModalOpen(false);
        } catch (error) {
            console.error("Error saving duty:", error);
            alert("Ошибка при сохранении");
        }
    };

    const handleDeleteDuty = async (id: string) => {
        if (!window.confirm("Удалить дежурство?")) return;
        try {
            await db.collection('duties').doc(id).delete();
            setDuties(prev => prev.filter(d => d.id !== id));
            setIsDutyModalOpen(false);
        } catch (error) {
            console.error("Error deleting duty:", error);
            alert("Ошибка при удалении");
        }
    };

    const handleSaveSettings = async () => {
        if (!editSettings) return;
        try {
            await db.collection('settings').doc('duties').set(editSettings);
            setSettings(editSettings);
            setActiveTab('CALENDAR');
            alert("Настройки сохранены");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Ошибка при сохранении настроек");
        }
    };

    const handleSaveDayOff = async () => {
        if (!dayOffForm.date) {
            alert("Выберите дату");
            return;
        }

        try {
            const batch = db.batch();
            const newDuties: DutyAssignment[] = [];
            
            if (dayOffForm.userId === 'ALL') {
                settings?.participatingUserIds.forEach(userId => {
                    const id = `${dayOffForm.date}_DAY_OFF_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const newDuty: DutyAssignment = {
                        id,
                        date: dayOffForm.date,
                        userId,
                        dutyTypeId: 'DAY_OFF',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    newDuties.push(newDuty);
                    batch.set(db.collection('duties').doc(id), newDuty);
                });
            } else {
                const id = `${dayOffForm.date}_DAY_OFF_${dayOffForm.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newDuty: DutyAssignment = {
                    id,
                    date: dayOffForm.date,
                    userId: dayOffForm.userId,
                    dutyTypeId: 'DAY_OFF',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                newDuties.push(newDuty);
                batch.set(db.collection('duties').doc(id), newDuty);
            }

            await batch.commit();
            setDuties(prev => [...prev, ...newDuties]);
            setIsDayOffModalOpen(false);
            alert("Выходной назначен");
        } catch (error) {
            console.error("Error saving day off:", error);
            alert("Ошибка при сохранении выходного");
        }
    };

    const renderCalendar = (monthDate: Date) => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthStart);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
        const participatingUsers = users.filter(u => settings?.participatingUserIds.includes(u.id));

        return (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase tracking-widest text-zinc-800 dark:text-white">
                        {format(monthDate, 'LLLL yyyy', { locale: ru })}
                    </h3>
                    {canManage && (
                        <div className="flex gap-2">
                            <button onClick={() => handleGenerateSchedule(monthDate)} className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-1">
                                <RefreshCw size={12} /> Распределить
                            </button>
                            <button onClick={() => handleClearDuties(monthDate)} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors flex items-center gap-1">
                                <Trash2 size={12} /> Очистить
                            </button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr>
                                <th className="p-3 bg-zinc-100 dark:bg-zinc-800/80 border-b border-r border-zinc-200 dark:border-zinc-700/50 sticky left-0 z-20 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Сотрудник
                                </th>
                                {daysInMonth.map(day => {
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <th key={day.toString()} className={`p-2 text-center text-xs border-b border-r border-zinc-200 dark:border-zinc-700/50 min-w-[100px] ${isWeekend ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-zinc-100 dark:bg-zinc-800/80'}`}>
                                            <div className="font-bold">{format(day, 'd')}</div>
                                            <div className="text-[10px] font-normal opacity-70 uppercase">{format(day, 'EE', { locale: ru })}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {participatingUsers.map(user => (
                                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-3 border-b border-r border-zinc-200 dark:border-zinc-700/50 sticky left-0 z-10 bg-white dark:bg-zinc-900 text-sm font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {user.name}
                                    </td>
                                    {daysInMonth.map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        const dayDuties = duties.filter(d => d.date === dateStr && d.userId === user.id);
                                        const isDayOff = dayDuties.some(d => d.dutyTypeId === 'DAY_OFF');
                                        
                                        return (
                                            <td 
                                                key={day.toString()} 
                                                onClick={() => {
                                                    if (!canManage) return;
                                                    setSelectedDate(dateStr);
                                                    setDutyForm({ userId: user.id, dutyTypeId: '' });
                                                    setEditingDuty(null);
                                                    setIsDutyModalOpen(true);
                                                }}
                                                className={`p-1 border-b border-r border-zinc-200 dark:border-zinc-700/50 text-center cursor-pointer transition-colors align-top ${isWeekend ? 'bg-red-50/30 dark:bg-red-900/10' : ''} hover:bg-primary/10`}
                                            >
                                                <div className="flex flex-col gap-1 min-h-[30px]">
                                                    {isDayOff && (
                                                        <div 
                                                            className="w-full flex items-center justify-center text-red-500 py-1 bg-red-50 dark:bg-red-900/20 rounded cursor-pointer" 
                                                            title="Выходной"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!canManage) return;
                                                                const dayOffDuty = dayDuties.find(d => d.dutyTypeId === 'DAY_OFF');
                                                                if (dayOffDuty) {
                                                                    setEditingDuty(dayOffDuty);
                                                                    setDutyForm({ userId: user.id, dutyTypeId: 'DAY_OFF' });
                                                                    setIsDutyModalOpen(true);
                                                                }
                                                            }}
                                                        >
                                                            <CalendarOff size={14} />
                                                        </div>
                                                    )}
                                                    {dayDuties.filter(d => d.dutyTypeId !== 'DAY_OFF').map(dayDuty => {
                                                        const dutyType = settings?.types.find(t => t.id === dayDuty.dutyTypeId);
                                                        if (!dutyType) return null;
                                                        return (
                                                            <div 
                                                                key={dayDuty.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!canManage) return;
                                                                    setSelectedDate(dateStr);
                                                                    setDutyForm({ userId: user.id, dutyTypeId: dayDuty.dutyTypeId });
                                                                    setEditingDuty(dayDuty);
                                                                    setIsDutyModalOpen(true);
                                                                }}
                                                                className="text-xs font-bold text-white rounded p-1.5 truncate shadow-sm" 
                                                                style={{ backgroundColor: dutyType.color || '#3b82f6' }} 
                                                                title={dutyType.name}
                                                            >
                                                                {dutyType.name}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('CALENDAR')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'CALENDAR' ? 'bg-primary text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                    >
                        <div className="flex items-center gap-2"><CalendarIcon size={14} /> Календарь</div>
                    </button>
                    {canManage && (
                        <button
                            onClick={() => {
                                setEditSettings(settings);
                                setActiveTab('SETTINGS');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'SETTINGS' ? 'bg-primary text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                        >
                            <div className="flex items-center gap-2"><Settings size={14} /> Настройки</div>
                        </button>
                    )}
                </div>

                {activeTab === 'CALENDAR' && canManage && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDayOffModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                        >
                            <CalendarOff size={14} /> Выходной
                        </button>
                        <button
                            onClick={handleSendReport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                        >
                            <Send size={14} /> Оповестить
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'CALENDAR' && (
                <div>
                    <div className="flex items-center justify-between mb-6 bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-2xl">
                        <button onClick={() => setBaseMonth(subMonths(baseMonth, 1))} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                            <ChevronLeft size={20} /> Пред. месяц
                        </button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black uppercase tracking-widest text-center">
                                {format(baseMonth, 'LLLL yyyy', { locale: ru })}
                            </h2>
                            <button 
                                onClick={() => setBaseMonth(new Date())}
                                className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
                            >
                                Сегодня
                            </button>
                        </div>
                        <button onClick={() => setBaseMonth(addMonths(baseMonth, 1))} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                            След. месяц <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="space-y-8">
                        {renderCalendar(baseMonth)}
                    </div>
                </div>
            )}

            {activeTab === 'SETTINGS' && editSettings && canManage && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Telegram Settings */}
                        <div className="glass-panel p-6 rounded-3xl">
                            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Send size={16} className="text-blue-500" /> Настройки Telegram
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Время уведомлений (Час:Минута)</label>
                                    <input
                                        type="time"
                                        value={editSettings.notificationTime || '08:00'}
                                        onChange={e => setEditSettings({...editSettings, notificationTime: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Токен бота</label>
                                    <input
                                        type="text"
                                        value={editSettings.telegramBotToken || ''}
                                        onChange={e => setEditSettings({...editSettings, telegramBotToken: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">ID Чата</label>
                                    <input
                                        type="text"
                                        value={editSettings.telegramChatId || ''}
                                        onChange={e => setEditSettings({...editSettings, telegramChatId: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                                        placeholder="-1001234567890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">ID Темы (Thread ID) - опционально</label>
                                    <input
                                        type="text"
                                        value={editSettings.telegramThreadId || ''}
                                        onChange={e => setEditSettings({...editSettings, telegramThreadId: e.target.value})}
                                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                                        placeholder="12345"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Duty Types */}
                        <div className="glass-panel p-6 rounded-3xl">
                            <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Settings size={16} className="text-primary" /> Типы дежурств
                            </h3>
                            <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {editSettings.types.map((type, index) => (
                                    <div key={index} className="flex flex-col gap-2 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={type.color || '#3b82f6'}
                                                onChange={e => {
                                                    const newTypes = [...editSettings.types];
                                                    newTypes[index].color = e.target.value;
                                                    setEditSettings({...editSettings, types: newTypes});
                                                }}
                                                className="w-8 h-8 rounded cursor-pointer border-none p-0"
                                                title="Цвет"
                                            />
                                            <input
                                                type="text"
                                                value={type.id}
                                                onChange={e => {
                                                    const newTypes = [...editSettings.types];
                                                    newTypes[index].id = e.target.value;
                                                    setEditSettings({...editSettings, types: newTypes});
                                                }}
                                                className="w-20 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-2 text-xs font-bold focus:ring-2 focus:ring-primary"
                                                placeholder="Код"
                                            />
                                            <input
                                                type="text"
                                                value={type.name}
                                                onChange={e => {
                                                    const newTypes = [...editSettings.types];
                                                    newTypes[index].name = e.target.value;
                                                    setEditSettings({...editSettings, types: newTypes});
                                                }}
                                                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-2 text-xs focus:ring-2 focus:ring-primary"
                                                placeholder="Название"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newTypes = editSettings.types.filter((_, i) => i !== index);
                                                    setEditSettings({...editSettings, types: newTypes});
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Доступно сотрудникам (оставьте пустым для всех)</label>
                                            <div className="flex flex-wrap gap-1">
                                                {users.filter(u => editSettings.participatingUserIds.includes(u.id)).map(u => {
                                                    const isAllowed = !type.allowedUserIds || type.allowedUserIds.length === 0 || type.allowedUserIds.includes(u.id);
                                                    return (
                                                        <div 
                                                            key={u.id}
                                                            onClick={() => {
                                                                const newTypes = [...editSettings.types];
                                                                let currentAllowed = newTypes[index].allowedUserIds || [];
                                                                
                                                                if (!newTypes[index].allowedUserIds || newTypes[index].allowedUserIds!.length === 0) {
                                                                    // If currently empty (all allowed), and we click one, we make it the ONLY allowed one
                                                                    currentAllowed = [u.id];
                                                                } else {
                                                                    if (currentAllowed.includes(u.id)) {
                                                                        currentAllowed = currentAllowed.filter(id => id !== u.id);
                                                                    } else {
                                                                        currentAllowed = [...currentAllowed, u.id];
                                                                    }
                                                                }
                                                                
                                                                newTypes[index].allowedUserIds = currentAllowed;
                                                                setEditSettings({...editSettings, types: newTypes});
                                                            }}
                                                            className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${isAllowed ? 'bg-primary text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
                                                        >
                                                            {u.name}
                                                        </div>
                                                    );
                                                })}
                                                {type.allowedUserIds && type.allowedUserIds.length > 0 && (
                                                    <div 
                                                        onClick={() => {
                                                            const newTypes = [...editSettings.types];
                                                            newTypes[index].allowedUserIds = [];
                                                            setEditSettings({...editSettings, types: newTypes});
                                                        }}
                                                        className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                                    >
                                                        Сбросить (Всем)
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setEditSettings({...editSettings, types: [...editSettings.types, { id: '', name: '' }]})}
                                className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Добавить тип
                            </button>
                        </div>
                    </div>

                    {/* Participating Users */}
                    <div className="glass-panel p-6 rounded-3xl">
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                            <UserIcon size={16} className="text-green-500" /> Участники дежурств
                        </h3>
                        <div className="mb-4 relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                placeholder="Поиск сотрудников..."
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())).map(user => {
                                const isParticipating = editSettings.participatingUserIds.includes(user.id);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => {
                                            const newIds = isParticipating
                                                ? editSettings.participatingUserIds.filter(id => id !== user.id)
                                                : [...editSettings.participatingUserIds, user.id];
                                            setEditSettings({...editSettings, participatingUserIds: newIds});
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                            isParticipating
                                                ? 'bg-primary/10 border-primary/30 dark:border-primary/50'
                                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${isParticipating ? 'bg-primary text-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                                            {isParticipating && <Check size={12} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-bold truncate">{user.name}</div>
                                            <div className="text-[10px] text-zinc-500 truncate">{user.departmentName}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveSettings}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
                        >
                            <Save size={16} /> Сохранить настройки
                        </button>
                    </div>
                </div>
            )}

            {/* Duty Modal */}
            {isDutyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                            <h3 className="text-lg font-black uppercase tracking-widest">
                                {editingDuty ? 'Редактировать дежурство' : 'Назначить дежурство'}
                            </h3>
                            <button onClick={() => setIsDutyModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Дата</label>
                                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium">
                                    {format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: ru })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Сотрудник</label>
                                <select
                                    value={dutyForm.userId}
                                    onChange={e => setDutyForm({...dutyForm, userId: e.target.value})}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Выберите сотрудника...</option>
                                    {users.filter(u => settings?.participatingUserIds.includes(u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Тип дежурства</label>
                                <select
                                    value={dutyForm.dutyTypeId}
                                    onChange={e => setDutyForm({...dutyForm, dutyTypeId: e.target.value})}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Выберите тип...</option>
                                    {settings?.types.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                            {editingDuty ? (
                                <button
                                    onClick={() => handleDeleteDuty(editingDuty.id)}
                                    className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Удалить
                                </button>
                            ) : <div></div>}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsDutyModalOpen(false)}
                                    className="px-4 py-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSaveDuty}
                                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Day Off Modal */}
            {isDayOffModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                            <h3 className="text-lg font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                                <CalendarOff size={20} /> Назначить выходной
                            </h3>
                            <button onClick={() => setIsDayOffModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Дата</label>
                                <input
                                    type="date"
                                    value={dayOffForm.date}
                                    onChange={e => setDayOffForm({...dayOffForm, date: e.target.value})}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Сотрудник</label>
                                <select
                                    value={dayOffForm.userId}
                                    onChange={e => setDayOffForm({...dayOffForm, userId: e.target.value})}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="ALL">Всем сотрудникам</option>
                                    {users.filter(u => settings?.participatingUserIds.includes(u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end items-center bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsDayOffModalOpen(false)}
                                    className="px-4 py-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSaveDayOff}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                                >
                                    Назначить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DutiesView;

