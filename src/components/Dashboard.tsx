
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { 
    Clock, Target, Hash, Percent, Filter, X, Briefcase, TrendingUp, 
    Trophy, AlertTriangle, Building2, Award
} from 'lucide-react';
import { User, UserRole, AssessmentResult, AssessmentSession, Department, Ticket, RoleDefinition } from '../types';

interface DashboardProps {
  user: User;
  users: User[];
  results: AssessmentResult[];
  sessions: AssessmentSession[];
  departments: Department[];
  tickets?: Ticket[];
  roles: RoleDefinition[];
  passingThreshold: number; 
}

const Dashboard: React.FC<DashboardProps> = ({ user, users, results, sessions, departments, tickets = [], roles, passingThreshold }) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  const hasPermission = (permId: string) => {
    if (typeof permId !== 'string') return false;
    if (!user || !Array.isArray(user.roles)) return false;
    if (user.roles.includes(UserRole.SUPER_ADMIN)) return true;
    if (!Array.isArray(roles)) return false;
    return user.roles.some(rId => {
        if (typeof rId !== 'string') return false;
        const roleDef = roles.find(rd => rd && rd.id === rId);
        return Array.isArray(roleDef?.permissionIds) && roleDef?.permissionIds.includes(permId);
    });
  };

  // --- View Hierarchy Logic ---
  const canViewGlobal = hasPermission('dash_view_all');
  const canViewDept = hasPermission('dash_view_dept');
  
  // Priority: Global > Dept > Personal
  const viewMode = canViewGlobal ? 'GLOBAL' : (canViewDept ? 'DEPT' : 'PERSONAL');

  const [filterDept, setFilterDept] = useState<string>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Force dept filter if in Dept view mode
  useEffect(() => {
      if (viewMode === 'DEPT') {
          setFilterDept(user.departmentId);
      }
  }, [viewMode, user.departmentId]);

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
      let filteredResults = [...results];
      
      // Date Filters
      if (dateStart) {
          const start = new Date(dateStart); start.setHours(0, 0, 0, 0);
          filteredResults = filteredResults.filter(r => new Date(r.completedAt || r.startedAt) >= start);
      }
      if (dateEnd) {
          const end = new Date(dateEnd); end.setHours(23, 59, 59, 999);
          filteredResults = filteredResults.filter(r => new Date(r.completedAt || r.startedAt) <= end);
      }

      // Dept Filter (Applied automatically for DEPT view, or manually for GLOBAL view)
      if (viewMode === 'DEPT') {
           // Strict filter for Dept View
           const deptUserIds = users.filter(u => u.departmentId === user.departmentId).map(u => u.id);
           filteredResults = filteredResults.filter(r => deptUserIds.includes(r.userId));
      } else if (viewMode === 'GLOBAL' && filterDept !== 'all') {
           // Manual filter for Global View
           const deptUserIds = users.filter(u => u.departmentId === filterDept).map(u => u.id);
           filteredResults = filteredResults.filter(r => deptUserIds.includes(r.userId));
      } else if (viewMode === 'PERSONAL') {
           // Should ideally not use this calc for personal, but strictly filtering just in case
           filteredResults = filteredResults.filter(r => r.userId === user.id);
      }

      return { results: filteredResults };
  }, [results, users, filterDept, dateStart, dateEnd, viewMode, user.departmentId, user.id]);

  const { results: fResults } = filteredData;

  // --- KPI Metrics ---
  const kpiData = useMemo(() => {
      const totalAttempts = fResults.length;
      if (totalAttempts === 0) return { avgScore: 0, avgTime: 0, passRate: 0, passedCount: 0, totalAttempts: 0 };
      const totalScorePct = fResults.reduce((acc, r) => acc + ((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100), 0);
      const avgScore = Number((totalScorePct / totalAttempts).toFixed(1));
      const passedCount = fResults.filter(r => Math.round(((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100) * 100) / 100 >= passingThreshold).length;
      const totalTimeMs = fResults.reduce((acc, r) => r.completedAt ? acc + (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) : acc, 0);
      const avgTime = Math.round((totalTimeMs / totalAttempts) / 60000);
      return { avgScore, avgTime, passRate: Math.round((passedCount / totalAttempts) * 100), passedCount, totalAttempts };
  }, [fResults, passingThreshold]);

  // --- Branch Performance (List View) ---
  const branchStats = useMemo(() => {
      const stats = departments.map(dept => {
          const deptUsers = users.filter(u => u.departmentId === dept.id).map(u => u.id);
          const deptResults = fResults.filter(r => deptUsers.includes(r.userId));
          if (deptResults.length === 0) return null;
          
          const totalScore = deptResults.reduce((acc, r) => acc + ((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100), 0);
          return {
              name: dept.name,
              score: Math.round(totalScore / deptResults.length),
              count: deptResults.length
          };
      }).filter(Boolean) as {name: string, score: number, count: number}[];

      // Sort Best to Worst
      return stats.sort((a, b) => b.score - a.score); 
  }, [departments, users, fResults]);

  // --- Employee Leaderboard ---
  const employeeRankings = useMemo(() => {
      const userStats: Record<string, { total: number, count: number }> = {};
      fResults.forEach(r => {
          if (!userStats[r.userId]) userStats[r.userId] = { total: 0, count: 0 };
          userStats[r.userId].total += ((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100);
          userStats[r.userId].count++;
      });

      return Object.entries(userStats)
          .map(([uid, stat]) => {
              const u = users.find(x => x.id === uid);
              if (!u) return null;
              return {
                  id: uid,
                  name: u.name,
                  avatar: u.avatar,
                  dept: u.departmentName,
                  avg: Math.round(stat.total / stat.count),
                  count: stat.count
              };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => b.avg - a.avg); // Best to worst
          // .slice(0, 50); // Show top 50 for scrolling
  }, [fResults, users]);

  // --- Hardest Tickets ---
  const hardestTickets = useMemo(() => {
      const ticketStats: Record<string, { total: number, count: number, failed: number }> = {};
      fResults.forEach(r => {
          const session = sessions.find(s => s.id === r.sessionId);
          if (!session) return;
          const tId = session.ticketId;
          if (!ticketStats[tId]) ticketStats[tId] = { total: 0, count: 0, failed: 0 };
          
          const pct = (r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100;
          ticketStats[tId].total += pct;
          ticketStats[tId].count++;
          if (pct < passingThreshold) ticketStats[tId].failed++;
      });

      return Object.entries(ticketStats)
          .map(([tid, stat]) => {
              const ticket = tickets.find(t => t.id === tid);
              return {
                  id: tid,
                  title: ticket?.title || 'Удаленный билет',
                  avg: Math.round(stat.total / stat.count),
                  count: stat.count,
                  failed: stat.failed,
                  failRate: Math.round((stat.failed / stat.count) * 100)
              };
          })
          .sort((a, b) => a.avg - b.avg) // Lowest score first (Hardest)
          .slice(0, 10);
  }, [fResults, sessions, tickets, passingThreshold]);

  // --- Score Distribution (Pie Chart - Passed/Failed Only) ---
  const scoreDistribution = useMemo(() => {
      let passed = 0, failed = 0;
      fResults.forEach(r => {
          const score = (r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100;
          if (score >= passingThreshold) passed++;
          else failed++;
      });
      
      const passedColor = isDarkMode ? '#ffffff' : '#09090b';
      const failedColor = '#E30613';

      return [
          { name: 'Сдал', value: passed, color: passedColor },
          { name: 'Не сдал', value: failed, color: failedColor },
      ].filter(x => x.value > 0);
  }, [fResults, passingThreshold, isDarkMode]);

  // --- Timeline ---
  const timelineData = useMemo(() => {
      const groups: Record<string, { total: number, count: number, sortTime: number }> = {};
      fResults.forEach(r => {
          const d = new Date(r.completedAt || r.startedAt);
          const key = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          if (!groups[key]) groups[key] = { total: 0, count: 0, sortTime: new Date(d).setHours(0, 0, 0, 0) };
          groups[key].total += (r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100; groups[key].count += 1;
      });
      return Object.entries(groups).map(([name, data]) => ({ 
        name, 
        score: Number((data.total / data.count).toFixed(1)), 
        count: data.count, 
        sortTime: data.sortTime 
      })).sort((a, b) => a.sortTime - b.sortTime).slice(-10);
  }, [fResults]);

  // --- Role Stats ---
  const roleStats = useMemo(() => {
      const stats: Record<string, any> = {};
      fResults.forEach(r => {
          const u = users.find(uu => uu.id === r.userId); if (!u) return;
          u.roles.forEach(rid => {
              if (!stats[rid]) stats[rid] = { name: roles.find(rr => rr.id === rid)?.name || rid, total: 0, count: 0 };
              stats[rid].total += (r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100; stats[rid].count++;
          });
      });
      // Sort Best to Worst
      return Object.values(stats).map((s:any) => ({ 
          name: s.name, 
          avgScore: Number((s.total / s.count).toFixed(1)),
          count: s.count 
      })).sort((a,b) => b.avgScore - a.avgScore);
  }, [fResults, users, roles]);

  // --- Styles ---
  const StatCard = ({ label, value, sub, icon: Icon, colorClass = "text-primary", delay = 0 }: any) => (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="clay-panel p-3 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform"
      >
         <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
         <div className="flex justify-between items-start mb-4 relative z-10">
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{label}</span>
            <div className={`p-2 rounded-2xl clay-btn ${colorClass}`}>
                <Icon size={20} />
            </div>
         </div>
         <div className="relative z-10">
            <div className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white drop-shadow-sm">{value}</div>
            {sub && <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-2 uppercase tracking-wider">{sub}</div>}
         </div>
      </motion.div>
  );

  const chartTextColor = isDarkMode ? '#a1a1aa' : '#71717a';
  const chartGridColor = isDarkMode ? '#27272a' : '#f4f4f5';

  const renderAdminView = (allowAllDepts: boolean) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-20"
    >
      {/* Filters Bar */}
      <div className="clay-panel p-3 flex flex-wrap gap-4 items-center justify-between sticky top-0 z-20">
         <div className="flex items-center gap-3 px-4">
             <Filter size={18} className="text-primary" />
             <span className="font-bold text-xs uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
                 {allowAllDepts ? 'Глобальная статистика' : `Статистика: ${user.departmentName}`}
             </span>
         </div>
         <div className="flex flex-wrap gap-3 items-center">
             <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="clay-input px-4 py-2.5 text-xs font-semibold outline-none dark:text-white" />
             <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="clay-input px-4 py-2.5 text-xs font-semibold outline-none dark:text-white" />
             
             {allowAllDepts && (
                 <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="clay-input px-4 py-2.5 text-xs font-semibold outline-none cursor-pointer dark:text-white appearance-none pr-8">
                     <option value="all">Все Филиалы</option>
                     {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                 </select>
             )}

             {( (allowAllDepts && filterDept !== 'all') || dateStart || dateEnd) && (
                 <button onClick={() => {if(allowAllDepts) setFilterDept('all'); setDateStart(''); setDateEnd('');}} className="p-2.5 text-primary clay-btn">
                     <X size={18} />
                 </button>
             )}
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Успеваемость" value={`${kpiData.avgScore}%`} sub="Ср. показатель" icon={Target} delay={0.1} />
        <StatCard label="Результативность" value={`${kpiData.passRate}%`} sub={`${kpiData.passedCount} из ${kpiData.totalAttempts} сдали`} icon={Percent} delay={0.2} />
        <StatCard label="Тайминг" value={`${kpiData.avgTime} м.`} sub="Среднее время" icon={Clock} colorClass="text-blue-500" delay={0.3} />
        <StatCard label="Охват" value={kpiData.totalAttempts} sub="Всего тестов" icon={Hash} colorClass="text-purple-500" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Branch Ranking List (Redesigned) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="xl:col-span-2 clay-panel p-4 flex flex-col"
          >
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
                    <Building2 size={20} className="text-primary" />
                    Рейтинг {allowAllDepts ? 'Филиалов' : 'Подразделения'}
                 </h3>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                <div className="space-y-6">
                    {branchStats.map((dept, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-tight">
                                <span className="text-zinc-600 dark:text-zinc-300 flex gap-2 items-center">
                                    <span className="text-zinc-400 w-4">{idx + 1}.</span> {dept.name}
                                </span>
                                <span className={dept.score >= passingThreshold ? 'text-zinc-900 dark:text-white' : 'text-primary'}>
                                    {dept.score}% <span className="text-[9px] text-zinc-400 font-semibold ml-1">({dept.count} тестов)</span>
                                </span>
                            </div>
                            <div className="h-3 w-full bg-white/50 dark:bg-zinc-800/50 rounded-full overflow-hidden shadow-inner border border-white/20 dark:border-zinc-700/30">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 shadow-sm ${dept.score >= passingThreshold ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-primary'}`} 
                                    style={{width: `${dept.score}%`}}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {branchStats.length === 0 && <div className="text-center text-zinc-400 py-10">Нет данных для отображения</div>}
                </div>
             </div>
          </motion.div>

          {/* Score Distribution Pie Chart (Simplified) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="clay-panel p-4 flex flex-col"
          >
             <h3 className="font-bold text-sm uppercase tracking-widest mb-8 flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
                <Award size={20} className="text-amber-500" />
                Результаты
             </h3>
             <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={scoreDistribution}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {scoreDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => [`${value} шт.`, 'Количество']}
                            contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#18181b' : '#fff', fontWeight: 'bold'}} 
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '11px', fontWeight: 700}}/>
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 text-center">
                    <div className="text-3xl font-black text-zinc-900 dark:text-white">{kpiData.passRate}%</div>
                    <div className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest">Проходимость</div>
                </div>
             </div>
          </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Leaderboard (Scrollable) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="clay-panel p-4 flex flex-col max-h-[500px]"
          >
             <h3 className="font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-3 text-zinc-800 dark:text-zinc-200 shrink-0">
                <Trophy size={20} className="text-yellow-500" />
                Рейтинг Сотрудников
             </h3>
             <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                 {employeeRankings.map((emp: any, idx) => (
                     <div key={emp.id} className="flex items-center gap-4 p-2 hover:bg-white/50 dark:hover:bg-zinc-800/50 rounded-2xl transition-colors group border border-transparent hover:border-white/20 dark:hover:border-zinc-700/30">
                         <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm shadow-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-zinc-200 text-zinc-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white/50 dark:bg-zinc-800/50 text-zinc-500 border border-white/20 dark:border-zinc-700/30'}`}>
                             {idx + 1}
                         </div>
                         <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full border-2 border-white/50 dark:border-zinc-700/50 shadow-sm" />
                         <div className="flex-1 min-w-0">
                             <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{emp.name}</div>
                             <div className="text-[10px] text-zinc-500 font-medium truncate uppercase tracking-wider">{emp.dept}</div>
                         </div>
                         <div className="text-right">
                             <div className={`font-black text-lg ${emp.avg >= passingThreshold ? 'text-zinc-900 dark:text-white' : 'text-primary'}`}>{emp.avg}%</div>
                             <div className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">{emp.count} тестов</div>
                         </div>
                     </div>
                 ))}
                 {employeeRankings.length === 0 && <div className="text-center text-zinc-400 py-10">Нет данных</div>}
             </div>
          </motion.div>

          {/* Hardest Tickets (Quantities added) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="clay-panel p-4 flex flex-col"
          >
             <h3 className="font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
                <AlertTriangle size={20} className="text-red-500" />
                Сложные Билеты (Топ ошибок)
             </h3>
             <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
                 {hardestTickets.map((t: any) => (
                     <div key={t.id}>
                         <div className="flex justify-between items-end mb-2">
                             <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">{t.title}</span>
                             <div className="text-right">
                                 <span className="text-xs font-black text-red-500 block">{t.failRate}% провалов</span>
                                 <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">{t.failed} из {t.count} попыток</span>
                             </div>
                         </div>
                         <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full" 
                                style={{width: `${t.failRate}%`}} // Width = Fail Rate (Difficulty)
                             ></div>
                         </div>
                     </div>
                 ))}
                 {hardestTickets.length === 0 && <div className="text-center text-zinc-400 py-10">Нет данных о провалах</div>}
             </div>
          </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Area Chart with Labels */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="lg:col-span-2 clay-panel p-4"
        >
           <h3 className="font-bold text-sm uppercase tracking-widest mb-8 flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
               <TrendingUp size={20} className="text-primary" />
               Динамика Групп
           </h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E30613" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#E30613" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 700, fill: chartTextColor}} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{fontSize: 11, fontWeight: 700, fill: chartTextColor}} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{
                          borderRadius: '12px', 
                          border: 'none', 
                          backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }} 
                        itemStyle={{ fontWeight: 800, color: '#E30613' }}
                        labelStyle={{ fontWeight: 800, marginBottom: '4px', color: chartTextColor }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#E30613" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)">
                        <LabelList dataKey="score" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: chartTextColor }} formatter={(val: number) => `${val}%`} />
                      </Area>
                  </AreaChart>
              </ResponsiveContainer>
           </div>
        </motion.div>

        {/* By Role Progress */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="clay-panel p-4 flex flex-col"
        >
           <h3 className="font-bold text-sm uppercase tracking-widest mb-8 flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
               <Briefcase size={20} className="text-primary" />
               По Должностям
           </h3>
           <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1 max-h-[300px]">
                {roleStats.map((r:any, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-tight">
                            <span className="text-zinc-500 dark:text-zinc-400">{r.name}</span>
                            <span className={r.avgScore >= passingThreshold ? 'text-zinc-900 dark:text-zinc-100' : 'text-primary'}>
                                {r.avgScore}% <span className="text-[9px] text-zinc-400 font-semibold ml-1">({r.count})</span>
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-white/50 dark:bg-zinc-800/50 rounded-full overflow-hidden shadow-inner border border-white/20 dark:border-zinc-700/30">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 shadow-sm ${r.avgScore >= passingThreshold ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-primary'}`} 
                                style={{width: `${r.avgScore}%`}}
                            ></div>
                        </div>
                    </div>
                ))}
           </div>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderEmployeeView = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="clay-panel text-zinc-900 dark:text-white p-12 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-10 rounded-full blur-[120px] -translate-y-20 translate-x-20"></div>
            
            <div className="relative z-10">
                <div className="inline-block clay-btn px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-primary shadow-sm">
                    Личный Кабинет
                </div>
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-none drop-shadow-sm">Привет, {user.name.split(' ')[0]}!</h2>
                <p className="text-zinc-600 dark:text-zinc-300 text-lg leading-relaxed mb-10 max-w-xl font-medium drop-shadow-sm">
                    Ваша статистика обновлена. Продолжайте обучение для достижения новых высот.
                </p>
                
                <div className="flex flex-wrap gap-6">
                    <div className="clay-panel p-3 min-w-[200px]">
                        <div className="text-4xl font-black mb-1 text-zinc-900 dark:text-white drop-shadow-sm">{results.filter(r => r.userId === user.id).length}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Тестов сдано</div>
                    </div>
                    <div className="clay-panel p-3 min-w-[200px]">
                        <div className="text-4xl font-black mb-1 text-primary drop-shadow-sm">
                            {results.filter(r => r.userId === user.id).length > 0 
                                ? (results.filter(r => r.userId === user.id).reduce((acc, r) => acc + ((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100), 0) / results.filter(r => r.userId === user.id).length).toFixed(0) 
                                : 0}%
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Ср. результат</div>
                    </div>
                </div>
            </div>
        </motion.div>
        
        {/* Deadlines Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="clay-panel p-4"
             >
                 <h3 className="font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-3 text-zinc-800 dark:text-zinc-200"><Clock size={18} className="text-amber-500"/> Ближайшие Дедлайны</h3>
                 <div className="space-y-3">
                     {sessions.filter(s => s.status === 'active' && s.participants.includes(user.id) && new Date(s.endDate) > new Date()).slice(0, 3).map(s => (
                         <div key={s.id} className="flex justify-between items-center p-3 clay-btn">
                             <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{s.title}</span>
                             <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100/50 dark:border-amber-900/50">{new Date(s.endDate).toLocaleDateString()}</span>
                         </div>
                     ))}
                     {sessions.filter(s => s.status === 'active' && s.participants.includes(user.id) && new Date(s.endDate) > new Date()).length === 0 && (
                         <div className="text-zinc-400 text-sm font-medium italic p-3 text-center">Активных дедлайнов нет</div>
                     )}
                 </div>
             </motion.div>
             
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="clay-panel p-4"
             >
                 <h3 className="font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-3 text-zinc-800 dark:text-zinc-200"><AlertTriangle size={18} className="text-primary"/> Требует Внимания</h3>
                 <p className="text-xs text-zinc-500 font-medium mb-4">Тесты, которые вы провалили и можете пересдать:</p>
                 <div className="space-y-3">
                     {results.filter(r => r.userId === user.id && ((r.totalScore/r.maxScore)*100 < passingThreshold)).slice(0,3).map(r => (
                         <div key={r.id} className="flex justify-between items-center p-3 clay-btn border-red-200 dark:border-red-900/30">
                             <span className="font-semibold text-sm text-red-900 dark:text-red-200 truncate max-w-[200px]">
                                {sessions.find(s=>s.id===r.sessionId)?.title || 'Архив'}
                             </span>
                             <span className="text-xs font-black text-red-600">{(r.totalScore/r.maxScore*100).toFixed(0)}%</span>
                         </div>
                     ))}
                     {results.filter(r => r.userId === user.id && ((r.totalScore/r.maxScore)*100 < passingThreshold)).length === 0 && (
                         <div className="text-green-600 dark:text-green-400 text-sm font-bold flex items-center justify-center gap-2 p-3 clay-btn border-green-200 dark:border-green-900/30"><Target size={16}/> Все показатели в норме!</div>
                     )}
                 </div>
             </motion.div>
        </div>
    </motion.div>
  );

  if (viewMode === 'GLOBAL') return renderAdminView(true);
  if (viewMode === 'DEPT') return renderAdminView(false);
  return renderEmployeeView();
};

export default Dashboard;
