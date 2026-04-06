
// ================= КОНФИГУРАЦИЯ =================
const BOT_TOKEN = "8441834306:AAFj9HFknfMX-MKJCZKoI5-JKQVcJF1rigA";

const SHEET_LOGS_NAME = "Лист1";   // Реестр инцидентов (основной лог)
const SHEET_CONFIG_NAME = "Лист2"; // Настройка чатов (A: ID, B: Thread)
const SHEET_AUDIT_NAME = "Лист3";  // История изменений (технический аудит)

/**
 * Основная точка входа (Webhook)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Ждем до 30 секунд, чтобы избежать коллизий при одновременных запросах (Locking)
  if (!lock.tryLock(30000)) {
    return createJsonResponse("error", "Server busy");
  }

  try {
    // 1. Парсинг входящих данных
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse("error", "No POST data received");
    }
    
    const jsonString = e.postData.contents;
    const data = JSON.parse(jsonString);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 3. Дедупликация и Аудит (Лист3)
    const auditSheet = getOrCreateSheet(ss, SHEET_AUDIT_NAME);
    
    // Проверка: не отправляли ли мы уже точно такое же уведомление только что?
    // Это предотвращает спам, если фронтенд отправит запрос дважды
    const isDuplicate = checkDuplicateEvent(auditSheet, data);

    // Фиксируем событие в аудите (даже если дубль, для отладки)
    appendAuditLog(auditSheet, data);

    // Получаем существующий Message ID (если есть)
    const logSheet = getOrCreateSheet(ss, SHEET_LOGS_NAME);
    let existingTgMsgId = "";
    if (logSheet.getLastRow() > 1) {
      const ids = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 1).getValues().flat();
      const idx = ids.indexOf(data.id);
      if (idx !== -1) {
        existingTgMsgId = logSheet.getRange(idx + 2, 14).getValue();
      }
    }

    // 4. Telegram Рассылка
    let tgResult = "Skipped";
    if (data.notifyTelegram && !isDuplicate) {
      const chatConfigs = getChatConfigs(ss);
      
      if (chatConfigs.length > 0) {
        // Генерируем новое сообщение по вашим требованиям (Новый дизайн)
        const message = formatTelegramMessage(data);
        
        // Отправляем во все настроенные чаты
        const results = chatConfigs.map(config => {
          const replyTo = (data.eventType !== 'created' && data.eventType !== 'auto_start') ? existingTgMsgId : null;
          const res = sendTelegramMessage(config.chatId, config.threadId, message, replyTo);
          if (res.success && (data.eventType === 'created' || data.eventType === 'auto_start') && !existingTgMsgId) {
             existingTgMsgId = res.messageId;
          }
          return res.success ? 'OK' : res.error;
        });
        tgResult = results.join("; ");
      } else {
        tgResult = "No chat IDs found on List2";
      }
    } else if (isDuplicate) {
      tgResult = "Duplicate prevented";
    }

    // 2. Логирование в основную таблицу (Лист1)
    // Сохраняем расширенные данные (включая Отдел и Каскад)
    if (data.id && !data.id.startsWith('test_')) {
      data.telegramMessageId = existingTgMsgId;
      updateOrAppendRow(logSheet, data);
    }

    // 5. Email Рассылка
    let emailResult = "Skipped";
    if (data.notifyEmail && data.emailRecipient && !isDuplicate) {
        try {
            sendEmail(data);
            emailResult = "Sent";
        } catch (err) {
            emailResult = "Error: " + err.toString();
        }
    }

    return createJsonResponse("success", { telegram: tgResult, email: emailResult });

  } catch (error) {
    // Глобальный перехват ошибок
    return createJsonResponse("error", error.toString());
  } finally {
    // Всегда снимаем блокировку
    lock.releaseLock();
  }
}

// ================= ЛОГИКА ЗАЩИТЫ ОТ ДУБЛЕЙ =================

function checkDuplicateEvent(sheet, data) {
  // Тестовые запросы не фильтруем
  if (!data.eventType || (data.id && data.id.startsWith('test_'))) return false;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  
  // Проверяем последние 20 записей в аудите для оптимизации скорости
  const range = sheet.getRange(Math.max(2, lastRow - 20), 1, Math.min(20, lastRow - 1), 3);
  const values = range.getValues();
  
  // Ищем точное совпадение ID и Типа события (например, issue_123 + auto_end)
  return values.some(row => row[1] == data.id && row[2] == data.eventType);
}

// ================= ОТПРАВКА СООБЩЕНИЙ (API) =================

function sendTelegramMessage(chatId, threadId, text, replyToMessageId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = { 
    chat_id: chatId, 
    text: text, 
    parse_mode: "HTML", 
    disable_web_page_preview: true 
  };
  
  // Поддержка топиков (Threads) в группах
  if (threadId && String(threadId).trim() !== "") {
    payload.message_thread_id = parseInt(threadId);
  }

  if (replyToMessageId) {
    payload.reply_to_message_id = parseInt(replyToMessageId);
  }

  try {
    const response = UrlFetchApp.fetch(url, { 
      method: "post", 
      contentType: "application/json", 
      payload: JSON.stringify(payload), 
      muteHttpExceptions: true 
    });
    
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return { success: true, messageId: json.result.message_id };
    } else {
      return { success: false, error: response.getContentText() };
    }
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function sendEmail(data) {
  let subjectPrefix = "";
  if (data.eventType === 'auto_start') subjectPrefix = "⚠️ [НАЧАЛО РАБОТ] ";
  else if (data.eventType === 'auto_end' || data.status === 'resolved') subjectPrefix = "✅ [ЗАВЕРШЕНО] ";
  else if (data.status === 'scheduled') subjectPrefix = "🗓 [ЗАПЛАНИРОВАНЫ РАБОТЫ] ";
  else subjectPrefix = "ℹ️ [ИНЦИДЕНТ] ";

  const subject = subjectPrefix + (data.title || "Без заголовка");
  const cascadeStr = formatCascadePath(data.cascadeValues);
  
  // HTML шаблон письма (обновлен под новые поля)
  const body = `
    <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px; color: #333;">
      <h2 style="color: #E30613; margin-top: 0; text-transform: uppercase;">${data.title}</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 5px 0; color: #777; width: 140px;">Статус:</td>
          <td style="padding: 5px 0; font-weight: bold;">${String(data.status).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #777;">Важность:</td>
          <td style="padding: 5px 0; font-weight: bold;">${(data.severityLabel || String(data.severity || 'info')).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #777;">Категория:</td>
          <td style="padding: 5px 0;">${data.category} / ${data.subcategory || '—'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #777;">Отв. Отдел:</td>
          <td style="padding: 5px 0;">${data.responsibleDepartment || '—'}</td>
        </tr>
        ${cascadeStr ? `
        <tr>
          <td style="padding: 5px 0; color: #777;">Тематика:</td>
          <td style="padding: 5px 0; background-color: #f9f9f9; padding-left: 5px;">${cascadeStr}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 5px 0; color: #777;">Зоны влияния:</td>
          <td style="padding: 5px 0;">${Array.isArray(data.affectedZones) ? data.affectedZones.join(", ") : data.affectedZones}</td>
        </tr>
      </table>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #E30613; margin-bottom: 20px;">
        <p style="margin: 0; white-space: pre-wrap; font-family: monospace;">${data.description}</p>
      </div>

      <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #fce4e4; border-radius: 8px; border: 2px dashed #E30613;">
        <span style="display: block; font-size: 12px; color: #E30613; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">ID Инцидента</span>
        <span style="font-size: 28px; font-weight: 900; color: #E30613; font-family: monospace; letter-spacing: 2px;">${data.readableId}</span>
      </div>

      <hr style="border: 0; border-top: 1px solid #eee;" />
      
      <div style="font-size: 11px; color: #999; display: flex; justify-content: space-between;">
        <span>Автор: ${data.authorName || 'Система'}</span>
      </div>
    </div>
  `;
  
  GmailApp.sendEmail(data.emailRecipient, subject, "", { htmlBody: body, name: "Optima Control Hub" });
}

// ================= ФОРМАТИРОВАНИЕ И УТИЛИТЫ =================

/**
 * Сборка строки каскада из объекта (l1...l5)
 */
function formatCascadePath(vals) {
  if (!vals) return null;
  // Handle both possible key formats (from frontend state 'l1' or schema 'level1')
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

function getSeverityLabel(data) {
  // If frontend sent a human-readable label, prefer that
  if (data.severityLabel) return String(data.severityLabel).toUpperCase();

  // Fallback to legacy hardcoded logic, or uppercase the ID for new custom ones
  const s = String(data.severity || 'INFO').toLowerCase();
  switch (s) {
    case 'critical': return 'КРИТИЧЕСКИЙ';
    case 'major': return 'СЕРЬЕЗНЫЙ';
    case 'minor': return 'НЕЗНАЧИТЕЛЬНЫЙ';
    case 'info': return 'ИНФО';
    default: return s.toUpperCase(); // Handles custom severities dynamically
  }
}

/**
 * Генерация текста сообщения для Telegram
 * Реализует структуру: Заголовок (Жирный Подч), Важность, ID (моно), Даты, Отдел, Зоны, Каскад, Описание (моно), Теги
 */
function formatTelegramMessage(data) {
  // Обработка тестового сообщения
  if (data.id && data.id.startsWith('test_')) {
    return `🔔 <b>ТЕСТ СВЯЗИ</b>\n\nСистема успешно подключена к Telegram.\nКанал связи: <code>Stable</code>`;
  }

  // Определение иконки и заголовка статуса
  let statusIcon = "ℹ️"; 
  
  if (data.eventType === 'auto_start') statusIcon = "⚠️"; 
  else if (data.eventType === 'auto_end') statusIcon = "🏁"; 
  else if (data.status === 'resolved') statusIcon = "✅"; 
  else if (data.status === 'scheduled') statusIcon = "🗓";
  else if (data.severity === 'critical') statusIcon = "🚨";
  else if (data.severity === 'major') statusIcon = "🟠";

  const formatD = (d) => {
    try { 
      return d ? new Date(d).toLocaleString("ru-RU", {timeZone: "Asia/Bishkek", hour:'2-digit', minute:'2-digit', day:'numeric', month:'short'}) : "-"; 
    } catch (e) { return "-"; }
  };

  const zones = Array.isArray(data.affectedZones) ? data.affectedZones.join(", ") : (data.affectedZones || "Все системы");
  const tags = Array.isArray(data.tags) ? data.tags.map(t => `#${t.replace(/\s+/g,'')}`).join(" ") : "";
  const cascadeStr = formatCascadePath(data.cascadeValues);
  const severityStr = getSeverityLabel(data);

  // Формирование сообщения
  let msg = "";

  // 1. ЗАГОЛОВОК: Жирный, Подчеркнутый, Заглавный
  const titleUpper = (data.title || "БЕЗ ЗАГОЛОВКА").toUpperCase();
  msg += `<u><b>${statusIcon} ${titleUpper}</b></u>\n`;
  
  if (data.status === 'resolved' || data.eventType === 'auto_end') {
      msg += `<b>✅ ИНЦИДЕНТ ЗАВЕРШЕН</b>\n\n`;
  } else {
      // 2. СЕРЬЕЗНОСТЬ и КАТЕГОРИЯ: Жирный (Под заголовком)
      msg += `<b>${severityStr} | ${(data.category || "ОБЩЕЕ").toUpperCase()}</b>\n\n`;
  }

  // 3. ID: Моноширинный выделенный
  msg += `🆔 ID: <code>${data.readableId}</code>\n`;

  // 4. ДАТЫ
  msg += `🕒 Начало: ${formatD(data.scheduledStart)}\n`;
  if (data.status === 'resolved' || data.eventType === 'auto_end') {
      msg += `🏁 Завершено: ${formatD(data.resolvedAt || new Date())}\n`;
  } else if (data.scheduledEnd) {
      msg += `⏳ План. устр.: ${formatD(data.scheduledEnd)}\n`;
  }

  // 5. ОТДЕЛ (если есть) - Перед Зонами
  if (data.responsibleDepartment) {
      msg += `🏢 Отдел: <b>${data.responsibleDepartment}</b>\n`;
  }

  // 6. ЗОНЫ ВЛИЯНИЯ
  msg += `🌍 Зоны: <code>${zones}</code>\n`;

  msg += `━━━━━━━━━━━━━━━━━━\n`;

  // 7. ОПИСАНИЕ (Моноширинный блок)
  msg += `📝 <b>Детали:</b>\n`;
  // Используем <pre> для моноширинного блока текста в Telegram
  msg += `<pre>${data.description}</pre>\n\n`;

  // 8. ОТМЕЧАЕМАЯ ТЕМАТИКА (Каскад) - в самом низу перед тегами
  if (cascadeStr) {
      msg += `📍 <b>Тематика:</b>\n<code>${cascadeStr}</code>\n\n`;
  }

  // 9. ТЕГИ
  if (tags) {
      msg += `${tags} #OptimaStatus #Hub`;
  } else {
      msg += `#OptimaStatus #Hub`;
  }

  return msg;
}

// ================= РАБОТА С ТАБЛИЦАМИ =================

function getChatConfigs(ss) {
  const sheet = getOrCreateSheet(ss, SHEET_CONFIG_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // Если только заголовок или пусто
  
  // Читаем столбцы A (Chat ID) и B (Thread ID)
  return sheet.getRange(2, 1, lastRow - 1, 2).getValues()
    .filter(r => r[0]) // Фильтруем пустые строки
    .map(r => ({ chatId: String(r[0]).trim(), threadId: r[1] }));
}

function updateOrAppendRow(sheet, data) {
  const lastRow = sheet.getLastRow();
  
  // Если таблица пустая, создаем заголовки (включая новые поля)
  if (lastRow === 0) {
    sheet.appendRow([
      "ID", "Readable ID", "Updated", "Status", "Title", "Severity", 
      "Category", "Zones", "Start", "End", "Description", 
      "Resp. Dept", "Cascade", "Telegram Message ID" // Новые колонки 12, 13, 14
    ]);
    sheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#f3f3f3");
  }
  
  // Подготовка строки данных
  const cascadeStr = formatCascadePath(data.cascadeValues) || "";
  
  const rowData = [
    data.id, 
    data.readableId, 
    new Date().toLocaleString("ru-RU", {timeZone: "Asia/Bishkek"}), 
    data.status, 
    data.title, 
    getSeverityLabel(data), // Save human readable label instead of just ID if possible
    `${data.category}/${data.subcategory||''}`, 
    Array.isArray(data.affectedZones) ? data.affectedZones.join(", ") : data.affectedZones,
    data.scheduledStart, 
    data.scheduledEnd, 
    data.description,
    data.responsibleDepartment || "", // Col 12
    cascadeStr,                       // Col 13
    data.telegramMessageId || ""      // Col 14
  ];

  // Поиск существующей строки по ID
  let foundRowIndex = -1;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const idx = ids.indexOf(data.id);
    if (idx !== -1) foundRowIndex = idx + 2; // +2 т.к. массив с 0, а строки с 1 + заголовок
  }
  
  if (foundRowIndex !== -1) {
    // Обновляем существующую
    if (!data.telegramMessageId) {
      rowData[13] = sheet.getRange(foundRowIndex, 14).getValue();
    }
    sheet.getRange(foundRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Добавляем новую
    sheet.appendRow(rowData);
  }
}

function appendAuditLog(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(["Timestamp", "ID", "Event Type", "Status", "Title", "Author"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e6e6e6");
  }
  sheet.appendRow([
    new Date().toLocaleString("ru-RU", {timeZone: "Asia/Bishkek"}), 
    data.id, 
    data.eventType || 'manual_update', 
    data.status, 
    data.title, 
    data.authorName || 'System'
  ]);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function createJsonResponse(status, message) {
  const out = { status: status };
  if (typeof message === 'string') out.message = message;
  else Object.assign(out, message);
  
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
