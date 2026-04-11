import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { PostCheckConfig, PostCheckEntry, User, PostCheckLicensedActivity } from '../../types';
import { Plus, Trash2, Save, Loader2, Upload, FileSpreadsheet, Send, AlertTriangle, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const Settings: React.FC = () => {
    const [reasons, setReasons] = useState<string[]>([]);
    const [newReason, setNewReason] = useState('');
    const [licensedActivities, setLicensedActivities] = useState<PostCheckLicensedActivity[]>([]);
    const [newActivityCode, setNewActivityCode] = useState('');
    const [newActivityDesc, setNewActivityDesc] = useState('');
    const [botToken, setBotToken] = useState('');
    const [dailyChats, setDailyChats] = useState<{ chatId: string; threadId?: string }[]>([]);
    const [weeklyChats, setWeeklyChats] = useState<{ chatId: string; threadId?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [deleteDateFrom, setDeleteDateFrom] = useState('');
    const [deleteDateTo, setDeleteDateTo] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsub = db.collection('settings').doc('post_check').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data() as any;
                setReasons(data.rejectionReasons || []);
                setLicensedActivities(data.licensedActivities || []);
                setBotToken(data.telegramBotToken || '');
                setDailyChats(data.dailyTelegramChats || []);
                setWeeklyChats(data.weeklyTelegramChats || []);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleAdd = () => {
        if (newReason.trim() && !reasons.includes(newReason.trim())) {
            setReasons([...reasons, newReason.trim()]);
            setNewReason('');
        }
    };

    const handleAddActivity = () => {
        if (newActivityCode.trim() && newActivityDesc.trim()) {
            if (!licensedActivities.some(a => a.code === newActivityCode.trim())) {
                setLicensedActivities([...licensedActivities, { 
                    code: newActivityCode.trim(), 
                    description: newActivityDesc.trim() 
                }]);
                setNewActivityCode('');
                setNewActivityDesc('');
            } else {
                alert('Код ГКЭД уже существует в списке');
            }
        }
    };

    const handleDeleteActivity = (index: number) => {
        setLicensedActivities(licensedActivities.filter((_, i) => i !== index));
    };

    const handleDelete = (index: number) => {
        setReasons(reasons.filter((_, i) => i !== index));
    };

    const handleAddChat = (type: 'daily' | 'weekly') => {
        if (type === 'daily') setDailyChats([...dailyChats, { chatId: '', threadId: '' }]);
        else setWeeklyChats([...weeklyChats, { chatId: '', threadId: '' }]);
    };

    const handleUpdateChat = (type: 'daily' | 'weekly', index: number, field: 'chatId' | 'threadId', value: string) => {
        if (type === 'daily') {
            const newChats = [...dailyChats];
            newChats[index] = { ...newChats[index], [field]: value };
            setDailyChats(newChats);
        } else {
            const newChats = [...weeklyChats];
            newChats[index] = { ...newChats[index], [field]: value };
            setWeeklyChats(newChats);
        }
    };

    const handleDeleteChat = (type: 'daily' | 'weekly', index: number) => {
        if (type === 'daily') setDailyChats(dailyChats.filter((_, i) => i !== index));
        else setWeeklyChats(weeklyChats.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await db.collection('settings').doc('post_check').set({ 
                rejectionReasons: reasons,
                licensedActivities: licensedActivities,
                telegramBotToken: botToken,
                dailyTelegramChats: dailyChats.filter(c => c.chatId.trim() !== ''),
                weeklyTelegramChats: weeklyChats.filter(c => c.chatId.trim() !== '')
            }, { merge: true });
            alert('Настройки сохранены');
        } catch (e) {
            console.error(e);
            alert('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadMonthlyReport = async () => {
        if (!selectedMonth) {
            alert('Выберите месяц');
            return;
        }
        try {
            const [year, month] = selectedMonth.split('-');
            const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999).toISOString();

            const snapshot = await db.collection('post_check_entries')
                .where('createdAt', '>=', startDate)
                .where('createdAt', '<=', endDate)
                .get();

            const entries = snapshot.docs.map(d => d.data() as PostCheckEntry);
            
            if (entries.length === 0) {
                alert('Нет данных за выбранный месяц');
                return;
            }

            const exportData = entries.map(e => {
                const dateObj = new Date(e.createdAt);
                return {
                    'Дата': dateObj.toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                    'День': dateObj.toLocaleDateString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                    'Время': dateObj.toLocaleTimeString('ru-RU', {timeZone: 'Asia/Bishkek'}),
                    'ИНН': e.inn,
                    'ФИО': e.fullName,
                    'ОКПО': e.okpo,
                    'ГКЭД': e.gked,
                    'ОКПО OK': e.isOkpoCorrect ? 'Да' : 'Нет',
                    'ГКЭД OK': e.isGkedCorrect ? 'Да' : 'Нет',
                    'Статус': e.isApproved ? 'Одобрено' : 'Отклонено',
                    'Причина': e.rejectionReason || '',
                    'Сотрудник': e.userName,
                    'Email сотрудника': e.userEmail || '',
                    'Время (сек)': e.timeSpentSeconds
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Отчет за месяц");
            XLSX.writeFile(wb, `monthly_report_${selectedMonth}.xlsx`);
        } catch (e) {
            console.error(e);
            alert('Ошибка при формировании отчета');
        }
    };

    const handleDeleteData = async () => {
        let confirmMsg = 'ВНИМАНИЕ! Вы собираетесь удалить данные постпроверки';
        if (deleteDateFrom && deleteDateTo) {
            confirmMsg += ` с ${deleteDateFrom} по ${deleteDateTo}`;
        } else if (deleteDateFrom) {
            confirmMsg += ` начиная с ${deleteDateFrom}`;
        } else if (deleteDateTo) {
            confirmMsg += ` до ${deleteDateTo} включительно`;
        } else {
            confirmMsg += ' ЗА ВСЕ ВРЕМЯ';
        }
        confirmMsg += '. Это действие необратимо. Продолжить?';

        const confirm1 = window.confirm(confirmMsg);
        if (!confirm1) return;

        const confirm2 = window.prompt('Для подтверждения удаления введите слово "УДАЛИТЬ" (заглавными буквами):');
        if (confirm2 !== 'УДАЛИТЬ') {
            alert('Удаление отменено.');
            return;
        }

        setDeletingAll(true);
        try {
            let query: any = db.collection('post_check_entries');
            
            if (deleteDateFrom) {
                const fromDate = new Date(deleteDateFrom);
                fromDate.setHours(0, 0, 0, 0);
                query = query.where('createdAt', '>=', fromDate.toISOString());
            }
            if (deleteDateTo) {
                const toDate = new Date(deleteDateTo);
                toDate.setHours(23, 59, 59, 999);
                query = query.where('createdAt', '<=', toDate.toISOString());
            }

            const snapshot = await query.get();
            
            if (snapshot.empty) {
                alert('Нет данных для удаления за выбранный период.');
                setDeletingAll(false);
                return;
            }

            const batches = [];
            let currentBatch = db.batch();
            let count = 0;

            snapshot.docs.forEach((doc: any) => {
                currentBatch.delete(doc.ref);
                count++;
                if (count === 400) {
                    batches.push(currentBatch);
                    currentBatch = db.batch();
                    count = 0;
                }
            });

            if (count > 0) {
                batches.push(currentBatch);
            }

            for (const batch of batches) {
                await batch.commit();
            }

            alert(`Успешно удалено ${snapshot.size} записей.`);
        } catch (error) {
            console.error('Ошибка при удалении данных:', error);
            alert('Произошла ошибка при удалении данных.');
        } finally {
            setDeletingAll(false);
        }
    };

    const handleManualSend = async (type: 'daily' | 'weekly' | 'monthly') => {
        if (!botToken) {
            alert('Сначала укажите токен бота и сохраните настройки.');
            return;
        }
        
        const chats = type === 'daily' ? dailyChats : weeklyChats;
        if (chats.length === 0 && type !== 'monthly') {
            alert('Добавьте хотя бы один чат для отправки.');
            return;
        }

        let startDate = new Date();
        let endDate = new Date();
        let dateRangeStr = '';

        if (type === 'daily') {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            dateRangeStr = `за сегодня (${startDate.toLocaleDateString('ru-RU')})`;
        } else if (type === 'weekly') {
            // Last week (Monday to Sunday)
            const day = startDate.getDay();
            const diffToMonday = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diffToMonday - 7);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            dateRangeStr = `за прошлую неделю (${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')})`;
        } else if (type === 'monthly') {
            if (!selectedMonth) {
                alert('Выберите месяц для отправки');
                return;
            }
            if (chats.length === 0) {
                // If no weekly chats, maybe use daily? Or ask user. Let's just use weekly chats for monthly report.
                if (weeklyChats.length === 0 && dailyChats.length === 0) {
                    alert('Добавьте чаты в настройки (ежедневные или еженедельные) для отправки.');
                    return;
                }
            }
            const [year, month] = selectedMonth.split('-');
            startDate = new Date(Number(year), Number(month) - 1, 1);
            endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
            dateRangeStr = `за ${selectedMonth}`;
        }

        try {
            const snapshot = await db.collection('post_check_entries')
                .where('createdAt', '>=', startDate.toISOString())
                .where('createdAt', '<=', endDate.toISOString())
                .get();

            const entries = snapshot.docs.map(d => d.data() as PostCheckEntry);
            
            const total = entries.length;
            const approved = entries.filter(e => e.isApproved).length;
            const rejected = total - approved;
            const totalSeconds = entries.reduce((acc, e) => acc + e.timeSpentSeconds, 0);
            const avgTime = total > 0 ? Math.round(totalSeconds / total) : 0;

            const reasonCounts: Record<string, number> = {};
            entries.filter(e => !e.isApproved && e.rejectionReason).forEach(e => {
                reasonCounts[e.rejectionReason!] = (reasonCounts[e.rejectionReason!] || 0) + 1;
            });
            const topReasons = Object.entries(reasonCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            const innCounts: Record<string, number> = {};
            entries.filter(e => !e.isApproved).forEach(e => {
                if (e.inn) innCounts[e.inn] = (innCounts[e.inn] || 0) + 1;
            });
            const repeatInns = Object.values(innCounts).filter(count => count > 1).length;

            const formatDuration = (seconds: number) => {
                if (!seconds) return '0с';
                const d = Math.floor(seconds / (3600 * 24));
                const h = Math.floor((seconds % (3600 * 24)) / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = Math.floor(seconds % 60);
                
                const parts = [];
                if (d > 0) parts.push(`${d}д`);
                if (h > 0) parts.push(`${h}ч`);
                if (m > 0) parts.push(`${m}м`);
                if (s > 0 || parts.length === 0) parts.push(`${s}с`);
                
                return parts.join(' ');
            };

            let message = `📊 Итого ${dateRangeStr}\n\n`;
            message += `📝 Обработано: ${total} постпроверок\n`;
            message += `✅ Апрувнуто: ${approved}\n`;
            message += `❌ Отклонено: ${rejected}\n`;
            message += `🔄 Повторных ИНН: ${repeatInns}\n`;
            message += `------------------------\n`;
            message += `⏱ Затрачено: ${formatDuration(totalSeconds)}\n`;
            message += `⚡ Среднее: ${formatDuration(avgTime)}\n\n`;
            
            if (topReasons.length > 0) {
                message += `<b>Топ причин отказов:</b>\n`;
                topReasons.forEach(([reason, count], index) => {
                    message += `${index + 1}. ${reason} - ${count}\n`;
                });
                message += `\n`;
            }

            const replyMarkup = {
                inline_keyboard: [[
                    { text: "📊 Открыть платформу", url: "https://optima-control-hub-586446158181.us-west1.run.app/" }
                ]]
            };

            let photoUrl: string | string[] | undefined = undefined;

            if (type === 'daily') {
                const pieConfig = {
                    type: 'outlabeledPie',
                    data: {
                        labels: ['Одобрено', 'Отклонено'],
                        datasets: [{
                            data: [approved, rejected],
                            backgroundColor: ['#10b981', '#ef4444']
                        }]
                    },
                    options: {
                        plugins: {
                            legend: false,
                            outlabels: {
                                text: '%l: %v',
                                color: 'white',
                                stretch: 35,
                                font: { resizable: true, minSize: 12, maxSize: 18, weight: 'bold' }
                            }
                        }
                    }
                };
                photoUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(pieConfig))}&bkg=18181b&w=600&h=400&f=png`;
            } else if (type === 'weekly' || type === 'monthly') {
                const trendTotalMap: Record<string, number> = {};
                const trendApprovedMap: Record<string, number> = {};
                const trendRejectedMap: Record<string, number> = {};

                entries.forEach(e => {
                    const date = e.createdAt.split('T')[0];
                    trendTotalMap[date] = (trendTotalMap[date] || 0) + 1;
                    if (e.isApproved) {
                        trendApprovedMap[date] = (trendApprovedMap[date] || 0) + 1;
                    } else {
                        trendRejectedMap[date] = (trendRejectedMap[date] || 0) + 1;
                    }
                });

                const sortedDates = Object.keys(trendTotalMap).sort();
                const labels = sortedDates.map(d => d.substring(5)); // MM-DD
                const totalData = sortedDates.map(d => trendTotalMap[d] || 0);
                const approvedData = sortedDates.map(d => trendApprovedMap[d] || 0);
                const rejectedData = sortedDates.map(d => trendRejectedMap[d] || 0);

                const lineConfig = {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Всего',
                                data: totalData,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                datalabels: { align: 'top', color: '#3b82f6' }
                            },
                            {
                                label: 'Одобрено',
                                data: approvedData,
                                borderColor: '#10b981',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                datalabels: { align: 'bottom', color: '#10b981' }
                            },
                            {
                                label: 'Отклонено',
                                data: rejectedData,
                                borderColor: '#ef4444',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                datalabels: { align: 'bottom', color: '#ef4444' }
                            }
                        ]
                    },
                    options: {
                        title: { display: true, text: `Динамика поступлений ${type === 'weekly' ? 'за неделю' : 'за месяц'}`, fontColor: '#fff', fontSize: 16 },
                        legend: { display: true, labels: { fontColor: '#fff' } },
                        plugins: {
                            datalabels: {
                                display: true,
                                font: { weight: 'bold', size: 12 },
                                borderRadius: 4,
                                backgroundColor: 'rgba(0,0,0,0.7)'
                            }
                        },
                        scales: {
                            xAxes: [{ gridLines: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { fontColor: '#fff' } }],
                            yAxes: [{ gridLines: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { fontColor: '#fff', beginAtZero: true } }]
                        }
                    }
                };
                
                const pieConfig = {
                    type: 'outlabeledPie',
                    data: {
                        labels: ['Одобрено', 'Отклонено'],
                        datasets: [{
                            data: [approved, rejected],
                            backgroundColor: ['#10b981', '#ef4444']
                        }]
                    },
                    options: {
                        plugins: {
                            legend: false,
                            outlabels: {
                                text: '%l: %v',
                                color: 'white',
                                stretch: 35,
                                font: { resizable: true, minSize: 12, maxSize: 18, weight: 'bold' }
                            }
                        }
                    }
                };

                const lineUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(lineConfig))}&bkg=18181b&w=800&h=400&f=png`;
                const pieUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(pieConfig))}&bkg=18181b&w=600&h=400&f=png`;
                
                photoUrl = [lineUrl, pieUrl];
            }

            const targetChats = type === 'monthly' ? (weeklyChats.length > 0 ? weeklyChats : dailyChats) : chats;

            for (const chat of targetChats) {
                const response = await fetch('/api/telegram/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        botToken,
                        chatId: chat.chatId,
                        messageThreadId: chat.threadId,
                        text: message,
                        photoUrl: photoUrl,
                        replyMarkup: replyMarkup
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Telegram API Error:', errorData);
                    throw new Error(errorData.details || 'Failed to send message');
                }
            }

            alert('Отчет успешно отправлен!');
        } catch (error) {
            console.error('Ошибка при отправке отчета:', error);
            alert('Ошибка при отправке отчета. Проверьте консоль.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            // Fetch all users for mapping
            const usersSnap = await db.collection('users').get();
            const usersMap = new Map<string, User>();
            usersSnap.docs.forEach(doc => {
                const u = doc.data() as User;
                if (u.email) usersMap.set(u.email.toLowerCase(), u);
            });

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                    // Skip header row (index 0)
                    const entries: PostCheckEntry[] = [];
                    const newReasons = new Set<string>();
                    
                    for (let i = 1; i < data.length; i++) {
                        const row = data[i];
                        if (!row || row.length === 0) continue;

                        // Map columns based on image
                        // A: INN, B: FIO, C: OKPO, D: GKED, E: OKPO Correct, F: GKED Correct, G: Approved, H: Rejected, I: Start, J: Email, K: Reason, L: Count, M: Time
                        
                        const inn = String(row[0] || '').trim();
                        if (!inn) continue;

                        const email = String(row[9] || '').trim().toLowerCase();
                        const user = usersMap.get(email);
                        
                        const isApproved = !!row[6]; // Column G is Approved checkbox
                        
                        // Excel checkboxes often come as TRUE/FALSE or 1/0
                        const isOkpoCorrect = !!row[4];
                        const isGkedCorrect = !!row[5];

                        // Date parsing might be tricky depending on format. Assuming string or Excel date serial.
                        let startTime = new Date().toISOString();
                        if (row[8]) {
                            // Try to parse date
                            // If it's Excel serial date
                            if (typeof row[8] === 'number') {
                                const date = new Date(Math.round((row[8] - 25569)*86400*1000));
                                startTime = date.toISOString();
                            } else {
                                const date = new Date(row[8]);
                                if (!isNaN(date.getTime())) startTime = date.toISOString();
                            }
                        }

                        const timeSpent = Number(row[12]) || 60;
                        const rejectionReason = isApproved ? null : (String(row[10] || '').trim() || null);

                        if (rejectionReason) {
                            newReasons.add(rejectionReason);
                        }

                        const entry: PostCheckEntry = {
                            id: `pc_import_${Date.now()}_${i}`,
                            inn: inn,
                            fullName: String(row[1] || ''),
                            okpo: String(row[2] || ''),
                            gked: String(row[3] || ''),
                            isOkpoCorrect: isOkpoCorrect,
                            isGkedCorrect: isGkedCorrect,
                            isApproved: isApproved,
                            rejectionReason: rejectionReason,
                            startTime: startTime,
                            endTime: new Date(new Date(startTime).getTime() + timeSpent * 1000).toISOString(),
                            timeSpentSeconds: timeSpent,
                            userId: user?.id || 'imported_user',
                            userName: user?.name || email || 'Imported User',
                            createdAt: startTime // Use start time as creation time for sorting
                        };
                        entries.push(entry);
                    }

                    // Update rejection reasons if new ones found
                    let addedCount = 0;
                    if (newReasons.size > 0) {
                        const currentReasons = new Set(reasons);
                        let updated = false;
                        newReasons.forEach(r => {
                            if (!currentReasons.has(r)) {
                                currentReasons.add(r);
                                updated = true;
                                addedCount++;
                            }
                        });

                        if (updated) {
                            const updatedReasons = Array.from(currentReasons);
                            setReasons(updatedReasons);
                            await db.collection('settings').doc('post_check').set({ rejectionReasons: updatedReasons }, { merge: true });
                        }
                    }

                    // Batch write (max 500 per batch)
                    const batchSize = 400;
                    for (let i = 0; i < entries.length; i += batchSize) {
                        const batch = db.batch();
                        const chunk = entries.slice(i, i + batchSize);
                        chunk.forEach(entry => {
                            const ref = db.collection('post_check_entries').doc(entry.id);
                            batch.set(ref, entry);
                        });
                        await batch.commit();
                    }

                    alert(`Импортировано ${entries.length} записей. Добавлено ${addedCount} новых причин отказа.`);
                } catch (err) {
                    console.error('Error parsing file:', err);
                    alert('Ошибка при обработке файла');
                } finally {
                    setImporting(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsBinaryString(file);

        } catch (e) {
            console.error(e);
            alert('Ошибка импорта');
            setImporting(false);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-2xl mx-auto p-3 space-y-8">
            {/* Import Section */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                    <FileSpreadsheet className="text-emerald-500" /> Импорт данных
                </h3>
                <p className="text-sm text-zinc-500 mb-6 font-medium">
                    Загрузите Excel файл (.xlsx) с историческими данными. Система автоматически сопоставит сотрудников по Email.
                </p>
                <div className="flex gap-4">
                    <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="px-6 py-3 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/80 dark:hover:bg-zinc-700/50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        {importing ? 'Импорт...' : 'Выбрать файл'}
                    </button>
                </div>
            </div>

            {/* Telegram Settings */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                    <Send className="text-blue-500" /> Настройки Telegram Отчетов
                </h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-2">Токен Бота</label>
                        <input 
                            type="password"
                            value={botToken}
                            onChange={e => setBotToken(e.target.value)}
                            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                            className="w-full px-6 py-4 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm shadow-inner dark:text-white"
                        />
                    </div>
                    
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Ежедневные отчеты (18:00)</label>
                                <button 
                                    onClick={() => handleManualSend('daily')}
                                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1 uppercase tracking-widest"
                                >
                                    <Send size={14} /> Отправить сейчас
                                </button>
                            </div>
                            <button onClick={() => handleAddChat('daily')} className="text-[10px] font-bold text-primary hover:text-indigo-600 transition-colors flex items-center gap-1 uppercase tracking-widest">
                                <Plus size={14} /> Добавить чат
                            </button>
                        </div>
                        <div className="space-y-3">
                            {dailyChats.map((chat, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <input 
                                        type="text"
                                        value={chat.chatId}
                                        onChange={e => handleUpdateChat('daily', i, 'chatId', e.target.value)}
                                        placeholder="Chat ID (напр. -1001234567890)"
                                        className="flex-1 px-6 py-4 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm shadow-inner dark:text-white"
                                    />
                                    <input 
                                        type="text"
                                        value={chat.threadId || ''}
                                        onChange={e => handleUpdateChat('daily', i, 'threadId', e.target.value)}
                                        placeholder="Thread ID (опц.)"
                                        className="w-40 px-6 py-4 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm shadow-inner dark:text-white"
                                    />
                                    <button onClick={() => handleDeleteChat('daily', i)} className="p-3 text-zinc-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all shadow-sm">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {dailyChats.length === 0 && <div className="text-sm text-zinc-500 italic font-medium ml-2">Чаты не добавлены.</div>}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Еженедельные отчеты (Пн 08:00)</label>
                                <button 
                                    onClick={() => handleManualSend('weekly')}
                                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1 uppercase tracking-widest"
                                >
                                    <Send size={14} /> Отправить сейчас
                                </button>
                            </div>
                            <button onClick={() => handleAddChat('weekly')} className="text-[10px] font-bold text-primary hover:text-indigo-600 transition-colors flex items-center gap-1 uppercase tracking-widest">
                                <Plus size={14} /> Добавить чат
                            </button>
                        </div>
                        <div className="space-y-3">
                            {weeklyChats.map((chat, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <input 
                                        type="text"
                                        value={chat.chatId}
                                        onChange={e => handleUpdateChat('weekly', i, 'chatId', e.target.value)}
                                        placeholder="Chat ID (напр. -1001234567890)"
                                        className="flex-1 px-6 py-4 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm shadow-inner dark:text-white"
                                    />
                                    <input 
                                        type="text"
                                        value={chat.threadId || ''}
                                        onChange={e => handleUpdateChat('weekly', i, 'threadId', e.target.value)}
                                        placeholder="Thread ID (опц.)"
                                        className="w-40 px-6 py-4 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm shadow-inner dark:text-white"
                                    />
                                    <button onClick={() => handleDeleteChat('weekly', i)} className="p-3 text-zinc-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all shadow-sm">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {weeklyChats.length === 0 && <div className="text-sm text-zinc-500 italic font-medium ml-2">Чаты не добавлены.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Report */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                    <FileSpreadsheet className="text-blue-500" /> Выгрузка и отправка за месяц
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="px-6 py-3 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all font-mono text-sm shadow-inner dark:text-white"
                    />
                    <button 
                        onClick={handleDownloadMonthlyReport}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                    >
                        <Download size={16} /> Скачать отчет
                    </button>
                    <button 
                        onClick={() => handleManualSend('monthly')}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                    >
                        <Send size={16} /> Отправить в Telegram
                    </button>
                </div>
            </div>

            {/* Reasons Section */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] shadow-sm">
                <h2 className="text-lg font-bold mb-6 dark:text-white">Настройка причин отказа</h2>
                
                <div className="flex gap-3 mb-8">
                    <input 
                        value={newReason}
                        onChange={e => setNewReason(e.target.value)}
                        placeholder="Введите причину..."
                        className="flex-1 px-6 py-4 bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl outline-none focus:border-primary transition-all shadow-inner dark:text-white text-sm font-medium"
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button onClick={handleAdd} className="p-3 bg-primary text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-md">
                        <Plus size={20} />
                    </button>
                </div>

                <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {reasons.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl shadow-sm">
                            <span className="text-sm font-medium dark:text-zinc-200">{r}</span>
                            <button onClick={() => handleDelete(i)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {reasons.length === 0 && <div className="text-center text-zinc-400 py-6 font-medium">Список пуст</div>}
                </div>

                {/* Licensed Activities */}
                <div className="pt-6 border-t border-white/20 dark:border-zinc-700/30 mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4 flex items-center gap-2">
                        <FileText size={16} /> Лицензируемая деятельность
                    </h3>
                    
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <input 
                            type="text" 
                            value={newActivityCode} 
                            onChange={e => setNewActivityCode(e.target.value)}
                            placeholder="Код ГКЭД (напр. 62.01.0)"
                            className="w-full md:w-1/3 p-3 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-400 dark:text-white"
                        />
                        <input 
                            type="text" 
                            value={newActivityDesc} 
                            onChange={e => setNewActivityDesc(e.target.value)}
                            placeholder="Описание деятельности"
                            className="w-full md:w-1/2 p-3 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-400 dark:text-white"
                        />
                        <button 
                            onClick={handleAddActivity} 
                            disabled={!newActivityCode.trim() || !newActivityDesc.trim()}
                            className="w-full md:w-auto p-3 bg-primary text-white rounded-2xl hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {licensedActivities.map((activity, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-zinc-700/30 rounded-2xl shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{activity.code}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{activity.description}</span>
                                </div>
                                <button onClick={() => handleDeleteActivity(i)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {licensedActivities.length === 0 && <div className="text-center text-zinc-400 py-6 font-medium">Список пуст</div>}
                    </div>
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full py-4 bg-primary text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-md"
                >
                    {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Сохранить изменения
                </button>
            </div>

            {/* Danger Zone */}
            <div className="glass-panel p-3 md:p-3 rounded-[2.5rem] border border-red-200/50 dark:border-red-900/30 shadow-sm bg-red-50/30 dark:bg-red-900/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-500">
                    <AlertTriangle /> Опасная зона
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 font-medium">
                    Удаление данных постпроверки. Выберите период для удаления. Если выбрать только дату "ДО", удалятся все данные до этой даты. Если даты не выбраны, удалятся ВСЕ данные.
                </p>
                <div className="flex flex-wrap gap-4 items-center mb-6">
                    <div>
                        <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 ml-2">От (включительно)</label>
                        <input 
                            type="date" 
                            value={deleteDateFrom}
                            onChange={e => setDeleteDateFrom(e.target.value)}
                            className="px-4 py-2 bg-white/50 dark:bg-zinc-900/50 border border-red-200/50 dark:border-red-900/30 rounded-xl outline-none focus:border-red-500 transition-all font-mono text-sm shadow-inner dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 ml-2">До (включительно)</label>
                        <input 
                            type="date" 
                            value={deleteDateTo}
                            onChange={e => setDeleteDateTo(e.target.value)}
                            className="px-4 py-2 bg-white/50 dark:bg-zinc-900/50 border border-red-200/50 dark:border-red-900/30 rounded-xl outline-none focus:border-red-500 transition-all font-mono text-sm shadow-inner dark:text-white"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleDeleteData}
                    disabled={deletingAll}
                    className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center gap-2 shadow-sm"
                >
                    {deletingAll ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    {deletingAll ? 'Удаление...' : 'Удалить данные'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
