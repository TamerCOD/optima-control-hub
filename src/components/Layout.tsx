
import React, { ReactNode, useState } from 'react';
import { 
  LayoutDashboard, BookOpen, History, Users, Settings, 
  LogOut, Bell, Square, Lock, Building2, Menu, 
  BarChart3, ChevronRight, PanelLeftClose, PanelLeft, Moon, Sun, UserCircle,
  Activity, Briefcase, CheckCircle2, LayoutGrid, Settings2, GraduationCap, ClipboardList,
  Layers, Kanban
} from 'lucide-react';
import { User, UserRole, ViewState, RoleDefinition, Department } from '../types';
import Logo from './Branding';
import { SyncDepSidebarBlock } from '../modules/sync-dep/components/layout/SyncDepSidebarBlock';

interface LayoutProps {
  user: User;
  roles: RoleDefinition[]; 
  departments?: Department[];
  children: ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onChangeUser: (userId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  user, roles, children, currentView, onChangeView, onChangeUser, isDarkMode, onToggleDarkMode 
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const hasPermission = (permId: string) => {
      if (typeof permId !== 'string') return false;
      if (!user || !Array.isArray(user.roles)) return false;
      if (user.roles.includes(UserRole.SUPER_ADMIN)) return true;
      if (Array.isArray(user.permissionIds) && user.permissionIds.includes(permId)) return true;
      if (!Array.isArray(roles)) return false;
      return user.roles.some(rId => {
          if (typeof rId !== 'string') return false;
          const roleDef = roles.find(rd => rd && rd.id === rId);
          return Array.isArray(roleDef?.permissionIds) && roleDef?.permissionIds.includes(permId);
      });
  };

  // --- Nav Visibility based on atomic nav permissions ---
  const showDashboard = hasPermission('nav_dashboard');
  const showCourses = hasPermission('nav_courses');
  const showTasks = hasPermission('nav_tasks');
  const showAssess = hasPermission('nav_assess');
  const showHistory = hasPermission('nav_history');
  
  const showManagement = hasPermission('nav_management');
  const showSessions = hasPermission('nav_sessions_manage');
  const showKB = hasPermission('nav_kb');
  const showUsers = hasPermission('nav_users');
  const showReports = hasPermission('nav_reports');
  const showIssues = hasPermission('nav_issues');
  const showSyncDep = hasPermission('nav_sync_dep');

  const showSystem = hasPermission('nav_system');
  const showRoles = hasPermission('nav_roles');
  const showDepts = hasPermission('nav_depts');
  const showConfig = hasPermission('nav_config');
  
  const NavItem = ({ view, icon, label, visible = true }: { view: ViewState; icon: React.ReactNode; label: string; visible?: boolean }) => {
    if (!view || !visible) return null;
    const isActive = currentView === view;
    return (
      <button
        onClick={() => { onChangeView(view); if(window.innerWidth < 768) setIsMobileOpen(false); }}
        className={`w-full relative group rounded-2xl text-sm font-medium transition-all duration-300 hover:scale-[1.02] nav-item-golden ${isActive ? 'active' : ''}`}
        title={isCollapsed ? label : ''}
      >
        {/* Inner Content */}
        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl z-10 transition-all duration-300 w-full clay-btn
          ${isActive 
            ? 'text-primary' 
            : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}
        >
          <div className={`transition-colors shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>{icon}</div>
          {!isCollapsed && <span className="truncate">{label}</span>}
          {isActive && !isCollapsed && <ChevronRight size={14} className="ml-auto opacity-60" />}
        </div>
      </button>
    );
  };

  return (
    <div className={`flex h-full overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors duration-300 bg-transparent p-2 md:p-3 gap-4`}>
      {isMobileOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden rounded-3xl" onClick={() => setIsMobileOpen(false)}></div>}

      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 h-full
        sidebar-transition flex-shrink-0 flex flex-col clay-panel
        ${isMobileOpen ? 'translate-x-0 w-72 left-2' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-24' : 'md:w-72'}
      `}>
        <div className="h-24 px-4 flex items-center justify-center border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0 overflow-hidden">
            <Logo size="md" collapsed={isCollapsed} orientation="horizontal" />
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 flex flex-col gap-3">
            <div className={`px-4 pb-2 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
               {isCollapsed ? '•' : 'Обзор'}
            </div>
            <NavItem view="PROFILE" icon={<UserCircle size={20} />} label="Мой Профиль" />
            <NavItem view="DASHBOARD" icon={<LayoutDashboard size={20} />} label="Дашборд" visible={showDashboard} />
            
            {showCourses && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                   {isCollapsed ? '•' : 'Обучение'}
                </div>
                <NavItem view="COURSES" icon={<GraduationCap size={20} />} label="Курсы" />
                </>
            )}

            {showTasks && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                   {isCollapsed ? '•' : 'Задачи'}
                </div>
                <NavItem view="ALL_TASKS" icon={<LayoutGrid size={20} />} label="Все задачи" />
                <NavItem view="MY_TASKS" icon={<Briefcase size={20} />} label="Мои задачи" />
                <NavItem view="PROJECTS" icon={<Layers size={20} />} label="Проекты" />
                <NavItem view="BOARDS" icon={<Kanban size={20} />} label="Доски" />
                <NavItem view="TASK_REPORTS" icon={<BarChart3 size={20} />} label="Отчёты" />
                <NavItem view="TASK_SETTINGS" icon={<Settings2 size={20} />} label="Конфиг" visible={hasPermission('tasks_config')} />
                </>
            )}

            {(showAssess || showHistory) && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                   {isCollapsed ? '•' : 'Аттестация'}
                </div>
                <NavItem view="SESSIONS" icon={<CheckCircle2 size={20} />} label="Мои Тесты" visible={showAssess} />
                <NavItem view="HISTORY" icon={<History size={20} />} label="История" visible={showHistory} />
                </>
            )}
            
            {showManagement && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                   {isCollapsed ? '•' : 'Управление'}
                </div>
                <NavItem view="ADMIN_SESSIONS" icon={<Square size={20} />} label="Сессии" visible={showSessions} />
                <NavItem view="TICKET_BANK" icon={<BookOpen size={20} />} label="База Знаний" visible={showKB} />
                <NavItem view="USERS" icon={<Users size={20} />} label="Персонал" visible={showUsers} />
                <NavItem view="REPORTS" icon={<BarChart3 size={20} />} label="Аналитика" visible={showReports} />
                <NavItem view="MASS_ISSUES" icon={<Activity size={20} />} label="Инциденты" visible={showIssues} />
                <NavItem view="DEPT_AFFAIRS" icon={<ClipboardList size={20} />} label="Дела Отдела" visible={hasPermission('nav_dept_affairs')} />
                </>
            )}
            
            {showSystem && (
              <>
              <div className={`px-4 pb-2 pt-6 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                 {isCollapsed ? '•' : 'Система'}
              </div>
              <NavItem view="PERMISSIONS" icon={<Lock size={20} />} label="Права" visible={showRoles} />
              <NavItem view="DEPARTMENTS" icon={<Building2 size={20} />} label="Филиалы" visible={showDepts} />
              <NavItem view="SETTINGS" icon={<Settings size={20} />} label="Настройки" visible={showConfig} />
              </>
            )}

            {showSyncDep && (
              <SyncDepSidebarBlock 
                isCollapsed={isCollapsed} 
                currentView={currentView} 
                onChangeView={onChangeView} 
                setIsMobileOpen={setIsMobileOpen} 
              />
            )}
        </nav>

        <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 mt-auto">
            {!isCollapsed ? (
                <div className="flex items-center gap-3 p-2 clay-panel">
                    <img src={typeof user.avatar === 'string' ? user.avatar : ''} className="w-10 h-10 rounded-full object-cover shadow-sm" alt=""/>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{typeof user.name === 'string' ? user.name.split(' ')[0] : 'User'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-medium truncate tracking-wider">{typeof user.departmentName === 'string' ? user.departmentName : ''}</div>
                    </div>
                    <button onClick={() => onChangeUser('logout')} className="p-2 text-zinc-400 hover:text-primary transition-colors rounded-full clay-btn"><LogOut size={18} /></button>
                </div>
            ) : (
                <button onClick={() => onChangeUser('logout')} className="w-full flex justify-center p-3 text-zinc-400 hover:text-primary clay-btn"><LogOut size={22} /></button>
            )}
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex w-full items-center justify-center p-2 mt-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all rounded-full clay-btn">{isCollapsed ? <PanelLeft size={20}/> : <PanelLeftClose size={20}/>}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 transition-colors duration-300 relative h-full">
         <header className="h-20 px-6 mx-4 mt-4 mb-2 flex items-center justify-between z-10 shrink-0 clay-panel">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsMobileOpen(true)} className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 clay-btn transition-colors"><Menu size={24} /></button>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white hidden lg:block">
                    {currentView === 'DASHBOARD' && 'Аналитический Центр'}
                    {currentView === 'SESSIONS' && 'Аттестационные задания'}
                    {currentView === 'COURSES' && 'Учебная Платформа'}
                    {currentView === 'COURSE_VIEW' && 'Изучение Материала'}
                    {currentView === 'MY_TASKS' && 'Личный Бэклог'}
                    {currentView === 'ALL_TASKS' && 'Глобальный Реестр'}
                    {currentView === 'PROJECTS' && 'Управление Проектами'}
                    {currentView === 'BOARDS' && 'Канбан Доски'}
                    {currentView === 'TASK_REPORTS' && 'Аналитика Задач'}
                    {currentView === 'TASK_SETTINGS' && 'Конфигурация Процессов'}
                    {currentView === 'HISTORY' && 'Архив Результатов'}
                    {currentView === 'ADMIN_SESSIONS' && 'Управление Кампаниями'}
                    {currentView === 'TICKET_BANK' && 'Библиотека Знаний'}
                    {currentView === 'USERS' && 'Реестр Сотрудников'}
                    {currentView === 'REPORTS' && 'Генерация Отчетов'}
                    {currentView === 'PERMISSIONS' && 'Матрица Доступа'}
                    {currentView === 'DEPARTMENTS' && 'Орг-структура'}
                    {currentView === 'SETTINGS' && 'Системные Настройки'}
                    {currentView === 'PROFILE' && 'Профиль Специалиста'}
                    {currentView === 'MASS_ISSUES' && 'Мониторинг Инцидентов'}
                    {currentView === 'DEPT_AFFAIRS' && 'Дела Отдела'}
                    {currentView === 'SYNC_DEP_MY_DASHBOARD' && 'Мой дашборд'}
                    {currentView === 'SYNC_DEP_MY_TASKS' && 'Мои задачи'}
                    {currentView === 'SYNC_DEP_DEPARTMENT_TASKS' && 'Задачи отдела'}
                    {currentView === 'SYNC_DEP_ALL_DASHBOARD' && 'Общий дашборд'}
                    {currentView === 'SYNC_DEP_DEPARTMENTS' && 'По отделам'}
                    {currentView === 'SYNC_DEP_ANALYTICS' && 'Аналитика'}
                    {currentView === 'SYNC_DEP_REPORTS' && 'Отчёты'}
                    {currentView === 'SYNC_DEP_SETTINGS' && 'Настройки модуля'}
                </h2>
            </div>
            
            <div className="flex items-center gap-3">
                <button onClick={onToggleDarkMode} className="p-2 clay-btn text-zinc-700 dark:text-zinc-300 transition-all active:scale-95">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
                <button className="relative p-2 clay-btn text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 group"><Bell size={20} className="group-hover:rotate-12 transition-transform" /><span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white dark:border-zinc-800"></span></button>
            </div>
         </header>
         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3">
            <div className="w-full animate-fade-in h-full">{children}</div>
         </div>
      </main>
    </div>
  );
};

export default Layout;
