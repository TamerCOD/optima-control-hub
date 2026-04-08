import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { SyncDepDepartment, SyncDepTask, SyncDepUser } from '../../types/core.types';
import { db } from '../../../../firebase';

import { generateUniqueTaskId } from '../../utils/taskUtils';

export const ImportTab: React.FC = () => {
  const { departments, statuses, users, allUsers, tasks, deleteAllTasks } = useTasksStore();
  const { currentUser } = useAuthStore();
  
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const tasksFileInputRef = useRef<HTMLInputElement>(null);
  const usersFileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    setImportLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const downloadTasksTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Название', 'Описание', 'Отдел', 'Приоритет (Критический, Высокий, Средний, Низкий)', 'Дедлайн (YYYY-MM-DD)', 'Исполнители (Email через запятую)', 'Статус', 'Блокер', 'Апдейты (каждый с новой строки)', 'Автор (Email)', 'Дата создания (YYYY-MM-DD)']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Задачи');
    XLSX.writeFile(wb, 'tasks_template.xlsx');
  };

  const downloadUsersTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Email', 'Отдел', 'Роль (админ, модератор, сотрудник)']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Сотрудники');
    XLSX.writeFile(wb, 'users_template.xlsx');
  };

  const handleTasksImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportLogs(['Начало импорта задач...']);

    const parseExcelDate = (dateVal: any): string | undefined => {
      if (!dateVal) return undefined;
      if (typeof dateVal === 'number' || !isNaN(Number(dateVal))) {
        const num = Number(dateVal);
        if (num > 59) {
          const date = new Date(Math.round((num - 25569) * 86400 * 1000));
          if (!isNaN(date.getTime())) return date.toISOString();
        }
      }
      const date = new Date(dateVal);
      if (!isNaN(date.getTime())) return date.toISOString();
      return undefined;
    };

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const defaultStatus = statuses.find(s => s.is_default) || statuses[0];
      if (!defaultStatus) {
        addLog('Ошибка: Нет статуса по умолчанию для задач.');
        setIsImporting(false);
        return;
      }

      const departmentOffsets: Record<string, number> = {};
      let skipCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const title = row[0]?.toString();
        const description = row[1]?.toString() || '';
        const depName = row[2]?.toString();
        const priorityStr = row[3]?.toString()?.toLowerCase();
        const deadline = parseExcelDate(row[4]);
        const assigneesStr = row[5]?.toString() || '';
        const statusStr = row[6]?.toString() || '';
        const blockerStr = row[7]?.toString() || '';
        const updatesStr = row[8]?.toString() || '';
        const creatorStr = row[9]?.toString() || '';
        const createdAtStr = row[10];

        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (priorityStr?.includes('критич')) priority = 'critical';
        else if (priorityStr?.includes('высок')) priority = 'high';
        else if (priorityStr?.includes('низк')) priority = 'low';

        let department = departments.find(d => d.name.toLowerCase() === depName?.toLowerCase());
        if (!department && depName) {
          addLog(`Отдел "${depName}" не найден. Создаем новый...`);
          const newDep: SyncDepDepartment = {
            id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: depName,
            color: '#3b82f6',
            manager_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await db.collection('sync_dep_departments').doc(newDep.id).set(newDep);
          department = newDep;
          // Optimistically update local state for the next rows
          departments.push(newDep);
        }

        if (!department) {
          addLog(`Ошибка: Строка ${i + 1} пропущена. Не указан отдел.`);
          continue;
        }

        const assigneeEmails = assigneesStr.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
        let assignee_ids = allUsers.filter(u => assigneeEmails.includes(u.email.toLowerCase())).map(u => u.id);
        
        let statusId = defaultStatus.id;
        if (statusStr) {
            const foundStatus = statuses.find(s => s.name.toLowerCase() === statusStr.trim().toLowerCase());
            if (foundStatus) statusId = foundStatus.id;
        }

        const blocker_reason = blockerStr ? blockerStr.trim() : null;
        const has_blocker = !!blocker_reason;

        const updates = updatesStr ? updatesStr.split('\n').map((u: string) => u.trim()).filter(Boolean) : [];

        const created_at = parseExcelDate(createdAtStr) || new Date().toISOString();

        let created_by = currentUser?.id || 'system';
        if (creatorStr) {
            const creator = allUsers.find(u => u.email.toLowerCase() === creatorStr.trim().toLowerCase());
            if (creator) created_by = creator.id;
        }

        if (assignee_ids.length === 0 && created_by !== 'system') {
            assignee_ids.push(created_by);
        }

        // Duplicate check
        const isDuplicate = tasks.some(t => 
            t.title === title &&
            t.description === description &&
            t.department_id === department?.id &&
            t.priority === priority &&
            t.deadline === deadline &&
            t.created_by === created_by &&
            JSON.stringify(t.assignee_ids.sort()) === JSON.stringify(assignee_ids.sort())
        );

        if (isDuplicate) {
            addLog(`Задача "${title}" пропущена (уже добавлена).`);
            skipCount++;
            continue;
        }

        const currentOffset = departmentOffsets[department.id] || 0;
        const newTaskId = generateUniqueTaskId(department.id, tasks, departments, currentOffset);
        departmentOffsets[department.id] = currentOffset + 1;

        const newTask: SyncDepTask = {
          id: newTaskId,
          title,
          description,
          department_id: department.id,
          status_id: statusId,
          priority,
          deadline: deadline || undefined,
          assignees: [],
          assignee_ids,
          created_by,
          tags: [],
          linked_task_ids: [],
          is_archived: false,
          updates_count: updates.length,
          is_overdue: false,
          blocker_reason,
          has_blocker,
          created_at,
          updated_at: new Date().toISOString()
        };

        await db.collection('sync_dep_tasks').doc(newTask.id).set(newTask);
        
        for (const updateText of updates) {
            const updateId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await db.collection('sync_dep_tasks').doc(newTask.id).collection('updates').doc(updateId).set({
                id: updateId,
                task_id: newTask.id,
                author_id: created_by,
                text: updateText,
                created_at: created_at
            });
        }

        addLog(`Задача "${title}" успешно импортирована.`);
      }

      addLog('Импорт задач завершен.');
    } catch (error: any) {
      addLog(`Ошибка при импорте: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (tasksFileInputRef.current) tasksFileInputRef.current.value = '';
    }
  };

  const handleUsersImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportLogs(['Начало импорта сотрудников...']);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const email = row[0]?.toString()?.trim()?.toLowerCase();
        const depName = row[1]?.toString()?.trim();
        const roleStr = row[2]?.toString()?.trim()?.toLowerCase();

        if (!email) continue;

        const platformUser = allUsers.find(u => u.email?.toLowerCase() === email);
        if (!platformUser) {
          addLog(`Ошибка: Пользователь с email "${email}" не найден в общей базе.`);
          continue;
        }

        let role: 'admin' | 'moderator' | 'employee' = 'employee';
        if (roleStr === 'админ' || roleStr === 'admin') role = 'admin';
        else if (roleStr === 'модератор' || roleStr === 'moderator') role = 'moderator';
        else if (roleStr === 'сотрудник' || roleStr === 'employee') role = 'employee';
        else if (roleStr) {
          addLog(`Предупреждение: Роль "${roleStr}" не существует. Назначена роль "сотрудник".`);
        }

        let department = departments.find(d => d.name.toLowerCase() === depName?.toLowerCase());
        if (!department && depName) {
          addLog(`Отдел "${depName}" не найден. Создаем новый...`);
          const newDep: SyncDepDepartment = {
            id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: depName,
            color: '#3b82f6',
            manager_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await db.collection('sync_dep_departments').doc(newDep.id).set(newDep);
          department = newDep;
          departments.push(newDep);
        }

        const syncDepUser: Partial<SyncDepUser> = {
          department_ids: department?.id ? [department.id] : [],
          role
        };

        const existingSyncDepUser = users.find(u => u.id === platformUser.id);
        const existingDepIds = existingSyncDepUser?.department_ids || (existingSyncDepUser?.department_id ? [existingSyncDepUser.department_id] : []);
        const newDepIds = syncDepUser.department_ids || [];
        
        const hasSameDepartments = existingDepIds.length === newDepIds.length && existingDepIds.every(id => newDepIds.includes(id));

        if (existingSyncDepUser && hasSameDepartments && existingSyncDepUser.role === syncDepUser.role) {
            addLog(`Сотрудник ${platformUser.name || email} пропущен (уже добавлен с такими же данными).`);
            continue;
        }

        await db.collection('sync_dep_users').doc(platformUser.id).set(syncDepUser, { merge: true });
        addLog(`Сотрудник ${platformUser.name || email} успешно импортирован/обновлен.`);
      }

      addLog('Импорт сотрудников завершен.');
    } catch (error: any) {
      addLog(`Ошибка при импорте: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (usersFileInputRef.current) usersFileInputRef.current.value = '';
    }
  };

  const handleDeleteAllTasks = async () => {
    if (window.confirm('ВНИМАНИЕ! Вы уверены, что хотите удалить ВСЕ задачи? Это действие нельзя отменить.')) {
      setIsDeleting(true);
      try {
        await deleteAllTasks();
        addLog('Все задачи успешно удалены.');
      } catch (error: any) {
        addLog(`Ошибка при удалении задач: ${error.message}`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Import */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Импорт задач</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Массовая загрузка задач из Excel файла. Скачайте шаблон, заполните его и загрузите обратно.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={downloadTasksTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Download size={18} />
              Скачать шаблон задач
            </button>
            
            <label className={`flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-colors cursor-pointer ${isImporting || isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'}`}>
              <Upload size={18} />
              {isImporting ? 'Импорт...' : 'Загрузить задачи'}
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={tasksFileInputRef}
                onChange={handleTasksImport}
                disabled={isImporting || isDeleting}
              />
            </label>

            <button
              onClick={handleDeleteAllTasks}
              disabled={isImporting || isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-2 mt-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              <AlertCircle size={18} />
              {isDeleting ? 'Удаление...' : 'Удалить все задачи'}
            </button>
          </div>
        </div>

        {/* Users Import */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Импорт сотрудников</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Массовое добавление сотрудников из Excel файла. Почта должна совпадать с почтой на платформе.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={downloadUsersTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Download size={18} />
              Скачать шаблон сотрудников
            </button>
            
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              <Upload size={18} />
              Загрузить сотрудников
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={usersFileInputRef}
                onChange={handleUsersImport}
                disabled={isImporting}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Logs */}
      {importLogs.length > 0 && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-zinc-500" />
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Логи импорта</h3>
            <button 
              onClick={() => setImportLogs([])}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Очистить
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
            {importLogs.map((log, index) => (
              <div key={index} className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
