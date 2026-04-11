export interface SyncDepDepartment {
  id: string;
  name: string;
  description?: string;
  manager_id: string | null;
  manager?: SyncDepUser;
  color?: string;
  icon?: string;
  is_active: boolean;
  members_count?: number;
  tasks_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SyncDepUser {
  id: string;
  username: string;
  name: string;
  last_name?: string;
  email?: string;
  personal_email?: string;
  role: 'admin' | 'moderator' | 'employee';
  department_id?: string | null; // Deprecated, use department_ids
  department_ids: string[];
  department?: SyncDepDepartment; // Deprecated
  departments?: SyncDepDepartment[];
  position?: string;
  avatar_url?: string;
  phone?: string;
  personal_phone?: string;
  tg_username?: string;
  tg_user_id?: string;
  messenger_type?: 'whatsapp' | 'slack' | 'teams' | 'other';
  messenger_contact?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'not_specified';
  employment_type?: 'full_time' | 'part_time' | 'contractor' | 'intern';
  manager_id?: string;
  manager?: SyncDepUser;
  start_date?: string;
  notes?: string;
  language?: 'ru' | 'en' | 'ky';
  timezone?: string;
  notify_email: boolean;
  notify_tg: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  is_blocker: boolean;
  is_closing: boolean;
  is_default: boolean;
  is_active: boolean;
}

export interface SyncDepTask {
  id: string;
  title: string;
  description?: string;
  department_id: string;
  department?: SyncDepDepartment;
  status_id: string;
  status?: TaskStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline?: string;
  assignees?: SyncDepUser[];
  assignee_ids: string[];
  created_by: string;
  author?: SyncDepUser;
  blocker_reason?: string | null;
  tags: string[];
  linked_task_ids: string[];
  linked_tasks?: SyncDepTask[];
  is_archived: boolean;
  updates_count: number;
  last_update?: TaskUpdate;
  last_status_change?: StatusHistory;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
  checklists?: TaskChecklist[];
  has_blocker?: boolean;
  comments_count?: number;
  attachments_count?: number;
}

export interface TaskChecklist {
  id: string;
  title: string;
  items: TaskChecklistItem[];
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  is_completed: boolean;
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  author_id: string;
  author?: SyncDepUser;
  text: string;
  link?: string;
  attachments?: string[];
  mentions?: string[];
  reactions?: TaskReaction[];
  created_at: string;
}

export interface StatusHistory {
  id: string;
  task_id: string;
  author_id: string;
  author?: SyncDepUser;
  from_status_id: string | null;
  from_status?: TaskStatus;
  to_status_id: string;
  to_status?: TaskStatus;
  blocker_reason?: string | null;
  comment?: string | null;
  created_at: string;
}

export interface TaskReaction {
  id: string;
  update_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TaskProgressUpdate {
  id: string;
  task_id: string;
  author_id: string;
  author?: SyncDepUser;
  text: string;
  created_at: string;
}

export interface TaskBlocker {
  id: string;
  task_id: string;
  author_id: string;
  author?: SyncDepUser;
  reason: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: 'task_assigned' | 'status_changed' | 'update_added' |
        'deadline_today' | 'deadline_overdue' | 'blocker_added' |
        'mentioned' | 'help_request';
  task_id?: string;
  task?: SyncDepTask;
  actor_id?: string;
  actor?: SyncDepUser;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActionLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_role: string;
  action_type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED' |
               'STATUS_CHANGED' | 'UPDATE_ADDED' | 'TASK_ASSIGNED' |
               'USER_CREATED' | 'USER_UPDATED' | 'USER_DEACTIVATED' |
               'DEPARTMENT_CREATED' | 'STATUS_CONFIG_CHANGED' |
               'REPORT_SENT' | 'SETTINGS_CHANGED' | 'USER_LOGIN' |
               'HELP_REQUESTED';
  department_id?: string;
  department_name?: string;
  task_id?: string;
  details: string | Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface CustomScheduledMessage {
  id: string;
  text: string;
  dayOfWeek?: number; // 0-6
  date?: string; // YYYY-MM-DD
  time: string; // HH:mm
  lastSent?: string;
}

export interface NotificationSettings {
  tg_bot_token: string;
  tg_monday_chat_ids: string[];
  tg_monday_thread_id?: string;
  tg_friday_chat_ids: string[];
  tg_friday_thread_id?: string;
  tg_help_chat_ids: string[];
  monday_alert_hour: number;
  thursday_alert_hour: number;
  friday_report_hour: number;
  email_on_assign: boolean;
  email_on_status_change: boolean;
  email_on_deadline_today: boolean;
  push_notifications: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
  custom_scheduled_messages?: CustomScheduledMessage[];
}

export interface PermissionMatrix {
  [role: string]: {
    [action: string]: boolean;
  };
}
