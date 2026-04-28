import { db } from '../firebase';
import { MassIssue, IssueSettings } from '../types';
import { sendTelegramMessage } from './cron';

function formatCascadePath(vals: any) {
  if (!vals) return null;
  const path = [
    vals.l1 || vals.level1, 
    vals.l2 || vals.level2, 
    vals.l3 || vals.level3, 
    vals.l4 || vals.level4, 
    vals.l5 || vals.level5
  ].filter(Boolean);
  
  if (path.length === 0) return null;
  return path.join(' - ');
}

function getSeverityLabel(severity: string, severityLabel?: string) {
  if (severityLabel) return String(severityLabel).toUpperCase();
  const s = String(severity || 'INFO').toLowerCase();
  switch (s) {
    case 'critical': return 'КРИТИЧЕСКИЙ';
    case 'major': return 'СЕРЬЕЗНЫЙ';
    case 'minor': return 'НЕЗНАЧИТЕЛЬНЫЙ';
    case 'info': return 'ИНФО';
    default: return s.toUpperCase();
  }
}

export async function notifyIssueTelegram(issue: MassIssue, eventType: string) {
  try {
    const settingsDoc = await db.collection('settings').doc('issues').get();
    if (!settingsDoc.exists) return;
    const settings = settingsDoc.data() as IssueSettings;

    if (!settings.telegram || !settings.telegram.botToken || !settings.telegram.chats || settings.telegram.chats.length === 0) {
      console.log("Telegram settings not configured for mass issues.");
      return;
    }

    const isClosed = issue.status === 'resolved' || eventType === 'auto_end';

    let msg = "";

    const formatD = (d: any) => {
      try { 
        return d ? new Date(d).toLocaleString("ru-RU", {timeZone: "Asia/Bishkek", hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'}) : "-"; 
      } catch (e) { return "-"; }
    };

    const zones = Array.isArray(issue.affectedZones) ? issue.affectedZones.join(", ") : (issue.affectedZones || "Все системы");
    const tags = Array.isArray(issue.tags) ? issue.tags.map(t => `#${t.replace(/\s+/g,'')}`).join(" ") : "";
    const cascadeStr = formatCascadePath(issue.cascadeValues);
    const severityStr = getSeverityLabel(issue.severity, (issue as any).severityLabel);
    const titleUpper = (issue.title || "БЕЗ ЗАГОЛОВКА").toUpperCase();

    let statusIcon = "ℹ️"; 
    if (isClosed) statusIcon = "✅";
    else if (eventType === 'auto_start') statusIcon = "⚠️"; 
    else if (issue.status === 'scheduled') statusIcon = "🗓";
    else if (issue.severity === 'critical') statusIcon = "🚨";
    else if (issue.severity === 'major') statusIcon = "🟠";

    if (isClosed) {
      msg += `<u><b>ИНЦИДЕНТ ЗАКРЫТ</b></u>\n\n`;
    }

    msg += `<u><b>${statusIcon} ${titleUpper}</b></u>\n`;
    msg += `<b>${severityStr} | ${(issue.category || "ОБЩЕЕ").toUpperCase()}</b>\n\n`;
    msg += `🆔 ID: <code>${issue.readableId}</code>\n`;
    msg += `🕒 Начало: ${formatD(issue.scheduledStart)}\n`;
    
    if (isClosed && issue.resolvedAt) {
        msg += `✅ Завершено: ${formatD(issue.resolvedAt)}\n`;
    } else if (issue.scheduledEnd) {
        msg += `⏳ План. устр.: ${formatD(issue.scheduledEnd)}\n`;
    }

    if (issue.responsibleDepartment) {
        msg += `🏢 Отдел: <b>${issue.responsibleDepartment}</b>\n`;
    }
    msg += `🌍 Зоны: <code>${zones}</code>\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `📝 <b>Детали:</b>\n<pre>${issue.description || 'Инцидент успешно устранен.'}</pre>\n\n`;
    
    if (cascadeStr) {
        msg += `📍 <b>Тематика:</b>\n<code>${cascadeStr}</code>\n\n`;
    }
    
    if (tags) {
        msg += `${tags} #OptimaStatus #Hub`;
    } else {
        msg += `#OptimaStatus #Hub`;
    }

    const newTelegramMessageIds: Record<string, string> = { ...(issue.telegramMessageIds || {}) };
    let hasUpdates = false;

    for (const chat of settings.telegram.chats) {
      if (!chat.chatId) continue;
      
      // Get the replyTo ID for this specific chat
      let replyTo = undefined;
      if (eventType !== 'created' && eventType !== 'auto_start') {
        replyTo = issue.telegramMessageIds?.[chat.chatId] || issue.telegramMessageId;
      }

      const result = await sendTelegramMessage(
        settings.telegram.botToken,
        chat.chatId,
        msg,
        chat.threadId,
        undefined,
        undefined,
        replyTo
      );

      if (result.success && result.messageId && (eventType === 'created' || eventType === 'auto_start')) {
        // If we don't already have a message ID for this chat, save it
        if (!newTelegramMessageIds[chat.chatId]) {
          newTelegramMessageIds[chat.chatId] = result.messageId.toString();
          hasUpdates = true;
        }
      }
    }

    if (hasUpdates && issue.id !== 'test_1') {
      await db.collection('mass_issues').doc(issue.id).update({
        telegramMessageIds: newTelegramMessageIds
      });
    }

  } catch (error) {
    console.error("Error in notifyIssueTelegram:", error);
  }
}
