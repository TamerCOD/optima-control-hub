
import React, { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, BookOpen, History, Users, Settings,
  LogOut, Bell, Square, Lock, Building2, Menu,
  BarChart3, ChevronRight, PanelLeftClose, PanelLeft, Moon, Sun, UserCircle,
  Activity, Briefcase, CheckCircle2, LayoutGrid, Settings2, GraduationCap, ClipboardList,
  Layers, Kanban, X
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

const VIEW_TITLES: Partial<Record<ViewState, string>> = {
  DASHBOARD:              'Аналитический Центр',
  SESSIONS:               'Аттестационные задания',
  COURSES:                'Учебная Платформа',
  COURSE_VIEW:            'Изучение Материала',
  MY_TASKS:               'Личный Бэклог',
  ALL_TASKS:              'Глобальный Реестр',
  PROJECTS:               'Управление Проектами',
  BOARDS:                 'Канбан Доски',
  TASK_REPORTS:           'Аналитика Задач',
  TASK_SETTINGS:          'Конфигурация Процессов',
  HISTORY:                'Архив Результатов',
  ADMIN_SESSIONS:         'Управление Кампаниями',
  TICKET_BANK:            'Библиотека Знаний',
  USERS:                  'Реестр Сотрудников',
  REPORTS:                'Генерация Отчётов',
  PERMISSIONS:            'Матрица Доступа',
  DEPARTMENTS:            'Орг-структура',
  SETTINGS:               'Системные Настройки',
  PROFILE:                'Профиль Специалиста',
  MASS_ISSUES:            'Мониторинг Инцидентов',
  DEPT_AFFAIRS:           'Дела Отдела',
  SYNC_DEP_MY_DASHBOARD:  'Мой дашборд',
  SYNC_DEP_MY_TASKS:      'Мои задачи',
  SYNC_DEP_DEPARTMENT_TASKS: 'Задачи отдела',
  SYNC_DEP_ALL_DASHBOARD: 'Общий дашборд',
  SYNC_DEP_DEPARTMENTS:   'По отделам',
  SYNC_DEP_ANALYTICS:     'Аналитика',
  SYNC_DEP_REPORTS:       'Отчёты',
  SYNC_DEP_SETTINGS:      'Настройки модуля',
};

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

  const showDashboard  = hasPermission('nav_dashboard');
  const showCourses    = hasPermission('nav_courses');
  const showTasks      = hasPermission('nav_tasks');
  const showAssess     = hasPermission('nav_assess');
  const showHistory    = hasPermission('nav_history');
  const showManagement = hasPermission('nav_management');
  const showSessions   = hasPermission('nav_sessions_manage');
  const showKB         = hasPermission('nav_kb');
  const showUsers      = hasPermission('nav_users');
  const showReports    = hasPermission('nav_reports');
  const showIssues     = hasPermission('nav_issues');
  const showSyncDep    = hasPermission('nav_sync_dep');
  const showSystem     = hasPermission('nav_system');
  const showRoles      = hasPermission('nav_roles');
  const showDepts      = hasPermission('nav_depts');
  const showConfig     = hasPermission('nav_config');

  const SectionLabel = ({ label }: { label: string }) => (
    <div className={`px-4 pb-1.5 pt-5 text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.32em] select-none ${isCollapsed ? 'text-center' : ''}`}>
      {isCollapsed ? '·' : label}
    </div>
  );

  const NavItem = ({
    view, icon, label, visible = true
  }: { view: ViewState; icon: React.ReactNode; label: string; visible?: boolean }) => {
    if (!view || !visible) return null;
    const isActive = currentView === view;
    return (
      <button
        onClick={() => { onChangeView(view); if (window.innerWidth < 768) setIsMobileOpen(false); }}
        title={isCollapsed ? label : undefined}
        className={`w-full relative group rounded-2xl text-sm font-medium transition-all duration-200 nav-item-golden ripple ${isActive ? 'active' : ''}`}
      >
        <div className={`
          relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl z-10 transition-all duration-200 w-full clay-btn
          ${isActive
            ? 'text-primary shadow-[0_2px_12px_rgba(227,6,19,0.18)]'
            : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'}
        `}>
          <span className={`transition-colors duration-200 shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>
            {icon}
          </span>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.span
                key="label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="truncate text-sm leading-none"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {isActive && !isCollapsed && (
            <ChevronRight size={13} className="ml-auto opacity-50 shrink-0" />
          )}
        </div>
      </button>
    );
  };

  const pageTitle = VIEW_TITLES[currentView] ?? '';

  return (
    <div className="flex h-full overflow-hidden text-zinc-900 dark:text-zinc-100 transition-theme p-2 md:p-3 gap-3">

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 h-full
        sidebar-transition flex-shrink-0 flex flex-col clay-panel-static
        ${isMobileOpen ? 'translate-x-0 w-64 left-2' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        {/* Logo */}
        <div className="h-20 px-3 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/30 shrink-0">
          <motion.div
            className="flex-1 flex items-center justify-center overflow-hidden"
            animate={{ opacity: 1 }}
          >
            <Logo size="sm" collapsed={isCollapsed} orientation="horizontal" />
          </motion.div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 clay-btn text-zinc-400 ml-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-3 flex flex-col gap-0.5">

          <SectionLabel label="Обзор" />
          <NavItem view="PROFILE"    icon={<UserCircle size={18} />}      label="Мой Профиль" />
          <NavItem view="DASHBOARD"  icon={<LayoutDashboard size={18} />} label="Дашборд" visible={showDashboard} />

          {showCourses && (
            <>
              <SectionLabel label="Обучение" />
              <NavItem view="COURSES" icon={<GraduationCap size={18} />} label="Курсы" />
            </>
          )}

          {showTasks && (
            <>
              <SectionLabel label="Задачи" />
              <NavItem view="ALL_TASKS"     icon={<LayoutGrid size={18} />}  label="Все задачи" />
              <NavItem view="MY_TASKS"      icon={<Briefcase size={18} />}   label="Мои задачи" />
              <NavItem view="PROJECTS"      icon={<Layers size={18} />}      label="Проекты" />
              <NavItem view="BOARDS"        icon={<Kanban size={18} />}      label="Доски" />
              <NavItem view="TASK_REPORTS"  icon={<BarChart3 size={18} />}   label="Отчёты" />
              <NavItem view="TASK_SETTINGS" icon={<Settings2 size={18} />}   label="Конфиг" visible={hasPermission('tasks_config')} />
            </>
          )}

          {(showAssess || showHistory) && (
            <>
              <SectionLabel label="Аттестация" />
              <NavItem view="SESSIONS" icon={<CheckCircle2 size={18} />} label="Мои Тесты"  visible={showAssess}  />
              <NavItem view="HISTORY"  icon={<History size={18} />}      label="История"    visible={showHistory} />
            </>
          )}

          {showManagement && (
            <>
              <SectionLabel label="Управление" />
              <NavItem view="ADMIN_SESSIONS" icon={<Square size={18} />}      label="Сессии"     visible={showSessions} />
              <NavItem view="TICKET_BANK"    icon={<BookOpen size={18} />}    label="База Знаний" visible={showKB}       />
              <NavItem view="USERS"          icon={<Users size={18} />}       label="Персонал"   visible={showUsers}    />
              <NavItem view="REPORTS"        icon={<BarChart3 size={18} />}   label="Аналитика"  visible={showReports}  />
              <NavItem view="MASS_ISSUES"    icon={<Activity size={18} />}    label="Инциденты"  visible={showIssues}   />
              <NavItem view="DEPT_AFFAIRS"   icon={<ClipboardList size={18} />} label="Дела Отдела" visible={hasPermission('nav_dept_affairs')} />
            </>
          )}

          {showSystem && (
            <>
              <SectionLabel label="Система" />
              <NavItem view="PERMISSIONS" icon={<Lock size={18} />}     label="Права"     visible={showRoles}  />
              <NavItem view="DEPARTMENTS" icon={<Building2 size={18} />} label="Филиалы"  visible={showDepts}  />
              <NavItem view="SETTINGS"    icon={<Settings size={18} />}  label="Настройки" visible={showConfig} />
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

        {/* User card + collapse */}
        <div className="p-2.5 border-t border-zinc-200/50 dark:border-zinc-800/30 mt-auto space-y-2">
          <AnimatePresence initial={false} mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5 p-2.5 clay-btn cursor-default"
              >
                <img
                  src={typeof user.avatar === 'string' ? user.avatar : ''}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100 leading-tight">
                    {typeof user.name === 'string' ? user.name.split(' ')[0] : 'User'}
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase font-semibold truncate tracking-wider leading-tight mt-0.5">
                    {typeof user.departmentName === 'string' ? user.departmentName : ''}
                  </div>
                </div>
                <button
                  onClick={() => onChangeUser('logout')}
                  className="p-1.5 text-zinc-400 hover:text-primary transition-colors rounded-xl clay-btn"
                  title="Выйти"
                >
                  <LogOut size={15} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="collapsed-logout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onChangeUser('logout')}
                className="w-full flex justify-center p-2.5 text-zinc-400 hover:text-primary clay-btn transition-colors"
                title="Выйти"
              >
                <LogOut size={18} />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-full items-center justify-center p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all clay-btn"
            title={isCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            {isCollapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="mx-1 mt-1 mb-2.5 h-16 px-5 flex items-center justify-between shrink-0 clay-panel-static">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 clay-btn text-zinc-500 dark:text-zinc-400"
            >
              <Menu size={20} />
            </button>
            {pageTitle && (
              <motion.h2
                key={currentView}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="text-base font-bold tracking-tight text-zinc-800 dark:text-zinc-100 hidden lg:block"
              >
                {pageTitle}
              </motion.h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Тёмная тема */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 clay-btn text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
              title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDarkMode
                ? <Sun size={17} className="text-amber-500" />
                : <Moon size={17} />}
            </button>

            {/* Уведомления */}
            <button
              className="relative p-2.5 clay-btn text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors group"
              title="Уведомления"
            >
              <Bell size={17} className="group-hover:rotate-[12deg] transition-transform duration-200" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-1">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
