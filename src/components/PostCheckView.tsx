import React, { useState } from 'react';
import { User, RoleDefinition, PostCheckEntry } from '../types';
import EntryTable from './postcheck/EntryTable';
import EntryForm from './postcheck/EntryForm';
import Analytics from './postcheck/Analytics';
import Settings from './postcheck/Settings';
import { LayoutDashboard, ListPlus, Settings as SettingsIcon } from 'lucide-react';

interface Props {
    user: User;
    roles: RoleDefinition[];
}

const PostCheckView: React.FC<Props> = ({ user, roles }) => {
    const [activeTab, setActiveTab] = useState<'input' | 'analytics' | 'settings'>('input');
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<PostCheckEntry | undefined>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Check if user has management permission for settings
    const canManage = user.roles.includes('admin') || 
                      user.permissionIds?.includes('postcheck_manage') || 
                      user.roles.some(r => roles.find(rd => rd.id === r)?.permissionIds.includes('postcheck_manage'));

    const handleEdit = (entry: PostCheckEntry) => {
        setEditingEntry(entry);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingEntry(undefined);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Sub-Navigation */}
            <div className="flex items-center justify-between border-b border-white/20 dark:border-zinc-700/30 pb-4">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('input')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${activeTab === 'input' ? 'bg-primary text-white shadow-md' : 'glass-panel text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        <ListPlus size={16} /> Ввод данных
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${activeTab === 'analytics' ? 'bg-primary text-white shadow-md' : 'glass-panel text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        <LayoutDashboard size={16} /> Аналитика
                    </button>
                    {canManage && (
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${activeTab === 'settings' ? 'bg-primary text-white shadow-md' : 'glass-panel text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            <SettingsIcon size={16} /> Настройки
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="relative">
                {activeTab === 'input' && (
                    <>
                        <EntryTable 
                            onCreate={() => { setEditingEntry(undefined); setShowForm(true); }} 
                            onEdit={handleEdit}
                            refreshTrigger={refreshTrigger} 
                        />
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-fade-in">
                                <EntryForm 
                                    user={user} 
                                    initialData={editingEntry}
                                    onClose={handleCloseForm} 
                                    onEntryAdded={() => setRefreshTrigger(prev => prev + 1)} 
                                />
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'analytics' && <Analytics />}
                
                {activeTab === 'settings' && canManage && <Settings />}
            </div>
        </div>
    );
};

export default PostCheckView;
