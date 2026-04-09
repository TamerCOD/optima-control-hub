import { SyncDepTask, SyncDepDepartment } from '../types/core.types';

export const generateUniqueTaskId = (departmentId: string, existingTasks: SyncDepTask[], departments: SyncDepDepartment[], additionalOffset: number = 0): string => {
  const sortedDeps = [...departments].sort((a, b) => a.id.localeCompare(b.id));
  const depIndex = sortedDeps.findIndex(d => d.id === departmentId) + 1 || 0;
  const depNum = depIndex.toString();
  
  const prefix = `task_${depNum}_`;
  
  let maxSeq = 0;
  existingTasks.forEach(t => {
    if (t.id.startsWith(prefix)) {
      const seqStr = t.id.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const depTasksCount = existingTasks.filter(t => t.department_id === departmentId).length;
  const nextSeq = Math.max(maxSeq, depTasksCount) + 1 + additionalOffset;
  
  return `task_${depNum}_${nextSeq}`;
};

export const formatTaskId = (id: string): string => {
  // Old format: task_17109230123... (timestamp)
  if (id.startsWith('task_') && !id.includes('_', 5)) {
    return `#${id.substring(5, 11)}`;
  }
  // New format: task_1_1
  return id;
};
