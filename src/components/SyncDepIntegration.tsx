import React, { useEffect } from 'react';
import { useAuthStore } from '../modules/sync-dep/store/authStore';
import { useTasksStore } from '../modules/sync-dep/store/tasksStore';
import { User, Department } from '../types';
import { SyncDepUser, SyncDepDepartment, SyncDepTask, TaskStatus } from '../modules/sync-dep/types/core.types';
import { db } from '../firebase';
import { mockStatuses } from '../modules/sync-dep/mocks/mockData';

interface Props {
  currentUser: User | null;
  users: User[];
  departments: Department[]; // We can ignore this now
}

const mapUser = (u: User, role: 'admin' | 'moderator' | 'employee' = 'employee', department_ids: string[] = [], old_department_id: string | null = null): SyncDepUser => {
  const finalDepartmentIds = department_ids.length > 0 ? department_ids : (old_department_id ? [old_department_id] : []);
  return {
    id: u.id,
    username: u.email.split('@')[0],
    name: u.name.split(' ')[0],
    last_name: u.name.split(' ').slice(1).join(' '),
    email: u.email,
    role: u.roles?.includes('admin') ? 'admin' : role,
    department_ids: finalDepartmentIds,
    department_id: finalDepartmentIds[0] || null, // Keep for backward compatibility
    is_active: u.isActive,
    notify_email: false,
    notify_tg: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    avatar_url: u.avatar
  };
};

export const SyncDepIntegration: React.FC<Props> = ({ currentUser, users }) => {
  const setCurrentUser = useAuthStore(state => state.setCurrentUser);
  const setUsers = useTasksStore(state => state.setUsers);
  const setAllUsers = useTasksStore(state => state.setAllUsers);
  const setDepartments = useTasksStore(state => state.setDepartments);
  const setTasks = useTasksStore(state => state.setTasks);
  const setStatuses = useTasksStore(state => state.setStatuses);
  const setSyncDepSettings = useTasksStore(state => state.setSyncDepSettings);
  
  useEffect(() => {
    setAllUsers(users);
  }, [users, setAllUsers]);

  useEffect(() => {
    const unsubSettings = db.collection('settings').doc('sync_dep_config').onSnapshot(s => {
      if (s.exists) {
        setSyncDepSettings(s.data() as any);
      } else {
        setSyncDepSettings(null);
      }
    });
    return () => unsubSettings();
  }, [setSyncDepSettings]);

  useEffect(() => {
    const unsubMembers = db.collection('sync_dep_users').onSnapshot(s => {
      const members = s.docs.map(d => ({ ...d.data(), id: d.id } as any));
      
      const syncUsers = users
        .filter(u => members.some(m => m.id === u.id))
        .map(u => {
          const member = members.find(m => m.id === u.id)!;
          return mapUser(u, member.role, member.department_ids || [], member.department_id);
        });
        
      setUsers(syncUsers);
      
      if (currentUser) {
        const currentMember = members.find(m => m.id === currentUser.id);
        setCurrentUser(mapUser(currentUser, currentMember?.role || 'employee', currentMember?.department_ids || [], currentMember?.department_id || null));
      } else {
        setCurrentUser(null);
      }
    });
    
    return () => unsubMembers();
  }, [users, currentUser, setUsers, setCurrentUser]);

  useEffect(() => {
    const unsubDepartments = db.collection('sync_dep_departments').onSnapshot(s => {
      setDepartments(s.docs.map(d => ({ ...d.data(), id: d.id } as SyncDepDepartment)));
    });
    return () => unsubDepartments();
  }, [setDepartments]);

  useEffect(() => {
    const unsubTasks = db.collection('sync_dep_tasks').onSnapshot(s => {
      setTasks(s.docs.map(d => ({ ...d.data(), id: d.id } as SyncDepTask)));
    });
    const unsubStatuses = db.collection('sync_dep_statuses').onSnapshot(s => {
      if (s.empty) {
        mockStatuses.forEach(status => {
          db.collection('sync_dep_statuses').doc(status.id).set(status);
        });
      } else {
        setStatuses(s.docs.map(d => ({ ...d.data(), id: d.id } as TaskStatus)));
      }
    });
    return () => {
      unsubTasks();
      unsubStatuses();
    };
  }, [setTasks, setStatuses]);

  // Data consistency cleanup removed to prevent accidental deletion of tasks
  // when a user's client does not have full access to all users or departments.
  // Deletion logic is now handled explicitly in tasksStore.ts (deleteDepartment, removeUserFromDepartment).

  return null;
};
