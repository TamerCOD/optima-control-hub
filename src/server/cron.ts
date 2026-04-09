import cron from 'node-cron';
import fetch from 'node-fetch';
import { auth, db } from '../firebase';

// Cache settings to avoid RESOURCE_EXHAUSTED
const settingsCache: Record<string, any> = {};

function initSettingsCache() {
  db.collection('settings').onSnapshot(snap => {
    snap.docs.forEach(doc => {
      settingsCache[doc.id] = doc.data();
    });
  });
}

async function authenticateBot() {
  try {
    await auth.signInWithEmailAndPassword('bot2@optima.local', 'BotPassword123!');
    console.log("Cron bot authenticated.");
  } catch (e: any) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      try {
        await auth.createUserWithEmailAndPassword('bot2@optima.local', 'BotPassword123!');
        console.log("Cron bot user created and authenticated.");
      } catch (err) {
        console.error("Failed to create cron bot user:", err);
      }
    } else {
      console.error("Failed to authenticate cron bot:", e);
    }
  }
}

export async function sendTelegramMessage(botToken: string, chatId: string, text: string, threadId?: string, photoUrl?: string | string[], replyMarkup?: any) {
  try {
    const cleanBotToken = botToken.trim();
    const cleanChatId = chatId.trim();
    
    if (Array.isArray(photoUrl) && photoUrl.length > 0) {
      const media = photoUrl.map((url, index) => ({
        type: 'photo',
        media: url,
        caption: index === 0 ? text : undefined,
        parse_mode: 'HTML'
      }));
      
      const body: any = {
        chat_id: cleanChatId,
        media: media
      };
      if (threadId && threadId.toString().trim() !== '') {
        body.message_thread_id = threadId.toString().trim();
      }

      const response = await fetch(`https://api.telegram.org/bot${cleanBotToken}/sendMediaGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Telegram API Error (sendMediaGroup):', err);
      }

      if (replyMarkup) {
        const markupBody: any = {
          chat_id: cleanChatId,
          text: "👇 Открыть платформу",
          reply_markup: replyMarkup
        };
        if (threadId && threadId.toString().trim() !== '') {
          markupBody.message_thread_id = threadId.toString().trim();
        }
        await fetch(`https://api.telegram.org/bot${cleanBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(markupBody)
        });
      }
      return { success: true };
    } else {
      const body: any = {
        chat_id: cleanChatId,
        parse_mode: "HTML",
      };
      if (threadId && threadId.toString().trim() !== '') {
        body.message_thread_id = threadId.toString().trim();
      }
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      let endpoint = `https://api.telegram.org/bot${cleanBotToken}/sendMessage`;
      if (photoUrl && typeof photoUrl === 'string') {
        endpoint = `https://api.telegram.org/bot${cleanBotToken}/sendPhoto`;
        body.photo = photoUrl;
        body.caption = text;
      } else {
        body.text = text;
        body.disable_web_page_preview = true;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Telegram API Error:", data);
        return { success: false, error: data };
      }
      return { success: true };
    }
  } catch (e: any) {
    console.error("Error sending telegram message from cron:", e);
    return { success: false, error: e.message };
  }
}

export async function runAllCronJobs(): Promise<string[]> {
  const logs: string[] = [];
  const now = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
  logs.push(`[${now.toISOString()}] Starting cron jobs (Bishkek time)`);
  
  try {
    // 1. Check TMS Reports & Overdue Tasks
    try {
      const settings = settingsCache['tms'];
      if (settings) {
        const scheduledReports = settings.scheduledReports || [];
        const nowBishkek = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
        const currentHour = String(nowBishkek.getUTCHours()).padStart(2, '0');
        const currentMinute = String(nowBishkek.getUTCMinutes()).padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        const currentDayOfWeek = nowBishkek.getUTCDay(); // 0-6
        const currentDateStr = nowBishkek.toISOString().split('T')[0];

        if (scheduledReports.length > 0) {
          for (const report of scheduledReports) {
            if (currentTime < report.time) continue;
            
            let shouldSend = false;
            if (report.frequency === 'daily') {
              shouldSend = report.lastSent !== currentDateStr;
            } else if (report.frequency === 'weekly') {
              shouldSend = report.dayOfWeek === currentDayOfWeek && report.lastSent !== currentDateStr;
            } else if (report.frequency === 'custom') {
              if (!report.lastSent) {
                shouldSend = true;
              } else {
                const lastSentDate = new Date(report.lastSent);
                const diffTime = Math.abs(nowBishkek.getTime() - lastSentDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                shouldSend = diffDays >= (report.intervalDays || 1) && report.lastSent !== currentDateStr;
              }
            }

            if (shouldSend) {
              const actuallySend = await db.runTransaction(async (t) => {
                const doc = await t.get(db.collection('settings').doc('tms'));
                if (!doc.exists) return false;
                const data = doc.data() as any;
                const currentReports = data.scheduledReports || [];
                const currentReport = currentReports.find((r: any) => r.id === report.id);
                if (currentReport && currentReport.lastSent !== currentDateStr) {
                  currentReport.lastSent = currentDateStr;
                  t.update(db.collection('settings').doc('tms'), { scheduledReports: currentReports });
                  return true;
                }
                return false;
              });

              if (actuallySend) {
                await generateAndSendReport(report, settings);
              }
            }
          }
        }
        
        // Also check for overdue tasks (only once a day at 09:00 to save quota)
        if (currentTime >= '09:00' && settings.lastOverdueCheck !== currentDateStr) {
          const actuallyCheck = await db.runTransaction(async (t) => {
            const doc = await t.get(db.collection('settings').doc('tms'));
            if (!doc.exists) return false;
            if (doc.data()?.lastOverdueCheck !== currentDateStr) {
              t.update(db.collection('settings').doc('tms'), { lastOverdueCheck: currentDateStr });
              return true;
            }
            return false;
          });

          if (actuallyCheck) {
            await checkOverdueTasks(settings);
          }
        }
      }
    } catch (e: any) {
      logs.push(`TMS Cron error: ${e.message}`);
      console.error("TMS Cron error:", e);
    }
    
    // 2. Check PostCheck reports
    try {
      await checkPostCheckReports();
    } catch (e: any) {
      logs.push(`PostCheck Cron error: ${e.message}`);
      console.error("PostCheck Cron error:", e);
    }
    
    // 3. Check SyncDep notifications
    try {
      const syncDepLogs = await checkSyncDepNotifications();
      if (syncDepLogs) logs.push(...syncDepLogs);
    } catch (e: any) {
      logs.push(`SyncDep Cron error: ${e.message}`);
      console.error("SyncDep Cron error:", e);
    }
    
    // 4. Run Issue Automation
    try {
      const { runIssueAutomation } = await import('../utils/automation');
      const issueResult = await runIssueAutomation(settingsCache['issues']);
      logs.push(`Issue Automation: ${issueResult.message}`);
    } catch (e: any) {
      logs.push(`Issue Automation error: ${e.message}`);
      console.error("Issue Automation error:", e);
    }

    // 5. Run Duties Notifications
    try {
      const dutiesLogs = await checkDutiesNotifications();
      logs.push(...dutiesLogs);
    } catch (e: any) {
      logs.push(`Duties Notifications error: ${e.message}`);
      console.error("Duties Notifications error:", e);
    }
    
  } catch (e: any) {
    logs.push(`Global Cron error: ${e.message}`);
    console.error("Cron job error:", e);
  }
  
  logs.push(`Cron jobs finished.`);
  return logs;
}

export function startCronJobs() {
  initSettingsCache();
  authenticateBot().then(() => {
    // Check every minute
    cron.schedule('* * * * *', async () => {
      await runAllCronJobs();
    });
  });
}

async function checkPostCheckReports() {
  try {
    const settings = settingsCache['post_check'];
    if (!settings) return;
    
    const botToken = settings.telegramBotToken;
    const dailyChats = settings.dailyTelegramChats || [];
    const weeklyChats = settings.weeklyTelegramChats || [];
    
    if (!botToken) return;

    const nowBishkek = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
    const currentHour = String(nowBishkek.getUTCHours()).padStart(2, '0');
    const currentMinute = String(nowBishkek.getUTCMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentDayOfWeek = nowBishkek.getUTCDay(); // 0-6 (0 is Sunday, 1 is Monday)
    const currentDateStr = nowBishkek.toISOString().split('T')[0];

    // Daily report: 18:00 Mon-Fri
    if (currentTime >= '18:00' && currentDayOfWeek >= 1 && currentDayOfWeek <= 5 && dailyChats.length > 0) {
      const shouldSend = await db.runTransaction(async (t) => {
        const doc = await t.get(db.collection('settings').doc('post_check'));
        if (!doc.exists) return false;
        if (doc.data()?.lastDailyReportSent !== currentDateStr) {
          t.update(db.collection('settings').doc('post_check'), { lastDailyReportSent: currentDateStr });
          return true;
        }
        return false;
      });
      
      if (shouldSend) {
        await sendPostCheckReport('daily', botToken, dailyChats, nowBishkek);
      }
    }

    // Weekly report: 08:00 Monday
    if (currentTime >= '08:00' && currentDayOfWeek === 1 && weeklyChats.length > 0) {
      const shouldSend = await db.runTransaction(async (t) => {
        const doc = await t.get(db.collection('settings').doc('post_check'));
        if (!doc.exists) return false;
        if (doc.data()?.lastWeeklyReportSent !== currentDateStr) {
          t.update(db.collection('settings').doc('post_check'), { lastWeeklyReportSent: currentDateStr });
          return true;
        }
        return false;
      });

      if (shouldSend) {
        await sendPostCheckReport('weekly', botToken, weeklyChats, nowBishkek);
      }
    }
  } catch (e) {
    console.error("Error checking post check reports:", e);
  }
}

async function sendPostCheckReport(type: 'daily' | 'weekly', botToken: string, chats: any[], nowBishkek: Date) {
  const entriesSnap = await db.collection('post_check_entries').get();
  const entries = entriesSnap.docs.map(d => d.data() as any);

  let filteredEntries = [];
  let dateRangeStr = '';

  if (type === 'daily') {
    const todayStr = nowBishkek.toISOString().split('T')[0];
    filteredEntries = entries.filter(e => e.createdAt.startsWith(todayStr));
    dateRangeStr = `за сегодня (${nowBishkek.toLocaleDateString('ru-RU', {timeZone: 'Asia/Bishkek'})})`;
  } else {
    // Previous week (Monday to Sunday)
    const lastMonday = new Date(nowBishkek);
    lastMonday.setDate(nowBishkek.getDate() - (nowBishkek.getDay() === 0 ? 7 : nowBishkek.getDay()) - 6);
    lastMonday.setHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    
    filteredEntries = entries.filter(e => {
      const d = new Date(e.createdAt);
      return d >= lastMonday && d <= lastSunday;
    });
    dateRangeStr = `за прошлую неделю (${lastMonday.toLocaleDateString('ru-RU', {timeZone: 'Asia/Bishkek'})} - ${lastSunday.toLocaleDateString('ru-RU', {timeZone: 'Asia/Bishkek'})})`;
  }

  const total = filteredEntries.length;
  const approved = filteredEntries.filter(e => e.isApproved).length;
  const rejected = total - approved;
  const totalSeconds = filteredEntries.reduce((acc, e) => acc + e.timeSpentSeconds, 0);
  const avgTime = total > 0 ? Math.round(totalSeconds / total) : 0;

  const reasonCounts: Record<string, number> = {};
  filteredEntries.filter(e => !e.isApproved && e.rejectionReason).forEach(e => {
    reasonCounts[e.rejectionReason] = (reasonCounts[e.rejectionReason] || 0) + 1;
  });
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const innCounts: Record<string, number> = {};
  filteredEntries.filter(e => !e.isApproved).forEach(e => {
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
  } else if (type === 'weekly') {
      const trendTotalMap: Record<string, number> = {};
      const trendApprovedMap: Record<string, number> = {};
      const trendRejectedMap: Record<string, number> = {};

      filteredEntries.forEach(e => {
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
              title: { display: true, text: 'Динамика поступлений за неделю', fontColor: '#fff', fontSize: 16 },
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

  for (const chat of chats) {
    await sendTelegramMessage(botToken, chat.chatId, message, chat.threadId, photoUrl, replyMarkup);
  }
}

async function generateAndSendReport(report: any, settings: any) {
  const botToken = settings.integrations?.telegram?.botToken;
  const chatId = settings.integrations?.telegram?.reportTelegramChatId;
  if (!botToken || !chatId) return;

  const tasksSnapshot = await db.collection('tasks').get();
  const projectsSnapshot = await db.collection('projects').get();
  const usersSnapshot = await db.collection('users').get();

  const tasks = tasksSnapshot.docs.map(d => d.data() as any);
  const projects = projectsSnapshot.docs.map(d => d.data() as any);
  const users = usersSnapshot.docs.map(d => d.data() as any);

  const filteredTasks = tasks.filter(t => {
    if (report.filters.projectId !== 'all' && t.projectId !== report.filters.projectId) return false;
    if (report.filters.userId !== 'all' && t.assigneeId !== report.filters.userId) return false;
    
    // Custom filters
    if (report.filters.customFilters) {
      for (const [fieldName, filterValue] of Object.entries(report.filters.customFilters)) {
        if (!filterValue) continue;
        const project = projects.find(p => p.id === t.projectId);
        if (!project) return false;
        const fieldDef = project.customFields?.find((f: any) => f.name === fieldName);
        if (!fieldDef) return false;
        const taskValue = t.customFieldValues?.[fieldDef.id];
        
        if (fieldDef.type === 'boolean') {
            if (filterValue === 'true' && taskValue !== true) return false;
            if (filterValue === 'false' && taskValue !== false) return false;
        } else if (fieldDef.type === 'select' || fieldDef.type === 'nested-select') {
            if (taskValue !== filterValue) return false;
        } else if (fieldDef.type === 'multiselect') {
            if (!Array.isArray(taskValue) || !taskValue.includes(filterValue)) return false;
        } else {
            if (!taskValue || !String(taskValue).toLowerCase().includes((filterValue as string).toLowerCase())) return false;
        }
      }
    }
    return true;
  });

  const completed = filteredTasks.filter(t => t.completedAt).length;
  const total = filteredTasks.length;
  const overdue = filteredTasks.filter(t => t.endDate && new Date(t.endDate) < new Date() && !t.completedAt).length;
  const inProgress = filteredTasks.filter(t => !t.completedAt && t.status !== 'todo').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const projectData = projects.map(p => ({
      name: p.name,
      tasks: filteredTasks.filter(t => t.projectId === p.id).length,
      completed: filteredTasks.filter(t => t.projectId === p.id && t.completedAt).length,
  })).filter(p => p.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 5);

  const assigneeData = users.map(u => ({
      name: u.name.split(' ')[0],
      tasks: filteredTasks.filter(t => t.assigneeId === u.id).length,
      completed: filteredTasks.filter(t => t.assigneeId === u.id && t.completedAt).length
  })).filter(u => u.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 8);

  const reportDate = new Date().toLocaleDateString('ru-RU', {timeZone: 'Asia/Bishkek'});
  const summary = `
📊 <b>Авто-отчет: ${report.name}</b> (${reportDate})

✅ <b>Выполнено:</b> ${completed}
🔥 <b>Просрочено:</b> ${overdue}
⚡ <b>В работе:</b> ${inProgress}
📋 <b>Всего:</b> ${total}
📈 <b>Процент выполнения:</b> ${completionRate}%

<b>Топ Проектов:</b>
${projectData.map(p => `• ${p.name}: ${p.completed}/${p.tasks}`).join('\n')}

<b>Нагрузка Команды:</b>
${assigneeData.map(u => `• ${u.name}: ${u.completed}/${u.tasks}`).join('\n')}
  `.trim();

  await sendTelegramMessage(botToken, chatId, summary);
}

// Overdue tasks notification
async function checkOverdueTasks(settings: any) {
  const botToken = settings.integrations?.telegram?.botToken;
  if (!botToken) return;

  const nowBishkek = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
  const currentDateStr = nowBishkek.toISOString().split('T')[0];

  const tasksSnapshot = await db.collection('tasks').get();
  const usersSnapshot = await db.collection('users').get();
  const projectsSnapshot = await db.collection('projects').get();

  const tasks = tasksSnapshot.docs.map(d => d.data() as any);
  const users = usersSnapshot.docs.map(d => d.data() as any);
  const projects = projectsSnapshot.docs.map(d => d.data() as any);

  for (const task of tasks) {
    if (task.completedAt) continue;
    if (!task.endDate) continue;

    const endDate = new Date(task.endDate);
    if (endDate < new Date()) {
      // Overdue
      // Check if we already notified today
      if (task.lastOverdueNotification === currentDateStr) continue;

      const assignee = users.find(u => u.id === task.assigneeId);
      const project = projects.find(p => p.id === task.projectId);
      
      if (assignee && assignee.telegramId && assignee.telegramNotificationsEnabled !== false) {
        const msg = `🚨 <b>Задача просрочена!</b>\nПроект: ${project?.name || 'Неизвестно'}\nЗадача: <b>${task.key}</b> ${task.title}\nДедлайн был: ${new Date(task.endDate).toLocaleString('ru-RU', {timeZone: 'Asia/Bishkek'})}`;
        
        // Send to user
        await sendTelegramMessage(botToken, assignee.telegramId, msg);
        
        // Send to group if configured
        const groupId = settings.integrations?.telegram?.reportTelegramChatId;
        if (groupId) {
          const groupMsg = `🚨 <b>Просроченная задача</b>\nИсполнитель: ${assignee.telegramUsername ? '@'+assignee.telegramUsername : assignee.name}\nПроект: ${project?.name || 'Неизвестно'}\nЗадача: <b>${task.key}</b> ${task.title}`;
          await sendTelegramMessage(botToken, groupId, groupMsg);
        }

        // Mark as notified today
        await db.collection('tasks').doc(task.id).update({
          lastOverdueNotification: currentDateStr
        });
      }
    }
  }
}

async function checkSyncDepNotifications(): Promise<string[]> {
  const logs: string[] = [];
  try {
    const settings = settingsCache['sync_dep_config'];
    if (!settings) {
      logs.push("SyncDep: No settings found.");
      return logs;
    }
    
    const botToken = settings.tg_bot_token;
    const mondayChats = settings.tg_monday_chat_ids || [];
    const fridayChats = settings.tg_friday_chat_ids || [];
    const mondayThread = settings.tg_monday_thread_id;
    const fridayThread = settings.tg_friday_thread_id;
    
    if (!botToken) {
      logs.push("SyncDep: No bot token configured.");
      return logs;
    }

    const nowBishkek = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
    const currentHour = String(nowBishkek.getUTCHours()).padStart(2, '0');
    const currentMinute = String(nowBishkek.getUTCMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentDayOfWeek = nowBishkek.getUTCDay(); // 0-6 (0 is Sunday, 1 is Monday, 4 is Thursday, 5 is Friday)
    const currentDateStr = nowBishkek.toISOString().split('T')[0];

    logs.push(`SyncDep: Current time is ${currentTime}, Day: ${currentDayOfWeek}, Date: ${currentDateStr}`);

    const platformLink = "https://optima-control-hub-586446158181.us-west1.run.app/";

    // Monday 08:00
    if (currentDayOfWeek === 1 && currentTime >= '08:00') {
      const shouldSend = await db.runTransaction(async (t) => {
        const doc = await t.get(db.collection('settings').doc('sync_dep_config'));
        if (!doc.exists) return false;
        if (doc.data()?.lastMondayNotification !== currentDateStr) {
          t.update(db.collection('settings').doc('sync_dep_config'), { lastMondayNotification: currentDateStr });
          return true;
        }
        return false;
      });

      if (shouldSend) {
        // Calculate next Friday
        const nextFriday = new Date(nowBishkek);
        nextFriday.setDate(nowBishkek.getDate() + 4);
        const fridayDateStr = nextFriday.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const msg = `🌅 <b>Доброе утро коллеги!</b>\n\nПоздравляю всех с началом новой недели! Напоминаю, дедлайн действует до пятницы [${fridayDateStr}].\n\nПросьба внести свои задачи. Желаю всем продуктивной недели!\n\n🔗 <a href="${platformLink}">Платформа Sync Dep</a>`;
        
        for (const chatId of mondayChats) {
          await sendTelegramMessage(botToken, chatId, msg, mondayThread);
        }
      }
    }

    // Thursday 08:00
    if (currentDayOfWeek === 4 && currentTime >= '08:00') {
      const shouldSend = await db.runTransaction(async (t) => {
        const doc = await t.get(db.collection('settings').doc('sync_dep_config'));
        if (!doc.exists) return false;
        if (doc.data()?.lastThursdayNotification !== currentDateStr) {
          t.update(db.collection('settings').doc('sync_dep_config'), { lastThursdayNotification: currentDateStr });
          return true;
        }
        return false;
      });

      if (shouldSend) {
        const msg = `🌅 <b>Коллеги, доброе утро!</b>\n\nСкоро уже долгожданные выходные. Надеюсь вы уже внесли свои задачи или многие из них уже закрыты.\n\n🔗 <a href="${platformLink}">Платформа Sync Dep</a>`;
        
        for (const chatId of mondayChats) { // Assuming same chats as Monday
          await sendTelegramMessage(botToken, chatId, msg, mondayThread);
        }
      }
    }

    // Friday 08:00
    if (currentDayOfWeek === 5 && currentTime >= '08:00') {
      const shouldSend = await db.runTransaction(async (t) => {
        const doc = await t.get(db.collection('settings').doc('sync_dep_config'));
        if (!doc.exists) return false;
        if (doc.data()?.lastFridayNotification !== currentDateStr) {
          t.update(db.collection('settings').doc('sync_dep_config'), { lastFridayNotification: currentDateStr });
          return true;
        }
        return false;
      });

      if (shouldSend) {
        const msg = `🌅 <b>Доброе утро коллеги!</b>\n\nСудя по задачам вы большие молодцы. Ждем всех на синх сегодня в 10:30 как обычно.\n\n🔗 <a href="${platformLink}">Платформа Sync Dep</a>`;
        
        for (const chatId of fridayChats.length > 0 ? fridayChats : mondayChats) {
          await sendTelegramMessage(botToken, chatId, msg, fridayThread || mondayThread);
        }
      }
    }

    // Custom scheduled messages
    const customMessages = settings.custom_scheduled_messages || [];

    logs.push(`SyncDep: Found ${customMessages.length} custom messages.`);

    for (const msg of customMessages) {
      if (currentTime < msg.time) {
        logs.push(`SyncDep: Message ${msg.id} scheduled for ${msg.time} (future), skipping.`);
        continue;
      }
      
      let shouldSend = false;
      
      if (msg.dayOfWeek !== undefined) {
        // Weekly schedule
        if (msg.dayOfWeek === currentDayOfWeek && msg.lastSent !== currentDateStr) {
          shouldSend = true;
        } else {
          logs.push(`SyncDep: Message ${msg.id} dayOfWeek mismatch or already sent today.`);
        }
      } else if (msg.date) {
        // Specific date schedule
        if (msg.date === currentDateStr && msg.lastSent !== currentDateStr) {
          shouldSend = true;
        } else {
          logs.push(`SyncDep: Message ${msg.id} date mismatch or already sent today.`);
        }
      }

      if (shouldSend) {
        const actuallySend = await db.runTransaction(async (t) => {
          const doc = await t.get(db.collection('settings').doc('sync_dep_config'));
          if (!doc.exists) return false;
          const data = doc.data() as any;
          const currentMsgs = data.custom_scheduled_messages || [];
          const currentMsg = currentMsgs.find((m: any) => m.id === msg.id);
          if (currentMsg && currentMsg.lastSent !== currentDateStr) {
            currentMsg.lastSent = currentDateStr;
            t.update(db.collection('settings').doc('sync_dep_config'), { custom_scheduled_messages: currentMsgs });
            return true;
          }
          return false;
        });

        if (actuallySend) {
          logs.push(`SyncDep: Attempting to send message ${msg.id}...`);
          let allSuccess = true;
          for (const chatId of mondayChats) {
            const result = await sendTelegramMessage(botToken, chatId, msg.text, mondayThread);
            if (result.success) {
              logs.push(`SyncDep: Successfully sent to ${chatId}`);
            } else {
              allSuccess = false;
              logs.push(`SyncDep: Failed to send to ${chatId}. Error: ${JSON.stringify(result.error)}`);
            }
          }
          
          if (allSuccess && mondayChats.length > 0) {
            logs.push(`SyncDep: Message ${msg.id} sent successfully.`);
          } else {
            logs.push(`SyncDep: Message ${msg.id} had errors during sending.`);
          }
        }
      }
    }

  } catch (e: any) {
    logs.push(`SyncDep Error: ${e.message}`);
    console.error("SyncDep notifications error:", e);
  }
  return logs;
}

async function checkDutiesNotifications() {
  const logs: string[] = [];
  try {
    const settings = settingsCache['duties'];
    if (!settings) return logs;
    
    const botToken = settings.telegramBotToken;
    const chatId = settings.telegramChatId;
    const threadId = settings.telegramThreadId;
    const notificationTime = settings.notificationTime || '08:00';
    
    if (!botToken || !chatId) return logs;

    const nowBishkek = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
    const currentHour = String(nowBishkek.getUTCHours()).padStart(2, '0');
    const currentMinute = String(nowBishkek.getUTCMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentDateStr = nowBishkek.toISOString().split('T')[0];

    if (currentTime >= notificationTime) {
      // Check if already sent today
      const logRef = db.collection('settings').doc('duties_log');
      const logDoc = await logRef.get();
      const lastSent = logDoc.exists ? logDoc.data()?.lastSentDate : null;

      if (lastSent !== currentDateStr) {
        // Fetch today's duties
        const dutiesSnapshot = await db.collection('duties').where('date', '==', currentDateStr).get();
        if (!dutiesSnapshot.empty) {
          const duties = dutiesSnapshot.docs.map(d => d.data() as any);
          
          // Fetch users
          const usersSnapshot = await db.collection('users').get();
          const usersMap = new Map(usersSnapshot.docs.map(d => [d.id, d.data() as any]));

          // Group by duty type
          const dutiesByType: Record<string, any[]> = {};
          duties.forEach(duty => {
            if (!dutiesByType[duty.dutyTypeId]) {
              dutiesByType[duty.dutyTypeId] = [];
            }
            dutiesByType[duty.dutyTypeId].push(duty);
          });

          const formattedDate = nowBishkek.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
          let message = `🔔 <b>Дежурства на сегодня</b>\n🗓 <i>${formattedDate}</i>\n\n`;
          let hasDuties = false;

          settings.types.forEach((type: any) => {
            const typeDuties = dutiesByType[type.id];
            if (typeDuties && typeDuties.length > 0) {
              hasDuties = true;
              message += `<b>${type.name}</b>\n`;
              typeDuties.forEach(duty => {
                const user = usersMap.get(duty.userId);
                const userName = user ? user.name : 'Неизвестный';
                const tgUser = user?.telegramUsername ? ` <a href="https://t.me/${user.telegramUsername.replace('@', '')}">@${user.telegramUsername.replace('@', '')}</a>` : '';
                message += `👤 ${userName}${tgUser}\n`;
              });
              message += `\n`;
            }
          });
          
          if (hasDuties) {
            message += `<i>Желаем продуктивного дня!</i> 🚀`;
            const result = await sendTelegramMessage(botToken, chatId, message, threadId);
            if (result.success) {
              await logRef.set({ lastSentDate: currentDateStr }, { merge: true });
              logs.push(`Duties: Daily notification sent for ${currentDateStr}`);
            } else {
              logs.push(`Duties: Failed to send daily notification: ${result.error}`);
            }
          } else {
            logs.push(`Duties: No duties found for today.`);
            await logRef.set({ lastSentDate: currentDateStr }, { merge: true });
          }
        } else {
          logs.push(`Duties: No duties found for today.`);
          await logRef.set({ lastSentDate: currentDateStr }, { merge: true });
        }
      }
    }
  } catch (e: any) {
    logs.push(`Duties Error: ${e.message}`);
    console.error("Duties notifications error:", e);
  }
  return logs;
}

export async function sendPostCheckReportManual(type: 'daily' | 'weekly') {
  const settingsDoc = await db.collection('settings').doc('post_check').get();
  if (!settingsDoc.exists) throw new Error("Settings not found");
  
  const settings = settingsDoc.data() as any;
  const botToken = settings.telegramBotToken;
  const chats = type === 'daily' ? (settings.dailyTelegramChats || []) : (settings.weeklyTelegramChats || []);
  
  if (!botToken) throw new Error("Telegram bot token not configured");
  if (chats.length === 0) throw new Error(`No chats configured for ${type} report`);

  const nowBishkek = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
  await sendPostCheckReport(type, botToken, chats, nowBishkek);
}
