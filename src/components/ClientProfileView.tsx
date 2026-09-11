import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  FileText,
  X,
  Download,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  Ban,
  BarChart3,
  Key,
  Copy,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Share2,
  Check,
  MoveVertical,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { formatDate } from '../utils/dateUtils';
import { compressImage } from '../utils/imageCompressor';
import { MonthlyReport } from '../types';
import { getStatusLabel } from '../utils/badgeStyles';
import { ClientRecurrenceTab } from './ClientRecurrenceTab';

interface ClientProfileViewProps {
  clientId: string;
  onBack: () => void;
  onSelectTask: (taskId: string) => void;
  onNewTaskForClient: (clientId: string) => void;
  onOpenPortal?: (clientId: string) => void;
}

const PRESET_TONES = [
  'Acolhedor',
  'Jovem e Dinâmico',
  'Técnico e Especialista',
  'Sofisticado e Premium',
  'Sensorial e Afetivo',
  'Direto ao Ponto',
  'Inspirador e Motivacional',
  'Descontraído e Leve',
  'Autoridade e Seguro',
];

const normalizeWordList = (words?: string | string[]): string[] => {
  if (!words) return [];
  if (Array.isArray(words)) return words;
  return words.split(',').map((w) => w.trim()).filter(Boolean);
};

export const ClientProfileView: React.FC<ClientProfileViewProps> = ({
  clientId,
  onBack,
  onSelectTask,
  onNewTaskForClient,
  onOpenPortal,
}) => {
  const clients = useAppStore((s) => s.clients);
  const allTasks = useAppStore((s) => s.tasks);
  const updateClient = useAppStore((s) => s.updateClient);
  const deleteClient = useAppStore((s) => s.deleteClient);
  const addClientFiles = useAppStore((s) => s.addClientFiles);
  const removeClientFile = useAppStore((s) => s.removeClientFile);
  const plans = useAppStore((s) => s.plans);
  const currentUser = useCurrentUser();

  const client = React.useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const tasks = React.useMemo(() => allTasks.filter((t) => t.clientId === clientId), [allTasks, clientId]);

  const totalTimeSpentSeconds = tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0);

  const formatClientTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m} min`;
    return `${seconds}s`;
  };

  const [activeTab, setActiveTab] = useState<'sobre' | 'relatorios' | 'cadastro' | 'financeiro' | 'arquivos' | 'tarefas' | 'portal' | 'recorrencia'>(() => {
    try {
      const saved = localStorage.getItem('beewave_client_subtab');
      if (saved && ['sobre', 'relatorios', 'cadastro', 'financeiro', 'arquivos', 'tarefas', 'portal', 'recorrencia'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'sobre';
  });

  useEffect(() => {
    try {
      localStorage.setItem('beewave_client_subtab', activeTab);
    } catch {}
  }, [activeTab]);

  const [newToneInput, setNewToneInput] = useState('');
  const [showAddTone, setShowAddTone] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Portal credentials management state
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [copiedPortalInvite, setCopiedPortalInvite] = useState(false);

  // Tag inputs for Recommended / Forbidden words
  const [newRecommendedWord, setNewRecommendedWord] = useState('');
  const [newForbiddenWord, setNewForbiddenWord] = useState('');

  // Preview modal for files
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  // Custom one-off services modal & states
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');
  const [newServiceDate, setNewServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newServiceStatus, setNewServiceStatus] = useState<any>('pendente');
  const [newServiceDescription, setNewServiceDescription] = useState('');

  // New report form modal
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [repMonth, setRepMonth] = useState('Outubro 2024');
  const [repFollowers, setRepFollowers] = useState(480);
  const [repGrowth, setRepGrowth] = useState(12.5);
  const [repReach, setRepReach] = useState(38500);
  const [repImpressions, setRepImpressions] = useState(94200);
  const [repEngagement, setRepEngagement] = useState(4.8);
  const [repPostsCount, setRepPostsCount] = useState(16);
  const [repInsights, setRepInsights] = useState('Excelente retenção nos carrosséis explicativos e crescimento acelerado por Reels.');

  // Banner Vertical Framing & Repositioning
  const [isRepositioningBanner, setIsRepositioningBanner] = useState(false);
  const [bannerPositionY, setBannerPositionY] = useState<number>(client?.bannerPositionY ?? 50);
  const isDraggingBannerRef = useRef(false);
  const startDragYRef = useRef(0);
  const startPosValRef = useRef(50);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!client) {
    return (
      <div className="p-8 text-center clean-card max-w-md mx-auto">
        <p className="text-slate-400">Cliente não encontrado.</p>
        <button onClick={onBack} className="mt-3 text-xs font-bold text-slate-900 dark:text-white hover:underline">
          Voltar para lista de clientes
        </button>
      </div>
    );
  }

  const clientPlan = plans.find((p) => p.id === client.planId);

  const handleBannerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRepositioningBanner) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('button') || target.closest('input') || target.closest('.banner-controls-bottom-bar'))) {
      return;
    }
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingBannerRef.current = true;
    startDragYRef.current = e.clientY;
    startPosValRef.current = bannerPositionY;
  };

  const handleBannerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBannerRef.current) return;
    const deltaY = e.clientY - startDragYRef.current;
    // Drag down to reveal upper portion (lower %), drag up to reveal lower portion (higher %)
    const newPos = Math.max(0, Math.min(100, Math.round(startPosValRef.current - deltaY * 0.45)));
    setBannerPositionY(newPos);
  };

  const handleBannerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingBannerRef.current) return;
    isDraggingBannerRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleSaveBannerPosition = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    updateClient(client.id, { bannerPositionY });
    setIsRepositioningBanner(false);
  };

  const handleCancelBannerPosition = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setBannerPositionY(client.bannerPositionY ?? 50);
    setIsRepositioningBanner(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 1600, 1000, 0.85);
      updateClient(client.id, { bannerUrl: compressedDataUrl });
    } catch (err) {
      console.error('Error compressing banner:', err);
      const reader = new FileReader();
      reader.onload = () => {
        updateClient(client.id, { bannerUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file, 500, 500, 0.9);
      updateClient(client.id, { logoUrl: compressedDataUrl });
    } catch (err) {
      console.error('Error compressing logo:', err);
      const reader = new FileReader();
      reader.onload = () => {
        updateClient(client.id, { logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: any[] = [];
    for (const f of Array.from(files) as File[]) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });

      newFiles.push({
        id: `cfile_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: f.name,
        type: f.type,
        size: f.size,
        dataUrl,
        uploadedAt: new Date().toISOString().split('T')[0],
      });
    }

    if (newFiles.length) {
      addClientFiles(client.id, newFiles);
    }
  };

  const toggleTone = (tone: string) => {
    const currentTones = client.toneOfVoiceTags || client.toneOfVoice || [];
    if (currentTones.includes(tone)) {
      updateClient(client.id, {
        toneOfVoiceTags: currentTones.filter((t) => t !== tone),
        toneOfVoice: currentTones.filter((t) => t !== tone),
      });
    } else {
      updateClient(client.id, {
        toneOfVoiceTags: [...currentTones, tone],
        toneOfVoice: [...currentTones, tone],
      });
    }
  };

  const handleAddCustomTone = () => {
    if (!newToneInput.trim()) return;
    const currentTones = client.toneOfVoiceTags || client.toneOfVoice || [];
    if (!currentTones.includes(newToneInput.trim())) {
      updateClient(client.id, {
        toneOfVoiceTags: [...currentTones, newToneInput.trim()],
        toneOfVoice: [...currentTones, newToneInput.trim()],
      });
    }
    setNewToneInput('');
    setShowAddTone(false);
  };

  const handleAddRecommendedWord = () => {
    if (!newRecommendedWord.trim()) return;
    const words = normalizeWordList(client.recommendedWords);
    if (!words.includes(newRecommendedWord.trim())) {
      updateClient(client.id, { recommendedWords: [...words, newRecommendedWord.trim()] });
    }
    setNewRecommendedWord('');
  };

  const handleRemoveRecommendedWord = (word: string) => {
    const words = normalizeWordList(client.recommendedWords);
    updateClient(client.id, { recommendedWords: words.filter((w) => w !== word) });
  };

  const handleAddForbiddenWord = () => {
    if (!newForbiddenWord.trim()) return;
    const words = normalizeWordList(client.forbiddenWords);
    if (!words.includes(newForbiddenWord.trim())) {
      updateClient(client.id, { forbiddenWords: [...words, newForbiddenWord.trim()] });
    }
    setNewForbiddenWord('');
  };

  const handleRemoveForbiddenWord = (word: string) => {
    const words = normalizeWordList(client.forbiddenWords);
    updateClient(client.id, { forbiddenWords: words.filter((w) => w !== word) });
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport: MonthlyReport = {
      id: `rep_${Date.now()}`,
      month: repMonth,
      newFollowers: Number(repFollowers),
      followersGrowthPercent: Number(repGrowth),
      reach: Number(repReach),
      impressions: Number(repImpressions),
      engagementRate: Number(repEngagement),
      postsPublished: Number(repPostsCount),
      insights: repInsights,
      topPosts: [
        { title: 'Post de Maior Engajamento', metric: `${repEngagement}% engajamento` },
        { title: 'Reels de Maior Alcance', metric: `${Math.round(repReach * 0.4)} contas alcançadas` },
      ],
    };

    const currentReports = client.monthlyReports || [];
    updateClient(client.id, { monthlyReports: [newReport, ...currentReports] });
    setShowNewReportModal(false);
  };

  const handleDeleteReport = (reportId: string) => {
    const currentReports = client.monthlyReports || [];
    updateClient(client.id, { monthlyReports: currentReports.filter((r) => r.id !== reportId) });
  };

  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceTitle.trim()) return;
    const newService = {
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newServiceTitle.trim(),
      price: Number(newServicePrice) || 0,
      date: newServiceDate || new Date().toISOString().split('T')[0],
      status: newServiceStatus || 'pendente',
      description: newServiceDescription.trim() || undefined,
    };
    const current = client.customServices || [];
    updateClient(client.id, { customServices: [newService, ...current] });
    setShowAddServiceModal(false);
    setNewServiceTitle('');
    setNewServicePrice('');
    setNewServiceDescription('');
  };

  const handleUpdateServiceStatus = (serviceId: string, status: any) => {
    const current = client.customServices || [];
    updateClient(client.id, {
      customServices: current.map((s) => (s.id === serviceId ? { ...s, status } : s)),
    });
  };

  const handleDeleteCustomService = (serviceId: string) => {
    const current = client.customServices || [];
    updateClient(client.id, {
      customServices: current.filter((s) => s.id !== serviceId),
    });
  };

  return (
    <div id="client-profile-view" className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Top breadcrumb navigation */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-clients"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Clientes</span>
        </button>

        <div className="flex items-center gap-2.5">
          {currentUser?.role === 'admin' && (
            <button
              id="btn-delete-client"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              Excluir Cliente
            </button>
          )}

          <button
            id="btn-new-task-from-client"
            onClick={() => onNewTaskForClient(client.id)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Main Header Banner & Avatar */}
      <div className="clean-card overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md">
        {/* Banner Area */}
        <div
          onPointerDown={handleBannerPointerDown}
          onPointerMove={handleBannerPointerMove}
          onPointerUp={handleBannerPointerUp}
          onPointerCancel={handleBannerPointerUp}
          className={`relative h-44 sm:h-56 md:h-60 w-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 overflow-hidden border-b border-slate-200/80 dark:border-slate-800 select-none ${
            isRepositioningBanner ? 'cursor-grab active:cursor-grabbing ring-2 ring-sky-500' : ''
          }`}
        >
          {client.bannerUrl ? (
            <img
              src={client.bannerUrl}
              alt="Banner do Cliente"
              draggable={false}
              style={{
                objectPosition: `center ${isRepositioningBanner ? bannerPositionY : (client.bannerPositionY ?? 50)}%`,
              }}
              className="h-full w-full object-cover transition-[object-position] duration-75 pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
              <span className="text-xl font-bold tracking-wider uppercase text-slate-400">
                {client.company}
              </span>
            </div>
          )}

          {/* Banner controls overlay when repositioning */}
          {isRepositioningBanner ? (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex flex-col justify-between p-4 z-20">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg">
                  <MoveVertical className="h-4 w-4 text-sky-400 animate-bounce" />
                  <span>Arraste na imagem para reposicionar ou use o controle abaixo</span>
                </div>
                <span className="text-xs font-mono font-bold bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white px-2.5 py-1 rounded-lg">
                  {bannerPositionY}%
                </span>
              </div>

              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="banner-controls-bottom-bar bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl border border-white/10"
              >
                <div className="flex items-center gap-3 w-full sm:w-1/2">
                  <span className="text-[11px] font-bold text-slate-300 shrink-0">Topo</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bannerPositionY}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => setBannerPositionY(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <span className="text-[11px] font-bold text-slate-300 shrink-0">Fundo</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    id="btn-cancel-banner-position"
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handleCancelBannerPosition}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-save-banner-position"
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handleSaveBannerPosition}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Salvar Enquadramento</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
              {client.bannerUrl && (
                <button
                  id="btn-reposition-banner"
                  onClick={() => {
                    setBannerPositionY(client.bannerPositionY ?? 50);
                    setIsRepositioningBanner(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm backdrop-blur border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Ajustar enquadramento vertical da imagem do banner"
                >
                  <MoveVertical className="h-3.5 w-3.5" />
                  <span>Enquadrar</span>
                </button>
              )}
              <button
                id="btn-change-banner"
                onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm backdrop-blur border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Alterar banner</span>
              </button>
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>

        {/* Profile Info Row with Generous Breathing Room */}
        <div className="relative px-6 sm:px-8 pb-6 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 -mt-14 sm:-mt-18 mb-5">
            <div className="flex items-start sm:items-center gap-5">
              {/* Overlapping avatar */}
              <div className="group relative grid h-20 w-20 sm:h-24 sm:w-24 shrink-0 place-items-center rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-xl overflow-hidden text-3xl z-10">
                {client.logoUrl ? (
                  <img
                    src={client.logoUrl}
                    alt={client.company}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{client.emoji || '🏢'}</span>
                )}

                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Alterar Logo"
                >
                  <Upload className="h-5 w-5" />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5 pt-2 sm:pt-14">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                  {client.company}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {client.name} • {client.city || 'Brasil'} • {client.niche || 'Geral'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-14">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tempo dedicado: {formatClientTime(totalTimeSpentSeconds)}</span>
              </span>
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                Plano {clientPlan?.name || 'Profissional'}
              </span>
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {client.postsPerWeek} posts/sem
              </span>
            </div>
          </div>

          {/* Subtabs Navigation */}
          <div className="flex items-center gap-6 border-t border-slate-200/80 dark:border-slate-800 pt-2 overflow-x-auto">
            {[
              { key: 'sobre', label: 'Diretrizes de Marca' },
              { key: 'recorrencia', label: `Recorrência (${client.contractServices?.length || 0})` },
              { key: 'portal', label: '🔑 Acesso ao Portal' },
              { key: 'relatorios', label: `Relatórios (${client.monthlyReports?.length || 0})` },
              { key: 'tarefas', label: `Tarefas (${tasks.length})` },
              { key: 'arquivos', label: `Arquivos (${client.files?.length || 0})` },
              { key: 'cadastro', label: 'Cadastro' },
              { key: 'financeiro', label: 'Financeiro' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`tab-client-${tab.key}`}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`pb-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
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
      {/* TAB 1: DIRETRIZES DE MARCA (SOBRE, PERSONA, TOM DE VOZ, PALAVRAS) */}
      {/* ========================================================================= */}
      {activeTab === 'sobre' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Left Column: Bio & Persona */}
          <div className="space-y-6">
            {/* Bio Card */}
            <div className="clean-card p-6 space-y-3 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Sobre a Empresa & Proposta de Valor
              </label>
              <textarea
                id="textarea-client-about"
                value={client.about || ''}
                onChange={(e) => updateClient(client.id, { about: e.target.value })}
                rows={5}
                placeholder="Descreva a história da marca, posicionamento, produtos principais e diferencial competitivo..."
                className="clean-input w-full p-3.5 text-xs leading-relaxed resize-none bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 rounded-xl"
              />
              <p className="text-[11px] text-slate-400">
                Alimenta o contexto de criação de headlines e copies pelo assistente de IA.
              </p>
            </div>

            {/* Persona Card */}
            <div className="clean-card p-6 space-y-3 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <span>Persona & Perfil do Cliente Ideal</span>
              </label>
              <textarea
                id="textarea-client-persona"
                value={client.persona || client.targetAudience || ''}
                onChange={(e) => updateClient(client.id, { persona: e.target.value, targetAudience: e.target.value })}
                rows={4}
                placeholder="Ex: Mulheres e homens de 25-45 anos, classe A/B, que buscam praticidade, estética minimalista e valorizam atendimento humanizado..."
                className="clean-input w-full p-3.5 text-xs leading-relaxed resize-none bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {/* Right Column: Tom de Voz & Palavras Recomendadas/Proibidas */}
          <div className="space-y-6">
            {/* Tom de Voz */}
            <div className="clean-card p-6 space-y-3 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Tom de Voz</span>
                </label>
                <button
                  onClick={() => setShowAddTone(true)}
                  className="text-xs font-bold text-slate-900 dark:text-white hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar tom
                </button>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-2">
                {PRESET_TONES.map((tone) => {
                  const currentTones = client.toneOfVoiceTags || client.toneOfVoice || [];
                  const isSelected = currentTones.includes(tone);
                  return (
                    <button
                      key={tone}
                      onClick={() => toggleTone(tone)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {tone} {isSelected && '✓'}
                    </button>
                  );
                })}

                {/* Custom Tones */}
                {(client.toneOfVoiceTags || client.toneOfVoice || [])
                  .filter((t) => !PRESET_TONES.includes(t))
                  .map((tone) => (
                    <button
                      key={tone}
                      onClick={() => toggleTone(tone)}
                      className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      {tone} ✓
                    </button>
                  ))}
              </div>

              {showAddTone && (
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newToneInput}
                    onChange={(e) => setNewToneInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTone()}
                    placeholder="Digite um tom personalizado..."
                    className="clean-input h-9 text-xs px-3 flex-1 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                    autoFocus
                  />
                  <button
                    onClick={handleAddCustomTone}
                    className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 text-xs font-bold cursor-pointer"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowAddTone(false)}
                    className="rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 text-xs text-slate-400 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Custom Tone Note */}
              <div className="pt-2">
                <input
                  type="text"
                  value={client.toneOfVoiceCustom || ''}
                  onChange={(e) => updateClient(client.id, { toneOfVoiceCustom: e.target.value })}
                  placeholder="Instruções extras de tom de voz (ex: usar termos sensoriais e emojis pontuais)..."
                  className="clean-input h-9 w-full px-3 text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
            </div>

            {/* Palavras Recomendadas e a Evitar */}
            <div className="clean-card p-6 space-y-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              {/* Palavras recomendadas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Palavras a serem usadas</span>
                </label>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {normalizeWordList(client.recommendedWords || ['Qualidade', 'Exclusividade', 'Cuidado']).map((w) => (
                    <span key={w} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span>{w}</span>
                      <button onClick={() => handleRemoveRecommendedWord(w)} className="hover:text-emerald-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRecommendedWord}
                    onChange={(e) => setNewRecommendedWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRecommendedWord()}
                    placeholder="Adicionar termo recomendado..."
                    className="clean-input h-8 px-3 text-xs flex-1 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                  />
                  <button
                    onClick={handleAddRecommendedWord}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Palavras a evitar */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-2">
                  <Ban className="h-3.5 w-3.5" />
                  <span>Palavras a serem evitadas</span>
                </label>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {normalizeWordList(client.forbiddenWords || ['Barato', 'Promoção relâmpago', 'Impossível']).map((w) => (
                    <span key={w} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      <span>{w}</span>
                      <button onClick={() => handleRemoveForbiddenWord(w)} className="hover:text-rose-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newForbiddenWord}
                    onChange={(e) => setNewForbiddenWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddForbiddenWord()}
                    placeholder="Adicionar termo proibido..."
                    className="clean-input h-8 px-3 text-xs flex-1 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                  />
                  <button
                    onClick={handleAddForbiddenWord}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RELATÓRIOS MENSAIS (ADMIN MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="clean-card p-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span>Gestão de Relatórios Mensais do Cliente</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Estes dados são apresentados de forma executiva no Portal do Cliente.
              </p>
            </div>

            <button
              onClick={() => setShowNewReportModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Relatório</span>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(client.monthlyReports || []).map((rep) => (
              <div
                key={rep.id}
                className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rep.month}
                  </h4>
                  <button
                    onClick={() => handleDeleteReport(rep.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Seguidores</span>
                    <p className="font-bold text-slate-900 dark:text-white">+{(rep.newFollowers ?? 480)} ({(rep.followersGrowthPercent ?? 12.5)}%)</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Alcance</span>
                    <p className="font-bold text-slate-900 dark:text-white">{(rep.reach ?? rep.reachTotal ?? 38500).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Impressões</span>
                    <p className="font-bold text-slate-900 dark:text-white">{(rep.impressions ?? 94200).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Engajamento</span>
                    <p className="font-bold text-slate-900 dark:text-white">{rep.engagementRate}%</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  <strong>Insights:</strong> {rep.insights || 'Excelente retenção nos carrosséis explicativos e crescimento acelerado por Reels.'}
                </p>
              </div>
            ))}

            {(!client.monthlyReports || client.monthlyReports.length === 0) && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                Nenhum relatório cadastrado ainda. Clique em "Novo Relatório" para adicionar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TAREFAS */}
      {/* ========================================================================= */}
      {activeTab === 'tarefas' && (
        <div className="clean-card p-6 space-y-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Tarefas em Fluxo ({tasks.length})
            </h3>
            <button
              onClick={() => onNewTaskForClient(client.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tarefa
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTask(t.id)}
                className="clean-card clean-card-hover flex w-full items-center justify-between p-4 text-left border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl cursor-pointer"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {t.selectedHeadline || t.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>Etapa: <strong className="text-slate-800 dark:text-slate-200">{t.currentStep}</strong></span>
                    <span>•</span>
                    <span>Post previsto: {formatDate(t.postDate)}</span>
                    {t.timeSpent ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Clock className="h-3 w-3" />
                          {formatClientTime(t.timeSpent)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                  {getStatusLabel(t.status)}
                </span>
              </button>
            ))}

            {tasks.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-400">
                Nenhuma tarefa em andamento para este cliente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ARQUIVOS */}
      {/* ========================================================================= */}
      {activeTab === 'arquivos' && (
        <div className="clean-card p-6 space-y-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Documentos e Materiais de Apoio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manuais de marca, fotos em alta resolução, logos e briefings.
              </p>
            </div>

            <label className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 px-4 py-2 text-xs font-bold text-white dark:text-slate-900 cursor-pointer shadow-sm transition-all active:scale-95">
              <Upload className="h-4 w-4" />
              <span>Enviar Arquivo</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {client.files?.map((f) => (
              <div
                key={f.id}
                className="clean-card p-4 flex flex-col justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={f.name}>
                      {f.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDate(f.uploadedAt)} • {Math.round((f.size || 0) / 1024)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-slate-700/80 pt-2.5">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Visualizar</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {f.dataUrl && (
                      <a
                        href={f.dataUrl}
                        download={f.name}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                        title="Baixar arquivo"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Baixar</span>
                      </a>
                    )}
                    <button
                      onClick={() => removeClientFile(client.id, f.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!client.files || client.files.length === 0) && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhum arquivo enviado para este cliente. Use o botão acima para anexar materiais.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CADASTRO */}
      {/* ========================================================================= */}
      {activeTab === 'cadastro' && (
        <div className="clean-card p-6 md:p-8 space-y-6 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Dados Cadastrais da Empresa
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nome da Empresa</label>
              <input
                type="text"
                value={client.company}
                onChange={(e) => updateClient(client.id, { company: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Responsável</label>
              <input
                type="text"
                value={client.name}
                onChange={(e) => updateClient(client.id, { name: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">WhatsApp / Telefone</label>
              <input
                type="text"
                value={client.whatsapp}
                onChange={(e) => updateClient(client.id, { whatsapp: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">E-mail</label>
              <input
                type="email"
                value={client.email}
                onChange={(e) => updateClient(client.id, { email: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">CNPJ</label>
              <input
                type="text"
                value={client.cnpj || ''}
                onChange={(e) => updateClient(client.id, { cnpj: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Cidade</label>
              <input
                type="text"
                value={client.city || ''}
                onChange={(e) => updateClient(client.id, { city: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Instagram (@)</label>
              <input
                type="text"
                value={client.instagram || ''}
                onChange={(e) => updateClient(client.id, { instagram: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Site Oficial</label>
              <input
                type="text"
                value={client.site || ''}
                onChange={(e) => updateClient(client.id, { site: e.target.value })}
                className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Emoji da Marca</label>
              <input
                type="text"
                value={client.emoji || ''}
                onChange={(e) => updateClient(client.id, { emoji: e.target.value })}
                maxLength={2}
                className="clean-input h-10 w-full px-3 text-center text-lg font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: FINANCEIRO & SERVIÇOS PONTUAIS */}
      {/* ========================================================================= */}
      {activeTab === 'financeiro' && (
        <div className="space-y-6">
          {/* Summary / Total Card */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Mensalidade Recorrente</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-display">
                R$ {(client.mensalidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Plano: {clientPlan?.name || 'Personalizado'} • Dia {client.dueDay || 10}
              </p>
            </div>

            <div className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-400">Serviços Pontuais Ativos</span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-display">
                R$ {((client.customServices || [])
                  .filter((s) => s.status !== 'cancelado')
                  .reduce((acc, s) => acc + (s.price || 0), 0))
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {(client.customServices || []).filter((s) => s.status !== 'cancelado').length} serviços lançados
              </p>
            </div>

            <div className="clean-card p-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-800 dark:border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold opacity-70">Faturamento Total Previsto</span>
              <p className="text-2xl font-bold mt-1 font-display">
                R$ {(
                  (client.mensalidade || 0) +
                  (client.customServices || [])
                    .filter((s) => s.status !== 'cancelado')
                    .reduce((acc, s) => acc + (s.price || 0), 0)
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] opacity-75 mt-1">
                Recorrente + Extras deste cliente
              </p>
            </div>
          </div>

          {/* Form to Edit Recurring Contract */}
          <div className="clean-card p-6 md:p-8 space-y-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Configuração do Contrato Recorrente
              </h3>
              <span className="text-xs text-slate-400">Edite os valores conforme negociação</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Plano Contratado
                </label>
                <select
                  value={client.planId || ''}
                  onChange={(e) => {
                    const selected = plans.find((p) => p.id === e.target.value);
                    updateClient(client.id, {
                      planId: e.target.value,
                      ...(selected ? { mensalidade: selected.price, postsPerWeek: selected.postsPerWeek } : {}),
                    });
                  }}
                  className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {p.price} • {p.postsPerWeek} posts/sem)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Mensalidade (R$)
                </label>
                <input
                  type="number"
                  value={client.mensalidade || ''}
                  onChange={(e) => updateClient(client.id, { mensalidade: Number(e.target.value) || 0 })}
                  className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Posts / Semana
                </label>
                <input
                  type="number"
                  min={1}
                  max={21}
                  value={client.postsPerWeek || 3}
                  onChange={(e) => updateClient(client.id, { postsPerWeek: Number(e.target.value) || 1 })}
                  className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Dia de Vencimento
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={client.dueDay || 10}
                  onChange={(e) => updateClient(client.id, { dueDay: Number(e.target.value) || 10 })}
                  className="clean-input h-10 w-full px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Status / Início do Contrato
              </label>
              <input
                type="text"
                value={client.contractStart || 'Ativo e Vigente'}
                onChange={(e) => updateClient(client.id, { contractStart: e.target.value })}
                placeholder="Ex: 'Início em 10/01/2024 • Renovação Anual' ou 'Ativo e Vigente'"
                className="clean-input h-10 w-full px-3.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-xl"
              />
            </div>
          </div>

          {/* Custom Services Section (Lançamento de Serviços Pontuais) */}
          <div className="clean-card p-6 md:p-8 space-y-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Lançamento de Serviços Pontuais & Extras
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Projetos avulsos, landing pages, packs de criativos extras, ensaios fotográficos ou consultorias.
                </p>
              </div>

              <button
                onClick={() => setShowAddServiceModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Lançar Serviço Pontual</span>
              </button>
            </div>

            {/* List of Custom Services */}
            <div className="space-y-3 pt-2">
              {client.customServices && client.customServices.length > 0 ? (
                client.customServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {srv.title}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          R$ {(srv.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {formatDate(srv.date)}
                        </span>
                      </div>
                      {srv.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {srv.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status Selector */}
                      <select
                        value={srv.status}
                        onChange={(e) => handleUpdateServiceStatus(srv.id, e.target.value as any)}
                        className={`h-8 px-2.5 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          srv.status === 'pago'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : srv.status === 'entregue'
                            ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            : srv.status === 'em_andamento'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : srv.status === 'cancelado'
                            ? 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            : 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                        }`}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="entregue">Entregue</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>

                      <button
                        onClick={() => handleDeleteCustomService(srv.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                        title="Excluir serviço"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Nenhum serviço pontual lançado para este cliente. Clique em "Lançar Serviço Pontual" para adicionar um job extra.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ACESSO AO PORTAL DO CLIENTE */}
      {/* ========================================================================= */}
      {activeTab === 'portal' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Left Column: Credentials Form */}
          <div className="space-y-6">
            <div className="clean-card p-6 space-y-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Credenciais de Acesso ao Portal
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Login exclusivo para {client.company} visualizar e aprovar criativos
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  Acesso Ativo
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    E-mail / Usuário de Login do Cliente
                  </label>
                  <input
                    id="input-portal-email"
                    type="email"
                    value={client.portalEmail || client.email || ''}
                    onChange={(e) => updateClient(client.id, { portalEmail: e.target.value })}
                    placeholder="cliente@dominio.com"
                    className="clean-input w-full h-10 px-3.5 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Este é o e-mail que o cliente digitará na tela de login inicial.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      id="input-portal-password"
                      type={showPortalPassword ? 'text' : 'password'}
                      value={client.portalPassword || '1234'}
                      onChange={(e) => updateClient(client.id, { portalPassword: e.target.value })}
                      placeholder="Senha do cliente"
                      className="clean-input w-full h-10 px-3.5 pr-10 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 rounded-xl font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPortalPassword(!showPortalPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPortalPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Você pode alterar a senha a qualquer momento e ela será salva automaticamente.
                  </p>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Share & Direct Preview */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  id="btn-copy-portal-invite"
                  type="button"
                  onClick={() => {
                    const email = client.portalEmail || client.email || 'graonobre@cliente.com';
                    const pass = client.portalPassword || '1234';
                    const appUrl = window.location.origin;
                    const directUrl = `${appUrl}?email=${encodeURIComponent(email)}&portal=${encodeURIComponent(client.id)}`;
                    const inviteText = `Olá ${client.name || client.company}! 👋\n\nAqui está o seu acesso exclusivo ao Portal de Criativos e Aprovações da BeeWave:\n\n🌐 *Link de Acesso:* ${directUrl}\n📧 *Login:* ${email}\n🔑 *Senha:* ${pass}\n\nPor lá você pode aprovar seus posts, solicitar alterações e acompanhar relatórios em tempo real!`;
                    navigator.clipboard.writeText(inviteText);
                    setCopiedPortalInvite(true);
                    setTimeout(() => setCopiedPortalInvite(false), 3000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {copiedPortalInvite ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Mensagem Copiada para o WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Copiar Dados para Enviar no WhatsApp</span>
                    </>
                  )}
                </button>

                {onOpenPortal && (
                  <button
                    id="btn-preview-portal-as-client"
                    type="button"
                    onClick={() => onOpenPortal(client.id)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-4 text-xs transition-all cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Visualizar Portal</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: How it Works & Preview Summary */}
          <div className="space-y-6">
            <div className="clean-card p-6 space-y-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Como funciona o Acesso do Cliente
              </h3>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Compartilhe o Link</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Envie o link do app para seu cliente junto com o e-mail e senha configurados ao lado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Login Automático & Bloqueado</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Ao entrar, o sistema identifica que é a conta de <strong>{client.company}</strong> e abre diretamente o Portal Exclusivo dele.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-500 text-white font-bold text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Segurança & Privacidade</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      O cliente só tem acesso aos posts da marca dele, sem ver os outros clientes nem as opções internas da agência.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RECORRÊNCIA & AUTOMAÇÃO DE PAUTAS */}
      {activeTab === 'recorrencia' && (
        <ClientRecurrenceTab client={client} />
      )}

      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-lg p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cadastrar Relatório Mensal
              </h3>
              <button onClick={() => setShowNewReportModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Mês de Referência</label>
                  <input
                    type="text"
                    required
                    value={repMonth}
                    onChange={(e) => setRepMonth(e.target.value)}
                    placeholder="Ex: Novembro 2024"
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Publicações Realizadas</label>
                  <input
                    type="number"
                    value={repPostsCount}
                    onChange={(e) => setRepPostsCount(Number(e.target.value))}
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Novos Seguidores</label>
                  <input
                    type="number"
                    value={repFollowers}
                    onChange={(e) => setRepFollowers(Number(e.target.value))}
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Crescimento (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={repGrowth}
                    onChange={(e) => setRepGrowth(Number(e.target.value))}
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Alcance Total</label>
                  <input
                    type="number"
                    value={repReach}
                    onChange={(e) => setRepReach(Number(e.target.value))}
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Taxa de Engajamento (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={repEngagement}
                    onChange={(e) => setRepEngagement(Number(e.target.value))}
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">Insights e Aprendizados</label>
                <textarea
                  rows={3}
                  value={repInsights}
                  onChange={(e) => setRepInsights(e.target.value)}
                  placeholder="Destaques estratégicos e recomendações para o próximo mês..."
                  className="clean-input w-full p-2.5 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewReportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm"
                >
                  Salvar Relatório
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Lightbox Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="clean-card w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {formatDate(previewFile.uploadedAt)} • {Math.round((previewFile.size || 0) / 1024)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewFile.dataUrl && (
                  <a
                    href={previewFile.dataUrl}
                    download={previewFile.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/60 min-h-[300px]">
              {previewFile.dataUrl && previewFile.dataUrl.startsWith('data:image/') ? (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.name}
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-lg"
                />
              ) : previewFile.dataUrl && previewFile.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="text-center space-y-3 py-12">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mx-auto">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {previewFile.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Visualização direta indisponível para este formato de arquivo.
                    </p>
                  </div>
                  {previewFile.dataUrl && (
                    <a
                      href={previewFile.dataUrl}
                      download={previewFile.name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Arquivo Completo</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom One-off Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-lg p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Lançar Novo Serviço Pontual / Extra
              </h3>
              <button
                onClick={() => setShowAddServiceModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomService} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">
                  Título do Serviço
                </label>
                <input
                  type="text"
                  required
                  value={newServiceTitle}
                  onChange={(e) => setNewServiceTitle(e.target.value)}
                  placeholder="Ex: Landing Page de Lançamento, Pack de 10 Reels, Fotografia..."
                  className="clean-input h-9 w-full px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="clean-input h-9 w-full px-3 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">
                    Data do Job
                  </label>
                  <input
                    type="date"
                    required
                    value={newServiceDate}
                    onChange={(e) => setNewServiceDate(e.target.value)}
                    className="clean-input h-9 w-full px-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">
                  Status Inicial
                </label>
                <select
                  value={newServiceStatus}
                  onChange={(e) => setNewServiceStatus(e.target.value as any)}
                  className="clean-input h-9 w-full px-3 text-xs"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="entregue">Entregue</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-600 dark:text-slate-300">
                  Descrição / Escopo do Trabalho
                </label>
                <textarea
                  rows={3}
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  placeholder="Detalhes adicionais sobre o que foi combinado e entregáveis..."
                  className="clean-input w-full p-2.5 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm cursor-pointer"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-md p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl rounded-3xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Excluir {client.company}?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Todas as tarefas associadas, briefings e histórico deste cliente serão removidos permanentemente.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteClient(client.id);
                  onBack();
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 text-xs shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
