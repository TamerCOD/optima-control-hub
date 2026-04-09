import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
  const { currentUser } = useAuthStore();
  
  if (!currentUser) {
    return {
      isAdmin: false,
      isModerator: false,
      isEmployee: false,
      canViewAllDepartments: false,
      canManageUsers: false,
      canManageSettings: false,
      canDeleteTasks: false,
      canViewReports: false,
      canCreateTaskInAnyDepartment: false,
    };
  }

  const role = currentUser.role;
  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const isEmployee = role === 'employee';

  return {
    isAdmin,
    isModerator,
    isEmployee,
    
    // Tasks
    canViewAllDepartments: isAdmin || isModerator,
    canCreateTaskInAnyDepartment: isAdmin || isModerator,
    canEditAnyTask: isAdmin || isModerator,
    canDeleteTasks: isAdmin,
    canChangeTaskDepartment: isAdmin,
    canReassignTasks: isAdmin || isModerator,
    canMassEdit: isAdmin || isModerator,
    
    // Users
    canViewAllUsers: isAdmin || isModerator,
    canManageUsers: isAdmin || isModerator, // Moderator can add but not edit roles above theirs, handled in UI
    canDeactivateUsers: isAdmin,
    canChangeUserRole: isAdmin,
    canResetPasswords: isAdmin,
    
    // Departments
    canManageDepartments: isAdmin,
    
    // Settings & Analytics
    canManageSettings: isAdmin,
    canViewReports: isAdmin || isModerator,
    canExportData: isAdmin || isModerator,
  };
};
