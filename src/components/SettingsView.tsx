
import React, { useState, useEffect } from 'react';
import { Trash2, Sliders, Save } from 'lucide-react';
import { db } from '../firebase';
import { User, Department, RoleDefinition, SystemSettings, AssessmentResult, AssessmentSession, Ticket } from '../types';

interface Props {
  users: User[];
  departments: Department[];
  roles: RoleDefinition[];
  currentUser: User;
  settings?: SystemSettings;
  results?: AssessmentResult[]; 
  sessions?: AssessmentSession[]; 
  tickets?: Ticket[]; 
}

const SettingsView: React.FC<Props> = ({ users, departments, roles, currentUser, settings, results = [], sessions = [], tickets = [] }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetUserId, setTargetUserId] = useState<string>(''); 
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [deletedCount, setDeletedCount] = useState(0);
  const [passingThreshold, setPassingThreshold] = useState(70);

  useEffect(() => { if (settings?.passingThreshold) setPassingThreshold(settings.passingThreshold); }, [settings]);

  const handleSaveThreshold = async () => {
      try { await db.collection('settings').doc('config').set({ passingThreshold: Number(passingThreshold) }, { merge: true }); alert('Обновлено'); } catch (e) { alert(e); }
  };

  const handleClearArchive = async () => {
    if (!startDate || !endDate) return alert("Выберите даты");
    if (!window.confirm(`Удалить результаты навсегда?`)) return;
    setStatus('loading'); setDeletedCount(0); setErrorMsg('');
    try {
      let q: any = db.collection('results');
      if (startDate && endDate) {
          q = q.where('startedAt', '>=', new Date(startDate).toISOString()).where('startedAt', '<=', new Date(new Date(endDate).setHours(23,59,59)).toISOString());
      }
      if (targetUserId) q = q.where('userId', '==', targetUserId);
      const snapshot = await q.get();
      if (snapshot.empty) return (setStatus('error'), setErrorMsg('Пусто'));
      const batch = db.batch(); snapshot.docs.forEach((d:any) => batch.delete(d.ref)); await batch.commit();
      setDeletedCount(snapshot.size); setStatus('success');
    } catch (e: any) { setStatus('error'); setErrorMsg(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="border-b border-secondary-200 pb-4"><h2 className="text-3xl font-serif font-bold text-secondary-900">Конфигурация</h2><p className="text-secondary-500 mt-1">Системные настройки</p></div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-card border p-4 hover:scale-[1.02] transition-transform"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-secondary-900 text-white rounded-xl"><Sliders size={24} /></div><h3 className="font-serif text-xl font-bold">Порог Успешности</h3></div><div className="space-y-6"><input type="range" min="50" max="100" value={passingThreshold} onChange={e => setPassingThreshold(+e.target.value)} className="w-full h-2 bg-secondary-200 rounded-lg appearance-none accent-primary-600"/><div className="text-2xl font-bold text-center">{passingThreshold}%</div><button onClick={handleSaveThreshold} className="w-full py-3 bg-secondary-900 text-white rounded-lg flex justify-center items-center gap-2 hover:bg-secondary-800 transition-colors"><Save size={16} /> Сохранить</button></div></div>
        <div className="bg-white rounded-xl shadow-card border p-4 hover:scale-[1.02] transition-transform"><div className="flex items-center gap-3 mb-6"><div className="p-2 bg-red-50 text-red-600 rounded-xl"><Trash2 size={24} /></div><h3 className="font-serif text-xl font-bold">Очистка Архива</h3></div><div className="bg-red-50 p-3 rounded-xl mb-4 text-xs text-red-800">Внимание: результаты удаляются безвозвратно.</div><div className="space-y-4"><select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="w-full p-2 border rounded"><option value="">Все сотрудники</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded text-sm"/><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded text-sm"/></div><button onClick={handleClearArchive} disabled={status === 'loading'} className="w-full py-3 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">{status === 'loading' ? '...' : 'Удалить данные'}</button>{status === 'success' && <p className="text-green-600 text-center mt-2">Удалено: {deletedCount}</p>}</div></div>
      </div>
    </div>
  );
};

export default SettingsView;
