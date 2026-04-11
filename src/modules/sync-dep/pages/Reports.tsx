import React, { useState, useMemo } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { Download, Calendar, Users, Building2, CheckCircle2, Flag } from 'lucide-react';
import { MultiSelect } from '../components/ui/MultiSelect';
import { isOverdue } from '../utils/dates';
import * as XLSX from 'xlsx';

type ReportType = 'employees' | 'departments';

export const Reports: React.FC = () => {
  const { tasks, users, departments, statuses } = useTasksStore();
  const [reportType, setReportType] = useState<ReportType>('employees');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadlineStart, setDeadlineStart] = useState('');
  const [deadlineEnd, setDeadlineEnd] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.is_archived) return false;
      
      if (startDate && t.created_at < startDate) return false;
      if (endDate && t.created_at > endDate + 'T23:59:59.999Z') return false;
      if (deadlineStart && (!t.deadline || t.deadline < deadlineStart)) return false;
      if (deadlineEnd && (!t.deadline || t.deadline > deadlineEnd)) return false;
      
      if (selectedDepartment.length > 0 && !selectedDepartment.includes(t.department_id)) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(t.status_id)) return false;
      if (filterPriority.length > 0 && !filterPriority.includes(t.priority)) return false;

      return true;
    });
  }, [tasks, startDate, endDate, deadlineStart, deadlineEnd, selectedDepartment, filterStatus, filterPriority]);

  const employeeReport = useMemo(() => {
    let filteredUsers = users;
    if (selectedDepartment.length > 0) {
      filteredUsers = users.filter(u => {
        const uDepIds = u.department_ids || (u.department_id ? [u.department_id] : []);
        return uDepIds.some(id => selectedDepartment.includes(id));
      });
    }

    return filteredUsers.map(user => {
      const userTasks = filteredTasks.filter(t => t.assignee_ids.includes(user.id));
      const completed = userTasks.filter(t => statuses.find(s => s.id === t.status_id)?.is_closing).length;
      const overdue = userTasks.filter(t => {
        const status = statuses.find(s => s.id === t.status_id);
        return !status?.is_closing && isOverdue(t.deadline);
      }).length;
      const inProgress = userTasks.length - completed;
      const efficiency = userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0;

      const userDepIds = user.department_ids || (user.department_id ? [user.department_id] : []);
      const departmentNames = userDepIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        department: departmentNames || 'Без отдела',
        total: userTasks.length,
        completed,
        inProgress,
        overdue,
        efficiency
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredTasks, users, statuses, selectedDepartment, departments]);

  const departmentReport = useMemo(() => {
    let filteredDeps = departments;
    if (selectedDepartment.length > 0) {
      filteredDeps = departments.filter(d => selectedDepartment.includes(d.id));
    }

    return filteredDeps.map(dep => {
      const depTasks = filteredTasks.filter(t => t.department_id === dep.id);
      const completed = depTasks.filter(t => statuses.find(s => s.id === t.status_id)?.is_closing).length;
      const overdue = depTasks.filter(t => {
        const status = statuses.find(s => s.id === t.status_id);
        return !status?.is_closing && isOverdue(t.deadline);
      }).length;
      const inProgress = depTasks.length - completed;
      const efficiency = depTasks.length > 0 ? Math.round((completed / depTasks.length) * 100) : 0;

      return {
        id: dep.id,
        name: dep.name,
        total: depTasks.length,
        completed,
        inProgress,
        overdue,
        efficiency
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredTasks, departments, statuses, selectedDepartment]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    if (reportType === 'employees') {
      const wsData = [
        ['Сотрудник', 'Отдел', 'Роль', 'Всего задач', 'В работе', 'Завершено', 'Просрочено', 'Эффективность (%)']
      ];
      employeeReport.forEach(emp => {
        wsData.push([
          emp.name,
          emp.department,
          emp.role,
          emp.total.toString(),
          emp.inProgress.toString(),
          emp.completed.toString(),
          emp.overdue.toString(),
          emp.efficiency.toString()
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Отчет по сотрудникам');
    } else {
      const wsData = [
        ['Отдел', 'Всего задач', 'В работе', 'Завершено', 'Просрочено', 'Эффективность (%)']
      ];
      departmentReport.forEach(dep => {
        wsData.push([
          dep.name,
          dep.total.toString(),
          dep.inProgress.toString(),
          dep.completed.toString(),
          dep.overdue.toString(),
          dep.efficiency.toString()
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Отчет по отделам');
    }

    XLSX.writeFile(wb, `report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="w-full mx-auto space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Отчёты</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Детальная статистика по сотрудникам и отделам</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium shadow-sm"
          >
            <Download size={16} />
            Экспорт Excel
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shrink-0 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
            <button
              onClick={() => setReportType('employees')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === 'employees' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Users size={16} />
              По сотрудникам
            </button>
            <button
              onClick={() => setReportType('departments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === 'departments' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Building2 size={16} />
              По отделам
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5">
            <Calendar size={16} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold leading-none mb-1">Создано</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
                <span className="text-zinc-400">-</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5">
            <Calendar size={16} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold leading-none mb-1">Дедлайн</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={deadlineStart}
                  onChange={e => setDeadlineStart(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
                <span className="text-zinc-400">-</span>
                <input 
                  type="date" 
                  value={deadlineEnd}
                  onChange={e => setDeadlineEnd(e.target.value)}
                  className="bg-transparent border-none text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <MultiSelect
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            placeholder="Все отделы"
            icon={<Building2 size={16} />}
          />

          <MultiSelect
            options={statuses.map(s => ({ value: s.id, label: s.name }))}
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="Все статусы"
            icon={<CheckCircle2 size={16} />}
          />

          <MultiSelect
            options={[
              { value: 'critical', label: 'Критический' },
              { value: 'high', label: 'Высокий' },
              { value: 'medium', label: 'Средний' },
              { value: 'low', label: 'Низкий' }
            ]}
            value={filterPriority}
            onChange={setFilterPriority}
            placeholder="Все приоритеты"
            icon={<Flag size={16} />}
          />
          
          {(startDate || endDate || deadlineStart || deadlineEnd || selectedDepartment.length > 0 || filterStatus.length > 0 || filterPriority.length > 0) && (
            <button 
              onClick={() => {
                setStartDate(''); setEndDate(''); setDeadlineStart(''); setDeadlineEnd(''); setSelectedDepartment([]); setFilterStatus([]); setFilterPriority([]);
              }}
              className="text-sm text-red-500 hover:text-red-600 font-medium px-2"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  {reportType === 'employees' ? 'Сотрудник' : 'Отдел'}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-center">
                  Всего задач
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-center">
                  Завершено
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-center">
                  В работе
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-red-600 dark:text-red-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-center">
                  Просрочено
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-center">
                  Эффективность
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {reportType === 'employees' ? (
                employeeReport.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          {row.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-white">{row.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{row.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-white text-center font-medium">
                      {row.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
                      {row.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-medium">
                      {row.inProgress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                      <span className={row.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}>
                        {row.overdue}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              row.efficiency >= 80 ? 'bg-emerald-500' : 
                              row.efficiency >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${row.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white w-8 text-right">
                          {row.efficiency}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                departmentReport.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">{row.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-white text-center font-medium">
                      {row.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
                      {row.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 text-center font-medium">
                      {row.inProgress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                      <span className={row.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}>
                        {row.overdue}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              row.efficiency >= 80 ? 'bg-emerald-500' : 
                              row.efficiency >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${row.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white w-8 text-right">
                          {row.efficiency}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {(reportType === 'employees' ? employeeReport : departmentReport).length === 0 && (
            <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
              Нет данных для отображения
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
