
export enum UserRole {
  SUPER_ADMIN = 'admin',
  TRAINING_DEPT = 'training_dept',
  MANAGEMENT = 'supervisor',
  UNIT_HEAD = 'unit_head',
  SENIOR = 'senior_specialist',
  EMPLOYEE = 'employee',
  NEWCOMER = 'newcomer',
  PROJECT_MANAGER = 'project_manager',
  DEVELOPER = 'developer',
  DESIGNER = 'designer',
  QA = 'qa',
  DEVOPS = 'devops'
}

export type CustomFieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'multiselect';

export interface NestedOption {
  label: string;
  value: string;
  children?: NestedOption[];
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; 
  nestedOptions?: NestedOption[]; 
  required: boolean;
}

export interface ProjectRole {
  id: string;
  name: string;
  permissions: {
    canViewProject: boolean;
    canCreateTask: boolean;
    canEditTask: boolean;
    canChangeStatus: boolean;
    canAddUpdate: boolean;
    canDeleteTask: boolean;
    canEditFields: boolean;
    canManageRoles: boolean;
  };
}

export interface WorkflowTransition {
  id: string;
  name: string;
  fromStatus: string[];
  toStatus: string;
  requirePopup?: boolean;
  requiredFields?: string[]; // IDs of fields to show in popup
  requireComment?: boolean;
  requireUpdate?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  transitions: WorkflowTransition[];
}

export interface ProjectMemberConfig {
  userId: string;
  roleId?: string; 
  editableFieldIds: string[]; 
}

export interface TaskTypeDefinition {
  id: string;
  label: string;
  emoji: string;
  category: 'task' | 'subtask' | 'story' | 'bug' | 'epic';
  slaMinutes?: number;
}

export interface Project {
  id: string;
  name: string;
  prefix: string; 
  description: string;
  status: 'active' | 'archived' | 'completed';
  ownerId: string;
  memberIds: string[];
  color: string;
  emoji: string;
  customFields: CustomFieldDefinition[];
  allowedRoles: string[]; 
  allowedUserIds: string[]; 
  memberConfigs: ProjectMemberConfig[];
  taskTypeIds: string[]; 
  customTaskTypes?: TaskTypeDefinition[]; // Project-specific task types
  projectRoles?: ProjectRole[];
  workflowId?: string; // ID of the global workflow
  hiddenStandardFields: string[]; 
  adminIds: string[];
  executorIds: string[];
  viewerIds: string[];
  autoAssignCreator?: boolean;
  enableUpdates?: boolean; // New feature: numbered updates
  deadlineDayConstraint?: number; // 0-6 (Sun-Sat), null for no constraint
  notificationSettings?: {
    telegram: boolean;
    email: boolean;
    onStatusChange: boolean;
    onComment: boolean;
    telegramChatId?: string; // Specific chat/channel ID
    telegramThreadId?: string; // Specific thread ID (for supergroups)
    telegramUserId?: string; // Specific user ID for notifications
  };
  createdAt: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskDependency {
  taskId: string;
  type: 'blocks' | 'blocked_by';
}

export interface TaskUpdateEntry {
  id: string;
  number: number;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface ProjectTask {
  id: string;
  key: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  projectId: string;
  parentId: string | null; 
  assigneeId: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string; 
  startDate: string | null; 
  endDate: string | null;   
  estimatedTime?: number; // in minutes
  spentTime?: number; // in minutes
  tags: string[]; 
  components: string[];
  attachments: { id: string, name: string, url: string, type: string, size: number }[];
  links: { id: string, title: string, url: string }[];
  subtaskIds: string[];
  checklist: TaskChecklistItem[];
  comments: TaskComment[];
  dependencies: TaskDependency[];
  customFieldValues: Record<string, any>; 
  blockerReason?: string;
  auditLog?: TaskUpdate[];
  updates?: TaskUpdateEntry[];
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  changes?: { field: string, oldValue: any, newValue: any }[];
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  parentId?: string; // for replies
  reactions?: Record<string, string[]>; // emoji -> userIds[]
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'custom';
  dayOfWeek?: number; // 0-6 for weekly
  intervalDays?: number; // for custom
  time: string; // HH:mm
  lastSent?: string;
  filters: {
    projectId: string;
    userId: string;
    customFilters: Record<string, string>;
  };
}

export interface TaskSettings {
  statuses: { id: string, label: string, color: string, isBlocker?: boolean }[];
  workflows?: Workflow[]; // Global workflows
  priorities: { id: string, label: string, emoji: string, color: string, level: number }[];
  taskTypes: { id: string, label: string, emoji: string, slaMinutes?: number }[];
  availableComponents: string[];
  availableLabels: string[];
  scheduledReports?: ScheduledReport[];
  integrations: {
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
      supportTelegramId?: string;
      reportTelegramChatId?: string; // New field for reports
    };
    email: {
      enabled: boolean;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      fromAddress?: string;
    };
  };
  notifications: {
    [key: string]: {
      internal: boolean;
      telegram: boolean;
      email: boolean;
    };
  };
}

export type ViewState = 'DASHBOARD' | 'SESSIONS' | 'ADMIN_SESSIONS' | 'TICKET_BANK' | 'RUNNER' | 'HISTORY' | 'USERS' | 'REPORTS' | 'SETTINGS' | 'PERMISSIONS' | 'DEPARTMENTS' | 'PROFILE' | 'MASS_ISSUES' | 'MY_TASKS' | 'ALL_TASKS' | 'PROJECTS' | 'BOARDS' | 'TASK_REPORTS' | 'TASK_SETTINGS' | 'COURSES' | 'COURSE_VIEW' | 'DEPT_AFFAIRS' | 'SYNC_DEP_MY_DASHBOARD' | 'SYNC_DEP_MY_TASKS' | 'SYNC_DEP_DEPARTMENT_TASKS' | 'SYNC_DEP_ALL_DASHBOARD' | 'SYNC_DEP_ALL_TASKS' | 'SYNC_DEP_DEPARTMENTS' | 'SYNC_DEP_ANALYTICS' | 'SYNC_DEP_REPORTS' | 'SYNC_DEP_SETTINGS' | 'SYNC_DEP_USER_GUIDE';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarChanged?: boolean;
  roles: string[];
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  isDeleted: boolean;
  permissionIds?: string[];
  needsPasswordChange?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  password?: string;
  telegramId?: string;
  telegramUsername?: string;
  timezone?: string;
  stats?: {
      completed: number;
      averageScore: number;
  };
}

export interface InternalNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AssessmentResult {
  id: string;
  sessionId: string;
  courseId?: string; // Link to course
  userId: string;
  attemptNumber: number;
  startedAt: string;
  completedAt?: string;
  totalScore: number;
  maxScore: number;
  passed: boolean;
  status: 'active' | 'completed' | 'expired';
  answers: {
    questionId: string;
    score: number;
    isCorrect: boolean;
    selectedOptions?: string[];
    textAnswer?: string;
  }[];
}

export interface CourseContentBlock {
    id: string;
    type: 'text' | 'image' | 'video' | 'file' | 'quote' | 'heading' | 'list_bullet' | 'list_number' | 'link';
    value: string;
    fileUrl?: string;
    fileName?: string;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    blocks?: CourseContentBlock[];
    docxContent?: string; // HTML converted from Docx
    totalChunks?: number; // If set, content is split in sub-collection
    ticketId: string; // Connected test
    assignedUserIds: string[];
    acknowledgedUserIds: string[]; // Who clicked "Acknowledged"
    courseDurationDays: number;
    testDurationDays: number;
    startDate: string;
    endDate: string;
    createdAt: string;
    createdBy: string;
    targeting: {
        roles: string[];
        departments: string[];
        specificUserIds: string[];
    };
}

export interface AssessmentSession {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'draft' | 'completed';
  ticketId: string;
  courseId?: string; // If session was triggered by course
  participants: string[];
  targeting: {
    type: 'auto' | 'manual';
    roles?: string[];
    departments?: string[];
    specificUserIds?: string[];
  };
  settings: {
    timeLimitMinutes: number;
    attempts: number;
    randomize: boolean;
    scoring: boolean;
    showResults: 'never' | 'after_session' | 'always';
    allowPause: boolean;
  };
}

export interface Department {
  id: string;
  name: string;
  permissionIds?: string[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissionIds: string[];
  isSystem?: boolean;
  departmentId?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  OPEN = 'open'
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  weight: number;
  tags: string[];
  options: QuestionOption[];
  explanation?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
}

export interface SystemSettings {
  passingThreshold: number;
}

export type IssueSeverity = string; // Changed from union to string to support dynamic severities
export type IssueStatus = 'open' | 'investigating' | 'scheduled' | 'resolved';

export interface CascadeNode {
  value: string;
  children?: CascadeNode[];
}

export interface MassIssue {
  id: string;
  readableId: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: string;
  subcategory: string;
  tags: string[];
  affectedZones: string[];
  status: IssueStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  resolvedAt?: string;
  notifyTelegram: boolean;
  notifyEmail?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  authorName: string;
  notifiedEvents?: string[]; 
  
  // New Fields
  responsibleDepartment?: string;
  cascadeValues?: {
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
  };
  telegramMessageId?: string;
}

export interface SeverityDefinition {
  id: string;
  label: string;
  color: string;
}

export interface IssueSettings {
  categories: Record<string, string[]>;
  zones: string[];
  
  // New Settings Fields
  responsibleDepartments?: string[];
  cascadeData?: CascadeNode[];
  severities?: SeverityDefinition[]; // New dynamic severities

  googleSheetUrl: string;
  telegram: {
    botToken: string;
    chatIds: string[];
  };
  email?: {
    enabled: boolean;
    recipient: string;
  };
}

export interface SharedDashboardData {
    id: string;
    generatedAt: string;
    kpiData: {
        avgScore: number;
        passRate: number;
        passedCount: number;
        totalAttempts: number;
        avgTime: number;
    };
    timelineData: {
        name: string;
        score: number;
        sortTime: number;
    }[];
    roleStats: {
        name: string;
        avgScore: number;
        count: number;
    }[];
    sessionStats: {
        id: string;
        title: string;
        ticketName: string;
        attempts: number;
        passed: number;
        failed: number;
        avgScore: number;
    }[];
    ticketStats: {
        id: string;
        title: string;
        total: number;
        failRate: number;
    }[];
    questionStats: any[];
    deptAssignmentStats: any[];
    deptPerformance: {
        id: string;
        name: string;
        score: number;
        count: number;
    }[];
    rankings: Record<string, { top15: any[], bottom15: any[] }>;
}

export interface PostCheckEntry {
    id: string;
    inn: string;
    fullName: string;
    okpo: string;
    gked: string;
    isOkpoCorrect: boolean;
    isGkedCorrect: boolean;
    isApproved: boolean;
    rejectionReason?: string | null;
    hasLicense?: boolean | null; // null/undefined means not applicable, true/false means yes/no
    isLicensedActivity?: boolean; // true if the gked code is in the licensed activities list
    startTime: string; // ISO string
    endTime: string; // ISO string
    timeSpentSeconds: number;
    userId: string;
    userName: string;
    userEmail?: string;
    createdAt: string;
}

export interface PostCheckLicensedActivity {
    code: string;
    description: string;
}

export interface PostCheckConfig {
    rejectionReasons: string[];
    licensedActivities?: PostCheckLicensedActivity[];
    telegramBotToken?: string;
    telegramChats?: { chatId: string; threadId?: string }[];
}

export interface DutyType {
  id: string;
  name: string;
  color?: string;
  allowedUserIds?: string[];
}

export interface DutyAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  dutyTypeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DutySettings {
  types: DutyType[];
  participatingUserIds: string[];
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramThreadId?: string;
  notificationTime?: string; // HH:mm
}
