import { SyncDepDepartment, SyncDepUser, TaskStatus, SyncDepTask, ActionLog, AppNotification } from '../types/core.types';

export const mockDepartments: SyncDepDepartment[] = [
  { id: 'd1', name: 'Маркетинг', manager_id: 'u2', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', color: '#ec4899', icon: '🎯' },
  { id: 'd2', name: 'Продажи', manager_id: 'u3', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', color: '#3b82f6', icon: '📈' },
  { id: 'd3', name: 'ИТ-отдел', manager_id: 'u4', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', color: '#8b5cf6', icon: '💻' },
  { id: 'd4', name: 'HR', manager_id: 'u5', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', color: '#10b981', icon: '🤝' },
];

export const mockUsers: SyncDepUser[] = [
  { id: 'u1', username: 'admin', name: 'Иван Петров', role: 'admin', department_ids: [], department_id: null, is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'admin@corp.com', avatar_url: 'https://i.pravatar.cc/150?u=1' },
  { id: 'u2', username: 'anna_m', name: 'Анна Сидорова', role: 'moderator', department_ids: ['d1'], department_id: 'd1', department: mockDepartments[0], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'anna@corp.com', position: 'Head of Marketing', avatar_url: 'https://i.pravatar.cc/150?u=2' },
  { id: 'u3', username: 'sergey_s', name: 'Сергей Иванов', role: 'moderator', department_ids: ['d2'], department_id: 'd2', department: mockDepartments[1], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'sergey@corp.com', position: 'Head of Sales', avatar_url: 'https://i.pravatar.cc/150?u=3' },
  { id: 'u4', username: 'pavel_it', name: 'Павел Смирнов', role: 'employee', department_ids: ['d3'], department_id: 'd3', department: mockDepartments[2], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'pavel@corp.com', position: 'Senior Developer', avatar_url: 'https://i.pravatar.cc/150?u=4' },
  { id: 'u5', username: 'elena_hr', name: 'Елена Козлова', role: 'employee', department_ids: ['d4'], department_id: 'd4', department: mockDepartments[3], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'elena@corp.com', position: 'HR Manager', avatar_url: 'https://i.pravatar.cc/150?u=5' },
  { id: 'u6', username: 'dmitry_m', name: 'Дмитрий Волков', role: 'employee', department_ids: ['d1'], department_id: 'd1', department: mockDepartments[0], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'dmitry@corp.com', position: 'Marketing Specialist', avatar_url: 'https://i.pravatar.cc/150?u=6' },
  { id: 'u7', username: 'alina_s', name: 'Алина Морозова', role: 'employee', department_ids: ['d2'], department_id: 'd2', department: mockDepartments[1], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'alina@corp.com', position: 'Sales Manager', avatar_url: 'https://i.pravatar.cc/150?u=7' },
  { id: 'u8', username: 'igor_it', name: 'Игорь Новиков', role: 'employee', department_ids: ['d3'], department_id: 'd3', department: mockDepartments[2], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'igor@corp.com', position: 'Frontend Developer', avatar_url: 'https://i.pravatar.cc/150?u=8' },
  { id: 'u9', username: 'olga_hr', name: 'Ольга Соколова', role: 'employee', department_ids: ['d4'], department_id: 'd4', department: mockDepartments[3], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'olga@corp.com', position: 'Recruiter', avatar_url: 'https://i.pravatar.cc/150?u=9' },
  { id: 'u10', username: 'maxim_s', name: 'Максим Лебедев', role: 'employee', department_ids: ['d2'], department_id: 'd2', department: mockDepartments[1], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'maxim@corp.com', position: 'Sales Manager', avatar_url: 'https://i.pravatar.cc/150?u=10' },
  { id: 'u11', username: 'yulia_m', name: 'Юлия Попова', role: 'employee', department_ids: ['d1'], department_id: 'd1', department: mockDepartments[0], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'yulia@corp.com', position: 'SMM Specialist', avatar_url: 'https://i.pravatar.cc/150?u=11' },
  { id: 'u12', username: 'artem_it', name: 'Артем Кузнецов', role: 'employee', department_ids: ['d3'], department_id: 'd3', department: mockDepartments[2], is_active: true, notify_email: true, notify_tg: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', email: 'artem@corp.com', position: 'Backend Developer', avatar_url: 'https://i.pravatar.cc/150?u=12' },
];

export const mockStatuses: TaskStatus[] = [
  { id: 's1', name: 'Новая', color: '#3b82f6', icon: '🆕', order: 1, is_blocker: false, is_closing: false, is_default: true, is_active: true },
  { id: 's2', name: 'В работе', color: '#f59e0b', icon: '🔄', order: 2, is_blocker: false, is_closing: false, is_default: false, is_active: true },
  { id: 's3', name: 'На ревью', color: '#8b5cf6', icon: '👀', order: 3, is_blocker: false, is_closing: false, is_default: false, is_active: true },
  { id: 's4', name: 'Блокер', color: '#ef4444', icon: '🚫', order: 4, is_blocker: true, is_closing: false, is_default: false, is_active: true },
  { id: 's5', name: 'На паузе', color: '#64748b', icon: '⏸', order: 5, is_blocker: false, is_closing: false, is_default: false, is_active: true },
  { id: 's6', name: 'Выполнена', color: '#10b981', icon: '✅', order: 6, is_blocker: false, is_closing: true, is_default: false, is_active: true },
  { id: 's7', name: 'Отменена', color: '#9ca3af', icon: '❌', order: 7, is_blocker: false, is_closing: true, is_default: false, is_active: true },
];

// Generate 40+ tasks
export const mockTasks: SyncDepTask[] = Array.from({ length: 45 }).map((_, i) => {
  const dept = mockDepartments[i % 4];
  const status = mockStatuses[i % 7];
  const assignee = mockUsers.find(u => u.department_ids?.includes(dept.id)) || mockUsers[1];
  const isOverdue = i % 5 === 0 && !status.is_closing;
  
  return {
    id: `t${i + 1}`,
    title: `Задача ${i + 1}: ${['Подготовка презентации', 'Анализ рынка', 'Разработка фичи', 'Собеседование', 'Отчет Q4'][i % 5]}`,
    description: 'Описание задачи с деталями...',
    department_id: dept.id,
    department: dept,
    status_id: status.id,
    status: status,
    priority: ['critical', 'high', 'medium', 'low'][i % 4] as any,
    deadline: isOverdue ? '2025-01-01' : '2026-12-31',
    assignees: [assignee],
    assignee_ids: [assignee.id],
    created_by: 'u1',
    author: mockUsers[0],
    blocker_reason: status.is_blocker ? 'Ждем ответ от клиента' : null,
    tags: ['Q4', 'Срочно', 'Клиент X'].slice(0, (i % 3) + 1),
    linked_task_ids: [],
    is_archived: false,
    updates_count: i % 4,
    is_overdue: isOverdue,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
  };
});

export const mockLogs: ActionLog[] = [];
export const mockNotifications: AppNotification[] = [];
