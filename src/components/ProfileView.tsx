
import React, { useState } from 'react';
import { User, AssessmentResult, Department, RoleDefinition } from '../types';
import { Mail, Building2, Briefcase, Award, CheckCircle, Clock } from 'lucide-react';
import AvatarViewer from './AvatarViewer';

interface Props {
  targetUser: User;
  currentUser: User;
  results: AssessmentResult[];
  departments: Department[];
  roles: RoleDefinition[];
  passingThreshold: number;
}

const ProfileView: React.FC<Props> = ({ targetUser, currentUser, results, departments, roles, passingThreshold }) => {
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);

  const userResults = results
    .filter(r => r.userId === targetUser.id)
    .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());

  const totalAttempts = userResults.length;
  const passedCount = userResults.filter(r => {
      const pct = r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0;
      return pct >= passingThreshold;
  }).length;
  
  const averageScore = totalAttempts > 0 
    ? Math.round(userResults.reduce((acc, r) => acc + (r.maxScore > 0 ? (r.totalScore/r.maxScore)*100 : 0), 0) / totalAttempts)
    : 0;

  return (
    <div className="animate-fade-in pb-20 space-y-8">
       <div className="glass-panel p-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary-600 to-zinc-900"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-end gap-6 mt-12 px-4">
               <div 
                 className="relative group cursor-pointer"
                 onClick={() => setIsAvatarViewerOpen(true)}
               >
                 <img src={targetUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.email}`} className="w-32 h-32 rounded-3xl border-4 border-white dark:border-zinc-900 shadow-2xl bg-white object-cover" alt="Avatar"/>
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                   <span className="text-white text-xs font-bold uppercase tracking-widest">Изменить</span>
                 </div>
               </div>
               <div className="mb-2 flex-1">
                   <h1 className="text-3xl font-black text-zinc-900 dark:text-white leading-none">{targetUser.name}</h1>
                   <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                       <span className="flex items-center gap-1.5"><Mail size={16}/> {targetUser.email}</span>
                       <span className="flex items-center gap-1.5"><Building2 size={16}/> {targetUser.departmentName}</span>
                   </div>
               </div>
               <div className="flex gap-2 mb-2">
                   {targetUser.roles.map(rid => (
                       <span key={rid} className="px-3 py-1 rounded-full input-3d text-zinc-600 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                           <Briefcase size={12}/> {roles.find(r => r.id === rid)?.name || rid}
                       </span>
                   ))}
               </div>
           </div>
       </div>

       {isAvatarViewerOpen && (
         <AvatarViewer 
           user={targetUser} 
           currentUser={currentUser} 
           onClose={() => setIsAvatarViewerOpen(false)} 
           onAvatarUpdated={() => setIsAvatarViewerOpen(false)}
         />
       )}

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="glass-panel p-3 hover:scale-[1.02] transition-transform">
               <div className="flex items-center gap-3 mb-2 text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">
                   <Award size={18} className="text-primary"/> Рейтинг Успешности
               </div>
               <div className="text-4xl font-black text-zinc-900 dark:text-white">{averageScore}%</div>
               <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-primary" style={{width: `${averageScore}%`}}></div>
               </div>
           </div>
           <div className="glass-panel p-3 hover:scale-[1.02] transition-transform">
               <div className="flex items-center gap-3 mb-2 text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">
                   <CheckCircle size={18} className="text-green-500"/> Сдано Тестов
               </div>
               <div className="text-4xl font-black text-zinc-900 dark:text-white">{passedCount} <span className="text-lg text-zinc-400">/ {totalAttempts}</span></div>
           </div>
           <div className="glass-panel p-3 hover:scale-[1.02] transition-transform">
               <div className="flex items-center gap-3 mb-2 text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-widest">
                   <Clock size={18} className="text-blue-500"/> Последняя Активность
               </div>
               <div className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
                   {userResults[0] 
                        ? new Date(userResults[0].completedAt || userResults[0].startedAt).toLocaleDateString() 
                        : 'Нет данных'}
               </div>
           </div>
       </div>

       <div className="glass-panel overflow-hidden">
           <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
               <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">История Аттестаций</h3>
           </div>
           <div className="overflow-x-auto">
               <table className="w-full text-left">
                   <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">
                       <tr>
                           <th className="p-3 pl-6">Дата</th>
                           <th className="p-3">Сессия</th>
                           <th className="p-3 text-center">Результат</th>
                           <th className="p-3 text-right pr-6">Статус</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                       {userResults.length === 0 ? (
                           <tr><td colSpan={4} className="p-4 text-center text-zinc-400">История пуста</td></tr>
                       ) : (
                           userResults.map(r => {
                               const score = r.maxScore > 0 ? (r.totalScore/r.maxScore)*100 : 0;
                               const passed = score >= passingThreshold;
                               return (
                                   <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                       <td className="p-3 pl-6 font-medium text-zinc-900 dark:text-zinc-200">
                                           {new Date(r.completedAt || r.startedAt).toLocaleDateString()}
                                       </td>
                                       <td className="p-3 text-zinc-600 dark:text-zinc-400">
                                           <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 mr-2 font-mono">{r.sessionId.slice(-4)}</span>
                                           Сессия
                                       </td>
                                       <td className="p-3 text-center font-bold">
                                           {score.toFixed(1)}%
                                       </td>
                                       <td className="p-3 text-right pr-6">
                                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${passed ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'bg-primary text-white'}`}>
                                               {passed ? 'СДАЛ' : 'ПРОВАЛ'}
                                           </span>
                                       </td>
                                   </tr>
                               );
                           })
                       )}
                   </tbody>
               </table>
           </div>
       </div>
    </div>
  );
};

export default ProfileView;
