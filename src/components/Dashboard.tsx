
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
  const StatCard = ({ label, value, sub, icon: Icon, colorClass = "text-red", delay = 0 }: any) => (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="premium-card p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-surface2 transition-all duration-500"
        onMouseEnter={() => document.body.classList.add('cursor-hover')}
        onMouseLeave={() => document.body.classList.remove('cursor-hover')}
      >
         <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red/10 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
         <div className="flex justify-between items-start mb-8 relative z-10">
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.3em] font-headline">{label}</span>
            <div className={`p-4 rounded-2xl bg-surface3 border border-surface3 shadow-lg ${colorClass} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <Icon size={24} />
            </div>
         </div>
         <div className="relative z-10">
            <div className="text-5xl font-black tracking-tighter text-text font-headline leading-none mb-2">{value}</div>
            {sub && <div className="text-[10px] font-black text-muted uppercase tracking-widest font-headline">{sub}</div>}
         </div>
         <div className="absolute bottom-0 left-0 w-full h-1.5 bg-red/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
      </motion.div>
  );

  const chartTextColor = isDarkMode ? '#a1a1aa' : '#71717a';
  const chartGridColor = isDarkMode ? '#27272a' : '#f4f4f5';

  const renderAdminView = (allowAllDepts: boolean) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-20 reveal"
    >
      {/* Filters Bar */}
      <div className="premium-card p-4 flex flex-wrap gap-6 items-center justify-between sticky top-0 z-20 backdrop-blur-2xl bg-surface1/80 border-surface3 shadow-2xl">
         <div className="flex items-center gap-4 px-4">
             <div className="p-2 bg-red/10 rounded-xl">
                <Filter size={20} className="text-red" />
             </div>
             <span className="font-black text-[11px] uppercase tracking-[0.3em] text-text font-headline">
                 {allowAllDepts ? 'Глобальная статистика' : `Статистика: ${user.departmentName}`}
             </span>
         </div>
         <div className="flex flex-wrap gap-4 items-center">
             <div className="relative group">
                <input 
                  type="date" 
                  value={dateStart} 
                  onChange={e => setDateStart(e.target.value)} 
                  className="clay-input px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none text-text focus:border-red transition-all font-headline" 
                />
             </div>
             <div className="relative group">
                <input 
                  type="date" 
                  value={dateEnd} 
                  onChange={e => setDateEnd(e.target.value)} 
                  className="clay-input px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none text-text focus:border-red transition-all font-headline" 
                />
             </div>
             
             {allowAllDepts && (
                 <div className="relative group">
                    <select 
                      value={filterDept} 
                      onChange={(e) => setFilterDept(e.target.value)} 
                      className="clay-input px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-text focus:border-red transition-all font-headline appearance-none pr-12"
                    >
                        <option value="all">Все Филиалы</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover:text-red transition-colors">
                        <Briefcase size={14} />
                    </div>
                 </div>
             )}

             {( (allowAllDepts && filterDept !== 'all') || dateStart || dateEnd) && (
                 <button 
                   onClick={() => {if(allowAllDepts) setFilterDept('all'); setDateStart(''); setDateEnd('');}} 
                   className="p-3 text-red hover:bg-red/10 rounded-2xl transition-all border border-transparent hover:border-red/20"
                   onMouseEnter={() => document.body.classList.add('cursor-hover')}
                   onMouseLeave={() => document.body.classList.remove('cursor-hover')}
                 >
                     <X size={20} />
                 </button>
             )}
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Успеваемость" value={`${kpiData.avgScore}%`} sub="Ср. показатель" icon={Target} delay={0.1} />
        <StatCard label="Результативность" value={`${kpiData.passRate}%`} sub={`${kpiData.passedCount} из ${kpiData.totalAttempts} сдали`} icon={Percent} delay={0.2} />
        <StatCard label="Тайминг" value={`${kpiData.avgTime} м.`} sub="Среднее время" icon={Clock} colorClass="text-red" delay={0.3} />
        <StatCard label="Охват" value={kpiData.totalAttempts} sub="Всего тестов" icon={Hash} colorClass="text-red" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Branch Ranking List (Redesigned) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="xl:col-span-2 premium-card p-8 flex flex-col relative overflow-hidden"
          >
             <div className="absolute top-4 right-8 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">01</div>
             <div className="flex justify-between items-center mb-10">
                 <h3 className="font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4 text-text font-headline">
                    <div className="p-2 bg-red/10 rounded-xl"><Building2 size={24} className="text-red" /></div>
                    Рейтинг {allowAllDepts ? 'Филиалов' : 'Подразделения'}
                 </h3>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 max-h-[400px]">
                <div className="space-y-10">
                    {branchStats.map((dept, idx) => (
                        <div key={idx} className="relative group">
                            <div className="flex justify-between text-[11px] font-black mb-4 uppercase tracking-[0.15em] font-headline">
                                <span className="text-muted flex gap-3 items-center group-hover:text-text transition-colors">
                                    <span className="text-red/40 w-6 font-mono text-xs">{idx + 1}.</span> {dept.name}
                                </span>
                                <span className={`${dept.score >= passingThreshold ? 'text-text' : 'text-red'} font-black text-sm`}>
                                    {dept.score}% <span className="text-[10px] text-muted font-black ml-2 opacity-50">({dept.count} тестов)</span>
                                </span>
                            </div>
                            <div className="h-3 w-full bg-surface3 rounded-full overflow-hidden border border-surface3 shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${dept.score}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(230,57,70,0.2)] ${dept.score >= passingThreshold ? 'bg-text' : 'bg-red'}`} 
                                ></motion.div>
                            </div>
                        </div>
                    ))}
                    {branchStats.length === 0 && <div className="text-center text-muted py-20 font-headline uppercase text-[11px] font-black tracking-[0.4em] opacity-30">Нет данных для отображения</div>}
                </div>
             </div>
          </motion.div>

          {/* Score Distribution Pie Chart (Simplified) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="premium-card p-8 flex flex-col relative overflow-hidden"
          >
             <div className="absolute top-4 right-8 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">02</div>
             <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4 text-text font-headline">
                <div className="p-2 bg-red/10 rounded-xl"><Award size={24} className="text-red" /></div>
                Результаты
             </h3>
             <div className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={scoreDistribution}
                            cx="50%" cy="50%"
                            innerRadius={70} outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                        >
                            {scoreDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', backgroundColor: 'var(--color-surface2)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', padding: '12px 20px'}} 
                            itemStyle={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', fontFamily: 'Montserrat' }}
                        />
                        <Legend verticalAlign="bottom" height={40} iconType="circle" iconSize={10} wrapperStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: 'Montserrat', paddingTop: '20px'}}/>
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-6 text-center">
                    <div className="text-5xl font-black text-text font-headline tracking-tighter leading-none mb-1">{kpiData.passRate}%</div>
                    <div className="text-[10px] font-black uppercase text-muted tracking-[0.3em] font-headline opacity-50">Проходимость</div>
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
            className="premium-card p-8 flex flex-col max-h-[600px] relative overflow-hidden"
          >
             <div className="absolute top-4 right-8 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">03</div>
             <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4 text-text font-headline shrink-0">
                <div className="p-2 bg-red/10 rounded-xl"><Trophy size={24} className="text-red" /></div>
                Рейтинг Сотрудников
             </h3>
             <div className="space-y-6 overflow-y-auto custom-scrollbar pr-4 flex-1">
                 {employeeRankings.map((emp: any, idx) => (
                     <div key={emp.id} className="flex items-center gap-6 p-4 hover:bg-surface2 rounded-3xl transition-all group border border-transparent hover:border-surface3 hover:shadow-xl hover:shadow-black/5">
                         <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-black text-lg font-headline shrink-0 transition-all group-hover:scale-110 ${idx === 0 ? 'bg-red text-white shadow-[0_10px_30px_rgba(230,57,70,0.4)]' : idx === 1 ? 'bg-surface3 text-text border border-surface3' : idx === 2 ? 'bg-surface3 text-text border border-surface3' : 'bg-surface2 text-muted border border-surface3'}`}>
                             {idx + 1}
                         </div>
                         <div className="relative shrink-0">
                            <img src={emp.avatar} alt={emp.name} className="w-14 h-14 rounded-2xl border-2 border-surface3 shadow-lg object-cover" />
                            {idx < 3 && <div className="absolute -top-2 -right-2 bg-red text-white p-1 rounded-lg shadow-lg"><Award size={12}/></div>}
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="font-black text-base text-text truncate font-headline uppercase tracking-tight leading-none mb-1">{emp.name}</div>
                             <div className="text-[10px] text-muted font-black truncate uppercase tracking-[0.15em] font-headline opacity-60">{emp.dept}</div>
                         </div>
                         <div className="text-right shrink-0">
                             <div className={`font-black text-2xl font-headline leading-none mb-1 ${emp.avg >= passingThreshold ? 'text-text' : 'text-red'}`}>{emp.avg}%</div>
                             <div className="text-[10px] text-muted font-black uppercase tracking-widest font-headline opacity-50">{emp.count} тестов</div>
                         </div>
                     </div>
                 ))}
                 {employeeRankings.length === 0 && <div className="text-center text-muted py-20 font-headline uppercase text-[11px] font-black tracking-[0.4em] opacity-30">Нет данных</div>}
             </div>
          </motion.div>

          {/* Hardest Tickets (Quantities added) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="premium-card p-8 flex flex-col relative overflow-hidden"
          >
             <div className="absolute top-4 right-8 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">04</div>
             <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4 text-text font-headline">
                <div className="p-2 bg-red/10 rounded-xl"><AlertTriangle size={24} className="text-red" /></div>
                Сложные Билеты
             </h3>
             <div className="space-y-10 overflow-y-auto custom-scrollbar pr-4 max-h-[500px]">
                 {hardestTickets.map((t: any) => (
                     <div key={t.id} className="group">
                         <div className="flex justify-between items-end mb-4">
                             <span className="text-sm font-black text-text truncate max-w-[65%] font-headline uppercase tracking-tight group-hover:text-red transition-colors">{t.title}</span>
                             <div className="text-right">
                                 <span className="text-sm font-black text-red block font-headline leading-none mb-1">{t.failRate}% провалов</span>
                                 <span className="text-[10px] font-black text-muted uppercase tracking-widest font-headline opacity-50">{t.failed} из {t.count} попыток</span>
                             </div>
                         </div>
                         <div className="h-3 w-full bg-surface3 rounded-full overflow-hidden border border-surface3 shadow-inner">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${t.failRate}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-red shadow-[0_0_20px_rgba(230,57,70,0.2)]" 
                             ></motion.div>
                         </div>
                     </div>
                 ))}
                 {hardestTickets.length === 0 && <div className="text-center text-muted py-20 font-headline uppercase text-[11px] font-black tracking-[0.4em] opacity-30">Нет данных о провалах</div>}
             </div>
          </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Area Chart with Labels */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="lg:col-span-2 premium-card p-8 relative overflow-hidden"
        >
           <div className="absolute top-4 right-8 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">05</div>
           <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-12 flex items-center gap-4 text-text font-headline">
               <div className="p-2 bg-red/10 rounded-xl"><TrendingUp size={24} className="text-red" /></div>
               Динамика Групп
           </h3>
           <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E30613" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#E30613" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} opacity={0.5} />
                      <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900, fill: chartTextColor, fontFamily: 'Montserrat'}} axisLine={false} tickLine={false} dy={15} />
                      <YAxis tick={{fontSize: 10, fontWeight: 900, fill: chartTextColor, fontFamily: 'Montserrat'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{
                          borderRadius: '16px', 
                          border: 'none', 
                          backgroundColor: 'var(--color-surface2)',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                          padding: '12px 20px'
                        }} 
                        itemStyle={{ fontWeight: 900, color: '#E30613', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'Montserrat' }}
                        labelStyle={{ fontWeight: 900, marginBottom: '6px', color: chartTextColor, fontSize: '11px', fontFamily: 'Montserrat' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#E30613" strokeWidth={5} fillOpacity={1} fill="url(#colorScore)" animationDuration={2000}>
                        <LabelList dataKey="score" position="top" offset={15} style={{ fontSize: '10px', fontWeight: '900', fill: chartTextColor, fontFamily: 'Montserrat' }} formatter={(val: number) => `${val}%`} />
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
            className="premium-card p-8 flex flex-col relative overflow-hidden"
        >
           <div className="absolute top-4 right-8 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">06</div>
           <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-12 flex items-center gap-4 text-text font-headline">
               <div className="p-2 bg-red/10 rounded-xl"><Briefcase size={24} className="text-red" /></div>
               По Должностям
           </h3>
           <div className="space-y-10 overflow-y-auto custom-scrollbar pr-4 flex-1 max-h-[350px]">
                {roleStats.map((r:any, idx) => (
                    <div key={idx} className="group">
                        <div className="flex justify-between text-[11px] font-black mb-4 uppercase tracking-[0.15em] font-headline">
                            <span className="text-muted group-hover:text-text transition-colors">{r.name}</span>
                            <span className={`${r.avgScore >= passingThreshold ? 'text-text' : 'text-red'} font-black text-sm`}>
                                {r.avgScore}% <span className="text-[10px] text-muted font-black ml-2 opacity-50">({r.count})</span>
                            </span>
                        </div>
                        <div className="h-3 w-full bg-surface3 rounded-full overflow-hidden border border-surface3 shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${r.avgScore}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(230,57,70,0.2)] ${r.avgScore >= passingThreshold ? 'bg-text' : 'bg-red'}`} 
                            ></motion.div>
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
      className="space-y-10 pb-20 reveal"
    >
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="premium-card text-text p-16 relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red opacity-[0.03] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 group-hover:opacity-[0.05] transition-opacity duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-red via-red/50 to-transparent"></div>
            
            <div className="relative z-10">
                <div className="inline-flex items-center gap-3 bg-red/10 border border-red/20 px-6 py-2 text-[11px] font-black uppercase tracking-[0.4em] mb-12 text-red font-headline rounded-full">
                    <div className="w-2 h-2 bg-red rounded-full animate-pulse"></div>
                    Личный Кабинет
                </div>
                <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-none font-headline uppercase">
                    Привет, <span className="text-red">{user.name.split(' ')[0]}</span>!
                </h2>
                <p className="text-muted text-xl leading-relaxed mb-16 max-w-2xl font-bold font-body opacity-80">
                    Ваша статистика обновлена. Мы проанализировали ваши последние результаты и подготовили рекомендации для улучшения показателей.
                </p>
                
                <div className="flex flex-wrap gap-10">
                    <div className="premium-card p-8 min-w-[280px] bg-surface2/50 border-surface3 hover:bg-surface2 transition-colors duration-500">
                        <div className="text-6xl font-black mb-3 text-text font-headline tracking-tighter leading-none">
                            {results.filter(r => r.userId === user.id).length}
                        </div>
                        <div className="text-[11px] text-muted uppercase font-black tracking-[0.3em] font-headline opacity-50">Тестов сдано</div>
                    </div>
                    <div className="premium-card p-8 min-w-[280px] bg-surface2/50 border-surface3 hover:bg-surface2 transition-colors duration-500">
                        <div className="text-6xl font-black mb-3 text-red font-headline tracking-tighter leading-none">
                            {results.filter(r => r.userId === user.id).length > 0 
                                ? (results.filter(r => r.userId === user.id).reduce((acc, r) => acc + ((r.maxScore > 0 ? r.totalScore / r.maxScore : 0) * 100), 0) / results.filter(r => r.userId === user.id).length).toFixed(0) 
                                : 0}%
                        </div>
                        <div className="text-[11px] text-muted uppercase font-black tracking-[0.3em] font-headline opacity-50">Ср. результат</div>
                    </div>
                </div>
            </div>
        </motion.div>
        
        {/* Deadlines Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="premium-card p-10 relative overflow-hidden"
             >
                 <div className="absolute top-4 right-10 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">07</div>
                 <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4 text-text font-headline">
                    <div className="p-2 bg-red/10 rounded-xl"><Clock size={24} className="text-red"/></div>
                    Ближайшие Дедлайны
                 </h3>
                 <div className="space-y-6">
                     {sessions.filter(s => s.status === 'active' && s.participants.includes(user.id) && new Date(s.endDate) > new Date()).slice(0, 4).map(s => (
                         <div key={s.id} className="flex justify-between items-center p-6 bg-surface2 border border-surface3 rounded-3xl group hover:border-red hover:bg-surface3 transition-all duration-500">
                             <span className="font-black text-base text-text font-headline uppercase tracking-tight group-hover:text-red transition-colors">{s.title}</span>
                             <span className="text-[11px] font-black text-red bg-red/10 px-4 py-2 rounded-xl border border-red/20 font-headline shadow-lg shadow-red/5">{new Date(s.endDate).toLocaleDateString()}</span>
                         </div>
                     ))}
                     {sessions.filter(s => s.status === 'active' && s.participants.includes(user.id) && new Date(s.endDate) > new Date()).length === 0 && (
                         <div className="text-muted text-[11px] font-black uppercase tracking-[0.4em] p-12 text-center font-headline opacity-30 border-2 border-dashed border-surface3 rounded-3xl">Активных дедлайнов нет</div>
                     )}
                 </div>
             </motion.div>
             
             <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="premium-card p-10 relative overflow-hidden"
             >
                 <div className="absolute top-4 right-10 text-[60px] font-black text-red/5 font-headline pointer-events-none select-none">08</div>
                 <h3 className="font-black text-[11px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4 text-text font-headline">
                    <div className="p-2 bg-red/10 rounded-xl"><AlertTriangle size={24} className="text-red"/></div>
                    Требует Внимания
                 </h3>
                 <p className="text-[11px] text-muted font-black uppercase tracking-[0.3em] mb-8 font-headline opacity-50">Тесты для пересдачи:</p>
                 <div className="space-y-6">
                     {results.filter(r => r.userId === user.id && ((r.totalScore/r.maxScore)*100 < passingThreshold)).slice(0,4).map(r => (
                         <div key={r.id} className="flex justify-between items-center p-6 bg-red/5 border border-red/10 rounded-3xl group hover:bg-red/10 hover:border-red/30 transition-all duration-500">
                             <span className="font-black text-base text-red truncate max-w-[250px] font-headline uppercase tracking-tight">
                                {sessions.find(s=>s.id===r.sessionId)?.title || 'Архивный тест'}
                             </span>
                             <span className="text-sm font-black text-red font-headline bg-white/5 px-4 py-2 rounded-xl shadow-lg">{(r.totalScore/r.maxScore*100).toFixed(0)}%</span>
                         </div>
                     ))}
                     {results.filter(r => r.userId === user.id && ((r.totalScore/r.maxScore)*100 < passingThreshold)).length === 0 && (
                         <div className="text-text text-[11px] font-black uppercase tracking-[0.4em] flex flex-col items-center justify-center gap-4 p-12 bg-surface2/30 border-2 border-dashed border-surface3 rounded-3xl font-headline">
                            <div className="p-4 bg-red/10 rounded-full"><Target size={32} className="text-red"/></div>
                            Все показатели в норме!
                         </div>
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
