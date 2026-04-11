
import { db } from '../firebase';
import { MassIssue, IssueStatus, IssueSettings } from '../types';

let cachedIssues: any[] | null = null;
let isCacheInitialized = false;

const initCache = () => {
    return new Promise((resolve) => {
        db.collection('mass_issues')
            .where('status', 'in', ['scheduled', 'open', 'investigating'])
            .onSnapshot(snap => {
                cachedIssues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (!isCacheInitialized) {
                    isCacheInitialized = true;
                    resolve(true);
                }
            });
    });
};

export const runIssueAutomation = async (cachedSettings?: any) => {
  console.log('Running Automation Logic (Safe Transaction)...', new Date().toISOString());
  try {
    const now = new Date();

    // 2. Query candidates (only non-resolved)
    if (!isCacheInitialized) {
        await initCache();
    }

    if (!cachedIssues || cachedIssues.length === 0) return { updated: 0, message: 'Нет активных инцидентов.' };

    let count = 0;
    const results: any[] = [];

    // Используем транзакцию для КАЖДОГО инцидента по отдельности, чтобы не блокировать всё сразу
    for (const issueData of cachedIssues) {
        const start = issueData.scheduledStart ? new Date(issueData.scheduledStart) : null;
        const end = issueData.scheduledEnd ? new Date(issueData.scheduledEnd) : null;
        
        let needsUpdate = false;
        let preEventType: 'auto_start' | 'auto_end' | null = null;

        if (issueData.status === 'scheduled' && start && start <= now) {
            if (end && end <= now) preEventType = 'auto_end';
            else preEventType = 'auto_start';
        } else if ((issueData.status === 'open' || issueData.status === 'investigating') && end && end <= now) {
            preEventType = 'auto_end';
        }

        const preNotified = issueData.notifiedEvents || [];
        if (preEventType && !preNotified.includes(preEventType)) {
            needsUpdate = true;
        }

        if (!needsUpdate) continue;
        
        const issueId = issueData.id;
        
        const updated = await db.runTransaction(async (transaction) => {
            const issueRef = db.collection('mass_issues').doc(issueId);
            const freshDoc = await transaction.get(issueRef);
            if (!freshDoc.exists) return false;

            const issue = freshDoc.data() as MassIssue;
            const notified = issue.notifiedEvents || [];
            
            let newStatus: IssueStatus | null = null;
            let eventType: 'auto_start' | 'auto_end' | null = null;

            const start = issue.scheduledStart ? new Date(issue.scheduledStart) : null;
            const end = issue.scheduledEnd ? new Date(issue.scheduledEnd) : null;

            // Проверка на авто-старт
            if (issue.status === 'scheduled' && start && start <= now) {
                if (end && end <= now) {
                    newStatus = 'resolved';
                    eventType = 'auto_end'; 
                } else {
                    newStatus = 'open';
                    eventType = 'auto_start';
                }
            } 
            // Проверка на авто-завершение
            else if ((issue.status === 'open' || issue.status === 'investigating') && end && end <= now) {
                newStatus = 'resolved'; 
                eventType = 'auto_end';
            }

            // КРИТИЧЕСКИЙ ЧЕК: Если событие уже обработано другой вкладкой - выходим из транзакции
            if (eventType && !notified.includes(eventType)) {
                const updates: any = { 
                    updatedAt: now.toISOString(),
                    notifiedEvents: [...notified, eventType]
                };

                if (newStatus) {
                    updates.status = newStatus;
                    if (newStatus === 'resolved') {
                        updates.resolvedAt = end ? end.toISOString() : now.toISOString();
                    }
                }
                
                transaction.update(issueRef, updates);
                
                // Подготовка данных для уведомления
                return { 
                    ...issue, 
                    id: issueId,
                    ...updates,
                    eventType: eventType
                };
            }
            return null;
        });
        
        if (updated) {
            results.push(updated);
            count++;
        }
    }

    if (count > 0) {
        // Отправляем уведомления только после успешного завершения всех транзакций
        const baseUrl = typeof window !== 'undefined' ? '' : `http://localhost:${process.env.PORT || 3000}`;
        for (const payload of results) {
            try {
                await fetch(`${baseUrl}/api/issues/notify`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        issue: payload,
                        eventType: payload.eventType
                    })
                });
            } catch (e) { 
                console.error("Webhook Error:", e); 
            }
        }
        return { updated: count, message: `Статусы обновлены: ${count}` };
    }

    return { updated: 0, message: 'Статусы актуальны.' };

  } catch (e: any) {
      console.error("Critical Automation Error:", e);
      return { updated: 0, message: 'Ошибка автоматизации: ' + e.message };
  }
};
