import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore, useCurrentUser } from '../store';
import { Task, ClientFile } from '../types';
import { formatFriendlyDate } from '../utils/dateFormatter';
import { ClientPortalHeader, PortalTabKey } from './client-portal/ClientPortalHeader';
import { ClientSummaryTab } from './client-portal/ClientSummaryTab';
import { ClientApprovalTab } from './client-portal/ClientApprovalTab';
import { ClientStrategyTab } from './client-portal/ClientStrategyTab';
import { ClientCalendarTab } from './client-portal/ClientCalendarTab';
import { ClientFilesTab } from './client-portal/ClientFilesTab';
import { ClientReportsTab } from './client-portal/ClientReportsTab';
import { ClientPostModal } from './client-portal/ClientPostModal';
import { ClientSuggestionPanel, SuggestionDraft } from './client-portal/ClientSuggestionPanel';
import { ErrorState, Toast } from './ui';
import { needsClientDecision, isBeingRevised, getPostDay, byPostDate } from './client-portal/portalStatus';

interface ClientPortalViewProps {
  initialClientId?: string | null;
  onBackToApp?: () => void;
  isClientLocked?: boolean;
  onLogout?: () => void;
}

const TAB_STORAGE_KEY = 'beewave_portal_tab';
const VALID_TABS: PortalTabKey[] = [
  'resumo',
  'aprovacoes',
  'estrategia',
  'calendario',
  'arquivos',
  'resultados',
];

/**
 * Portal do Cliente.
 *
 * Este arquivo é só roteamento e ligação com a store. Cada aba é dona da
 * própria tela. Antes, tudo vivia aqui — 1.700 linhas com três linguagens
 * visuais concorrentes e a mesma pauta renderizada quatro vezes.
 *
 * A navegação é literal e curta: Resumo, Aprovações, Estratégia, Calendário,
 * Arquivos. Resultados só aparece quando existe relatório. Nenhuma aba executa
 * uma ação — abas levam a lugares, botões executam.
 */
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
  const addClientFiles = useAppStore((s) => s.addClientFiles);
  const clientApprove = useAppStore((s) => s.clientApprove);
  const clientRequestChange = useAppStore((s) => s.clientRequestChange);
  const clientRequestMultipleChanges = useAppStore((s) => s.clientRequestMultipleChanges);
  const updateClientStrategy = useAppStore((s) => s.updateClientStrategy);
  const logout = useAppStore((s) => s.logout);

  /* ---------------------------------------------------------------------
   * Hidratação: a store lê do localStorage de forma assíncrona. Enquanto
   * isso não termina, as listas mostram skeleton em vez de "vazio" — dizer
   * "nenhuma publicação" para quem tem publicações seria mentir.
   * ------------------------------------------------------------------- */
  const [isHydrating, setIsHydrating] = useState(
    () => !useAppStore.persist?.hasHydrated?.()
  );

  useEffect(() => {
    if (!isHydrating) return;
    const unsub = useAppStore.persist?.onFinishHydration?.(() => setIsHydrating(false));
    // Rede de segurança: se a store já hidratou antes deste efeito rodar.
    if (useAppStore.persist?.hasHydrated?.()) setIsHydrating(false);
    return unsub;
  }, [isHydrating]);

  /* --------------------------------------------------------------------- */

  const lockedClientId = currentUser?.clientId;
  const [selectedClientId, setSelectedClientId] = useState<string>(
    () => (isClientLocked ? lockedClientId : initialClientId) || clients[0]?.id || ''
  );

  useEffect(() => {
    if (isClientLocked && lockedClientId) setSelectedClientId(lockedClientId);
    else if (!isClientLocked && initialClientId) setSelectedClientId(initialClientId);
  }, [isClientLocked, lockedClientId, initialClientId]);

  const [activeTab, setActiveTab] = useState<PortalTabKey>(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY) as PortalTabKey | null;
      if (saved && VALID_TABS.includes(saved)) return saved;
    } catch {
      /* localStorage indisponível — cai no padrão */
    }
    return 'resumo';
  });

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      /* sem persistência de aba; não é crítico */
    }
  }, [activeTab]);

  const [approvalFilter, setApprovalFilter] = useState<'aguardando' | 'ajuste'>('aguardando');
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const client = clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientTasks = useMemo(
    () => tasks.filter((t) => t.clientId === client?.id),
    [tasks, client?.id]
  );
  const inspectingTask = clientTasks.find((t) => t.id === inspectingId) || null;

  const pending = clientTasks.filter(needsClientDecision);
  const revising = clientTasks.filter(isBeingRevised);
  const reports = client?.monthlyReports || [];

  /**
   * A frase de situação do cabeçalho. Específica, com números reais, e
   * priorizada: o que depende do cliente vem primeiro.
   */
  const statusLine = useMemo(() => {
    if (!client) return '';
    if (isHydrating) return 'Carregando suas publicações…';

    const parts: string[] = [];
    if (pending.length > 0) {
      parts.push(
        `${pending.length} ${pending.length === 1 ? 'publicação aguarda' : 'publicações aguardam'} sua aprovação`
      );
    }
    if (revising.length > 0) {
      parts.push(`${revising.length} em ajuste na Beewave`);
    }

    if (parts.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const next = clientTasks
        .filter((t) => {
          const d = getPostDay(t);
          return !!d && d >= today && t.status !== 'postado';
        })
        .sort(byPostDate)[0];

      return next
        ? `Tudo em dia. Próxima publicação ${formatFriendlyDate(getPostDay(next)).toLowerCase()}.`
        : 'Tudo em dia por aqui.';
    }

    return `${parts.join(' · ')}.`;
  }, [client, isHydrating, pending.length, revising.length, clientTasks]);

  /* ------------------------------- ações ------------------------------- */

  const clientLabel = client?.company || client?.name || 'Cliente';

  const handleApprove = useCallback(
    (taskId: string) => {
      clientApprove(taskId, clientLabel);
      setInspectingId(null);
      setToast('Publicação aprovada.');
    },
    [clientApprove, clientLabel]
  );

  const handleRequestAdjustment = useCallback(
    (taskId: string, feedback: string) => {
      clientRequestChange(taskId, clientLabel, feedback);
      setInspectingId(null);
      setApprovalFilter('ajuste');
      setToast('Ajuste enviado para a equipe.');
    },
    [clientRequestChange, clientLabel]
  );

  const handleRequestMultiple = useCallback(
    (taskId: string, changes: string[]) => {
      clientRequestMultipleChanges(taskId, clientLabel, changes);
      setInspectingId(null);
      setApprovalFilter('ajuste');
      setToast(
        changes.length === 1 ? 'Ajuste enviado para a equipe.' : `${changes.length} ajustes enviados para a equipe.`
      );
    },
    [clientRequestMultipleChanges, clientLabel]
  );

  const handleSuggestion = useCallback(
    (draft: SuggestionDraft) => {
      if (!client) return;
      const briefing = [
        `[Sugestão de pauta enviada por ${clientLabel} pelo Portal do Cliente]`,
        '',
        draft.idea.trim(),
        draft.links.trim() && `\nLinks e referências:\n${draft.links.trim()}`,
        draft.date && `\nData desejada: ${draft.date}`,
        draft.images.length > 0 &&
          `\n${draft.images.length} ${draft.images.length === 1 ? 'foto de referência anexada' : 'fotos de referência anexadas'} pelo cliente.`,
      ]
        .filter(Boolean)
        .join('\n');

      addTask({
        clientId: client.id,
        title: `Sugestão do cliente: ${draft.idea.trim().slice(0, 60)}`,
        briefingText: briefing,
        // As fotos entram como material de briefing — é referência que o
        // cliente mandou, não arte pronta para aprovação.
        briefingFiles: draft.images,
        format: draft.format,
        channel: draft.channel.toLowerCase() as any,
        postDate: draft.date || '',
        status: 'nao_iniciado',
        clientRequest: true,
      });

      setToast('Sugestão enviada para a equipe.');
    },
    [addTask, client]
  );

  const handleStrategyChangeRequest = useCallback(() => {
    if (!client) return;
    addTask({
      clientId: client.id,
      title: 'Pedido de alteração na estratégia',
      briefingText: `[Pedido enviado pelo cliente via Portal]\n\n${clientLabel} solicitou revisão do plano de marca e conteúdo. Entrar em contato para entender o que deve mudar.`,
      status: 'nao_iniciado',
      clientRequest: true,
    });
    setToast('Pedido enviado. A equipe entra em contato.');
  }, [addTask, client, clientLabel]);

  const handleAddFiles = useCallback(
    (files: ClientFile[]) => {
      if (!client) return;
      addClientFiles(client.id, files);
      setToast(files.length === 1 ? 'Arquivo enviado.' : `${files.length} arquivos enviados.`);
    },
    [addClientFiles, client]
  );

  const openTask = useCallback((task: Task) => setInspectingId(task.id), []);

  const goToApprovals = useCallback((filter: 'aguardando' | 'ajuste' = 'aguardando') => {
    setApprovalFilter(filter);
    setActiveTab('aprovacoes');
  }, []);

  /* ------------------------------- render ------------------------------ */

  if (!client) {
    return (
      <div data-surface="portal" className="min-h-screen grid place-items-center px-6">
        <ErrorState
          title="Não foi possível carregar este portal"
          hint="Nenhum cliente está associado a este acesso. Fale com a Beewave para revisar seu login."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // A aba Resultados pode sumir quando o último relatório é removido.
  const effectiveTab: PortalTabKey =
    activeTab === 'resultados' && reports.length === 0 ? 'resumo' : activeTab;

  return (
    <div data-surface="portal" className="min-h-screen pb-24">
      <ClientPortalHeader
        client={client}
        allClients={clients}
        activeTab={effectiveTab}
        onSelectTab={setActiveTab}
        onSwitchClient={(id) => {
          setSelectedClientId(id);
          setInspectingId(null);
        }}
        isClientLocked={isClientLocked}
        onBackToApp={onBackToApp}
        onLogout={() => (onLogout ? onLogout() : logout())}
        pendingCount={pending.length}
        hasReports={reports.length > 0}
        statusLine={statusLine}
      />

      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-10">
        {effectiveTab === 'resumo' && (
          <ClientSummaryTab
            client={client}
            tasks={clientTasks}
            onOpenApprovals={() => goToApprovals('aguardando')}
            onOpenCalendar={() => setActiveTab('calendario')}
            onOpenTask={openTask}
            onSuggest={() => setSuggestionOpen(true)}
          />
        )}

        {effectiveTab === 'aprovacoes' && (
          <ClientApprovalTab
            tasks={clientTasks}
            client={client}
            onApprove={handleApprove}
            onRequestAdjustment={handleRequestAdjustment}
            onOpenTask={openTask}
            initialFilter={approvalFilter}
            isHydrating={isHydrating}
          />
        )}

        {effectiveTab === 'estrategia' && (
          <ClientStrategyTab
            currentClient={client}
            onUpdateStrategy={(strat) => updateClientStrategy(client.id, strat)}
            isAgencyView={!isClientLocked}
            onRequestChange={handleStrategyChangeRequest}
          />
        )}

        {effectiveTab === 'calendario' && (
          <ClientCalendarTab
            tasks={clientTasks}
            onOpenTask={openTask}
            onSuggest={() => setSuggestionOpen(true)}
          />
        )}

        {effectiveTab === 'arquivos' && (
          <ClientFilesTab client={client} onAddFiles={handleAddFiles} />
        )}

        {effectiveTab === 'resultados' && <ClientReportsTab reports={reports} />}
      </main>

      <ClientPostModal
        task={inspectingTask}
        client={client}
        onClose={() => setInspectingId(null)}
        onApprove={handleApprove}
        onRequestChanges={handleRequestMultiple}
      />

      <ClientSuggestionPanel
        client={client}
        open={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
        onSubmit={handleSuggestion}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
