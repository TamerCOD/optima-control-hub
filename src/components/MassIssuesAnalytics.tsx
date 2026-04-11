import React, { useMemo } from 'react';
import { MassIssue } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { AlertTriangle, Clock, CheckCircle, Activity } from 'lucide-react';

interface Props {
  issues: MassIssue[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const MassIssuesAnalytics: React.FC<Props> = ({ issues }) => {
  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter(i => i.status === 'resolved').length;
    const active = total - resolved;

    let totalResolutionTime = 0;
    let resolvedCountWithTime = 0;

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byDept: Record<string, number> = {};
    const byZone: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    issues.forEach(issue => {
      // Resolution time
      if (issue.status === 'resolved' && issue.resolvedAt && issue.scheduledStart) {
        const start = new Date(issue.scheduledStart).getTime();
        const end = new Date(issue.resolvedAt).getTime();
        if (end > start) {
          totalResolutionTime += (end - start);
          resolvedCountWithTime++;
        }
      }

      // Severity
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      
      // Category
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;

      // Department
      if (issue.responsibleDepartment) {
        byDept[issue.responsibleDepartment] = (byDept[issue.responsibleDepartment] || 0) + 1;
      }

      // Zones
      if (issue.affectedZones && issue.affectedZones.length > 0) {
        issue.affectedZones.forEach((z: string) => {
          byZone[z] = (byZone[z] || 0) + 1;
        });
      }

      // By Date (Creation)
      if (issue.createdAt) {
        const date = new Date(issue.createdAt).toISOString().split('T')[0];
        byDate[date] = (byDate[date] || 0) + 1;
      }
    });

    const avgResolutionTimeHours = resolvedCountWithTime > 0 
      ? (totalResolutionTime / resolvedCountWithTime / (1000 * 60 * 60)).toFixed(1) 
      : '0';

    const formatData = (obj: Record<string, number>) => Object.entries(obj).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      total,
      resolved,
      active,
      avgResolutionTimeHours,
      severityData: formatData(bySeverity),
      categoryData: formatData(byCategory),
      deptData: formatData(byDept),
      zoneData: formatData(byZone),
      dateData: Object.entries(byDate).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [issues]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Всего инцидентов</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Активные</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Решенные</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.resolved}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Ср. время решения</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.avgResolutionTimeHours} ч</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Динамика инцидентов</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="count" name="Инциденты" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Severity */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">По критичности</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Department */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">По ответственным отделам</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.deptData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#71717a" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} width={100} />
                <Tooltip cursor={{ fill: '#3f3f46', opacity: 0.1 }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Количество" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Zone */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">По зонам влияния</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.zoneData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#3f3f46', opacity: 0.1 }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="value" name="Количество" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassIssuesAnalytics;
