
import React, { useState, useRef } from 'react';
import { 
    Users, Search, Edit2, Trash2, X, 
    UserPlus, Building2, 
    CheckCircle2, Upload,
    Key, FileSpreadsheet
} from 'lucide-react';
import { User, Department, RoleDefinition } from '../types';
import { auth } from '../firebase';
import * as XLSX from 'xlsx';
import AvatarViewer from './AvatarViewer';

interface Props {
  users: User[];
  departments: Department[];
  roles: RoleDefinition[];
  currentUser: User;
  onAddUser: (user: User) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onCreateRole?: (role: RoleDefinition) => void;
}

const UserManagement: React.FC<Props> = ({ 
    users, departments, roles, currentUser, 
    onAddUser, onUpdateUser, onDeleteUser, onCreateRole
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingRole, setIsAddingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingAvatarUser, setViewingAvatarUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<User>>({
        name: '',
        email: '',
        roles: [],
        departmentId: '',
        isActive: true,
        password: ''
    });

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ ...user, password: '' });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                roles: [],
                departmentId: departments[0]?.id || '',
                isActive: true,
                password: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.departmentId) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }
        setIsSaving(true);
        try {
            if (editingUser) {
                await onUpdateUser({ ...editingUser, ...formData } as User);
            } else {
                await onAddUser({
                    ...formData,
                    id: '', // Will be set by Firebase Auth in App.tsx
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.email}`,
                    isDeleted: false,
                    isActive: true,
                    needsPasswordChange: true
                } as User);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendResetEmail = async (email: string) => {
        if (!window.confirm(`Отправить ссылку на сброс пароля на ${email}?`)) return;
        try {
            await auth.sendPasswordResetEmail(email);
            alert('Ссылка для сброса пароля отправлена на почту сотрудника.');
        } catch (err: any) {
            alert('Ошибка: ' + err.message);
        }
    };

    const handleExportTemplate = () => {
        const wb = XLSX.utils.book_new();
        const data = [
            ["ФИО", "Email", "Временный Пароль", "ID Отдела", "Роли (через запятую)", "Telegram ID", "Telegram Username"],
            ["Иванов Иван", "ivanov@optima.kg", "TempPass123!", departments[0]?.id || "dept_1", "employee", "123456789", "ivanov_i"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Optima_User_Import_Template.xlsx");
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                if (window.confirm(`Найдено ${data.length} сотрудников. Начать импорт?`)) {
                    let addedCount = 0;
                    let skippedCount = 0;
                    for (const row of data) {
                        const email = row['Email']?.trim();
                        const name = row['ФИО']?.trim();
                        const pwd = String(row['Временный Пароль'] || 'qwe123!@#').trim();
                        const dId = row['ID Отдела']?.trim();
                        const rolesStr = String(row['Роли (через запятую)'] || 'employee').trim();
                        const tgId = String(row['Telegram ID'] || '').trim();
                        const tgUsername = String(row['Telegram Username'] || '').trim().replace('@', '');

                        if (email && name && dId) {
                            const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                            if (existingUser) {
                                skippedCount++;
                                continue;
                            }
                            
                            const userRoles = rolesStr.split(',').map((r: string) => r.trim()).filter(Boolean);
                            
                            await onAddUser({
                                id: '',
                                name,
                                email,
                                password: pwd,
                                roles: userRoles.length > 0 ? userRoles : ['employee'],
                                departmentId: dId,
                                departmentName: departments.find(d => d.id === dId)?.name || 'Неизвестный отдел',
                                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                                isActive: true,
                                isDeleted: false,
                                needsPasswordChange: true,
                                telegramId: tgId || undefined,
                                telegramUsername: tgUsername || undefined,
                                telegramNotificationsEnabled: true
                            } as User);
                            addedCount++;
                        }
                    }
                    alert(`Импорт завершен. Добавлено: ${addedCount}, Пропущено (уже существуют): ${skippedCount}`);
                }
            } catch (err) {
                alert('Ошибка при чтении файла');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'all' || u.departmentId === filterDept;
        return matchesSearch && matchesDept && !u.isDeleted;
    });

    return (
        <div className="animate-fade-in space-y-6 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white dark:bg-zinc-900 p-4 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-sharp">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl">
                            <Users size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter leading-none">Реестр Персонала</h2>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">Управление учетными записями и доступом</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExportTemplate}
                        className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 transition-all"
                    >
                        <FileSpreadsheet size={18} /> Шаблон
                    </button>
                    <label className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 transition-all cursor-pointer">
                        <Upload size={18} /> Импорт
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                    </label>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="bg-zinc-950 dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:scale-105 transition-all active:scale-95"
                    >
                        <UserPlus size={20} /> Добавить
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Поиск по имени или email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 ring-primary/20 transition-all"
                    />
                </div>
                <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <select 
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">Все филиалы</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 text-xs font-bold text-zinc-500">
                    Найдено: {filteredUsers.length}
                </div>
            </div>

            {/* Users Table */}
            <div className="clay-panel shadow-sharp overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                                <th className="p-3 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Сотрудник</th>
                                <th className="p-3 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Подразделение</th>
                                <th className="p-3 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Роли</th>
                                <th className="p-3 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Статус входа</th>
                                <th className="p-3 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all hover:scale-[1.01] group">
                                    <td className="p-3">
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className="relative group cursor-pointer"
                                                onClick={() => setViewingAvatarUser(user)}
                                            >
                                                <img 
                                                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                                                    className="w-10 h-10 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800" 
                                                    alt={user.name} 
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                    <Edit2 size={14} className="text-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-black uppercase tracking-tight dark:text-white">{user.name}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 uppercase">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                                            <Building2 size={14} className="text-zinc-400" />
                                            {departments.find(d => d.id === user.departmentId)?.name || user.departmentName || '—'}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map(roleId => {
                                                const roleDef = roles?.find(r => r.id === roleId);
                                                return (
                                                    <span key={roleId} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                        {roleDef?.name || roleId}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            {user.lastLoginAt ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-green-600 uppercase">Входил</span>
                                                    <span className="text-[9px] font-bold text-zinc-400">{new Date(user.lastLoginAt).toLocaleString()}</span>
                                                </div>
                                            ) : (user.needsPasswordChange === false || (user.stats && user.stats.completed > 0)) ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-green-600 uppercase">Входил</span>
                                                    <span className="text-[9px] font-bold text-zinc-400 italic">Ранее (до обновления)</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase italic">Ни разу не входил</span>
                                                    {user.createdAt && (
                                                        <span className="text-[8px] font-bold text-zinc-500 uppercase">Создан: {new Date(user.createdAt).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleOpenModal(user)} 
                                                className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl hover:text-primary transition-colors border dark:border-zinc-800"
                                                title="Редактировать"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleSendResetEmail(user.email)} 
                                                className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl hover:text-blue-600 transition-colors border dark:border-zinc-800"
                                                title="Сбросить пароль"
                                            >
                                                <Key size={16}/>
                                            </button>
                                            {user.id !== currentUser.id && (
                                                <button 
                                                    onClick={() => { if(window.confirm('Удалить сотрудника?')) onDeleteUser(user.id); }} 
                                                    className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-xl hover:text-red-600 transition-colors border dark:border-zinc-800"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-zinc-400">
                            <Users size={48} strokeWidth={1} />
                            <span className="font-black uppercase tracking-[0.3em]">Сотрудники не найдены</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                    <div className="relative clay-panel w-full max-w-xl shadow-2xl overflow-hidden animate-modal-in">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-950 dark:text-white uppercase tracking-tighter">{editingUser ? 'Редактировать' : 'Новый сотрудник'}</h3>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Параметры учетной записи</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"><X size={24}/></button>
                        </div>

                        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">ФИО</label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        placeholder="Иванов Иван"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        placeholder="ivanov@optima.kg"
                                    />
                                </div>
                            </div>

                            {!editingUser && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Временный пароль</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                        <input 
                                            type="text" 
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                            placeholder="Минимум 6 символов"
                                        />
                                    </div>
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase ml-1">Сотрудник должен будет сменить его при первом входе</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Подразделение (Филиал)</label>
                                <select 
                                    value={formData.departmentId}
                                    onChange={(e) => {
                                        const d = departments.find(dept => dept.id === e.target.value);
                                        setFormData({...formData, departmentId: e.target.value, departmentName: d?.name || ''});
                                    }}
                                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                                >
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Роли</label>
                                    {!isAddingRole && onCreateRole && (
                                        <button 
                                            onClick={() => setIsAddingRole(true)}
                                            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
                                        >
                                            + Добавить новую роль
                                        </button>
                                    )}
                                </div>
                                
                                {isAddingRole && onCreateRole && (
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={newRoleName}
                                            onChange={(e) => setNewRoleName(e.target.value)}
                                            placeholder="Название новой роли..."
                                            className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (!newRoleName.trim()) return;
                                                const newRoleId = `role_${Date.now()}`;
                                                onCreateRole({
                                                    id: newRoleId,
                                                    name: newRoleName.trim(),
                                                    permissionIds: [],
                                                    departmentId: formData.departmentId || undefined
                                                });
                                                setFormData({
                                                    ...formData, 
                                                    roles: [...(formData.roles || []), newRoleId]
                                                });
                                                setNewRoleName('');
                                                setIsAddingRole(false);
                                            }}
                                            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
                                        >
                                            Добавить
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsAddingRole(false);
                                                setNewRoleName('');
                                            }}
                                            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                    {roles.filter(r => !r.departmentId || r.departmentId === formData.departmentId).map(role => {
                                        const isSelected = formData.roles?.includes(role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                onClick={() => {
                                                    const currentRoles = formData.roles || [];
                                                    const newRoles = isSelected 
                                                        ? currentRoles.filter(r => r !== role.id)
                                                        : [...currentRoles, role.id];
                                                    setFormData({...formData, roles: newRoles});
                                                }}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
                                                    isSelected 
                                                        ? 'bg-primary text-white border-primary shadow-md' 
                                                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-primary/50'
                                                }`}
                                            >
                                                {role.name}
                                                {role.departmentId && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400'}`}>
                                                        {departments.find(d => d.id === role.departmentId)?.name || 'Неизвестно'}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Telegram ID</label>
                                    <input 
                                        type="text" 
                                        value={formData.telegramId || ''}
                                        onChange={(e) => setFormData({...formData, telegramId: e.target.value})}
                                        className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        placeholder="123456789"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Telegram Username</label>
                                    <input 
                                        type="text" 
                                        value={formData.telegramUsername || ''}
                                        onChange={(e) => setFormData({...formData, telegramUsername: e.target.value.replace('@', '')})}
                                        className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-primary/20 transition-all"
                                        placeholder="username (без @)"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                                <button 
                                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                                    className={`w-12 h-6 rounded-full relative transition-all ${formData.isActive ? 'bg-green-500' : 'bg-zinc-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                                </button>
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Активный аккаунт</span>
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900 flex gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-4 bg-white dark:bg-zinc-800 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-100 transition-all border border-zinc-200 dark:border-zinc-700"
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-4 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={18} />}
                                {editingUser ? 'Сохранить' : 'Создать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewingAvatarUser && (
                <AvatarViewer
                    user={viewingAvatarUser}
                    currentUser={currentUser}
                    onClose={() => setViewingAvatarUser(null)}
                    onAvatarUpdated={() => {
                        setViewingAvatarUser(null);
                    }}
                />
            )}
        </div>
    );
};

export default UserManagement;
