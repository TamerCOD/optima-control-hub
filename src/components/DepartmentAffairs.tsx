import React, { useState } from 'react';
import { User, UserRole, RoleDefinition } from '../types';
import PostCheckView from './PostCheckView';
import SprintsView from './SprintsView';
import DutiesView from './DutiesView';
import UsefulLinksView from './UsefulLinksView';
import { Timer, CalendarDays, ClipboardCheck, Link as LinkIcon } from 'lucide-react';

interface Props {
    currentUser: User;
    roles: RoleDefinition[];
}

type Tab = 'SPRINTS' | 'DUTIES' | 'POST_CHECK' | 'LINKS';

const DepartmentAffairs: React.FC<Props> = ({ currentUser, roles }) => {
    const [activeTab, setActiveTab] = useState<Tab>('SPRINTS');

    const hasPermission = (permId: string) => {
        if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return true;
        if (currentUser.permissionIds?.includes(permId)) return true;
        return currentUser.roles.some(rId => {
            const roleDef = roles.find(rd => rd.id === rId);
            return roleDef?.permissionIds.includes(permId);
        });
    };

    const canViewSprints = hasPermission('sprints_view');
    const canViewDuties = hasPermission('duties_view');
    const canViewPostCheck = hasPermission('postcheck_view');
    const canViewLinks = hasPermission('links_view');

    // Determine default tab if current is not allowed
    React.useEffect(() => {
        if (activeTab === 'SPRINTS' && !canViewSprints) {
            if (canViewDuties) setActiveTab('DUTIES');
            else if (canViewPostCheck) setActiveTab('POST_CHECK');
            else if (canViewLinks) setActiveTab('LINKS');
        }
    }, [canViewSprints, canViewDuties, canViewPostCheck, canViewLinks, activeTab]);

    const tabs = [
        { id: 'SPRINTS', label: 'Спринты', icon: <Timer size={18} />, visible: canViewSprints },
        { id: 'DUTIES', label: 'Дежурства', icon: <CalendarDays size={18} />, visible: canViewDuties },
        { id: 'POST_CHECK', label: 'Постпроверка', icon: <ClipboardCheck size={18} />, visible: canViewPostCheck },
        { id: 'LINKS', label: 'Полезные ссылки', icon: <LinkIcon size={18} />, visible: canViewLinks },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">Дела Отдела</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-2">Внутренние процессы и ресурсы</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 border-b border-white/20 dark:border-zinc-700/30 overflow-x-auto pb-4 custom-scrollbar">
                {tabs.filter(t => t.visible).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex items-center gap-2 px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-2xl shadow-sm hover:scale-[1.02] ${
                            activeTab === tab.id
                                ? 'bg-primary text-white shadow-md'
                                : 'glass-panel text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="glass-panel rounded-[2.5rem] shadow-sm min-h-[500px] p-2 md:p-3">
                {activeTab === 'SPRINTS' && canViewSprints && <SprintsView />}
                {activeTab === 'DUTIES' && canViewDuties && <DutiesView currentUser={currentUser} roles={roles} />}
                {activeTab === 'POST_CHECK' && canViewPostCheck && <PostCheckView user={currentUser} roles={roles} />}
                {activeTab === 'LINKS' && canViewLinks && <UsefulLinksView />}
                
                {!canViewSprints && !canViewDuties && !canViewPostCheck && !canViewLinks && (
                    <div className="p-20 text-center text-zinc-400 uppercase tracking-widest font-bold text-xs">
                        Нет доступа к разделам
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentAffairs;
