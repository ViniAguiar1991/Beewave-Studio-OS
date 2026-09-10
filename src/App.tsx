import React, { useState, useEffect } from 'react';
import { useAppStore, useCurrentUser } from './store';
import { initFirestoreSync } from './services/firestoreSync';
import { SidebarRail } from './components/SidebarRail';
import { DashboardHome } from './components/DashboardHome';
import { TasksListView } from './components/TasksListView';
import { ClientsListView } from './components/ClientsListView';
import { ClientProfileView } from './components/ClientProfileView';
import { CalendarView } from './components/CalendarView';
import { PromptsView } from './components/PromptsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { CollaboratorsView } from './components/CollaboratorsView';
import { ClientPortalView } from './components/ClientPortalView';
import { TaskWorkflowModal } from './components/TaskWorkflowModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { GlobalTimerWidget } from './components/GlobalTimerWidget';
import { TrashView } from './components/TrashView';
import { LogIn, Sparkles, ShieldCheck, Eye, EyeOff, UserCheck, AlertCircle, LogOut } from 'lucide-react';

export function App() {
  const currentUser = useCurrentUser();
  const darkMode = useAppStore((s) => s.darkMode);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const users = useAppStore((s) => s.users);
  const addTask = useAppStore((s) => s.addTask);

  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const savedTab = localStorage.getItem('beewave_active_tab');
      if (savedTab && ['inicio', 'tarefas', 'clientes', 'colaboradores', 'calendario', 'prompts', 'lixeira', 'admin', 'portal'].includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'inicio';
  });

  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    try {
      const savedClientId = localStorage.getItem('beewave_active_client_id');
      if (savedClientId) return savedClientId;
    } catch {}
    return null;
  });

  const [activeWorkflowTaskId, setActiveWorkflowTaskId] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);

  // Sync navigation to localStorage
  useEffect(() => {
    try {
      if (currentTab) {
        localStorage.setItem('beewave_active_tab', currentTab);
      }
    } catch {}
  }, [currentTab]);

  useEffect(() => {
    try {
      if (selectedClientId) {
        localStorage.setItem('beewave_active_client_id', selectedClientId);
      } else {
        localStorage.removeItem('beewave_active_client_id');
      }
    } catch {}
  }, [selectedClientId]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [inviteEmailParam, setInviteEmailParam] = useState<string | null>(null);

  // Initialize Firestore real-time synchronization with cloud
  useEffect(() => {
    initFirestoreSync();
  }, []);

  // Parse URL Search Params on mount (handles invite links like ?email=colab@agency.com, ?portal=c_zaffari or ?logout=true)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get('email');
      const portalParam = searchParams.get('portal') || searchParams.get('cliente') || searchParams.get('client');
      const logoutParam = searchParams.get('logout');

      if (logoutParam === 'true') {
        logout();
        window.history.replaceState({}, '', window.location.pathname);
      } else if (emailParam) {
        const cleanEmail = emailParam.trim();
        // If an email is provided and doesn't match currently logged in user, log out existing user
        const state = useAppStore.getState();
        const activeU = state.users.find((u) => u.id === state.currentUserId);
        if (activeU && activeU.email.toLowerCase() !== cleanEmail.toLowerCase()) {
          logout();
        }
        setLoginEmail(cleanEmail);
        setInviteEmailParam(cleanEmail);
      } else if (portalParam) {
        const state = useAppStore.getState();
        const foundClient = state.clients.find((c) => c.id === portalParam);
        if (foundClient) {
          const clientEmail = (foundClient.portalEmail || foundClient.email || '').trim();
          const activeU = state.users.find((u) => u.id === state.currentUserId);
          if (activeU && activeU.clientId !== foundClient.id) {
            logout();
          }
          if (clientEmail) {
            setLoginEmail(clientEmail);
            setInviteEmailParam(clientEmail);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading URL params:', e);
    }
  }, [logout]);

  // Guard: if non-admin is in admin tab, redirect to inicio
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentTab === 'admin') {
      setCurrentTab('inicio');
    }
  }, [currentUser, currentTab]);

  // Sync HTML dark class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Clean up any stale/runaway timers on initial mount
  useEffect(() => {
    const state = useAppStore.getState();
    const hasStaleTimer = state.tasks.some((t) => !!t.timerStartedAt || (t.timeSpent && t.timeSpent >= 36000));
    if (hasStaleTimer || state.dockedTimerTaskId) {
      useAppStore.setState((s) => ({
        dockedTimerTaskId: null,
        tasks: s.tasks.map((t) => ({
          ...t,
          timerStartedAt: null,
          timeSpent: t.timeSpent && t.timeSpent >= 36000 ? 0 : t.timeSpent,
        })),
      }));
    }
  }, []);

  // Global Escape key listener to close any active popups / modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!activeWorkflowTaskId && isCloudModalOpen) {
          setIsCloudModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkflowTaskId, isCloudModalOpen]);

  const handleOpenNewTask = (prefillData?: any) => {
    const newTask = addTask(prefillData || {});
    setActiveWorkflowTaskId(newTask.id);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = login(loginEmail, loginPassword);
    if (!res.ok) {
      setLoginError(res.error || 'E-mail ou senha incorretos. Verifique os dados cadastrados.');
    } else {
      setLoginError(null);
    }
  };

  // If user is not logged in, render minimal clean login
  if (!currentUser) {
    return (
      <main className="min-h-screen grid place-items-center p-4 bg-slate-50 dark:bg-[#0c0f17] relative">
        <div className="clean-card w-full max-w-md p-8 bg-white dark:bg-[#121620] space-y-6 shadow-2xl border border-black/10 dark:border-white/10 rounded-3xl">
          <div className="text-center space-y-2">
            <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-bold mb-1 shadow-lg shadow-amber-500/20">
              <svg width="28" height="28" viewBox="0 0 48 54" fill="none">
                <polygon
                  points="24,3 43,14 43,39 24,50 5,39 5,14"
                  fill="#0f172a"
                  stroke="#0f172a"
                  strokeWidth="3"
                />
                <path
                  d="M26 13 L39 21 Q41 22 41 24 L41 33 Q41 35 39 34 L26 27 Q25 26 25 24 L25 14 Q25 12 26 13 Z"
                  fill="#f59e0b"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-50">
              BeeWave Studio OS
            </h1>
          </div>

          {inviteEmailParam && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs">
              <UserCheck className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Acessando convite para <strong>{inviteEmailParam}</strong>. Insira sua senha cadastrada abaixo:
              </span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                E-mail de Acesso
              </label>
              <input
                id="input-login-email"
                type="email"
                required
                placeholder="seu-email@dominio.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="clean-input h-10 w-full px-3 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-600 dark:text-slate-400">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-amber-500 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="clean-input h-10 w-full px-3 text-xs"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-left">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{loginError}</p>
              </div>
            )}

            <button
              id="btn-submit-login"
              type="submit"
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Entrar no Sistema
            </button>
          </form>
        </div>
      </main>
    );
  }

  // If logged-in user is a Client, render only their Client Portal directly
  if (currentUser.role === 'cliente') {
    return (
      <ClientPortalView
        initialClientId={currentUser.clientId}
        isClientLocked={true}
        onLogout={() => logout()}
      />
    );
  }

  // If viewing portal directly
  if (currentTab === 'portal') {
    return (
      <ClientPortalView
        initialClientId={selectedClientId}
        onBackToApp={() => setCurrentTab('inicio')}
      />
    );
  }

  return (
    <div className="min-h-screen flex text-slate-800 dark:text-slate-100 relative selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900">
      {/* Code-built Ambient Soft Gray Mesh Background Layers */}
      <div className="bg-mesh-ribbons" aria-hidden="true">
        <svg className="w-full h-full object-cover scale-105" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Top-Right Soft Slate Glow Orb */}
          <circle cx="1150" cy="180" r="320" fill="url(#paint_circle_1)" opacity="0.65" filter="blur(65px)" />
          {/* Bottom-Left Ambient Gray Orb */}
          <circle cx="280" cy="720" r="380" fill="url(#paint_circle_2)" opacity="0.6" filter="blur(75px)" />
          {/* Center Dynamic Fluid Ribbons */}
          <path d="M-80 320 C 280 520, 520 -20, 980 320 C 1280 540, 1480 200, 1600 380" stroke="url(#paint0_linear)" strokeWidth="140" strokeLinecap="round" opacity="0.65" filter="blur(45px)"/>
          <path d="M120 780 C 420 520, 780 880, 1220 500 C 1420 340, 1580 620, 1700 520" stroke="url(#paint1_linear)" strokeWidth="180" strokeLinecap="round" opacity="0.55" filter="blur(55px)"/>
          <path d="M400 120 C 700 380, 1050 80, 1380 420" stroke="url(#paint2_linear)" strokeWidth="90" strokeLinecap="round" opacity="0.45" filter="blur(35px)"/>

          <defs>
            <radialGradient id="paint_circle_1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1150 180) rotate(90) scale(320)">
              <stop stopColor="#cbd5e1" stopOpacity="0.9"/>
              <stop offset="0.7" stopColor="#94a3b8" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#64748b" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="paint_circle_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(280 720) rotate(90) scale(380)">
              <stop stopColor="#94a3b8" stopOpacity="0.6"/>
              <stop offset="0.6" stopColor="#cbd5e1" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#e2e8f0" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="paint0_linear" x1="0" y1="100" x2="1400" y2="500" gradientUnits="userSpaceOnUse">
              <stop stopColor="#94a3b8" stopOpacity="0.8"/>
              <stop offset="0.45" stopColor="#cbd5e1" stopOpacity="0.75"/>
              <stop offset="1" stopColor="#e2e8f0" stopOpacity="0.4"/>
            </linearGradient>
            <linearGradient id="paint1_linear" x1="100" y1="800" x2="1600" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#64748b" stopOpacity="0.5"/>
              <stop offset="0.5" stopColor="#94a3b8" stopOpacity="0.7"/>
              <stop offset="1" stopColor="#cbd5e1" stopOpacity="0.25"/>
            </linearGradient>
            <linearGradient id="paint2_linear" x1="400" y1="120" x2="1380" y2="420" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e2e8f0" stopOpacity="0.9"/>
              <stop offset="0.5" stopColor="#cbd5e1" stopOpacity="0.5"/>
              <stop offset="1" stopColor="#94a3b8" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Background fine noise overlay */}
      <div className="fixed inset-0 pointer-events-none bg-noise z-0 opacity-80" aria-hidden="true" />

      {/* Left Sidebar Rail (Fixed 72px pill with circular hovers) */}
      <SidebarRail
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedClientId(null);
          setCurrentTab(tab);
        }}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {/* Main App Content Area */}
      <div className="flex-1 md:pl-[96px] flex flex-col min-w-0 relative z-10">
        {/* Mobile Top Header with App branding, User badge and Prominent Logout Button */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#121620]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-xs">
              BW
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                BeeWave Studio
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {currentUser?.role === 'admin' ? 'Painel Administrador' : 'Colaborador'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 max-w-[100px] truncate hidden xs:inline">
              {currentUser?.name?.split(' ')[0]}
            </span>
            <button
              id="btn-mobile-top-logout"
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/80 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Encerrar sessão"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-5 md:p-10 pt-5 md:pt-10">
          {currentTab === 'inicio' && (
            <DashboardHome
              onSelectTask={(tId) => setActiveWorkflowTaskId(tId)}
              onNewTask={() => handleOpenNewTask()}
              onSelectClient={(cId) => {
                setSelectedClientId(cId);
                setCurrentTab('clientes');
              }}
              onSelectTab={(tab) => {
                setSelectedClientId(null);
                setCurrentTab(tab);
              }}
            />
          )}

          {currentTab === 'tarefas' && (
            <TasksListView
              onSelectTask={(tId) => setActiveWorkflowTaskId(tId)}
              onNewTask={() => handleOpenNewTask()}
              onSelectClient={(cId) => {
                setSelectedClientId(cId);
                setCurrentTab('clientes');
              }}
              onOpenTrash={() => {
                setSelectedClientId(null);
                setCurrentTab('lixeira');
              }}
            />
          )}

          {currentTab === 'clientes' && (
            <>
              {selectedClientId ? (
                <ClientProfileView
                  clientId={selectedClientId}
                  onBack={() => setSelectedClientId(null)}
                  onSelectTask={(tId) => setActiveWorkflowTaskId(tId)}
                  onNewTaskForClient={(cId) => handleOpenNewTask({ clientId: cId })}
                  onOpenPortal={(cId) => {
                    setSelectedClientId(cId);
                    setCurrentTab('portal');
                  }}
                />
              ) : (
                <ClientsListView
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                />
              )}
            </>
          )}

          {currentTab === 'colaboradores' && (
            <CollaboratorsView />
          )}

          {currentTab === 'calendario' && (
            <CalendarView
              onSelectTask={(tId) => setActiveWorkflowTaskId(tId)}
              onNewTaskOnDate={(dateStr) => handleOpenNewTask({ postDate: dateStr })}
            />
          )}

          {currentTab === 'prompts' && <PromptsView />}

          {currentTab === 'lixeira' && (
            <TrashView onBackToTasks={() => setCurrentTab('tarefas')} />
          )}

          {currentTab === 'admin' && <AdminSettingsView />}
        </main>
      </div>

      {/* Task Stepped Workflow Modal (Briefing -> Headline -> Copy -> Arte -> Em aprovação -> Aprovado) */}
      {activeWorkflowTaskId && (
        <TaskWorkflowModal
          taskId={activeWorkflowTaskId}
          onClose={() => setActiveWorkflowTaskId(null)}
          onOpenClientPortal={(cId) => {
            setActiveWorkflowTaskId(null);
            setSelectedClientId(cId);
            setCurrentTab('portal');
          }}
        />
      )}

      {/* Floating Realtime Timer Widget (Discrete white/slate floating badge) */}
      <GlobalTimerWidget onOpenTask={(tId) => setActiveWorkflowTaskId(tId)} />

      {/* Cloud Sync & Backup Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />
    </div>
  );
}

export default App;
