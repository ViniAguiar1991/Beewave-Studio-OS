import React, { useState } from 'react';
import { Client, Task } from '../../types';
import { useAppStore } from '../../store';
import {
  ChevronLeft,
  LogOut,
  Share2,
  Check,
  Calendar as CalendarIcon,
  Compass,
  CheckCircle2,
  Lightbulb,
  FileText,
  BarChart3,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  Send,
  Layers,
} from 'lucide-react';
import { formatFriendlyDate } from '../../utils/dateFormatter';

interface ClientPortalHeaderProps {
  currentClient?: Client | undefined;
  client?: Client | undefined;
  clients?: Client[];
  allClients?: Client[];
  selectedClientId?: string;
  onSelectClient?: (id: string) => void;
  onSwitchClient?: (id: string) => void;
  isClientLocked?: boolean;
  onBackToApp?: () => void;
  onLogout?: () => void;
  activeTab: string;
  onTabChange?: (tab: any) => void;
  onSelectTab?: (tab: any) => void;
  pendingApprovalCount?: number;
  pendingApprovalsCount?: number;
  onOpenSuggestionModal?: () => void;
  onSuggestIdea?: () => void;
}

export const ClientPortalHeader: React.FC<ClientPortalHeaderProps> = (props) => {
  const currentClient = props.currentClient || props.client;
  const clients = props.clients || props.allClients || [];
  const selectedClientId = props.selectedClientId || currentClient?.id || '';
  const onSelectClient = props.onSelectClient || props.onSwitchClient || (() => {});
  const isClientLocked = !!props.isClientLocked;
  const onBackToApp = props.onBackToApp;
  const onLogout = props.onLogout;
  const activeTab = props.activeTab;
  const onTabChange = props.onTabChange || props.onSelectTab || (() => {});
  const pendingApprovalCount = props.pendingApprovalCount ?? props.pendingApprovalsCount ?? 0;
  const onOpenSuggestionModal = props.onOpenSuggestionModal || props.onSuggestIdea;
  const [copiedLink, setCopiedLink] = useState(false);

  const tasks = useAppStore((s) => s.tasks);
  const clientTasks = tasks.filter((t) => t.clientId === currentClient?.id);
  const inProdTasks = clientTasks.filter(
    (t) =>
      t.status === 'nao_iniciado' ||
      t.status === 'em_andamento' ||
      t.status === 'aguardar' ||
      t.status === 'urgencia'
  );
  const approvedThisMonth = clientTasks.filter((t) => t.status === 'aprovado' || t.status === 'postado');

  // Find next upcoming post date
  const upcomingPosts = clientTasks
    .filter((t) => t.postDate && t.status !== 'postado')
    .sort((a, b) => (a.postDate || '').localeCompare(b.postDate || ''));
  const nextPost = upcomingPosts[0];

  const handleCopyPortalLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  // Personalized Contact Name fallback
  const responsibleName = currentClient?.name ? currentClient.name.split(' ')[0] : 'Branca';

  const tabs = [
    {
      key: 'aprovacao',
      label: 'Aprovações',
      icon: CheckCircle2,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeColor: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    },
    { key: 'planejamento', label: 'Planejamento', icon: CalendarIcon, badge: null },
    { key: 'estrategia', label: 'Estratégia', icon: Compass, badge: null },
    { key: 'sugestoes', label: 'Sugerir pautas', icon: Lightbulb, badge: null },
    { key: 'relatorios', label: 'Resultados mensais', icon: BarChart3, badge: null },
  ];

  return (
    <div id="clean-client-portal-header" className="relative z-10 w-full mb-8 pt-4">
      {/* 1. Top Utility Navigation Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6 flex items-center justify-between gap-4">
        {isClientLocked ? (
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs">
              BW
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {currentClient?.company || 'Área do Cliente'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Portal de Acompanhamento
              </p>
            </div>
          </div>
        ) : (
          <button
            id="btn-back-from-portal"
            onClick={onBackToApp}
            className="group flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Voltar ao Studio</span>
          </button>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-3 text-xs">
          {isClientLocked ? (
            <button
              id="btn-portal-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500 text-xs hidden sm:inline">
                Cliente:
              </span>
              <select
                id="select-portal-client"
                value={selectedClientId}
                onChange={(e) => onSelectClient(e.target.value)}
                className="text-xs font-semibold cursor-pointer bg-transparent border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none pb-0.5"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.company}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleCopyPortalLink}
            title="Copiar link do portal"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Compartilhar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Editorial Clean Title Area (No Containers, No Colored Badges, No Metric Tiles) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-slate-900 dark:text-white tracking-tight">
            {currentClient?.company || 'Área de Conteúdo'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe as pautas, aprove publicações e visualize os resultados do seu plano.
          </p>
        </div>

        {/* 3. Clean Underline Tabs (Separated by line) */}
        <div className="flex items-center border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto no-scrollbar gap-6 pt-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-portal-${tab.key}`}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-2 pb-3 text-xs sm:text-sm transition-all relative cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-slate-950 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-normal'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-950 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
