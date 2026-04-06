import React, { useState } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { Building2, ListTodo, Plus, Edit2, Trash2, Save, X, Users, Bell, Download } from 'lucide-react';
import { SyncDepDepartment, TaskStatus } from '../types/core.types';
import { db } from '../../../firebase';
import { ImportTab } from '../components/settings/ImportTab';

export const Settings: React.FC = () => {
  const { 
    departments, statuses, users, syncDepSettings,
    addDepartment, updateDepartment, deleteDepartment,
    addStatus, updateStatus, deleteStatus,
    updateUser
  } = useTasksStore();
  
  const [activeTab, setActiveTab] = useState<'departments' | 'statuses' | 'users' | 'added_users' | 'notifications' | 'import'>('departments');
  
  // Department Editing State
  const [editingDep, setEditingDep] = useState<string | null>(null);
  const [depForm, setDepForm] = useState({ name: '', color: '#3b82f6' });
  const [isAddingDep, setIsAddingDep] = useState(false);

  // Status Editing State
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#3b82f6', is_closing: false });
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  // --- Departments Handlers ---
  const handleEditDep = (dep: SyncDepDepartment) => {
    setEditingDep(dep.id);
    setDepForm({ name: dep.name, color: dep.color || '#3b82f6' });
    setIsAddingDep(false);
  };

  const handleSaveDep = () => {
    if (!depForm.name.trim()) return;
    
    if (editingDep) {
      updateDepartment(editingDep, depForm);
      setEditingDep(null);
    } else if (isAddingDep) {
      addDepartment({
        id: `dep-${Date.now()}`,
        name: depForm.name,
        color: depForm.color,
        manager_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsAddingDep(false);
    }
    setDepForm({ name: '', color: '#3b82f6' });
  };

  const handleCancelDep = () => {
    setEditingDep(null);
    setIsAddingDep(false);
    setDepForm({ name: '', color: '#3b82f6' });
  };

  const handleDeleteDep = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот отдел?')) {
      deleteDepartment(id);
    }
  };

  // --- Statuses Handlers ---
  const handleEditStatus = (status: TaskStatus) => {
    setEditingStatus(status.id);
    setStatusForm({ name: status.name, color: status.color, is_closing: status.is_closing });
    setIsAddingStatus(false);
  };

  const handleSaveStatus = () => {
    if (!statusForm.name.trim()) return;
    
    if (editingStatus) {
      updateStatus(editingStatus, statusForm);
      setEditingStatus(null);
    } else if (isAddingStatus) {
      addStatus({
        id: `status-${Date.now()}`,
        name: statusForm.name,
        color: statusForm.color,
        icon: 'circle',
        is_blocker: false,
        is_default: false,
        is_active: true,
        is_closing: statusForm.is_closing,
        order: statuses.length
      });
      setIsAddingStatus(false);
    }
    setStatusForm({ name: '', color: '#3b82f6', is_closing: false });
  };

  const handleCancelStatus = () => {
    setEditingStatus(null);
    setIsAddingStatus(false);
    setStatusForm({ name: '', color: '#3b82f6', is_closing: false });
  };

  const handleDeleteStatus = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот статус?')) {
      deleteStatus(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Настройки</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Управление отделами и статусами задач</p>
      </div>

      <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'departments'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Building2 size={18} />
          Отделы
        </button>
        <button
          onClick={() => setActiveTab('statuses')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'statuses'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <ListTodo size={18} />
          Статусы
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Users size={18} />
          Все сотрудники
        </button>
        <button
          onClick={() => setActiveTab('added_users')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'added_users'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Users size={18} />
          Добавленные
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Bell size={18} />
          Уведомления
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Download size={18} />
          Импорт
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Список отделов</h2>
              {!isAddingDep && (
                <button
                  onClick={() => {
                    setIsAddingDep(true);
                    setEditingDep(null);
                    setDepForm({ name: '', color: '#3b82f6' });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Добавить отдел
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Цвет</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Название</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-full">Сотрудники</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {isAddingDep && (
                    <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                      <td className="px-6 py-3">
                        <input
                          type="color"
                          value={depForm.color}
                          onChange={(e) => setDepForm({ ...depForm, color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={depForm.name}
                          onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                          placeholder="Название отдела"
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          autoFocus
                        />
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-zinc-400 italic">Будут добавлены после сохранения</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={handleSaveDep} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                            <Save size={18} />
                          </button>
                          <button onClick={handleCancelDep} className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {departments.map((dep) => {
                    const departmentUsers = users.filter(u => {
                      const uDepIds = u.department_ids || (u.department_id ? [u.department_id] : []);
                      return uDepIds.includes(dep.id);
                    });
                    return (
                      <tr key={dep.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        {editingDep === dep.id ? (
                          <>
                            <td className="px-6 py-3">
                              <input
                                type="color"
                                value={depForm.color}
                                onChange={(e) => setDepForm({ ...depForm, color: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="text"
                                value={depForm.name}
                                onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                autoFocus
                              />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex -space-x-2 overflow-hidden">
                                {departmentUsers.slice(0, 5).map(user => (
                                  <div 
                                    key={user.id}
                                    title={user.name}
                                    className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                                  >
                                    {user.avatar_url ? (
                                      <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-primary">
                                        {user.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {departmentUsers.length > 5 && (
                                  <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-[8px] font-bold text-zinc-500">
                                    +{departmentUsers.length - 5}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={handleSaveDep} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                  <Save size={18} />
                                </button>
                                <button onClick={handleCancelDep} className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                  <X size={18} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3">
                              <div className="w-6 h-6 rounded-md" style={{ backgroundColor: dep.color }} />
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-sm font-medium text-zinc-900 dark:text-white">{dep.name}</span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {departmentUsers.slice(0, 5).map(user => (
                                    <div 
                                      key={user.id}
                                      title={user.name}
                                      className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
                                    >
                                      {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-primary">
                                          {user.name.charAt(0)}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {departmentUsers.length > 5 && (
                                    <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-[8px] font-bold text-zinc-500">
                                      +{departmentUsers.length - 5}
                                    </div>
                                  )}
                                </div>
                                {departmentUsers.length > 0 ? (
                                  <span className="text-xs text-zinc-500">{departmentUsers.length} чел.</span>
                                ) : (
                                  <span className="text-xs text-zinc-400 italic">Нет сотрудников</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditDep(dep)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteDep(dep.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {departments.length === 0 && !isAddingDep && (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  Нет отделов
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'statuses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Статусы задач</h2>
              {!isAddingStatus && (
                <button
                  onClick={() => {
                    setIsAddingStatus(true);
                    setEditingStatus(null);
                    setStatusForm({ name: '', color: '#3b82f6', is_closing: false });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Добавить статус
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Цвет</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-full">Название</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">Завершающий</th>
                    <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {isAddingStatus && (
                    <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                      <td className="px-6 py-3">
                        <input
                          type="color"
                          value={statusForm.color}
                          onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={statusForm.name}
                          onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                          placeholder="Название статуса"
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          autoFocus
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={statusForm.is_closing}
                          onChange={(e) => setStatusForm({ ...statusForm, is_closing: e.target.checked })}
                          className="w-4 h-4 text-primary rounded border-zinc-300 focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={handleSaveStatus} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                            <Save size={18} />
                          </button>
                          <button onClick={handleCancelStatus} className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {statuses.map((status) => (
                    <tr key={status.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      {editingStatus === status.id ? (
                        <>
                          <td className="px-6 py-3">
                            <input
                              type="color"
                              value={statusForm.color}
                              onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              value={statusForm.name}
                              onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              autoFocus
                            />
                          </td>
                          <td className="px-6 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={statusForm.is_closing}
                              onChange={(e) => setStatusForm({ ...statusForm, is_closing: e.target.checked })}
                              className="w-4 h-4 text-primary rounded border-zinc-300 focus:ring-primary"
                            />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={handleSaveStatus} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                <Save size={18} />
                              </button>
                              <button onClick={handleCancelStatus} className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-3">
                            <div className="w-6 h-6 rounded-md" style={{ backgroundColor: status.color }} />
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{status.name}</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {status.is_closing ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Да
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                                Нет
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEditStatus(status)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteStatus(status.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {statuses.length === 0 && !isAddingStatus && (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  Нет статусов
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Все сотрудники системы</h2>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-1/3">Имя</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-1/4">Email</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-1/4">Отдел</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Роль</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {useTasksStore.getState().allUsers.map((user) => {
                    const syncUser = users.find(u => u.id === user.id);
                    const departmentIds = syncUser?.department_ids || (syncUser?.department_id ? [syncUser.department_id] : []);
                    const role = syncUser?.role || 'employee';

                    return (
                      <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                {user.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</span>
                        </td>
                        <td className="px-6 py-3">
                          <select
                            multiple
                            value={departmentIds}
                            onChange={(e) => {
                              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                              if (selectedOptions.length > 0) {
                                updateUser(user.id, { department_ids: selectedOptions, role });
                              } else {
                                useTasksStore.getState().removeUserFromDepartment(user.id);
                              }
                            }}
                            className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 custom-scrollbar"
                            size={3}
                          >
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-zinc-500 mt-1">Ctrl/Cmd для выбора нескольких</p>
                        </td>
                        <td className="px-6 py-3">
                          <select
                            value={role}
                            onChange={(e) => {
                              if (departmentIds.length > 0) {
                                updateUser(user.id, { department_ids: departmentIds, role: e.target.value as any });
                              }
                            }}
                            disabled={departmentIds.length === 0}
                            className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          >
                            <option value="employee">Сотрудник</option>
                            <option value="moderator">Модератор</option>
                            <option value="admin">Админ</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {useTasksStore.getState().allUsers.length === 0 && (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  Нет сотрудников
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'added_users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Добавленные сотрудники</h2>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-1/3">Имя</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-1/4">Email</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-1/4">Отдел</th>
                    <th className="px-6 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Роль</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {users.map((user) => {
                    const departmentIds = user.department_ids || (user.department_id ? [user.department_id] : []);
                    const role = user.role || 'employee';

                    return (
                      <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                {user.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</span>
                        </td>
                        <td className="px-6 py-3">
                          <select
                            multiple
                            value={departmentIds}
                            onChange={(e) => {
                              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                              if (selectedOptions.length > 0) {
                                updateUser(user.id, { department_ids: selectedOptions, role });
                              } else {
                                useTasksStore.getState().removeUserFromDepartment(user.id);
                              }
                            }}
                            className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 custom-scrollbar"
                            size={3}
                          >
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-zinc-500 mt-1">Ctrl/Cmd для выбора нескольких</p>
                        </td>
                        <td className="px-6 py-3">
                          <select
                            value={role}
                            onChange={(e) => {
                              if (departmentIds.length > 0) {
                                updateUser(user.id, { department_ids: departmentIds, role: e.target.value as any });
                              }
                            }}
                            disabled={departmentIds.length === 0}
                            className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                          >
                            <option value="employee">Сотрудник</option>
                            <option value="moderator">Модератор</option>
                            <option value="admin">Админ</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  Нет добавленных сотрудников
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Настройки Telegram уведомлений</h2>
              <div className="space-y-4 w-full">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Токен бота (Bot Token)
                  </label>
                  <input
                    type="text"
                    value={syncDepSettings?.tg_bot_token || ''}
                    onChange={(e) => {
                      db.collection('settings').doc('sync_dep_config').set({
                        ...syncDepSettings,
                        tg_bot_token: e.target.value
                      }, { merge: true });
                    }}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      ID группы (Chat ID)
                    </label>
                    <input
                      type="text"
                      value={syncDepSettings?.tg_monday_chat_ids?.[0] || ''}
                      onChange={(e) => {
                        db.collection('settings').doc('sync_dep_config').set({
                          ...syncDepSettings,
                          tg_monday_chat_ids: [e.target.value],
                          tg_friday_chat_ids: [e.target.value]
                        }, { merge: true });
                      }}
                      placeholder="-1001234567890"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      ID топика (Thread ID, опционально)
                    </label>
                    <input
                      type="text"
                      value={syncDepSettings?.tg_monday_thread_id || ''}
                      onChange={(e) => {
                        db.collection('settings').doc('sync_dep_config').set({
                          ...syncDepSettings,
                          tg_monday_thread_id: e.target.value,
                          tg_friday_thread_id: e.target.value
                        }, { merge: true });
                      }}
                      placeholder="123"
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Тестовая отправка</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!syncDepSettings?.tg_bot_token || !syncDepSettings?.tg_monday_chat_ids?.[0]) {
                          alert('Заполните токен бота и ID группы');
                          return;
                        }
                        try {
                          const res = await fetch('/api/telegram/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              botToken: syncDepSettings.tg_bot_token,
                              chatId: syncDepSettings.tg_monday_chat_ids[0],
                              messageThreadId: syncDepSettings.tg_monday_thread_id,
                              text: '🔔 <b>Тестовое уведомление</b>\n\nНастройки Telegram успешно сохранены!'
                            })
                          });
                          if (res.ok) alert('Сообщение отправлено!');
                          else alert('Ошибка при отправке');
                        } catch (e) {
                          alert('Ошибка при отправке');
                        }
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Отправить тестовое сообщение
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Кастомные уведомления</h2>
                <button
                  onClick={() => {
                    const newMsg = {
                      id: `msg-${Date.now()}`,
                      text: '',
                      time: '08:00',
                      dayOfWeek: 1
                    };
                    const current = syncDepSettings?.custom_scheduled_messages || [];
                    db.collection('settings').doc('sync_dep_config').set({
                      ...syncDepSettings,
                      custom_scheduled_messages: [...current, newMsg]
                    }, { merge: true });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Добавить
                </button>
              </div>
              
              <div className="space-y-4">
                {(syncDepSettings?.custom_scheduled_messages || []).map((msg, index) => (
                  <div key={msg.id} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <textarea
                          value={msg.text}
                          onChange={(e) => {
                            const newMsgs = [...(syncDepSettings?.custom_scheduled_messages || [])];
                            newMsgs[index].text = e.target.value;
                            db.collection('settings').doc('sync_dep_config').set({
                              ...syncDepSettings,
                              custom_scheduled_messages: newMsgs
                            }, { merge: true });
                          }}
                          placeholder="Текст сообщения (поддерживается HTML)"
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                        />
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">День недели</label>
                            <select
                              value={msg.dayOfWeek !== undefined ? msg.dayOfWeek : ''}
                              onChange={(e) => {
                                const newMsgs = [...(syncDepSettings?.custom_scheduled_messages || [])];
                                const val = e.target.value;
                                if (val === '') {
                                  delete newMsgs[index].dayOfWeek;
                                } else {
                                  newMsgs[index].dayOfWeek = parseInt(val);
                                  delete newMsgs[index].date;
                                }
                                delete newMsgs[index].lastSent;
                                db.collection('settings').doc('sync_dep_config').set({
                                  ...syncDepSettings,
                                  custom_scheduled_messages: newMsgs
                                }, { merge: true });
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="">Конкретная дата</option>
                              <option value="1">Понедельник</option>
                              <option value="2">Вторник</option>
                              <option value="3">Среда</option>
                              <option value="4">Четверг</option>
                              <option value="5">Пятница</option>
                              <option value="6">Суббота</option>
                              <option value="0">Воскресенье</option>
                            </select>
                          </div>
                          {msg.dayOfWeek === undefined && (
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Дата</label>
                              <input
                                type="date"
                                value={msg.date || ''}
                                onChange={(e) => {
                                  const newMsgs = [...(syncDepSettings?.custom_scheduled_messages || [])];
                                  newMsgs[index].date = e.target.value;
                                  delete newMsgs[index].lastSent;
                                  db.collection('settings').doc('sync_dep_config').set({
                                    ...syncDepSettings,
                                    custom_scheduled_messages: newMsgs
                                  }, { merge: true });
                                }}
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Время (Бишкек)</label>
                            <input
                              type="time"
                              value={msg.time}
                              onChange={(e) => {
                                const newMsgs = [...(syncDepSettings?.custom_scheduled_messages || [])];
                                newMsgs[index].time = e.target.value;
                                delete newMsgs[index].lastSent;
                                db.collection('settings').doc('sync_dep_config').set({
                                  ...syncDepSettings,
                                  custom_scheduled_messages: newMsgs
                                }, { merge: true });
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            if (!syncDepSettings?.tg_bot_token || !syncDepSettings?.tg_monday_chat_ids?.[0]) {
                              alert('Заполните токен бота и ID группы в настройках выше');
                              return;
                            }
                            if (!msg.text) {
                              alert('Введите текст сообщения');
                              return;
                            }
                            try {
                              const res = await fetch('/api/telegram/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  botToken: syncDepSettings.tg_bot_token,
                                  chatId: syncDepSettings.tg_monday_chat_ids[0],
                                  messageThreadId: syncDepSettings.tg_monday_thread_id,
                                  text: msg.text
                                })
                              });
                              if (res.ok) alert('Сообщение отправлено!');
                              else alert('Ошибка при отправке');
                            } catch (e) {
                              alert('Ошибка при отправке');
                            }
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Отправить сейчас (тест)"
                        >
                          <Bell size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Удалить это уведомление?')) {
                              const newMsgs = (syncDepSettings?.custom_scheduled_messages || []).filter(m => m.id !== msg.id);
                              db.collection('settings').doc('sync_dep_config').set({
                                ...syncDepSettings,
                                custom_scheduled_messages: newMsgs
                              }, { merge: true });
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!syncDepSettings?.custom_scheduled_messages || syncDepSettings.custom_scheduled_messages.length === 0) && (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    Нет кастомных уведомлений
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'import' && (
          <ImportTab />
        )}
      </div>
    </div>
  );
};
