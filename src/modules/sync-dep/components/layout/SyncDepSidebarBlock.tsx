import React from 'react';
import { 
  ChevronDown, ChevronRight, LayoutDashboard, CheckSquare, 
  Globe, Building, PieChart, FileText, Settings, BookOpen 
} from 'lucide-react';
import { ViewState } from '../../../../types';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';

interface Props {
  isCollapsed: boolean;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  setIsMobileOpen: (open: boolean) => void;
}

export const SyncDepSidebarBlock: React.FC<Props> = ({ 
  isCollapsed, currentView, onChangeView, setIsMobileOpen 
}) => {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const perms = usePermissions();

  const NavItem = ({ view, icon, label, badge, badgeColor = 'bg-primary' }: any) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => { onChangeView(view); if(window.innerWidth < 768) setIsMobileOpen(false); }}
        className={`w-full relative group rounded-2xl text-sm font-medium transition-all duration-300 hover:scale-[1.02] nav-item-golden ${isActive ? 'active' : ''}`}
        title={isCollapsed ? label : ''}
      >
        <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl z-10 transition-all duration-300 w-full clay-btn
          ${isActive 
            ? 'text-primary' 
            : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}
        >
          <div className={`transition-colors shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-primary'}`}>{icon}</div>
          {!isCollapsed && <span className="truncate">{label}</span>}
          
          {!isCollapsed && badge !== undefined && badge > 0 && (
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      <div className="px-4 pb-2 pt-6">
        <button 
          onClick={toggleSidebar}
          className={`w-full flex items-center justify-between text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="flex items-center gap-2">
            <span>📋</span>
            {!isCollapsed && <span>СИНХ ДЕП</span>}
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-1">
              {/* Notification dot placeholder */}
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {isSidebarOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
          )}
        </button>
      </div>

      {isSidebarOpen && (
        <div className="flex flex-col gap-1 mt-1">
          <NavItem 
            view="SYNC_DEP_MY_DASHBOARD" 
            icon={<LayoutDashboard size={20} />} 
            label="Мой дашборд" 
          />
          <NavItem 
            view="SYNC_DEP_MY_TASKS" 
            icon={<CheckSquare size={20} />} 
            label="Мои задачи" 
          />
          <NavItem 
            view="SYNC_DEP_DEPARTMENT_TASKS" 
            icon={<Building size={20} />} 
            label="Задачи отдела" 
          />
          
          {perms.canViewAllDepartments && (
            <>
              <NavItem 
                view="SYNC_DEP_ALL_DASHBOARD" 
                icon={<Globe size={20} />} 
                label="Общий дашборд" 
              />
              <NavItem 
                view="SYNC_DEP_ALL_TASKS" 
                icon={<CheckSquare size={20} />} 
                label="Все задачи" 
              />
            </>
          )}

          <NavItem 
            view="SYNC_DEP_DEPARTMENTS" 
            icon={<Building size={20} />} 
            label={perms.canViewAllDepartments ? "По отделам" : "Дашборд отдела"} 
          />

          <NavItem 
            view="SYNC_DEP_ANALYTICS" 
            icon={<PieChart size={20} />} 
            label={perms.canViewAllDepartments ? "Аналитика" : "Моя аналитика"} 
          />

          {perms.canViewReports && (
            <NavItem 
              view="SYNC_DEP_REPORTS" 
              icon={<FileText size={20} />} 
              label="Отчёты" 
            />
          )}

          {perms.canManageSettings && (
            <NavItem 
              view="SYNC_DEP_SETTINGS" 
              icon={<Settings size={20} />} 
              label="Настройки" 
            />
          )}

          <NavItem 
            view="SYNC_DEP_USER_GUIDE" 
            icon={<BookOpen size={20} />} 
            label="Руководство" 
          />
        </div>
      )}
      
      {/* Divider after block */}
      <div className="my-2 border-t border-zinc-200/50 dark:border-zinc-800/50 mx-4"></div>
    </>
  );
};
