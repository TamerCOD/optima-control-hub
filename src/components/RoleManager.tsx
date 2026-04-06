
import React, { useState, useEffect } from 'react';
import { RoleDefinition, Permission, UserRole, Department, User } from '../types';
import { SYSTEM_PERMISSIONS, PERMISSION_GROUPS } from '../constants';
import { 
    ShieldCheck, Plus, Trash2, Save, X, Search, 
    Check, Building2, Edit2
} from 'lucide-react';

interface Props {
  viewMode?: 'roles' | 'departments';
  roles: RoleDefinition[];
  users?: User[];
  permissions: Permission[];
  departments: Department[];
  onUpdateRole: (role: RoleDefinition) => void;
  onCreateRole: (role: RoleDefinition) => void;
  onDeleteRole: (id: string) => void;
  onUpdateDepartment: (dept: Department) => void;
  onCreateDepartment: (dept: Department) => void;
  onDeleteDepartment: (id: string) => void;
  onUpdateUser: (user: User) => void;
}

const RoleManager: React.FC<Props> = ({
  viewMode = 'roles',
  roles, departments,
  onUpdateRole, onCreateRole, onDeleteRole,
  onUpdateDepartment, onCreateDepartment, onDeleteDepartment
}) => {
  const [activeView] = useState<'matrix' | 'depts'>(viewMode === 'roles' ? 'matrix' : 'depts');
  const [localRoles, setLocalRoles] = useState<RoleDefinition[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [bulkRolesText, setBulkRolesText] = useState('');

  // Sync initial state
  useEffect(() => {
      if (!hasChanges) {
          setLocalRoles(JSON.parse(JSON.stringify(roles)));
      }
  }, [roles, hasChanges]);

  // --- Handlers ---

  const handleToggle = (roleId: string, permId: string) => {
      setLocalRoles(prev => prev.map(r => {
          if (r.id === roleId && r.id !== UserRole.SUPER_ADMIN) {
              const has = r.permissionIds.includes(permId);
              return {
                  ...r,
                  permissionIds: has ? r.permissionIds.filter(id => id !== permId) : [...r.permissionIds, permId]
              };
          }
          return r;
      }));
      setHasChanges(true);
  };

  const handleMassToggleRow = (roleId: string) => {
      const role = localRoles.find(r => r.id === roleId);
      if (!role || role.id === UserRole.SUPER_ADMIN) return;
      const allIds = SYSTEM_PERMISSIONS.map(p => p.id);
      const isFull = role.permissionIds.length >= allIds.length; 
      setLocalRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissionIds: isFull ? [] : allIds } : r));
      setHasChanges(true);
  };

  const handleMassToggleCol = (permId: string) => {
      const rolesToUpdate = localRoles.filter(r => r.id !== UserRole.SUPER_ADMIN);
      const allHaveIt = rolesToUpdate.every(r => r.permissionIds.includes(permId));
      setLocalRoles(prev => prev.map(r => {
          if (r.id === UserRole.SUPER_ADMIN) return r;
          const current = new Set(r.permissionIds);
          if (allHaveIt) current.delete(permId); else current.add(permId);
          return { ...r, permissionIds: Array.from(current) };
      }));
      setHasChanges(true);
  };

  const handleMassToggleGroup = (groupName: string) => {
      const permsInGroup = SYSTEM_PERMISSIONS.filter(p => p.category === groupName).map(p => p.id);
      const rolesToUpdate = localRoles.filter(r => r.id !== UserRole.SUPER_ADMIN);
      const allHaveAll = rolesToUpdate.every(r => permsInGroup.every(pid => r.permissionIds.includes(pid)));
      setLocalRoles(prev => prev.map(r => {
          if (r.id === UserRole.SUPER_ADMIN) return r;
          const current = new Set(r.permissionIds);
          if (allHaveAll) permsInGroup.forEach(pid => current.delete(pid)); else permsInGroup.forEach(pid => current.add(pid));
          return { ...r, permissionIds: Array.from(current) };
      }));
      setHasChanges(true);
  };

  const handleSaveChanges = () => {
      localRoles.forEach(lr => {
          const original = roles.find(r => r.id === lr.id);
          if (JSON.stringify(original?.permissionIds) !== JSON.stringify(lr.permissionIds)) onUpdateRole(lr);
      });
      setHasChanges(false);
      alert('Изменения сохранены!');
  };

  const handleRevert = () => {
      setLocalRoles(JSON.parse(JSON.stringify(roles)));
      setHasChanges(false);
  };

  const handleCreateRole = () => {
      if (!newRoleName.trim()) return;
      onCreateRole({ id: `role_${Date.now()}`, name: newRoleName, permissionIds: [], departmentId: filterDept !== 'all' ? filterDept : undefined });
      setNewRoleName('');
      setIsAddingRole(false);
  };

  const handleBulkCreateRoles = () => {
      if (!bulkRolesText.trim()) return;
      const roleNames = bulkRolesText.split('\n').map(n => n.trim()).filter(Boolean);
      roleNames.forEach((name, idx) => {
          onCreateRole({ 
              id: `role_${Date.now()}_${idx}`, 
              name, 
              permissionIds: [],
              departmentId: filterDept !== 'all' ? filterDept : undefined
          });
      });
      setBulkRolesText('');
      setIsBulkAdding(false);
  };

  // --- Views ---

  const MatrixView = () => {
      const groupedPermissions = Object.values(PERMISSION_GROUPS).map(group => ({
          name: group,
          perms: SYSTEM_PERMISSIONS.filter(p => p.category === group)
      })).filter(g => g.perms.length > 0);

      const filteredRoles = localRoles.filter(r => {
          const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesDept = filterDept === 'all' || r.departmentId === filterDept;
          return matchesSearch && matchesDept;
      });

      return (
        <div className="animate-fade-in pb-20">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-6 glass-panel p-3 sticky top-0 z-30">
                <div>
                    <h2 className="text-3xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">Матрица Доступа</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest mt-1">Управление полномочиями</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <select 
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="input-3d w-full pl-10 pr-4 py-3 text-xs font-bold text-zinc-900 dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="all">Все подразделения</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 md:w-48">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Поиск роли..." className="input-3d w-full pl-10 pr-4 py-3 text-xs font-bold text-zinc-900 dark:text-white"/>
                    </div>
                    
                    {isAddingRole ? (
                        <div className="flex gap-2 animate-fade-in">
                            <input autoFocus value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Название..." className="input-3d w-40 px-3 py-3 text-xs font-bold text-zinc-900 dark:text-white"/>
                            <button onClick={handleCreateRole} className="btn-3d p-2 text-green-500"><Check size={16}/></button>
                            <button onClick={() => setIsAddingRole(false)} className="btn-3d p-2 text-zinc-500"><X size={16}/></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsAddingRole(true)} className="btn-3d bg-zinc-950 dark:bg-white text-white dark:text-black px-5 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                            <Plus size={16}/> Создать Роль
                        </button>
                    )}
                    <button onClick={() => setIsBulkAdding(true)} className="btn-3d bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-5 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 flex-shrink-0">
                        Массовое добавление
                    </button>
                </div>
            </div>

            {isBulkAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsBulkAdding(false)} />
                    <div className="relative clay-panel w-full max-w-xl shadow-2xl overflow-hidden animate-modal-in p-4">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">Массовое добавление ролей</h3>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Каждая роль с новой строки</p>
                            </div>
                            <button onClick={() => setIsBulkAdding(false)} className="p-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"><X size={24}/></button>
                        </div>
                        <textarea 
                            value={bulkRolesText}
                            onChange={(e) => setBulkRolesText(e.target.value)}
                            className="w-full h-48 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all resize-none mb-6"
                            placeholder="Менеджер&#10;Аналитик&#10;Разработчик"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsBulkAdding(false)} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Отмена</button>
                            <button onClick={handleBulkCreateRoles} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all">Добавить</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Matrix Table */}
            <div className="glass-panel rounded-[2rem] overflow-hidden relative flex flex-col max-h-[75vh]">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 glass-panel shadow-md">
                            {/* Group Row */}
                            <tr>
                                <th className="sticky left-0 z-30 glass-panel p-3 min-w-[280px] border-b-2 border-r-2 border-zinc-300/50 dark:border-zinc-700/50 text-left align-bottom">
                                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block mb-2">Роли \ Функции</span>
                                    <div className="text-[9px] text-zinc-400 font-medium">Клик по ячейке заголовка = Выбрать все</div>
                                </th>
                                {groupedPermissions.map(group => (
                                    <th 
                                        key={group.name} 
                                        colSpan={group.perms.length} 
                                        onClick={() => handleMassToggleGroup(group.name)}
                                        className="p-2 border-b-2 border-r-2 border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-100/50 dark:bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors text-center group relative h-10 align-middle"
                                        title="Выбрать всю группу"
                                    >
                                        <div className="flex items-center justify-center gap-2 w-full">
                                            {group.name}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            {/* Permissions Row */}
                            <tr className="bg-zinc-50/50 dark:bg-zinc-900/50">
                                <th className="sticky left-0 z-30 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 border-b-2 border-r-2 border-zinc-300/50 dark:border-zinc-700/50"></th>
                                {groupedPermissions.flatMap(g => g.perms).map(perm => (
                                    <th 
                                        key={perm.id}
                                        onClick={() => handleMassToggleCol(perm.id)}
                                        className="p-2 min-w-[42px] border-b-2 border-r border-zinc-200/50 dark:border-zinc-800/50 cursor-pointer hover:bg-primary/5 transition-colors relative group h-48 align-bottom pb-4"
                                    >
                                        <div className="w-full h-full flex flex-col justify-end items-center">
                                            {/* Using standard vertical-rl writing mode for better readability */}
                                            <span 
                                                className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-primary transition-colors whitespace-nowrap" 
                                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                            >
                                                {perm.name}
                                            </span>
                                        </div>
                                        {/* Hover line guide */}
                                        <div className="absolute inset-0 border-x border-transparent group-hover:border-zinc-200 dark:group-hover:border-zinc-700 pointer-events-none"></div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] bg-zinc-950 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl transition-opacity">
                                            <div className="font-bold border-b border-white/20 pb-1 mb-1">{perm.name}</div>
                                            {perm.description}
                                            <div className="text-zinc-500 mt-1 font-mono text-[9px]">{perm.id}</div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                            {filteredRoles.map((role, idx) => {
                                const isSuper = role.id === UserRole.SUPER_ADMIN;
                                // Zebra striping
                                const rowClass = idx % 2 === 0 ? 'bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur-sm' : '';
                                
                                return (
                                    <tr key={role.id} className={`${rowClass} hover:bg-primary/10 transition-colors group/row`}>
                                        {/* Role Header */}
                                        <td 
                                            className={`sticky left-0 z-10 ${rowClass} group-hover/row:bg-primary/10 p-3 border-r-2 border-zinc-300/50 dark:border-zinc-700/50 cursor-pointer transition-colors backdrop-blur-sm`}
                                            onClick={() => handleMassToggleRow(role.id)}
                                            title="Кликните, чтобы выдать/снять ВСЕ права этой роли"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    {isSuper ? <ShieldCheck size={18} className="text-primary"/> : <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover/row:bg-zinc-900 dark:group-hover/row:bg-white transition-colors"/>}
                                                    <div>
                                                        <span className={`text-xs font-black uppercase tracking-tight block ${isSuper ? 'text-primary' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                                            {role.name}
                                                            {role.departmentId && (
                                                                <span className="ml-2 text-[9px] font-bold text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded-md">
                                                                    {departments.find(d => d.id === role.departmentId)?.name || 'Неизвестно'}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-[9px] text-zinc-400 font-mono">{role.permissionIds.length} прав</span>
                                                    </div>
                                                </div>
                                                {!isSuper && !role.isSystem && (
                                                    <button onClick={(e) => {e.stopPropagation(); if(window.confirm('Удалить роль?')) onDeleteRole(role.id)}} className="opacity-0 group-hover/row:opacity-100 text-zinc-300 hover:text-red-500 hover:scale-[1.1] active:scale-[0.9] transition-all p-1"><Trash2 size={14}/></button>
                                                )}
                                            </div>
                                        </td>

                                        {/* Checkboxes */}
                                        {groupedPermissions.flatMap((g, gIdx) => g.perms.map((perm, pIdx) => {
                                            const hasPerm = isSuper || role.permissionIds.includes(perm.id);
                                            const isChanged = !isSuper && (roles.find(r => r.id === role.id)?.permissionIds.includes(perm.id) !== hasPerm);
                                            const isLastInGroup = pIdx === g.perms.length - 1;
                                            
                                            return (
                                                <td key={perm.id} className={`p-0 border-b border-zinc-200/50 dark:border-zinc-800/50 text-center relative group/cell ${isLastInGroup ? 'border-r-2 border-r-zinc-300/50 dark:border-r-zinc-700/50' : 'border-r border-r-zinc-100/50 dark:border-r-zinc-800/50'}`}>
                                                    <div className="w-full h-full flex items-center justify-center p-2 min-h-[40px]">
                                                        <button 
                                                            disabled={isSuper}
                                                            onClick={() => handleToggle(role.id, perm.id)}
                                                            className={`w-5 h-5 rounded flex items-center justify-center transition-all duration-150 ${
                                                                hasPerm 
                                                                    ? isSuper 
                                                                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600' 
                                                                        : 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md scale-100'
                                                                    : 'bg-transparent border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                                                            } ${isChanged ? 'ring-2 ring-yellow-400 ring-offset-1 dark:ring-offset-black bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                                                        >
                                                            {hasPerm && <Check size={12} strokeWidth={4} />}
                                                        </button>
                                                    </div>
                                                    {/* Hover crosshair effect */}
                                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity"></div>
                                                </td>
                                            );
                                        }))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Save Action */}
            {hasChanges && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 text-white pl-6 pr-2 py-2 rounded-full shadow-2xl border border-zinc-700 flex items-center gap-6 animate-fade-in-up">
                    <span className="text-xs font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div> Есть несохраненные изменения</span>
                    <div className="flex gap-1">
                        <button onClick={handleRevert} className="px-4 py-2 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Сбросить</button>
                        <button onClick={handleSaveChanges} className="px-6 py-2 bg-white text-zinc-950 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg flex items-center gap-2">
                            <Save size={14}/> Сохранить
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  };

  const DepartmentsView = () => (
      <div className="animate-fade-in space-y-10 pb-40">
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-zinc-200/50 dark:border-zinc-800/50 pb-6 gap-6">
              <div>
                  <h3 className="text-4xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter leading-none">Филиальная Сеть</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-xs font-bold uppercase tracking-widest">Управление структурными подразделениями</p>
              </div>
              <button onClick={() => { const n = prompt('Название нового филиала:'); if(n) onCreateDepartment({id:`d_${Date.now()}`, name: n, permissionIds: []}); }} className="btn-3d bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-10 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3"><Plus size={20}/> Добавить Подразделение</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {departments.map(d => (
                  <div key={d.id} className="glass-panel p-6 group hover:border-primary/30 transition-all relative overflow-hidden flex flex-col justify-between">
                      <div>
                          <div className="flex justify-between items-start mb-8">
                              <div className="w-16 h-16 input-3d rounded-2xl flex items-center justify-center text-zinc-950 dark:text-white group-hover:scale-110 transition-transform"><Building2 size={32} /></div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => { const n = prompt('Новое название:', d.name); if(n) onUpdateDepartment({...d, name: n}); }} className="btn-3d p-2.5 hover:text-primary transition-colors"><Edit2 size={18}/></button>
                                  <button onClick={() => { if(window.confirm('Удалить филиал? Это не удалит сотрудников.')) onDeleteDepartment(d.id); }} className="btn-3d p-2.5 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                              </div>
                          </div>
                          <h4 className="text-2xl font-black text-zinc-950 dark:text-white leading-tight uppercase tracking-tighter mb-4">{d.name}</h4>
                          <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest input-3d px-3 py-1 rounded-full">ID: {d.id}</span>
                          </div>
                      </div>
                      <div className="absolute -bottom-8 -right-8 opacity-5 pointer-events-none group-hover:scale-125 transition-transform"><Building2 size={180} /></div>
                  </div>
              ))}
              {departments.length === 0 && <div className="col-span-full p-32 text-center text-zinc-400 font-black uppercase tracking-[0.4em] border-2 border-dashed border-zinc-200 rounded-[3rem]">Список пуст</div>}
          </div>
      </div>
  );

  if (activeView === 'depts') return <DepartmentsView />;

  return <MatrixView />;
};

export default RoleManager;
