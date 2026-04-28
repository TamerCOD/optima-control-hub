import { create } from 'zustand';
import { SyncDepTask, TaskStatus, SyncDepDepartment, SyncDepUser, TaskUpdate, ActionLog, NotificationSettings } from '../types/core.types';
import { db } from '../../../firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { User } from '../../../types';

interface TasksState {
  tasks: SyncDepTask[];
  statuses: TaskStatus[];
  departments: SyncDepDepartment[];
  users: SyncDepUser[];
  allUsers: User[];
  syncDepSettings: NotificationSettings | null;
  isLoading: boolean;
  
  fetchTasks: () => Promise<void>;
  addTask: (task: SyncDepTask) => Promise<void>;
  updateTask: (id: string, updates: Partial<SyncDepTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteAllTasks: () => Promise<void>;
  
  addDepartment: (dep: SyncDepDepartment) => Promise<void>;
  updateDepartment: (id: string, updates: Partial<SyncDepDepartment>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  
  addStatus: (status: TaskStatus) => Promise<void>;
  updateStatus: (id: string, updates: Partial<TaskStatus>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  
  updateUser: (id: string, updates: Partial<SyncDepUser>) => Promise<void>;
  removeUserFromDepartment: (id: string) => Promise<void>;

  addTaskUpdate: (update: TaskUpdate) => Promise<void>;
  addTaskLog: (log: ActionLog) => Promise<void>;

  setUsers: (users: SyncDepUser[]) => void;
  setAllUsers: (users: User[]) => void;
  setDepartments: (departments: SyncDepDepartment[]) => void;
  setTasks: (tasks: SyncDepTask[]) => void;
  setStatuses: (statuses: TaskStatus[]) => void;
  setSyncDepSettings: (settings: NotificationSettings | null) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  statuses: [],
  departments: [],
  users: [],
  allUsers: [],
  syncDepSettings: null,
  isLoading: false,
  
  setUsers: (users) => set({ users }),
  setAllUsers: (allUsers) => set({ allUsers }),
  setDepartments: (departments) => set({ departments }),
  setTasks: (tasks) => set({ tasks }),
  setStatuses: (statuses) => set({ statuses }),
  setSyncDepSettings: (syncDepSettings) => set({ syncDepSettings }),

  fetchTasks: async () => {
    // Handled by SyncDepIntegration
  },
  
  addTask: (task) => {
    return db.collection('sync_dep_tasks').doc(task.id).set(task);
  },
  
  updateTask: (id, updates) => {
    return db.collection('sync_dep_tasks').doc(id).update(updates);
  },
  
  deleteTask: (id) => {
    return db.collection('sync_dep_tasks').doc(id).delete();
  },
  
  deleteAllTasks: async () => {
    const { tasks } = get();
    // Delete in batches of 500 (Firestore limit)
    const batches = [];
    let currentBatch = db.batch();
    let count = 0;

    for (const task of tasks) {
      currentBatch.delete(db.collection('sync_dep_tasks').doc(task.id));
      count++;
      if (count === 500) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        count = 0;
      }
    }
    if (count > 0) {
      batches.push(currentBatch.commit());
    }
    await Promise.all(batches);
  },
  
  addDepartment: (dep) => {
    return db.collection('sync_dep_departments').doc(dep.id).set(dep);
  },
  
  updateDepartment: (id, updates) => {
    return db.collection('sync_dep_departments').doc(id).update(updates);
  },
  
  deleteDepartment: async (id) => {
    const { tasks } = get();
    const batch = db.batch();
    
    // Delete the department
    batch.delete(db.collection('sync_dep_departments').doc(id));
    
    // Delete tasks belonging to this department
    const departmentTasks = tasks.filter(t => t.department_id === id);
    departmentTasks.forEach(task => {
      batch.delete(db.collection('sync_dep_tasks').doc(task.id));
    });
    
    await batch.commit();
  },
  
  addStatus: (status) => {
    return db.collection('sync_dep_statuses').doc(status.id).set(status);
  },
  
  updateStatus: (id, updates) => {
    return db.collection('sync_dep_statuses').doc(id).update(updates);
  },
  
  deleteStatus: (id) => {
    return db.collection('sync_dep_statuses').doc(id).delete();
  },

  updateUser: (id, updates) => {
    const dataToUpdate: any = {
      role: updates.role || 'employee'
    };
    if (updates.department_ids !== undefined) {
      dataToUpdate.department_ids = updates.department_ids;
    } else if (updates.department_id !== undefined) {
      // Fallback for old code
      dataToUpdate.department_ids = updates.department_id ? [updates.department_id] : [];
      dataToUpdate.department_id = updates.department_id;
    }
    return db.collection('sync_dep_users').doc(id).set(dataToUpdate, { merge: true });
  },

  removeUserFromDepartment: async (id) => {
    const { tasks } = get();
    const batch = db.batch();
    
    // Remove user from sync_dep_users
    batch.delete(db.collection('sync_dep_users').doc(id));
    
    // Remove user from assignee_ids of all tasks
    const userTasks = tasks.filter(t => t.assignee_ids.includes(id));
    userTasks.forEach(task => {
      const newAssignees = task.assignee_ids.filter(aId => aId !== id);
      batch.update(db.collection('sync_dep_tasks').doc(task.id), {
        assignee_ids: newAssignees,
        updated_at: new Date().toISOString()
      });
    });
    
    await batch.commit();
  },

  addTaskUpdate: async (update) => {
    const batch = db.batch();
    batch.set(db.collection('sync_dep_tasks').doc(update.task_id).collection('updates').doc(update.id), update);
    batch.update(db.collection('sync_dep_tasks').doc(update.task_id), {
      updates_count: firebase.firestore.FieldValue.increment(1),
      updated_at: new Date().toISOString()
    } as any);
    await batch.commit();
  },

  addTaskLog: (log) => {
    return db.collection('sync_dep_tasks').doc(log.task_id || 'global').collection('logs').doc(log.id).set(log);
  }
}));
