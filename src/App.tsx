import React, { useState, useEffect } from 'react';
import { useAppStore, useCurrentUser } from './store';
import { initFirestoreSync, isCloudSyncDisabled } from './services/firestoreSync';
import { AppSidebar } from './components/AppSidebar';
import { DashboardHome } from './components/DashboardHome';
import { TasksListView } from './components/TasksListView';
import { ClientsListView } from './components/ClientsListView';
import { ClientProfileView } from './components/ClientProfileView';
import { PromptsView } from './components/PromptsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { CollaboratorsView } from './components/CollaboratorsView';
import { ClientPortalView } from './components/ClientPortalView';
import { TaskWorkflowModal } from './components/TaskWorkflowModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { GlobalTimerWidget } from './components/GlobalTimerWidget';
import { TrashView } from './components/TrashView';
import { CampaignsView } from './components/CampaignsView';
import { LogIn, Sparkles, ShieldCheck, Eye, EyeOff, UserCheck, AlertCircle, LogOut } from 'lucide-react';

export function App() {
  const currentUser = useCurrentUser();
  const darkMode = useAppStore((s) => s.darkMode);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const users = useAppStore((s) => s.users);
  const addTask = useAppStore((s) => s.addTask);
  const allTasks = useAppStore((s) => s.tasks);

  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const savedTab = localStorage.getItem('beewave_active_tab');
      if (savedTab && ['inicio', 'tarefas', 'campanhas', 'clientes', 'colaboradores', 'prompts', 'lixeira', 'admin', 'portal'].includes(savedTab)) {
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

  // Sincronização em tempo real com o Firestore.
  // A trava mora no próprio serviço (isCloudSyncDisabled), para valer também
  // para as gravações que a store dispara direto, fora deste init.
  useEffect(() => {
    if (isCloudSyncDisabled()) {
      console.info(
        '[BeeWave] Sync com a nuvem desativada (VITE_DISABLE_CLOUD_SYNC=true). Rodando só com dados locais.'
      );
      return;
    }
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

  /**
   * Quantas pautas dependem da equipe agora: ajuste pedido pelo cliente,
   * sugestão de pauta ainda não avaliada, ou data de publicação já vencida.
   * O mesmo número que a Home destaca em "Precisa de você".
   */
  const teamQueueCount = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allTasks.filter((t) => {
      if (t.status === 'alterar') return true;
      if (t.clientRequest && t.status === 'nao_iniciado') return true;
      const day = (t.postDate || t.date || '').split('T')[0];
      const concluida = t.status === 'aprovado' || t.status === 'postado';
      return !!day && day < today && !concluida;
    }).length;
  }, [allTasks]);

  return (
    <div
      data-surface="app"
      className="min-h-screen text-slate-800 dark:text-slate-100 selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900"
    >
      <AppSidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedClientId(null);
          setCurrentTab(tab);
        }}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        actionCount={teamQueueCount}
      />

      <div className="md:pl-[232px] flex flex-col min-w-0">
        <main className="flex-1 px-5 sm:px-8 lg:px-12 py-8 lg:py-12 min-w-0">
          {/* Conteúdo da rota ativa */}
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
              onNewTask={(prefill) => handleOpenNewTask(prefill)}
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

          {currentTab === 'campanhas' && (
            <CampaignsView
              onSelectTask={(tId) => setActiveWorkflowTaskId(tId)}
              onNewTaskForCampaign={(campId, cId) => handleOpenNewTask({ campaignId: campId, clientId: cId })}
              onSelectClient={(cId) => {
                setSelectedClientId(cId);
                setCurrentTab('clientes');
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
