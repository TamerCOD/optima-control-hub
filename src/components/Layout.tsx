
import React, { ReactNode, useState } from 'react';
import { motion } from 'motion/react';
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
        className={`w-full relative group rounded-2xl text-sm font-bold transition-all duration-500 hover:translate-x-1 ${isActive ? 'active' : ''}`}
        title={isCollapsed ? label : ''}
        onMouseEnter={() => document.body.classList.add('cursor-hover')}
        onMouseLeave={() => document.body.classList.remove('cursor-hover')}
      >
        {/* Inner Content */}
        <div className={`relative flex items-center gap-4 px-5 py-3.5 rounded-2xl z-10 transition-all duration-500 w-full border
          ${isActive 
            ? 'text-red bg-red/10 border-red/20 shadow-[0_10px_30px_rgba(230,57,70,0.15)]' 
            : 'text-muted2 border-transparent hover:text-text hover:bg-surface2 hover:border-surface3'}`}
        >
          <div className={`transition-all duration-500 shrink-0 ${isActive ? 'text-red scale-110 rotate-3' : 'group-hover:text-red group-hover:scale-110'}`}>{icon}</div>
          {!isCollapsed && <span className="truncate uppercase tracking-[0.15em] text-[10px] font-black font-headline">{label}</span>}
          {isActive && !isCollapsed && (
            <motion.div 
              layoutId="active-indicator"
              className="ml-auto"
            >
              <ChevronRight size={14} className="text-red opacity-80" />
            </motion.div>
          )}
        </div>
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-red rounded-full -ml-1 shadow-[0_0_15px_rgba(230,57,70,0.5)]"></div>
        )}
      </button>
    );
  };

  return (
    <div className={`flex h-full overflow-hidden text-text transition-colors duration-300 bg-transparent p-2 md:p-3 gap-4`}>
      {isMobileOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden rounded-3xl" onClick={() => setIsMobileOpen(false)}></div>}

      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 h-full
        sidebar-transition flex-shrink-0 flex flex-col premium-card
        ${isMobileOpen ? 'translate-x-0 w-80 left-2' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-24' : 'md:w-80'}
      `}>
        <div className="h-24 px-4 flex items-center justify-center border-b border-border shrink-0 overflow-hidden">
            <Logo size="md" collapsed={isCollapsed} orientation="horizontal" />
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 flex flex-col gap-2">
            <div className={`px-4 pb-2 text-[10px] font-headline font-black text-red uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
               {isCollapsed ? '•' : 'Обзор'}
            </div>
            <NavItem view="PROFILE" icon={<UserCircle size={20} />} label="Мой Профиль" />
            <NavItem view="DASHBOARD" icon={<LayoutDashboard size={20} />} label="Дашборд" visible={showDashboard} />
            
            {showCourses && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[10px] font-headline font-black text-red uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                   {isCollapsed ? '•' : 'Обучение'}
                </div>
                <NavItem view="COURSES" icon={<GraduationCap size={20} />} label="Курсы" />
                </>
            )}

            {showTasks && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[10px] font-headline font-black text-red uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
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
                <div className={`px-4 pb-2 pt-6 text-[10px] font-headline font-black text-red uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
                   {isCollapsed ? '•' : 'Аттестация'}
                </div>
                <NavItem view="SESSIONS" icon={<CheckCircle2 size={20} />} label="Мои Тесты" visible={showAssess} />
                <NavItem view="HISTORY" icon={<History size={20} />} label="История" visible={showHistory} />
                </>
            )}
            
            {showManagement && (
                <>
                <div className={`px-4 pb-2 pt-6 text-[10px] font-headline font-black text-red uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
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
              <div className={`px-4 pb-2 pt-6 text-[10px] font-headline font-black text-red uppercase tracking-[0.3em] ${isCollapsed ? 'text-center' : ''}`}>
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

        <div className="p-4 border-t border-surface3 mt-auto bg-surface1">
            {!isCollapsed ? (
                <div className="flex items-center gap-4 p-3 premium-card bg-surface2 border-surface3 group hover:bg-surface2 transition-all duration-500">
                    <div className="relative shrink-0">
                        <img src={typeof user.avatar === 'string' ? user.avatar : ''} className="w-12 h-12 rounded-2xl object-cover border-2 border-surface3 shadow-lg group-hover:scale-105 transition-transform duration-500" alt=""/>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-surface2 rounded-full shadow-lg"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-black truncate text-text font-headline uppercase tracking-tight">{typeof user.name === 'string' ? user.name.split(' ')[0] : 'User'}</div>
                        <div className="text-[9px] text-muted uppercase font-black truncate tracking-[0.2em] font-headline opacity-60">{typeof user.departmentName === 'string' ? user.departmentName : ''}</div>
                    </div>
                    <button 
                      onClick={() => onChangeUser('logout')} 
                      className="p-2.5 text-muted hover:text-red transition-all rounded-xl hover:bg-red/10 border border-transparent hover:border-red/20"
                      onMouseEnter={() => document.body.classList.add('cursor-hover')}
                      onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                    >
                      <LogOut size={20} />
                    </button>
                </div>
            ) : (
                <button 
                  onClick={() => onChangeUser('logout')} 
                  className="w-full flex justify-center p-4 text-muted hover:text-red hover:bg-red/10 rounded-2xl transition-all border border-transparent hover:border-red/20"
                  onMouseEnter={() => document.body.classList.add('cursor-hover')}
                  onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                >
                  <LogOut size={24} />
                </button>
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="hidden md:flex w-full items-center justify-center p-3 mt-6 text-muted hover:text-text transition-all rounded-2xl hover:bg-surface3 border border-transparent hover:border-surface3"
              onMouseEnter={() => document.body.classList.add('cursor-hover')}
              onMouseLeave={() => document.body.classList.remove('cursor-hover')}
            >
              {isCollapsed ? <PanelLeft size={22}/> : <PanelLeftClose size={22}/>}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 transition-colors duration-300 relative h-full">
         <header className="h-24 px-8 mx-4 mt-4 mb-4 flex items-center justify-between z-10 shrink-0 premium-card bg-surface1 border-surface3 shadow-2xl">
            <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsMobileOpen(true)} 
                  className="md:hidden p-3 text-text hover:bg-surface3 rounded-2xl transition-all border border-transparent hover:border-surface3 shadow-lg"
                  onMouseEnter={() => document.body.classList.add('cursor-hover')}
                  onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                >
                  <Menu size={24} />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black tracking-tighter text-text hidden lg:block font-headline uppercase leading-none mb-1">
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
                    <div className="text-[10px] font-black text-muted uppercase tracking-[0.3em] font-headline hidden lg:block opacity-50">
                        Universal Premium Platform v2.0
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                  onClick={onToggleDarkMode} 
                  className="p-3 rounded-2xl hover:bg-surface3 text-text transition-all active:scale-90 border border-transparent hover:border-surface3 shadow-lg"
                  onMouseEnter={() => document.body.classList.add('cursor-hover')}
                  onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                >
                  {isDarkMode ? <Sun size={22} className="text-yellow-500" /> : <Moon size={22} className="text-blue-400" />}
                </button>
                <button 
                  className="relative p-3 rounded-2xl hover:bg-surface3 text-text transition-all active:scale-90 group border border-transparent hover:border-surface3 shadow-lg"
                  onMouseEnter={() => document.body.classList.add('cursor-hover')}
                  onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                >
                  <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                  <span className="absolute top-3 right-3 w-3 h-3 bg-red rounded-full border-2 border-surface1 shadow-[0_0_10px_rgba(230,57,70,0.5)] animate-pulse"></span>
                </button>
                <div className="w-px h-8 bg-surface3 mx-2 hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-3 pl-2">
                    <div className="text-right">
                        <div className="text-xs font-black text-text font-headline uppercase tracking-tight leading-none mb-1">{user.name.split(' ')[0]}</div>
                        <div className="text-[9px] font-black text-red uppercase tracking-widest font-headline opacity-80">Online</div>
                    </div>
                    <img src={user.avatar} className="w-10 h-10 rounded-xl border-2 border-surface3 shadow-md object-cover" alt="" />
                </div>
            </div>
         </header>
         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3">
            <div className="w-full h-full reveal">{children}</div>
         </div>
      </main>
    </div>
  );
};

export default Layout;
