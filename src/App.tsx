
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, db } from './firebase';
import firebase from 'firebase/compat/app';

import Layout from './components/Layout';
import Login from './components/Login';
import AssessmentRunner from './components/AssessmentRunner';
import ResultModal from './components/ResultModal'; 
import ForceChangePassword from './components/ForceChangePassword';
import SharedDashboardView from './components/SharedDashboardView';
import RocketLoader from './components/RocketLoader'; 
import { SyncDepIntegration } from './components/SyncDepIntegration';

// Sync Dep Pages
import { MyDashboard, MyTasks, DepartmentTasks, AllDashboard, AllTasks, DepartmentView, Analytics, Reports, Settings, UserGuide } from './modules/sync-dep/pages';

import { User, ViewState, AssessmentSession, AssessmentResult, UserRole, Ticket, Department, RoleDefinition, Permission, SystemSettings, MassIssue, IssueSettings, ProjectTask, Project, TaskSettings, Course } from './types';

// --- Error Boundary ---
interface ErrorBoundaryProps { children?: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: any) { console.error("App Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-full flex flex-col items-center justify-center p-3 bg-white text-black font-mono">
          <div className="border-4 border-black p-4 max-w-lg w-full shadow-sharp text-center">
            <h2 className="text-2xl font-bold mb-4 uppercase bg-red-600 text-white p-2">Critical System Error</h2>
            <p className="mb-4 text-sm">{(this.state.error as any)?.message}</p>
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-black text-white uppercase font-bold">Reboot System</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Lazy Load ---
const Dashboard = lazy(() => import('./components/Dashboard'));
const AssessmentList = lazy(() => import('./components/AssessmentList'));
const TicketBank = lazy(() => import('./components/QuestionBank'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const SessionManager = lazy(() => import('./components/SessionManager'));
const RoleManager = lazy(() => import('./components/RoleManager'));
const HistoryView = lazy(() => import('./components/HistoryView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const MassIssuesView = lazy(() => import('./components/MassIssuesView'));
const TMS = lazy(() => import('./components/TMS/TMS'));
const CourseManager = lazy(() => import('./components/CourseManager'));
const CourseViewer = lazy(() => import('./components/CourseViewer'));
const DepartmentAffairs = lazy(() => import('./components/DepartmentAffairs'));

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  
  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [massIssues, setMassIssues] = useState<MassIssue[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [taskSettings, setTaskSettings] = useState<TaskSettings>({
      statuses: [{ id: 'todo', label: 'To Do', color: '#94a3b8' }, { id: 'done', label: 'Done', color: '#10b981' }],
      priorities: [{ id: 'p1', label: 'High', emoji: '🔥', color: '#dc2626', level: 1 }],
      taskTypes: [{ id: 'task', label: 'Task', emoji: '✅', slaMinutes: 1440 }],
      availableComponents: [],
      availableLabels: [],
      integrations: {
          telegram: { enabled: false, botToken: '', chatId: '' },
          email: { enabled: false, smtpHost: '' }
      },
      notifications: {
          onTaskCreated: { internal: true, telegram: true, email: false },
          onStatusChanged: { internal: true, telegram: true, email: false },
          onCommentAdded: { internal: true, telegram: false, email: false },
          onDeadlineApproaching: { internal: true, telegram: true, email: true },
          onSlaBreached: { internal: true, telegram: true, email: true }
      }
  });
  const [issueSettings, setIssueSettings] = useState<IssueSettings>({
      categories: { 'Общее': ['Прочее'] },
      zones: [],
      googleSheetUrl: '',
      telegram: { botToken: '', chatIds: [] },
      email: { enabled: false, recipient: '' }
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ passingThreshold: 70 });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [activeSession, setActiveSession] = useState<AssessmentSession | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);
  const [sharedDashboardId, setSharedDashboardId] = useState<string | null>(null);

  const cleanPayload = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(item => cleanPayload(item));
    if (obj !== null && typeof obj === 'object') {
        const cleaned: any = {};
        Object.keys(obj).forEach(key => { cleaned[key] = obj[key] === undefined ? null : cleanPayload(obj[key]); });
        return cleaned;
    }
    return obj === undefined ? null : obj;
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // 1. Auth & Metadata Loading (Always needed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) { setSharedDashboardId(shareId); setIsAuthChecking(false); return; }

    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        
        // Update last login time
        db.collection('users').doc(firebaseUser.uid).update({
            lastLoginAt: new Date().toISOString()
        }).catch(() => {
            // If user doc doesn't exist yet, it will be handled by the snapshot listener below
        });

        // Load Current User
        db.collection('users').doc(firebaseUser.uid).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data() as User;
                if (!data.isDeleted) setCurrentUser({ ...data, id: firebaseUser.uid });
            } else {
                // Initialize Super Admin if needed
                if (firebaseUser.email === 'temirlan.ishenbek@optimabank.kg') {
                    const newAdmin: User = {
                        id: firebaseUser.uid,
                        name: 'Temirlan Ishenbek',
                        email: firebaseUser.email!,
                        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${firebaseUser.uid}`,
                        roles: [UserRole.SUPER_ADMIN],
                        departmentId: 'hq',
                        departmentName: 'Headquarters',
                        isDeleted: false,
                        isActive: true
                    };
                    db.collection('users').doc(firebaseUser.uid).set(newAdmin).then(() => setCurrentUser(newAdmin));
                }
            }
            setIsAuthChecking(false);
        });
        
        // Load System Metadata (Roles, Depts, Permissions are small and essential for UI logic)
        db.collection('roles').onSnapshot(s => setRoles(s.docs.map(d => ({...d.data(), id: d.id} as any))));
        db.collection('departments').onSnapshot(s => setDepartments(s.docs.map(d => ({...d.data(), id: d.id} as any))));
        db.collection('permissions').onSnapshot(s => setPermissions(s.docs.map(d => ({...d.data(), id: d.id} as any))));
        db.collection('settings').doc('config').onSnapshot(d => d.exists && setSystemSettings(d.data() as any));

      } else {
        setIsAuthenticated(false);
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Dynamic Data Loading based on Permissions
  useEffect(() => {
      if (!isAuthenticated || !currentUser || roles.length === 0) return;

      // Calculate Permissions Helper
      const getPerms = () => {
          if (!currentUser || !Array.isArray(currentUser.roles)) return [];
          if (currentUser.roles.includes(UserRole.SUPER_ADMIN)) return ['ALL'];
          // Flatten permissions from all user roles
          const perms = new Set<string>();
          currentUser.roles.forEach(rId => {
              if (typeof rId !== 'string') return;
              const roleDef = roles.find(rd => rd && rd.id === rId);
              if (roleDef && Array.isArray(roleDef.permissionIds)) {
                  roleDef.permissionIds.forEach(p => {
                      if (typeof p === 'string') perms.add(p);
                  });
              }
          });
          return Array.from(perms);
      };

      const perms = getPerms();
      const has = (p: string) => perms.includes('ALL') || perms.includes(p);
      const unsubList: (() => void)[] = [];

      // --- SESSIONS ---
      if (has('sess_view')) {
          // Admin/Manager: Load ALL sessions
          unsubList.push(db.collection('sessions').onSnapshot(s => setSessions(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      } else {
          // Employee: Load only assigned sessions (save bandwidth)
          unsubList.push(db.collection('sessions')
            .where('participants', 'array-contains', currentUser.id)
            .onSnapshot(s => setSessions(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      }

      // --- RESULTS (ARCHIVE) ---
      if (has('archive_general') || has('dash_view_all')) {
          // Full access
          unsubList.push(db.collection('results').onSnapshot(s => setResults(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      } else if (has('archive_dept')) {
          // Optimization: Ideally query by user IDs in dept, but for now load all to allow client-side filtering 
          unsubList.push(db.collection('results').onSnapshot(s => setResults(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      } else {
          // Strict Personal: Only my results
          unsubList.push(db.collection('results').where('userId', '==', currentUser.id).onSnapshot(s => setResults(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      }

      // --- USERS ---
      if (has('users_view') || has('tasks_view_all') || has('rep_view') || has('nav_sync_dep')) {
          // Needs full user list for dropdowns/reports/sync-dep
          unsubList.push(db.collection('users').onSnapshot(s => setUsers(s.docs.map(d => ({...d.data(), id: d.id} as any)).filter(u => !u.isDeleted))));
      } else {
          // Only load self (minimal)
          setUsers([currentUser]);
      }

      // --- TICKETS ---
      // Loaded if user can manage KB, create sessions, OR needs to see them for courses/active tests
      if (has('kb_view') || has('sess_create') || has('course_view') || has('nav_assess')) {
          unsubList.push(db.collection('tickets').onSnapshot(s => setTickets(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      }

      // --- MASS ISSUES ---
      if (has('issues_view')) {
          unsubList.push(db.collection('mass_issues').onSnapshot(s => setMassIssues(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
          db.collection('settings').doc('issues').onSnapshot(d => d.exists && setIssueSettings(d.data() as any));
      }

      // --- TASKS ---
      if (has('tasks_view_all')) {
          unsubList.push(db.collection('tasks').onSnapshot(s => setTasks(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
          unsubList.push(db.collection('projects').onSnapshot(s => setProjects(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
          db.collection('settings').doc('task_config').onSnapshot(d => d.exists && setTaskSettings(d.data() as any));
      } else if (has('tasks_view_mine')) {
          // Load projects meta for everyone who sees tasks
          unsubList.push(db.collection('projects').onSnapshot(s => setProjects(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
          db.collection('settings').doc('task_config').onSnapshot(d => d.exists && setTaskSettings(d.data() as any));
          
          // Complex query: assignee OR reporter. Firestore needs separate queries or "OR" (if available in newer SDKs, but sticking to standard compat)
          // We will use two listeners for "Mine"
          const unsubAssignee = db.collection('tasks').where('assigneeId', '==', currentUser.id).onSnapshot(s => {
              setTasks(prev => {
                  const newTasks = s.docs.map(d => ({...d.data(), id: d.id} as any));
                  const ids = new Set(newTasks.map(t => t.id));
                  return [...newTasks, ...prev.filter(t => !ids.has(t.id))];
              });
          });
          const unsubReporter = db.collection('tasks').where('reporterId', '==', currentUser.id).onSnapshot(s => {
               setTasks(prev => {
                  const newTasks = s.docs.map(d => ({...d.data(), id: d.id} as any));
                  const ids = new Set(newTasks.map(t => t.id));
                  return [...prev.filter(t => !ids.has(t.id)), ...newTasks];
              });
          });
          unsubList.push(unsubAssignee);
          unsubList.push(unsubReporter);
      }

      // --- COURSES ---
      if (has('course_view')) {
          unsubList.push(db.collection('courses').onSnapshot(s => setCourses(s.docs.map(d => ({...d.data(), id: d.id} as any)))));
      }

      // Cleanup function to unsubscribe listeners when permissions change or component unmounts
      return () => {
          unsubList.forEach(unsub => unsub());
          // Clear data on permission change/logout to prevent stale data
          setSessions([]);
          setResults([]);
          setTasks([]);
          setMassIssues([]);
          setCourses([]);
      };

  }, [isAuthenticated, currentUser, roles]); // Re-run if user or roles change

  const handleUpdateTask = (task: ProjectTask) => db.collection('tasks').doc(task.id).update(cleanPayload({...task, updatedAt: new Date().toISOString()}));
  const handleCreateTask = (task: ProjectTask) => db.collection('tasks').doc(task.id).set(cleanPayload({...task, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()}));
  
  // Creates user with a temporary password and sets 'needsPasswordChange' to TRUE in Firestore
  const handleAddUser = async (u: User) => {
      const tempApp = firebase.initializeApp(firebase.app().options, 'temp-' + Date.now());
      try {
          const password = u.password?.trim() || 'qwe123!@#';
          const cred = await tempApp.auth().createUserWithEmailAndPassword(u.email, password);
          
          // Remove password from the object before saving to Firestore for security
          const { password: _, ...userData } = u;
          
          await db.collection('users').doc(cred.user?.uid).set(cleanPayload({ 
              ...userData, 
              id: cred.user?.uid, 
              needsPasswordChange: true,
              createdAt: new Date().toISOString()
          }));
          alert('Сотрудник успешно создан. Временный пароль: ' + password);
      } catch (e:any) { alert('Ошибка создания: ' + e.message); } finally { await tempApp.delete(); }
  };

  if (sharedDashboardId) return <SharedDashboardView shareId={sharedDashboardId} />;
  if (isAuthChecking) return <RocketLoader text="Авторизация..." />;
  if (!isAuthenticated) return <Login onLogin={async () => true} />;
  if (!currentUser) return <RocketLoader text="Загрузка профиля..." />;

  // CRITICAL: Force Password Change Logic
  // If the user has 'needsPasswordChange' flag, show the force change screen
  if (currentUser.needsPasswordChange) {
      return (
        <ForceChangePassword 
            user={currentUser} 
            onSuccess={() => {
                // Optimistically update local state to remove the modal immediately
                // The real firestore update happens inside ForceChangePassword
                setCurrentUser({ ...currentUser, needsPasswordChange: false });
            }} 
        />
      );
  }

  if (activeSession) {
      return (
        <AssessmentRunner 
            session={activeSession} tickets={tickets} userId={currentUser.id} passingThreshold={systemSettings.passingThreshold}
            onComplete={async (res) => { 
                try {
                  await db.collection('results').doc(res.id).set(cleanPayload(res)); 
                  setLastResult(res); 
                  setCurrentView('SESSIONS'); 
                } catch (err: any) { alert(err.message); } finally { setActiveSession(null); }
            }}
            onExit={() => setActiveSession(null)}
        />
      );
  }

  return (
    <ErrorBoundary>
        <SyncDepIntegration currentUser={currentUser} users={users} departments={departments} />
        <Layout 
            user={currentUser} roles={roles} departments={departments} currentView={currentView} onChangeView={setCurrentView} 
            onChangeUser={(id) => id === 'logout' ? auth.signOut().then(() => window.location.reload()) : null}
            isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        >
            <Suspense fallback={<RocketLoader text="Синхронизация..." />}>
                {currentView === 'DASHBOARD' && <Dashboard user={currentUser} users={users} results={results} sessions={sessions} departments={departments} roles={roles} tickets={tickets} passingThreshold={systemSettings.passingThreshold} />}
                {currentView === 'COURSES' && <CourseManager courses={courses} tickets={tickets} roles={roles} departments={departments} users={users} results={results} currentUser={currentUser} onCreateCourse={c => db.collection('courses').doc(c.id).set(cleanPayload(c))} onUpdateCourse={c => db.collection('courses').doc(c.id).update(cleanPayload(c))} onDeleteCourse={id => db.collection('courses').doc(id).delete()} onOpenCourse={id => { setActiveCourseId(id); setCurrentView('COURSE_VIEW'); }} />}
                {currentView === 'COURSE_VIEW' && <CourseViewer course={courses.find(c => c.id === activeCourseId)!} users={users} currentUser={currentUser} tickets={tickets} onAcknowledge={async (c) => { await db.collection('courses').doc(c.id).update(cleanPayload(c)); }} onSessionCreated={s => { db.collection('sessions').doc(s.id).set(cleanPayload(s)); setCurrentView('SESSIONS'); }} onBack={() => setCurrentView('COURSES')} />}
                {['MY_TASKS', 'ALL_TASKS', 'PROJECTS', 'BOARDS', 'TASK_REPORTS', 'TASK_SETTINGS'].includes(currentView) && (
                    <TMS 
                        tasks={tasks} users={users} projects={projects} taskSettings={taskSettings} 
                        roles={roles} permissions={permissions} departments={departments} currentUser={currentUser} 
                        onUpdateTask={handleUpdateTask} onCreateTask={handleCreateTask} onDeleteTask={id => db.collection('tasks').doc(id).delete()} 
                        onSaveSettings={ts => db.collection('settings').doc('task_config').set(cleanPayload(ts))} 
                        onUpdateProjects={ps => ps.forEach(p => db.collection('projects').doc(p.id).set(cleanPayload(p)))} 
                        onUpdateRole={r => db.collection('roles').doc(r.id).update(cleanPayload(r))} 
                        onCreateRole={r => db.collection('roles').doc(r.id).set(cleanPayload(r))} 
                        onDeleteRole={id => db.collection('roles').doc(id).delete()} 
                        onUpdateUser={u => db.collection('users').doc(u.id).update(cleanPayload(u))} 
                        initialTab={
                            currentView === 'MY_TASKS' ? 'my' :
                            currentView === 'ALL_TASKS' ? 'all' :
                            currentView === 'PROJECTS' ? 'projects' :
                            currentView === 'BOARDS' ? 'boards' :
                            currentView === 'TASK_REPORTS' ? 'reports' : 'settings'
                        } 
                    />
                )}
                {currentView === 'SESSIONS' && <AssessmentList sessions={sessions} results={results} currentUser={currentUser} tickets={tickets} roles={roles} passingThreshold={systemSettings.passingThreshold} onStart={setActiveSession} />}
                {currentView === 'HISTORY' && <HistoryView results={results} users={users} sessions={sessions} tickets={tickets} departments={departments} roles={roles} currentUser={currentUser} passingThreshold={systemSettings.passingThreshold} />}
                {currentView === 'REPORTS' && <ReportsView results={results} users={users} sessions={sessions} tickets={tickets} departments={departments} roles={roles} currentUser={currentUser} passingThreshold={systemSettings.passingThreshold} onAddUser={handleAddUser} />}
                {currentView === 'ADMIN_SESSIONS' && <SessionManager sessions={sessions} users={users} tickets={tickets} roles={roles} departments={departments} onCreateSession={s => db.collection('sessions').doc(s.id).set(cleanPayload(s))} onUpdateSession={s => db.collection('sessions').doc(s.id).update(cleanPayload(s))} onDeleteSession={id => db.collection('sessions').doc(id).delete()} onRunSession={setActiveSession} currentUser={currentUser} />}
                {currentView === 'TICKET_BANK' && <TicketBank tickets={tickets} onCreateTicket={t => db.collection('tickets').doc(t.id).set(cleanPayload(t))} onUpdateTicket={t => db.collection('tickets').doc(t.id).update(cleanPayload(t))} onDeleteTicket={id => db.collection('tickets').doc(id).delete()} currentUser={currentUser} roles={roles} />}
                {currentView === 'USERS' && <UserManagement users={users} departments={departments} roles={roles} currentUser={currentUser} onAddUser={handleAddUser} onUpdateUser={u => db.collection('users').doc(u.id).update(cleanPayload(u))} onDeleteUser={id => db.collection('users').doc(id).update({isDeleted: true})} onCreateRole={r => db.collection('roles').doc(r.id).set(cleanPayload(r))} />}
                {currentView === 'PERMISSIONS' && <RoleManager viewMode="roles" roles={roles} users={users} permissions={permissions} departments={departments} onUpdateRole={r => db.collection('roles').doc(r.id).update(cleanPayload(r))} onCreateRole={r => db.collection('roles').doc(r.id).set(cleanPayload(r))} onDeleteRole={id => db.collection('roles').doc(id).delete()} onUpdateDepartment={d => db.collection('departments').doc(d.id).update(cleanPayload(d))} onCreateDepartment={d => db.collection('departments').doc(d.id).set(cleanPayload(d))} onDeleteDepartment={id => db.collection('departments').doc(id).delete()} onUpdateUser={u => db.collection('users').doc(u.id).update(cleanPayload(u))} />}
                {currentView === 'DEPARTMENTS' && <RoleManager viewMode="departments" roles={roles} users={users} permissions={permissions} departments={departments} onUpdateRole={()=>{}} onCreateRole={()=>{}} onDeleteRole={()=>{}} onUpdateDepartment={d => db.collection('departments').doc(d.id).update(cleanPayload(d))} onCreateDepartment={d => db.collection('departments').doc(d.id).set(cleanPayload(d))} onDeleteDepartment={id => db.collection('departments').doc(id).delete()} onUpdateUser={u => db.collection('users').doc(u.id).update(cleanPayload(u))} />}
                {currentView === 'SETTINGS' && <SettingsView users={users} departments={departments} roles={roles} currentUser={currentUser} settings={systemSettings} />}
                {currentView === 'PROFILE' && <ProfileView targetUser={currentUser} currentUser={currentUser} results={results} departments={departments} roles={roles} passingThreshold={systemSettings.passingThreshold} />}
                {currentView === 'MASS_ISSUES' && <MassIssuesView issues={massIssues} settings={issueSettings} currentUser={currentUser} roles={roles} onCreateIssue={i => db.collection('mass_issues').doc(i.id).set(cleanPayload(i))} onUpdateIssue={i => db.collection('mass_issues').doc(i.id).update(cleanPayload(i))} onDeleteIssue={id => db.collection('mass_issues').doc(id).delete()} onSaveSettings={s => db.collection('settings').doc('issues').set(cleanPayload(s))} />}
                {currentView === 'DEPT_AFFAIRS' && <DepartmentAffairs currentUser={currentUser} roles={roles} />}
                
                {currentView === 'SYNC_DEP_MY_DASHBOARD' && <MyDashboard />}
                {currentView === 'SYNC_DEP_MY_TASKS' && <MyTasks />}
                {currentView === 'SYNC_DEP_DEPARTMENT_TASKS' && <DepartmentTasks />}
                {currentView === 'SYNC_DEP_ALL_DASHBOARD' && <AllDashboard />}
                {currentView === 'SYNC_DEP_ALL_TASKS' && <AllTasks />}
                {currentView === 'SYNC_DEP_DEPARTMENTS' && <DepartmentView />}
                {currentView === 'SYNC_DEP_ANALYTICS' && <Analytics />}
                {currentView === 'SYNC_DEP_REPORTS' && <Reports />}
                {currentView === 'SYNC_DEP_SETTINGS' && <Settings />}
                {currentView === 'SYNC_DEP_USER_GUIDE' && <UserGuide />}
            </Suspense>
        </Layout>
        {lastResult && (
          <ResultModal 
            result={lastResult} 
            session={sessions.find(s => s.id === lastResult.sessionId)} 
            ticket={tickets.find(t => t.id === sessions.find(s => s.id === lastResult.sessionId)?.ticketId)} 
            user={currentUser} 
            passingThreshold={systemSettings.passingThreshold} 
            hideDetails={true} 
            onClose={() => setLastResult(null)} 
          />
        )}
    </ErrorBoundary>
  );
};

export default App;
