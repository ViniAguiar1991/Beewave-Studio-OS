import React, { useState } from 'react';
import {
  Check,
  MessageSquareWarning,
  MessageSquare,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List as ListIcon,
  TrendingUp,
  Users,
  BarChart3,
  Sparkles,
  X,
  FileText,
  Ban,
  CheckCircle2,
  Maximize2,
  LogOut,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Copy,
  Lightbulb,
  Link2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAppStore, useCurrentUser } from '../store';
import { Task, MonthlyReport } from '../types';
import { formatDate } from '../utils/dateUtils';
import { formatFriendlyDate, formatStandardDate, formatFullBadgeDate } from '../utils/dateFormatter';
import { getFormatLabel } from '../utils/badgeStyles';

interface ClientPortalViewProps {
  initialClientId?: string | null;
  onBackToApp?: () => void;
  isClientLocked?: boolean;
  onLogout?: () => void;
}

const normalizeWordList = (words?: string | string[]): string[] => {
  if (!words) return [];
  if (Array.isArray(words)) return words;
  return words.split(',').map((w) => w.trim()).filter(Boolean);
};

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  initialClientId,
  onBackToApp,
  isClientLocked = false,
  onLogout,
}) => {
  const currentUser = useCurrentUser();
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const clientApprove = useAppStore((s) => s.clientApprove);
  const clientRequestChange = useAppStore((s) => s.clientRequestChange);
  const clientRequestMultipleChanges = useAppStore((s) => s.clientRequestMultipleChanges);
  const logout = useAppStore((s) => s.logout);

  const effectiveClientId = isClientLocked
    ? (currentUser?.clientId || initialClientId || clients[0]?.id || '')
    : (initialClientId || clients[0]?.id || '');

  const [selectedClientId, setSelectedClientId] = useState<string>(effectiveClientId);
  const [activePortalTab, setActivePortalTab] = useState<'planejamento' | 'sugestoes' | 'perfil' | 'relatorios'>(() => {
    try {
      const saved = localStorage.getItem('beewave_portal_tab');
      if (saved && ['planejamento', 'sugestoes', 'perfil', 'relatorios'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'planejamento';
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('beewave_portal_tab', activePortalTab);
    } catch {}
  }, [activePortalTab]);

  // Initial view is 'lista' as requested: "Deixar lista como visualização inicial"
  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('lista');
  const [statusFilter, setStatusFilter] = useState<
    'todas' | 'em_producao' | 'em_aprovacao' | 'alterar' | 'aprovado' | 'postado'
  >('todas');
  const [dateFilter, setDateFilter] = useState<
    'all' | 'hoje' | 'esta_semana' | 'este_mes' | 'personalizado'
  >('all');
  const [portalDateFrom, setPortalDateFrom] = useState('');
  const [portalDateTo, setPortalDateTo] = useState('');

  // Suggestion form state
  const [suggestionIdea, setSuggestionIdea] = useState('');
  const [suggestionLinks, setSuggestionLinks] = useState('');
  const [suggestionDate, setSuggestionDate] = useState('');
  const [suggestionChannel, setSuggestionChannel] = useState('Instagram');
  const [suggestionFormat, setSuggestionFormat] = useState('Post Feed');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionSubmittedSuccess, setSuggestionSubmittedSuccess] = useState(false);

  // Keep selected client synced with props or currentUser
  React.useEffect(() => {
    if (isClientLocked && currentUser?.clientId) {
      setSelectedClientId(currentUser.clientId);
    } else if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId, currentUser?.clientId, isClientLocked]);

  // Task Inspection Modal & Adjustment States
  const [inspectingTaskId, setInspectingTaskId] = useState<string | null>(null);
  const inspectingTask = tasks.find((t) => t.id === inspectingTaskId) || null;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'conteudo' | 'ajustes'>('conteudo');
  const [pendingAdjustments, setPendingAdjustments] = useState<string[]>([]);
  const [newAdjustmentInput, setNewAdjustmentInput] = useState('');
  const [adjustmentNotice, setAdjustmentNotice] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Selected Report
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);

  // Month navigation for Planning Calendar
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const currentClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientTasks = tasks.filter((t) => t.clientId === currentClient?.id);
  const reports: MonthlyReport[] = currentClient?.monthlyReports || [];
  const activeReport = reports[selectedReportIndex] || reports[0];

  // Derived task lists for approval workflows
  const inProductionTasks = clientTasks.filter(
    (t) =>
      t.status === 'nao_iniciado' ||
      t.status === 'em_andamento' ||
      t.status === 'aguardar' ||
      t.status === 'urgencia'
  );
  const pendingApprovalTasks = clientTasks.filter((t) => t.status === 'em_aprovacao');
  const changeRequestedTasks = clientTasks.filter((t) => t.status === 'alterar');
  const approvedTasks = clientTasks.filter((t) => t.status === 'aprovado');
  const postedTasks = clientTasks.filter((t) => t.status === 'postado');
  const unassignedDateTasks = clientTasks.filter((t) => !t.postDate || t.postDate.trim() === '');

  // Filtered tasks for list/calendar views
  const filteredClientTasks = clientTasks.filter((t) => {
    // 1. Status Filter
    if (statusFilter === 'em_producao') {
      const isProd =
        t.status === 'nao_iniciado' ||
        t.status === 'em_andamento' ||
        t.status === 'aguardar' ||
        t.status === 'urgencia';
      if (!isProd) return false;
    } else if (statusFilter === 'em_aprovacao') {
      if (t.status !== 'em_aprovacao') return false;
    } else if (statusFilter === 'alterar') {
      if (t.status !== 'alterar') return false;
    } else if (statusFilter === 'aprovado') {
      if (t.status !== 'aprovado') return false;
    } else if (statusFilter === 'postado') {
      if (t.status !== 'postado') return false;
    }

    // 2. Date Filter
    if (dateFilter !== 'all') {
      if (!t.postDate) return false;
      const cleanPostDate = t.postDate.split('T')[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'hoje') {
        const todayStr = today.toISOString().split('T')[0];
        if (cleanPostDate !== todayStr) return false;
      } else if (dateFilter === 'esta_semana') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const taskDate = new Date(`${cleanPostDate}T00:00:00`);
        if (taskDate < startOfWeek || taskDate > endOfWeek) return false;
      } else if (dateFilter === 'este_mes') {
        const taskDate = new Date(`${cleanPostDate}T00:00:00`);
        if (taskDate.getMonth() !== today.getMonth() || taskDate.getFullYear() !== today.getFullYear()) return false;
      } else if (dateFilter === 'personalizado') {
        if (portalDateFrom && cleanPostDate < portalDateFrom) return false;
        if (portalDateTo && cleanPostDate > portalDateTo) return false;
      }
    }

    return true;
  });

  // Client Pauta Suggestion Handler
  const handleSubmitSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionIdea.trim() || !currentClient) return;

    setIsSubmittingSuggestion(true);

    try {
      const descriptionLines = [
        '[Sugestão de pauta do cliente enviada via Portal do Cliente]',
        '',
        '• Ideia / Conteúdo sugerido:',
        suggestionIdea.trim(),
      ];

      if (suggestionLinks.trim()) {
        descriptionLines.push('', '• Links e referências do cliente:');
        descriptionLines.push(suggestionLinks.trim());
      }

      if (suggestionDate) {
        descriptionLines.push('', `• Data pretendida para publicação: ${suggestionDate}`);
      }

      if (suggestionFormat) {
        descriptionLines.push(`• Formato sugerido: ${suggestionFormat}`);
      }

      const fullBriefing = descriptionLines.join('\n');

      addTask({
        clientId: currentClient.id,
        title: 'Sugestão de pauta do cliente',
        briefingText: fullBriefing,
        channel: (suggestionChannel.toLowerCase() as any) || 'instagram',
        postDate: suggestionDate || '',
        status: 'nao_iniciado',
        clientRequest: true,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      setSuggestionSubmittedSuccess(true);
      setSuggestionIdea('');
      setSuggestionLinks('');
      setSuggestionDate('');

      setTimeout(() => {
        setSuggestionSubmittedSuccess(false);
      }, 6000);
    } catch (err) {
      console.error('Erro ao enviar sugestão:', err);
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  // Modal open / close handlers
  const handleOpenTask = (task: Task, tab: 'conteudo' | 'ajustes' = 'conteudo') => {
    setInspectingTaskId(task.id);
    setActiveImageIndex(0);
    setActiveModalTab(tab);
    setPendingAdjustments([]);
    setNewAdjustmentInput('');
    setAdjustmentNotice(null);
  };

  const handleCloseModal = () => {
    setInspectingTaskId(null);
    setIsImageZoomed(false);
    setPendingAdjustments([]);
    setNewAdjustmentInput('');
    setAdjustmentNotice(null);
  };

  const handleAddPendingAdjustment = () => {
    const trimmed = newAdjustmentInput.trim();
    if (!trimmed) return;
    setPendingAdjustments((prev) => [...prev, trimmed]);
    setNewAdjustmentInput('');
    setAdjustmentNotice(null);
  };

  const handleRemovePendingAdjustment = (indexToRemove: number) => {
    setPendingAdjustments((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSendAllAdjustments = () => {
    if (!inspectingTask) return;
    const allToSubmit: string[] = [...pendingAdjustments];
    if (newAdjustmentInput.trim()) {
      allToSubmit.push(newAdjustmentInput.trim());
    }

    if (allToSubmit.length === 0) {
      setAdjustmentNotice('Por favor, descreva o que deseja alterar antes de enviar os ajustes.');
      return;
    }

    const clientName = currentClient?.name || currentClient?.company || currentUser?.name || 'Cliente';
    clientRequestMultipleChanges(inspectingTask.id, clientName, allToSubmit);

    // Switch view to 'alterar' (Ajustes Solicitados)
    setStatusFilter('alterar');

    handleCloseModal();
  };

  // Keybindings
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageZoomed) {
          setIsImageZoomed(false);
        } else if (inspectingTaskId) {
          handleCloseModal();
        }
      }
      if (inspectingTask && inspectingTask.files && inspectingTask.files.length > 1) {
        if (e.key === 'ArrowRight') {
          setActiveImageIndex((prev) => (prev + 1) % (inspectingTask.files?.length || 1));
        } else if (e.key === 'ArrowLeft') {
          setActiveImageIndex((prev) => (prev - 1 + (inspectingTask.files?.length || 1)) % (inspectingTask.files?.length || 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingTaskId, isImageZoomed, inspectingTask]);

  const handleApprove = (task: Task) => {
    clientApprove(task.id, currentClient?.name || currentClient?.company || 'Cliente');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const formatAdjustmentTimestamp = (ts?: string) => {
    if (!ts) return 'Recentemente';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'Recentemente';
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recentemente';
    }
  };

  // Helper for status badge & legend
  const getStatusColor = (status: string) => {
    if (status === 'alterar') return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700', label: 'Ajustes Solicitados', dot: 'bg-rose-500' };
    if (status === 'em_aprovacao') return { bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-700', label: 'Em Aprovação', dot: 'bg-sky-500' };
    if (status === 'aprovado') return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700', label: 'Aprovado', dot: 'bg-emerald-500' };
    return { bg: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-700', label: 'Em Produção', dot: 'bg-slate-400' };
  };

  // Calendar matrix calculation
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div id="client-portal-view" className="min-h-screen text-slate-800 dark:text-slate-100 relative selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900 pb-20">
      {/* Code-built Ambient Soft Gray Mesh Background Layers */}
      <div className="bg-mesh-ribbons" aria-hidden="true">
        <svg className="w-full h-full object-cover scale-105" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="1150" cy="180" r="320" fill="url(#portal_circle_1)" opacity="0.65" filter="blur(65px)" />
          <circle cx="280" cy="720" r="380" fill="url(#portal_circle_2)" opacity="0.6" filter="blur(75px)" />
          <path d="M-80 320 C 280 520, 520 -20, 980 320 C 1280 540, 1480 200, 1600 380" stroke="url(#portal0_linear)" strokeWidth="140" strokeLinecap="round" opacity="0.65" filter="blur(45px)"/>
          <path d="M120 780 C 420 520, 780 880, 1220 500 C 1420 340, 1580 620, 1700 520" stroke="url(#portal1_linear)" strokeWidth="180" strokeLinecap="round" opacity="0.55" filter="blur(55px)"/>
          <defs>
            <radialGradient id="portal_circle_1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1150 180) rotate(90) scale(320)">
              <stop stopColor="#cbd5e1" stopOpacity="0.9"/>
              <stop offset="0.7" stopColor="#94a3b8" stopOpacity="0.4"/>
              <stop offset="1" stopColor="#64748b" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="portal_circle_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(280 720) rotate(90) scale(380)">
              <stop stopColor="#94a3b8" stopOpacity="0.6"/>
              <stop offset="0.6" stopColor="#cbd5e1" stopOpacity="0.3"/>
              <stop offset="1" stopColor="#e2e8f0" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="portal0_linear" x1="0" y1="100" x2="1400" y2="500" gradientUnits="userSpaceOnUse">
              <stop stopColor="#94a3b8" stopOpacity="0.8"/>
              <stop offset="0.45" stopColor="#cbd5e1" stopOpacity="0.75"/>
              <stop offset="1" stopColor="#e2e8f0" stopOpacity="0.4"/>
            </linearGradient>
            <linearGradient id="portal1_linear" x1="100" y1="800" x2="1600" y2="400" gradientUnits="userSpaceOnUse">
              <stop stopColor="#64748b" stopOpacity="0.5"/>
              <stop offset="0.5" stopColor="#94a3b8" stopOpacity="0.7"/>
              <stop offset="1" stopColor="#cbd5e1" stopOpacity="0.25"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-noise z-0 opacity-80" aria-hidden="true" />

      {/* Top Floating App Bar */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-8 pt-6">
        <div className="clean-card px-5 py-3 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          {isClientLocked ? (
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-slate-950 font-black text-xs shadow-sm">
                BW
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Portal do Cliente
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {currentClient?.company}
                </p>
              </div>
            </div>
          ) : (
            <button
              id="btn-back-from-portal"
              onClick={onBackToApp}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Voltar ao Studio</span>
            </button>
          )}

          {/* Right Controls: If locked, show logout button; If studio preview, show client dropdown */}
          <div className="flex items-center gap-3 text-xs">
            {isClientLocked ? (
              <button
                id="btn-portal-logout"
                onClick={() => {
                  if (onLogout) onLogout();
                  else logout();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-3 py-1.5 font-bold transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </button>
            ) : (
              <>
                <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  Visualizar como:
                </span>
                <select
                  id="select-portal-client"
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    handleCloseModal();
                  }}
                  className="clean-input h-8 px-3 text-xs font-bold cursor-pointer bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-lg"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.company}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Facebook-Style Profile Card with Banner and Overlapping Logo */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-8 mt-6 space-y-8">
        <div className="clean-card overflow-hidden bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-md">
          {/* Banner with generous height & clean background */}
          <div className="relative h-44 sm:h-56 md:h-64 w-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 overflow-hidden border-b border-slate-200/80 dark:border-slate-800">
            {currentClient?.bannerUrl ? (
              <img
                src={currentClient.bannerUrl}
                alt="Banner"
                style={{
                  objectPosition: `center ${currentClient.bannerPositionY ?? 50}%`,
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <span className="text-2xl font-black tracking-widest uppercase text-slate-400">
                  {currentClient?.company}
                </span>
              </div>
            )}
          </div>

          {/* Profile Header Bar with Ample Breathing Room */}
          <div className="px-6 sm:px-8 pb-6 pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 -mt-14 sm:-mt-18 mb-6">
              <div className="flex items-start sm:items-center gap-5">
                {/* Avatar with clean white/dark ring */}
                <div className="relative grid h-22 w-22 sm:h-28 sm:w-28 shrink-0 place-items-center rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-xl overflow-hidden text-3xl z-10">
                  {currentClient?.logoUrl ? (
                    <img
                      src={currentClient.logoUrl}
                      alt={currentClient.company}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{currentClient?.emoji || '🏢'}</span>
                  )}
                </div>

                {/* Company Name & Details - Safely placed with ample breathing room */}
                <div className="space-y-1.5 pt-2 sm:pt-14">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                    {currentClient?.company}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {currentClient?.name} • Portal de Acompanhamento e Aprovação
                  </p>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 pt-2 sm:pt-14">
                <span className="rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs">
                  {clientTasks.length} pautas cadastradas
                </span>
              </div>
            </div>

            {/* Portal Navigation Tabs (Planejamento, Perfil, Relatórios Mensais) */}
            <div className="flex items-center gap-3 sm:gap-8 border-t border-slate-200/80 dark:border-slate-800 pt-4 overflow-x-auto">
              {[
                { key: 'planejamento', label: 'Planejamento', icon: CalendarIcon },
                { key: 'perfil', label: 'Perfil da Marca', icon: FileText },
                { key: 'relatorios', label: 'Relatórios Mensais', icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activePortalTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    id={`tab-portal-${tab.key}`}
                    onClick={() => setActivePortalTab(tab.key as any)}
                    className={`flex items-center gap-2 pb-3.5 px-1 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PLANEJAMENTO (CALENDÁRIO & LISTA + APROVAÇÕES PENDENTES) */}
        {/* ========================================================================= */}
        {activePortalTab === 'planejamento' && (
          <div className="space-y-6">
            {/* 1. SEÇÃO DE DESTAQUE: PAUTAS AGUARDANDO SUA APROVAÇÃO */}
            {pendingApprovalTasks.length > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-amber-500/5 to-transparent dark:from-sky-950/40 dark:via-amber-950/20 border-2 border-sky-500/30 dark:border-sky-700/50 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Pautas Aguardando Sua Aprovação</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500 text-white shadow-2xs">
                        {pendingApprovalTasks.length} {pendingApprovalTasks.length === 1 ? 'pendência' : 'pendências'}
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Revise os criativos e aprove com 1 clique abaixo
                  </span>
                </div>

                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {pendingApprovalTasks.map((t) => {
                    const firstImg = t.files?.find((f) => f.type?.startsWith('image/') || f.dataUrl?.startsWith('data:image') || f.dataUrl?.startsWith('http'))?.dataUrl;
                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/60 flex flex-col justify-between gap-3 shadow-xs hover:border-sky-400 dark:hover:border-sky-600 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              {t.channel || 'Instagram'} • {t.copyMode || 'Post'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {t.postDate ? formatFullBadgeDate(t.postDate) : 'Data flexível'}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {t.selectedHeadline || t.title}
                          </h4>

                          {firstImg && (
                            <div
                              onClick={() => handleOpenTask(t, 'conteudo')}
                              className="w-full max-h-72 overflow-hidden flex items-center justify-center bg-slate-100/70 dark:bg-slate-800/40 cursor-pointer relative group"
                            >
                              <img
                                src={firstImg}
                                alt={t.title}
                                className="w-full h-auto max-h-72 object-cover rounded-none group-hover:scale-[1.02] transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                <Eye className="h-4 w-4 mr-1.5" /> Expandir Detalhes
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {t.caption || t.briefingText || 'Clique em Visualizar para conferir todos os detalhes e o texto completo desta publicação.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <button
                            id={`btn-quick-approve-${t.id}`}
                            onClick={() => handleApprove(t)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 shadow-xs transition-all cursor-pointer active:scale-95"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Aprovar</span>
                          </button>

                          <button
                            onClick={() => handleOpenTask(t, 'ajustes')}
                            className="flex items-center justify-center gap-1 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
                            title="Solicitar Ajustes"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ajuste</span>
                          </button>

                          <button
                            onClick={() => handleOpenTask(t, 'conteudo')}
                            className="flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 text-xs font-bold cursor-pointer"
                            title="Conferir Detalhes"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. SEÇÃO DE DESTAQUE: PAUTAS COM AJUSTES SOLICITADOS (ENVIADO PARA A EQUIPE • AGUARDANDO NOVA ARTE) */}
            {changeRequestedTasks.length > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent dark:from-rose-950/40 dark:via-amber-950/20 border-2 border-rose-500/30 dark:border-rose-700/50 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Ajustes Solicitados à Equipe</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white shadow-2xs">
                        {changeRequestedTasks.length} {changeRequestedTasks.length === 1 ? 'pauta' : 'pautas'}
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 shadow-2xs">
                    <Clock className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Enviado para a equipe • Aguardando nova arte</span>
                  </div>
                </div>

                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {changeRequestedTasks.map((t) => {
                    const firstImg = t.files?.find((f) => f.type?.startsWith('image/') || f.dataUrl?.startsWith('data:image') || f.dataUrl?.startsWith('http'))?.dataUrl;
                    const lastAdjustment = t.activity?.filter((a) => a.type === 'client_change').slice(-1)[0];
                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex flex-col justify-between gap-3 shadow-xs hover:border-rose-400 dark:hover:border-rose-600 transition-all"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              {t.channel || 'Instagram'} • {t.copyMode || 'Post'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {t.postDate ? formatFullBadgeDate(t.postDate) : 'Data flexível'}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {t.selectedHeadline || t.title}
                          </h4>

                          {/* Sinalizador de envio */}
                          <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 flex items-center gap-2 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                            <Clock className="h-4 w-4 text-rose-500 shrink-0 animate-pulse" />
                            <div className="min-w-0">
                              <span className="block leading-tight">Enviado para a equipe</span>
                              <span className="text-[10px] font-medium text-rose-600/90 dark:text-rose-400/90">Aguardando nova arte revisada</span>
                            </div>
                          </div>

                          {firstImg && (
                            <div
                              onClick={() => handleOpenTask(t, 'ajustes')}
                              className="w-full max-h-56 overflow-hidden flex items-center justify-center bg-slate-100/70 dark:bg-slate-800/40 cursor-pointer relative group rounded-lg"
                            >
                              <img
                                src={firstImg}
                                alt={t.title}
                                className="w-full h-auto max-h-56 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                <Eye className="h-4 w-4 mr-1.5" /> Ver Detalhes e Ajustes
                              </div>
                            </div>
                          )}

                          {lastAdjustment && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-0.5">
                              <span className="font-bold text-rose-600 dark:text-rose-400">Último ajuste enviado:</span>
                              <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic leading-relaxed">
                                "{lastAdjustment.text}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenTask(t, 'ajustes')}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold py-2 shadow-xs transition-all cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Ver Ajustes & Histórico</span>
                          </button>

                          <button
                            onClick={() => handleOpenTask(t, 'conteudo')}
                            className="flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 text-xs font-bold cursor-pointer"
                            title="Conferir Conteúdo"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Controls, Filters & Color Legend */}
            <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setStatusFilter('todas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'todas'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Todas ({clientTasks.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pendentes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'pendentes'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  <span>Aguardando Aprovação ({pendingApprovalTasks.length})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('alterar')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'alterar'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Ajustes Solicitados ({changeRequestedTasks.length})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('aprovadas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'aprovadas'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Aprovados ({approvedTasks.length})</span>
                </button>
              </div>

              {/* View Toggle (Calendário / Lista) */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    id="btn-portal-view-calendar"
                    onClick={() => setViewMode('calendario')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'calendario'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Calendário</span>
                  </button>
                  <button
                    id="btn-portal-view-list"
                    onClick={() => setViewMode('lista')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'lista'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ListIcon className="h-3.5 w-3.5" />
                    <span>Lista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW MODE: CALENDAR */}
            {viewMode === 'calendario' && (
              <div className="space-y-4">
                <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  {/* Month Navigator */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentMonthDate(new Date())}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Hoje
                      </button>
                      <button
                        onClick={() => setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                      <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {day}
                      </div>
                    ))}

                    {/* Empty cells before month start */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[100px] rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 opacity-40" />
                    ))}

                    {/* Month Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNumber = i + 1;
                      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                      const dayTasks = filteredClientTasks.filter((t) => (t.postDate || '').startsWith(dateString));
                      const isToday = new Date().toISOString().startsWith(dateString);

                      return (
                        <div
                          key={dayNumber}
                          className={`min-h-[105px] rounded-xl p-2 border flex flex-col justify-between transition-all ${
                            isToday
                              ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`font-bold ${isToday ? 'text-slate-950 dark:text-white font-black underline' : 'text-slate-500'}`}>
                              {dayNumber}
                            </span>
                            {dayTasks.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400">
                                {dayTasks.length} {dayTasks.length === 1 ? 'post' : 'posts'}
                              </span>
                            )}
                          </div>

                          {/* Minimalist Task Cards inside Day */}
                          <div className="space-y-1.5 flex-1">
                            {dayTasks.map((t) => {
                              const statusInfo = getStatusColor(t.status);
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => handleOpenTask(t, t.status === 'alterar' ? 'ajustes' : 'conteudo')}
                                  className={`w-full text-left p-1.5 rounded-lg border text-[11px] font-semibold leading-tight line-clamp-2 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] ${
                                    t.status === 'alterar'
                                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                      : t.status === 'em_aprovacao'
                                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                                      : t.status === 'aprovado'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-1">
                                    {t.status === 'alterar' ? (
                                      <Clock className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                                    ) : (
                                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusInfo.dot}`} />
                                    )}
                                    <span className="truncate">{t.selectedHeadline || t.title}</span>
                                  </div>
                                  {t.status === 'alterar' && (
                                    <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                                      Aguardando nova arte
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unassigned Date Tasks Section */}
                {unassignedDateTasks.length > 0 && (
                  <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Pautas em Planejamento / Sem Data Fixada ({unassignedDateTasks.length})</span>
                    </h4>

                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {unassignedDateTasks.map((t) => {
                        const statusInfo = getStatusColor(t.status);
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleOpenTask(t, 'conteudo')}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer hover:border-slate-400"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {t.selectedHeadline || t.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 ml-3.5">
                                {statusInfo.label}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW MODE: LIST */}
            {viewMode === 'lista' && (
              <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cronograma de Publicações ({filteredClientTasks.length})
                  </h3>
                  <span className="text-xs text-slate-400">Clique para conferir e aprovar</span>
                </div>

                <div className="space-y-2.5">
                  {filteredClientTasks.map((t) => {
                    const statusInfo = getStatusColor(t.status);
                    return (
                      <div
                        key={t.id}
                        className="clean-card p-4 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div
                          onClick={() => handleOpenTask(t, 'conteudo')}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <span className={`h-3 w-3 shrink-0 rounded-full ${statusInfo.dot}`} />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {t.selectedHeadline || t.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Data prevista: {t.postDate ? formatFullBadgeDate(t.postDate) : 'A definir'} • {t.channel || 'Instagram'} • {getFormatLabel(t)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {t.status === 'alterar' ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <Clock className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                              <span>Enviado para a equipe • Aguardando nova arte</span>
                            </span>
                          ) : (
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              t.status === 'em_aprovacao'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800'
                                : t.status === 'aprovado'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                              {statusInfo.label}
                            </span>
                          )}

                          {t.status === 'em_aprovacao' && (
                            <button
                              onClick={() => handleApprove(t)}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-bold cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                              <span>Aprovar</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenTask(t, 'conteudo')}
                            className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline px-2 py-1 cursor-pointer"
                          >
                            <span>Ver</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredClientTasks.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhuma publicação encontrada para os filtros selecionados.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PERFIL (VIEW-ONLY: BIO, PERSONA, TOM DE VOZ, PALAVRAS) */}
        {/* ========================================================================= */}
        {activePortalTab === 'perfil' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Bio & Sobre a Marca */}
            <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span>Bio & Posicionamento da Marca</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentClient?.about || 'Nenhuma descrição detalhada cadastrada para esta marca.'}
              </p>
              {currentClient?.niche && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                  <strong className="text-slate-900 dark:text-white">Nicho de Atuação:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-300">{currentClient.niche}</span>
                </div>
              )}
            </div>

            {/* 2. Persona */}
            <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span>Persona & Público-Alvo</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentClient?.persona || currentClient?.targetAudience || 'Público geral interessado nos serviços e soluções da marca.'}
              </p>
            </div>

            {/* 3. Tom de Voz */}
            <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span>Tom de Voz & Diretrizes de Comunicação</span>
              </h3>
              
              <div className="flex flex-wrap gap-2 pt-1">
                {(currentClient?.toneOfVoiceTags || currentClient?.toneOfVoice || ['Acolhedor', 'Profissional']).map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {currentClient?.toneOfVoiceCustom && (
                <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-800 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Observações de Voz:</strong> {currentClient.toneOfVoiceCustom}
                </p>
              )}
            </div>

            {/* 4. Palavras Recomendadas e a Evitar */}
            <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Palavras a serem usadas</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {normalizeWordList(currentClient?.recommendedWords || ['Qualidade', 'Exclusividade', 'Cuidado']).map((w, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-2">
                  <Ban className="h-3.5 w-3.5" />
                  <span>Palavras a serem evitadas</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {normalizeWordList(currentClient?.forbiddenWords || ['Barato', 'Promoção relâmpago', 'Impossível']).map((w, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RELATÓRIOS MENSAIS (DASHBOARD: CRESCIMENTO, ENGAJAMENTO, INSIGHTS) */}
        {/* ========================================================================= */}
        {activePortalTab === 'relatorios' && (
          <div className="space-y-6">
            {/* Period Selector Header */}
            <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  <span>Relatórios de Performance Mensal</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Acompanhe os resultados, evolução de alcance e engajamento da sua marca.
                </p>
              </div>

              {reports.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Mês de Referência:</span>
                  <select
                    value={selectedReportIndex}
                    onChange={(e) => setSelectedReportIndex(Number(e.target.value))}
                    className="clean-input h-9 px-3 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                  >
                    {reports.map((rep, idx) => (
                      <option key={rep.id} value={idx}>
                        {rep.month} ({rep.postsPublished ?? rep.postsCount ?? 0} posts)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {activeReport ? (
              <div className="space-y-6">
                {/* 4 Metric Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Card 1: Novos Seguidores */}
                  <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Novos Seguidores
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        +{(activeReport.newFollowers ?? 480).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>+{activeReport.followersGrowthPercent ?? 12.5}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Alcance Total */}
                  <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Contas Alcançadas
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {(activeReport.reach ?? activeReport.reachTotal ?? 38500).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {activeReport.postsPublished ?? activeReport.postsCount ?? 16} publicações
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Impressões */}
                  <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Impressões Totais
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {(activeReport.impressions ?? 94200).toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Total de visualizações
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Taxa de Engajamento */}
                  <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Taxa de Engajamento
                    </span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                        {activeReport.engagementRate}%
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Acima da média
                      </span>
                    </div>
                  </div>
                </div>

                {/* Highlights & Insights Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Best Performing Posts */}
                  <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Melhores Conteúdos do Mês</span>
                    </h4>

                    <div className="space-y-2.5">
                      {(activeReport.topPosts || [
                        { title: 'Post de Maior Engajamento', metric: `${activeReport.engagementRate}% engajamento` },
                        { title: 'Reels de Maior Alcance', metric: '14.500 contas alcançadas' }
                      ]).map((post, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold text-slate-400">#{pIdx + 1}</span>
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {post.title}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                            {post.metric}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Insights */}
                  <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      <span>Insights & Recomendações Estratégicas</span>
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeReport.insights || 'Excelente retenção nos carrosséis explicativos e crescimento acelerado por Reels.'}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-500 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Próximos passos para o próximo mês:</p>
                      <p>Intensificar formatos de carrossel educativo e ampliar chamadas de ação para o direct.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="clean-card p-12 text-center text-xs text-slate-400 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800">
                Nenhum relatório mensal gerado ainda para esta conta.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TASK INSPECTION & ADJUSTMENT WORKFLOW MODAL */}
      {/* ========================================================================= */}
      {inspectingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-5xl xl:max-w-6xl max-h-[94vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`h-3.5 w-3.5 shrink-0 rounded-full ${getStatusColor(inspectingTask.status).dot}`} />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {inspectingTask.selectedHeadline || inspectingTask.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Publicação programada para:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {inspectingTask.postDate
                        ? formatFullBadgeDate(inspectingTask.postDate)
                        : 'A definir'}
                    </strong>
                    {' '}• {inspectingTask.channel || 'Instagram'} • {getFormatLabel(inspectingTask)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fechar janela (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Status Alert Banner when changes were requested */}
            {inspectingTask.status === 'alterar' && (
              <div className="mx-5 sm:mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-transparent border-2 border-rose-400/60 dark:border-rose-700/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Ajustes enviados para a equipe de criação</span>
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Sua solicitação foi registrada com sucesso. A equipe está revisando e produzindo as alterações solicitadas. <strong>Por favor, aguarde o envio da nova arte para aprovação.</strong>
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
                    Aguardando Nova Arte
                  </span>
                </div>
              </div>
            )}

            {/* Modal Body: Left Art/Carousel Gallery (7 cols) + Right Content & Adjustments (5 cols) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Image / Carousel Gallery (Square borders, adapted ratio, no black frame) */}
              <div className="lg:col-span-7 flex flex-col space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Arte do Post ({inspectingTask.files?.length || 0})
                  </h4>
                  {inspectingTask.files && inspectingTask.files.length > 1 && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Slide {activeImageIndex + 1} de {inspectingTask.files.length}
                    </span>
                  )}
                </div>

                {inspectingTask.files && inspectingTask.files.length > 0 ? (
                  <div className="relative w-full max-h-[68vh] min-h-[340px] flex items-center justify-center p-3 bg-slate-100/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden group">
                    <img
                      src={inspectingTask.files[activeImageIndex]?.dataUrl}
                      alt={`Imagem ${activeImageIndex + 1}`}
                      className="max-h-[64vh] w-auto max-w-full object-contain rounded-none shadow-md cursor-zoom-in group-hover:scale-[1.01] transition-transform duration-150"
                      onClick={() => setIsImageZoomed(true)}
                    />

                    {/* Navigation Arrows */}
                    {inspectingTask.files.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) => (prev - 1 + inspectingTask.files!.length) % inspectingTask.files!.length);
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur shadow-md transition-all cursor-pointer"
                          title="Slide anterior"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) => (prev + 1) % inspectingTask.files!.length);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur shadow-md transition-all cursor-pointer"
                          title="Próximo slide"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Zoom icon helper */}
                    <button
                      type="button"
                      onClick={() => setIsImageZoomed(true)}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Ver em tela cheia"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>

                    {/* Counter pill */}
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/75 text-white text-[11px] font-bold backdrop-blur">
                      {activeImageIndex + 1} de {inspectingTask.files.length}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-80 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-xs text-slate-400 p-6 text-center">
                    <span>Nenhuma imagem anexada ainda.</span>
                    <span className="text-[11px] text-slate-500 mt-1">A equipe criativa está preparando o material.</span>
                  </div>
                )}

                {/* Thumbnails row (Square borders) */}
                {inspectingTask.files && inspectingTask.files.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {inspectingTask.files.map((file, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => setActiveImageIndex(fIdx)}
                        className={`h-16 w-16 shrink-0 rounded-none overflow-hidden border-2 transition-all cursor-pointer ${
                          activeImageIndex === fIdx
                            ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/20 dark:ring-white/20'
                            : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={file.dataUrl} alt={`Thumb ${fIdx + 1}`} className="h-full w-full object-cover rounded-none" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Tabs for Content vs. Adjustments & History */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 min-w-0">
                {/* Tab switcher */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('conteudo')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeModalTab === 'conteudo'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Conteúdo & Legenda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalTab('ajustes')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeModalTab === 'ajustes'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                    }`}
                  >
                    <MessageSquareWarning className="h-3.5 w-3.5" />
                    <span>Solicitar Ajustes</span>
                    {(inspectingTask.activity?.filter((a) => a.type === 'client_change').length || 0) > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold">
                        {inspectingTask.activity?.filter((a) => a.type === 'client_change').length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tab: Conteúdo & Legenda */}
                {activeModalTab === 'conteudo' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4 min-h-0">
                    <div className="flex-1 flex flex-col space-y-2.5 min-h-0">
                      <div className="flex items-center justify-between shrink-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Legenda da Publicação
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {inspectingTask.caption?.length || 0} caracteres
                          </span>
                          {inspectingTask.caption && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(inspectingTask.caption);
                                setCopiedCaption(true);
                                setTimeout(() => setCopiedCaption(false), 2000);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                              title="Copiar texto da legenda"
                            >
                              <Copy className="h-3 w-3" />
                              <span>{copiedCaption ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Container da legenda da mesma altura da imagem, sem o scroll travado */}
                      <div className="flex-1 min-h-[340px] lg:min-h-[460px] p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed select-text flex flex-col justify-between shadow-2xs">
                        <div className="leading-relaxed">
                          {inspectingTask.caption || 'Texto da legenda em desenvolvimento pela equipe.'}
                        </div>

                        {/* Carousel slides content if available */}
                        {inspectingTask.copyMode === 'carrossel' && inspectingTask.carouselSlides && inspectingTask.carouselSlides.length > 0 && (
                          <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Estrutura dos Slides ({inspectingTask.carouselSlides.length})
                            </h5>
                            <div className="space-y-2">
                              {inspectingTask.carouselSlides.map((s, sIdx) => (
                                <div key={sIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-0.5 shadow-2xs">
                                  <span className="font-bold text-slate-900 dark:text-white">Slide {s.slideNumber}: {s.title}</span>
                                  <p className="text-slate-600 dark:text-slate-300">{s.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions for Content View */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                      {inspectingTask.status === 'alterar' ? (
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                            <Clock className="h-4 w-4 text-rose-500 shrink-0" />
                            <span>Ajustes enviados para a equipe • Aguarde nova arte</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('ajustes')}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-slate-800 font-bold px-3 py-1.5 text-xs transition-all cursor-pointer"
                          >
                            <MessageSquareWarning className="h-3.5 w-3.5" />
                            <span>Ver Histórico de Ajustes</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('ajustes')}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-bold px-4 py-2.5 text-xs transition-all cursor-pointer"
                          >
                            <MessageSquareWarning className="h-4 w-4" />
                            <span>Pedir Ajustes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(inspectingTask)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                            <span>Aprovar Conteúdo</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Solicitar Ajustes & Histórico Completo */}
                {activeModalTab === 'ajustes' && (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                      {/* Notice Banner */}
                      {adjustmentNotice && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>{adjustmentNotice}</span>
                        </div>
                      )}

                      {/* 1. History of Previous Adjustments */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-rose-500" />
                            <span>Histórico de Ajustes Solicitados</span>
                          </h4>
                          <span className="text-[11px] font-bold text-slate-500">
                            {inspectingTask.activity?.filter((a) => a.type === 'client_change').length || 0}
                          </span>
                        </div>

                        {inspectingTask.activity && inspectingTask.activity.filter((a) => a.type === 'client_change').length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {inspectingTask.activity
                              .filter((a) => a.type === 'client_change')
                              .map((act, aIdx) => (
                                <div
                                  key={`${act.ts || ''}-${aIdx}`}
                                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-700/80 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-rose-600 dark:text-rose-400">
                                      Ajuste #{aIdx + 1} {act.by ? `• ${act.by}` : ''}
                                    </span>
                                    <span className="text-slate-400 font-medium">
                                      {formatAdjustmentTimestamp(act.ts)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                    {act.text}
                                  </p>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-center text-xs text-slate-400">
                            Nenhum ajuste anterior registrado para este post.
                          </div>
                        )}
                      </div>

                      {/* 2. Newly added adjustments in current session */}
                      {pendingAdjustments.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                            <span>Ajustes Prontos para Enviar ({pendingAdjustments.length})</span>
                            <span className="text-[10px] text-slate-400 lowercase font-normal">Clique no lixo para remover</span>
                          </h4>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {pendingAdjustments.map((adj, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start justify-between gap-2"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400">
                                    Item #{pIdx + 1}
                                  </span>
                                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-tight">
                                    {adj}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemovePendingAdjustment(pIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                  title="Remover este ajuste"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Input to add another adjustment */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Descrever Ajuste:
                          </label>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Você pode solicitar mais de um
                          </span>
                        </div>

                        <textarea
                          value={newAdjustmentInput}
                          onChange={(e) => {
                            setNewAdjustmentInput(e.target.value);
                            if (adjustmentNotice) setAdjustmentNotice(null);
                          }}
                          placeholder="Ex: Por favor trocar a foto do slide 2 e alterar a chamada final para o direct..."
                          className="w-full h-24 p-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl outline-none resize-none leading-relaxed text-slate-900 dark:text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />

                        <button
                          type="button"
                          onClick={handleAddPendingAdjustment}
                          disabled={!newAdjustmentInput.trim()}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Adicionar à Lista de Ajustes</span>
                        </button>
                      </div>
                    </div>

                    {/* Submit All Adjustments and Close Popup */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveModalTab('conteudo')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Voltar à Legenda
                      </button>

                      <button
                        type="button"
                        onClick={handleSendAllAdjustments}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-2.5 text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                        <span>
                          Enviar Ajustes{' '}
                          {pendingAdjustments.length + (newAdjustmentInput.trim() ? 1 : 0) > 0
                            ? `(${pendingAdjustments.length + (newAdjustmentInput.trim() ? 1 : 0)})`
                            : ''}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN IMAGE ZOOM MODAL (Square borders, true post aspect ratio) */}
      {/* ========================================================================= */}
      {isImageZoomed && inspectingTask?.files && (
        <div
          onClick={() => setIsImageZoomed(false)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setIsImageZoomed(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            title="Fechar zoom"
          >
            <X className="h-6 w-6" />
          </button>

          <img
            src={inspectingTask.files[activeImageIndex]?.dataUrl}
            alt="Zoomed"
            className="max-h-[92vh] max-w-[92vw] object-contain rounded-none shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
